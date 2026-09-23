import { apiGet } from './client';
import type { Measurement, TimeRange } from '../types/api';
import { REGION } from '../config/regions';

// ─── Date ranges and row limits ───────────────────────────────────────────────
// The API returns rows newest-first, and when `limit` is omitted it silently stops
// at 10,000 rows — so an undersized or missing limit drops the OLDEST rows without
// any error (e.g. the first hours of a 24h rainfall sum, or the left edge of a 7d
// chart). Every query therefore sends a date range fitted to what its screen shows,
// plus an explicit limit computed to exceed the rows that range can contain. The
// date range is the real bound; the limit only has to never bite.

const HOUR_MS = 60 * 60 * 1000;
const REPORTS_PER_HOUR = 12; // stations report every 5 minutes
const ROW_HEADROOM = 2;      // margin for late/duplicate rows over the expected count

// Region-wide queries don't know the station count when they're sent. This is a
// ceiling, not an estimate (Hawaii has ~80 active stations); overshooting costs
// nothing because the date range bounds the payload.
const MAX_REGION_STATIONS = 300;

// Rows a (stations × variables × hours) window can hold, with headroom.
export function rowLimit(stations: number, variables: number, hours: number): number {
  return Math.ceil(stations * variables * hours * REPORTS_PER_HOUR * ROW_HEADROOM);
}

// A response that fills its limit has almost certainly been cut short, dropping the
// oldest rows. Surface it in development rather than rendering partial data silently.
function warnIfTruncated(rows: unknown[], limit: number, what: string) {
  if (import.meta.env.DEV && rows.length >= limit) {
    console.warn(`[measurements] ${what} returned ${rows.length} rows = its limit; oldest rows were probably dropped.`);
  }
}

function toRows(data: Measurement[] | Record<string, Measurement>): Measurement[] {
  return Array.isArray(data) ? data : Object.values(data);
}

// Latest readings for one station (StationDetail, and StationCard's fallback).
//
// Bounded to 7 days — the furthest back the app ever looks (the 7d chart). A
// station silent for longer shows no current readings.
//
// Within that window the limit is what keeps it to *current* readings: rows come
// newest-first and every variable in a report shares its timestamp, so 1000 rows
// is the station's last ~45 minutes even at the widest station (~107 variables).
// That catches variables reporting every 10–15 min, while ones that pause for
// hours (e.g. albedo overnight) stay out rather than showing a stale value as
// current. The row cap is deliberately not rowLimit()-sized for the full 7 days.
const LATEST_WINDOW_HOURS = 7 * 24;
const LATEST_ROW_LIMIT = 1000;

export async function fetchLatestMeasurements(stationId: string, signal?: AbortSignal): Promise<Measurement[]> {
  const now = new Date();
  const start = new Date(now.getTime() - LATEST_WINDOW_HOURS * HOUR_MS);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      station_ids: stationId,
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      limit: LATEST_ROW_LIMIT,
      join_metadata: true,
      local_tz: true,
      location: REGION.apiLocation,
    },
    signal
  );
  return toRows(data);
}

// Batched latest readings for a set of stations, limited to the given variables.
// Replaces N per-station calls with ONE request, then dedupes to the most recent
// row per (station, variable). Returns Map<station_id, Measurement[]>.
//
// Bounded by a 24h date range, not a row limit. A shared `limit` is split across
// the requested stations, so with only a handful of stations each one pulls many
// hours of useless history (and a too-small limit would instead starve stations
// whose latest reading is older). A date range fetches just the recent window for
// every station regardless of count — far smaller and starvation-free. 24h matches
// the app's staleness threshold, so no non-stale station is dropped. The limit is
// sized from the request itself so it can never cut that window short.
//
// join_metadata is omitted to keep the payload small (it ~4x's it); units are
// attached from the cached /variables metadata by useLatestVarBatch.
export async function fetchLatestMeasurementsBatch(
  stationIds: string[],
  varIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, Measurement[]>> {
  const result = new Map<string, Measurement[]>();
  if (stationIds.length === 0 || varIds.length === 0) return result;

  const now = new Date();
  const start = new Date(now.getTime() - 24 * HOUR_MS);
  const limit = rowLimit(stationIds.length, varIds.length, 24);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      station_ids: stationIds.join(','),
      var_ids: varIds.join(','),
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      local_tz: true,
      location: REGION.apiLocation,
      limit,
    },
    signal
  );
  const rows = toRows(data);
  warnIfTruncated(rows, limit, 'favorites batch');

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

