import type { Station, StationMonitor } from '../../types/api';
import { stationStatusKey, STATUS_BADGE, STATUS_LABEL } from '../../theme';

interface StationMetaProps {
  station: Station;
  monitorData: Record<string, StationMonitor>;
}

export default function StationMeta({ station, monitorData }: StationMetaProps) {
  const statusKey = stationStatusKey(station, monitorData);
  const fields = [
    { label: 'ID',        value: station.station_id },
    { label: 'Network',   value: station.network },
    { label: 'Island',    value: station.island },
    { label: 'Elevation', value: station.elevation != null ? `${station.elevation} m` : undefined },
    { label: 'Latitude',  value: station.lat?.toFixed(5) },
    { label: 'Longitude', value: station.lng?.toFixed(5) },
  ].filter(f => f.value != null);

  const allFields = [
    { label: 'Status',    value: <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[statusKey]}`}>{STATUS_LABEL[statusKey]}</span> },
    ...fields.map(({ label, value }) => ({ label, value: <span>{String(value)}</span> })),
  ];

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {allFields.map(({ label, value }) => (
        <div key={label} className="flex items-center py-2.5 text-sm">
          <span className="w-24 flex-shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
          <span className="text-slate-800 dark:text-slate-100">{value}</span>
        </div>
      ))}
    </div>
  );
}
