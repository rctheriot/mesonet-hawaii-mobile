import { apiGet } from './client';
import type { Station } from '../types/api';

// The API provides no island field, so we derive it from bounding boxes.
// Order matters: Oʻahu must come before Molokaʻi/Lānaʻi since their latitude
// ranges overlap. Hawaiʻi Island is a catch-all for anything south of 20.35°N.
function islandFromCoords(lat: number, lng: number): string {
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
    const lat = Number(s.lat);
    const lng = Number(s.lng);
    return {
      ...s,
      lat,
      lng,
      elevation: s.elevation != null ? Number(s.elevation) : undefined,
      island: islandFromCoords(lat, lng),
    };
  });
}

