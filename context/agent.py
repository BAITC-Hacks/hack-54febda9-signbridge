"""Агент для кейса SignBridge.

Кандидаты и пилотный алгоритм — интеграция выводов из:
  ../tasks/01-data-analysis.md    — исторические переходы, аудитории, резерв (T-004)
  ../tasks/02-pilot-strategy.md   — очередь гипотез, риск-фильтр LCB, каналовая
                                    экономика и диверсификация риска (T-005)
"""

from __future__ import annotations

import math

import numpy as np


class BayesianPilotModel:
    """Small Bayesian linear model trained online from aggregate pilot outcomes.

    The feature vector describes a tariff hypothesis, not a customer. The
    additional residual variance prevents a few pilots from making the model
    overconfident about a different hypothesis with similar features.
    """

    OBSERVATION_STD = 0.804
    ARM_RESIDUAL_STD = 0.10

    def __init__(self):
        prior_mean = np.array([0.08, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=float)
        prior_std = np.array([0.18, 0.10, 0.10, 0.08, 0.08, 0.08], dtype=float)
        self.precision = np.diag(1.0 / prior_std**2)
        self.information = self.precision @ prior_mean
        self.observations = 0

    def predict(self, features):
        coefficients = np.linalg.solve(self.precision, self.information)
        feature_uncertainty = np.linalg.solve(self.precision, features)
        mean = float(features @ coefficients)
        std = math.sqrt(max(float(features @ feature_uncertainty), 0.0) + self.ARM_RESIDUAL_STD**2)
        return mean, std

    def update(self, features, observed_lift_ratio, n_customers):
        variance = self.OBSERVATION_STD**2 / max(int(n_customers), 1) + self.ARM_RESIDUAL_STD**2
        self.precision += np.outer(features, features) / variance
        self.information += features * float(observed_lift_ratio) / variance
        self.observations += 1


class Agent:
    # Кандидаты: очередь гипотез из задачи 2 + два непересекающихся резерва T-004.
    # tier определяет размер SMS-пилота. Исключены tariff_8->tariff_13 HIGH и
    # tariff_4->tariff_8 HIGH: история даёт по ним выраженный отрицательный сигнал.
    CANDIDATES = [
        {"current_tariff": "tariff_4", "arpu_segment": "MID", "target_tariff": "tariff_8", "tier": "priority"},
        {"current_tariff": "tariff_13", "arpu_segment": "MID", "target_tariff": "tariff_8", "tier": "priority"},
        {"current_tariff": "tariff_8", "arpu_segment": "MID", "target_tariff": "tariff_10", "tier": "priority"},
        {"current_tariff": "tariff_10", "arpu_segment": "MID", "target_tariff": "tariff_11", "tier": "priority"},
        {"current_tariff": "tariff_11", "arpu_segment": "HIGH", "target_tariff": "tariff_12", "tier": "confirm"},
        {"current_tariff": "tariff_8", "arpu_segment": "LOW", "target_tariff": "tariff_9", "tier": "exploratory"},
        {"current_tariff": "tariff_12", "arpu_segment": "MID", "target_tariff": "tariff_8", "tier": "exploratory"},
        {"current_tariff": "tariff_11", "arpu_segment": "MID", "target_tariff": "tariff_8", "tier": "reserve"},
        {"current_tariff": "tariff_4", "arpu_segment": "LOW", "target_tariff": "tariff_9", "tier": "reserve"},
    ]
    PILOT_SIZE_BY_TIER = {"priority": 200, "confirm": 100, "exploratory": 100, "reserve": 100}

    PILOT_CHANNEL = "sms"
    BASE_SMS_PILOTS = 8
    MAX_PILOTS_THIS_RUN = 9  # один дополнительный пилот для непокрытой крупной группы
    COVERAGE_PILOT_SIZE = 200
    MIN_COVERAGE_AUDIENCE = 200
    MIN_PILOT_SIZE = 10
    # Внутренний потолок разведки: 15% бюджета (см. задачу 2), не требование его исчерпать.
    EXPLORATION_BUDGET_SHARE = 0.15

    MAX_CAMPAIGNS = 10
    MAX_CUSTOMERS_PER_CAMPAIGN = 5_000

    # Ориентир стандартного отклонения эффекта на абонента из environment.py.
    PILOT_STD_PER_CUSTOMER = 0.804
    # Односторонняя нижняя граница ~90% при нормальном шуме (задача 2).
    RISK_Z = 1.28

    # --- T-005: диверсификация каналового риска ---
    # Каналы, для которых мы не пилотируем сами по умолчанию (оценка идёт
    # экстраполяцией от SMS), поэтому их концентрация ограничивается.
    PAID_UNPILOTED_CHANNELS = {"digital_ads", "call"}
    # Если непроверенный платный канал должен получить больше этой доли бюджета
    # (или становится крупнейшей статьёй расходов) — сначала пилотировать канал напрямую.
    DIRECT_PILOT_TRIGGER_SHARE = 0.20
    DIRECT_PILOT_SIZE = {"digital_ads": 100, "call": 60}
    DIRECT_PILOT_MIN_SIZE = {"digital_ads": 50, "call": 50}
    # До прямого пилота канал ограничен этим потолком по сумме финальных кампаний.
    PRE_PILOT_CHANNEL_CAP = 15_000
    # После положительного прямого пилота — более широкие, но всё ещё явные потолки.
    POST_PILOT_CAMPAIGN_CAP = 35_000
    POST_PILOT_CHANNEL_CAP = 50_000

    def __init__(self, use_bandit: bool = True, explore_new_groups: bool = True):
        # Flags preserve both earlier policies for paired offline comparisons.
        self.use_bandit = use_bandit
        self.explore_new_groups = explore_new_groups
        self.model_trace = []

    def _coverage_candidate(self, env):
        """Выбрать одну крупную непроверенную ячейку без знания её эффекта.

        Берём уже осмысленный переход из исторического списка, но проверяем
        другой ARPU-сегмент. Размер потенциальной выручки задаёт приоритет
        разведки, а не обещает положительный эффект кампании.
        """
        profile = env.customer_profile
        required = {"current_tariff", "arpu_segment", "predicted_arpu"}
        if not required.issubset(profile.columns):
            return None
        prices = dict(zip(env.tariffs["tariff_plan_code"], env.tariffs["price_tariff"]))
        existing_groups = {(c["current_tariff"], c["arpu_segment"]) for c in self.CANDIDATES}
        grouped = profile.groupby(["current_tariff", "arpu_segment"], observed=True)["predicted_arpu"].agg(
            ["size", "mean"]
        )
        options = []
        for order, candidate in enumerate(self.CANDIDATES):
            source = candidate["current_tariff"]
            target = candidate["target_tariff"]
            if not (prices.get(target, 0) > prices.get(source, float("inf"))):
                continue
            for (current, segment), row in grouped.iterrows():
                if current != source or (current, segment) in existing_groups:
                    continue
                audience_size = int(row["size"])
                if audience_size < self.MIN_COVERAGE_AUDIENCE:
                    continue
                potential_arpu = min(audience_size, self.MAX_CUSTOMERS_PER_CAMPAIGN) * float(row["mean"])
                options.append((potential_arpu, -order, str(segment), {
                    "current_tariff": source,
                    "arpu_segment": str(segment),
                    "target_tariff": target,
                    "tier": "coverage",
                    "coverage": True,
                }))
        return max(options, key=lambda option: option[:3])[3] if options else None

    def act(self, env) -> list[dict]:
        """Провести разведочные и (при необходимости) прямые пилоты, вернуть кампании."""
        self.model_trace = []
        sms_results = self._run_sms_pilots(env)
        passing = self._risk_filter(sms_results)
        prelim = self._prepare_candidates(env, passing)
        self._run_direct_pilots(env, prelim)
        return self._select_campaigns(env, prelim)

    def _audience(self, env, candidate):
        profile = env.customer_profile
        return profile[
            (profile["current_tariff"] == candidate["current_tariff"])
            & (profile["arpu_segment"] == candidate["arpu_segment"])
        ]

    @staticmethod
    def _pilot_features(candidate, avg_arpu, audience_size, median_arpu, prices, median_price):
        """Bounded features keep the online regression stable on small samples."""
        from_price = float(prices.get(candidate["current_tariff"], median_price))
        to_price = float(prices.get(candidate["target_tariff"], median_price))
        return np.array([
            1.0,
            float(np.clip(avg_arpu / median_arpu - 1.0, -1.0, 2.0)),
            float(np.clip((to_price - from_price) / median_price, -1.0, 1.0)),
            float(candidate["arpu_segment"] == "LOW"),
            float(candidate["arpu_segment"] == "HIGH"),
            min(math.log1p(audience_size) / math.log1p(5_000), 1.0),
        ])

    def _run_sms_pilots(self, env) -> list[dict]:
        if not self.use_bandit:
            return self._run_sms_pilots_fixed(env)

        channel = self.PILOT_CHANNEL
        channel_info = env.channels.get(channel)
        if channel_info is None:
            return []
        cost_per_contact = float(channel_info["cost_per_contact"])

        exploration_budget = env.total_budget * self.EXPLORATION_BUDGET_SHARE
        pilot_spent = sum(float(item.get("cost", 0)) for item in env.pilot_history)

        model = BayesianPilotModel()
        median_arpu = max(float(env.customer_profile["predicted_arpu"].median()), 1.0)
        prices = dict(zip(env.tariffs["tariff_plan_code"], env.tariffs["price_tariff"]))
        median_price = max(float(env.tariffs["price_tariff"].median()), 1.0)
        coverage_candidate = self._coverage_candidate(env) if self.explore_new_groups else None
        candidates = self.CANDIDATES + ([coverage_candidate] if coverage_candidate else [])
        max_pilots = self.MAX_PILOTS_THIS_RUN if coverage_candidate else self.BASE_SMS_PILOTS
        options = []
        for order, candidate in enumerate(candidates):
            audience = self._audience(env, candidate)
            if len(audience) < self.MIN_PILOT_SIZE:
                continue
            avg_arpu = float(audience["predicted_arpu"].mean())
            features = self._pilot_features(
                candidate, avg_arpu, len(audience), median_arpu, prices, median_price
            )
            if not np.isfinite(features).all():
                continue
            options.append({
                "candidate": candidate,
                "order": order,
                "audience_size": len(audience),
                "total_arpu": float(audience["predicted_arpu"].sum()),
                "features": features,
            })

        if not options:
            return self._run_sms_pilots_fixed(env)

        results = []
        used_groups = set()
        model_active = True
        while options and len(results) < max_pilots and env.pilots_left > 0:
            budget_left = min(float(env.remaining_budget), exploration_budget - pilot_spent)
            if budget_left < cost_per_contact * self.MIN_PILOT_SIZE or env.remaining_contacts < self.MIN_PILOT_SIZE:
                break

            eligible = [option for option in options if (
                option["candidate"]["current_tariff"], option["candidate"]["arpu_segment"]
            ) not in used_groups]
            if not eligible:
                break

            if model_active:
                try:
                    for option in eligible:
                        mean, std = model.predict(option["features"])
                        if not (math.isfinite(mean) and math.isfinite(std)):
                            raise ValueError("non-finite model prediction")
                        option["prediction"] = (mean, std)
                        reach = min(option["audience_size"], self.MAX_CUSTOMERS_PER_CAMPAIGN)
                        # Upper-confidence utility balances learning and potential net gain.
                        option["opportunity"] = (mean + self.RISK_Z * std) * (
                            option["total_arpu"] * reach / option["audience_size"]
                        ) - reach * cost_per_contact
                except (np.linalg.LinAlgError, ValueError, FloatingPointError):
                    model_active = False

            coverage_options = [option for option in eligible if option["candidate"].get("coverage")]
            if len(results) < 4:
                # Four stronger historical hypotheses anchor the online model.
                option = min(eligible, key=lambda entry: entry["order"])
            elif coverage_options:
                # Reserve one pilot for an audience that the fixed list misses.
                option = coverage_options[0]
            elif not model_active:
                option = min(eligible, key=lambda entry: entry["order"])
            else:
                option = max(eligible, key=lambda entry: (entry["opportunity"], -entry["order"]))
                if option["opportunity"] <= 0:
                    break

            candidate = option["candidate"]
            options.remove(option)
            group = (candidate["current_tariff"], candidate["arpu_segment"])
            nominal_n = (self.COVERAGE_PILOT_SIZE if candidate.get("coverage")
                         else self.PILOT_SIZE_BY_TIER[candidate["tier"]])
            n = min(nominal_n, option["audience_size"], int(env.remaining_contacts))
            if cost_per_contact > 0:
                n = min(n, int(budget_left // cost_per_contact))
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
                continue

            pilot_spent += float(result.get("cost", 0))
            used_groups.add(group)
            observed = float(result.get("observed_lift_ratio", 0.0))
            if not math.isfinite(observed):
                result = {**result, "observed_lift_ratio": 0.0}
                observed = 0.0
                model_active = False
            if model_active:
                try:
                    model.update(option["features"], observed, result.get("n_customers", n))
                    after, _ = model.predict(option["features"])
                    if not math.isfinite(after):
                        raise ValueError("non-finite updated prediction")
                    before, uncertainty = option["prediction"]
                    self.model_trace.append({
                        "pilot": result.get("pilot", ""),
                        "source": "coverage" if candidate.get("coverage") else "historical",
                        "current_tariff": candidate["current_tariff"],
                        "target_tariff": candidate["target_tariff"],
                        "arpu_segment": candidate["arpu_segment"],
                        "predicted_before_pct": before * 100,
                        "uncertainty_before_pct": uncertainty * 100,
                        "observed_pct": observed * 100,
                        "predicted_after_pct": after * 100,
                    })
                except (np.linalg.LinAlgError, ValueError, FloatingPointError):
                    model_active = False
            results.append({**candidate, "result": result})

        return results

    def _run_sms_pilots_fixed(self, env) -> list[dict]:
        """Previous fixed queue, retained as an offline benchmark and fallback."""
        channel_info = env.channels.get(self.PILOT_CHANNEL)
        if channel_info is None:
            return []
        cost_per_contact = float(channel_info["cost_per_contact"])
        exploration_budget = env.total_budget * self.EXPLORATION_BUDGET_SHARE
        spent = sum(float(item.get("cost", 0)) for item in env.pilot_history)
        results = []
        for candidate in self.CANDIDATES[: self.BASE_SMS_PILOTS]:
            if env.pilots_left <= 0:
                break
            audience = self._audience(env, candidate)
            if len(audience) < self.MIN_PILOT_SIZE:
                continue
            budget_left = min(float(env.remaining_budget), exploration_budget - spent)
            if budget_left < cost_per_contact * self.MIN_PILOT_SIZE:
                break
            n = min(
                self.PILOT_SIZE_BY_TIER[candidate["tier"]],
                len(audience),
                int(env.remaining_contacts),
            )
            if cost_per_contact > 0:
                n = min(n, int(budget_left // cost_per_contact))
            if n < self.MIN_PILOT_SIZE:
                continue
            try:
                result = env.run_pilot(
                    target_tariff=candidate["target_tariff"],
                    channel=self.PILOT_CHANNEL,
                    n_customers=n,
                    filter_arpu_segment=candidate["arpu_segment"],
                    filter_current_tariff=candidate["current_tariff"],
                )
            except (RuntimeError, ValueError, KeyError):
                continue
            spent += float(result.get("cost", 0))
            results.append({**candidate, "result": result})
        return results

    def _risk_filter(self, sms_results: list[dict]) -> list[dict]:
        """UCB/LCB риск-фильтр по SMS-скринингу: z=1.28 из задачи 2."""
        passing = []
        for item in sms_results:
            result = item["result"]
            n_pilot = max(int(result.get("n_customers", 0)), 1)
            observed = float(result.get("observed_lift_ratio", 0.0))
            se = self.PILOT_STD_PER_CUSTOMER / math.sqrt(n_pilot)
            upper = observed + self.RISK_Z * se
            if upper <= 0:
                continue  # верхняя граница не выше нуля — гипотеза отклонена
            passing.append({"item": item, "lcb_sms": observed - self.RISK_Z * se})
        return passing

    def _channel_estimate(self, env, lcb_sms, avg_arpu_per_customer, channel):
        sms_multiplier = float(env.channels[self.PILOT_CHANNEL]["conversion_multiplier"])
        multiplier = float(env.channels[channel]["conversion_multiplier"])
        cost = float(env.channels[channel]["cost_per_contact"])
        scale = multiplier / sms_multiplier if sms_multiplier else 1.0
        lcb_channel = lcb_sms * scale
        return lcb_channel, lcb_channel * avg_arpu_per_customer - cost

    def _best_channel(self, env, lcb_sms, avg_arpu_per_customer, segment):
        best_channel, best_lcb, best_net, best_reach, best_total = None, 0.0, 0.0, 0, 0.0
        for name in env.channels:
            lcb_channel, net_per_contact = self._channel_estimate(env, lcb_sms, avg_arpu_per_customer, name)
            if net_per_contact <= 0:
                continue
            cost = float(env.channels[name]["cost_per_contact"])
            reach = min(len(segment), self.MAX_CUSTOMERS_PER_CAMPAIGN, int(env.remaining_contacts))
            if cost > 0:
                reach = min(reach, int(env.remaining_budget // cost))
                if name in self.PAID_UNPILOTED_CHANNELS:
                    # Прямой пилот может открыть этот потолок; до него оценка
                    # остаётся оптимистичной, но учитывает форму фильтров.
                    reach = min(reach, int(self.POST_PILOT_CAMPAIGN_CAP // cost))
            if len(segment) > reach:
                narrowed, _ = self._narrow_segment(segment, reach)
                reach = len(narrowed) if narrowed is not None else 0
            total_net = net_per_contact * reach
            if total_net > best_total:
                best_channel, best_lcb, best_net, best_reach, best_total = (
                    name, lcb_channel, net_per_contact, reach, total_net
                )
        return best_channel, best_lcb, best_net, best_reach

    def _prepare_candidates(self, env, passing: list[dict]) -> list[dict]:
        """Построить предварительный выбор канала (экстраполяция от SMS) на каждого кандидата."""
        profile = env.customer_profile
        prelim = []
        for entry in passing:
            item = entry["item"]
            segment = profile[
                (profile["current_tariff"] == item["current_tariff"])
                & (profile["arpu_segment"] == item["arpu_segment"])
            ].sort_values("ID_NUMBER")
            if len(segment) == 0:
                continue

            avg_arpu = float(segment["predicted_arpu"].sum()) / len(segment)
            channel, lcb_channel, net_per_contact, reach_estimate = self._best_channel(
                env, entry["lcb_sms"], avg_arpu, segment
            )
            if channel is None or reach_estimate <= 0:
                continue  # ни один канал не даёт положительную нижнюю оценку net

            cost = float(env.channels[channel]["cost_per_contact"])
            prelim.append({
                "item": item,
                "segment": segment,
                "avg_arpu": avg_arpu,
                "channel": channel,
                "lcb_channel": lcb_channel,
                "reach_estimate": reach_estimate,
                "spend_estimate": reach_estimate * cost,
                "direct_pilot_lcb": None,
                "direct_pilot_cost": 0.0,
            })
        return prelim

    def _run_direct_pilots(self, env, prelim: list[dict]) -> None:
        """T-005: пилотировать напрямую платный канал, если он рискует получить
        больше 20% бюджета или становится крупнейшей статьёй расходов."""
        threshold = env.total_budget * self.DIRECT_PILOT_TRIGGER_SHARE
        exploration_budget = env.total_budget * self.EXPLORATION_BUDGET_SHARE

        paid_entries = [e for e in prelim if e["channel"] in self.PAID_UNPILOTED_CHANNELS]
        if not paid_entries:
            return
        max_paid_spend = max(e["spend_estimate"] for e in paid_entries)

        for entry in paid_entries:
            if entry["spend_estimate"] < threshold and entry["spend_estimate"] < max_paid_spend:
                continue

            channel = entry["channel"]
            nominal_size = self.DIRECT_PILOT_SIZE[channel]
            min_size = self.DIRECT_PILOT_MIN_SIZE[channel]
            cost_per_contact = float(env.channels[channel]["cost_per_contact"])
            pilot_spent = sum(float(r.get("cost", 0)) for r in env.pilot_history)
            budget_left = min(float(env.remaining_budget), exploration_budget - pilot_spent)

            if env.pilots_left <= 0 or cost_per_contact <= 0 or budget_left < min_size * cost_per_contact:
                continue  # нет ресурса на прямой пилот — канал остаётся под потолком PRE_PILOT_CHANNEL_CAP

            n = min(nominal_size, int(env.remaining_contacts), int(budget_left // cost_per_contact))
            if n < min_size:
                continue

            item = entry["item"]
            try:
                result = env.run_pilot(
                    target_tariff=item["target_tariff"],
                    channel=channel,
                    n_customers=n,
                    filter_arpu_segment=item["arpu_segment"],
                    filter_current_tariff=item["current_tariff"],
                )
            except (RuntimeError, ValueError, KeyError):
                continue

            n_pilot = max(int(result.get("n_customers", 0)), 1)
            observed = float(result.get("observed_lift_ratio", 0.0))
            se = self.PILOT_STD_PER_CUSTOMER / math.sqrt(n_pilot)
            entry["direct_pilot_lcb"] = observed - self.RISK_Z * se
            entry["direct_pilot_cost"] = float(result.get("cost", 0.0))

    def _select_campaigns(self, env, prelim: list[dict]) -> list[dict]:
        """Выбор непересекающихся ячеек по убыванию net с потолками T-005."""
        channel_has_direct_pilot = {
            e["channel"] for e in prelim if e["direct_pilot_lcb"] is not None
        }
        direct_pilot_cost_by_channel: dict[str, float] = {}
        for e in prelim:
            if e["direct_pilot_lcb"] is not None:
                direct_pilot_cost_by_channel[e["channel"]] = (
                    direct_pilot_cost_by_channel.get(e["channel"], 0.0) + e["direct_pilot_cost"]
                )

        candidates = []
        for entry in prelim:
            channel = entry["channel"]
            has_own_direct_pilot = entry["direct_pilot_lcb"] is not None
            lcb_channel = entry["direct_pilot_lcb"] if has_own_direct_pilot else entry["lcb_channel"]
            cost_per_contact = float(env.channels[channel]["cost_per_contact"])
            net_per_contact = lcb_channel * entry["avg_arpu"] - cost_per_contact
            if net_per_contact <= 0:
                continue  # прямой пилот опроверг оценку или канал изначально не окупался

            if channel in self.PAID_UNPILOTED_CHANNELS:
                campaign_cap = self.POST_PILOT_CAMPAIGN_CAP if has_own_direct_pilot else self.PRE_PILOT_CHANNEL_CAP
                if channel in channel_has_direct_pilot:
                    channel_cap = self.POST_PILOT_CHANNEL_CAP - direct_pilot_cost_by_channel.get(channel, 0.0)
                else:
                    channel_cap = self.PRE_PILOT_CHANNEL_CAP
            else:
                campaign_cap = channel_cap = float("inf")

            candidates.append({
                "item": entry["item"],
                "segment": entry["segment"],
                "channel": channel,
                "net_per_contact": net_per_contact,
                "reach_estimate": entry["reach_estimate"],
                "campaign_cap": campaign_cap,
                "channel_cap": channel_cap,
            })

        candidates.sort(key=lambda c: c["net_per_contact"] * c["reach_estimate"], reverse=True)

        campaigns = []
        remaining_contacts = int(env.remaining_contacts)
        remaining_budget = float(env.remaining_budget)
        channel_spent = dict(direct_pilot_cost_by_channel)

        for candidate in candidates:
            if len(campaigns) >= self.MAX_CAMPAIGNS or remaining_contacts <= 0:
                break

            item = candidate["item"]
            segment = candidate["segment"]
            channel = candidate["channel"]
            cost_per_contact = float(env.channels[channel]["cost_per_contact"])

            max_customers = min(self.MAX_CUSTOMERS_PER_CAMPAIGN, remaining_contacts)
            if cost_per_contact > 0:
                max_customers = min(max_customers, int(remaining_budget // cost_per_contact))
                room = min(
                    candidate["campaign_cap"],
                    candidate["channel_cap"] - channel_spent.get(channel, 0.0),
                )
                if room < float("inf"):
                    max_customers = min(max_customers, max(int(room // cost_per_contact), 0))
            if max_customers <= 0 or candidate["net_per_contact"] * max_customers <= 0:
                continue

            # Кампания задаётся ФИЛЬТРАМИ, а не явным числом абонентов: среда
            # берёт весь подходящий сегмент. Если он больше потолка (T-005),
            # сузить его доп. фильтром по data_/call_segment, а не выдавать
            # кампанию, которая на деле обойдёт лимит канала/кампании.
            extra_filter = None
            if len(segment) > max_customers:
                segment, extra_filter = self._narrow_segment(segment, max_customers)
                if segment is None:
                    continue  # не нашли подсегмент под потолок — пропустить канал

            n_reached = len(segment)
            campaign_cost = n_reached * cost_per_contact
            campaign = {
                "campaign_name": (
                    f"pilot_confirm_{item['current_tariff']}_"
                    f"{item['target_tariff']}_{item['arpu_segment']}"
                ),
                "filter_arpu_segment": item["arpu_segment"],
                "filter_current_tariff": item["current_tariff"],
                "target_tariff": item["target_tariff"],
                "channel": channel,
            }
            if extra_filter is not None:
                col, value = extra_filter
                campaign["filter_data_segment" if col == "data_segment" else "filter_call_segment"] = value
            campaigns.append(campaign)

            remaining_contacts -= n_reached
            remaining_budget -= campaign_cost
            channel_spent[channel] = channel_spent.get(channel, 0.0) + campaign_cost

        return campaigns

    @staticmethod
    def _narrow_segment(segment, max_customers):
        """Найти наибольший подсегмент по data_/call_segment, помещающийся в max_customers."""
        best = None
        for col in ("data_segment", "call_segment"):
            if col not in segment.columns:
                continue
            sizes = segment[col].value_counts()
            fitting = sizes[sizes <= max_customers]
            if not fitting.empty:
                value = fitting.idxmax()
                subset = segment[segment[col] == value]
                if best is None or len(subset) > len(best[0]):
                    best = (subset, (col, value))
        return best if best is not None else (None, None)
