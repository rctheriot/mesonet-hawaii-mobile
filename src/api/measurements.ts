import { apiGet } from './client';
import type { Measurement, TimeRange } from '../types/api';

export async function fetchLatestMeasurements(stationId: string): Promise<Measurement[]> {
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      station_ids: stationId,
      limit: 200,
      join_metadata: true,
      local_tz: true,
      location: 'hawaii',
    }
  );
  if (Array.isArray(data)) return data;
  return Object.values(data);
}

// Batched latest readings for a set of stations, limited to the given variables.
// Replaces N per-station calls with ONE request, then dedupes to the most recent
// row per (station, variable). Returns Map<station_id, Measurement[]>.
//
// NOTE: scoping to specific var_ids is essential. The API sorts all rows by
// timestamp descending and applies a single shared limit, so an unscoped
// (all-variable) batch starves stations whose latest reading is less recent —
// they fall past the cutoff and return zero rows. Restricting to the handful of
// variables actually shown keeps every station's latest within the limit.
export async function fetchLatestMeasurementsBatch(
  stationIds: string[],
  varIds: string[],
): Promise<Map<string, Measurement[]>> {
  const result = new Map<string, Measurement[]>();
  if (stationIds.length === 0 || varIds.length === 0) return result;

  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      station_ids: stationIds.join(','),
      var_ids: varIds.join(','),
      limit: 2000,
      join_metadata: true,
      local_tz: true,
      location: 'hawaii',
    }
  );
  const rows = Array.isArray(data) ? data : Object.values(data);

  // Keep only the most recent row per (station, variable).
  const latest = new Map<string, Measurement>();
  for (const m of rows) {
    if (!m.station_id || m.value == null) continue;
    const key = `${m.station_id}|${m.variable}`;
    const existing = latest.get(key);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latest.set(key, m);
    }
  }
  for (const m of latest.values()) {
    const arr = result.get(m.station_id);
    if (arr) arr.push(m);
    else result.set(m.station_id, [m]);
  }
  return result;
}

// Fetches the latest measurement for a single variable across all Hawaii stations.
// Returns at most one entry per station (the most recent).
export async function fetchMapMeasurements(varId: string): Promise<Measurement[]> {
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      var_ids: varId,
      limit: 2000,
      join_metadata: true,
      local_tz: true,
      location: 'hawaii',
    }
  );
  const raw = Array.isArray(data) ? data : Object.values(data);
  const latest = new Map<string, Measurement>();
  for (const m of raw) {
    if (!m.station_id || m.value == null) continue;
    const existing = latest.get(m.station_id);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latest.set(m.station_id, m);
    }
  }
  return Array.from(latest.values());
}

// Fetches 24hr of RF_1_Tot300s for all stations — caller sums per station_id.
export async function fetchMapRainfall24hr(): Promise<Measurement[]> {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      var_ids: 'RF_1_Tot300s',
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      join_metadata: true,
      local_tz: true,
      location: 'hawaii',
      limit: 50000,
    }
  );
  if (Array.isArray(data)) return data;
  return Object.values(data);
}

export async function fetchHistoricalMeasurements(
  stationId: string,
  varId: string,
  range: TimeRange
): Promise<Measurement[]> {
  const now = new Date();
  const start = new Date(now);

  if (range === '6h')       start.setTime(now.getTime() - 6 * 60 * 60 * 1000);
  else if (range === '24h') start.setTime(now.getTime() - 24 * 60 * 60 * 1000);
  else if (range === '3d')  start.setTime(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  else                      start.setTime(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      station_ids: stationId,
      var_ids: varId,           // request param is var_ids; response field is 'variable'
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      join_metadata: true,      // needed so each row includes 'units' for conversion
      local_tz: true,
      location: 'hawaii',
      limit: 10000,             // high limit — 7d of 5-min data ≈ 2016 rows per variable
    }
  );
  if (Array.isArray(data)) return data;
  return Object.values(data);
}
