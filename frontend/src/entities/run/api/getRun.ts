import { apiClient } from "@/shared/api";

import type { RunResponse } from "./types";

export const getRun = (seed: number): Promise<RunResponse> =>
  apiClient<RunResponse>(`/api/run?seed=${encodeURIComponent(seed)}`);
