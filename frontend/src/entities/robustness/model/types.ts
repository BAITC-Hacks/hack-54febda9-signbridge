export interface RobustnessResult {
  seed: number;
  netGain: number;
  status: "PASS" | "FAIL";
  cost: number;
}

export interface Robustness {
  runs: number;
  positive: number;
  median: number;
  minimum: number;
  maximum: number;
  results: RobustnessResult[];
}
