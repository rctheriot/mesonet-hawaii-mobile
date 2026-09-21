import { describe, it, expect } from 'vitest';
import {
  tempToHex, TEMP_RANGE_C,
  windToHex, WIND_RANGE_MS,
  rhToHex,
  smToHex,
  rainToHex,
} from './mapColor';

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
    expect(rainToHex(0)).toBe('rgb(186,230,253)');
    expect(rainToHex(5)).toBe('rgb(30,58,138)');
  });
});
