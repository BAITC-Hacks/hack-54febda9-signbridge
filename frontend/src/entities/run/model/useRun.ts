import { useQuery } from "@tanstack/react-query";

import { getRun } from "../api";

import { mapRun } from "./mappers";

export function useRun(seed: number) {
  const query = useQuery({
    queryKey: ["run", seed],
    queryFn: () => getRun(seed),
    select: mapRun,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
