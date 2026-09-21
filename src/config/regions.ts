// Browser-side region resolution. `vite.config.ts` must import `regions.data`
// directly instead — `import.meta.env` does not exist under Node.
import { resolveRegion, DEFAULT_REGION_ID } from './regions.data';

export type { Bounds, SubRegion, RegionConfig } from './regions.data';
export { boundsContain, REGIONS } from './regions.data';

export const REGION = resolveRegion(import.meta.env.VITE_APP_DATA);

/**
 * localStorage key for this region.
 *
 * Hawaii deliberately keeps the original un-suffixed keys so existing
 * hawaiimesonet.app users don't lose their saved stations — that app shipped
 * before regions existed. Every other region gets a suffix, which also keeps
 * them isolated in dev, where all regions share the localhost origin.
 */
export function regionStorageKey(base: string): string {
  return REGION.id === DEFAULT_REGION_ID ? base : `${base}-${REGION.id}`;
}
