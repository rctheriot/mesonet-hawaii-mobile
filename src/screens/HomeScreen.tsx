import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';
import StationCard from '../components/StationCard';
import StationMap from '../components/Map/StationMap';
import StationPanel from '../components/StationPanel/StationPanel';
import MapLegend, { type MapMode } from '../components/Map/MapLegend';
import { convertValue } from '../utils/units';
import { tempToHex, windToHex, rhToHex, rainToHex, smToHex, swToHex } from '../utils/mapColor';
import { useStations, useStationMonitor } from '../hooks/useStations';
import { useMapRainfall24hr } from '../hooks/useMeasurements';
import { useGeolocation } from '../hooks/useGeolocation';
import { fetchLatestMeasurements, fetchHistoricalMeasurements } from '../api/measurements';
import type { Station } from '../types/api';

const HOME_VAR_OPTIONS = [
  { id: 'Tair_1_Avg',   label: 'Air Temp'        },
  { id: 'RH_1_Avg',     label: 'Humidity'        },
  { id: 'SWin_1_Avg',   label: 'Radiation'       },
  { id: 'RF_1_Tot300s', label: 'Rainfall (24hr)' },
  { id: 'SM_1_Avg',     label: 'Soil Moisture'   },
  { id: 'Tsoil_1_Avg',  label: 'Soil Temp'       },
  { id: 'WS_1_Avg',     label: 'Wind'            },
] as const;

const KNOWN_MAP_MODES = new Set<string>(HOME_VAR_OPTIONS.map(o => o.id));

