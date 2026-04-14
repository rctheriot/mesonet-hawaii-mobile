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

// Format a converted value for display — fewer decimals for large numbers
export function formatValue(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10)  return value.toFixed(2);
  return value.toFixed(3);
}
