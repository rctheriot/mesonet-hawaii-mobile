// Region registry — plain data only, NO `import.meta.env`.
//
// This module is imported from two very different places:
//   1. `src/config/regions.ts` (browser)  — resolves REGION from import.meta.env
//   2. `vite.config.ts`        (Node)     — needs the same names/icons at build time
// `import.meta.env` does not exist in Node, so keeping this file env-free is what
// lets both sides share one source of truth. Put nothing environment-specific here.

export type Bounds = [[number, number], [number, number]]; // [[south, west], [north, east]]

export interface SubRegion {
  name: string;
  /** Permissive box used to derive a station's sub-region from its coordinates. */
  bounds: Bounds;
  /**
   * Tighter box used only to frame the static map on the station detail Location
   * tab. Trimmed to the landmass so fitBounds picks the highest zoom that still
   * fits on a phone. Falls back to `bounds` when omitted.
   */
  displayBounds?: Bounds;
}

export interface RegionConfig {
  /** Registry key, also the localStorage namespace. */
  id: string;
  /** The API's `location` query param. Explicit on purpose — never derived from
   *  `id`, because the API's slugs are not guessable (`american-samoa` and
   *  `samoa` both return []; only `american_samoa` works). */
  apiLocation: string;
  appName: string;
  shortName: string;
  description: string;
  /** Shown in place of a station's sub-region when coordinates match no box. */
  regionLabel: string;
  mapCenter: [number, number];
  mapZoom: number;
  /** Generous box around the whole region; "Near Me" refuses to work outside it. */
  geoBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /**
   * Hard pan limit for the interactive map (Leaflet maxBounds, viscosity 1.0).
   * Kept separate from geoBounds so the pan clamp can be loosened for comfortable
   * zooming-out without also widening where "Near Me" is considered valid.
   */
  mapMaxBounds: Bounds;
  geoOutsideMessage: string;
  /** ORDER MATTERS — first box that contains the point wins. */
  subRegions: SubRegion[];
  /** Subdirectory of `public/` holding this region's icons; becomes Vite's publicDir. */
  assetDir: string;
  links: {
    mesonetUrl: string;
    /** Display text for mesonetUrl (the bare host+path, not the full URL). */
    mesonetUrlLabel: string;
    orgName: string;
    contactName: string;
    contactEmail: string;
    /** One sentence describing the network, shown in Help → About. */
    networkBlurb: string;
    /** Omit entirely to hide the Funding block for a region. */
    funder?: { intro: string; awardNumber: string; url: string; label: string };
  };
}

// Both regions are run by the same group under the same award, so they share
// these. Split per region the moment American Samoa gets its own attribution.
const HCDP_LINKS = {
  mesonetUrl: 'https://www.hawaii.edu/climate-data-portal/hawaii-mesonet/',
  mesonetUrlLabel: 'hawaii.edu/climate-data-portal',
  orgName: 'Hawaii Climate Data Portal (HCDP)',
  contactName: 'Ryan Theriot',
  contactEmail: 'rtheriot@hawaii.edu',
  funder: {
    intro:
      'Hawaiʻi EPSCoR is funded by the National Science Foundation under EPSCoR Research ' +
      'Infrastructure Improvement Award',
    awardNumber: '#OIA-2149133',
    url: 'https://hawaii.edu/epscor/change-hi/',
    label: 'hawaii.edu/epscor/change-hi',
  },
} as const satisfies Omit<RegionConfig['links'], 'networkBlurb'>;

