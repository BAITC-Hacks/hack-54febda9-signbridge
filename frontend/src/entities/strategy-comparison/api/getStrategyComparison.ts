import { apiClient } from "@/shared/api";

import type { StrategyComparisonResponse } from "./types";

export const getStrategyComparison = (
  runs: number,
): Promise<StrategyComparisonResponse> =>
  apiClient<StrategyComparisonResponse>(
    `/api/strategy-benchmark?runs=${encodeURIComponent(runs)}`,
  );
