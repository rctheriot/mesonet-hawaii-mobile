import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet } from './client';
import {
  fetchLatestMeasurements,
  fetchMapMeasurements,
  fetchMapRainfall24hr,
  fetchLatestMeasurementsBatch,
  fetchHistoricalMeasurements,
  rowLimit,
} from './measurements';

const HOUR = 60 * 60 * 1000;
// Hours spanned by a request's start_date/end_date.
function windowHours(params: Record<string, unknown>): number {
  return (Date.parse(params.end_date as string) - Date.parse(params.start_date as string)) / HOUR;
}
function lastParams(): Record<string, unknown> {
  const calls = mockApiGet.mock.calls;
  return calls[calls.length - 1][1] as Record<string, unknown>;
}

vi.mock('./client', () => ({ apiGet: vi.fn() }));
const mockApiGet = vi.mocked(apiGet);

beforeEach(() => {
  mockApiGet.mockReset();
});

describe('fetchLatestMeasurements (single station)', () => {
  it('looks back no further than the app ever does (7 days), with join_metadata', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchLatestMeasurements('0115');
    const params = lastParams();
    expect(params.station_ids).toBe('0115');
    expect(params.join_metadata).toBe(true);
    expect(windowHours(params)).toBe(7 * 24);
  });

  it('sends a limit that covers every variable of the widest station several reports deep', async () => {
    // Without an explicit limit the API stops at 10,000 rows; too small a limit
    // drops variables that report every 10–15 min at stations with ~107 variables.
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchLatestMeasurements('0115');
    expect(lastParams().limit).toBeGreaterThanOrEqual(107 * 3);
  });

  it('returns rows as-is (array and object-keyed responses)', async () => {
    mockApiGet.mockResolvedValue({ data: [{ station_id: '0115', variable: 'Tair_1_Avg', value: '20', timestamp: 't' }] });
    expect(await fetchLatestMeasurements('0115')).toHaveLength(1);
    mockApiGet.mockResolvedValue({ data: { '0': { station_id: '0115', variable: 'Tair_1_Avg', value: '20', timestamp: 't' } } });
    expect(await fetchLatestMeasurements('0115')).toHaveLength(1);
  });
});

describe('fetchMapMeasurements', () => {
  it('keeps the most recent numeric value per station', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { station_id: 'A', variable: 'Tair_1_Avg', value: '20', timestamp: '2026-06-25T10:00:00Z' },
        { station_id: 'A', variable: 'Tair_1_Avg', value: '21', timestamp: '2026-06-25T10:05:00Z' }, // newer
        { station_id: 'B', variable: 'Tair_1_Avg', value: 18, timestamp: '2026-06-25T09:00:00Z' },
      ],
    });
    const map = await fetchMapMeasurements('Tair_1_Avg');
    expect(map.get('A')).toBe(21);
    expect(map.get('B')).toBe(18);
    expect(map.size).toBe(2);
  });

  it('skips null and non-numeric values', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { station_id: 'A', variable: 'Tair_1_Avg', value: null, timestamp: '2026-06-25T10:00:00Z' },
        { station_id: 'B', variable: 'Tair_1_Avg', value: 'NaNish', timestamp: '2026-06-25T10:00:00Z' },
        { station_id: 'C', variable: 'Tair_1_Avg', value: '5', timestamp: '2026-06-25T10:00:00Z' },
      ],
    });
    const map = await fetchMapMeasurements('Tair_1_Avg');
    expect(map.has('A')).toBe(false);
    expect(map.has('B')).toBe(false);
    expect(map.get('C')).toBe(5);
  });

  it('handles an object-keyed (non-array) response', async () => {
    mockApiGet.mockResolvedValue({
      data: { '0': { station_id: 'A', variable: 'Tair_1_Avg', value: '7', timestamp: '2026-06-25T10:00:00Z' } },
    });
    const map = await fetchMapMeasurements('Tair_1_Avg');
    expect(map.get('A')).toBe(7);
  });

  it('uses a date range and omits join_metadata to keep the payload small', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchMapMeasurements('Tair_1_Avg');
    const params = mockApiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params.var_ids).toBe('Tair_1_Avg');
    expect('join_metadata' in params).toBe(false);
    expect(typeof params.start_date).toBe('string');
    expect(typeof params.end_date).toBe('string');
  });
});

