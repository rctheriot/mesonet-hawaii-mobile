// ─── Data quality: gross-range check ──────────────────────────────────────────
// Some sensors report values that cannot be real weather: logger fill codes
// (±7999, -100), a pressure of 0, a 206°C air temperature. The API's `flag`
// field is 0 on all of them, so the app has to catch them itself.
//
// Each reading is judged on its own against wide physical limits — the standard
// "gross range" check from meteorological QC. Nothing is remembered: a station
// whose sensor recovers shows its next good reading straight away. The limits
// are deliberately generous (beyond any value recorded in Hawaii or American
// Samoa) so real extremes — a frosty Mauna Kea night, a cloudburst — always pass.
// This does NOT catch values that are plausible but wrong (a stuck sensor, a
// slow drift); those need a different, riskier kind of check.

interface Range { min: number; max: number }

// Keyed by variable with the sensor number removed (Tair_2_Avg → Tair_Avg), in
// the API's raw units. Order doesn't matter; each key is matched exactly.
const PLAUSIBLE: Record<string, Range> = {
  // °C. Hawaii's record low is about -11°C (Mauna Kea); record high 38°C.
  Tair_Avg:   { min: -30, max: 55 },
  Tsoil_Avg:  { min: -30, max: 80 },
  Tsrf_Avg:   { min: -40, max: 90 },
  Tsky_Avg:   { min: -100, max: 60 }, // a clear sky reads very cold
  Twt_Avg:    { min: -5, max: 50 },
  FT_Avg:     { min: -30, max: 90 },
  // %
  RH_Avg:     { min: 0, max: 105 },   // sensors read slightly over 100 in fog
  FM_Avg:     { min: 0, max: 100 },
  // kPa. Mauna Kea's summit is ~61 kPa; sea-level pressure stays near 101.
  P_Avg:      { min: 50, max: 110 },
  Psl_Avg:    { min: 85, max: 110 },
  VP_Avg:     { min: 0, max: 10 },
  VPsat_Avg:  { min: 0, max: 10 },
  VPD_Avg:    { min: 0, max: 10 },
  // W/m². Small negatives at night are normal sensor offset.
  SWin_Avg:   { min: -50, max: 1600 },
  SWout_Avg:  { min: -50, max: 1200 },
  SWnet_Avg:  { min: -50, max: 1600 },
  LWin_Avg:   { min: 0, max: 800 },
  LWout_Avg:  { min: 0, max: 900 },
  LWnet_Avg:  { min: -500, max: 300 },
  Rnet_Avg:   { min: -500, max: 1600 },
  SHFsrf_Avg: { min: -1000, max: 1000 },
  Albedo_Avg: { min: 0, max: 1 },
  // Wind
  WS_Avg:     { min: 0, max: 75 },    // m/s; above the strongest hurricane gusts
  WDrs_Avg:   { min: 0, max: 360 },
  // Rain. 5-min total in mm; peak intensity in mm/hour.
  RF_Tot300s: { min: 0, max: 100 },
  RFint_Max:  { min: 0, max: 1000 },
  // Soil moisture is a volume fraction (0–1).
  SM_Avg:     { min: 0, max: 1 },
  // Water level is relative to each gauge's own datum, so only fill codes are caught.
  Wlvl_Avg:   { min: -100, max: 100 },
};

// Logger fill codes. Caught for every variable, including ones without a range.
const FILL_THRESHOLD = 6999;

function rangeKey(variable: string): string {
  return variable.replace(/_\d+_/, '_');
}

// True when a reading could be a real measurement.
export function isPlausible(variable: string, value: unknown): boolean {
  if (value == null || value === '') return false;
  const v = Number(value);
  if (!Number.isFinite(v) || Math.abs(v) >= FILL_THRESHOLD) return false;
  const range = PLAUSIBLE[rangeKey(variable)];
  return !range || (v >= range.min && v <= range.max);
}

// Drops readings that cannot be real. In development, logs what was dropped so a
// limit that is too tight shows up rather than silently hiding good data.
export function dropImplausible<T extends { variable: string; value: unknown; station_id?: string }>(rows: T[]): T[] {
  const kept = rows.filter(r => isPlausible(r.variable, r.value));
  if (import.meta.env.DEV && kept.length < rows.length) {
    const dropped = rows.filter(r => !isPlausible(r.variable, r.value));
    const summary = [...new Set(dropped.map(r => `${r.station_id ?? '?'} ${r.variable}=${r.value}`))].slice(0, 10);
    console.info(`[qc] dropped ${dropped.length} implausible reading(s):`, summary);
  }
  return kept;
}
