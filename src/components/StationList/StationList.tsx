import { useState, useMemo } from 'react';
import type { Station, StationMonitor } from '../../types/api';
import { stationStatusKey, STATUS_DOT, STATUS_TEXT, STATUS_LABEL } from '../../theme';
import type { StatusKey } from '../../theme';
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
  // Variable coloring mode — when set and not 'status', show value instead of status label
  mapMode?: string;
  varLabels?: Map<string, string>;
  units?: UnitSystem;
}

type FilterStatus = 'all' | StatusKey;
type SortBy = 'default' | 'nearme';

const STATUS_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Active',   value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Planned',  value: 'planned' },
];

export default function StationList({ stations, monitorData, onSelectStation, favorites, coords, requestLocation, geoLoading, geoError, mapMode, varLabels, units = 'metric' }: StationListProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [islandFilter, setIslandFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('default');

  // Derive sorted unique island list from stations
  const islands = useMemo(() => {
    const names = new Set<string>();
    stations.forEach(s => { if (s.island) names.add(s.island); });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [stations]);

  const filtered = useMemo(() => {
    return stations.filter(s => {
      if (favoritesOnly && !favorites.has(s.station_id)) return false;
      if (statusFilter !== 'all' && stationStatusKey(s, monitorData) !== statusFilter) return false;
      if (islandFilter !== 'all' && (s.island ?? 'Hawaii') !== islandFilter) return false;
      return true;
    });
  }, [stations, statusFilter, islandFilter, favoritesOnly, favorites, monitorData]);

  const sorted = useMemo(() => {
    if (sortBy === 'nearme' && coords) {
      // Sort by distance from user; stations without coords go to the end
      return [...filtered].sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        return haversineKm(coords.latitude, coords.longitude, a.lat, a.lng)
             - haversineKm(coords.latitude, coords.longitude, b.lat, b.lng);
      });
    }
    // Default: sort by status then name
    return [...filtered].sort((a, b) => {
      const order: Record<string, number> = { active: 0, inactive: 1, planned: 2, unknown: 3 };
      const aOrd = order[stationStatusKey(a, monitorData)] ?? 3;
      const bOrd = order[stationStatusKey(b, monitorData)] ?? 3;
      return aOrd !== bOrd ? aOrd - bOrd : (a.full_name ?? a.name ?? '').localeCompare(b.full_name ?? b.name ?? '');
    });
  }, [filtered, monitorData, sortBy, coords]);

  return (
    <div className="absolute inset-0 flex flex-col bg-white dark:bg-zinc-950">

      {/* Filter + sort bar — two compact rows */}
      <div className="flex-shrink-0 border-b border-slate-100 dark:border-zinc-800 px-3 pt-2 pb-2 space-y-2">

        {/* Row 1: Status + favorites filter chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setFavoritesOnly(f => !f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              favoritesOnly
                ? 'bg-green-500 text-white'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            Saved
          </button>
        </div>

        {/* Row 2: Sort toggle + island dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 dark:text-zinc-500 flex-shrink-0">Sort:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSortBy('default')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sortBy === 'default'
                  ? 'bg-slate-700 dark:bg-zinc-300 text-white dark:text-zinc-900'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              Default
            </button>
            {/* Near Me sort — requests location lazily on first tap */}
            <button
              onClick={() => {
                if (sortBy === 'nearme') {
                  setSortBy('default');
                } else {
                  setSortBy('nearme');
                  if (!coords) requestLocation();
                }
              }}
              disabled={geoLoading}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
                sortBy === 'nearme'
                  ? 'bg-slate-700 dark:bg-zinc-300 text-white dark:text-zinc-900'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {geoLoading ? 'Locating…' : '⊙ Near Me'}
            </button>
          </div>
          <select
            value={islandFilter}
            onChange={e => setIslandFilter(e.target.value)}
            className="ml-auto flex-shrink-0 text-sm bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Islands</option>
            {islands.map(island => (
              <option key={island} value={island}>{island}</option>
            ))}
          </select>
          {geoError && sortBy === 'nearme' && (
            <p className="text-sm text-red-500 dark:text-red-400 truncate">{geoError}</p>
          )}
        </div>
      </div>

      {/* Station rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
        {sorted.length === 0 && (
          <p className="text-center text-base text-slate-400 dark:text-zinc-500 py-8">No stations match this filter.</p>
        )}
        {sorted.map(station => {
          const key = stationStatusKey(station, monitorData);
          const distance = sortBy === 'nearme' && coords && station.lat && station.lng
            ? haversineKm(coords.latitude, coords.longitude, station.lat, station.lng)
            : null;
          return (
            <button
              key={station.station_id}
              onClick={() => onSelectStation(station.station_id)}
              className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_DOT[key]}`} />
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-slate-900 dark:text-zinc-100 truncate">
                  {station.full_name ?? station.name ?? station.station_id}
                </div>
                <div className="text-sm text-slate-400 dark:text-zinc-500">
                  {station.island ?? 'Hawaii'}
                  {favorites.has(station.station_id) && (
                    <span className="text-green-600 dark:text-green-400 font-medium"> · Saved</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {distance != null ? (
                  <span className="text-sm text-slate-500 dark:text-zinc-400">
                    {distance.toFixed(1)} km
                  </span>
                ) : mapMode && mapMode !== 'status' && varLabels ? (
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
