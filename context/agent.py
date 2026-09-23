"""Агент для кейса SignBridge.

Кандидаты и пилотный алгоритм — интеграция выводов из ../tasks/01-data-analysis.md
(исторические переходы и аудитории) и ../tasks/02-pilot-strategy.md (очередь
гипотез, риск-фильтр LCB, каналовая экстраполяция от SMS, net-экономика).
"""

from __future__ import annotations

import math


class Agent:
    # Кандидаты: очередь гипотез из задачи 2, построенная на записке Разработчика 1.
    # tier определяет размер пилота (200 для приоритетных, 100 для остальных).
    # Исключены tariff_8->tariff_13 HIGH и tariff_4->tariff_8 HIGH: история
    # даёт по ним выраженный отрицательный сигнал.
    CANDIDATES = [
        {"current_tariff": "tariff_4", "arpu_segment": "MID", "target_tariff": "tariff_8", "tier": "priority"},
        {"current_tariff": "tariff_13", "arpu_segment": "MID", "target_tariff": "tariff_8", "tier": "priority"},
        {"current_tariff": "tariff_8", "arpu_segment": "MID", "target_tariff": "tariff_10", "tier": "priority"},
        {"current_tariff": "tariff_10", "arpu_segment": "MID", "target_tariff": "tariff_11", "tier": "priority"},
        {"current_tariff": "tariff_11", "arpu_segment": "HIGH", "target_tariff": "tariff_12", "tier": "confirm"},
        {"current_tariff": "tariff_8", "arpu_segment": "LOW", "target_tariff": "tariff_9", "tier": "exploratory"},
        {"current_tariff": "tariff_12", "arpu_segment": "MID", "target_tariff": "tariff_8", "tier": "exploratory"},
    ]
    PILOT_SIZE_BY_TIER = {"priority": 200, "confirm": 100, "exploratory": 100}

    PILOT_CHANNEL = "sms"
    MAX_PILOTS_THIS_RUN = 8
    MIN_PILOT_SIZE = 10
    # Внутренний потолок разведки: 15% бюджета (см. задачу 2), не требование его исчерпать.
    EXPLORATION_BUDGET_SHARE = 0.15

    MAX_CAMPAIGNS = 10
    MAX_CUSTOMERS_PER_CAMPAIGN = 5_000

    # Ориентир стандартного отклонения эффекта на абонента из environment.py.
    PILOT_STD_PER_CUSTOMER = 0.804
    # Односторонняя нижняя граница ~90% при нормальном шуме (задача 2).
    RISK_Z = 1.28

    def act(self, env) -> list[dict]:
        """Провести разведочные пилоты и вернуть подходящие кампании."""
        pilot_results = self._run_pilots(env)
        return self._select_campaigns(env, pilot_results)

    def _audience(self, env, candidate):
        profile = env.customer_profile
        return profile[
            (profile["current_tariff"] == candidate["current_tariff"])
            & (profile["arpu_segment"] == candidate["arpu_segment"])
        ]

    def _run_pilots(self, env) -> list[dict]:
        channel = self.PILOT_CHANNEL
        channel_info = env.channels.get(channel)
        if channel_info is None:
            return []
        cost_per_contact = float(channel_info["cost_per_contact"])

        exploration_budget = env.total_budget * self.EXPLORATION_BUDGET_SHARE
        pilot_spent = sum(float(item.get("cost", 0)) for item in env.pilot_history)

        results = []
        for candidate in self.CANDIDATES:
            if len(results) >= self.MAX_PILOTS_THIS_RUN or env.pilots_left <= 0:
                break

            audience = self._audience(env, candidate)
            if len(audience) < self.MIN_PILOT_SIZE:
                continue

            budget_left_for_pilots = min(
                float(env.remaining_budget), exploration_budget - pilot_spent
            )
            if budget_left_for_pilots < cost_per_contact * self.MIN_PILOT_SIZE:
                break

            n = min(
                self.PILOT_SIZE_BY_TIER[candidate["tier"]],
                len(audience),
                int(env.remaining_contacts),
            )
            if cost_per_contact > 0:
                n = min(n, int(budget_left_for_pilots // cost_per_contact))
            if n < self.MIN_PILOT_SIZE:
                continue

            try:
                result = env.run_pilot(
                    target_tariff=candidate["target_tariff"],
                    channel=channel,
                    n_customers=n,
                    filter_arpu_segment=candidate["arpu_segment"],
                    filter_current_tariff=candidate["current_tariff"],
                )
            except (RuntimeError, ValueError, KeyError):
                # Один недоступный сегмент/пилот не должен обрушить весь запуск.
                continue

            pilot_spent += float(result.get("cost", 0))
            results.append({**candidate, "result": result})

        return results

    def _channel_net_per_contact(self, env, lcb_sms, avg_arpu_per_customer):
        """Экстраполировать консервативный net на контакт по каждому каналу от SMS."""
        sms_multiplier = float(env.channels[self.PILOT_CHANNEL]["conversion_multiplier"])
        best_channel, best_net = None, 0.0
        for name, info in env.channels.items():
            multiplier = float(info["conversion_multiplier"])
            cost = float(info["cost_per_contact"])
            scale = multiplier / sms_multiplier if sms_multiplier else 1.0
            lcb_channel = lcb_sms * scale
            net_per_contact = lcb_channel * avg_arpu_per_customer - cost
            if best_channel is None or net_per_contact > best_net:
                best_channel, best_net = name, net_per_contact
        return best_channel, best_net

    def _select_campaigns(self, env, pilot_results: list[dict]) -> list[dict]:
        """Риск-фильтр LCB, выбор канала и непересекающихся ячеек по net."""
        profile = env.customer_profile
        candidates = []

        for item in pilot_results:
            result = item["result"]
            n_pilot = max(int(result.get("n_customers", 0)), 1)
            observed = float(result.get("observed_lift_ratio", 0.0))
            se = self.PILOT_STD_PER_CUSTOMER / math.sqrt(n_pilot)
            upper = observed + self.RISK_Z * se
            if upper <= 0:
                continue  # верхняя граница не выше нуля — гипотеза отклонена
            lcb = observed - self.RISK_Z * se

            segment = profile[
                (profile["current_tariff"] == item["current_tariff"])
                & (profile["arpu_segment"] == item["arpu_segment"])
            ].sort_values("ID_NUMBER")
            if len(segment) == 0:
                continue

            avg_arpu = float(segment["predicted_arpu"].sum()) / len(segment)
            channel, net_per_contact = self._channel_net_per_contact(env, lcb, avg_arpu)
            if net_per_contact <= 0:
                continue  # ни один канал не даёт положительную нижнюю оценку net

            candidates.append({
                "item": item,
                "segment": segment,
                "channel": channel,
                "net_per_contact": net_per_contact,
            })

        candidates.sort(
            key=lambda c: c["net_per_contact"] * len(c["segment"]), reverse=True
        )

        campaigns = []
        remaining_contacts = int(env.remaining_contacts)
        remaining_budget = float(env.remaining_budget)

        for candidate in candidates:
            if len(campaigns) >= self.MAX_CAMPAIGNS or remaining_contacts <= 0:
                break

            item = candidate["item"]
            segment = candidate["segment"]
            channel = candidate["channel"]
            cost_per_contact = float(env.channels[channel]["cost_per_contact"])

            n_reached = min(len(segment), self.MAX_CUSTOMERS_PER_CAMPAIGN, remaining_contacts)
            if cost_per_contact > 0:
                n_reached = min(n_reached, int(remaining_budget // cost_per_contact))
            if n_reached <= 0 or candidate["net_per_contact"] * n_reached <= 0:
                continue

            campaigns.append({
                "campaign_name": (
                    f"pilot_confirm_{item['current_tariff']}_"
                    f"{item['target_tariff']}_{item['arpu_segment']}"
                ),
                "filter_arpu_segment": item["arpu_segment"],
                "filter_current_tariff": item["current_tariff"],
                "target_tariff": item["target_tariff"],
                "channel": channel,
            })
            remaining_contacts -= n_reached
            remaining_budget -= n_reached * cost_per_contact

        return campaigns
