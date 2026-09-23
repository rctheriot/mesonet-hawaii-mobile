# Hawaii Mesonet Mobile App — Claude Context

## Claude Model Guidance
- **Claude Sonnet** — default for all tasks: feature work, bug fixes, refactoring, code review
- **Claude Opus** — use for complex architectural decisions or when Sonnet is struggling with a multi-file problem

## Issue Tiers
Issues are tracked on GitHub and labeled by tier. Each tier reflects implementation effort and readiness to build.

- **Tier 1** — Quick fixes. Self-contained, low-risk, ~1–3 hours each. Can be grouped into a single branch. No design input or stakeholder decisions needed.
- **Tier 2** — Medium effort. Each gets its own branch. Requires more thought or investigation but is buildable with existing data and APIs. May need a brief planning discussion before starting.
- **Tier 3** — Significant effort. Do not open a branch without a planning conversation first. Requires stakeholder input, design decisions, or external API research before implementation begins.
- **Tier 4** — Out of scope for current prototype phase. Logged for visibility. Requires partnerships, external datasets, or is a fundamentally different product scope.

See GitHub Issues at https://github.com/rctheriot/mesonet-hawaii-mobile/issues for the full list.

## What This Is
A mobile-first PWA for browsing real-time weather station data from the HCDP (Hawaii Climate Data Portal) Mesonet network. Built as a prototype for stakeholder review.

**One codebase, multiple regional apps.** The same `main` branch builds a region-specific app,
selected by the build-time env var `VITE_APP_DATA`:

| Region | `VITE_APP_DATA` | Domain |
|---|---|---|
| Hawaii | `hawaii` (default) | hawaiimesonet.app |
| American Samoa | `american_samoa` | americansamoamesonet.app |

See **Multi-Region Configuration** below before touching anything region-specific.

## Tech Stack
- **React 19 + TypeScript + Vite 7**
- **Tailwind CSS v4** — configured via `src/index.css` (no `tailwind.config.js`). Requires `@tailwindcss/vite` plugin in `vite.config.ts`. Dark mode via `@custom-variant dark`. Custom breakpoint `xs` at 400px defined in `@theme`.
- **Leaflet** — map rendering, custom DivIcon markers, CartoDB raster tiles (light_all / dark_all)
- **TanStack React Query** — data fetching and caching
- **Recharts** — historical data charts in station panel
- **vite-plugin-pwa** — service worker generation (Workbox) and PWA manifest. Note: v1.2.0 supports Vite up to v7 only. Do not upgrade Vite to v8 until a compatible vite-plugin-pwa version (≥30 days old) is available.

## Dependency Policy — STRICTLY ENFORCED
- **Always ask the user before any `npm install`** — present package name, version, and publish date for approval
- **Exact version pins only** — no `^` or `~` in package.json
- **30-day minimum age** — only install package versions published at least 30 days ago
- **Axios is permanently banned** — a prior machine was infected via a malicious Axios package. Use native `fetch` via `apiGet()` in `src/api/client.ts` for all HTTP requests.

## Pinned Package Versions (as of 2026-04-14)

| Package | Version |
|---|---|
| react + react-dom | 19.2.4 |
| react-router-dom | 7.13.1 |
| @tanstack/react-query | 5.90.21 |
| leaflet | 1.9.4 |
| @types/leaflet | 1.9.21 |
| recharts | 3.8.0 |
| tailwindcss | 4.2.1 |
| vite | 7.3.1 |
| @vitejs/plugin-react | 5.1.4 |
| @tailwindcss/vite | 4.2.1 |
| vite-plugin-pwa | 1.2.0 |
| typescript | 5.9.3 |
| @types/react | 19.2.14 |
| @types/react-dom | 19.2.3 |

