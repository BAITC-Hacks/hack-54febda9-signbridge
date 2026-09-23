"""Local web demo for the SignBridge agent and the supplied mock scorer.

Run from any directory with ``python context/web_app.py``. This module is not
part of the submitted agent; it only presents local evaluation results.
"""

from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from statistics import median
from urllib.parse import parse_qs, urlsplit

import pandas as pd

from agent import Agent
from mock_environment import _mock_fallback, _mock_impact_model, make_mock_env
from scoring_core import (
    MAX_CAMPAIGNS,
    MAX_TOTAL_CONTACTS,
    TOTAL_BUDGET,
    sanitize_campaigns,
    score_campaigns,
)


ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
FILTER_COLUMNS = (
    "filter_arpu_segment",
    "filter_data_segment",
    "filter_call_segment",
    "filter_current_tariff",
)
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
}


def evaluate_seed(seed: int) -> dict:
    """Run Agent.act and score it with the same mock mechanics as local_eval."""
    env, internals = make_mock_env(
        seed=seed,
        data_dir=str(ROOT / "data"),
        profile_path=str(ROOT / "customer_profile.csv"),
    )
    agent_error = None
    agent = Agent()
    try:
        final = agent.act(env)
    except Exception as exc:
        agent_error = f"{type(exc).__name__}: {exc}"
        final = []

    final = sanitize_campaigns(final, env.tariffs)[:MAX_CAMPAIGNS]
    pilots = internals.executed_pilot_campaigns()
    strategy = pd.DataFrame(pilots + final)
    if strategy.empty:
        raise RuntimeError("Агент не провёл пилотов и не вернул кампаний")
    for column in (*FILTER_COLUMNS, "explicit_ids"):
        if column not in strategy.columns:
            strategy[column] = None

    mock_model = _mock_impact_model(pd.read_csv(ROOT / "data" / "change_tariff.csv"))
    baseline = float(env.customer_profile["predicted_arpu"].sum())
    score = score_campaigns(
        strategy,
        env.customer_profile,
        mock_model,
        env.tariffs,
        baseline,
        _mock_fallback,
        team_id="local",
    )

    details = score["campaigns_detail"]
    channels = {}
    for detail in details:
        entry = channels.setdefault(detail["channel"], {"cost": 0.0, "contacts": 0})
        entry["cost"] += float(detail["cost"])
        entry["contacts"] += int(detail["n_contacts"])

    campaigns = []
    for campaign, detail in zip(final, details[len(pilots):]):
        campaigns.append({
            "name": str(detail["name"]),
            "from_tariff": campaign.get("filter_current_tariff"),
            "to_tariff": campaign["target_tariff"],
            "arpu_segment": campaign.get("filter_arpu_segment"),
            "data_segment": campaign.get("filter_data_segment"),
            "call_segment": campaign.get("filter_call_segment"),
            "channel": detail["channel"],
            "contacts": int(detail["n_contacts"]),
            "cost": float(detail["cost"]),
            "gross_lift": float(detail["gross_lift"]),
            "capped": any(detail[key] for key in (
                "capped_at_campaign_limit",
                "capped_at_reach_budget",
                "capped_at_money_budget",
            )),
        })

    return {
        "seed": seed,
        "status": score["status"],
        "agent_error": agent_error,
        "baseline": baseline,
        "gross_lift": float(score["gross_arpu_lift"]),
        "total_cost": float(score["total_cost"]),
        "net_gain": float(score["net_arpu_gain"]),
        "growth_pct": float(score["growth_vs_baseline_pct"]),
        "coverage_pct": float(score["coverage_pct"]),
        "risk_pct": float(score["risk_score_pct"]),
        "total_contacts": int(score["total_contacts"]),
        "unique_customers": int(score["unique_customers_targeted"]),
        "audience_total": len(env.customer_profile),
        "budget_limit": TOTAL_BUDGET,
        "contact_limit": MAX_TOTAL_CONTACTS,
        "pilots": [{
            "name": item["pilot"],
            "channel": item["channel"],
            "from_tariff": campaign.get("filter_current_tariff"),
            "target_tariff": item["target_tariff"],
            "arpu_segment": campaign.get("filter_arpu_segment"),
            "data_segment": campaign.get("filter_data_segment"),
            "call_segment": campaign.get("filter_call_segment"),
            "contacts": int(item["n_customers"]),
            "cost": float(item["cost"]),
            "observed_lift_pct": float(item["observed_lift_ratio"]) * 100,
        } for item, campaign in zip(env.pilot_history, pilots)],
        "campaigns": campaigns,
        "channels": channels,
        "model_trace": getattr(agent, "model_trace", []),
    }


def evaluate_robustness(runs: int) -> dict:
    results = []
    for seed in range(runs):
        outcome = evaluate_seed(seed)
        results.append({
            "seed": seed,
            "net_gain": outcome["net_gain"],
            "status": outcome["status"],
            "cost": outcome["total_cost"],
        })
    values = [item["net_gain"] for item in results]
    return {
        "runs": runs,
        "positive": sum(value > 0 for value in values),
        "median": median(values),
        "minimum": min(values),
        "maximum": max(values),
        "results": results,
    }


class DemoHandler(BaseHTTPRequestHandler):
    def _reply(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, payload: dict) -> None:
        self._reply(
            status,
            json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8"),
            "application/json; charset=utf-8",
        )

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        if parsed.path in ASSETS:
            filename, content_type = ASSETS[parsed.path]
            self._reply(200, (WEB / filename).read_bytes(), content_type)
            return

        if parsed.path not in ("/api/run", "/api/robustness"):
            self._json(404, {"error": "Страница не найдена"})
            return

        params = parse_qs(parsed.query)
        try:
            if parsed.path == "/api/run":
                seed = int(params.get("seed", ["42"])[0])
                if not 0 <= seed <= 1_000_000:
                    raise ValueError("Seed должен быть от 0 до 1 000 000")
                payload = evaluate_seed(seed)
            else:
                runs = int(params.get("runs", ["15"])[0])
                if not 1 <= runs <= 30:
                    raise ValueError("Число прогонов должно быть от 1 до 30")
                payload = evaluate_robustness(runs)
        except ValueError as exc:
            self._json(400, {"error": str(exc)})
            return
        except Exception as exc:
            self._json(500, {"error": f"Ошибка расчёта: {type(exc).__name__}: {exc}"})
            return
        self._json(200, payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Локальное веб-демо агента SignBridge")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = HTTPServer((args.host, args.port), DemoHandler)
    print(f"SignBridge demo: http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
