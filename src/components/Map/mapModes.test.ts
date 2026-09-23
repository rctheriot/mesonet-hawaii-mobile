import { describe, it, expect } from 'vitest';
import { mapModeOptions } from './mapModes';
import { REGIONS } from '../../config/regions.data';

const modes = (region: { streamGauges: boolean }) => mapModeOptions(region).map(o => o.mode);

describe('mapModeOptions', () => {
  it('offers Water Level only in regions with stream gauges', () => {
    expect(modes({ streamGauges: true })).toContain('Wlvl_1_Avg');
    expect(modes({ streamGauges: false })).not.toContain('Wlvl_1_Avg');
  });

  it('keeps Water Level out of Hawaii and in American Samoa', () => {
    expect(modes(REGIONS.hawaii)).not.toContain('Wlvl_1_Avg');
    expect(modes(REGIONS.american_samoa)).toContain('Wlvl_1_Avg');
  });

  it('starts with Status in every region', () => {
    for (const region of Object.values(REGIONS)) expect(modes(region)[0]).toBe('status');
  });
});
