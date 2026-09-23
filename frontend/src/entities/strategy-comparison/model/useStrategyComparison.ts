import { useQuery } from "@tanstack/react-query";

import { getStrategyComparison } from "../api";

import { mapStrategyComparison } from "./mappers";

export function useStrategyComparison(runs: number | null) {
  const query = useQuery({
    queryKey: ["strategy-comparison", runs],
    queryFn: () => getStrategyComparison(runs ?? 10),
    select: mapStrategyComparison,
    enabled: runs !== null,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
