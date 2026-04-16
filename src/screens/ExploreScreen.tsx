import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StationMap from '../components/Map/StationMap';
import MapLegend, { type MapMode } from '../components/Map/MapLegend';
import StationPanel from '../components/StationPanel/StationPanel';
import StationList from '../components/StationList/StationList';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';
import { useStations, useStationMonitor } from '../hooks/useStations';
import { useMapMeasurements, useMapRainfall24hr } from '../hooks/useMeasurements';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAppContext } from '../context/AppContext';
import { convertValue } from '../utils/units';
import { tempToHex, windToHex, rhToHex, rainToHex, smToHex, swToHex } from '../utils/mapColor';
import type { Station } from '../types/api';

type View = 'map' | 'list';

const MAP_MODE_OPTIONS: { mode: MapMode; label: string }[] = [
  { mode: 'status',        label: 'Status'         },
  { mode: 'Tair_1_Avg',   label: 'Air Temp'       },
  { mode: 'RH_1_Avg',     label: 'Humidity'       },
  { mode: 'SWin_1_Avg',   label: 'Radiation'      },
  { mode: 'RF_1_Tot300s', label: 'Rainfall (24hr)'},
  { mode: 'SM_1_Avg',     label: 'Soil Moisture'  },
  { mode: 'Tsoil_1_Avg',  label: 'Soil Temp'      },
  { mode: 'WS_1_Avg',     label: 'Wind'           },
];

