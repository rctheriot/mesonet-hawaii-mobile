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
// Uses a 24h date range rather than a row limit. A shared `limit` is split across
// the requested stations, so with only a handful of stations each one pulls many
// hours of useless history (and a too-small limit would instead starve stations
// whose latest reading is older). A date range fetches just the recent window for
// every station regardless of count — far smaller and starvation-free. 24h matches
// the app's staleness threshold, so no non-stale station is dropped.
//
// join_metadata is omitted to keep the payload small (it ~4x's it); units are
// attached from the cached /variables metadata by useLatestVarBatch.
export async function fetchLatestMeasurementsBatch(
  stationIds: string[],
  varIds: string[],
): Promise<Map<string, Measurement[]>> {
  const result = new Map<string, Measurement[]>();
  if (stationIds.length === 0 || varIds.length === 0) return result;

  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      station_ids: stationIds.join(','),
      var_ids: varIds.join(','),
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      local_tz: true,
      location: 'hawaii',
      limit: 50000, // safety cap only; the date range is the real bound
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

// Latest value per station for a single variable, across all Hawaii stations.
// Returns Map<station_id, value>. Units are sourced from the cached /variables
// endpoint by the caller, so join_metadata is intentionally omitted here — it
// would ~4x the payload by repeating identical station/variable metadata on every
// row (see fetchVariables).
//
// Uses a 2h date range rather than a row limit: a shared limit can drop stations
// by global timestamp ordering (more-frequent reporters crowd out others), while
// a 2h window returns every station that reported recently — verified to cover the
// same station count as the old limit:2000, at a smaller payload. Stations silent
// for >2h have no "current" reading and correctly fall off the live map.
export async function fetchMapMeasurements(varId: string): Promise<Map<string, number>> {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      var_ids: varId,
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      location: 'hawaii',
      limit: 50000, // safety cap only; the date range is the real bound
    }
  );
  const raw = Array.isArray(data) ? data : Object.values(data);
  // Keep the most recent row per station, then reduce to its numeric value.
  const latest = new Map<string, Measurement>();
  for (const m of raw) {
    if (!m.station_id || m.value == null) continue;
    const existing = latest.get(m.station_id);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latest.set(m.station_id, m);
    }
  }
  const out = new Map<string, number>();
  for (const [id, m] of latest) {
    const v = Number(m.value);
    if (!Number.isNaN(v)) out.set(id, v);
  }
  return out;
}

// Sums 24hr of RF_1_Tot300s per station across all Hawaii stations.
// Returns Map<station_id, total>. join_metadata omitted (this is the heaviest
// query — ~50k rows; the flag tripled the payload to ~8MB).
export async function fetchMapRainfall24hr(): Promise<Map<string, number>> {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      var_ids: 'RF_1_Tot300s',
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      location: 'hawaii',
      limit: 50000,
    }
  );
  const rows = Array.isArray(data) ? data : Object.values(data);
  const sums = new Map<string, number>();
  for (const m of rows) {
    if (m.value == null) continue;
    const v = Number(m.value);
    if (Number.isNaN(v)) continue;
    sums.set(m.station_id, (sums.get(m.station_id) ?? 0) + v);
  }
  return sums;
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
