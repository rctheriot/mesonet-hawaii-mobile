# Hawaii Mesonet Mobile App — Claude Context

## Claude Model Guidance
- **Claude Sonnet** — default for all tasks: feature work, bug fixes, refactoring, code review
- **Claude Opus** — use for complex architectural decisions or when Sonnet is struggling with a multi-file problem

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
  - `GET /mesonet/db/stationMonitor?location=hawaii` — returns `{ coverage, data: { station_id: { 24hr_min, 24hr_max, 24hr_avg_diff } } }`. Presence of a station_id in `data` means it reported in the last 24h.
  - `GET /mesonet/db/measurements?station_ids=&limit=50&join_metadata=true&local_tz=true&location=hawaii` — latest readings
  - `GET /mesonet/db/variables?location=hawaii&limit=1000` — variable metadata (standard_name, display_name, units)
- **Field names:** stations use `lat`/`lng` (not latitude/longitude). Measurements use `variable` (not `var_id`), `variable_display_name`, `value` (may be string, cast with `Number()`).
- **Variable name mismatch:** Monitor data keys (e.g. `RH_Avg`) may differ from variables API `standard_name` (e.g. `RH_1_Avg`). A normalization pass strips sensor numbers (`_1_`, `_2_`) as fallback when building display name maps.

## Status System
Defined in `src/theme.ts`. Three statuses only: `active` | `inactive` | `planned` (plus `unknown` as fallback).
- **Active** = green (`#22c55e`) — station has `status: 'active'` AND appears in monitor data
- **Inactive** = red (`#ef4444`) — `status: 'inactive'` OR active station not in monitor data
- **Planned** = yellow (`#eab308`) — `status: 'planned'`
- `stationStatusKey(station, monitorData)` is the single source of truth for derived status everywhere.
- **Stale data** (last report >24h ago) is shown only as an amber tag in the StationPanel header — not reflected in map colors or list status.

## Architecture Notes

### App.tsx
Central state hub. Owns: selected station, view (map/list), dark mode, flyTo/panTo coords, panel height. Uses `useSettings` hook to persist all of these to localStorage.

### Map (StationMap.tsx)
- Map is **always mounted**, hidden via `className="hidden"` in list view to preserve camera state.
- Markers are `L.Marker` instances with custom `DivIcon`s managed in `markersRef`. `markerMetaRef` stores `{ color, hollow }` per station — must stay in sync with visual state or highlight effect will use stale colors.
- `onSelectStation` is stored in a ref (`onSelectStationRef`) so it's not a dependency of the markers effect — prevents markers from resetting on every render.
- Selected station uses `selectedPinIcon` from `mapIcons.ts` (sky blue pin).
- Leaflet requires `map.invalidateSize()` after a hidden→visible transition — called in a `useEffect` watching `isVisible`, and also debounced when panel height changes.
- Variable coloring mode: when a map variable is selected, markers show colored pill labels via `stationDivIcon()`. Stations with no data get a gray dot. `MapLegend.tsx` renders the color scale below the map controls.
- Map modes defined as `MapMode` type in `StationMap.tsx`: `status` | variable standard_names (e.g. `Tair_1_Avg`, `WS_1_Avg`).

### StationPanel
- Drag-to-resize using pointer capture events. Height stored as ratio in `useSettings` so it restores correctly across different screen sizes.
- `onHeightChange` fires in real-time during drag so map/list containers shrink to avoid overlap.
- `isMountedRef` — the style-swap effect skips on first mount to prevent wiping markers before they're added.
- Readings rendered via `ReadingsGrid` — a shared component that groups measurements by category, merges wind speed/direction, and handles the 24hr rainfall card.
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
- `useSettings` — darkMode, view, lastStationId, panelHeightRatio
- `useFavorites` — Set of favorited station IDs

## Deploy Workflow
```bash
npm run build
rsync -avz --delete dist/ exouser@<domain>:/home/exouser/mesonet/
```
Served via nginx on a Jetstream2 VM with Let's Encrypt SSL. nginx config at `/etc/nginx/sites-available/mesonet`. Files at `/home/exouser/mesonet/` (requires `chmod o+x /home/exouser`).

## Screens
- **HomeScreen** — favorites map view. Shows a Leaflet map filtered to favorited stations with variable coloring, plus a scrollable favorites list below. Falls back to an empty-state prompt when no favorites exist.
- **ExploreScreen** — full station list + map. Stations sortable by distance (uses `haversineKm` exported from `StationMap.tsx`). Selecting a station opens the `StationPanel`.
- **StationDetail** — full-page station view (used on larger screens or direct navigation). Same panel content as `StationPanel`.

## Utility Modules
- `src/utils/mapColor.ts` — per-variable color scale interpolation (`stopsToHex`) and CSS gradient strings for the map legend. Defines color stops for temperature, wind speed, humidity, soil moisture, solar radiation, and rainfall.
- `src/utils/time.ts` — `relativeTime(ts)` (e.g. "5m ago") and `isStaleTimestamp(ts)` (>24h check).
- `src/utils/units.ts` — unit conversion, `formatValue`, `ALLOWED_VARIABLES`, `groupByCategory`, `mergeWindReadings`.

## Island Name Derivation
The API has no `island` field. Island names are derived from lat/lng bounding boxes in `src/api/stations.ts → islandFromCoords()`.

## Known Constraints / Decisions
- API key is baked into the Vite bundle at build time (acceptable for now, read-only public data API). Plan to proxy through server-side to hide key in the future.
- Monitor data only contains variables reported in the last 24h — soil temp, sky temp, rainfall etc. won't appear in dropdowns until active stations report them.
- Variable sort in list view was removed pending stakeholder input on which variables matter most.
- Star markers on map for favorites were tried and removed (hard to read) — circles only for now.
- Vite 7.3.1 has 3 dev-server CVEs (path traversal, fs.deny bypass, arbitrary file read). These are **dev server only** and cannot be exploited in the nginx production deployment. They will be resolved when vite-plugin-pwa releases a version supporting Vite 8 that is ≥30 days old.
