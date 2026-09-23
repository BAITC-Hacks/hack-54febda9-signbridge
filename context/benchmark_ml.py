"""Compare the online Bayesian pilot policy with the previous fixed queue.

Run from context/: python benchmark_ml.py --runs 50
The supplied scorer and mock effects are used only for evaluation, never by the
agent while it is choosing pilots or campaigns.
"""

from __future__ import annotations

import argparse
from statistics import mean, median

from agent import Agent
from local_eval import evaluate_agent


def main() -> None:
    parser = argparse.ArgumentParser(description="Сравнение байесовской и фиксированной очереди пилотов")
    parser.add_argument("--runs", type=int, default=50)
    args = parser.parse_args()
    if not 1 <= args.runs <= 500:
        parser.error("--runs должен быть от 1 до 500")

    fixed, bayesian = [], []
    for seed in range(args.runs):
        old = evaluate_agent(Agent(use_bandit=False), seed=seed, verbose=False)
        new = evaluate_agent(Agent(use_bandit=True), seed=seed, verbose=False)
        if old is None or new is None:
            raise RuntimeError(f"Нет результата для seed {seed}")
        fixed.append(float(old["net_arpu_gain"]))
        bayesian.append(float(new["net_arpu_gain"]))

    differences = [new - old for old, new in zip(fixed, bayesian)]
    print(f"Сценариев: {args.runs} (одинаковые seed для обоих вариантов)")
    print(f"Фиксированная очередь: медиана {median(fixed):,.0f}; среднее {mean(fixed):,.0f}; "
          f"в плюс {sum(value > 0 for value in fixed)}/{args.runs}")
    print(f"Байесовская модель:    медиана {median(bayesian):,.0f}; среднее {mean(bayesian):,.0f}; "
          f"в плюс {sum(value > 0 for value in bayesian)}/{args.runs}")
    print(f"Разница (ML − база):   медиана {median(differences):+,.0f}; "
          f"среднее {mean(differences):+,.0f}; лучше в {sum(value > 0 for value in differences)}/{args.runs}")
    print("Мок-эффекты не совпадают с судейством; сравнение показывает только локальное поведение.")


if __name__ == "__main__":
    main()
