import {
  TEMP_RANGE_C,   TEMP_GRADIENT_CSS,
  WIND_RANGE_MS,  WIND_GRADIENT_CSS,
  RH_RANGE,       RH_GRADIENT_CSS,
  SM_RANGE,       SM_GRADIENT_CSS,
  SW_RANGE,       SW_GRADIENT_CSS,
  RAIN_RANGE_MM,  RAIN_GRADIENT_CSS,
} from '../../utils/mapColor';
import { convertValue } from '../../utils/units';
import type { UnitSystem } from '../../utils/units';

export type MapMode =
  | 'status'
  | 'Tair_1_Avg'
  | 'WS_1_Avg'
  | 'RH_1_Avg'
  | 'RF_1_Tot300s'
  | 'Tsoil_1_Avg'
  | 'SM_1_Avg'
  | 'SWin_1_Avg';

interface MapLegendProps {
  mode: MapMode;
  units: UnitSystem;
}

const STATUS_ENTRIES = [
  { color: '#22c55e', label: 'Active' },
  { color: '#ef4444', label: 'Inactive' },
  { color: '#eab308', label: 'Planned' },
  { color: '#94a3b8', label: 'No data' },
];

interface GradientConfig {
  title: string;
  gradient: string;
  minLabel: string;
  maxLabel: string;
}

function tempConfig(units: UnitSystem): GradientConfig {
  const min = convertValue(TEMP_RANGE_C.min, '°C', units, 'Tair_1_Avg');
  const max = convertValue(TEMP_RANGE_C.max, '°C', units, 'Tair_1_Avg');
  return {
    title: 'Air Temperature',
    gradient: TEMP_GRADIENT_CSS,
    minLabel: `${Math.round(min.value)}°${units === 'imperial' ? 'F' : 'C'}`,
    maxLabel: `${Math.round(max.value)}°${units === 'imperial' ? 'F' : 'C'}`,
  };
}

function windConfig(units: UnitSystem): GradientConfig {
  const min = convertValue(WIND_RANGE_MS.min, 'm/s', units);
  const max = convertValue(WIND_RANGE_MS.max, 'm/s', units);
  const unit = min.unit;
  return {
    title: 'Wind Speed',
    gradient: WIND_GRADIENT_CSS,
    minLabel: `${Math.round(min.value)} ${unit}`,
    maxLabel: `${Math.round(max.value)} ${unit}`,
  };
}

function rhConfig(): GradientConfig {
  return {
    title: 'Rel. Humidity',
    gradient: RH_GRADIENT_CSS,
    minLabel: `${RH_RANGE.min}%`,
    maxLabel: `${RH_RANGE.max}%`,
  };
}

function soilTempConfig(units: UnitSystem): GradientConfig {
  const min = convertValue(TEMP_RANGE_C.min, '°C', units, 'Tsoil_1_Avg');
  const max = convertValue(TEMP_RANGE_C.max, '°C', units, 'Tsoil_1_Avg');
  return {
    title: 'Soil Temperature',
    gradient: TEMP_GRADIENT_CSS,
    minLabel: `${Math.round(min.value)}°${units === 'imperial' ? 'F' : 'C'}`,
    maxLabel: `${Math.round(max.value)}°${units === 'imperial' ? 'F' : 'C'}`,
  };
}

function smConfig(): GradientConfig {
  return {
    title: 'Soil Moisture',
    gradient: SM_GRADIENT_CSS,
    minLabel: `${SM_RANGE.min}%`,
    maxLabel: `${SM_RANGE.max}%`,
  };
}

function swConfig(): GradientConfig {
  return {
    title: 'Radiation',
    gradient: SW_GRADIENT_CSS,
    minLabel: `${SW_RANGE.min} W/m²`,
    maxLabel: `${SW_RANGE.max} W/m²`,
  };
}

function rainConfig(units: UnitSystem): GradientConfig {
  const min = convertValue(RAIN_RANGE_MM.min, 'mm', units);
  const max = convertValue(RAIN_RANGE_MM.max, 'mm', units);
  const unit = min.unit;
  const dec = unit === 'in' ? 2 : 0;
  return {
    title: 'Rainfall (24hr)',
    gradient: RAIN_GRADIENT_CSS,
    minLabel: `${min.value.toFixed(dec)} ${unit}`,
    maxLabel: `${max.value.toFixed(dec)} ${unit}`,
  };
}

export default function MapLegend({ mode, units }: MapLegendProps) {
  if (mode === 'status') {
    return (
      <div className="absolute bottom-3 left-3 z-[40] bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded-xl px-3 py-2 shadow border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300">
        <p className="font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide text-[10px] mb-1">Station Status</p>
        {STATUS_ENTRIES.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 mt-0.5">
            <span style={{ background: color }} className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  }

  const cfg =
    mode === 'Tair_1_Avg'    ? tempConfig(units) :
    mode === 'Tsoil_1_Avg'   ? soilTempConfig(units) :
    mode === 'WS_1_Avg'      ? windConfig(units) :
    mode === 'RH_1_Avg'      ? rhConfig() :
    mode === 'SM_1_Avg'      ? smConfig() :
    mode === 'SWin_1_Avg'    ? swConfig() :
                               rainConfig(units);

  return (
    <div className="absolute bottom-3 left-3 z-[40] bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded-xl px-3 py-2 shadow border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 w-36">
      <p className="font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide text-[10px] mb-1.5">{cfg.title}</p>
      <div className="h-2.5 rounded-full w-full" style={{ background: cfg.gradient }} />
      <div className="flex justify-between mt-1 text-[10px] text-slate-500 dark:text-zinc-400">
        <span>{cfg.minLabel}</span>
        <span>{cfg.maxLabel}</span>
      </div>
    </div>
  );
}
