import { useRainfall24hr } from '../../hooks/useMeasurements';
import { useAppContext } from '../../context/AppContext';
import { convertValue, formatValue } from '../../utils/units';

interface Rainfall24hrCardProps {
  stationId: string;
  varId: string;
  selected: boolean;
  onSelect: () => void;
}

export default function Rainfall24hrCard({ stationId, varId, selected, onSelect }: Rainfall24hrCardProps) {
  const { data, isLoading } = useRainfall24hr(stationId);
  const { settings } = useAppContext();

  const converted = data != null
    ? convertValue(data.total, data.units, settings.units, varId)
    : null;

  return (
    <button
      onClick={onSelect}
      className={`text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
      }`}
    >
      <div className="text-sm text-slate-500 dark:text-slate-400 truncate">24hr Rainfall</div>
      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {isLoading ? (
          <span className="text-slate-400">…</span>
        ) : converted != null ? (
          <>
            {formatValue(converted.value, varId)}
            {converted.unit && (
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{converted.unit}</span>
            )}
          </>
        ) : '—'}
      </div>
    </button>
  );
}
