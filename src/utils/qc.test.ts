import { describe, it, expect } from 'vitest';
import { isPlausible, dropImplausible } from './qc';

describe('isPlausible — rejects readings that cannot be real', () => {
  // Each of these was seen in live API data.
  it.each([
    ['SM_1_Avg', 7999],        // fill code (Kaʻehu soil moisture)
    ['SHFsrf_1_Avg', -7999],   // fill code
    ['FT_1_Avg', '-7999'],     // fill code as a string
    ['Tair_1_Avg', -100],      // fill value (shown as -148°F)
    ['RH_1_Avg', -100],
    ['P_1_Avg', 0],            // zero air pressure
    ['Psl_1_Avg', 0],
    ['Tair_2_Avg', 206.6],
    ['VPsat_2_Avg', 200.5],
    ['VPD_2_Avg', 70.11],
    ['Tsrf_1_Avg', -137.1],
    ['LWin_1_Avg', -89.3],
  ])('%s = %s', (variable, value) => {
    expect(isPlausible(variable, value)).toBe(false);
  });

  it('rejects missing and non-numeric values', () => {
    expect(isPlausible('Tair_1_Avg', null)).toBe(false);
    expect(isPlausible('Tair_1_Avg', '')).toBe(false);
    expect(isPlausible('Tair_1_Avg', 'NAN')).toBe(false);
  });

  it('rejects fill codes on variables without a range', () => {
    expect(isPlausible('SomeNewVar_1_Avg', 7999)).toBe(false);
  });
});

describe('isPlausible — keeps real extremes', () => {
  it.each([
    ['Tair_1_Avg', -10],       // frost on Mauna Kea
    ['Tair_1_Avg', 38],        // record heat
    ['Tsky_1_Avg', -40],       // clear night sky
    ['P_1_Avg', 61],           // summit air pressure
    ['SWin_1_Avg', 1288],      // bright sun with cloud reflection
    ['SWin_1_Avg', -11.2],     // night-time sensor offset
    ['RFint_1_Max', 240.5],    // cloudburst intensity
    ['RH_1_Avg', 101.5],       // fog over-read
    ['SM_3_Avg', 0.747],       // saturated soil
    ['WDrs_1_Avg', 360],
    ['Wlvl_1_Avg', 0.006],
    ['SomeNewVar_1_Avg', -5000], // no range defined: only fill codes are caught
  ])('%s = %s', (variable, value) => {
    expect(isPlausible(variable, value)).toBe(true);
  });

  it('applies the same range to every sensor number', () => {
    expect(isPlausible('Tsoil_4_Avg', 25)).toBe(true);
    expect(isPlausible('Tsoil_4_Avg', 7999)).toBe(false);
  });
});

describe('dropImplausible', () => {
  it('drops only the bad rows, keeping order', () => {
    const rows = [
      { variable: 'SM_1_Avg', value: 7999 },
      { variable: 'SM_3_Avg', value: 0.56 },
      { variable: 'Tair_1_Avg', value: '24.1' },
    ];
    expect(dropImplausible(rows)).toEqual([rows[1], rows[2]]);
  });
});
