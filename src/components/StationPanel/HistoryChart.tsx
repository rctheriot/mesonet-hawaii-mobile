import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

// Generate evenly-spaced tick timestamps for a given range.
// These are computed from the fixed range window, independent of data density.
function generateTicks(range: TimeRange, now: number): number[] {
  if (range === '1h') {
    const start = now - 60 * 60 * 1000;
    // Every 15 minutes: 0, 15, 30, 45, 60
    return [0, 15, 30, 45, 60].map(m => start + m * 60 * 1000);
  }
  if (range === '24h') {
    const start = now - 24 * 60 * 60 * 1000;
    // Every 4 hours: 0, 4, 8, 12, 16, 20, 24
    return [0, 4, 8, 12, 16, 20, 24].map(h => start + h * 60 * 60 * 1000);
  }
  // 7d: one tick per calendar midnight within the range
  const ticks: number[] = [];
  const rangeStart = now - 7 * 24 * 60 * 60 * 1000;
  // Start from today's midnight and walk back 8 days
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 8; i++) {
    const t = todayMidnight.getTime() - i * 24 * 60 * 60 * 1000;
    if (t >= rangeStart && t <= now) ticks.unshift(t);
  }
  return ticks;
}

// Format a tick timestamp for display on the X-axis.
function formatTick(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === '1h') {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  if (range === '24h') {
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }
  // 7d: "Wed 1"
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

// Format the tooltip label (shown at the top of the hover popup).
function formatLabel(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === '1h' || range === '24h') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryChart({ stationId, varId }: HistoryChartProps) {
  const [range, setRange] = useState<TimeRange>('24h');
  const { data, isLoading, isError } = useHistoricalMeasurements(stationId, varId, range);
  const { settings } = useAppContext();

  // Snapshot "now" once per render so domain and ticks stay consistent.
  const now = useMemo(() => Date.now(), [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const rangeMs: Record<TimeRange, number> = {
    '1h':  1 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d':  7 * 24 * 60 * 60 * 1000,
  };

  const domain: [number, number] = [now - rangeMs[range], now];
  const ticks = useMemo(() => generateTicks(range, now), [range, now]);

  // Rainfall variables should use a bar chart to show discrete accumulation periods
  const isRainfall = varId ? /^RF/.test(varId) : false;

  const rawUnits = data?.[0]?.units ?? '';
  const displayUnit = data?.[0]
    ? convertValue(0, rawUnits, settings.units, varId ?? undefined).unit
    : rawUnits;

  // chartData uses numeric epoch (ts) as the X key — this enables Recharts to interpolate
  // the tooltip position smoothly across the full axis range rather than snapping to data points.
  const chartData = useMemo(() => {
    return (data ?? [])
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .filter(m => m.value != null)
      .map(m => ({
        ts: new Date(m.timestamp).getTime(),
        value: convertValue(Number(m.value), rawUnits, settings.units, varId ?? undefined).value,
      }));
  }, [data, rawUnits, settings.units, varId]);

  // Always render the same-height shell when no variable is selected.
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
          <ResponsiveContainer width="100%" height={160} minWidth={0}>
            {isRainfall ? (
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={domain}
                  ticks={ticks}
                  tickFormatter={(ts: number) => formatTick(ts, range)}
                  tick={{ fontSize: 10, fill: 'var(--chart-tick, #64748b)' }}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick, #64748b)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
                    border: '1px solid var(--chart-tooltip-border, #e2e8f0)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--chart-tick, #64748b)' }}
                  itemStyle={{ color: '#0ea5e9' }}
                  labelFormatter={(ts) => formatLabel(Number(ts), range)}
                  formatter={(value) => [`${value ?? ''}${displayUnit ? ` ${displayUnit}` : ''}`, '']}
                />
                <Bar dataKey="value" fill="#38bdf8" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={domain}
                  ticks={ticks}
                  tickFormatter={(ts: number) => formatTick(ts, range)}
                  tick={{ fontSize: 10, fill: 'var(--chart-tick, #64748b)' }}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--chart-tick, #64748b)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
                    border: '1px solid var(--chart-tooltip-border, #e2e8f0)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--chart-tick, #64748b)' }}
                  itemStyle={{ color: '#0ea5e9' }}
                  labelFormatter={(ts) => formatLabel(Number(ts), range)}
                  formatter={(value) => [`${value ?? ''}${displayUnit ? ` ${displayUnit}` : ''}`, '']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  dot={false}
                  strokeWidth={2}
                  connectNulls={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
