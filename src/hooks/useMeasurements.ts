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

// Fetches 24h of RF_1_Tot300s and returns the summed total + raw units.
// enabled flag lets callers skip the fetch when rainfall isn't relevant.
export function useRainfall24hr(stationId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['measurements', 'rainfall24hr', stationId],
    queryFn: async () => {
      const data = await fetchHistoricalMeasurements(stationId!, 'RF_1_Tot300s', '24h');
      const valid = data.filter(m => m.value != null);
      return {
        total: valid.reduce((sum, m) => sum + Number(m.value), 0),
        units: valid[0]?.units ?? 'mm',
      };
    },
    enabled: !!stationId && enabled,
    staleTime: 1000 * 60 * 5,
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
