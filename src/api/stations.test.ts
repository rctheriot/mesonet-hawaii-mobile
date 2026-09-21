import { describe, it, expect } from 'vitest';
import { islandFromCoordsIn } from './stations';
import { REGIONS } from '../config/regions.data';

// Driven with an explicit region config rather than the build's REGION, so the
// suite asserts the same thing no matter which region the build targets.
const hi = REGIONS.hawaii;
const as = REGIONS.american_samoa;

const inHawaii = (lat: number, lng: number) =>
  islandFromCoordsIn(hi.subRegions, hi.regionLabel, lat, lng);
const inSamoa = (lat: number, lng: number) =>
  islandFromCoordsIn(as.subRegions, as.regionLabel, lat, lng);

// Representative coordinates near the center of each island's populated areas.
describe('islandFromCoordsIn — Hawaii', () => {
  it('identifies each main island from representative coordinates', () => {
    expect(inHawaii(22.05, -159.5)).toBe('Kauaʻi');    // Lihuʻe area
    expect(inHawaii(21.45, -157.97)).toBe('Oʻahu');    // Honolulu area
    expect(inHawaii(21.13, -157.0)).toBe('Molokaʻi');  // Kaunakakai area
    expect(inHawaii(20.83, -156.92)).toBe('Lānaʻi');   // Lānaʻi City area
    expect(inHawaii(20.8, -156.33)).toBe('Maui');      // central Maui
    expect(inHawaii(19.7, -155.08)).toBe('Hawaiʻi Island'); // Hilo area
  });

  it('respects the order dependency for overlapping latitude ranges', () => {
    // Oʻahu and Molokaʻi/Lānaʻi share latitudes; longitude disambiguates them,
    // and Oʻahu is listed first so its box wins where ranges touch.
    expect(inHawaii(21.2, -157.9)).toBe('Oʻahu');
    expect(inHawaii(21.2, -157.0)).toBe('Molokaʻi');
  });

  it('falls back to the region label for finite coords outside every island box', () => {
    // A point in open ocean north of the chain — finite but unmatched.
    expect(inHawaii(22.5, -156.0)).toBe('Hawaii');
  });

  it('returns "Unknown" for non-finite coordinates (e.g. a repeater with no fixed location)', () => {
    // Regression: the API sends null lat/lng for some stations. These must not be
    // coerced to (0,0) and mislabeled "Hawaiʻi Island".
    expect(inHawaii(NaN, NaN)).toBe('Unknown');
    expect(inHawaii(0, 0)).not.toBe('Hawaiʻi Island');
    expect(inHawaii(0, 0)).toBe('Unknown');
  });
});

// Coordinates below are the real lat/lng of deployed American Samoa stations.
describe('islandFromCoordsIn — American Samoa', () => {
  it('identifies Tutuila stations', () => {
    expect(inSamoa(-14.319626, -170.830723)).toBe('Tutuila'); // Poloa
    expect(inSamoa(-14.282866, -170.710529)).toBe('Tutuila'); // Vaipito
    expect(inSamoa(-14.253399, -170.570965)).toBe('Tutuila'); // Tula, east end
  });

  it('identifies Aunuʻu, whose box sits inside Tutuila’s and so is listed first', () => {
    expect(inSamoa(-14.285161, -170.553535)).toBe('Aunuʻu');
  });

  it('falls back to the region label for open ocean, and Unknown for bad coords', () => {
    expect(inSamoa(-14.0, -169.5)).toBe('American Samoa'); // near Manuʻa, no box
    expect(inSamoa(NaN, NaN)).toBe('Unknown');
    expect(inSamoa(0, 0)).toBe('Unknown');
  });

  // Southern-hemisphere latitudes are negative, so "south" is the more negative
  // value. A bounds check written for Hawaii's positive latitudes silently
  // inverts here — this pins that it doesn't.
  it('handles negative latitudes without inverting the bounds check', () => {
    expect(inSamoa(-14.40, -170.87)).toBe('Tutuila'); // exact SW corner
    expect(inSamoa(-14.22, -170.53)).toBe('Tutuila'); // exact NE corner
    expect(inSamoa(-14.45, -170.87)).toBe('American Samoa'); // just south of the box
  });
});
