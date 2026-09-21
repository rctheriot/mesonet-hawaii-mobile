import { useState, useCallback } from 'react';
import { REGION } from '../config/regions';

// Namespaced by region — see the note on the settings key in useSettings.ts.
const KEY = `mesonet-favorites:${REGION.id}`;

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
