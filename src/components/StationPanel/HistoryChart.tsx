import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useHistoricalMeasurements } from '../../hooks/useMeasurements';
import { useAppContext } from '../../context/AppContext';
import { convertValue, formatValue, getVariableLabel } from '../../utils/units';
import type { TimeRange } from '../../types/api';

interface HistoryChartProps {
  stationId: string;
  varId: string | null;
  varId2?: string | null;
}

const RANGES: { label: string; value: TimeRange }[] = [
  { label: '6h',  value: '6h' },
  { label: '24h', value: '24h' },
  { label: '3d',  value: '3d' },
  { label: '7d',  value: '7d' },
];

function generateTicks(range: TimeRange, now: number): number[] {
  if (range === '6h') {
    const start = now - 6 * 60 * 60 * 1000;
    return [0, 1, 2, 3, 4, 5, 6].map(h => start + h * 60 * 60 * 1000);
  }
  if (range === '24h') {
    const start = now - 24 * 60 * 60 * 1000;
    return [0, 4, 8, 12, 16, 20, 24].map(h => start + h * 60 * 60 * 1000);
  }
  if (range === '3d') {
    const start = now - 3 * 24 * 60 * 60 * 1000;
    return [0, 12, 24, 36, 48, 60, 72].map(h => start + h * 60 * 60 * 1000);
  }
  const ticks: number[] = [];
  const rangeStart = now - 7 * 24 * 60 * 60 * 1000;
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  for (let i = 0; i <= 8; i++) {
    const t = todayMidnight.getTime() - i * 24 * 60 * 60 * 1000;
    if (t >= rangeStart && t <= now) ticks.unshift(t);
  }
  return ticks;
}

