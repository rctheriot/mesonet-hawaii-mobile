import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { convertValue, formatValue, groupByCategory, mergeWindReadings } from '../../utils/units';
import Rainfall24hrCard from './Rainfall24hrCard';
import VariableInfoModal from '../Glossary/VariableInfoModal';
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
function InfoButton({ varId, onClick }: { varId: string; onClick: (varId: string) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(varId); }}
      className="absolute top-1.5 right-1.5 text-slate-300 dark:text-zinc-600 hover:text-sky-500 dark:hover:text-sky-400 transition-colors p-0.5"
      aria-label="Variable info"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="7" />
        <circle cx="8" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
        <line x1="8" y1="8" x2="8" y2="12" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export default function ReadingsGrid({ stationId, readings, selectedVarIds, onSelectVar }: ReadingsGridProps) {
  const { settings } = useAppContext();
  const [infoVarId, setInfoVarId] = useState<string | null>(null);

  if (readings.length === 0) {
    return <p className="text-slate-500 dark:text-zinc-400 text-base">No readings available.</p>;
  }

  const { windReadings, remainder } = mergeWindReadings(readings);
  const groups = groupByCategory(remainder, m => m.variable, m => m.variable_display_name ?? m.variable);

  return (
    <div className="space-y-4">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
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
                  <div key={m.variable} className="relative">
                    <Rainfall24hrCard
                      stationId={stationId}
                      varId={m.variable}
                      selectedColor={selColor}
                      onSelect={() => onSelectVar(m.variable)}
                    />
                    <InfoButton varId={m.variable} onClick={setInfoVarId} />
                  </div>
                );
              }

              const wind = windReadings.find(w => w.speedMeasurement.variable === m.variable);
              const converted = convertValue(Number(m.value), m.units ?? '', settings.units, m.variable);

              return (
                <div key={m.variable} className="relative">
                  <button
                    onClick={() => onSelectVar(m.variable)}
                    className={`w-full h-full text-left p-3 rounded-lg border transition-colors ${
                      selColor === 'sky'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                        : selColor === 'amber'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                        : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="text-sm text-slate-500 dark:text-zinc-400 leading-tight pr-5">
                      {wind ? 'Wind' : (m.variable_display_name ?? m.variable)}
                    </div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                      {wind?.compass && <span className="mr-1">{wind.compass}</span>}
                      {formatValue(converted.value, m.variable)}
                      {converted.unit && (
                        <span className="text-sm text-slate-500 dark:text-zinc-400 ml-1">{converted.unit}</span>
                      )}
                    </div>
                  </button>
                  <InfoButton varId={m.variable} onClick={setInfoVarId} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {infoVarId && (
        <VariableInfoModal varId={infoVarId} onClose={() => setInfoVarId(null)} />
      )}
    </div>
  );
}
