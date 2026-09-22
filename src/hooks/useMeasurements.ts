import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLatestMeasurements, fetchLatestMeasurementsBatch, fetchHistoricalMeasurements, fetchMapMeasurements, fetchMapRainfall24hr } from '../api/measurements';
import { useVariables } from './useVariables';
import type { Measurement, TimeRange } from '../types/api';

export function useLatestMeasurements(stationId: string | null) {
  return useQuery({
    queryKey: ['measurements', 'latest', stationId],
    queryFn: ({ signal }) => fetchLatestMeasurements(stationId!, signal),
    enabled: !!stationId,
    staleTime: 1000 * 60 * 2,          // treat cached data as fresh for 2 min
    refetchInterval: 1000 * 60 * 5,    // background re-fetch every 5 min while panel is open
  });
}

// Batched latest readings for a set of stations limited to the given variables.
// One request replaces N per-station fetches. Returns Map<station_id, Measurement[]>.
// The query key includes the sorted station + variable lists so it re-fetches when
// the favorites or the displayed variable change.
//
// The fetch omits join_metadata; units are attached here from the cached /variables
// metadata via `select` (keyed by variable id) so consumers still see m.units.
export function useLatestVarBatch(stationIds: string[], varIds: string[]) {
  const stationKey = [...stationIds].sort().join(',');
  const varKey = [...varIds].sort().join(',');
  const { data: variables } = useVariables();
  const select = useCallback(
    (byStation: Map<string, Measurement[]>) => {
      const out = new Map<string, Measurement[]>();
      for (const [id, rows] of byStation) {
        out.set(id, rows.map(m => ({
          ...m,
          units: m.units ?? variables?.get(m.variable)?.units ?? '',
        })));
      }
      return out;
    },
    [variables],
  );
  return useQuery({
    queryKey: ['measurements', 'latestBatch', stationKey, varKey],
    queryFn: ({ signal }) => fetchLatestMeasurementsBatch(stationIds, varIds, signal),
    select,
    enabled: stationIds.length > 0 && varIds.length > 0,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}

// The 24h rainfall total and the 24h rainfall chart series are the same request:
// fetchHistoricalMeasurements(id, 'RF_1_Tot300s', '24h'). They used to sit under
// two different cache keys, so a station detail page showing rainfall issued the
// identical query twice. Both now share this key — the total is derived from the
// cached rows with `select`, so no second request is made.
//
// Keyed alias rather than call-site discipline: useHistoricalMeasurements maps
// that exact (variable, range) pair onto this key too, which is self-enforcing.
function rainfall24hrKey(stationId: string | null) {
  return ['measurements', 'rainfall24hr', stationId] as const;
}

// Fetches 24h of RF_1_Tot300s and returns the summed total + raw units.
// enabled flag lets callers skip the fetch when rainfall isn't relevant.
export function useRainfall24hr(stationId: string | null, enabled = true) {
  return useQuery({
    queryKey: rainfall24hrKey(stationId),
    queryFn: ({ signal }) => fetchHistoricalMeasurements(stationId!, 'RF_1_Tot300s', '24h', signal),
    select: rainfallTotal,
    enabled: !!stationId && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// Sum the 24h rainfall rows into a single total.
function rainfallTotal(rows: Measurement[]) {
  const valid = rows.filter(m => m.value != null);
  return {
    total: valid.reduce((sum, m) => sum + Number(m.value), 0),
    units: valid[0]?.units ?? 'mm',
  };
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
    queryFn: ({ signal }) => fetchMapMeasurements(varId!, signal),
    select,
    enabled: !!varId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 10,
  });
}

// Sums 24hr of RF_1_Tot300s per station across every station in the region.
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
    queryFn: ({ signal }) => fetchMapRainfall24hr(signal),
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
  // 24h rainfall is byte-identical to the request behind useRainfall24hr, so it
  // shares that hook's cache key instead of duplicating the fetch (see above).
  const isRainfall24hr = varId === 'RF_1_Tot300s' && range === '24h';
  return useQuery({
    queryKey: isRainfall24hr
      ? rainfall24hrKey(stationId)
      : ['measurements', 'historical', stationId, varId, range],
    queryFn: ({ signal }) => fetchHistoricalMeasurements(stationId!, varId!, range, signal),
    enabled: !!stationId && !!varId,
    staleTime: 1000 * 60 * 5,
  });
}
