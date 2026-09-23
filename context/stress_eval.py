"""Paired local stress scenarios for the optional coverage pilot.

Run from any directory: python context/stress_eval.py --runs 30
The agent receives only the documented environment. Modified effects are kept
in this evaluation script and are never passed to Agent itself.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from statistics import median

import pandas as pd

from agent import Agent
from environment import make_environment
from mock_environment import (
    CHANNELS,
    MAX_TOTAL_CONTACTS,
    TOTAL_BUDGET,
    _mock_fallback,
    _mock_impact_model,
)
from scoring_core import MAX_CAMPAIGNS, sanitize_campaigns, score_campaigns


ROOT = Path(__file__).resolve().parent
FILTER_COLUMNS = (
    "filter_arpu_segment",
    "filter_data_segment",
    "filter_call_segment",
    "filter_current_tariff",
    "explicit_ids",
)


def scenario_model(base: pd.DataFrame, name: str) -> pd.DataFrame:
    model = base.copy()
    if name in {"half_effects", "unseen_winner"}:
        model["arpu_change_pct"] *= 0.5
    elif name == "first_four_fail":
        for candidate in Agent.CANDIDATES[:4]:
            mask = (
                (model["tariff_plan_code_from"] == candidate["current_tariff"])
                & (model["tariff_plan_code_to"] == candidate["target_tariff"])
                & (model["arpu_segment"] == candidate["arpu_segment"])
            )
            model.loc[mask, "arpu_change_pct"] = -model.loc[mask, "arpu_change_pct"].abs() * 0.5
    if name == "unseen_winner":
        mask = (
            (model["tariff_plan_code_from"] == "tariff_8")
            & (model["tariff_plan_code_to"] == "tariff_10")
            & (model["arpu_segment"] == "HIGH")
        )
        model.loc[mask, "arpu_change_pct"] = 0.30
        model.loc[mask, "conversion_rate"] = 0.40
    return model


def evaluate(agent: Agent, impact: pd.DataFrame, profile: pd.DataFrame,
             tariffs: pd.DataFrame, seed: int) -> tuple[float, bool]:
    env, internals = make_environment(
        customer_profile=profile,
        impact_model=impact,
        dict_tariff=tariffs,
        channels=CHANNELS,
        total_budget=TOTAL_BUDGET,
        max_total_contacts=MAX_TOTAL_CONTACTS,
        fallback_predict=_mock_fallback,
        seed=seed,
    )
    final = sanitize_campaigns(agent.act(env), env.tariffs)[:MAX_CAMPAIGNS]
    pilots = internals.executed_pilot_campaigns()
    strategy = pd.DataFrame(pilots + final)
    if strategy.empty:
        raise RuntimeError("Агент не провёл ни одного пилота и не вернул кампаний")
    for column in FILTER_COLUMNS:
        if column not in strategy.columns:
            strategy[column] = None
    result = score_campaigns(
        strategy, profile, impact, env.tariffs,
        float(profile["predicted_arpu"].sum()), _mock_fallback,
    )
    if len(pilots) > 20 or len(final) > MAX_CAMPAIGNS:
        raise AssertionError("Превышен лимит пилотов или финальных кампаний")
    if result["total_contacts"] > MAX_TOTAL_CONTACTS or result["total_cost"] > TOTAL_BUDGET:
        raise AssertionError("Превышен лимит контактов или бюджета")
    if any(
        detail["capped_at_campaign_limit"] or detail["capped_at_reach_budget"]
        or detail["capped_at_money_budget"]
        for detail in result["campaigns_detail"]
    ):
        raise AssertionError("План пришлось обрезать при подсчёте результата")
    discovered = any(
        campaign.get("filter_current_tariff") == "tariff_8"
        and campaign.get("filter_arpu_segment") == "HIGH"
        and campaign.get("target_tariff") == "tariff_10"
        for campaign in final
    )
    return float(result["net_arpu_gain"]), discovered


def main() -> None:
    parser = argparse.ArgumentParser(description="Стресс-проверка разведки новых сегментов")
    parser.add_argument("--runs", type=int, default=30)
    args = parser.parse_args()
    if not 1 <= args.runs <= 200:
        parser.error("--runs должен быть от 1 до 200")

    profile = pd.read_csv(ROOT / "customer_profile.csv")
    tariffs = pd.read_csv(ROOT / "data" / "dict_tariff.csv")
    base = _mock_impact_model(pd.read_csv(ROOT / "data" / "change_tariff.csv"))

    for name in ("baseline", "half_effects", "first_four_fail", "unseen_winner"):
        impact = scenario_model(base, name)
        old_results, new_results = [], []
        discoveries = 0
        for seed in range(args.runs):
            old, _ = evaluate(Agent(explore_new_groups=False), impact, profile, tariffs, seed)
            new, discovered = evaluate(Agent(), impact, profile, tariffs, seed)
            old_results.append(old)
            new_results.append(new)
            discoveries += discovered
        differences = [new - old for old, new in zip(old_results, new_results)]
        print(f"{name}: {args.runs} парных прогонов")
        print(f"  прежняя ML: медиана {median(old_results):,.0f}; минимум {min(old_results):,.0f}; "
              f"в плюс {sum(value > 0 for value in old_results)}/{args.runs}")
        print(f"  новая ML:   медиана {median(new_results):,.0f}; минимум {min(new_results):,.0f}; "
              f"в плюс {sum(value > 0 for value in new_results)}/{args.runs}")
        print(f"  разница:    медиана {median(differences):+,.0f}; "
              f"новая лучше {sum(value > 0 for value in differences)}/{args.runs}")
        if name == "unseen_winner":
            print(f"  новая группа в итоговом плане: {discoveries}/{args.runs}")
    print("Эффекты заданы искусственно только для локальной проверки; это не прогноз судейства.")


if __name__ == "__main__":
    main()
