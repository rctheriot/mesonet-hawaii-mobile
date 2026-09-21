# Mesonet Mobile App

A mobile-first PWA for browsing real-time weather station data from the [HCDP](https://www.hawaii.edu/climate-data-portal/) (Hawaii Climate Data Portal) Mesonet network. Built as a prototype for stakeholder review.

**One codebase, multiple regional apps.** The same `main` branch builds a region-specific
app selected by the `VITE_APP_DATA` build-time environment variable:

| Region | `VITE_APP_DATA` | Domain |
|---|---|---|
| Hawaii | `hawaii` (default) | [hawaiimesonet.app](https://hawaiimesonet.app) |
| American Samoa | `american_samoa` | [americansamoamesonet.app](https://americansamoamesonet.app) |

See [Multi-Region Configuration](#multi-region-configuration) below.

## Setup

**Prerequisites:** Node.js via NVM (project uses NVM default LTS)

```bash
nvm use default
npm install
```

Copy the env file and add your API keys:
```bash
cp .env.example .env.local
# Edit .env.local and set:
#   VITE_MESONET_API_KEY=<your HCDP key>
#   VITE_CARTO_API_KEY=<your CARTO basemap key>
```

Get a free CARTO basemap key at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/) — no account needed, submit your email/domain/description and the key is emailed back immediately. Free tier covers 5M tile requests/month. Without this key, the map shows an "API KEY REQUIRED" watermark instead of the basemap.

## Development

```bash
npm run dev        # Hawaii (default)
npm run dev:as     # American Samoa
```

Runs at `http://localhost:5173`. Run the two on different ports (`npm run dev:as -- --port 5174`)
to compare them side by side.

## Build

```bash
npm run build      # Hawaii
npm run build:as   # American Samoa
```

Output goes to `dist/`. Each build overwrites `dist/`, so build one region at a time.

## Multi-Region Configuration

Everything region-specific lives in **`src/config/regions.data.ts`** — API `location` slug, app
name, map camera, geolocation bounds, sub-region (island) bounding boxes, icon folder, and the
Help → About links. Adding a region means adding one entry there plus one Cloudflare Pages project.

Two modules, deliberately split:

- **`src/config/regions.data.ts`** — plain data and pure helpers. **No `import.meta.env`**, because
  `vite.config.ts` imports it under Node, where `import.meta.env` does not exist.
- **`src/config/regions.ts`** — browser-side only. Exports the resolved
  `REGION = resolveRegion(import.meta.env.VITE_APP_DATA)`. Application code imports `REGION` from here.

An unknown `VITE_APP_DATA` **throws and fails the build** rather than silently falling back to
Hawaii — a typo in a Pages env var must not ship one region's data under another region's domain.

`vite.config.ts` uses the region to set the PWA manifest name/description, substitute
`%VITE_APP_NAME%` / `%VITE_APP_DESCRIPTION%` in `index.html`, and point Vite's `publicDir` at
`public/<assetDir>/` so each region ships its own icons (see `public/README.md`).

`useSettings` and `useFavorites` namespace their localStorage keys by region id. In production the
regions are separate origins so this is redundant, but in dev they share `localhost` — without it,
switching regions inherits the other one's saved map camera and favorites.

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.3.6 | Build tool |
| Tailwind CSS v4 | 4.2.1 | Styling |
| Leaflet | 1.9.4 | Map rendering |
| TanStack React Query | 5.90.21 | Data fetching & caching |
| Recharts | 3.8.0 | Historical data charts |
| react-router-dom | 7.18.2 | Client-side routing |
| vite-plugin-pwa | 1.2.0 | Service worker & PWA manifest |

All packages are pinned to exact versions. See [dependency policy](#dependency-policy) below.

## Project Structure

```
src/
├── api/           # API client (native fetch) + per-resource fetch functions
├── config/        # regions.data.ts (env-free region registry) + regions.ts (resolved REGION)
├── components/    # Reusable UI components (Map, StationDetail, StationList, Nav, etc.)
├── context/       # AppContext — dark mode, settings, favorites, chart selection
├── hooks/         # useStations, useMeasurements, useSettings, useFavorites, useGeolocation
├── screens/       # Top-level route components (HomeScreen, ExploreScreen, StationDetail)
├── types/         # Shared TypeScript types
├── theme.ts       # Status system (active/inactive/planned) and color constants
└── utils/         # Unit conversion, map color scales, time formatting
```

## API

- **Base URL:** `https://api.hcdp.ikewai.org`
- **Auth:** Bearer token via `VITE_MESONET_API_KEY` in `.env.local`
- All requests go through `src/api/client.ts → apiGet<T>()` which uses native `fetch`

## Map / Basemap Tiles

The map (`StationMap.tsx`, `StationLocationMap.tsx`) renders CARTO's `light_all`/`dark_all` **raster** tiles (not vector) via Leaflet's `L.tileLayer`. Requests are authenticated with `VITE_CARTO_API_KEY` (query param `?key=...`), required since CARTO gates basemap tiles behind a free key — see [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/). Free tier: 5M tile requests/month.

## Deploy

Production is served by **Cloudflare Pages**, auto-building from pushes to `main`.

Pages environment variables are **per project**, and a project produces a single build artifact —
so two custom domains on one project cannot build differently. Each region therefore gets its own
Pages project, all pointing at this same repo and branch:

| Pages project | Branch | Env | Custom domain |
|---|---|---|---|
| `hawaii-mesonet` | `main` | `VITE_APP_DATA=hawaii` | `hawaiimesonet.app` |
| `americansamoa-mesonet` | `main` | `VITE_APP_DATA=american_samoa` | `americansamoamesonet.app` |

Every project also needs `VITE_MESONET_API_KEY` and `VITE_CARTO_API_KEY` set for Production and
Preview — they're baked into the client bundle at build time, same as local dev. One push to
`main` triggers one build per project.

CI (`.github/workflows/ci.yml`) runs a build matrix over every region, so a config change that
breaks one region's build fails before it reaches `main`.

## Dependency Policy

This project enforces strict supply chain security rules:

- All packages pinned to **exact versions** — no `^` or `~`
- New packages must be **at least 30 days old** at time of install
- Any new `npm install` requires explicit approval before running
- **Axios is permanently banned** — use native `fetch` via `apiGet()` in `src/api/client.ts`
