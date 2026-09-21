import { useState, useCallback } from 'react';
import { regionStorageKey } from '../config/regions';

// Per region — see the note on the settings key in useSettings.ts. Hawaii keeps
// the original key, so no existing user loses their saved stations.
const KEY = regionStorageKey('mesonet-favorites');

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(load);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}
