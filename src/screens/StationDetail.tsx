import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuChevronLeft, LuSettings, LuBookmark } from 'react-icons/lu';
import { useStations } from '../hooks/useStations';
import { useLatestMeasurements, useRainfall24hr } from '../hooks/useMeasurements';
import { useAppContext } from '../context/AppContext';
import { useChartVars } from '../hooks/useChartVars';
import { ALLOWED_VARIABLES, convertValue, formatValue, getVariableLabel } from '../utils/units';
import { isStaleTimestamp, relativeTime } from '../utils/time';
import { stationStatusKey, STATUS_TEXT, STATUS_LABEL, STATUS_HEX } from '../theme';
import HistoryChart from '../components/StationDetail/HistoryChart';
import StationMeta from '../components/StationDetail/StationMeta';
import ReadingsGrid from '../components/StationDetail/ReadingsGrid';
import HelpModal from '../components/Help/HelpModal';
import SettingsModal from '../components/Settings/SettingsModal';
import StationLocationMap from '../components/Map/StationLocationMap';

export default function StationDetail() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, settings, openInstallPrompt } = useAppContext();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen]         = useState(false);

  const { data: stations = [], isLoading: stationsLoading } = useStations();
  const { data: measurements, isLoading: readingsLoading } = useLatestMeasurements(stationId ?? null);
  const { chartVars, selectVar, clearVars, hasBeenCleared } = useChartVars(stationId, measurements);

  // 24hr rainfall total — fetched whenever a rainfall variable is shown in the
  // hero (either slot), so the displayed value matches its "(24hr)" label.
  // ReadingsGrid fetches the same query key, so subsequent grid renders are cache hits.
  const heroHasRainfall = [chartVars[0], chartVars[1]].some(v => v != null && /^RF/.test(v));
  const { data: rainfall24hr } = useRainfall24hr(stationId ?? null, heroHasRainfall);

  const [tab, setTab] = useState<'readings' | 'location' | 'info'>('readings');

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

  // Hero reading: show the selected variable (slot 0), or auto-default to air temp
  // on first load. Returns null if the user explicitly cleared (hasBeenCleared=true)
  // so the empty-state prompt is shown instead.
  const heroReading = useMemo(() => {
    if (readings.length === 0) return null;
    if (chartVars[0]) return readings.find(m => m.variable === chartVars[0]) ?? readings[0];
    if (hasBeenCleared) return null;
    return (
      readings.find(m =>
        m.variable_display_name?.toLowerCase().includes('air temp') ||
        m.variable?.toLowerCase().includes('tair')
      ) ?? readings[0]
    );
  }, [readings, chartVars, hasBeenCleared]);

  // Second hero reading — shown side-by-side when a second chart var is active.
  const heroReading2 = useMemo(() => {
    if (!chartVars[1] || readings.length === 0) return null;
    return readings.find(m => m.variable === chartVars[1]) ?? null;
  }, [readings, chartVars]);

  const statusKey = station ? stationStatusKey(station) : 'unknown';

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
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl bg-sky-500 text-white text-base font-medium"
        >
          ← Back
        </button>
      </div>
    );
  }

  // Resolve the raw value and unit for a hero reading, substituting the 24hr
  // rainfall total when the variable is a rainfall accumulator.
  function resolveHeroData(reading: NonNullable<typeof heroReading>) {
    const isRF = /^RF/.test(reading.variable);
    const rawVal  = isRF && rainfall24hr != null ? rainfall24hr.total : Number(reading.value);
    const rawUnit = isRF && rainfall24hr != null ? rainfall24hr.units  : (reading.units ?? '');
    const c   = convertValue(rawVal, rawUnit, settings.units, reading.variable);
    const lbl = getVariableLabel(reading.variable, reading.variable_display_name)
      + (isRF ? ' (24hr)' : '');
    return { c, lbl };
  }

  const stationNameClass = (() => {
    const n = (station.full_name ?? station.name ?? station.station_id).length;
    if (n > 30) return 'text-xl leading-snug';
    if (n > 16) return 'text-2xl leading-tight';
    return 'text-3xl leading-tight';
  })();

  return (
    <>
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between pl-5 pr-4 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 pl-0 pr-3 py-2 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
          aria-label="Back"
        >
          <LuChevronLeft size={16} strokeWidth={2.5} />
          Back
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Settings"
          >
            <LuSettings size={18} />
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

      {/* Hero — fixed, never scrolls */}
      <div className="flex-shrink-0">
        <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className={`font-bold text-slate-900 dark:text-zinc-100 flex-1 ${stationNameClass}`}>
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
              <LuBookmark size={13} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 0 : 2} />
              {isFavorite ? 'Saved' : 'Save'}
            </button>
          </div>

          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
            <span className={STATUS_TEXT[statusKey]}>{STATUS_LABEL[statusKey]}</span>
            {' · '}
            {station.island ?? 'Hawaii'}
            {newestTimestamp && <> · Updated {relativeTime(newestTimestamp)}</>}
            {isStale && <span className="text-amber-500 dark:text-amber-400"> · Stale Data</span>}
          </p>

          {readingsLoading ? (
            <p className="text-slate-400 text-base">Loading readings…</p>
          ) : heroReading && heroReading2 ? (
            <div className="flex gap-8">
              {([
                { reading: heroReading,  accent: 'border-sky-400' },
                { reading: heroReading2, accent: 'border-amber-400' },
              ] as const).map(({ reading, accent }) => {
                const { c, lbl } = resolveHeroData(reading);
                return (
                  <div key={reading.variable} className={`border-l-2 ${accent} pl-3`}>
                    <div className="flex items-end gap-1.5">
                      <span className="text-5xl font-bold text-slate-900 dark:text-zinc-100 leading-none tabular-nums">
                        {formatValue(c.value, reading.variable)}
                      </span>
                      {c.unit && (
                        <span className="text-xl text-slate-500 dark:text-zinc-400 mb-0.5">{c.unit}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-snug">{lbl}</p>
                  </div>
                );
              })}
            </div>
          ) : heroReading ? (
            (() => {
              const { c, lbl } = resolveHeroData(heroReading);
              return (
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-6xl font-bold text-slate-900 dark:text-zinc-100 leading-none tabular-nums">
                      {formatValue(c.value, heroReading.variable)}
                    </span>
                    {c.unit && (
                      <span className="text-2xl text-slate-500 dark:text-zinc-400 mb-1">{c.unit}</span>
                    )}
                  </div>
                  <p className="text-base text-slate-500 dark:text-zinc-400 mt-1">{lbl}</p>
                </div>
              );
            })()
          ) : readings.length === 0 ? (
            <p className="text-slate-400 dark:text-zinc-600 text-base">No readings available.</p>
          ) : (
            <p className="text-slate-400 dark:text-zinc-500 text-sm">Select a reading below to view it here</p>
          )}
        </div>

      </div>

      {/* Tabs — always visible */}
      <div className="flex-shrink-0 flex gap-1 px-4 pt-3 pb-0 border-b border-slate-200 dark:border-zinc-700">
        {(['readings', 'location', 'info'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-base font-medium capitalize border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-sky-500 text-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content — fills all remaining height */}
      <div className="flex-1 min-h-0">
        {tab === 'readings' && (
          <div className="h-full overflow-y-auto px-4 pt-4 pb-8 space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                History
              </p>
              <HistoryChart
                stationId={station.station_id}
                varId={chartVars[0]}
                varId2={chartVars[1]}
                onClear={clearVars}
              />
            </div>
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

        {tab === 'location' && (
          <StationLocationMap
            station={station}
            markerColor={STATUS_HEX[statusKey]}
            darkMode={settings.darkMode}
          />
        )}

        {tab === 'info' && (
          <div className="h-full overflow-y-auto px-4 py-4">
            <StationMeta station={station} />
          </div>
        )}
      </div>
    </div>

    {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    {helpOpen && <HelpModal initialTab="howto" onClose={() => setHelpOpen(false)} onInstallApp={() => { setHelpOpen(false); openInstallPrompt(); }} />}
    </>
  );
}
