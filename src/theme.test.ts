import { describe, it, expect } from 'vitest';
import { stationStatusKey } from './theme';
import type { Station } from './types/api';

// Minimal Station factory — only the fields stationStatusKey reads matter.
const station = (status?: Station['status']): Station =>
  ({ station_id: 's1', name: 'Test', lat: 21, lng: -157, status }) as Station;

describe('stationStatusKey', () => {
  it('maps each database status to its key', () => {
    expect(stationStatusKey(station('active'))).toBe('active');
    expect(stationStatusKey(station('inactive'))).toBe('inactive');
    expect(stationStatusKey(station('planned'))).toBe('planned');
  });

  it('falls back to "unknown" when status is missing or unrecognized', () => {
    expect(stationStatusKey(station(undefined))).toBe('unknown');
    expect(stationStatusKey(station('retired' as Station['status']))).toBe('unknown');
  });
});
