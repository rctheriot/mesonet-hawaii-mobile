import { describe, it, expect } from 'vitest';
import {
  convertValue,
  getVariableLabel,
  formatValue,
  degreesToCompass,
  kmToMiles,
  groupByCategory,
  mergeWindReadings,
} from './units';

describe('convertValue', () => {
  it('passes metric values through unchanged', () => {
    expect(convertValue(20, '°C', 'metric', 'Tair_1_Avg')).toEqual({ value: 20, unit: '°C' });
  });

  it('converts °C → °F in imperial', () => {
    expect(convertValue(0, '°C', 'imperial', 'Tair_1_Avg').value).toBe(32);
    expect(convertValue(100, '°C', 'imperial', 'Tair_1_Avg').value).toBe(212);
    expect(convertValue(0, '°C', 'imperial').unit).toBe('°F');
  });

  it('converts mm → in in imperial', () => {
    const { value, unit } = convertValue(25.4, 'mm', 'imperial');
    expect(value).toBeCloseTo(1, 2);
    expect(unit).toBe('in');
  });

  it('converts m/s → mph in imperial', () => {
    const { value, unit } = convertValue(10, 'm/s', 'imperial');
    expect(value).toBeCloseTo(22.37, 1);
    expect(unit).toBe('mph');
  });

  it('converts station pressure kPa → inHg in imperial', () => {
    const { value, unit } = convertValue(100, 'kPa', 'imperial', 'P_1_Avg');
    expect(value).toBeCloseTo(29.53, 2);
    expect(unit).toBe('inHg');
  });

  it('keeps vapor-pressure kPa as-is even in imperial', () => {
    expect(convertValue(1.5, 'kPa', 'imperial', 'VP_1_Avg')).toEqual({ value: 1.5, unit: 'kPa' });
    expect(convertValue(1.5, 'kPa', 'imperial', 'VPD_1_Avg').unit).toBe('kPa');
  });

  it('always renders soil moisture as a percentage, regardless of system', () => {
    expect(convertValue(0.25, '', 'metric', 'SM_1_Avg')).toEqual({ value: 25, unit: '%' });
    expect(convertValue(0.25, '', 'imperial', 'SM_2_Avg')).toEqual({ value: 25, unit: '%' });
  });

  it('falls back to passthrough for unknown units', () => {
    expect(convertValue(7, 'W/m²', 'imperial', 'SWin_1_Avg')).toEqual({ value: 7, unit: 'W/m²' });
  });
});

describe('getVariableLabel', () => {
  it('overrides special-case variables', () => {
    expect(getVariableLabel('RF_1_Tot300s')).toBe('Rainfall');
    expect(getVariableLabel('WS_1_Avg')).toBe('Wind');
  });

  it('prefers the API display name otherwise', () => {
    expect(getVariableLabel('Tair_1_Avg', 'Air Temperature')).toBe('Air Temperature');
  });

  it('falls back to the raw id when no display name is given', () => {
    expect(getVariableLabel('Tair_1_Avg')).toBe('Tair_1_Avg');
  });
});

describe('formatValue', () => {
  it('rounds wind direction to whole degrees', () => {
    expect(formatValue(123.6, 'WDrs_1_Avg')).toBe('124');
  });

  it('gives rainfall 2 decimal places', () => {
    expect(formatValue(0.123, 'RF_1_Tot300s')).toBe('0.12');
  });

  it('gives pressure 2 decimal places', () => {
    expect(formatValue(1013.25, 'P_1_Avg')).toBe('1013.25');
    expect(formatValue(1013.25, 'Psl_1_Avg')).toBe('1013.25');
  });

  it('defaults to 1 decimal place', () => {
    expect(formatValue(21.34, 'Tair_1_Avg')).toBe('21.3');
    expect(formatValue(21.34)).toBe('21.3');
  });
});

describe('degreesToCompass', () => {
  it('maps the cardinal directions', () => {
    expect(degreesToCompass(0)).toBe('N');
    expect(degreesToCompass(90)).toBe('E');
    expect(degreesToCompass(180)).toBe('S');
    expect(degreesToCompass(270)).toBe('W');
    expect(degreesToCompass(45)).toBe('NE');
  });

  it('normalizes out-of-range and negative degrees', () => {
    expect(degreesToCompass(360)).toBe('N');
    expect(degreesToCompass(-10)).toBe('N');
  });
});

describe('kmToMiles', () => {
  it('converts kilometers to miles', () => {
    expect(kmToMiles(0)).toBe(0);
    expect(kmToMiles(1.60934)).toBeCloseTo(1, 3);
    expect(kmToMiles(10)).toBeCloseTo(6.2137, 3);
  });
});

describe('groupByCategory', () => {
  it('orders groups by GROUP_ORDER and drops empty buckets', () => {
    const items = [
      { v: 'Tair_1_Avg' },
      { v: 'RF_1_Tot300s' },
      { v: 'RH_1_Avg' },
    ];
    const groups = groupByCategory(items, i => i.v);
    expect(groups.map(g => g.group)).toEqual(['Rainfall', 'Temperature', 'Humidity']);
  });

  it('places unknown variables in a trailing "Other" bucket', () => {
    const groups = groupByCategory([{ v: 'Totally_Unknown' }], i => i.v);
    expect(groups).toHaveLength(1);
    expect(groups[0].group).toBe('Other');
  });
});

describe('mergeWindReadings', () => {
  const items = [
    { variable: 'WS_1_Avg', value: 5, units: 'm/s' },
    { variable: 'WDrs_1_Avg', value: 90, units: 'deg' },
    { variable: 'Tair_1_Avg', value: 20, units: '°C' },
  ];

  it('pairs speed with direction and computes a compass heading', () => {
    const { windReadings } = mergeWindReadings(items);
    expect(windReadings).toHaveLength(1);
    expect(windReadings[0].speedMeasurement.variable).toBe('WS_1_Avg');
    expect(windReadings[0].dirDeg).toBe(90);
    expect(windReadings[0].compass).toBe('E');
  });

  it('removes direction entries from the remainder but keeps speed', () => {
    const { remainder } = mergeWindReadings(items);
    const vars = remainder.map(r => r.variable);
    expect(vars).toContain('WS_1_Avg');
    expect(vars).toContain('Tair_1_Avg');
    expect(vars).not.toContain('WDrs_1_Avg');
  });

  it('reports a null heading when direction is missing', () => {
    const { windReadings } = mergeWindReadings([{ variable: 'WS_1_Avg', value: 3, units: 'm/s' }]);
    expect(windReadings[0].dirDeg).toBeNull();
    expect(windReadings[0].compass).toBeNull();
  });
});
