import { describe, it, expect } from 'vitest';
import { haversineKm, stationJitter } from '../../utils/geo';

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(21.3, -157.8, 21.3, -157.8)).toBe(0);
  });

  it('is approximately 111 km per degree of latitude at the equator', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.2, 0);
  });

  it('is approximately 111 km per degree of longitude at the equator', () => {
    expect(haversineKm(0, 0, 0, 1)).toBeCloseTo(111.2, 0);
  });

  it('is symmetric (distance A→B equals B→A)', () => {
    const ab = haversineKm(21.3, -157.8, 19.7, -155.1);
    const ba = haversineKm(19.7, -155.1, 21.3, -157.8);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('gives a plausible Honolulu–Hilo distance (~339 km)', () => {
    // Honolulu: 21.306, -157.858 — Hilo: 19.705, -155.084
    const d = haversineKm(21.306, -157.858, 19.705, -155.084);
    expect(d).toBeGreaterThan(320);
    expect(d).toBeLessThan(360);
  });
});

describe('stationJitter', () => {
  it('returns the same offset for the same station_id', () => {
    const a = stationJitter('HI-ME-001');
    const b = stationJitter('HI-ME-001');
    expect(a).toEqual(b);
  });

  it('keeps offsets within ±0.0003 degrees', () => {
    const MAX = 0.0003;
    for (const id of ['HI-ME-001', 'HI-ME-099', 'abc', 'x', '']) {
      const { dlat, dlng } = stationJitter(id);
      expect(Math.abs(dlat)).toBeLessThanOrEqual(MAX);
      expect(Math.abs(dlng)).toBeLessThanOrEqual(MAX);
    }
  });

  it('produces different offsets for different station IDs', () => {
    const a = stationJitter('HI-ME-001');
    const b = stationJitter('HI-ME-002');
    expect(a).not.toEqual(b);
  });
});
