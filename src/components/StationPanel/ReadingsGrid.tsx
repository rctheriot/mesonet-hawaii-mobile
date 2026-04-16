import { useAppContext } from '../../context/AppContext';
import { convertValue, formatValue, groupByCategory, mergeWindReadings } from '../../utils/units';
import Rainfall24hrCard from './Rainfall24hrCard';
import type { Measurement } from '../../types/api';
import type { ChartVarPair } from '../../types/ui';

interface ReadingsGridProps {
  stationId: string;
  // Pre-filtered and deduplicated measurements — caller is responsible for
  // applying ALLOWED_VARIABLES and removing duplicates before passing here.
  readings: Measurement[];
  selectedVarIds: ChartVarPair;
  onSelectVar: (varId: string) => void;
}

// Pure rendering component for the station readings grid.
// No data fetching — receives already-processed measurements from the caller.
// Used by both LatestReadings (explore panel) and StationDetail (full page).
export default function ReadingsGrid({ stationId, readings, selectedVarIds, onSelectVar }: ReadingsGridProps) {
  const { settings } = useAppContext();

  if (readings.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-base">No readings available.</p>;
  }

  const { windReadings, remainder } = mergeWindReadings(readings);
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
                    {wind?.compass && <span className="mr-1">{wind.compass}</span>}
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
