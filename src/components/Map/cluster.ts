// ─── Marker clustering (pure) ─────────────────────────────────────────────────
// Groups map points that would overlap on screen. Positions are projected pixel
// coordinates at one zoom level (Leaflet's map.project), which don't change when
// the map pans — so clusters only need recomputing on zoom, and they stay put.

export interface ClusterPoint {
  id: string;
  x: number;
  y: number;
}

export interface Cluster {
  ids: string[];
  // Centroid of the members, in the same pixel space as the input.
  x: number;
  y: number;
}

// Greedy distance clustering: walk points in id order, and each point not yet
// taken seeds a cluster of every untaken point within radiusPx of it. Id order
// (not input order) keeps the result stable across refetches. O(n²), which is
// fine for a few hundred stations.
export function clusterPoints(points: ClusterPoint[], radiusPx: number): Cluster[] {
  const sorted = points.slice().sort((a, b) => a.id.localeCompare(b.id));
  const taken = new Set<string>();
  const r2 = radiusPx * radiusPx;
  const clusters: Cluster[] = [];

  for (const seed of sorted) {
    if (taken.has(seed.id)) continue;
    const members = sorted.filter(p => {
      if (taken.has(p.id)) return false;
      const dx = p.x - seed.x, dy = p.y - seed.y;
      return dx * dx + dy * dy <= r2;
    });
    for (const m of members) taken.add(m.id);
    clusters.push({
      ids: members.map(m => m.id),
      x: members.reduce((s, m) => s + m.x, 0) / members.length,
      y: members.reduce((s, m) => s + m.y, 0) / members.length,
    });
  }
  return clusters;
}

// Median rather than mean: a cluster can mix a summit and a coastal station, and
// one bad sensor value would drag a mean far from any real reading.
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
