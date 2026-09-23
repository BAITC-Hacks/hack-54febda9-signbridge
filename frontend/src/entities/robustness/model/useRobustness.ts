import { useQuery } from "@tanstack/react-query";

import { getRobustness } from "../api";

import { mapRobustness } from "./mappers";

export function useRobustness(runs: number | null) {
  const query = useQuery({
    queryKey: ["robustness", runs],
    queryFn: () => getRobustness(runs ?? 15),
    select: mapRobustness,
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
