import { useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Measurement } from '../types/api';
import type { ChartVarPair } from '../types/ui';

// Manages the two-variable chart selection for a given station.
//
// On each station switch, once measurements load, any previously selected variable
// that doesn't exist on the new station is cleared. Variables present on both stations
// are kept, so the chart persists meaningful selections across navigation.
//
// Returns the current pair and a selectVar function that shifts the queue:
// selecting a new variable pushes the current one to the second slot.
export function useChartVars(
  stationId: string | null | undefined,
  measurements: Measurement[] | undefined,
): { chartVars: ChartVarPair; selectVar: (varId: string) => void } {
  const { chartVars, setChartVars } = useAppContext();

  // Tracks which station has already been validated so the effect only fires once
  // per station switch. A ref (not state) avoids an extra render that would
  // re-run the effect before the setChartVars update has settled.
  const lastValidatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!stationId || !measurements?.length) return;
    if (lastValidatedRef.current === stationId) return;
    lastValidatedRef.current = stationId;

    const available = new Set(measurements.map(m => m.variable));
    const v0 = chartVars[0] && available.has(chartVars[0]) ? chartVars[0] : null;
    const v1 = chartVars[1] && available.has(chartVars[1]) ? chartVars[1] : null;
    if (v0 !== chartVars[0] || v1 !== chartVars[1]) setChartVars([v0, v1]);
  }, [stationId, measurements]);

  function selectVar(varId: string) {
    setChartVars([varId, chartVars[0]]);
  }

  return { chartVars, selectVar };
}
