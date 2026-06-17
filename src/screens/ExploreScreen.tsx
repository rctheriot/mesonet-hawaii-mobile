import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StationMap from '../components/Map/StationMap';
import MapLegend, { type MapMode } from '../components/Map/MapLegend';
import StationList from '../components/StationList/StationList';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';
import VariableInfoModal from '../components/Glossary/VariableInfoModal';
import { useStations, useStationMonitor } from '../hooks/useStations';
import { useMapMeasurements, useMapRainfall24hr } from '../hooks/useMeasurements';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAppContext } from '../context/AppContext';
import { convertValue } from '../utils/units';
import { tempToHex, windToHex, rhToHex, rainToHex, smToHex, swToHex } from '../utils/mapColor';

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
  const { settings, updateSettings, favorites, openInstallPrompt } = useAppContext();
  const { darkMode, view, mapLat, mapLng, mapZoom, listSortBy, listIslandFilter } = settings;
  const mapMode = settings.mapMode as MapMode;
  const setMapMode = (mode: MapMode) => updateSettings({ mapMode: mode });

  const [helpOpen, setHelpOpen]         = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<'stations' | 'explore' | 'glossary' | 'install' | 'location'>('stations');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoVarId, setInfoVarId]       = useState<string | null>(null);

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

  function handleCenterOnUser() {
    if (coords) {
      setFlyTo({ lat: coords.latitude, lng: coords.longitude, zoom: 12 });
    } else {
      requestLocation();
    }
  }

  return (
    <div className="relative w-full h-full bg-white dark:bg-zinc-950 flex flex-col pb-14">
      {/* Top bar */}
      <div className="flex-shrink-0 relative flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-slate-200 dark:border-zinc-800 z-20">

        {/* Center: Map/List toggle — absolutely centered so it doesn't shift with side buttons */}
        <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
          {(['map', 'list'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => updateSettings({ view: v })}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${view === v
                ? 'bg-white dark:bg-zinc-600 text-slate-800 dark:text-zinc-100 shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
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

      {/* Variable selector bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-zinc-400 flex-shrink-0">Showing:</span>
        <select
          value={mapMode}
          onChange={e => setMapMode(e.target.value as MapMode)}
          className="flex-1 text-sm bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {MAP_MODE_OPTIONS.map(({ mode, label }) => (
            <option key={mode} value={mode}>{label}</option>
          ))}
        </select>
        {mapMode !== 'status' && (
          <button
            onClick={() => setInfoVarId(mapMode)}
            className="flex-shrink-0 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors p-1"
            aria-label="Variable info"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="7" />
              <circle cx="8" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
              <line x1="8" y1="8" x2="8" y2="12" strokeLinecap="round" />
            </svg>
          </button>
        )}
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

        {/* Map stays mounted even in list view to preserve camera state */}
        <div
          className={view === 'map' ? 'absolute inset-0' : 'hidden'}
        >
          <StationMap
            stations={stations}
            monitorData={monitorData}
            selectedStationId={null}
            onSelectStation={(id) => navigate('/station/' + id)}
            flyToCoords={flyTo}
            userLocation={coords}
            darkMode={darkMode}
            onCenterOnUser={handleCenterOnUser}
            geoLoading={geoLoading}
            isVisible={view === 'map'}
            initialCenter={[mapLat, mapLng]}
            initialZoom={mapZoom}
            onCameraChange={(lat, lng, zoom) => updateSettings({ mapLat: lat, mapLng: lng, mapZoom: zoom })}
            varColors={varColors}
            varLabels={varLabels}
            varArrows={varArrows}
          />
          <MapLegend mode={mapMode} units={settings.units} />
        </div>

        {view === 'list' && (
          <div className="absolute inset-0">
            <StationList
              stations={stations}
              monitorData={monitorData}
              onSelectStation={(id) => navigate('/station/' + id)}
              favorites={favorites}
              coords={coords}
              requestLocation={requestLocation}
              geoLoading={geoLoading}
              geoError={geoError}
              mapMode={mapMode}
              varLabels={varLabels}
              units={settings.units}
              sortBy={listSortBy}
              onSortByChange={(v) => updateSettings({ listSortBy: v })}
              islandFilter={listIslandFilter}
              onIslandFilterChange={(v) => updateSettings({ listIslandFilter: v })}
            />

          </div>
        )}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {helpOpen && <HelpModal initialTab={helpInitialTab} onClose={() => setHelpOpen(false)} onInstallApp={() => { setHelpOpen(false); openInstallPrompt(); }} />}
      {infoVarId && (
        <VariableInfoModal
          varId={infoVarId}
          onClose={() => setInfoVarId(null)}
          onOpenGlossary={() => { setInfoVarId(null); setHelpInitialTab('glossary'); setHelpOpen(true); }}
        />
      )}
    </div>
  );
}
