import type { StrategyComparisonResponse } from "../api";

import type { StrategyComparison } from "./types";

export function mapStrategyComparison(
  response: StrategyComparisonResponse,
): StrategyComparison {
  return {
    runs: response.runs,
    baselinePolicy: response.baseline_policy,
    winner: response.winner,
    summaries: response.summaries.map((summary) => ({
      policy: summary.policy,
      medianNet: summary.median_net,
      p10Net: summary.p10_net,
      minimumNet: summary.minimum_net,
      positiveRuns: summary.positive_runs,
      winsVsCurrent: summary.wins_vs_current,
      medianDelta: summary.median_delta,
      medianPilots: summary.median_pilots,
      medianCallCost: summary.median_call_cost,
      medianAdsCost: summary.median_ads_cost,
      maxCampaignCost: summary.max_campaign_cost,
      medianContacts: summary.median_contacts,
    })),
  };
}
