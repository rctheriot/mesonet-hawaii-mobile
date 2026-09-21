import { useState, useCallback } from 'react';
import { REGION } from '../config/regions';

interface Settings {
  darkMode: boolean;
  view: 'map' | 'list';
  homeVarId: string | null;
  units: 'metric' | 'imperial';
  mapMode: string;
  // Persisted so returning from a station detail page restores the map position.
  mapLat: number;
  mapLng: number;
  mapZoom: number;
  favSort: 'alpha' | 'value' | 'distance';
  listSortBy: 'alpha' | 'nearme' | 'value';
  listIslandFilter: string;
}

// Namespaced by region. In production each region lives on its own domain, so
// localStorage is already isolated — but in dev every region is served from the
// same localhost origin, where an un-namespaced key would hand one region the
// other's saved map camera (American Samoa opening on empty ocean at 20.5,-157.5)
// and favorites for station IDs that don't exist in it.
const KEY = `mesonet-settings:${REGION.id}`;

const DEFAULTS: Settings = {
  darkMode: false,
  view: 'map',
  homeVarId: 'RF_1_Tot300s',
  units: 'imperial',
  mapMode: 'RF_1_Tot300s',
  mapLat: REGION.mapCenter[0],
  mapLng: REGION.mapCenter[1],
  mapZoom: REGION.mapZoom,
  favSort: 'alpha',
  listSortBy: 'alpha',
  listIslandFilter: 'all',
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function save(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
