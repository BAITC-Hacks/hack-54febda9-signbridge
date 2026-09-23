"""Стартовый каркас агента для кейса SignBridge.

Текущий выбор кандидатов и пилотные параметры — временная базовая стратегия.
Заменить/перенастроить их после получения результатов задач по анализу данных
и стратегии пилотов в папке ../tasks.
"""

from __future__ import annotations

import math


class Agent:
    # Начальные параметры: открыты для пересмотра после командного ресерча.
    PILOT_CHANNEL = "sms"
    PILOT_SIZE = 100
    MAX_PILOTS_THIS_RUN = 8
    PILOT_BUDGET_SHARE = 0.20
    MAX_CAMPAIGNS = 10
    MAX_CUSTOMERS_PER_CAMPAIGN = 5_000

    # В environment.py указано ориентировочное стандартное отклонение 0.804.
    # Оставляем его настройкой: реальная модель судейства может отличаться.
    PILOT_STD_PER_CUSTOMER = 0.804
    LOWER_BOUND_Z = 1.0

    def act(self, env) -> list[dict]:
        """Провести разведочные пилоты и вернуть подходящие кампании."""
        candidates = self._build_candidates(env)
        pilot_results = []
        pilot_budget_limit = env.total_budget * self.PILOT_BUDGET_SHARE
        pilot_spent = sum(float(item.get("cost", 0)) for item in env.pilot_history)

        for candidate in candidates:
            if len(pilot_results) >= self.MAX_PILOTS_THIS_RUN or env.pilots_left <= 0:
                break

            channel = self.PILOT_CHANNEL
            channel_info = env.channels.get(channel)
            if channel_info is None:
                break

            cost_per_contact = float(channel_info["cost_per_contact"])
            pilot_budget_left = min(
                float(env.remaining_budget), pilot_budget_limit - pilot_spent
            )
            if pilot_budget_left < 0:
                break

            n = min(
                self.PILOT_SIZE,
                candidate["audience_size"],
                int(env.remaining_contacts),
            )
            if cost_per_contact > 0:
                n = min(n, int(pilot_budget_left // cost_per_contact))
            if n < 10:
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
            pilot_results.append({**candidate, "result": result})

        return self._select_campaigns(env, pilot_results, pilot_spent)

    def _build_candidates(self, env) -> list[dict]:
        """Временная эвристика: крупные ячейки и ближайший более дорогой тариф."""
        profile = env.customer_profile
        tariffs = env.tariffs
        needed = {"current_tariff", "arpu_segment", "predicted_arpu", "ID_NUMBER"}
        if not needed.issubset(profile.columns):
            return []
        if not {"tariff_plan_code", "price_tariff"}.issubset(tariffs.columns):
            return []

        prices = dict(zip(tariffs["tariff_plan_code"], tariffs["price_tariff"]))
        cells = (
            profile.groupby(["current_tariff", "arpu_segment"], observed=True)
            .agg(
                audience_size=("ID_NUMBER", "size"),
                audience_value=("predicted_arpu", "sum"),
            )
            .reset_index()
            .sort_values("audience_value", ascending=False)
        )

        candidates = []
        seen_cells = set()
        for row in cells.itertuples(index=False):
            current = row.current_tariff
            segment = row.arpu_segment
            if current not in prices or not segment or int(row.audience_size) < 10:
                continue
            cell_key = (current, segment)
            if cell_key in seen_cells:
                continue

            higher_tariffs = [
                code for code, price in prices.items()
                if code != current and float(price) > float(prices[current])
            ]
            if not higher_tariffs:
                continue
            target = min(higher_tariffs, key=lambda code: float(prices[code]))
            candidates.append({
                "current_tariff": current,
                "arpu_segment": segment,
                "target_tariff": target,
                "audience_size": int(row.audience_size),
            })
            seen_cells.add(cell_key)
            if len(candidates) >= self.MAX_PILOTS_THIS_RUN:
                break
        return candidates

    def _select_campaigns(self, env, pilot_results: list[dict], pilot_spent: float) -> list[dict]:
        """Оценить пилоты консервативно и собрать непересекающиеся ячейки."""
        profile = env.customer_profile
        channel = self.PILOT_CHANNEL
        if not pilot_results or channel not in env.channels:
            return []

        cost_per_contact = float(env.channels[channel]["cost_per_contact"])
        ranked = []
        for item in pilot_results:
            result = item["result"]
            n_pilot = max(int(result.get("n_customers", 0)), 1)
            observed = float(result.get("observed_lift_ratio", 0.0))
            standard_error = self.PILOT_STD_PER_CUSTOMER / math.sqrt(n_pilot)
            conservative_ratio = observed - self.LOWER_BOUND_Z * standard_error
            if conservative_ratio <= 0:
                continue

            segment = profile[
                (profile["current_tariff"] == item["current_tariff"])
                & (profile["arpu_segment"] == item["arpu_segment"])
            ].sort_values("ID_NUMBER")
            ranked.append((conservative_ratio, item, segment))

        ranked.sort(
            key=lambda entry: entry[0] * float(entry[2]["predicted_arpu"].sum()),
            reverse=True,
        )

        campaigns = []
        projected_incremental_net = 0.0
        remaining_contacts = int(env.remaining_contacts)
        remaining_budget = float(env.remaining_budget)

        for conservative_ratio, item, segment in ranked:
            if len(campaigns) >= self.MAX_CAMPAIGNS or remaining_contacts <= 0:
                break

            # The scoring engine caps each filtered audience at 5,000, then applies
            # total reach and budget in campaign order. Mirror those caps here.
            n_reached = min(
                len(segment), self.MAX_CUSTOMERS_PER_CAMPAIGN, remaining_contacts
            )
            if cost_per_contact > 0:
                n_reached = min(n_reached, int(remaining_budget // cost_per_contact))
            if n_reached <= 0:
                continue

            selected = segment.iloc[:n_reached]
            estimated_gain = conservative_ratio * float(selected["predicted_arpu"].sum())
            campaign_cost = n_reached * cost_per_contact
            estimated_net = estimated_gain - campaign_cost
            if estimated_net <= 0:
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
            projected_incremental_net += estimated_net
            remaining_contacts -= n_reached
            remaining_budget -= campaign_cost

        # Pilot contacts are included in total cost. Avoid launching a plan whose
        # conservative projected margin cannot cover the exploration spend.
        if projected_incremental_net <= pilot_spent:
            return []
        return campaigns
