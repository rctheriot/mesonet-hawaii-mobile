import { useState, useCallback } from 'react';

interface GeolocationState {
  coords: { latitude: number; longitude: number } | null;
  error: string | null;
  loading: boolean;
}

// Generous bounding box covering all Hawaiian islands plus a buffer.
const HAWAII_BOUNDS = { minLat: 17, maxLat: 24, minLng: -163, maxLng: -152 };

function isInHawaii(lat: number, lng: number): boolean {
  return lat >= HAWAII_BOUNDS.minLat && lat <= HAWAII_BOUNDS.maxLat &&
         lng >= HAWAII_BOUNDS.minLng && lng <= HAWAII_BOUNDS.maxLng;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!isInHawaii(latitude, longitude)) {
          setState({
            coords: null,
            error: 'Your location appears to be outside Hawaiʻi. Near Me only works on the islands.',
            loading: false,
          });
          return;
        }
        setState({ coords: { latitude, longitude }, error: null, loading: false });
      },
      (err) => {
        setState({ coords: null, error: err.message, loading: false });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { ...state, requestLocation };
}
