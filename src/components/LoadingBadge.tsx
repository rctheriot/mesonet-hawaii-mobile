import { LuLoaderCircle } from 'react-icons/lu';

// Tinted "Loading data…" pill shown while readings first download. Tinted rather
// than neutral so it reads as a status at a glance on both the maps and the lists.
// Positioning is left to the caller (MapLoadingBadge overlays it on a map).
export default function LoadingBadge({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50/95 dark:bg-sky-950/90 backdrop-blur border border-sky-300 dark:border-sky-700 shadow-md"
    >
      <LuLoaderCircle size={14} className="animate-spin text-sky-600 dark:text-sky-300" />
      <span className="text-xs font-semibold text-sky-800 dark:text-sky-100">{label}</span>
    </div>
  );
}
