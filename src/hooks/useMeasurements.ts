import { useQuery } from '@tanstack/react-query';
import { fetchLatestMeasurements, fetchHistoricalMeasurements } from '../api/measurements';
import type { TimeRange } from '../types/api';

export function useLatestMeasurements(stationId: string | null) {
  return useQuery({
    queryKey: ['measurements', 'latest', stationId],
    queryFn: () => fetchLatestMeasurements(stationId!),
    enabled: !!stationId,
    staleTime: 1000 * 60 * 2,          // treat cached data as fresh for 2 min
    refetchInterval: 1000 * 60 * 5,    // background re-fetch every 5 min while panel is open
  });
}

export function useHistoricalMeasurements(
  stationId: string | null,
  varId: string | null,
  range: TimeRange
) {
  return useQuery({
    queryKey: ['measurements', 'historical', stationId, varId, range],
    queryFn: () => fetchHistoricalMeasurements(stationId!, varId!, range),
    enabled: !!stationId && !!varId,
    staleTime: 1000 * 60 * 5,
  });
}
