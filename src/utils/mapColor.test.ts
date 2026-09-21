import { describe, it, expect } from 'vitest';
import {
  tempToHex, TEMP_RANGE_C,
  windToHex, WIND_RANGE_MS,
  rhToHex,
  smToHex,
  rainToHex,
} from './mapColor';
import { REGIONS } from '../config/regions.data';

describe('color scale interpolation', () => {
  it('returns rgb() strings', () => {
    expect(tempToHex(20)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });

  it('returns the exact endpoint colors at the range bounds', () => {
    // First and last stops of TEMP_STOPS.
    expect(tempToHex(TEMP_RANGE_C.min)).toBe('rgb(37,99,235)');
    expect(tempToHex(TEMP_RANGE_C.max)).toBe('rgb(220,38,38)');
  });

  it('clamps values outside the range to the endpoint colors', () => {
    expect(tempToHex(-100)).toBe(tempToHex(TEMP_RANGE_C.min));
    expect(tempToHex(1000)).toBe(tempToHex(TEMP_RANGE_C.max));
  });

  it('interpolates between stops', () => {
    // Wind midpoint (8 m/s) is the amber middle stop.
    expect(windToHex(WIND_RANGE_MS.min)).toBe('rgb(34,197,94)');
    expect(windToHex(8)).toBe('rgb(245,158,11)');
  });

  it('soil moisture colors on the raw 0–1 fraction (×100 internally)', () => {
    // smToHex(frac) === rhToHex(frac * 100)
    expect(smToHex(0.5)).toBe(rhToHex(50));
    expect(smToHex(0)).toBe(rhToHex(0));
    expect(smToHex(1)).toBe(rhToHex(100));
  });

  it('rainfall scales from light to deep blue', () => {
    // Under the default (Hawaii) build the stops are [0, 2, 5] mm — unchanged
    // from the single-region app.
    expect(rainToHex(0)).toBe('rgb(186,230,253)');
    expect(rainToHex(5)).toBe('rgb(30,58,138)');
  });
});

// The rainfall scale is the one colour ramp that had to become region-specific:
// rainfall climate differs by an order of magnitude, and values above the top
// stop all clamp to the same colour. Measured against live data, Hawaii's 5 mm
// ceiling left 6 of 8 American Samoa stations rendering identically.
describe('rainfall stops are calibrated per region', () => {
  it('keeps Hawaii on the original 0/2/5 mm breakpoints', () => {
    expect(REGIONS.hawaii.rainStopsMm).toEqual([0, 2, 5]);
  });

  it('gives American Samoa a ceiling above its typical daily totals', () => {
    const [, , top] = REGIONS.american_samoa.rainStopsMm;
    // Observed 24h totals on a normal day ran 0–33 mm with a 13.5 mm median.
    expect(top).toBeGreaterThanOrEqual(33);
  });

  it('spreads real American Samoa totals across distinct colours', () => {
    // Same interpolation as rainToHex, driven by an explicit region so the
    // assertion holds no matter which region the suite is built for.
    const rgb: [number, number, number][] = [[186, 230, 253], [59, 130, 246], [30, 58, 138]];
    const stops = REGIONS.american_samoa.rainStopsMm.map((t, i) => ({ t, rgb: rgb[i] }));
    const colour = (v: number) => {
      const c = Math.max(stops[0].t, Math.min(stops[stops.length - 1].t, v));
      let lo = stops[0], hi = stops[stops.length - 1];
      for (let i = 0; i < stops.length - 1; i++) {
        if (c >= stops[i].t && c <= stops[i + 1].t) { lo = stops[i]; hi = stops[i + 1]; break; }
      }
      const t = hi.t === lo.t ? 0 : (c - lo.t) / (hi.t - lo.t);
      return lo.rgb.map((x, i) => Math.round(x + (hi.rgb[i] - x) * t)).join(',');
    };
    const real = [0, 7.4, 8.9, 13.5, 18.3, 24.1, 33.3];
    expect(new Set(real.map(colour)).size).toBe(real.length);
  });
});
