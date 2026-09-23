"""Compare channel-risk and pilot-budget policies on paired mock scenarios.

Run from this directory with ``python benchmark_strategy.py --runs 30``.
This is an analysis tool for choosing pilot-strategy settings; it does not
change the submitted agent or reveal any hidden simulator effects.
"""

from __future__ import annotations

import argparse
import csv
from math import floor
from pathlib import Path
from statistics import median

from agent import Agent
from local_eval import evaluate_agent

CONTEXT_DIR = Path(__file__).resolve().parent


class BalancedPolicy(Agent):
    """Current adaptive policy, including the optional new-group exploration."""


class FixedQueuePolicy(Agent):
    """Use the old fixed SMS-pilot queue instead of adapting after each result."""

    def __init__(self):
        super().__init__(use_bandit=False, explore_new_groups=True)


class NoNewGroupPolicy(Agent):
    """Keep adaptive pilots but skip exploration of a previously untested group."""

    def __init__(self):
        super().__init__(use_bandit=True, explore_new_groups=False)


class StrictCapsPolicy(Agent):
    """Use the current direct tests with tighter post-pilot spend caps."""

    PRE_PILOT_CHANNEL_CAP = 10_000
    POST_PILOT_CAMPAIGN_CAP = 25_000
    POST_PILOT_CHANNEL_CAP = 35_000


POLICIES = (
    ("Текущая: адаптивная", BalancedPolicy),
    ("Фиксированная очередь", FixedQueuePolicy),
    ("Без разведки новой группы", NoNewGroupPolicy),
    ("Более строгие лимиты расходов", StrictCapsPolicy),
)


def _evaluate(policy_name: str, agent_type: type[Agent], seed: int) -> dict:
    result = evaluate_agent(agent_type(), seed=seed, verbose=False, data_root=CONTEXT_DIR)
    if result is None:
        raise RuntimeError(f"Нет результата: стратегия «{policy_name}», seed {seed}")

    details = result.get("campaigns_detail", [])
    n_pilots = int(result.get("n_pilots", 0))
    pilot_rows = details[:n_pilots]
    final_rows = details[n_pilots:]

    def channel_cost(rows: list[dict], channel: str) -> float:
        return sum(float(row.get("cost", 0.0)) for row in rows if row.get("channel") == channel)

    final_costs = [float(row.get("cost", 0.0)) for row in final_rows]
    return {
        "policy": policy_name,
        "seed": seed,
        "net_gain": float(result["net_arpu_gain"]),
        "total_cost": float(result["total_cost"]),
        "contacts": int(result["total_contacts"]),
        "unique_customers": int(result["unique_customers_targeted"]),
        "pilots": n_pilots,
        "call_pilots": sum(row.get("channel") == "call" for row in pilot_rows),
        "ads_pilots": sum(row.get("channel") == "digital_ads" for row in pilot_rows),
        "call_cost": channel_cost(details, "call"),
        "ads_cost": channel_cost(details, "digital_ads"),
        "largest_campaign_cost": max(final_costs, default=0.0),
    }


def _percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, min(len(ordered) - 1, floor((len(ordered) - 1) * fraction)))]


def _summarize(policy_name: str, rows: list[dict], baseline_by_seed: dict[int, float]) -> dict:
    values = [row["net_gain"] for row in rows]
    deltas = [row["net_gain"] - baseline_by_seed[row["seed"]] for row in rows]
    return {
        "policy": policy_name,
        "median_net": median(values),
        "p10_net": _percentile(values, 0.10),
        "minimum_net": min(values),
        "positive_runs": sum(value > 0 for value in values),
        "wins_vs_current": sum(value > 0 for value in deltas),
        "median_delta": median(deltas),
        "median_pilots": median([row["pilots"] for row in rows]),
        "median_call_cost": median([row["call_cost"] for row in rows]),
        "median_ads_cost": median([row["ads_cost"] for row in rows]),
        "max_campaign_cost": max(row["largest_campaign_cost"] for row in rows),
        "median_contacts": median([row["contacts"] for row in rows]),
    }


