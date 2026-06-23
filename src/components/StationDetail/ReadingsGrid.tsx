import { useState } from 'react';
import { LuInfo } from 'react-icons/lu';
import { useAppContext } from '../../context/AppContext';
import { convertValue, formatValue, groupByCategory, mergeWindReadings } from '../../utils/units';
import Rainfall24hrCard from './Rainfall24hrCard';
import VariableInfoModal from '../Glossary/VariableInfoModal';
import HelpModal from '../Help/HelpModal';
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

// Variables shown by default — same set as the home/map variable dropdowns.
const PRIORITY_VARS = new Set([
  'Tair_1_Avg', 'RH_1_Avg', 'SWin_1_Avg', 'RF_1_Tot300s',
  'SM_1_Avg', 'Tsoil_1_Avg', 'WS_1_Avg',
]);

// Small info button overlaid on each reading card; opens that variable's glossary entry.
function InfoButton({ varId, onClick }: { varId: string; onClick: (varId: string) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(varId); }}
      className="absolute top-1.5 right-1.5 text-slate-300 dark:text-zinc-600 hover:text-sky-500 dark:hover:text-sky-400 transition-colors p-0.5"
      aria-label="Variable info"
    >
      <LuInfo size={14} />
    </button>
  );
}

// Pure rendering component for the station readings grid — no data fetching.
// Receives already-deduplicated, allowed-only measurements from StationDetail.
export default function ReadingsGrid({ stationId, readings, selectedVarIds, onSelectVar }: ReadingsGridProps) {
  const { settings, openInstallPrompt } = useAppContext();
  const [infoVarId, setInfoVarId] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (readings.length === 0) {
    return <p className="text-slate-500 dark:text-zinc-400 text-base">No readings available.</p>;
  }

  const { windReadings, remainder } = mergeWindReadings(readings);

  // Split into priority (always shown) and secondary (behind "show more").
  // Wind is keyed by speed variable — check against PRIORITY_VARS via the speed var.
  const priorityRemainder = remainder.filter(m => PRIORITY_VARS.has(m.variable));
  const secondaryRemainder = remainder.filter(m => !PRIORITY_VARS.has(m.variable));
  const hasSecondary = secondaryRemainder.length > 0;

  const groups = groupByCategory(remainder, m => m.variable, m => m.variable_display_name ?? m.variable);

  function renderCard(m: Measurement) {
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
  }

  return (
    <div className="space-y-4">
      {!showAll ? (
        // Collapsed: flat grid, no category headers
        <div className="grid grid-cols-2 gap-2">
          {priorityRemainder.map(m => renderCard(m))}
        </div>
      ) : (
        // Expanded: grouped with category headers
        groups.map(({ group, items }) => (
          <div key={group}>
            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              {group}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {items.map(m => renderCard(m))}
            </div>
          </div>
        ))
      )}

      {hasSecondary && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full py-2 text-xs font-medium text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors"
        >
          {showAll ? 'Show less ↑' : `Show more ↓`}
        </button>
      )}

      {infoVarId && (
        <VariableInfoModal
          varId={infoVarId}
          onClose={() => setInfoVarId(null)}
          onOpenGlossary={() => { setInfoVarId(null); setGlossaryOpen(true); }}
        />
      )}

      {glossaryOpen && (
        <HelpModal
          initialTab="glossary"
          onClose={() => setGlossaryOpen(false)}
          onInstallApp={() => { setGlossaryOpen(false); openInstallPrompt(); }}
        />
      )}
    </div>
  );
}
