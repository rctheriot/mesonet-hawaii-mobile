import { useState, useMemo } from 'react';
import type { Station, StationMonitor } from '../../types/api';
import { stationStatusKey, STATUS_DOT, STATUS_TEXT, STATUS_LABEL } from '../../theme';
import { haversineKm } from '../Map/StationMap';

type UnitSystem = 'metric' | 'imperial';

const VAR_UNITS: Record<string, { metric: string; imperial: string }> = {
  Tair_1_Avg:   { metric: '°C',   imperial: '°F'   },
  Tsoil_1_Avg:  { metric: '°C',   imperial: '°F'   },
  RH_1_Avg:     { metric: '%',    imperial: '%'    },
  SWin_1_Avg:   { metric: 'W/m²', imperial: 'W/m²' },
  RF_1_Tot300s: { metric: 'mm',   imperial: 'in'   },
  SM_1_Avg:     { metric: '%',    imperial: '%'    },
  WS_1_Avg:     { metric: 'm/s',  imperial: 'mph'  },
};

interface StationListProps {
  stations: Station[];
  monitorData: Record<string, StationMonitor>;
  onSelectStation: (stationId: string) => void;
  favorites: Set<string>;
  // Location props for Near Me sort
  coords: { latitude: number; longitude: number } | null;
  requestLocation: () => void;
  geoLoading: boolean;
  geoError: string | null;
  mapMode?: string;
  varLabels?: Map<string, string>;
  units?: UnitSystem;
  // Controlled sort/filter — when provided, persists across navigation.
  sortBy?: SortBy;
  onSortByChange?: (v: SortBy) => void;
  islandFilter?: string;
  onIslandFilterChange?: (v: string) => void;
}

type SortBy = 'alpha' | 'nearme' | 'value';

export default function StationList({ stations, monitorData, onSelectStation, favorites, coords, requestLocation, geoLoading, geoError, mapMode, varLabels, units = 'metric', sortBy: sortByProp, onSortByChange, islandFilter: islandFilterProp, onIslandFilterChange }: StationListProps) {
  const [islandFilterLocal, setIslandFilterLocal] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortByLocal, setSortByLocal] = useState<SortBy>('alpha');

  const sortBy = sortByProp ?? sortByLocal;
  const islandFilter = islandFilterProp ?? islandFilterLocal;
  function setSortBy(v: SortBy) { onSortByChange ? onSortByChange(v) : setSortByLocal(v); }
  function setIslandFilter(v: string) { onIslandFilterChange ? onIslandFilterChange(v) : setIslandFilterLocal(v); }

  const islands = useMemo(() => {
    const names = new Set<string>();
    stations.forEach(s => { if (s.island) names.add(s.island); });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [stations]);

  const filtered = useMemo(() => {
    return stations.filter(s => {
      if (favoritesOnly && !favorites.has(s.station_id)) return false;
      if (islandFilter !== 'all' && (s.island ?? 'Hawaii') !== islandFilter) return false;
      return true;
    });
  }, [stations, islandFilter, favoritesOnly, favorites]);

  const sorted = useMemo(() => {
    if (sortBy === 'nearme' && coords) {
      return [...filtered].sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        return haversineKm(coords.latitude, coords.longitude, a.lat, a.lng)
             - haversineKm(coords.latitude, coords.longitude, b.lat, b.lng);
      });
    }
    if (sortBy === 'alpha') {
      return [...filtered].sort((a, b) =>
        (a.full_name ?? a.name ?? '').localeCompare(b.full_name ?? b.name ?? '')
      );
    }
    if (sortBy === 'value' && varLabels) {
      return [...filtered].sort((a, b) => {
        const av = parseFloat(varLabels.get(a.station_id) ?? '');
        const bv = parseFloat(varLabels.get(b.station_id) ?? '');
        if (isNaN(av) && isNaN(bv)) return 0;
        if (isNaN(av)) return 1;
        if (isNaN(bv)) return -1;
        return bv - av;
      });
    }
    // Default: active first, then alphabetical
    return [...filtered].sort((a, b) => {
      const order: Record<string, number> = { active: 0, inactive: 1, planned: 2, unknown: 3 };
      const aOrd = order[stationStatusKey(a, monitorData)] ?? 3;
      const bOrd = order[stationStatusKey(b, monitorData)] ?? 3;
      return aOrd !== bOrd ? aOrd - bOrd : (a.full_name ?? a.name ?? '').localeCompare(b.full_name ?? b.name ?? '');
    });
  }, [filtered, monitorData, sortBy, coords, varLabels]);

  return (
    <div className="absolute inset-0 flex flex-col bg-white dark:bg-zinc-950">

      {/* Filter bar — single row: Saved · Island · Sort */}
      <div className="flex-shrink-0 border-b border-slate-100 dark:border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Saved filter */}
          <button
            onClick={() => setFavoritesOnly(f => !f)}
            className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
              favoritesOnly
                ? 'bg-sky-500 border-sky-500 text-white'
                : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill={favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={favoritesOnly ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Saved
          </button>

          {/* Island filter — capped width so it never stretches on desktop */}
          <select
            value={islandFilter}
            onChange={e => setIslandFilter(e.target.value)}
            className="flex-shrink-0 max-w-[130px] text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Islands</option>
            {islands.map(island => (
              <option key={island} value={island}>{island}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => {
              const val = e.target.value as SortBy;
              if (val === 'nearme' && !coords) requestLocation();
              setSortBy(val);
            }}
            className="flex-shrink-0 text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="alpha">A–Z</option>
            <option value="nearme">{geoLoading ? 'Locating…' : 'Distance'}</option>
            <option value="value">By Value</option>
          </select>
        </div>
        {geoError && sortBy === 'nearme' && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">{geoError}</p>
        )}
      </div>

      {/* Station rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
        {sorted.length === 0 && (
          <p className="text-center text-base text-slate-400 dark:text-zinc-500 py-8">No stations match this filter.</p>
        )}
        {sorted.map(station => {
          const key = stationStatusKey(station, monitorData);
          const isSaved = favorites.has(station.station_id);
          const distKm = coords && station.lat && station.lng
            ? haversineKm(coords.latitude, coords.longitude, station.lat, station.lng)
            : null;
          const distLabel = distKm != null
            ? units === 'imperial'
              ? `${(distKm / 1.60934).toFixed(1)} mi`
              : `${distKm.toFixed(1)} km`
            : null;
          return (
            <button
              key={station.station_id}
              onClick={() => onSelectStation(station.station_id)}
              className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_DOT[key]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isSaved && (
                    <svg className="flex-shrink-0 text-sky-500 dark:text-sky-400" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  )}
                  <span className="text-base font-medium text-slate-900 dark:text-zinc-100 truncate">
                    {station.full_name ?? station.name ?? station.station_id}
                  </span>
                </div>
                <div className="text-sm text-slate-400 dark:text-zinc-500">
                  {station.island ?? 'Hawaii'}
                  {distLabel && <> · {distLabel}</>}
                </div>
              </div>
              <div className="flex-shrink-0">
                {mapMode && mapMode !== 'status' && varLabels ? (
                  <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                    {varLabels.get(station.station_id)
                      ? `${varLabels.get(station.station_id)} ${VAR_UNITS[mapMode]?.[units] ?? ''}`
                      : '—'}
                  </span>
                ) : (
                  <span className={`text-sm font-medium ${STATUS_TEXT[key]}`}>
                    {STATUS_LABEL[key]}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