## API
- **Base URL:** `https://api.hcdp.ikewai.org`
- **`location` param:** never hardcode it. Every query passes `REGION.apiLocation` from `src/config/regions.ts`. Known slugs: `hawaii`, `american_samoa`. The API's slugs are **not guessable** — `american-samoa`, `samoa` and `guam` all return `[]`, so a new region's slug must be confirmed against the API before it is added.
- **Auth:** `Bearer` token in `Authorization` header, key in `.env.local` as `VITE_MESONET_API_KEY`
- **HTTP client:** Native `fetch` via `apiGet<T>(path, params?)` in `src/api/client.ts`. Returns `{ data: T }`. Never use axios.
- **Key endpoints:**
  - `GET /mesonet/db/stations?location=<REGION.apiLocation>&limit=1000` — all stations
  - `GET /mesonet/db/measurements?station_ids=&start_date=<now-7d>&end_date=<now>&limit=1000&join_metadata=true&local_tz=true&location=<REGION.apiLocation>` — latest readings (see the fetching strategy below)
  - `GET /mesonet/db/variables?location=<REGION.apiLocation>&limit=1000` — variable metadata (standard_name, display_name, units). Fetched once and cached for the session via `useVariables`/`fetchVariables`; supplies units to the bulk map queries so they can omit `join_metadata`.
  - The `stationMonitor` endpoint was previously used to derive status but is no longer called — status now comes straight from the `stations` payload (see Status System).
- **Field names:** stations use `lat`/`lng` (not latitude/longitude). Measurements use `variable` (not `var_id`), `variable_display_name`, `value` (may be string, cast with `Number()`).
- **Measurement-fetching strategy (perf):**
  - Bulk map queries (`fetchMapMeasurements`, `fetchMapRainfall24hr`) **omit `join_metadata`** — it repeats identical station/variable metadata on every row (~4x payload; ~8MB→2.25MB for rainfall). Units come from the cached `/variables` endpoint, attached in the hook via `select`.
  - **Every measurement query sends a date range fitted to what its screen shows, plus an explicit `limit` that must never bite.** The API returns rows **newest-first**, and with no `limit` it **silently stops at 10,000 rows** — dropping the *oldest* rows with no error (an undercounted 24h rainfall total, a clipped 7d chart). Explicit limits are honoured (tested up to 1,000,000). Limits are computed by `rowLimit(stations, variables, hours)` in `src/api/measurements.ts` (5-min reports × 2 headroom); region-wide queries size for `MAX_REGION_STATIONS` (300). In dev, a response that fills its limit logs a `console.warn`.
  - Windows: `fetchMapMeasurements` 2h (covers every recently-reporting station; stations silent >2h fall off the live map); `fetchMapRainfall24hr` and the favorites batch 24h; history exactly 6h/24h/3d/7d.
  - **Nothing looks back more than 7 days** — the 7d chart is the furthest the app goes. Single-station `fetchLatestMeasurements` uses a 7-day window with `limit: 1000`: rows come newest-first and all variables in a report share a timestamp, so 1000 rows is the station's last ~45 min even at the widest station (~107 variables). That catches variables reporting every 10–15 min, while ones that pause for hours (e.g. albedo overnight) stay out rather than showing stale as current. A station silent for >7 days shows no current readings.
  - Date ranges are for **correctness, not speed**: interleaved timings showed the server's stalls hit ranged and unranged queries equally.
  - HomeScreen favorites use **one batched request** (`fetchLatestMeasurementsBatch` / `useLatestVarBatch`) for the displayed variable (+ `WDrs_1_Avg` for Wind), not a per-station fan-out. It also **omits `join_metadata`** — units are attached from the cached `/variables` metadata in the hook via `select`. (`StationCard` only needs `units` from the join; `variable_display_name` is used solely in the `varId === null` auto-select path, which HomeScreen never hits, and wind merging keys off the variable id.)
  - The batch uses a **24h date range, not a row `limit`**. A shared limit is split across the requested stations, so with few favorites each pulls many hours of useless history (and a small limit would instead starve stations whose latest reading is older). A date range fetches only the recent window per station regardless of count; 24h matches the staleness threshold so no non-stale favorite is dropped.
- **Sensor-number normalization:** `VariableInfoModal` strips sensor numbers (`_2_`/`_3_` → `_1_`) as a fallback so sensors 2–4 still resolve a glossary entry when their exact ID isn't defined.

## Status System
Defined in `src/theme.ts`. Three statuses only: `active` | `inactive` | `planned` (plus `unknown` as fallback).
- Status comes **straight from the database `status` field** — the frontend does not reinterpret it. `stationStatusKey(station)` is the single source of truth everywhere.
- **Active** = green (`#22c55e`) · **Inactive** = red (`#ef4444`) · **Planned** = yellow (`#eab308`) · anything else = `unknown` gray.
- **Stale data** (last report >24h ago, derived from the latest measurement timestamps) is shown only as an amber tag in the `StationDetail` subtitle — not reflected in map colors or list status.

