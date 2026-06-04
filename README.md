# Hawaii Mesonet Mobile App

A mobile-first PWA for browsing real-time Hawaii weather station data from the [HCDP](https://www.hawaii.edu/climate-data-portal/) (Hawaii Climate Data Portal) Mesonet network. Built as a prototype for stakeholder review.

## Setup

**Prerequisites:** Node.js via NVM (project uses NVM default LTS)

```bash
nvm use default
npm install
```

Copy the env file and add your API key:
```bash
cp .env.example .env.local
# Edit .env.local and set VITE_MESONET_API_KEY=<your key>
```

## Development

```bash
npm run dev
```

Runs at `http://localhost:5173`.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.3.1 | Build tool |
| Tailwind CSS v4 | 4.2.1 | Styling |
| Leaflet | 1.9.4 | Map rendering |
| TanStack React Query | 5.90.21 | Data fetching & caching |
| Recharts | 3.8.0 | Historical data charts |
| react-router-dom | 7.13.1 | Client-side routing |
| vite-plugin-pwa | 1.2.0 | Service worker & PWA manifest |

All packages are pinned to exact versions. See [dependency policy](#dependency-policy) below.

## Project Structure

```
src/
├── api/           # API client (native fetch) + per-resource fetch functions
├── components/    # Reusable UI components (Map, StationPanel, StationList, etc.)
├── context/       # AppContext — dark mode, settings, favorites
├── hooks/         # useStations, useMeasurements, useSettings, useFavorites, useGeolocation
├── screens/       # Top-level route components (HomeScreen, ExploreScreen, StationDetail)
├── types/         # Shared TypeScript types
├── theme.ts       # Status system (active/inactive/planned) and color constants
└── utils/         # Unit conversion helpers
```

## API

- **Base URL:** `https://api.hcdp.ikewai.org`
- **Auth:** Bearer token via `VITE_MESONET_API_KEY` in `.env.local`
- All requests go through `src/api/client.ts → apiGet<T>()` which uses native `fetch`

## Dependency Policy

This project enforces strict supply chain security rules:

- All packages pinned to **exact versions** — no `^` or `~`
- New packages must be **at least 30 days old** at time of install
- Any new `npm install` requires explicit approval before running
- **Axios is permanently banned** — use native `fetch` via `apiGet()` in `src/api/client.ts`
