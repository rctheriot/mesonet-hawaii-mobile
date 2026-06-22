import type { Station } from '../../types/api';
import { stationStatusKey, STATUS_BADGE, STATUS_LABEL } from '../../theme';
import { useAppContext } from '../../context/AppContext';

interface StationMetaProps {
  station: Station;
}

export default function StationMeta({ station }: StationMetaProps) {
  const { settings } = useAppContext();
  const statusKey = stationStatusKey(station);

  const elevationDisplay = station.elevation != null
    ? settings.units === 'imperial'
      ? `${Math.round(station.elevation * 3.28084)} ft`
      : `${Math.round(station.elevation)} m`
    : undefined;

  const fields = [
    { label: 'ID',        value: station.station_id },
    { label: 'Network',   value: station.network },
    { label: 'Island',    value: station.island },
    { label: 'Elevation', value: elevationDisplay },
    // 2dp ≈ ±1 km precision — intentionally coarse to obscure exact install location.
    { label: 'Latitude',  value: station.lat?.toFixed(2) },
    { label: 'Longitude', value: station.lng?.toFixed(2) },
  ].filter(f => f.value != null);

  const allFields = [
    { label: 'Status',    value: <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[statusKey]}`}>{STATUS_LABEL[statusKey]}</span> },
    ...fields.map(({ label, value }) => ({ label, value: <span>{String(value)}</span> })),
  ];

  return (
    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
      {allFields.map(({ label, value }) => (
        <div key={label} className="flex items-center py-3 text-base">
          <span className="w-24 flex-shrink-0 text-slate-500 dark:text-zinc-400">{label}</span>
          <span className="text-slate-800 dark:text-zinc-100">{value}</span>
        </div>
      ))}
    </div>
  );
}
