import { apiClient } from "@/shared/api";

import type { RobustnessResponse } from "./types";

export const getRobustness = (runs: number): Promise<RobustnessResponse> =>
  apiClient<RobustnessResponse>(
    `/api/robustness?runs=${encodeURIComponent(runs)}`,
  );
