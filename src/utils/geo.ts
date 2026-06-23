export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns a small deterministic lat/lng offset for a station so its map marker
// doesn't reveal the precise installation location. Same station_id always
// produces the same offset. ±0.0003° ≈ ±33 m per axis.
export function stationJitter(stationId: string): { dlat: number; dlng: number } {
  let h = 0;
  for (let i = 0; i < stationId.length; i++) {
    h = Math.imul(h, 31) + stationId.charCodeAt(i);
    h |= 0;
  }
  const a = ((h & 0xFFFF) >>> 0) / 0xFFFF;
  const b = (((h >>> 16) & 0xFFFF) >>> 0) / 0xFFFF;
  const MAX = 0.0003;
  return { dlat: (a - 0.5) * 2 * MAX, dlng: (b - 0.5) * 2 * MAX };
}
