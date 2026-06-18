import { useState, useCallback } from 'react';

interface Settings {
  darkMode: boolean;
  view: 'map' | 'list';
  lastStationId: string | null;
  panelHeightRatio: number;
  homeVarId: string | null;
  units: 'metric' | 'imperial';
  mapMode: string;
  homeView: 'list' | 'map';
  // Persisted so returning from a station detail page restores the map position.
  mapLat: number;
  mapLng: number;
  mapZoom: number;
  favSort: 'alpha' | 'value' | 'distance';
  listSortBy: 'alpha' | 'nearme' | 'value';
  listIslandFilter: string;
}

const KEY = 'mesonet-settings';

const DEFAULTS: Settings = {
  darkMode: false,
  view: 'map',
  lastStationId: null,
  panelHeightRatio: 0.5,
  homeVarId: 'RF_1_Tot300s',
  units: 'imperial',
  mapMode: 'RF_1_Tot300s',
  homeView: 'list',
  mapLat: 20.5,
  mapLng: -157.5,
  mapZoom: 7,
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