## Architecture Notes

### App.tsx
Thin shell: sets up `QueryClientProvider`, `AppProvider`, and `BrowserRouter`, then renders `AppLayout`. Routes: `/` (HomeScreen), `/explore` (ExploreScreen), `/station/:stationId` (StationDetail). `BottomNav` (My Stations / Station Network) is shown on every route except `/station/*`. App-wide state lives in `AppContext`, not here.

### Map (StationMap.tsx)
- Map is **always mounted**, hidden via `className="hidden"` in list view to preserve camera state.
- Markers are `L.Marker` instances with custom `DivIcon`s managed in `markersRef`. `metaRef` stores `{ color, hollow }` per station — must stay in sync with visual state or the highlight effect will use stale colors.
- `onSelectStation` is stored in a ref (`onSelectRef`) so it's not a dependency of the markers effect — prevents markers from resetting on every render.
- Selected station uses `selectedPinIcon` from `mapIcons.ts` (sky blue pin). Marker positions are jittered via `stationJitter()` (exported, also reused by `StationLocationMap`).
- Leaflet requires `map.invalidateSize()` after a hidden→visible transition — called in a `useEffect` watching `isVisible`, and also debounced when `panelHeight` changes.
- Variable coloring mode: when a map variable is selected, markers show colored pill labels via `stationDivIcon()`. Stations with no data get a gray dot. `MapLegend.tsx` renders the color scale bottom-left.
- Map modes defined as `MapMode` type in `StationMap.tsx`: `status` | variable standard_names (e.g. `Tair_1_Avg`, `WS_1_Avg`).
- `maxBounds` comes from `REGION.mapMaxBounds` with `maxBoundsViscosity: 1.0`. This was a hardcoded Hawaii box and silently snapped other regions' maps into the mid-Pacific — if a region's map won't sit where you set `mapCenter`, check this first.

### StationDetail (full-page station view)
- Reached by navigating to `/station/:stationId` from a map marker or list row. Replaced the old draggable slide-up panel entirely.
- Sub-components live in `src/components/StationDetail/`: `HistoryChart`, `ReadingsGrid`, `Rainfall24hrCard`, `StationMeta`.
- Hero shows one large reading, or two side-by-side (sky/amber accents) when two chart variables are selected. Rainfall in the hero shows the 24hr total via `useRainfall24hr`.
- Three tabs: **Readings** (chart + readings grid), **Location** (static `StationLocationMap`), **Info** (`StationMeta`).
- Readings rendered via `ReadingsGrid` — groups measurements by category, merges wind speed/direction, and handles the 24hr rainfall card.
- Chart variable selection managed by `useChartVars` hook — supports two simultaneous variables (dual-series chart). Selection persists across station navigation when the variable exists on the new station.

### PWAInstallPrompt
- Standalone React component — does not import from `vite-plugin-pwa`.
- Uses browser `beforeinstallprompt` event for Android native install.
- iOS install is always manual (Safari share sheet instructions).
- Dismissed state stored in `sessionStorage` under `pwa-prompt-dismissed`.

### AppContext
Provides app-wide state without prop-drilling. Owns: `settings` (via `useSettings`), `favorites` / `toggleFavorite` (via `useFavorites`), and `chartVars` / `setChartVars` (two-variable chart selection). Use `useAppContext()` to access from any component.

### StationCard
Used in list view (`StationList`) and the HomeScreen favorites list. Shows station name, island, status dot, relative last-report time, and one variable reading (the currently selected `varId`). Fetches its own measurements via `useLatestMeasurements`.

### Persistence (localStorage)
Keys go through `regionStorageKey()` in `src/config/regions.ts`. **Hawaii keeps the original
un-suffixed keys** (`mesonet-settings`, `mesonet-favorites`) so existing hawaiimesonet.app installs
don't lose their saved stations — that app shipped before regions existed. Every other region gets
a `-<region id>` suffix (`mesonet-favorites-american_samoa`). In production each region is its own
origin so this is belt-and-braces, but in dev they share `localhost` — without the suffix, American
Samoa inherits Hawaii's saved map camera and opens on empty ocean.
- `useSettings` — darkMode, units, view/homeView, homeVarId, mapMode, map camera (mapLat/mapLng/mapZoom), favSort, listSortBy, listIslandFilter. Camera defaults come from `REGION.mapCenter`/`REGION.mapZoom`.
- `useFavorites` — Set of favorited station IDs

