import { useState, useEffect, useRef } from 'react';
import type { Station, StationMonitor } from '../../types/api';
import { useLatestMeasurements } from '../../hooks/useMeasurements';
import { stationStatusKey, STATUS_DOT } from '../../theme';
import StationMeta from './StationMeta';
import LatestReadings from './LatestReadings';
import HistoryChart from './HistoryChart';

const MIN_HEIGHT = 140;   // px — enough to show header + tabs
const MAX_HEIGHT_RATIO = 0.88;

interface StationPanelProps {
  station: Station | null;
  monitorData: Record<string, StationMonitor>;
  onClose: () => void;
  onHeightChange?: (height: number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function StationPanel({ station, monitorData, onClose, onHeightChange, isFavorite, onToggleFavorite }: StationPanelProps) {
  const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
  const [tab, setTab] = useState<'readings' | 'meta'>('readings');
  const [panelHeight, setPanelHeight] = useState(() => Math.round(window.innerHeight * 0.5));
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const { data: measurements } = useLatestMeasurements(station?.station_id ?? null);

  // Notify parent whenever height or visibility changes.
  // Passes 0 when no station is selected — App uses this to know the panel is hidden
  // so the map/list container can expand to fill the full viewport.
  useEffect(() => {
    onHeightChange?.(station ? panelHeight : 0);
  }, [panelHeight, station, onHeightChange]);

  // Reset state when station changes
  useEffect(() => {
    setSelectedVarId(null);
    setTab('readings');
    scrollRef.current?.scrollTo({ top: 0 });
  }, [station?.station_id]);

  function handleSelectVar(varId: string) {
    setSelectedVarId(varId);
    // Scroll to chart (top of scroll area)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    // Pointer capture ensures drag events keep firing even when the cursor
    // leaves the drag handle element during a fast drag gesture.
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startHeight: panelHeight };
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY;
    const maxH = Math.round(window.innerHeight * MAX_HEIGHT_RATIO);
    setPanelHeight(Math.max(MIN_HEIGHT, Math.min(maxH, dragRef.current.startHeight + delta)));
  }

  function handleDragEnd() {
    dragRef.current = null;
  }

  if (!station) return null;

  const statusKey = stationStatusKey(station, monitorData);

  // Stale data: most recent measurement is older than 24h
  const isStale = (() => {
    if (!measurements || measurements.length === 0) return false;
    const newest = measurements.reduce((latest, m) =>
      new Date(m.timestamp) > new Date(latest.timestamp) ? m : latest
    );
    return Date.now() - new Date(newest.timestamp).getTime() > 24 * 60 * 60 * 1000;
  })();

  const selectedVarName = selectedVarId
    ? measurements?.find(m => m.variable === selectedVarId)?.variable_display_name ?? selectedVarId
    : null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 rounded-t-2xl shadow-2xl flex flex-col"
      style={{ height: panelHeight }}
    >
      {/* Draggable handle — tall touch target, thin visual pill */}
      <div
        className="flex justify-center items-center py-3 flex-shrink-0 cursor-row-resize touch-none select-none"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-4 pb-2 flex-shrink-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${STATUS_DOT[statusKey]}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {station.name ?? station.station_id}
              </h2>
              {isStale && (
                <span className="flex-shrink-0 text-sm font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                  Stale Data
                </span>
              )}
            </div>
            <p className="text-base text-slate-500 dark:text-slate-400">{station.island ?? 'Hawaii'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(station.station_id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                isFavorite
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                  : 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
              }`}
              aria-label={isFavorite ? 'Unsave Station' : 'Save Station'}
              title={isFavorite ? 'Unsave Station' : 'Save Station'}
            >
              {isFavorite ? 'Unsave' : 'Save'}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 px-4 flex-shrink-0">
        {(['readings', 'meta'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-base font-medium capitalize border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-sky-500 text-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t === 'readings' ? 'Readings' : 'Info'}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {tab === 'readings' && (
          <div className="px-4 pt-3 pb-6 space-y-4">
            {/* Chart */}
            <div ref={chartRef}>
              {selectedVarName && (
                <p className="text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                  {selectedVarName}
                </p>
              )}
              <HistoryChart stationId={station.station_id} varId={selectedVarId} />
            </div>

            {/* Readings grid */}
            <LatestReadings
              stationId={station.station_id}
              onSelectVar={handleSelectVar}
              selectedVarId={selectedVarId}
            />
          </div>
        )}

        {tab === 'meta' && (
          <div className="px-4 py-4">
            <StationMeta station={station} monitorData={monitorData} />
          </div>
        )}
      </div>
    </div>
  );
}
