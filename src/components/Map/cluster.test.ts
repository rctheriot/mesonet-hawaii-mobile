import { describe, it, expect } from 'vitest';
import { clusterPoints, median } from './cluster';

describe('clusterPoints', () => {
  it('keeps a lone point as a single-member cluster', () => {
    const c = clusterPoints([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 500, y: 0 }], 40);
    expect(c.map(k => k.ids)).toEqual([['a'], ['b']]);
  });

  it('merges points within the radius and centres on their centroid', () => {
    const c = clusterPoints([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 30, y: 0 }], 40);
    expect(c).toEqual([{ ids: ['a', 'b'], x: 15, y: 0 }]);
  });

  it('does not merge points just outside the radius', () => {
    const c = clusterPoints([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 41, y: 0 }], 40);
    expect(c).toHaveLength(2);
  });

  it('places every point in exactly one cluster', () => {
    const pts = Array.from({ length: 200 }, (_, i) => ({
      id: String(i).padStart(4, '0'),
      x: (i * 37) % 300,
      y: (i * 53) % 300,
    }));
    const ids = clusterPoints(pts, 40).flatMap(k => k.ids);
    expect(ids).toHaveLength(pts.length);
    expect(new Set(ids).size).toBe(pts.length);
  });

  it('gives the same clusters regardless of input order', () => {
    const pts = [
      { id: 'c', x: 60, y: 0 }, { id: 'a', x: 0, y: 0 }, { id: 'b', x: 30, y: 0 },
    ];
    const ids = (p: typeof pts) => clusterPoints(p, 40).map(k => k.ids);
    expect(ids(pts)).toEqual(ids(pts.slice().reverse()));
  });
});

describe('median', () => {
  it('returns null for no values', () => {
    expect(median([])).toBeNull();
  });

  it('takes the middle value, ignoring a far outlier', () => {
    expect(median([75, -148, 78, 74, 76])).toBe(75);
  });

  it('averages the middle two for an even count', () => {
    expect(median([1, 4, 2, 3])).toBe(2.5);
  });
});
