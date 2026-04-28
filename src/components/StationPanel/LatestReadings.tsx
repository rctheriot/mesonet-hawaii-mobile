import { useMemo } from 'react';
import { useLatestMeasurements } from '../../hooks/useMeasurements';
import { ALLOWED_VARIABLES } from '../../utils/units';
import ReadingsGrid from './ReadingsGrid';
import type { ChartVarPair } from '../../types/ui';

interface LatestReadingsProps {
  stationId: string;
  onSelectVar: (varId: string) => void;
  selectedVarIds: ChartVarPair;
}

// Data-fetching wrapper around ReadingsGrid for the explore panel.
// Fetches latest measurements, deduplicates, filters to allowed variables,
// then delegates all rendering to ReadingsGrid.
export default function LatestReadings({ stationId, onSelectVar, selectedVarIds }: LatestReadingsProps) {
  const { data, isLoading, isError } = useLatestMeasurements(stationId);

  const readings = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, typeof data[0]>();
    for (const m of data) {
      if (ALLOWED_VARIABLES.has(m.variable) && !seen.has(m.variable) && m.value != null) {
        seen.set(m.variable, m);
      }
    }
    return Array.from(seen.values());
  }, [data]);

  if (isLoading) return <p className="text-slate-500 dark:text-zinc-400 text-base">Loading readings…</p>;
  if (isError)   return <p className="text-red-500 dark:text-red-400 text-base">Failed to load readings.</p>;

  return (
    <ReadingsGrid
      stationId={stationId}
      readings={readings}
      selectedVarIds={selectedVarIds}
      onSelectVar={onSelectVar}
    />
  );
}
