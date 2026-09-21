import { useState, useCallback } from 'react';
import { REGION } from '../config/regions';

interface GeolocationState {
  coords: { latitude: number; longitude: number } | null;
  error: string | null;
  loading: boolean;
}

// Generous bounding box covering the whole configured region plus a buffer.
function isInRegion(lat: number, lng: number): boolean {
  const b = REGION.geoBounds;
  return lat >= b.minLat && lat <= b.maxLat &&
         lng >= b.minLng && lng <= b.maxLng;
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
        if (!isInRegion(latitude, longitude)) {
          setState({
            coords: null,
            error: REGION.geoOutsideMessage,
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
