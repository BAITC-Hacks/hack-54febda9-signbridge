export interface PilotResponse {
  name: string;
  channel: string;
  from_tariff: string | null;
  target_tariff: string;
  arpu_segment: string | null;
  data_segment: string | null;
  call_segment: string | null;
  contacts: number;
  cost: number;
  observed_lift_pct: number;
}

export interface CampaignResponse {
  name: string;
  from_tariff: string | null;
  to_tariff: string;
  arpu_segment: string | null;
  data_segment: string | null;
  call_segment: string | null;
  channel: string;
  contacts: number;
  cost: number;
  gross_lift: number;
  capped: boolean;
}

export interface ModelTraceResponse {
  pilot: string;
  source?: "coverage" | "historical";
  current_tariff: string;
  target_tariff: string;
  arpu_segment: string;
  predicted_before_pct: number;
  uncertainty_before_pct: number;
  observed_pct: number;
  predicted_after_pct: number;
}

export interface RunResponse {
  seed: number;
  status: "PASS" | "FAIL";
  agent_error: string | null;
  baseline: number;
  gross_lift: number;
  total_cost: number;
  net_gain: number;
  growth_pct: number;
  coverage_pct: number;
  risk_pct: number;
  total_contacts: number;
  unique_customers: number;
  audience_total: number;
  budget_limit: number;
  contact_limit: number;
  pilots: PilotResponse[];
  campaigns: CampaignResponse[];
  channels: Record<string, { cost: number; contacts: number }>;
  model_trace: ModelTraceResponse[];
}
