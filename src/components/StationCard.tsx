import { useMemo } from 'react';
import { LuTriangle } from 'react-icons/lu';
import { useAppContext } from '../context/AppContext';
import { useLatestMeasurements, useRainfall24hr } from '../hooks/useMeasurements';
import { ALLOWED_VARIABLES, convertValue, formatValue, mergeWindReadings, kmToMiles } from '../utils/units';
import { relativeTime } from '../utils/time';
import { stationStatusKey, STATUS_DOT } from '../theme';
import type { Station } from '../types/api';

interface StationCardProps {
  station: Station;
  varId: string | null;    // standard_name to display; null = show first available
  rainfallMap?: Map<string, { value: number; units: string }>;
  distanceKm?: number;
  onClick: () => void;
}

export default function StationCard({ station, varId, rainfallMap, distanceKm, onClick }: StationCardProps) {
  const { data: measurements } = useLatestMeasurements(station.station_id);
  const { settings } = useAppContext();
  const statusKey = stationStatusKey(station);

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

  const windInfo = reading
    ? (windReadings.find(w => w.speedMeasurement.variable === reading.variable) ?? null)
    : null;

  const isRainfallSelected = reading?.variable === 'RF_1_Tot300s';
  // Use bulk map data when available (1 call for all stations); fall back to per-station hook otherwise.
  const mapEntry = rainfallMap?.get(station.station_id);
  const { data: rainfall24hr, isLoading: rainfallLoading } = useRainfall24hr(
    station.station_id,
    isRainfallSelected && (!rainfallMap || !mapEntry),
  );
  const rainfallRaw = mapEntry
    ? { total: mapEntry.value, units: mapEntry.units }
    : rainfall24hr ?? null;
  const rainfallConverted = rainfallRaw != null
    ? convertValue(rainfallRaw.total, rainfallRaw.units, settings.units, 'RF_1_Tot300s')
    : null;
  const isRainfallLoading = isRainfallSelected && !mapEntry && rainfallLoading;

  const converted = !isRainfallSelected && reading?.value != null
    ? convertValue(Number(reading.value), reading.units ?? '', settings.units, reading.variable)
    : null;

  const timestamp = isRainfallSelected ? null : reading?.timestamp;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 hover:border-sky-400 dark:hover:border-sky-500 active:scale-[0.98] transition-all flex items-center gap-3"
    >
      {/* Status dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[statusKey]}`} />

      {/* Station name + island + distance + elevation */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-slate-900 dark:text-zinc-100 leading-tight">
          {station.full_name ?? station.name ?? station.station_id}
        </p>
        <p className="text-sm text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
          {station.island ?? 'Hawaii'}
          {distanceKm != null && (
            <span className="ml-1.5">
              · {settings.units === 'imperial'
                ? `${kmToMiles(distanceKm).toFixed(1)} mi`
                : `${distanceKm.toFixed(1)} km`}
            </span>
          )}
        </p>
        {station.elevation != null && (
          <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            <LuTriangle size={11} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {settings.units === 'imperial'
              ? `${Math.round(station.elevation * 3.28084).toLocaleString()} ft`
              : `${Math.round(station.elevation).toLocaleString()} m`}
          </p>
        )}
      </div>

      {/* Primary reading — right-aligned, vertically centered */}
      <div className="flex-shrink-0 text-right self-center">
        {isRainfallSelected ? (
          <span className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none tabular-nums">
            {isRainfallLoading
              ? <span className="text-slate-400">…</span>
              : rainfallConverted != null
              ? <>{formatValue(rainfallConverted.value, 'RF_1_Tot300s')}<span className="text-sm font-normal text-slate-400 dark:text-zinc-500 ml-0.5">{rainfallConverted.unit}</span></>
              : <span className="text-slate-300 dark:text-zinc-600">—</span>}
          </span>
        ) : converted != null ? (
          <>
            <span className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none tabular-nums">
              {windInfo?.compass && <span className="text-slate-500 dark:text-zinc-400 mr-1">{windInfo.compass}</span>}
              {formatValue(converted.value, reading?.variable)}
              {converted.unit && <span className="text-sm font-normal text-slate-400 dark:text-zinc-500 ml-0.5">{converted.unit}</span>}
            </span>
            {timestamp && (
              <p className="text-sm text-slate-400 dark:text-zinc-500 mt-0.5">{relativeTime(timestamp)}</p>
            )}
          </>
        ) : (
          <span className="text-lg font-medium text-slate-300 dark:text-zinc-600">—</span>
        )}
      </div>
    </button>
  );
}
