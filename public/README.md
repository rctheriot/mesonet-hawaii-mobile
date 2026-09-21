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

## `american_samoa/` icons are PLACEHOLDERS

They are currently copies of the Hawaii icons, so that
`VITE_APP_DATA=american_samoa` builds successfully before the real artwork lands.
To replace them, overwrite the files in place keeping the same filenames and sizes —
no code change is needed.
