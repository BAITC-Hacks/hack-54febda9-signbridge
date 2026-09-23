export interface Pilot {
  name: string;
  channel: string;
  fromTariff: string | null;
  targetTariff: string;
  arpuSegment: string | null;
  dataSegment: string | null;
  callSegment: string | null;
  contacts: number;
  cost: number;
  observedLiftPct: number;
}

export interface Campaign {
  name: string;
  fromTariff: string | null;
  toTariff: string;
  arpuSegment: string | null;
  dataSegment: string | null;
  callSegment: string | null;
  channel: string;
  contacts: number;
  cost: number;
  grossLift: number;
  capped: boolean;
}

export interface ModelTrace {
  pilot: string;
  source: "coverage" | "historical";
  currentTariff: string;
  targetTariff: string;
  arpuSegment: string;
  predictedBeforePct: number;
  uncertaintyBeforePct: number;
  observedPct: number;
  predictedAfterPct: number;
}

export interface Run {
  seed: number;
  status: "PASS" | "FAIL";
  agentError: string | null;
  baseline: number;
  grossLift: number;
  totalCost: number;
  netGain: number;
  growthPct: number;
  coveragePct: number;
  riskPct: number;
  totalContacts: number;
  uniqueCustomers: number;
  audienceTotal: number;
  budgetLimit: number;
  contactLimit: number;
  pilots: Pilot[];
  campaigns: Campaign[];
  channels: Record<string, { cost: number; contacts: number }>;
  modelTrace: ModelTrace[];
}
