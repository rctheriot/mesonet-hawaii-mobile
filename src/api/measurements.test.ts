import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet } from './client';
import {
  fetchMapMeasurements,
  fetchMapRainfall24hr,
  fetchLatestMeasurementsBatch,
} from './measurements';

vi.mock('./client', () => ({ apiGet: vi.fn() }));
const mockApiGet = vi.mocked(apiGet);

beforeEach(() => {
  mockApiGet.mockReset();
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

  it('omits join_metadata to keep the payload small', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchMapMeasurements('Tair_1_Avg');
    const params = mockApiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params.var_ids).toBe('Tair_1_Avg');
    expect(params.limit).toBe(2000);
    expect('join_metadata' in params).toBe(false);
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
    expect(params.limit).toBe(50000);
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

  it('requests join_metadata (StationCard needs units + display names)', async () => {
    mockApiGet.mockResolvedValue({ data: [] });
    await fetchLatestMeasurementsBatch(['A', 'B'], ['Tair_1_Avg']);
    const params = mockApiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params.station_ids).toBe('A,B');
    expect(params.var_ids).toBe('Tair_1_Avg');
    expect(params.join_metadata).toBe(true);
  });
});
