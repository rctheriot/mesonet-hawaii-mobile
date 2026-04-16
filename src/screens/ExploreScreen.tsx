import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import StationMap from '../components/Map/StationMap';
import StationPanel from '../components/StationPanel/StationPanel';
import StationList from '../components/StationList/StationList';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';
import { useStations, useStationMonitor } from '../hooks/useStations';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAppContext } from '../context/AppContext';
import type { Station } from '../types/api';

type View = 'map' | 'list';

export default function ExploreScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings, updateSettings, favorites, toggleFavorite, openInstallPrompt } = useAppContext();
  const { darkMode, view, lastStationId, panelHeightRatio } = settings;

  const { data: stations = [], isLoading, isError } = useStations();
  const { data: monitorData = {} } = useStationMonitor();
  const { coords, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(lastStationId);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | undefined>();
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | undefined>();

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
          />
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