## Deploy Workflow

Production is **Cloudflare Pages**, auto-building on push to `main`. Pages env vars are per
*project*, and a project builds one artifact — so two domains on one project cannot build
differently. Each region gets its own Pages project pointing at this same repo and branch:

| Pages project | Branch | Env | Domain |
|---|---|---|---|
| `hawaii-mesonet` | `main` | `VITE_APP_DATA=hawaii` | hawaiimesonet.app |
| `americansamoa-mesonet` | `main` | `VITE_APP_DATA=american_samoa` | americansamoamesonet.app |

Every project also needs `VITE_MESONET_API_KEY` and `VITE_CARTO_API_KEY` (Production + Preview).
One push to `main` triggers one build per project.

CI (`.github/workflows/ci.yml`) runs a build matrix over every region, so a region config change
that breaks one build fails before it reaches `main`.

## Screens
Browse → tap → detail. Tapping a station on any map or list navigates to `/station/:id`.
- **HomeScreen** (`/`, "My Stations") — saved stations only. Map/list toggle with variable coloring; empty-state prompt when no favorites exist.
- **ExploreScreen** (`/explore`, "Station Network") — all stations, map/list toggle. List sortable A–Z / Distance / By Value (distance uses `haversineKm` exported from `StationMap.tsx`).
- **StationDetail** (`/station/:id`) — full-page station view; see Architecture Notes.

## Utility Modules
- `src/utils/mapColor.ts` — per-variable color scale interpolation (`stopsToHex`) and CSS gradient strings for the map legend. Defines color stops for temperature, wind speed, humidity, soil moisture, solar radiation, and rainfall.
- `src/utils/time.ts` — `relativeTime(ts)` (e.g. "5m ago") and `isStaleTimestamp(ts)` (>24h check).
- `src/utils/units.ts` — unit conversion, `formatValue`, `ALLOWED_VARIABLES`, `groupByCategory`, `mergeWindReadings`, `kmToMiles`.

## Multi-Region Configuration

**All region-specific values live in `src/config/regions.data.ts`.** Adding a region = one entry
there + one Cloudflare Pages project. Never hardcode a coordinate, a `location` slug, or an app
name anywhere else.

Two modules, and the split matters:

- **`src/config/regions.data.ts`** — the `RegionConfig` type, the `REGIONS` registry, `resolveRegion()`
  and `boundsContain()`. **Contains no `import.meta.env`**, because `vite.config.ts` imports it under
  Node where `import.meta.env` does not exist.
- **`src/config/regions.ts`** — browser only. Exports `REGION = resolveRegion(import.meta.env.VITE_APP_DATA)`.
  Application code imports `REGION` from here.

`resolveRegion()` **throws** on an unknown id. That is deliberate: a typo in a Pages env var must
fail the build, not quietly ship Hawaii data under another region's domain.

What `RegionConfig` covers — if you find one of these hardcoded, move it here:
`apiLocation`, `appName`/`shortName`/`description`, `regionLabel` (the fallback shown when a
station matches no sub-region box), `mapCenter`/`mapZoom`, `geoBounds` (Near Me validity) and
`geoOutsideMessage`, `mapMaxBounds` (Leaflet pan clamp — kept separate from `geoBounds` so the pan
limit can be looser), `subRegions`, `assetDir`, and `links` (Help → About).

