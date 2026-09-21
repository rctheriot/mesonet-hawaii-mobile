// Browser-side region resolution. `vite.config.ts` must import `regions.data`
// directly instead — `import.meta.env` does not exist under Node.
import { resolveRegion } from './regions.data';

export type { Bounds, SubRegion, RegionConfig } from './regions.data';
export { boundsContain, REGIONS } from './regions.data';

export const REGION = resolveRegion(import.meta.env.VITE_APP_DATA);
