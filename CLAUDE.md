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
A mobile-first PWA for browsing real-time Hawaii weather station data from the HCDP (Hawaii Climate Data Portal) Mesonet network. Built as a prototype for stakeholder review.

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
- **Auth:** `Bearer` token in `Authorization` header, key in `.env.local` as `VITE_MESONET_API_KEY`
- **HTTP client:** Native `fetch` via `apiGet<T>(path, params?)` in `src/api/client.ts`. Returns `{ data: T }`. Never use axios.
- **Key endpoints:**
  - `GET /mesonet/db/stations?location=hawaii&limit=1000` — all stations
  - `GET /mesonet/db/measurements?station_ids=&limit=50&join_metadata=true&local_tz=true&location=hawaii` — latest readings
  - `GET /mesonet/db/variables?location=hawaii&limit=1000` — variable metadata (standard_name, display_name, units). Not currently fetched by the app.
  - The `stationMonitor` endpoint was previously used to derive status but is no longer called — status now comes straight from the `stations` payload (see Status System).
- **Field names:** stations use `lat`/`lng` (not latitude/longitude). Measurements use `variable` (not `var_id`), `variable_display_name`, `value` (may be string, cast with `Number()`).
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
- `useSettings` — darkMode, units, view/homeView, homeVarId, mapMode, map camera (mapLat/mapLng/mapZoom), favSort, listSortBy, listIslandFilter
- `useFavorites` — Set of favorited station IDs

## Deploy Workflow
```bash
npm run build
rsync -avz --delete dist/ exouser@<domain>:/home/exouser/mesonet/
```
Served via nginx on a Jetstream2 VM with Let's Encrypt SSL. nginx config at `/etc/nginx/sites-available/mesonet`. Files at `/home/exouser/mesonet/` (requires `chmod o+x /home/exouser`).

## Screens
Browse → tap → detail. Tapping a station on any map or list navigates to `/station/:id`.
- **HomeScreen** (`/`, "My Stations") — saved stations only. Map/list toggle with variable coloring; empty-state prompt when no favorites exist.
- **ExploreScreen** (`/explore`, "Station Network") — all stations, map/list toggle. List sortable A–Z / Distance / By Value (distance uses `haversineKm` exported from `StationMap.tsx`).
- **StationDetail** (`/station/:id`) — full-page station view; see Architecture Notes.

## Utility Modules
- `src/utils/mapColor.ts` — per-variable color scale interpolation (`stopsToHex`) and CSS gradient strings for the map legend. Defines color stops for temperature, wind speed, humidity, soil moisture, solar radiation, and rainfall.
- `src/utils/time.ts` — `relativeTime(ts)` (e.g. "5m ago") and `isStaleTimestamp(ts)` (>24h check).
- `src/utils/units.ts` — unit conversion, `formatValue`, `ALLOWED_VARIABLES`, `groupByCategory`, `mergeWindReadings`, `kmToMiles`.

## Island Name Derivation
The API has no `island` field. Island names are derived from lat/lng bounding boxes in `src/api/stations.ts → islandFromCoords()`.

## Known Constraints / Decisions
- API key is baked into the Vite bundle at build time (acceptable for now, read-only public data API). Plan to proxy through server-side to hide key in the future.
- Map markers are jittered ±0.0003° (deterministic per `station_id`) and the Info tab shows coordinates at 2dp, to obscure exact installation locations. Real coordinates are used everywhere else (distance, fly-to).
- Variable sort in list view was removed pending stakeholder input on which variables matter most.
- Star markers on map for favorites were tried and removed (hard to read) — circles only for now.
- Vite 7.3.1 has 3 dev-server CVEs (path traversal, fs.deny bypass, arbitrary file read). These are **dev server only** and cannot be exploited in the nginx production deployment. They will be resolved when vite-plugin-pwa releases a version supporting Vite 8 that is ≥30 days old.
