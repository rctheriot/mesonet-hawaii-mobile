import { useLatestMeasurements } from '../../hooks/useMeasurements';
import { useAppContext } from '../../context/AppContext';
import { ALLOWED_VARIABLES, convertValue, formatValue, groupByCategory, mergeWindReadings } from '../../utils/units';
import Rainfall24hrCard from './Rainfall24hrCard';

interface LatestReadingsProps {
  stationId: string;
  onSelectVar: (varId: string) => void;
  selectedVarIds: [string | null, string | null];
}


export default function LatestReadings({ stationId, onSelectVar, selectedVarIds }: LatestReadingsProps) {
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
  const allReadings = Array.from(latestByVar.values());
  const { windReadings, remainder } = mergeWindReadings(allReadings);
  const groups = groupByCategory(remainder, m => m.variable, m => m.variable_display_name ?? m.variable);

  return (
    <div className="space-y-4">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            {group}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((m) => {
              const selColor: 'sky' | 'amber' | null =
                selectedVarIds[0] === m.variable ? 'sky'
                : selectedVarIds[1] === m.variable ? 'amber'
                : null;

              // RF_1_Tot300s → 24hr total card
              if (m.variable === 'RF_1_Tot300s') {
                return (
                  <Rainfall24hrCard
                    key={m.variable}
                    stationId={stationId}
                    varId={m.variable}
                    selectedColor={selColor}
                    onSelect={() => onSelectVar(m.variable)}
                  />
                );
              }
              // Wind speed cards with direction info merged in
              const wind = windReadings.find(w => w.speedMeasurement.variable === m.variable);
              const converted = convertValue(Number(m.value), m.units ?? '', settings.units, m.variable);
              return (
                <button
                  key={m.variable}
                  onClick={() => onSelectVar(m.variable)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selColor === 'sky'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                      : selColor === 'amber'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="text-sm text-slate-500 dark:text-slate-400 leading-tight">
                    {wind ? 'Wind' : (m.variable_display_name ?? m.variable)}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {wind?.compass && (
                      <span className="mr-1">{wind.compass}</span>
                    )}
                    {formatValue(converted.value, m.variable)}
                    {converted.unit && (
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{converted.unit}</span>
                    )}
                  </div>

                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
