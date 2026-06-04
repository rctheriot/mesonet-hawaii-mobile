type RGB = [number, number, number];

interface ColorStop { t: number; rgb: RGB }

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function stopsToHex(stops: ColorStop[], value: number): string {
  const clamped = Math.max(stops[0].t, Math.min(stops[stops.length - 1].t, value));
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].t && clamped <= stops[i + 1].t) {
      lo = stops[i]; hi = stops[i + 1]; break;
    }
  }
  const t = (clamped - lo.t) / (hi.t - lo.t);
  return `rgb(${lerp(lo.rgb[0], hi.rgb[0], t)},${lerp(lo.rgb[1], hi.rgb[1], t)},${lerp(lo.rgb[2], hi.rgb[2], t)})`;
}

function stopsToCss(stops: ColorStop[]): string {
  const parts = stops.map(s => `rgb(${s.rgb.join(',')})`).join(', ');
  return `linear-gradient(to right, ${parts})`;
}

// ── Temperature — classic weather gradient (blue → cyan → yellow → orange → red)
const TEMP_STOPS: ColorStop[] = [
  { t: 15, rgb: [ 37, 99,  235] }, // blue-600    — cool
  { t: 21, rgb: [  6, 182, 212] }, // cyan-500    — mild
  { t: 27, rgb: [250, 204,  21] }, // yellow-400  — warm
  { t: 31, rgb: [249, 115,  22] }, // orange-500  — hot
  { t: 35, rgb: [220,  38,  38] }, // red-600     — very hot
];
export function tempToHex(celsius: number): string { return stopsToHex(TEMP_STOPS, celsius); }
export const TEMP_RANGE_C = { min: TEMP_STOPS[0].t, max: TEMP_STOPS[TEMP_STOPS.length - 1].t };
export const TEMP_GRADIENT_CSS = stopsToCss(TEMP_STOPS);

// ── Wind speed — 0 m/s (green) → 8 (amber) → 15 (red) ────────────────────────
const WIND_STOPS: ColorStop[] = [
  { t:  0, rgb: [34,  197,  94] },
  { t:  8, rgb: [245, 158,  11] },
  { t: 15, rgb: [239,  68,  68] },
];
export function windToHex(ms: number): string { return stopsToHex(WIND_STOPS, ms); }
export const WIND_RANGE_MS = { min: WIND_STOPS[0].t, max: WIND_STOPS[WIND_STOPS.length - 1].t };
export const WIND_GRADIENT_CSS = stopsToCss(WIND_STOPS);

// ── Relative humidity — 0% (amber) → 50% (green) → 100% (blue) ──────────────
const RH_STOPS: ColorStop[] = [
  { t:   0, rgb: [245, 158, 11]  },
  { t:  50, rgb: [34,  197, 94]  },
  { t: 100, rgb: [59,  130, 246] },
];
export function rhToHex(pct: number): string { return stopsToHex(RH_STOPS, pct); }
export const RH_RANGE = { min: RH_STOPS[0].t, max: RH_STOPS[RH_STOPS.length - 1].t };
export const RH_GRADIENT_CSS = stopsToCss(RH_STOPS);

// ── Soil moisture — 0% (amber) → 50% (green) → 100% (blue) — same as RH ──────
// API value is fractional VWC (0–1); multiply by 100 for display, color on raw.
export function smToHex(frac: number): string { return rhToHex(frac * 100); }
export const SM_RANGE = { min: 0, max: 100 }; // display percent
export const SM_GRADIENT_CSS = RH_GRADIENT_CSS;

// ── Shortwave radiation — 0 W/m² (gray) → 500 (amber) → 1000 (bright yellow) ─
const SW_STOPS: ColorStop[] = [
  { t:    0, rgb: [ 59, 130, 246] }, // blue-500  — no sun
  { t:  500, rgb: [249, 115,  22] }, // orange-500 — moderate
  { t: 1000, rgb: [239,  68,  68] }, // red-500   — peak sun
];
export function swToHex(wm2: number): string { return stopsToHex(SW_STOPS, wm2); }
export const SW_RANGE = { min: SW_STOPS[0].t, max: SW_STOPS[SW_STOPS.length - 1].t };
export const SW_GRADIENT_CSS = stopsToCss(SW_STOPS);

// ── Rainfall (5-min bucket, mm) — 0 (light blue) → 5 (deep blue) ─────────────
const RAIN_STOPS: ColorStop[] = [
  { t: 0, rgb: [186, 230, 253] },
  { t: 2, rgb: [59,  130, 246] },
  { t: 5, rgb: [30,   58, 138] },
];
export function rainToHex(mm: number): string { return stopsToHex(RAIN_STOPS, mm); }
export const RAIN_RANGE_MM = { min: RAIN_STOPS[0].t, max: RAIN_STOPS[RAIN_STOPS.length - 1].t };
export const RAIN_GRADIENT_CSS = stopsToCss(RAIN_STOPS);
