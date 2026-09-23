import type { MapMode } from './MapLegend';
import type { RegionConfig } from '../../config/regions.data';

export interface MapModeOption { mode: MapMode; label: string }

const BASE_MAP_MODE_OPTIONS: MapModeOption[] = [
  { mode: 'status',        label: 'Status'         },
  { mode: 'Tair_1_Avg',   label: 'Air Temp'       },
  { mode: 'RH_1_Avg',     label: 'Humidity'       },
  { mode: 'SWin_1_Avg',   label: 'Radiation'      },
  { mode: 'RF_1_Tot300s', label: 'Rainfall (24hr)'},
  { mode: 'SM_1_Avg',     label: 'Soil Moisture'  },
  { mode: 'Tsoil_1_Avg',  label: 'Soil Temp'      },
  { mode: 'WS_1_Avg',     label: 'Wind'           },
];

const WATER_LEVEL_OPTION: MapModeOption = { mode: 'Wlvl_1_Avg', label: 'Water Level' };

// Station Network map modes for a region. Pure (takes the region explicitly) so
// tests can check every region regardless of which one the build targets.
export function mapModeOptions(region: Pick<RegionConfig, 'streamGauges'>): MapModeOption[] {
  return region.streamGauges
    ? [...BASE_MAP_MODE_OPTIONS, WATER_LEVEL_OPTION]
    : BASE_MAP_MODE_OPTIONS;
}
