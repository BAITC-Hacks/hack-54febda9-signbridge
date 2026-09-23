export interface StrategySummaryResponse {
  policy: string;
  median_net: number;
  p10_net: number;
  minimum_net: number;
  positive_runs: number;
  wins_vs_current: number;
  median_delta: number;
  median_pilots: number;
  median_call_cost: number;
  median_ads_cost: number;
  max_campaign_cost: number;
  median_contacts: number;
}

export interface StrategyComparisonResponse {
  runs: number;
  baseline_policy: string;
  winner: string;
  summaries: StrategySummaryResponse[];
}
