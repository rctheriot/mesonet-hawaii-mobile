import { useState, useCallback } from 'react';

interface Settings {
  darkMode: boolean;
  view: 'map' | 'list';
  lastStationId: string | null;
  // Panel height stored as a ratio so it scales correctly on different screen sizes
  panelHeightRatio: number;
  // Variable standard_name shown on Home station cards; null = auto-select first air temp
  homeVarId: string | null;
  // Unit system for display — API always returns metric
  units: 'metric' | 'imperial';
  // Last selected map coloring mode on the Explore screen
  mapMode: string;
  // Map or list view on the Home screen
  homeView: 'list' | 'map';
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