describe('fetchMapRainfall24hr', () => {
  it('sums values per station', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { station_id: 'A', variable: 'RF_1_Tot300s', value: '1.5', timestamp: 't1' },
        { station_id: 'A', variable: 'RF_1_Tot300s', value: '2.5', timestamp: 't2' },
        { station_id: 'B', variable: 'RF_1_Tot300s', value: 4, timestamp: 't3' },
        { station_id: 'A', variable: 'RF_1_Tot300s', value: null, timestamp: 't4' }, // ignored
      ],
    });
    const map = await fetchMapRainfall24hr();
    expect(map.get('A')).toBeCloseTo(4.0);
    expect(map.get('B')).toBe(4);
  });

  it('omits join_metadata and queries a 24h date range', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchMapRainfall24hr();
    const params = mockApiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params.var_ids).toBe('RF_1_Tot300s');
    expect(windowHours(params)).toBe(24);
    // Truncation drops the oldest rows and silently undercounts every total, so the
    // limit must exceed a full 24h of 5-min rows for well over Hawaii's ~80 stations.
    expect(params.limit).toBeGreaterThanOrEqual(200 * 24 * 12);
    expect('join_metadata' in params).toBe(false);
    expect(typeof params.start_date).toBe('string');
    expect(typeof params.end_date).toBe('string');
  });
});

describe('fetchLatestMeasurementsBatch', () => {
  it('returns an empty map and makes no request when inputs are empty', async () => {
    expect((await fetchLatestMeasurementsBatch([], ['Tair_1_Avg'])).size).toBe(0);
    expect((await fetchLatestMeasurementsBatch(['A'], [])).size).toBe(0);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('groups latest reading per (station, variable)', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { station_id: 'A', variable: 'WS_1_Avg', value: '3', timestamp: '2026-06-25T10:00:00Z' },
        { station_id: 'A', variable: 'WS_1_Avg', value: '4', timestamp: '2026-06-25T10:05:00Z' }, // newer
        { station_id: 'A', variable: 'WDrs_1_Avg', value: '90', timestamp: '2026-06-25T10:05:00Z' },
        { station_id: 'B', variable: 'WS_1_Avg', value: '2', timestamp: '2026-06-25T10:05:00Z' },
      ],
    });
    const map = await fetchLatestMeasurementsBatch(['A', 'B'], ['WS_1_Avg', 'WDrs_1_Avg']);

    const a = map.get('A')!;
    expect(a).toHaveLength(2);
    expect(a.find(m => m.variable === 'WS_1_Avg')!.value).toBe('4'); // most recent kept
    expect(a.find(m => m.variable === 'WDrs_1_Avg')!.value).toBe('90');

    const b = map.get('B')!;
    expect(b).toHaveLength(1);
    expect(b[0].value).toBe('2');
  });

  it('queries a date range without join_metadata (units come from /variables)', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchLatestMeasurementsBatch(['A', 'B'], ['Tair_1_Avg']);
    const params = mockApiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params.station_ids).toBe('A,B');
    expect(params.var_ids).toBe('Tair_1_Avg');
    expect('join_metadata' in params).toBe(false);
    expect(windowHours(params)).toBe(24);
  });

  it('sizes its limit to the stations and variables requested', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    const ids = Array.from({ length: 40 }, (_, i) => `S${i}`);
    await fetchLatestMeasurementsBatch(ids, ['WS_1_Avg', 'WDrs_1_Avg']);
    // 40 stations × 2 variables × 24h of 5-min reports must fit.
    expect(lastParams().limit).toBeGreaterThanOrEqual(40 * 2 * 24 * 12);
  });
});

describe('fetchHistoricalMeasurements', () => {
  it.each([['6h', 6], ['24h', 24], ['3d', 72], ['7d', 168]] as const)(
    '%s requests exactly that window with a limit that fits it',
    async (range, hours) => {
      mockApiGet.mockResolvedValue({ data: [] });
      await fetchHistoricalMeasurements('0115', 'Tair_1_Avg', range);
      const params = lastParams();
      expect(windowHours(params)).toBe(hours);
      expect(params.limit).toBeGreaterThanOrEqual(hours * 12);
    },
  );
});

describe('fetchMapMeasurements window', () => {
  it('covers 2 hours with a limit that fits every station in the region', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchMapMeasurements('Tair_1_Avg');
    const params = lastParams();
    expect(windowHours(params)).toBe(2);
    expect(params.limit).toBeGreaterThanOrEqual(200 * 2 * 12);
  });
});

describe('rowLimit', () => {
  it('scales with stations × variables × hours of 5-min reports, with headroom', () => {
    expect(rowLimit(1, 1, 1)).toBeGreaterThanOrEqual(12);
    expect(rowLimit(10, 2, 24)).toBe(2 * rowLimit(5, 2, 24));
    expect(rowLimit(10, 2, 24)).toBeGreaterThanOrEqual(10 * 2 * 24 * 12);
  });
});
