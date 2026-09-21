# Per-region app icons

`vite.config.ts` sets Vite's `publicDir` to `public/<region.assetDir>`, so only the
selected region's folder is copied to the site root at build time. Every region folder
must contain all four PNGs below. This README lives one level up from the region
folders so it is never copied into `dist/`.

| File | Size |
|---|---|
| `favicon.png` | 32×32 (or 48×48) |
| `apple-touch-icon.png` | 180×180 |
| `pwa-192x192.png` | 192×192 |
| `pwa-512x512.png` | 512×512 |

## Artwork

Each region's set is the shared droplet mark with that region's flag as a rounded
badge in the upper-left (36% of icon width, 5% margin — clears the droplet at every
size). Save them as **opaque RGB, not RGBA**: iOS renders a transparent
`apple-touch-icon.png` against black.

To add a region, create `public/<assetDir>/` with all four files and set `assetDir`
in `src/config/regions.data.ts`.
