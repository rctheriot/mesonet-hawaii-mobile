import { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Measurement } from '../types/api';
import type { ChartVarPair } from '../types/ui';

// Manages the two-variable chart selection for a given station.
//
// Selection behavior:
// - Tapping a selected var deselects it; its slot is nulled out (colors don't shift).
// - Tapping a new var when a slot is empty fills that slot.
// - Tapping a new var when both slots are full alternates which slot gets replaced,
//   so colors cycle: Blue stays, Orange replaced → Orange stays, Blue replaced → ...
export function useChartVars(
  stationId: string | null | undefined,
  measurements: Measurement[] | undefined,
): { chartVars: ChartVarPair; selectVar: (varId: string) => void; clearVars: () => void; hasBeenCleared: boolean } {
  const { chartVars, setChartVars } = useAppContext();

  const lastValidatedRef = useRef<string | null>(null);
  // Which slot to replace next when both are filled. Resets on station switch.
  const replaceSlotRef = useRef<0 | 1>(0);
  // True only after the user explicitly clicks Clear — distinguishes cleared state
  // from the brief first-load moment before defaults are applied by the effect.
  const [hasBeenCleared, setHasBeenCleared] = useState(false);

  useEffect(() => {
    if (!stationId || !measurements?.length) return;
    if (lastValidatedRef.current === stationId) return;
    lastValidatedRef.current = stationId;
    replaceSlotRef.current = 0;

    const available = new Set(measurements.map(m => m.variable));
    let v0 = chartVars[0] && available.has(chartVars[0]) ? chartVars[0] : null;
    let v1 = chartVars[1] && available.has(chartVars[1]) ? chartVars[1] : null;

    // No prior valid selection — apply defaults for this station
    if (!v0 && !v1) {
      v0 = available.has('RF_1_Tot300s') ? 'RF_1_Tot300s' : null;
      v1 = available.has('Tair_1_Avg')   ? 'Tair_1_Avg'   : null;
    }

    if (v0 !== chartVars[0] || v1 !== chartVars[1]) setChartVars([v0, v1]);
  }, [stationId, measurements]);

  function clearVars() {
    setChartVars([null, null]);
    setHasBeenCleared(true);
    replaceSlotRef.current = 0;
  }

  function selectVar(varId: string) {
    // Deselect — null the slot, don't shift colors.
    if (chartVars[0] === varId) {
      setChartVars([null, chartVars[1]]);
      replaceSlotRef.current = 0;
      return;
    }
    if (chartVars[1] === varId) {
      setChartVars([chartVars[0], null]);
      replaceSlotRef.current = 1;
      return;
    }

    // Fill an empty slot first, regardless of replaceSlot.
    if (chartVars[0] === null) {
      setChartVars([varId, chartVars[1]]);
      replaceSlotRef.current = 1;
      return;
    }
    if (chartVars[1] === null) {
      setChartVars([chartVars[0], varId]);
      replaceSlotRef.current = 0;
      return;
    }

    // Both slots filled — replace the alternating slot and flip for next time.
    if (replaceSlotRef.current === 0) {
      setChartVars([varId, chartVars[1]]);
      replaceSlotRef.current = 1;
    } else {
      setChartVars([chartVars[0], varId]);
      replaceSlotRef.current = 0;
    }
  }

  return { chartVars, selectVar, clearVars, hasBeenCleared };
}
