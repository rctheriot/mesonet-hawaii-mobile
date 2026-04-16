import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useStations, useStationMonitor } from '../hooks/useStations';
import { useLatestMeasurements } from '../hooks/useMeasurements';
import { useAppContext } from '../context/AppContext';
import { ALLOWED_VARIABLES, convertValue, formatValue, getVariableLabel, groupByCategory, mergeWindReadings } from '../utils/units';
import { stationStatusKey, STATUS_BADGE, STATUS_LABEL } from '../theme';
import HistoryChart from '../components/StationPanel/HistoryChart';
import StationMeta from '../components/StationPanel/StationMeta';
import Rainfall24hrCard from '../components/StationPanel/Rainfall24hrCard';

export default function StationDetail() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { favorites, toggleFavorite, settings } = useAppContext();

  const { data: stations = [], isLoading: stationsLoading } = useStations();
  const { data: monitorData = {} } = useStationMonitor();
  const { data: measurements, isLoading: readingsLoading } = useLatestMeasurements(stationId ?? null);

  // Which variable the history chart is showing — defaults to the home screen's selected variable
  const [selectedVarId, setSelectedVarId] = useState<string | null>(settings.homeVarId);
  const [tab, setTab] = useState<'readings' | 'info'>('readings');

  const station = stations.find(s => s.station_id === stationId) ?? null;
  const isFavorite = stationId ? favorites.has(stationId) : false;

  // Deduplicate measurements and filter to whitelisted variables only
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

  // Hero reading: show selected variable if one is active, else prefer air temp
  const heroReading = useMemo(() => {
    if (readings.length === 0) return null;
    if (selectedVarId) return readings.find(m => m.variable === selectedVarId) ?? readings[0];
    return (
      readings.find(m =>
        m.variable_display_name?.toLowerCase().includes('air temp') ||
        m.variable?.toLowerCase().includes('tair')
      ) ?? readings[0]
    );
  }, [readings, selectedVarId]);

  const statusKey = station ? stationStatusKey(station, monitorData) : 'unknown';

  // Stale: newest measurement is older than 24h
  const isStale = useMemo(() => {
    if (!measurements || measurements.length === 0) return false;
    const newest = measurements.reduce((a, b) =>
      new Date(a.timestamp) > new Date(b.timestamp) ? a : b
    );
    return Date.now() - new Date(newest.timestamp).getTime() > 24 * 60 * 60 * 1000;
  }, [measurements]);

  // ── Loading / not found states ───────────────────────────────────────────────

  if (stationsLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-white dark:bg-slate-950">
        <p className="text-slate-400 text-base">Loading…</p>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-white dark:bg-slate-950 gap-4">
        <p className="text-slate-500 dark:text-slate-400 text-base">Station not found.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl bg-sky-500 text-white text-base font-medium"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sky-500 dark:text-sky-400 text-base font-medium hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
          aria-label="Back to home"
        >
          ← Home
        </button>
        {/* Save / Unsave station */}
        <button
          onClick={() => stationId && toggleFavorite(stationId)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            isFavorite
              ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
              : 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
          }`}
          aria-label={isFavorite ? 'Unsave Station' : 'Save Station'}
        >
          {isFavorite ? 'Unsave' : 'Save'}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Hero section ──────────────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          {/* Station name */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {station.full_name ?? station.name ?? station.station_id}
            </h1>
          </div>

          {/* Island + status badge */}
          <div className="flex items-center gap-2 mb-4">
            <p className="text-base text-slate-500 dark:text-slate-400">{station.island ?? 'Hawaii'}</p>
            <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[statusKey]}`}>
              {STATUS_LABEL[statusKey]}
            </span>
            {isStale && (
              <span className="text-sm font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                Stale Data
              </span>
            )}
          </div>

          {/* Big primary reading */}
          {readingsLoading ? (
            <p className="text-slate-400 text-base">Loading readings…</p>
          ) : heroReading ? (
            <div>
              {(() => {
                const c = convertValue(Number(heroReading.value), heroReading.units ?? '', settings.units, heroReading.variable);
                return (
                  <div className="flex items-end gap-2">
                    <span className="text-6xl font-bold text-slate-900 dark:text-slate-100 leading-none tabular-nums">
                      {formatValue(c.value, heroReading.variable)}
                    </span>
                    {c.unit && (
                      <span className="text-2xl text-slate-500 dark:text-slate-400 mb-1">{c.unit}</span>
                    )}
                  </div>
                );
              })()}
              <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                {getVariableLabel(heroReading.variable, heroReading.variable_display_name)}
              </p>
            </div>
          ) : (
            <p className="text-slate-400 dark:text-slate-600 text-base">No readings available.</p>
          )}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          {(['readings', 'info'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-base font-medium capitalize border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-sky-500 text-sky-500 dark:text-sky-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {selectedVarId
                  ? getVariableLabel(selectedVarId, readings.find(m => m.variable === selectedVarId)?.variable_display_name)
                  : 'History'}
              </p>
              <HistoryChart stationId={station.station_id} varId={selectedVarId} />
            </div>

            {/* ── Readings grid ──────────────────────────────────────────────── */}
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Current Readings
              </p>
              {readingsLoading ? (
                <p className="text-slate-400 text-base">Loading…</p>
              ) : readings.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-600 text-base">No readings available.</p>
              ) : (() => {
                const { windReadings, remainder } = mergeWindReadings(readings);
                return (
                  <div className="space-y-4">
                    {groupByCategory(remainder, m => m.variable, m => m.variable_display_name ?? m.variable).map(({ group, items }) => (
                      <div key={group}>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          {group}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {items.map(m => {
                            if (m.variable === 'RF_1_Tot300s') {
                              return (
                                <Rainfall24hrCard
                                  key={m.variable}
                                  stationId={station.station_id}
                                  varId={m.variable}
                                  selected={selectedVarId === m.variable}
                                  onSelect={() => setSelectedVarId(v => v === m.variable ? null : m.variable)}
                                />
                              );
                            }
                            const wind = windReadings.find(w => w.speedMeasurement.variable === m.variable);
                            const c = convertValue(Number(m.value), m.units ?? '', settings.units, m.variable);
                            return (
                              <button
                                key={m.variable}
                                onClick={() => setSelectedVarId(v => v === m.variable ? null : m.variable)}
                                className={`text-left p-4 rounded-xl border transition-colors ${
                                  selectedVarId === m.variable
                                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
                                }`}
                              >
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-tight">
                                  {wind ? 'Wind' : (m.variable_display_name ?? m.variable)}
                                </p>
                                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                  {wind?.compass && (
                                    <span className="mr-1">{wind.compass}</span>
                                  )}
                                  {formatValue(c.value, m.variable)}
                                  {c.unit && <span className="text-sm text-slate-400 ml-1">{c.unit}</span>}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
  );
}