export default function ExploreScreen() {
  const navigate = useNavigate();
  const { settings, updateSettings, favorites, toggleFavorite, openInstallPrompt } = useAppContext();
  const { darkMode, view, lastStationId, panelHeightRatio } = settings;

  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(lastStationId);
  const [mapMode, setMapMode] = useState<MapMode>('Tair_1_Avg');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: stations = [], isLoading, isError } = useStations();
  const { data: monitorData = {} } = useStationMonitor();
  // Rainfall uses its own 24hr-sum hook; all other variable modes use the latest-value hook.
  const { data: varData }      = useMapMeasurements(mapMode !== 'status' && mapMode !== 'RF_1_Tot300s' ? mapMode : null);
  const { data: rainfallData } = useMapRainfall24hr(mapMode === 'RF_1_Tot300s');
  const { data: windDirData }  = useMapMeasurements(mapMode === 'WS_1_Avg' ? 'WDrs_1_Avg' : null);
  const { coords, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  // For rainfall mode use the 24hr-sum data; otherwise use the latest-value data.
  const activeVarData = mapMode === 'RF_1_Tot300s' ? rainfallData : varData;

  const varColors = useMemo(() => {
    if (!activeVarData || mapMode === 'status') return undefined;
    const map = new Map<string, string>();
    for (const [id, { value }] of activeVarData) {
      let color: string;
      if      (mapMode === 'Tair_1_Avg')  color = tempToHex(value);
      else if (mapMode === 'Tsoil_1_Avg') color = tempToHex(value);
      else if (mapMode === 'WS_1_Avg')    color = windToHex(value);
      else if (mapMode === 'RH_1_Avg')    color = rhToHex(value);
      else if (mapMode === 'SM_1_Avg')    color = smToHex(value);
      else if (mapMode === 'SWin_1_Avg')  color = swToHex(value);
      else                                color = rainToHex(value);
      map.set(id, color);
    }
    return map;
  }, [activeVarData, mapMode]);

  const varArrows = useMemo(() => {
    if (!windDirData || mapMode !== 'WS_1_Avg') return undefined;
    const map = new Map<string, number>();
    for (const [id, { value }] of windDirData) map.set(id, value);
    return map;
  }, [windDirData, mapMode]);

  const varLabels = useMemo(() => {
    if (!activeVarData || mapMode === 'status') return undefined;
    const map = new Map<string, string>();
    for (const [id, { value, units: rawUnits }] of activeVarData) {
      const { value: converted } = convertValue(value, rawUnits, settings.units, mapMode);
      const label = mapMode === 'RF_1_Tot300s'
        ? converted.toFixed(settings.units === 'imperial' ? 2 : 1)
        : String(Math.round(converted));
      map.set(id, label);
    }
    return map;
  }, [activeVarData, mapMode, settings.units]);

  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | undefined>();
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | undefined>();

  // Close the variable dropdown when the user clicks outside it.
  useEffect(() => {
    if (!modeDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [modeDropdownOpen]);

  // When location is obtained, fly the map to the user
  useEffect(() => {
    if (coords) {
      setFlyTo({ lat: coords.latitude, lng: coords.longitude, zoom: 11 });
    }
  }, [coords]);

  const selectedStation: Station | null =
    stations.find(s => s.station_id === selectedStationId) ?? null;

  function handleSelectStation(id: string) {
    setSelectedStationId(id);
    updateSettings({ lastStationId: id });
  }

  function handleListSelect(id: string) {
    const station = stations.find(s => s.station_id === id);
    setSelectedStationId(id);
    updateSettings({ lastStationId: id });
    if (station) setPanTo({ lat: station.lat, lng: station.lng });
  }

  // When switching back to map view, re-pan to the selected station.
  useEffect(() => {
    if (view === 'map' && selectedStation) {
      setPanTo({ lat: selectedStation.lat, lng: selectedStation.lng });
    }
  }, [view]);

  const [panelHeight, setPanelHeight] = useState(() =>
    Math.round(window.innerHeight * panelHeightRatio)
  );

  const handleHeightChange = useCallback((h: number) => {
    setPanelHeight(h);
    if (h > 0) updateSettings({ panelHeightRatio: h / window.innerHeight });
  }, [updateSettings]);


  // Center map on user — lazily request location if not yet obtained
  function handleCenterOnUser() {
    if (coords) {
      setFlyTo({ lat: coords.latitude, lng: coords.longitude, zoom: 12 });
    } else {
      requestLocation();
      // The useEffect watching coords will trigger flyTo once location is obtained
    }
  }

  return (
    <div className="relative w-full h-full bg-white dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 relative flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 z-20">
        {/* Left: Home button */}
        <div className="flex items-center">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
            aria-label="Go to home"
          >
            Home
          </button>
        </div>

        {/* Center: Map/List toggle — absolutely centered so it doesn't shift with side buttons */}
        <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
          {(['map', 'list'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => updateSettings({ view: v })}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${view === v
                ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Right: settings, help */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Help"
          >
            ?
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
            <div className="text-slate-300 text-base">Loading stations…</div>
          </div>
        )}
        {isError && (
          <div className="absolute top-4 right-4 z-20 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/90 border border-red-300 dark:border-red-700 text-base text-red-700 dark:text-red-200">
            Failed to load stations. Check your API key.
          </div>
        )}

        {/* Map variable selector dropdown — only shown in map view */}
        {view === 'map' && (
          <div ref={dropdownRef} className="absolute top-2.5 left-4 z-[1002]">
            <button
              onClick={() => setModeDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              {MAP_MODE_OPTIONS.find(o => o.mode === mapMode)?.label ?? 'Status'}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M5 7L1 3h8L5 7z"/>
              </svg>
            </button>
            {modeDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[110px]">
                {MAP_MODE_OPTIONS.map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => { setMapMode(mode); setModeDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                      mapMode === mode
                        ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map stays mounted even in list view to preserve camera state */}
        <div
          className={view === 'map' ? 'absolute inset-0' : 'hidden'}
          style={{ bottom: panelHeight }}
        >
          <StationMap
            stations={stations}
            monitorData={monitorData}
            selectedStationId={selectedStationId}
            onSelectStation={handleSelectStation}
            flyToCoords={flyTo}
            panToCoords={panTo}
            userLocation={coords}
            darkMode={darkMode}
            onCenterOnUser={handleCenterOnUser}
            geoLoading={geoLoading}
            isVisible={view === 'map'}
            panelHeight={panelHeight}
            varColors={varColors}
            varLabels={varLabels}
            varArrows={varArrows}
          />
          <MapLegend mode={mapMode} units={settings.units} />
        </div>

        {view === 'list' && (
          <div className="absolute inset-0" style={{ bottom: panelHeight }}>
            <StationList
              stations={stations}
              monitorData={monitorData}
              onSelectStation={handleListSelect}
              favorites={favorites}
              coords={coords}
              requestLocation={requestLocation}
              geoLoading={geoLoading}
              geoError={geoError}
            />
          </div>
        )}

        <StationPanel
          station={selectedStation}
          monitorData={monitorData}
          onClose={() => { setSelectedStationId(null); updateSettings({ lastStationId: null }); }}
          onHeightChange={handleHeightChange}
          isFavorite={selectedStation ? favorites.has(selectedStation.station_id) : false}
          onToggleFavorite={toggleFavorite}
        />
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onInstallApp={() => { setHelpOpen(false); openInstallPrompt(); }} />}
    </div>
  );
}
