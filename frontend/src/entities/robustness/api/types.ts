export interface RobustnessResultResponse {
  seed: number;
  net_gain: number;
  status: "PASS" | "FAIL";
  cost: number;
}

export interface RobustnessResponse {
  runs: number;
  positive: number;
  median: number;
  minimum: number;
  maximum: number;
  results: RobustnessResultResponse[];
}
