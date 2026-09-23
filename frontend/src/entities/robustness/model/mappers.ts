import type { RobustnessResponse } from "../api/types";

import type { Robustness } from "./types";

export function mapRobustness(response: RobustnessResponse): Robustness {
  return {
    runs: response.runs,
    positive: response.positive,
    median: response.median,
    minimum: response.minimum,
    maximum: response.maximum,
    results: response.results.map((result) => ({
      seed: result.seed,
      netGain: result.net_gain,
      status: result.status,
      cost: result.cost,
    })),
  };
}
