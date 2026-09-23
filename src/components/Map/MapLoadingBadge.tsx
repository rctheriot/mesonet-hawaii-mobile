import LoadingBadge from '../LoadingBadge';

// Loading pill overlaid on the map while variable data is downloading, so users
// don't mistake the brief fall-back to status colors for a broken app.
export default function MapLoadingBadge({ label }: { label?: string }) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <LoadingBadge label={label} />
    </div>
  );
}
