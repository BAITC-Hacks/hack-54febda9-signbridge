export interface StrategySummary {
  policy: string;
  medianNet: number;
  p10Net: number;
  minimumNet: number;
  positiveRuns: number;
  winsVsCurrent: number;
  medianDelta: number;
  medianPilots: number;
  medianCallCost: number;
  medianAdsCost: number;
  maxCampaignCost: number;
  medianContacts: number;
}

export interface StrategyComparison {
  runs: number;
  baselinePolicy: string;
  winner: string;
  summaries: StrategySummary[];
}
