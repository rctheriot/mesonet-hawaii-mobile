import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStations, useStationMonitor } from '../hooks/useStations';
import { useLatestMeasurements } from '../hooks/useMeasurements';
import { useAppContext } from '../context/AppContext';
import { useChartVars } from '../hooks/useChartVars';
import { ALLOWED_VARIABLES, convertValue, formatValue, getVariableLabel } from '../utils/units';
import { isStaleTimestamp, relativeTime } from '../utils/time';
import { stationStatusKey, STATUS_BADGE, STATUS_LABEL } from '../theme';
import HistoryChart from '../components/StationPanel/HistoryChart';
import StationMeta from '../components/StationPanel/StationMeta';
import ReadingsGrid from '../components/StationPanel/ReadingsGrid';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';

export default function StationDetail() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, settings, openInstallPrompt } = useAppContext();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen]         = useState(false);

  const { data: stations = [], isLoading: stationsLoading } = useStations();
  const { data: monitorData = {} } = useStationMonitor();
  const { data: measurements, isLoading: readingsLoading } = useLatestMeasurements(stationId ?? null);
  const { chartVars, selectVar } = useChartVars(stationId, measurements);

  const [tab, setTab] = useState<'readings' | 'info'>('readings');

  const station = stations.find(s => s.station_id === stationId) ?? null;
  const isFavorite = stationId ? favorites.has(stationId) : false;

  // Deduplicate measurements and filter to whitelisted variables only.
  const readings = useMemo(() => {
    if (!measurements) return [];
    const seen = new Map<string, typeof measurements[0]>();
    for (const m of measurements) {
      if (ALLOWED_VARIABLES.has(m.variable) && !seen.has(m.variable) && m.value != null) {
        seen.set(m.variable, m);
      }
    }
    return Array.from(seen.values());
  }, [measurements]);

  // Hero reading: show most recently selected variable if active, else prefer air temp.
  const heroReading = useMemo(() => {
    if (readings.length === 0) return null;
    if (chartVars[0]) return readings.find(m => m.variable === chartVars[0]) ?? readings[0];
    return (
      readings.find(m =>
        m.variable_display_name?.toLowerCase().includes('air temp') ||
        m.variable?.toLowerCase().includes('tair')
      ) ?? readings[0]
    );
  }, [readings, chartVars]);

  const statusKey = station ? stationStatusKey(station, monitorData) : 'unknown';

  const newestTimestamp = useMemo(() => {
    if (!measurements?.length) return null;
    return measurements.reduce((a, b) =>
      new Date(a.timestamp) > new Date(b.timestamp) ? a : b
    ).timestamp;
  }, [measurements]);

  const isStale = isStaleTimestamp(newestTimestamp);

  // ── Loading / not found states ───────────────────────────────────────────────

  if (stationsLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white dark:bg-zinc-950">
        <p className="text-slate-400 text-base">Loading…</p>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-white dark:bg-zinc-950 gap-4">
        <p className="text-slate-500 dark:text-zinc-400 text-base">Station not found.</p>
        <button
          onClick={() => navigate(-1 as any)}
          className="px-4 py-2 rounded-xl bg-sky-500 text-white text-base font-medium"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => navigate(-1 as any)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Help"
          >
            ?
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Hero section ──────────────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100 leading-tight flex-1">
              {station.full_name ?? station.name ?? station.station_id}
            </h1>
            <button
              onClick={() => stationId && toggleFavorite(stationId)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors mt-1 ${
                isFavorite
                  ? 'bg-sky-500 border-sky-500 text-white hover:bg-sky-600 hover:border-sky-600'
                  : 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-zinc-300 hover:border-sky-400 hover:text-sky-600 dark:hover:border-sky-500 dark:hover:text-sky-400'
              }`}
              aria-label={isFavorite ? 'Remove from My Stations' : 'Add to My Stations'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFavorite ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              {isFavorite ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* Island + status badge */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-base text-slate-500 dark:text-zinc-400">{station.island ?? 'Hawaii'}</p>
            <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[statusKey]}`}>
              {STATUS_LABEL[statusKey]}
            </span>
            {isStale && (
              <span className="text-sm font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                Stale Data
              </span>
            )}
          </div>
          {/* Last reading timestamp — shown below status badges so users know how fresh the data is */}
          {newestTimestamp && (
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
              Updated {relativeTime(newestTimestamp)}
            </p>
          )}

          {/* Big primary reading */}
          {readingsLoading ? (
            <p className="text-slate-400 text-base">Loading readings…</p>
          ) : heroReading ? (
            <div>
              {(() => {
                const c = convertValue(Number(heroReading.value), heroReading.units ?? '', settings.units, heroReading.variable);
                return (
                  <div className="flex items-end gap-2">
                    <span className="text-6xl font-bold text-slate-900 dark:text-zinc-100 leading-none tabular-nums">
                      {formatValue(c.value, heroReading.variable)}
                    </span>
                    {c.unit && (
                      <span className="text-2xl text-slate-500 dark:text-zinc-400 mb-1">{c.unit}</span>
                    )}
                  </div>
                );
              })()}
              <p className="text-base text-slate-500 dark:text-zinc-400 mt-1">
                {getVariableLabel(heroReading.variable, heroReading.variable_display_name)}
              </p>
            </div>
          ) : (
            <p className="text-slate-400 dark:text-zinc-600 text-base">No readings available.</p>
          )}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-slate-200 dark:border-zinc-700 flex-shrink-0">
          {(['readings', 'info'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-base font-medium capitalize border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-sky-500 text-sky-500 dark:text-sky-400'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              {t === 'readings' ? 'Readings' : 'Info'}
            </button>
          ))}
        </div>

        {tab === 'readings' && (
          <div className="px-4 pt-4 pb-8 space-y-6">
            {/* ── History chart ─────────────────────────────────────────────── */}
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                History
              </p>
              <HistoryChart
                stationId={station.station_id}
                varId={chartVars[0]}
                varId2={chartVars[1]}
              />
            </div>

            {/* ── Readings grid ──────────────────────────────────────────────── */}
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                Current Readings
              </p>
              {readingsLoading ? (
                <p className="text-slate-400 text-base">Loading…</p>
              ) : (
                <ReadingsGrid
                  stationId={station.station_id}
                  readings={readings}
                  selectedVarIds={chartVars}
                  onSelectVar={selectVar}
                />
              )}
            </div>
          </div>
        )}

        {tab === 'info' && (
          <div className="px-4 py-4">
            <StationMeta station={station} monitorData={monitorData} />
          </div>
        )}
      </div>
    </div>

    {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    {helpOpen && <HelpModal initialTab="stations" onClose={() => setHelpOpen(false)} onInstallApp={() => { setHelpOpen(false); openInstallPrompt(); }} />}
    </>
  );
}
