import LoadingBadge from '../LoadingBadge';

// Loading pill overlaid on the map while variable data is downloading, so users
// don't mistake the brief fall-back to status colors for a broken app.
// `belowControls` drops it under a row of map controls (the Station Network's
// grouping switcher), which would otherwise cover it.
export default function MapLoadingBadge({ label, belowControls = false }: { label?: string; belowControls?: boolean }) {
  return (
    <div className={`absolute ${belowControls ? 'top-14' : 'top-3'} left-1/2 -translate-x-1/2 z-[1000] pointer-events-none`}>
      <LoadingBadge label={label} />
    </div>
  );
}
