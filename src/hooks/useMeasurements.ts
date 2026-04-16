import { useQuery } from '@tanstack/react-query';
import { fetchLatestMeasurements, fetchHistoricalMeasurements, fetchMapMeasurements, fetchMapRainfall24hr } from '../api/measurements';
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

// Returns a Map<station_id, { value, units }> for the given variable across all stations.
// Only enabled when varId is non-null so callers can conditionally fetch.
export function useMapMeasurements(varId: string | null) {
  return useQuery({
    queryKey: ['measurements', 'map', varId],
    queryFn: async () => {
      const rows = await fetchMapMeasurements(varId!);
      const map = new Map<string, { value: number; units: string }>();
      for (const m of rows) {
        const v = Number(m.value);
        if (!Number.isNaN(v)) map.set(m.station_id, { value: v, units: m.units ?? '' });
      }
      return map;
    },
    enabled: !!varId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 10,
  });
}

// Sums 24hr of RF_1_Tot300s per station across all Hawaii stations.
export function useMapRainfall24hr(enabled: boolean) {
  return useQuery({
    queryKey: ['measurements', 'map', 'rainfall24hr'],
    queryFn: async () => {
      const rows = await fetchMapRainfall24hr();
      const sums = new Map<string, number>();
      let units = 'mm';
      for (const m of rows) {
        if (m.value == null) continue;
        const v = Number(m.value);
        if (Number.isNaN(v)) continue;
        sums.set(m.station_id, (sums.get(m.station_id) ?? 0) + v);
        if (m.units) units = m.units;
      }
      const result = new Map<string, { value: number; units: string }>();
      for (const [id, total] of sums) result.set(id, { value: total, units });
      return result;
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 15,
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
