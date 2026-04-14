import type { Station, StationMonitor } from './types/api';

// ─── Status keys ──────────────────────────────────────────────────────────────
export type StatusKey = 'active' | 'inactive' | 'planned' | 'unknown';

// ─── Hex colors (used for MapLibre markers) ───────────────────────────────────
export const STATUS_HEX: Record<StatusKey, string> = {
  active:   '#22c55e', // green-500
  inactive: '#ef4444', // red-500
  planned:  '#eab308', // yellow-500
  unknown:  '#94a3b8', // slate-400
};

// Whether the marker should be rendered hollow (dashed outline, no fill)
export const STATUS_HOLLOW: Record<StatusKey, boolean> = {
  active:   false,
  inactive: false,
  planned:  false,
  unknown:  false,
};

// ─── Tailwind classes (used for UI badges, dots, and text) ────────────────────
export const STATUS_BADGE: Record<StatusKey, string> = {
  active:   'bg-green-100   dark:bg-green-900/40  text-green-800   dark:text-green-400   border border-green-300   dark:border-green-700',
  inactive: 'bg-red-100     dark:bg-red-900/40    text-red-800     dark:text-red-400     border border-red-300     dark:border-red-700',
  planned:  'bg-yellow-100  dark:bg-yellow-900/40 text-yellow-800  dark:text-yellow-400  border border-yellow-300  dark:border-yellow-700',
  unknown:  'bg-slate-100   dark:bg-slate-800     text-slate-600   dark:text-slate-400   border border-slate-300   dark:border-slate-600',
};

export const STATUS_DOT: Record<StatusKey, string> = {
  active:   'bg-green-500',
  inactive: 'bg-red-500',
  planned:  'bg-yellow-500',
  unknown:  'bg-slate-400',
};

export const STATUS_TEXT: Record<StatusKey, string> = {
  active:   'text-green-600  dark:text-green-400',
  inactive: 'text-red-600    dark:text-red-400',
  planned:   'text-yellow-600 dark:text-yellow-400',
  unknown:  'text-slate-500  dark:text-slate-400',
};

export const STATUS_LABEL: Record<StatusKey, string> = {
  active:   'Active',
  inactive: 'Inactive',
  planned:  'Planned',
  unknown:  'Unknown',
};

// ─── Derive the effective status key for a station ────────────────────────────
// Status comes from the database only — we do not override based on monitor data.
// The monitor parameter is retained for call-site compatibility but is not used.
export function stationStatusKey(
  station: Station,
  _monitor?: Record<string, StationMonitor>
): StatusKey {
  if (station.status === 'active')   return 'active';
  if (station.status === 'inactive') return 'inactive';
  if (station.status === 'planned')  return 'planned';
  return 'unknown';
}
