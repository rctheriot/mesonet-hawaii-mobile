import { LuLoaderCircle } from 'react-icons/lu';

// Small pill shown over the map while variable data is downloading, so users
// don't mistake the brief fall-back to status colors for a broken app.
export default function MapLoadingBadge({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur border border-slate-200 dark:border-zinc-700 shadow-md">
        <LuLoaderCircle size={14} className="animate-spin text-sky-500 dark:text-sky-400" />
        <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">{label}</span>
      </div>
    </div>
  );
}