// Latest value per station for a single variable, across every station in the region.
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
export async function fetchMapMeasurements(varId: string, signal?: AbortSignal): Promise<Map<string, number>> {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * HOUR_MS);
  const limit = rowLimit(MAX_REGION_STATIONS, 1, 2);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      var_ids: varId,
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      location: REGION.apiLocation,
      limit,
    },
    signal
  );
  const raw = toRows(data);
  warnIfTruncated(raw, limit, `map ${varId}`);
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

// Station ids that reported water level (Wlvl_1_Avg) in the last 7 days — i.e.
// the region's stream gauges. The API has no station-type field, so this is the
// only reliable signal (station names don't say "stream gauge" consistently).
// 7 days, the furthest the app looks back anywhere, so a gauge that has been
// quiet for a day or two keeps its tag.
const GAUGE_WINDOW_HOURS = 7 * 24;

export async function fetchStreamGaugeIds(signal?: AbortSignal): Promise<Set<string>> {
  const now = new Date();
  const start = new Date(now.getTime() - GAUGE_WINDOW_HOURS * HOUR_MS);
  const limit = rowLimit(MAX_REGION_STATIONS, 1, GAUGE_WINDOW_HOURS);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      var_ids: 'Wlvl_1_Avg',
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      location: REGION.apiLocation,
      limit,
    },
    signal
  );
  const rows = toRows(data);
  warnIfTruncated(rows, limit, 'stream gauges');
  return new Set(rows.map(m => m.station_id));
}

// Sums 24hr of RF_1_Tot300s per station across every station in the region.
// Returns Map<station_id, total>. join_metadata omitted (this is the heaviest
// query — ~21k rows for Hawaii; the flag tripled the payload to ~8MB). Truncation
// here would silently undercount every total, so the limit covers the full 24h.
export async function fetchMapRainfall24hr(signal?: AbortSignal): Promise<Map<string, number>> {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * HOUR_MS);
  const limit = rowLimit(MAX_REGION_STATIONS, 1, 24);
  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      var_ids: 'RF_1_Tot300s',
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      location: REGION.apiLocation,
      limit,
    },
    signal
  );
  const rows = toRows(data);
  warnIfTruncated(rows, limit, 'map rainfall 24h');
  const sums = new Map<string, number>();
  for (const m of rows) {
    if (m.value == null) continue;
    const v = Number(m.value);
    if (Number.isNaN(v)) continue;
    sums.set(m.station_id, (sums.get(m.station_id) ?? 0) + v);
  }
  return sums;
}

const RANGE_HOURS: Record<TimeRange, number> = { '6h': 6, '24h': 24, '3d': 72, '7d': 168 };

export async function fetchHistoricalMeasurements(
  stationId: string,
  varId: string,
  range: TimeRange,
  signal?: AbortSignal
): Promise<Measurement[]> {
  const now = new Date();
  const hours = RANGE_HOURS[range];
  const start = new Date(now.getTime() - hours * HOUR_MS);
  const limit = rowLimit(1, 1, hours);

  const { data } = await apiGet<Measurement[] | Record<string, Measurement>>(
    '/mesonet/db/measurements',
    {
      station_ids: stationId,
      var_ids: varId,           // request param is var_ids; response field is 'variable'
      start_date: start.toISOString(),
      end_date: now.toISOString(),
      join_metadata: true,      // needed so each row includes 'units' for conversion
      local_tz: true,
      location: REGION.apiLocation,
      limit,                    // sized to the range: 7d of 5-min data ≈ 2016 rows
    },
    signal
  );
  const rows = toRows(data);
  warnIfTruncated(rows, limit, `history ${varId} ${range}`);
  return rows;
}
