export interface Station {
  station_id: string;
  name: string;
  lat: number;
  lng: number;
  elevation?: number;
  network?: string;
  island?: string;
  status?: 'active' | 'planned' | 'inactive';
  [key: string]: unknown;
}

export interface Variable {
  standard_name: string;
  display_name: string;
  units?: string;
  [key: string]: unknown;
}

export interface Measurement {
  station_id: string;
  variable: string;
  value: string | number | null;
  timestamp: string;
  flag?: number;
  // When join_metadata=true, these may be present
  variable_display_name?: string;
  units?: string;
  [key: string]: unknown;
}

// Monitor data: presence of a station_id key means it reported in the last 24h
export interface StationMonitor {
  '24hr_min'?: Record<string, number>;
  '24hr_max'?: Record<string, number>;
  [key: string]: unknown;
}

export type TimeRange = '1h' | '24h' | '7d';
