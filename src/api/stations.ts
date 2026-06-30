import { apiGet } from './client';
import type { Station } from '../types/api';

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
// Order matters: Oʻahu must come before Molokaʻi/Lānaʻi since their latitude
// ranges overlap. Hawaiʻi Island is a catch-all for anything south of 20.35°N.
export function islandFromCoords(lat: number, lng: number): string {
  // Non-finite, or Null Island (0,0) — which a null coord would coerce to —
  // is not a real Hawaii location; don't let it fall through to a real island.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Unknown';
  if (lat === 0 && lng === 0) return 'Unknown';
  if (lat >= 21.8  && lng <= -159.2) return 'Kauaʻi';
  if (lat >= 21.15 && lng >= -158.35 && lng <= -157.55) return 'Oʻahu';
  if (lat >= 21.0  && lat <= 21.25  && lng >= -157.4  && lng <= -156.65) return 'Molokaʻi';
  if (lat >= 20.7  && lat <= 20.95  && lng >= -157.1  && lng <= -156.8)  return 'Lānaʻi';
  if (lat >= 20.45 && lat <= 21.1   && lng >= -156.75 && lng <= -155.95) return 'Maui';
  if (lat <= 20.35) return 'Hawaiʻi Island';
  return 'Hawaii';
}

export async function fetchStations(): Promise<Station[]> {
  const { data } = await apiGet<Station[] | Record<string, Station>>('/mesonet/db/stations', { location: 'hawaii', limit: 1000 });
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

