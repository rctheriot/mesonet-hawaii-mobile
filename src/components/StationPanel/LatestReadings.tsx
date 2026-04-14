import { useLatestMeasurements } from '../../hooks/useMeasurements';
import { useAppContext } from '../../context/AppContext';
import { ALLOWED_VARIABLES, convertValue, formatValue } from '../../utils/units';

interface LatestReadingsProps {
  stationId: string;
  onSelectVar: (varId: string) => void;
  selectedVarId: string | null;
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function LatestReadings({ stationId, onSelectVar, selectedVarId }: LatestReadingsProps) {
  const { data, isLoading, isError } = useLatestMeasurements(stationId);
  const { settings } = useAppContext();

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400 text-base">Loading readings…</p>;
  if (isError)   return <p className="text-red-500 dark:text-red-400 text-base">Failed to load readings.</p>;
  if (!data || data.length === 0) return <p className="text-slate-500 dark:text-slate-400 text-base">No readings available.</p>;

  // Deduplicate and filter to whitelisted variables only
  const latestByVar = new Map<string, (typeof data)[0]>();
  for (const m of data) {
    if (ALLOWED_VARIABLES.has(m.variable) && !latestByVar.has(m.variable) && m.value != null) {
      latestByVar.set(m.variable, m);
    }
  }
  const readings = Array.from(latestByVar.values());

  return (
    <div className="grid grid-cols-2 gap-2">
      {readings.map((m) => {
        const converted = convertValue(Number(m.value), m.units ?? '', settings.units, m.variable);
        return (
          <button
            key={m.variable}
            onClick={() => onSelectVar(m.variable)}
            className={`text-left p-3 rounded-lg border transition-colors ${
              selectedVarId === m.variable
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
          >
            <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{m.variable_display_name ?? m.variable}</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatValue(converted.value)}
              {converted.unit && <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{converted.unit}</span>}
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{relativeTime(m.timestamp)}</div>
          </button>
        );
      })}
    </div>
  );
}