function formatTick(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === '6h' || range === '24h') {
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }
  if (range === '3d') {
    const h = d.getHours();
    if (h === 0) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${String(h).padStart(2, '0')}:00`;
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

function formatLabel(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === '6h' || range === '24h') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '3d') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type SeriesStats =
  | { kind: 'rainfall'; total: number }
  | { kind: 'series'; min: number; avg: number; max: number };

function computeStats(values: number[], isRainfall: boolean): SeriesStats {
  if (isRainfall) return { kind: 'rainfall', total: values.reduce((s, v) => s + v, 0) };
  return {
    kind: 'series',
    min: Math.min(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    max: Math.max(...values),
  };
}

function StatsRow({ stats, varId, displayUnit, color, label }: {
  stats: SeriesStats;
  varId: string | null;
  displayUnit: string;
  color: 'sky' | 'amber';
  label: string;
}) {
  const dotClass = color === 'sky' ? 'bg-sky-400' : 'bg-amber-400';
  return (
    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
      <div className="flex items-center gap-1.5 min-w-0 mr-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <span className="truncate text-slate-600 dark:text-zinc-300">{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {stats.kind === 'rainfall' ? (
          <>
            <span className="text-slate-400 dark:text-zinc-500">total </span>
            <span className="font-medium text-slate-700 dark:text-zinc-200">{formatValue(stats.total, varId ?? undefined)}</span>
            {displayUnit && <span className="text-slate-400 dark:text-zinc-500">{displayUnit}</span>}
          </>
        ) : (
          <>
            <span><span className="text-slate-400 dark:text-zinc-500">min </span><span className="font-medium text-slate-700 dark:text-zinc-200">{formatValue(stats.min, varId ?? undefined)}</span></span>
            <span><span className="text-slate-400 dark:text-zinc-500">avg </span><span className="font-medium text-slate-700 dark:text-zinc-200">{formatValue(stats.avg, varId ?? undefined)}</span></span>
            <span><span className="text-slate-400 dark:text-zinc-500">max </span><span className="font-medium text-slate-700 dark:text-zinc-200">{formatValue(stats.max, varId ?? undefined)}</span></span>
            {displayUnit && <span className="text-slate-400 dark:text-zinc-500">{displayUnit}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export default function HistoryChart({ stationId, varId, varId2 }: HistoryChartProps) {
  const [range, setRange] = useState<TimeRange>('24h');
  const { settings } = useAppContext();

  const { data: data0, isLoading: loading0, isError: error0 } = useHistoricalMeasurements(stationId, varId, range);
  const { data: data1, isLoading: loading1, isError: error1 } = useHistoricalMeasurements(stationId, varId2 ?? null, range);

  // Snapshot "now" once per range change so domain and ticks stay consistent within a render.
  // Intentionally NOT updated on every render — [range] dep is correct, not a missing dep.
  const now = useMemo(() => Date.now(), [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const rangeMs: Record<TimeRange, number> = {
    '6h':  6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '3d':  3 * 24 * 60 * 60 * 1000,
    '7d':  7 * 24 * 60 * 60 * 1000,
  };

  const domain: [number, number] = [now - rangeMs[range], now];
  const ticks = useMemo(() => generateTicks(range, now), [range, now]);

  const isRainfall0 = varId ? /^RF/.test(varId) : false;
  const isRainfall1 = varId2 ? /^RF/.test(varId2) : false;

  const rawUnits0 = data0?.[0]?.units ?? '';
  const rawUnits1 = data1?.[0]?.units ?? '';
  const displayUnit0 = data0?.[0] ? convertValue(0, rawUnits0, settings.units, varId ?? undefined).unit : rawUnits0;
  const displayUnit1 = data1?.[0] ? convertValue(0, rawUnits1, settings.units, varId2 ?? undefined).unit : rawUnits1;

  const label0 = varId ? getVariableLabel(varId, data0?.[0]?.variable_display_name) : '';
  const label1 = varId2 ? getVariableLabel(varId2, data1?.[0]?.variable_display_name) : '';

  const chartData0 = useMemo(() =>
    (data0 ?? [])
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .filter(m => m.value != null)
      .map(m => ({
        ts: new Date(m.timestamp).getTime(),
        value: convertValue(Number(m.value), rawUnits0, settings.units, varId ?? undefined).value,
      })),
  [data0, rawUnits0, settings.units, varId]);

  const chartData1 = useMemo(() =>
    (data1 ?? [])
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .filter(m => m.value != null)
      .map(m => ({
        ts: new Date(m.timestamp).getTime(),
        value: convertValue(Number(m.value), rawUnits1, settings.units, varId2 ?? undefined).value,
      })),
  [data1, rawUnits1, settings.units, varId2]);

  // Recharts requires a single data array for both the shared X axis and the hover tooltip
  // to interpolate correctly. Two independent fetches may have non-overlapping timestamps,
  // so we merge by exact ts: points present in only one series get null for the other,
  // which Recharts renders as a gap (connectNulls=false).
  const mergedData = useMemo(() => {
    const map = new Map<number, { ts: number; v0: number | null; v1: number | null }>();
    for (const d of chartData0) map.set(d.ts, { ts: d.ts, v0: d.value, v1: null });
    for (const d of chartData1) {
      const e = map.get(d.ts);
      if (e) e.v1 = d.value;
      else map.set(d.ts, { ts: d.ts, v0: null, v1: d.value });
    }
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }, [chartData0, chartData1]);

  const stats0 = useMemo(() =>
    chartData0.length > 0 ? computeStats(chartData0.map(d => d.value), isRainfall0) : null,
  [chartData0, isRainfall0]);

  const stats1 = useMemo(() =>
    varId2 && chartData1.length > 0 ? computeStats(chartData1.map(d => d.value), isRainfall1) : null,
  [chartData1, isRainfall1, varId2]);

  const isLoading = loading0 || (!!varId2 && loading1);
  const isError = error0 || (!!varId2 && error1);
  const hasData = mergedData.length > 0;

  if (!varId) {
    return (
      <div className="space-y-2">
        <div className="h-40 w-full flex items-center justify-center border border-dashed border-slate-200 dark:border-zinc-700 rounded-lg">
          <p className="text-slate-400 dark:text-zinc-600 text-sm">Select a reading to view history</p>
        </div>
        <div className="flex gap-1 opacity-40 pointer-events-none">
          {RANGES.map(r => (
            <div key={r.value} className="px-3 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
              {r.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stats rows — full width, stacked */}
      {(stats0 || stats1) && (
        <div className="space-y-1">
          {stats0 && (
            <StatsRow stats={stats0} varId={varId} displayUnit={displayUnit0} color="sky" label={label0} />
          )}
          {stats1 && (
            <StatsRow stats={stats1} varId={varId2 ?? null} displayUnit={displayUnit1} color="amber" label={label1} />
          )}
        </div>
      )}

      {/* Chart */}
      <div className="h-40 w-full">
        {isLoading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-500 dark:text-zinc-400 text-sm">Loading chart…</p>
          </div>
        )}
        {isError && (
          <div className="h-full flex items-center justify-center">
            <p className="text-red-500 dark:text-red-400 text-sm">Failed to load history.</p>
          </div>
        )}
        {!isLoading && !isError && !hasData && (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-500 dark:text-zinc-400 text-sm">No data for this period.</p>
          </div>
        )}
        {!isLoading && hasData && (
          <ResponsiveContainer width="100%" height={160} minWidth={0}>
            <ComposedChart data={mergedData} margin={{ top: 4, right: varId2 ? 4 : 4, left: 0, bottom: 0 }}>
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
              <YAxis
                yAxisId="0"
                width={36}
                tick={{ fontSize: 10, fill: varId2 ? '#38bdf8' : 'var(--chart-tick, #64748b)' }}
                axisLine={varId2 ? { stroke: '#38bdf8' } : { stroke: 'var(--chart-grid, #e2e8f0)' }}
                tickLine={varId2 ? { stroke: '#38bdf8' } : undefined}
                tickFormatter={(v) => formatValue(Number(v), varId ?? undefined)}
              />
              {varId2 && (
                <YAxis
                  yAxisId="1"
                  orientation="right"
                  width={36}
                  tick={{ fontSize: 10, fill: '#f59e0b' }}
                  axisLine={{ stroke: '#f59e0b' }}
                  tickLine={{ stroke: '#f59e0b' }}
                  tickFormatter={(v) => formatValue(Number(v), varId2 ?? undefined)}
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
                  border: '1px solid var(--chart-tooltip-border, #e2e8f0)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--chart-tick, #64748b)' }}
                labelFormatter={(ts) => formatLabel(Number(ts), range)}
                formatter={(value, name) => {
                  if (name === 'v0') return [
                    `${formatValue(Number(value), varId ?? undefined)}${displayUnit0 ? ` ${displayUnit0}` : ''}`,
                    label0,
                  ];
                  if (name === 'v1') return [
                    `${formatValue(Number(value), varId2 ?? undefined)}${displayUnit1 ? ` ${displayUnit1}` : ''}`,
                    label1,
                  ];
                  return [String(value), String(name)];
                }}
              />
              {isRainfall0
                ? <Bar dataKey="v0" yAxisId="0" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                : <Line type="monotone" dataKey="v0" yAxisId="0" stroke="#38bdf8" dot={false} strokeWidth={2} connectNulls={false} />
              }
              {varId2 && (isRainfall1
                ? <Bar dataKey="v1" yAxisId="1" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                : <Line type="monotone" dataKey="v1" yAxisId="1" stroke="#f59e0b" dot={false} strokeWidth={2} connectNulls={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Range buttons — below chart */}
      <div className="flex gap-1">
        {RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              range === r.value
                ? 'bg-sky-500 dark:bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-600'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