### Sub-regions (island names)
The API has no `island` field, so island names are derived from lat/lng boxes in
`REGION.subRegions`. **Order matters — first box containing the point wins** (Hawaii: Oʻahu before
Molokaʻi/Lānaʻi, whose latitudes overlap. American Samoa: Aunuʻu before Tutuila, since Aunuʻu sits
inside Tutuila's box).

Each `SubRegion` carries two boxes so one table serves both consumers that used to keep their own:
- `bounds` — permissive, used by `islandFromCoordsIn()` in `src/api/stations.ts` to classify stations.
- `displayBounds` — trimmed to the landmass, used by `StationLocationMap` to frame the Location tab.
  Falls back to `bounds` when omitted.

`islandFromCoordsIn(subRegions, fallbackLabel, lat, lng)` is the pure form; `islandFromCoords()` is
the thin `REGION`-bound wrapper. Tests drive the pure form with an explicit region so they assert
the same thing regardless of which region the build targets.

### Build-time wiring
`vite.config.ts` reads `VITE_APP_DATA` via `loadEnv` (not `import.meta.env`) and uses the region to:
set the PWA manifest `name`/`short_name`/`description`; substitute `%VITE_APP_NAME%` and
`%VITE_APP_DESCRIPTION%` in `index.html`; and point Vite's `publicDir` at `public/<assetDir>/` so
each region ships its own icons. `public/README.md` documents the required files.

> Each region's icons are the shared droplet mark in that region's colour (Hawaii blue,
> American Samoa red). Save them as **opaque RGB, not RGBA** — iOS renders a transparent
> `apple-touch-icon.png` against black.

### Dev scripts
`npm run dev` / `npm run build` target Hawaii; `npm run dev:as` / `npm run build:as` /
`npm run preview:as` target American Samoa. Set `VITE_APP_DATA` in the shell for any other region.

### Copy that is intentionally region-neutral
`src/data/glossary.ts` reference points say "tropical" / "Pacific trade winds" rather than naming a
region. This is a deliberate call — it reads correctly for every region and avoids a per-region
copy system for ~10 strings. Keep new glossary copy region-neutral.

## Known Constraints / Decisions
- API key is baked into the Vite bundle at build time (acceptable for now, read-only public data API). Plan to proxy through server-side to hide key in the future.
- Map markers are jittered ±0.0003° (deterministic per `station_id`) and the Info tab shows coordinates at 2dp, to obscure exact installation locations. Real coordinates are used everywhere else (distance, fly-to).
- Variable sort in list view was removed pending stakeholder input on which variables matter most.
- **The rainfall colour scale needs a stakeholder decision — Tier 3.** `RAIN_STOPS` in `src/utils/mapColor.ts` tops out at 5 mm and is shared by every region. It is applied to the **24hr total** on the map, though the comment describes a 5-min bucket. Measured over 30 days of live data (per-station daily totals):

  | | median | p75 | p90 | p95 | p99 | max |
  |---|---|---|---|---|---|---|
  | Hawaii (2390 station-days) | 0.8 | 5.1 | 17.4 | 30.2 | 80.5 | 241.1 mm |
  | American Samoa (248 station-days) | 0.0 | 4.1 | 17.0 | 34.0 | 77.7 | 106.9 mm |

  The two regions are statistically near-identical, so this is **not** a per-region problem. A 5 mm ceiling clamps ~25% of station-days in both, meaning the map renders one flat colour on any wet day; 40 mm would clamp ~3–4%, 60 mm ~1.5–2.5%. Separately, with a median near 0 and p90 at ~17 mm, a 3-stop linear ramp puts most stations in the bottom sliver — more low-end stops would read better than any single ceiling.

  Open questions for stakeholders: fixed scale or dynamic-to-current-data? (Fixed keeps colours comparable between visits; dynamic always spreads but makes a dry day look alarming.) What ceiling? How many stops? **Do not change this as a side effect of other work** — it alters the appearance of a shipped product.
- Star markers on map for favorites were tried and removed (hard to read) — circles only for now.
- **Guam is planned for next year**, not now. `location=guam` returns `[]` from the API today. When it lands, confirm the `location` slug against the API before adding a `REGIONS` entry — the slugs are not guessable (`american-samoa` and `samoa` both return `[]`).
- The glossary and Help copy are shared across regions and written region-neutrally on purpose. If a region ever needs genuinely different copy, add it to `RegionConfig.links` rather than branching in components.
- Vite 7.3.1 has 3 dev-server CVEs (path traversal, fs.deny bypass, arbitrary file read). These are **dev server only** and cannot be exploited in the Cloudflare Pages production deployment (static output; no dev server runs there). They will be resolved when vite-plugin-pwa releases a version supporting Vite 8 that is ≥30 days old.
