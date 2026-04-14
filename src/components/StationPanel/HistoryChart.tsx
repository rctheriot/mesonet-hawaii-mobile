import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useHistoricalMeasurements } from '../../hooks/useMeasurements';
import { useAppContext } from '../../context/AppContext';
import { convertValue } from '../../utils/units';
import type { TimeRange } from '../../types/api';

interface HistoryChartProps {
  stationId: string;
  varId: string | null;
}

const RANGES: { label: string; value: TimeRange }[] = [
  { label: '1h', value: '1h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
];

export default function HistoryChart({ stationId, varId }: HistoryChartProps) {
  const [range, setRange] = useState<TimeRange>('24h');
  const { data, isLoading, isError } = useHistoricalMeasurements(stationId, varId, range);
  const { settings } = useAppContext();

  // Always render the same-height shell when no variable is selected.
  // This prevents the readings grid from jumping up/down as the chart mounts/unmounts.
  if (!varId) {
    return (
      <div className="space-y-2">
        <div className="flex gap-1 opacity-40 pointer-events-none">
          {RANGES.map(r => (
            <div key={r.value} className="px-3 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {r.label}
            </div>
          ))}
        </div>
        <div className="h-40 w-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <p className="text-slate-400 dark:text-slate-600 text-sm">Select a reading to view history</p>
        </div>
      </div>
    );
  }

  function formatTime(ts: string): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (range === '1h')  return `${hh}:${mm}`;
    if (range === '24h') return `${hh}:00`;
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }).toUpperCase();
  }

  const rawUnits = data?.[0]?.units ?? '';
  // Derive the display unit by converting a sample value — we only need the unit string
  const displayUnit = data?.[0]
    ? convertValue(0, rawUnits, settings.units, varId ?? undefined).unit
    : rawUnits;

  const chartData = (data ?? [])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .filter(m => m.value != null)
    .map(m => ({
      time: formatTime(m.timestamp),
      value: convertValue(Number(m.value), rawUnits, settings.units, varId ?? undefined).value,
    }));

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              range === r.value
                ? 'bg-sky-500 dark:bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="h-40 w-full">
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading chart…</p>
          </div>
        )}
        {isError && (
          <div className="h-full flex items-center justify-center">
            <p className="text-red-500 dark:text-red-400 text-sm">Failed to load history.</p>
          </div>
        )}
        {!isLoading && !isError && chartData.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No data for this period.</p>
          </div>
        )}
        {!isLoading && chartData.length > 0 && (
          // height must be a fixed px value (not "100%") because the parent div has no
          // intrinsic height in a flex context. minWidth={0} prevents overflow in narrow panels.
          <ResponsiveContainer width="100%" height={160} minWidth={0}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: 'var(--chart-tick, #64748b)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--chart-tick, #64748b)' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg, #ffffff)', border: '1px solid var(--chart-tooltip-border, #e2e8f0)', fontSize: 12 }}
                labelStyle={{ color: 'var(--chart-tick, #64748b)' }}
                itemStyle={{ color: '#0ea5e9' }}
                formatter={(value) => [`${value ?? ''}${displayUnit ? ` ${displayUnit}` : ''}`, '']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#38bdf8"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