export const REGIONS: Record<string, RegionConfig> = {
  hawaii: {
    id: 'hawaii',
    apiLocation: 'hawaii',
    appName: 'Hawaii Mesonet',
    shortName: 'Mesonet',
    description: 'Real-time Hawaii environmental sensor data from the HCDP Mesonet network',
    regionLabel: 'Hawaii',
    mapCenter: [20.5, -157.5],
    mapZoom: 7,
    geoBounds: { minLat: 17, maxLat: 24, minLng: -163, maxLng: -152 },
    mapMaxBounds: [[17, -163], [24, -152]],
    geoOutsideMessage:
      'Your location appears to be outside Hawaiʻi. Near Me only works on the islands.',
    // Oʻahu must precede Molokaʻi/Lānaʻi: their latitude ranges overlap and
    // longitude is what separates them.
    subRegions: [
      {
        name: 'Kauaʻi',
        bounds: [[21.8, -160.4], [22.35, -159.2]],
        displayBounds: [[21.88, -159.78], [22.23, -159.30]],
      },
      {
        name: 'Oʻahu',
        bounds: [[21.15, -158.35], [21.75, -157.55]],
        displayBounds: [[21.245222, -158.294449], [21.718680, -157.637329]],
      },
      {
        name: 'Molokaʻi',
        bounds: [[21.0, -157.4], [21.25, -156.65]],
        displayBounds: [[21.032596, -157.329712], [21.233702, -156.691818]],
      },
      {
        name: 'Lānaʻi',
        bounds: [[20.7, -157.1], [20.95, -156.8]],
        displayBounds: [[20.722722, -157.085609], [20.938034, -156.798592]],
      },
      {
        name: 'Maui',
        bounds: [[20.45, -156.75], [21.1, -155.95]],
        displayBounds: [[20.562082, -156.735077], [21.050540, -155.965347]],
      },
      {
        name: 'Hawaiʻi Island',
        bounds: [[18.87, -156.15], [20.35, -154.75]],
        displayBounds: [[18.880300, -156.140442], [20.287961, -154.769897]],
      },
    ],
    assetDir: 'hawaii',
    links: {
      ...HCDP_LINKS,
      networkBlurb:
        'a statewide system of sensor stations monitoring temperature, rainfall, wind, ' +
        'humidity, and soil conditions across the Hawaiian Islands',
    },
  },

  american_samoa: {
    id: 'american_samoa',
    apiLocation: 'american_samoa',
    appName: 'American Samoa Mesonet',
    shortName: 'Mesonet',
    description:
      'Real-time American Samoa environmental sensor data from the HCDP Mesonet network',
    regionLabel: 'American Samoa',
    // All current stations sit on Tutuila and Aunuʻu, spanning ~30 km — zoom 7
    // (the Hawaii default) would frame mostly open ocean.
    mapCenter: [-14.29, -170.69],
    mapZoom: 11,
    // Wide enough to include the Manuʻa Islands, should stations be added there.
    geoBounds: { minLat: -15.0, maxLat: -13.9, minLng: -171.2, maxLng: -169.3 },
    // Deliberately much wider than geoBounds. maxBoundsViscosity is 1.0, so once
    // the viewport is larger than the bounds the map goes rigid — this span
    // (4.0° lat x 6.3° lng) keeps panning fluid down to ~z9 on a desktop viewport
    // and ~z8 on a phone, while still covering Tutuila, Aunuʻu and the Manuʻa group.
    mapMaxBounds: [[-16.3, -173.5], [-12.3, -167.2]],
    geoOutsideMessage:
      'Your location appears to be outside American Samoa. Near Me only works on the islands.',
    // Aunuʻu first: it sits inside Tutuila's permissive box.
    subRegions: [
      {
        name: 'Aunuʻu',
        bounds: [[-14.30, -170.575], [-14.27, -170.535]],
        displayBounds: [[-14.295, -170.572], [-14.272, -170.540]],
      },
      {
        name: 'Tutuila',
        bounds: [[-14.40, -170.87], [-14.22, -170.53]],
        displayBounds: [[-14.385, -170.85], [-14.235, -170.54]],
      },
    ],
    assetDir: 'american_samoa',
    links: {
      ...HCDP_LINKS,
      networkBlurb:
        'a network of sensor stations monitoring temperature, rainfall, wind, humidity, ' +
        'and soil conditions across American Samoa',
    },
  },
};

export const DEFAULT_REGION_ID = 'hawaii';

/**
 * Resolve a region id to its config. Throws on an unknown id rather than falling
 * back — a typo in a Cloudflare Pages env var must fail the build loudly, not
 * silently serve Hawaii data at another region's domain.
 */
export function resolveRegion(id: string | undefined): RegionConfig {
  const key = (id ?? DEFAULT_REGION_ID).trim() || DEFAULT_REGION_ID;
  const region = REGIONS[key];
  if (!region) {
    throw new Error(
      `Unknown VITE_APP_DATA region "${key}". ` +
        `Known regions: ${Object.keys(REGIONS).join(', ')}.`
    );
  }
  return region;
}

/** True when (lat, lng) falls inside a [[south, west], [north, east]] box. */
export function boundsContain(b: Bounds, lat: number, lng: number): boolean {
  return lat >= b[0][0] && lat <= b[1][0] && lng >= b[0][1] && lng <= b[1][1];
}
