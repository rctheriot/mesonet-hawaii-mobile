import { apiGet } from './client';
import type { Station } from '../types/api';
import { REGION } from '../config/regions';
import { boundsContain, type SubRegion } from '../config/regions.data';

// Parse a raw coordinate into a finite number, or NaN when it's missing/invalid.
// The API sends null for stations with no fixed location (e.g. repeaters).
// Number(null) would coerce to 0 — a real point in the Atlantic — so guard
// explicitly and let downstream `!lat || !lng` checks treat it as absent.
function parseCoord(v: unknown): number {
  if (v == null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// The API provides no island field, so we derive it from bounding boxes.
//
// Pure form, parameterized by the sub-region table so tests can drive it with an
// explicit region instead of depending on which build the suite runs under.
// Order matters: the first box containing the point wins (in Hawaii, Oʻahu must
// precede Molokaʻi/Lānaʻi since their latitude ranges overlap; in American Samoa,
// Aunuʻu must precede Tutuila since it sits inside Tutuila's box).
export function islandFromCoordsIn(
  subRegions: SubRegion[],
  fallbackLabel: string,
  lat: number,
  lng: number
): string {
  // Non-finite, or Null Island (0,0) — which a null coord would coerce to —
  // is not a real location in any region; don't let it fall through to a real one.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Unknown';
  if (lat === 0 && lng === 0) return 'Unknown';
  for (const sr of subRegions) {
    if (boundsContain(sr.bounds, lat, lng)) return sr.name;
  }
  return fallbackLabel;
}

// Bound to the region this build was configured for.
export function islandFromCoords(lat: number, lng: number): string {
  return islandFromCoordsIn(REGION.subRegions, REGION.regionLabel, lat, lng);
}

export async function fetchStations(): Promise<Station[]> {
  const { data } = await apiGet<Station[] | Record<string, Station>>('/mesonet/db/stations', { location: REGION.apiLocation, limit: 1000 });
  const raw: Station[] = Array.isArray(data) ? data : Object.values(data);
  return raw.map(s => {
    const lat = parseCoord(s.lat);
    const lng = parseCoord(s.lng);
    return {
      ...s,
      lat,
      lng,
      elevation: s.elevation != null ? Number(s.elevation) : undefined,
      island: islandFromCoords(lat, lng),
    };
  });
}
