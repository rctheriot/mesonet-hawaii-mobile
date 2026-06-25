import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet } from './client';
import { fetchVariables } from './variables';

vi.mock('./client', () => ({ apiGet: vi.fn() }));
const mockApiGet = vi.mocked(apiGet);

beforeEach(() => {
  mockApiGet.mockReset();
});

describe('fetchVariables', () => {
  it('builds a map keyed by standard_name with units and display name', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { standard_name: 'Tair_1_Avg', units: '°C', display_name: 'Air Temperature' },
        { standard_name: 'RF_1_Tot300s', units: 'mm', display_name: 'Rainfall' },
      ],
    });
    const map = await fetchVariables();
    expect(map.get('Tair_1_Avg')).toEqual({ units: '°C', display_name: 'Air Temperature' });
    expect(map.get('RF_1_Tot300s')!.units).toBe('mm');
  });

  it('skips rows without a standard_name and defaults missing fields', async () => {
    mockApiGet.mockResolvedValue({
      data: [
        { units: 'm/s', display_name: 'Wind' }, // no standard_name -> skipped
        { standard_name: 'SM_1_Avg' },          // missing units/display_name -> defaults
      ],
    });
    const map = await fetchVariables();
    expect(map.size).toBe(1);
    expect(map.get('SM_1_Avg')).toEqual({ units: '', display_name: '' });
  });

  it('handles an object-keyed (non-array) response', async () => {
    mockApiGet.mockResolvedValue({
      data: { '0': { standard_name: 'RH_1_Avg', units: '%', display_name: 'Humidity' } },
    });
    const map = await fetchVariables();
    expect(map.get('RH_1_Avg')!.units).toBe('%');
  });
});
