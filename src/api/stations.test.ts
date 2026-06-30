import { describe, it, expect } from 'vitest';
import { islandFromCoords } from './stations';

// Representative coordinates near the center of each island's populated areas.
describe('islandFromCoords', () => {
  it('identifies each main island from representative coordinates', () => {
    expect(islandFromCoords(22.05, -159.5)).toBe('Kauaʻi');    // Lihuʻe area
    expect(islandFromCoords(21.45, -157.97)).toBe('Oʻahu');    // Honolulu area
    expect(islandFromCoords(21.13, -157.0)).toBe('Molokaʻi');  // Kaunakakai area
    expect(islandFromCoords(20.83, -156.92)).toBe('Lānaʻi');   // Lānaʻi City area
    expect(islandFromCoords(20.8, -156.33)).toBe('Maui');      // central Maui
    expect(islandFromCoords(19.7, -155.08)).toBe('Hawaiʻi Island'); // Hilo area
  });

  it('respects the order dependency for overlapping latitude ranges', () => {
    // Oʻahu and Molokaʻi/Lānaʻi share latitudes; longitude disambiguates them,
    // and Oʻahu is tested first so its box wins where ranges touch.
    expect(islandFromCoords(21.2, -157.9)).toBe('Oʻahu');
    expect(islandFromCoords(21.2, -157.0)).toBe('Molokaʻi');
  });

  it('falls back to generic "Hawaii" for finite coords outside every island box', () => {
    // A point in open ocean north of the chain — finite but unmatched.
    expect(islandFromCoords(22.5, -156.0)).toBe('Hawaii');
  });

  it('returns "Unknown" for non-finite coordinates (e.g. a repeater with no fixed location)', () => {
    // Regression: the API sends null lat/lng for some stations. These must not be
    // coerced to (0,0) and mislabeled "Hawaiʻi Island".
    expect(islandFromCoords(NaN, NaN)).toBe('Unknown');
    expect(islandFromCoords(0, 0)).not.toBe('Hawaiʻi Island');
  });
});
