import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLatestMeasurements, fetchLatestMeasurementsBatch, fetchHistoricalMeasurements, fetchMapMeasurements, fetchMapRainfall24hr } from '../api/measurements';
import { useVariables } from './useVariables';
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

// Batched latest readings for a set of stations limited to the given variables.
// One request replaces N per-station fetches. Returns Map<station_id, Measurement[]>.
// The query key includes the sorted station + variable lists so it re-fetches when
// the favorites or the displayed variable change.
export function useLatestVarBatch(stationIds: string[], varIds: string[]) {
  const stationKey = [...stationIds].sort().join(',');
  const varKey = [...varIds].sort().join(',');
  return useQuery({
    queryKey: ['measurements', 'latestBatch', stationKey, varKey],
    queryFn: () => fetchLatestMeasurementsBatch(stationIds, varIds),
    enabled: stationIds.length > 0 && varIds.length > 0,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
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
// Units are attached from the cached /variables metadata via `select` (the fetch
// itself omits join_metadata to keep the payload small). select runs again, with
// the same cached data, once variables load — no extra measurement request.
export function useMapMeasurements(varId: string | null) {
  const { data: variables } = useVariables();
  const units = (varId && variables?.get(varId)?.units) || '';
  const select = useCallback(
    (values: Map<string, number>) => {
      const map = new Map<string, { value: number; units: string }>();
      for (const [id, value] of values) map.set(id, { value, units });
      return map;
    },
    [units],
  );
  return useQuery({
    queryKey: ['measurements', 'map', varId],
    queryFn: () => fetchMapMeasurements(varId!),
    select,
    enabled: !!varId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 10,
  });
}

// Sums 24hr of RF_1_Tot300s per station across all Hawaii stations.
export function useMapRainfall24hr(enabled: boolean) {
  const { data: variables } = useVariables();
  const units = variables?.get('RF_1_Tot300s')?.units || 'mm';
  const select = useCallback(
    (sums: Map<string, number>) => {
      const result = new Map<string, { value: number; units: string }>();
      for (const [id, total] of sums) result.set(id, { value: total, units });
      return result;
    },
    [units],
  );
  return useQuery({
    queryKey: ['measurements', 'map', 'rainfall24hr'],
    queryFn: fetchMapRainfall24hr,
    select,
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
