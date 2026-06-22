export interface Station {
  station_id: string;
  name: string;
  full_name?: string;   // Includes proper Hawaiian diacriticals when available
  lat: number;
  lng: number;
  elevation?: number;
  network?: string;
  island?: string;
  status?: 'active' | 'planned' | 'inactive';
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

export type TimeRange = '6h' | '24h' | '3d' | '7d';