def run_benchmark(runs: int = 10) -> dict:
    """Return a UI-friendly head-to-head comparison on paired mock seeds."""
    if not 1 <= int(runs) <= 200:
        raise ValueError("Число сценариев должно быть от 1 до 200")

    rows_by_policy: dict[str, list[dict]] = {}
    for policy_name, agent_type in POLICIES:
        rows_by_policy[policy_name] = [
            _evaluate(policy_name, agent_type, seed)
            for seed in range(int(runs))
        ]

    baseline_name = POLICIES[0][0]
    baseline_by_seed = {row["seed"]: row["net_gain"] for row in rows_by_policy[baseline_name]}
    summaries = [
        _summarize(policy_name, rows, baseline_by_seed)
        for policy_name, rows in rows_by_policy.items()
    ]
    winner = max(summaries, key=lambda item: (item["median_net"], item["p10_net"]))
    return {
        "runs": int(runs),
        "baseline_policy": baseline_name,
        "winner": winner["policy"],
        "summaries": summaries,
        "results_by_policy": rows_by_policy,
    }


def _print_report(summaries: list[dict], runs: int) -> None:
    print(f"СРАВНЕНИЕ СТРАТЕГИЙ ПИЛОТОВ · {runs} одинаковых seed · мок-модель")
    print("Чистая выгода = дополнительная выручка − стоимость всех контактов.\n")
    headers = ("Стратегия", "Медиана", "Худшие 10%", "Мин. итог", "В плюс", "Победы*", "Δ к текущей")
    print(" | ".join(f"{header:<22}" for header in headers))
    print("-" * 139)
    for item in summaries:
        print(" | ".join((
            f"{item['policy']:<22}",
            f"{item['median_net']:>12,.0f}",
            f"{item['p10_net']:>12,.0f}",
            f"{item['minimum_net']:>12,.0f}",
            f"{item['positive_runs']:>3}/{runs:<3}",
            f"{item['wins_vs_current']:>3}/{runs:<3}",
            f"{item['median_delta']:>+12,.0f}",
        )))

    print("\nРАСХОДЫ И РИСК КОНЦЕНТРАЦИИ (медиана по сценариям)")
    for item in summaries:
        print(
            f"• {item['policy']}: пилотов {item['median_pilots']:.0f}, "
            f"звонки {item['median_call_cost']:,.0f} у.е., "
            f"реклама {item['median_ads_cost']:,.0f} у.е., "
            f"максимальная кампания {item['max_campaign_cost']:,.0f} у.е., "
            f"контактов {item['median_contacts']:,.0f}."
        )
    print("\n* Победы — число seed, где стратегия обошла текущую политику на том же seed.")
    print("P10 показывает нижнюю часть результатов: чем выше, тем меньше риск плохого прогона.")
    print("Все значения относятся только к синтетической мок-модели и не предсказывают балл судейства.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Сравнить правила пилотирования дорогих каналов на одинаковых мок-сценариях."
    )
    parser.add_argument("--runs", type=int, default=30, help="число seed на каждую стратегию (1–200)")
    parser.add_argument("--csv", type=Path, help="необязательный путь для подробной таблицы по каждому seed")
    args = parser.parse_args()
    if not 1 <= args.runs <= 200:
        parser.error("--runs должен быть от 1 до 200")

    rows_by_policy = {}
    for policy_name, agent_type in POLICIES:
        print(f"Проверяю: {policy_name}…", flush=True)
        rows_by_policy[policy_name] = [
            _evaluate(policy_name, agent_type, seed)
            for seed in range(args.runs)
        ]

    baseline_name = POLICIES[0][0]
    baseline_by_seed = {row["seed"]: row["net_gain"] for row in rows_by_policy[baseline_name]}
    summaries = [_summarize(name, rows, baseline_by_seed) for name, rows in rows_by_policy.items()]
    _print_report(summaries, args.runs)

    if args.csv:
        args.csv.parent.mkdir(parents=True, exist_ok=True)
        fields = list(rows_by_policy[baseline_name][0])
        with args.csv.open("w", newline="", encoding="utf-8-sig") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            for rows in rows_by_policy.values():
                writer.writerows(rows)
        print(f"\nПодробные результаты сохранены: {args.csv}")


if __name__ == "__main__":
    main()
