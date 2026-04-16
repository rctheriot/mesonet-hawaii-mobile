import { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useFavorites } from '../hooks/useFavorites';
import type { ChartVarPair } from '../types/ui';

// AppContext provides settings and favorites to all screens without prop-drilling.
// Both are backed by localStorage so they survive navigation and app restarts.

type Settings = ReturnType<typeof useSettings>['settings'];
type UpdateSettings = ReturnType<typeof useSettings>['updateSettings'];

interface AppContextValue {
  settings: Settings;
  updateSettings: UpdateSettings;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  installPromptOpen: boolean;
  openInstallPrompt: () => void;
  closeInstallPrompt: () => void;
  // Shared chart variable selection — persists across station navigation within a session.
  // Stored here (not in screen-local state) because StationDetail remounts on every route
  // change, which would reset local state on each station switch.
  chartVars: ChartVarPair;
  setChartVars: (vars: ChartVarPair) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const [installPromptOpen, setInstallPromptOpen] = useState(false);
  const [chartVars, setChartVars] = useState<ChartVarPair>([null, null]);

  // Apply dark mode class to <html> — this is the single place this happens app-wide.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      favorites,
      toggleFavorite,
      installPromptOpen,
      openInstallPrompt: () => setInstallPromptOpen(true),
      closeInstallPrompt: () => setInstallPromptOpen(false),
      chartVars,
      setChartVars,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
