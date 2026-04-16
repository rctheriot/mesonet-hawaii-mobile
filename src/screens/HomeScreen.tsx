import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';
import StationCard from '../components/StationCard';
import { ALLOWED_VARIABLES, getVariableLabel, groupByCategory } from '../utils/units';
import { useStations, useStationMonitor, useVariables } from '../hooks/useStations';
import type { Station } from '../types/api';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { settings, updateSettings, favorites, openInstallPrompt } = useAppContext();
  const { homeVarId } = settings;

  const { data: stations = [] } = useStations();
  const { data: monitorData = {} } = useStationMonitor();
  const { data: variables = [] } = useVariables();

  // My Stations: the full Station objects for each favorited ID, in favorites insertion order
  const myStations = useMemo(() => {
    return Array.from(favorites)
      .map(id => stations.find(s => s.station_id === id))
      .filter((s): s is Station => s != null);
  }, [favorites, stations]);

  // Variable options for the selector — only whitelisted variables.
  // Wind direction is excluded (it's merged into the wind speed card).
  const varOptions = useMemo(() => {
    return variables
      .filter(v => ALLOWED_VARIABLES.has(v.standard_name) && !/^WDrs_/.test(v.standard_name))
      .map(v => ({
        id: v.standard_name,
        label: getVariableLabel(v.standard_name, v.display_name),
      }));
  }, [variables]);

  const selectedVarLabel = varOptions.find(v => v.id === homeVarId)?.label ?? 'Auto';

  const isEmpty = myStations.length === 0;
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative w-full h-full bg-white dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/explore')}
          className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
        >
          Explore
        </button>
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

      {/* Variable selector — only shown when there are stations */}
      {!isEmpty && varOptions.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">Showing:</span>
          <select
            value={homeVarId ?? ''}
            onChange={e => updateSettings({ homeVarId: e.target.value || null })}
            className="flex-1 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Auto (Air Temperature)</option>
            {groupByCategory(varOptions, v => v.id, v => v.label).map(({ group, items }) => (
              <optgroup key={group} label={group}>
                {items.map(v => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {homeVarId && (
            <button
              onClick={() => updateSettings({ homeVarId: null })}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
              aria-label="Reset variable"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
            <div className="space-y-2">
              <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                You haven't added any stations yet.
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-base leading-relaxed">
                Tap <strong className="text-slate-600 dark:text-slate-300">Explore</strong> to browse the map or station list, then tap <strong className="text-slate-600 dark:text-slate-300">Save</strong> on any station to add it here.
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
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">Saved Stations</p>
            {myStations.map(station => (
              <StationCard
                key={station.station_id}
                station={station}
                monitorData={monitorData}
                varId={homeVarId}
                onClick={() => navigate(`/station/${station.station_id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onInstallApp={() => { setHelpOpen(false); openInstallPrompt(); }} />}

      {/* Bottom label */}
      {!isEmpty && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-600">
            {selectedVarLabel} · {myStations.length} station{myStations.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