export default function HomeScreen() {
  const navigate = useNavigate();
  const { settings, updateSettings, favorites, toggleFavorite, openInstallPrompt } = useAppContext();
  const { homeVarId, homeView, darkMode, panelHeightRatio } = settings;

  const { data: stations = [] } = useStations();
  const { data: monitorData = {} } = useStationMonitor();
  const { coords, loading: geoLoading, requestLocation } = useGeolocation();
  // Bulk rainfall fetch for the list-view station cards
  const { data: rainfallMap } = useMapRainfall24hr(homeVarId === 'RF_1_Tot300s');

  const myStations = useMemo(() => {
    return Array.from(favorites)
      .map(id => stations.find(s => s.station_id === id))
      .filter((s): s is Station => s != null);
  }, [favorites, stations]);

  // Per-station latest measurements for map colors — reuses the same React Query cache
  // as StationCard's useLatestMeasurements, so no extra network requests when list was shown first.
  // This avoids the bulk API's incomplete station index (some stations are missing from bulk fetches).
  const latestQueries = useQueries({
    queries: homeVarId && homeVarId !== 'RF_1_Tot300s'
      ? myStations.map(s => ({
          queryKey: ['measurements', 'latest', s.station_id] as const,
          queryFn: () => fetchLatestMeasurements(s.station_id),
          staleTime: 1000 * 60 * 2,
          refetchInterval: 1000 * 60 * 5,
        }))
      : [],
  });

  // Per-station 24hr rainfall for map colors — reuses same cache as StationCard's useRainfall24hr.
  const rainfallQueries = useQueries({
    queries: homeVarId === 'RF_1_Tot300s'
      ? myStations.map(s => ({
          queryKey: ['measurements', 'rainfall24hr', s.station_id] as const,
          queryFn: async () => {
            const data = await fetchHistoricalMeasurements(s.station_id, 'RF_1_Tot300s', '24h');
            const valid = data.filter(m => m.value != null);
            return {
              total: valid.reduce((sum, m) => sum + Number(m.value), 0),
              units: valid[0]?.units ?? 'mm',
            };
          },
          staleTime: 1000 * 60 * 5,
        }))
      : [],
  });

  const varColors = useMemo(() => {
    if (!homeVarId) return undefined;
    const map = new Map<string, string>();
    if (homeVarId === 'RF_1_Tot300s') {
      myStations.forEach((s, i) => {
        const result = rainfallQueries[i]?.data;
        if (result) map.set(s.station_id, rainToHex(result.total));
      });
    } else {
      myStations.forEach((s, i) => {
        const rows = latestQueries[i]?.data;
        const m = rows?.find(r => r.variable === homeVarId);
        if (!m || m.value == null) return;
        const value = Number(m.value);
        if (isNaN(value)) return;
        let color: string;
        if      (homeVarId === 'Tair_1_Avg')  color = tempToHex(value);
        else if (homeVarId === 'Tsoil_1_Avg') color = tempToHex(value);
        else if (homeVarId === 'WS_1_Avg')    color = windToHex(value);
        else if (homeVarId === 'RH_1_Avg')    color = rhToHex(value);
        else if (homeVarId === 'SM_1_Avg')    color = smToHex(value);
        else if (homeVarId === 'SWin_1_Avg')  color = swToHex(value);
        else                                  color = rainToHex(value);
        map.set(s.station_id, color);
      });
    }
    return map;
  }, [latestQueries, rainfallQueries, homeVarId, myStations]);

  const varArrows = useMemo(() => {
    if (homeVarId !== 'WS_1_Avg') return undefined;
    const map = new Map<string, number>();
    myStations.forEach((s, i) => {
      const rows = latestQueries[i]?.data;
      const m = rows?.find(r => r.variable === 'WDrs_1_Avg');
      if (m?.value != null) map.set(s.station_id, Number(m.value));
    });
    return map;
  }, [latestQueries, homeVarId, myStations]);

  const varLabels = useMemo(() => {
    if (!homeVarId) return undefined;
    const map = new Map<string, string>();
    if (homeVarId === 'RF_1_Tot300s') {
      myStations.forEach((s, i) => {
        const result = rainfallQueries[i]?.data;
        if (!result) return;
        const { value: converted } = convertValue(result.total, result.units, settings.units, homeVarId);
        map.set(s.station_id, converted.toFixed(settings.units === 'imperial' ? 2 : 1));
      });
    } else {
      myStations.forEach((s, i) => {
        const rows = latestQueries[i]?.data;
        const m = rows?.find(r => r.variable === homeVarId);
        if (!m || m.value == null) return;
        const { value: converted } = convertValue(Number(m.value), m.units ?? '', settings.units, homeVarId);
        map.set(s.station_id, String(Math.round(converted)));
      });
    }
    return map;
  }, [latestQueries, rainfallQueries, homeVarId, myStations, settings.units]);

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [flyTo, setFlyTo]   = useState<{ lat: number; lng: number; zoom?: number } | undefined>();
  const [panTo, setPanTo]   = useState<{ lat: number; lng: number } | undefined>();

  useEffect(() => {
    if (coords) setFlyTo({ lat: coords.latitude, lng: coords.longitude, zoom: 11 });
  }, [coords]);

  function handleCenterOnUser() {
    if (coords) {
      setFlyTo({ lat: coords.latitude, lng: coords.longitude, zoom: 12 });
    } else {
      requestLocation();
    }
  }
  const [panelHeight, setPanelHeight] = useState(() => Math.round(window.innerHeight * panelHeightRatio));
  const [helpOpen, setHelpOpen]       = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedStation: Station | null = myStations.find(s => s.station_id === selectedStationId) ?? null;

  const handleHeightChange = useCallback((h: number) => {
    setPanelHeight(h);
    if (h > 0) updateSettings({ panelHeightRatio: h / window.innerHeight });
  }, [updateSettings]);

  function handleSelectStation(id: string) {
    setSelectedStationId(id);
    const station = myStations.find(s => s.station_id === id);
    if (station) setPanTo({ lat: station.lat, lng: station.lng });
  }

  // Re-pan when switching back to map view with a selected station
  useEffect(() => {
    if (homeView === 'map' && selectedStation) {
      setPanTo({ lat: selectedStation.lat, lng: selectedStation.lng });
    }
  }, [homeView]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = myStations.length === 0;

  return (
    <div className="relative w-full h-full bg-white dark:bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 relative flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-slate-200 dark:border-zinc-800 z-20">
        <button
          onClick={() => navigate('/explore')}
          className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
        >
          Explore
        </button>

        {/* Map/List toggle — absolutely centered, only shown when favorites exist */}
        {!isEmpty && (
          <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            {(['map', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => updateSettings({ homeView: v })}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${homeView === v
                  ? 'bg-white dark:bg-zinc-600 text-slate-800 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
            aria-label="Help"
          >
            ?
          </button>
        </div>
      </div>

      {/* Variable selector — only shown when there are stations */}
      {!isEmpty && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-zinc-400 flex-shrink-0">Showing:</span>
          <select
            value={homeVarId ?? HOME_VAR_OPTIONS[0].id}
            onChange={e => updateSettings({ homeVarId: e.target.value })}
            className="flex-1 text-sm bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {HOME_VAR_OPTIONS.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
            <div className="space-y-2">
              <p className="text-slate-500 dark:text-zinc-400 text-base leading-relaxed">
                You haven't added any stations yet.
              </p>
              <p className="text-slate-400 dark:text-zinc-500 text-base leading-relaxed">
                Tap <strong className="text-slate-600 dark:text-zinc-300">Explore</strong> to browse the map or station list, then tap <strong className="text-slate-600 dark:text-zinc-300">Save</strong> on any station to add it here.
              </p>
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="px-8 py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-base transition-colors shadow-lg shadow-sky-500/25"
            >
              Explore Stations
            </button>
          </div>
        ) : (
          <>
            {/* Map — always mounted, hidden in list view to preserve camera state */}
            <div
              className={homeView === 'map' ? 'absolute inset-0' : 'hidden'}
              style={{ bottom: panelHeight }}
            >
              <StationMap
                stations={myStations}
                monitorData={monitorData}
                selectedStationId={selectedStationId}
                onSelectStation={handleSelectStation}
                flyToCoords={flyTo}
                panToCoords={panTo}
                userLocation={coords}
                darkMode={darkMode}
                onCenterOnUser={handleCenterOnUser}
                geoLoading={geoLoading}
                isVisible={homeView === 'map'}
                panelHeight={panelHeight}
                varColors={varColors}
                varLabels={varLabels}
                varArrows={varArrows}
              />
              {homeVarId && KNOWN_MAP_MODES.has(homeVarId) && (
                <MapLegend mode={homeVarId as MapMode} units={settings.units} />
              )}
            </div>

            {/* List */}
            {homeView === 'list' && (
              <div className="absolute inset-0 overflow-y-auto">
                <div className="flex flex-col gap-3 p-4">
                  <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide px-1">Saved Stations</p>
                  {myStations.map(station => (
                    <StationCard
                      key={station.station_id}
                      station={station}
                      monitorData={monitorData}
                      varId={homeVarId}
                      rainfallMap={rainfallMap}
                      onClick={() => navigate(`/station/${station.station_id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Station panel — shown when a station is tapped on the map */}
            <StationPanel
              station={selectedStation}
              monitorData={monitorData}
              onClose={() => setSelectedStationId(null)}
              onHeightChange={handleHeightChange}
              isFavorite={selectedStation ? favorites.has(selectedStation.station_id) : false}
              onToggleFavorite={toggleFavorite}
            />
          </>
        )}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onInstallApp={() => { setHelpOpen(false); openInstallPrompt(); }} />}
    </div>
  );
}
