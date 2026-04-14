export type UnitSystem = 'metric' | 'imperial';

// Whitelist of variable standard_names approved for display.
// All other variables returned by the API are filtered out.
export const ALLOWED_VARIABLES = new Set([
  'SWin_1_Avg', 'SWout_1_Avg', 'LWin_1_Avg', 'LWout_1_Avg',
  'SWnet_1_Avg', 'LWnet_1_Avg', 'Rnet_1_Avg', 'Albedo_1_Avg',
  'Tsrf_1_Avg', 'Tsky_1_Avg',
  'Tair_1_Avg', 'Tair_2_Avg',
  'RH_1_Avg', 'RH_2_Avg',
  'VP_1_Avg', 'VP_2_Avg', 'VPsat_1_Avg', 'VPsat_2_Avg', 'VPD_1_Avg', 'VPD_2_Avg',
  'WS_1_Avg', 'WDrs_1_Avg',
  'P_1_Avg', 'Psl_1_Avg',
  'Tsoil_1_Avg', 'Tsoil_2_Avg', 'Tsoil_3_Avg', 'Tsoil_4_Avg',
  'SHFsrf_1_Avg',
  'SM_1_Avg', 'SM_2_Avg', 'SM_3_Avg',
  'RF_1_Tot300s', 'RFint_1_Max',
]);

// ─── Variable grouping ────────────────────────────────────────────────────────

export const GROUP_ORDER = [
  'Rainfall', 'Temperature', 'Humidity', 'Radiation', 'Wind', 'Pressure', 'Soil',
] as const;
export type VariableGroup = typeof GROUP_ORDER[number];

export const VARIABLE_GROUP: Record<string, VariableGroup> = {
  // Rainfall
  RF_1_Tot300s: 'Rainfall', RFint_1_Max:  'Rainfall',
  // Temperature
  Tair_1_Avg:   'Temperature', Tair_2_Avg: 'Temperature',
  // Humidity
  RH_1_Avg: 'Humidity', RH_2_Avg:   'Humidity',
  VP_1_Avg: 'Humidity', VP_2_Avg:   'Humidity',
  VPsat_1_Avg: 'Humidity', VPsat_2_Avg: 'Humidity',
  VPD_1_Avg: 'Humidity',  VPD_2_Avg:   'Humidity',
  // Radiation
  SWin_1_Avg: 'Radiation', SWout_1_Avg: 'Radiation',
  LWin_1_Avg: 'Radiation', LWout_1_Avg: 'Radiation',
  SWnet_1_Avg: 'Radiation', LWnet_1_Avg: 'Radiation',
  Rnet_1_Avg: 'Radiation', Albedo_1_Avg: 'Radiation',
  Tsrf_1_Avg: 'Radiation', Tsky_1_Avg:  'Radiation',
  // Wind
  WS_1_Avg: 'Wind', WDrs_1_Avg: 'Wind',
  // Pressure
  P_1_Avg: 'Pressure', Psl_1_Avg: 'Pressure',
  // Soil
  Tsoil_1_Avg: 'Soil', Tsoil_2_Avg: 'Soil',
  Tsoil_3_Avg: 'Soil', Tsoil_4_Avg: 'Soil',
  SHFsrf_1_Avg: 'Soil',
  SM_1_Avg: 'Soil', SM_2_Avg: 'Soil', SM_3_Avg: 'Soil',
};

// Groups an array of items into ordered category buckets, sorted alphabetically within each group.
// Items whose variable ID has no group entry are placed in a trailing 'Other' bucket.
export function groupByCategory<T>(
  items: T[],
  getVarId: (item: T) => string,
  getLabel?: (item: T) => string,
): { group: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const g of GROUP_ORDER) buckets.set(g, []);
  buckets.set('Other', []);

  for (const item of items) {
    const g = VARIABLE_GROUP[getVarId(item)] ?? 'Other';
    buckets.get(g)!.push(item);
  }

  return Array.from(buckets.entries())
    .filter(([, list]) => list.length > 0)
    .map(([group, list]) => ({
      group,
      items: getLabel
        ? list.slice().sort((a, b) => getLabel(a).localeCompare(getLabel(b)))
        : list,
    }));
}

// ─── Unit conversion ──────────────────────────────────────────────────────────

interface ConvertedValue {
  value: number;
  unit: string;
}

// Convert a value from the API's metric units to the chosen unit system.
// variableId is used to distinguish pressure kPa (convert) from vapor pressure kPa (keep).
export function convertValue(
  value: number,
  unit: string,
  system: UnitSystem,
  variableId?: string
): ConvertedValue {
  // Soil moisture — API returns fractional VWC (0–1), always display as %
  if (variableId && /^SM_/.test(variableId)) {
    return { value: value * 100, unit: '%' };
  }

  if (system === 'metric') return { value, unit };

  switch (unit) {
    case '°C':
      return { value: (value * 9) / 5 + 32, unit: '°F' };

    case 'mm':
      return { value: value * 0.03937, unit: 'in' };

    case 'mm/hour':
      return { value: value * 0.03937, unit: 'in/hr' };

    case 'm/s':
      return { value: value * 2.237, unit: 'mph' };

    case 'kPa':
      // Vapor pressure variables stay in kPa — no meaningful imperial equivalent
      if (variableId && /^VP|^VPsat|^VPD/.test(variableId)) {
        return { value, unit };
      }
      // Station pressure and sea-level pressure → inHg
      return { value: value * 0.2953, unit: 'inHg' };

    default:
      return { value, unit };
  }
}

// Format a converted value for display — always 1 decimal place.
// Wind direction is the only exception: whole degrees, no decimal point.
export function formatValue(value: number, variableId?: string): string {
  if (variableId && /^WDrs/.test(variableId)) return Math.round(value).toString();
  return value.toFixed(1);
}

// Convert degrees (0–360) to a compass abbreviation.
export function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

// Represents a merged wind reading combining speed and direction.
export interface WindReading<T> {
  speedMeasurement: T;
  dirDeg: number | null;   // degrees, or null if unavailable
  compass: string | null;
}

// Merge WS_* and WDrs_* readings from a flat measurements array into WindReading objects.
// Returns one WindReading per sensor index (e.g. WS_1_Avg + WDrs_1_Avg → index "1").
// The original WDrs_* entries should be excluded from the caller's display list.
export function mergeWindReadings<T extends { variable: string; value: string | number | null; units?: string; [key: string]: unknown }>(
  items: T[]
): { windReadings: WindReading<T>[]; remainder: T[] } {
  const speedMap = new Map<string, T>();
  const dirMap = new Map<string, T>();

  for (const item of items) {
    const wsMatch = item.variable.match(/^WS_(\d+)_/);
    const wdMatch = item.variable.match(/^WDrs_(\d+)_/);
    if (wsMatch) speedMap.set(wsMatch[1], item);
    else if (wdMatch) dirMap.set(wdMatch[1], item);
  }

  const windReadings: WindReading<T>[] = [];
  const dirVarIds = new Set(Array.from(dirMap.values()).map(d => d.variable));

  for (const [idx, speedItem] of speedMap.entries()) {
    const dirItem = dirMap.get(idx) ?? null;
    const dirDeg = dirItem?.value != null ? Number(dirItem.value) : null;
    windReadings.push({
      speedMeasurement: speedItem,
      dirDeg,
      compass: dirDeg != null ? degreesToCompass(dirDeg) : null,
    });
  }

  // Remove direction variables from remainder; speed variables stay (they become wind cards)
  const remainder = items.filter(item => !dirVarIds.has(item.variable));
  return { windReadings, remainder };
}
