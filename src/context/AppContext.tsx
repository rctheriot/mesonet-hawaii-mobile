import { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useFavorites } from '../hooks/useFavorites';

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
  detailChartVars: [string | null, string | null];
  setDetailChartVars: (vars: [string | null, string | null]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const [installPromptOpen, setInstallPromptOpen] = useState(false);
  // StationDetail is a route component — it remounts on every navigation, so local state
  // would reset when switching stations. Storing chartVars here lets them persist across
  // navigations without needing localStorage (they're intentionally ephemeral on page reload).
  const [detailChartVars, setDetailChartVars] = useState<[string | null, string | null]>([null, null]);

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
      detailChartVars,
      setDetailChartVars,
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
