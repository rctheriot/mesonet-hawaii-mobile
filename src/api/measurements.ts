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
