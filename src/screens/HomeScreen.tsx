import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';
import { ALLOWED_VARIABLES, convertValue, formatValue, getVariableLabel, groupByCategory, mergeWindReadings } from '../utils/units';
import { useStations, useStationMonitor, useVariables } from '../hooks/useStations';
import { useLatestMeasurements, useRainfall24hr } from '../hooks/useMeasurements';
import { stationStatusKey, STATUS_DOT } from '../theme';
import type { Station, StationMonitor } from '../types/api';

// ─── Station Card ─────────────────────────────────────────────────────────────

interface StationCardProps {
  station: Station;
  monitorData: Record<string, StationMonitor>;
  varId: string | null;    // standard_name to display; null = show first available
  onClick: () => void;
}

function StationCard({ station, monitorData, varId, onClick }: StationCardProps) {
  const { data: measurements } = useLatestMeasurements(station.station_id);
  const { settings } = useAppContext();
  const statusKey = stationStatusKey(station, monitorData);

  // Deduplicate and filter — same logic as LatestReadings
  const allReadings = useMemo(() => {
    if (!measurements) return [];
    const seen = new Map<string, typeof measurements[0]>();
    for (const m of measurements) {
      if (ALLOWED_VARIABLES.has(m.variable) && !seen.has(m.variable) && m.value != null)
        seen.set(m.variable, m);
    }
    return Array.from(seen.values());
  }, [measurements]);

  const { windReadings } = useMemo(() => mergeWindReadings(allReadings), [allReadings]);

  const reading = useMemo(() => {
    if (varId) return allReadings.find(m => m.variable === varId) ?? null;
    // Auto-select: prefer air temp only — no fallback to other variables
    return allReadings.find(m =>
      m.variable_display_name?.toLowerCase().includes('air temp') ||
      m.variable?.toLowerCase().includes('tair')
    ) ?? null;
  }, [allReadings, varId]);

  const windInfo = reading ? (windReadings.find(w => w.speedMeasurement.variable === reading.variable) ?? null) : null;

  const isRainfallSelected = reading?.variable === 'RF_1_Tot300s';
  const { data: rainfall24hr, isLoading: rainfallLoading } = useRainfall24hr(station.station_id, isRainfallSelected);
  const rainfallConverted = rainfall24hr != null
    ? convertValue(rainfall24hr.total, rainfall24hr.units, settings.units, 'RF_1_Tot300s')
    : null;

  const converted = !isRainfallSelected && reading?.value != null
    ? convertValue(Number(reading.value), reading.units ?? '', settings.units, reading.variable)
    : null;

  function relativeTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }

  const timestamp = isRainfallSelected ? null : reading?.timestamp;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 active:scale-[0.98] transition-all flex items-center gap-3"
    >
      {/* Status dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[statusKey]}`} />

      {/* Station name + island + elevation */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
          {station.full_name ?? station.name ?? station.station_id}
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 truncate">
          {station.island ?? 'Hawaii'}
        </p>
        {station.elevation != null && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {settings.units === 'imperial'
              ? `${Math.round(station.elevation * 3.28084)} ft`
              : `${Math.round(station.elevation)} m`}
          </p>
        )}
      </div>

      {/* Primary reading — right-aligned */}
      <div className="flex-shrink-0 text-right">
        {isRainfallSelected ? (
          <>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none tabular-nums">
              {rainfallLoading ? <span className="text-slate-400">…</span> : rainfallConverted != null
                ? <>{formatValue(rainfallConverted.value, 'RF_1_Tot300s')}<span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-0.5">{rainfallConverted.unit}</span></>
                : <span className="text-slate-300 dark:text-slate-600">—</span>}
            </span>
          </>
        ) : converted != null ? (
          <>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none tabular-nums">
              {windInfo?.compass && <span className="text-slate-500 dark:text-slate-400 mr-1">{windInfo.compass}</span>}
              {formatValue(converted.value, reading?.variable)}
              {converted.unit && <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-0.5">{converted.unit}</span>}
            </span>
            {timestamp && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{relativeTime(timestamp)}</p>
            )}
          </>
        ) : (
          <span className="text-lg font-medium text-slate-300 dark:text-slate-600">—</span>
        )}
      </div>
    </button>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

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
  // Wind speed is relabeled "Wind" since direction is always shown alongside it.
  const varOptions = useMemo(() => {
    return variables
      .filter(v => ALLOWED_VARIABLES.has(v.standard_name) && !/^WDrs_/.test(v.standard_name))
      .map(v => ({
        id: v.standard_name,
        label: getVariableLabel(v.standard_name, v.display_name),
      }));
  }, [variables]);

  // The currently selected variable display name (for the selector label)
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
          // Empty state
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
          // Station list — single column of cards with spacing
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
