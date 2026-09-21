import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station } from '../../types/api';
import { stationDivIcon } from './mapIcons';
import { stationJitter } from './StationMap';
import { REGION } from '../../config/regions';

// CARTO requires a free API key (5M requests/month) since basemap tiles
// otherwise show an "API KEY REQUIRED" watermark - see carto.com/basemaps/apikey.
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URL = {
  light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
  dark:  `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
};
const ATTRIBUTION =
  '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '© <a href="https://carto.com/attributions">CARTO</a>';

// Sub-region display bounds come from the shared region config, so this map and
// islandFromCoords() can no longer drift apart — they read the same table by the
// same name. `displayBounds` is trimmed to the landmass (falling back to the
// wider derivation box) so fitBounds picks the highest zoom that still fits on a
// phone screen.
function displayBoundsFor(name: string | undefined): L.LatLngBoundsLiteral | undefined {
  if (!name) return undefined;
  const sr = REGION.subRegions.find(r => r.name === name);
  if (!sr) return undefined;
  return (sr.displayBounds ?? sr.bounds) as L.LatLngBoundsLiteral;
}

interface Props {
  station: Station;
  markerColor: string;
  darkMode: boolean;
}

export default function StationLocationMap({ station, markerColor, darkMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const tileRef      = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // ?? won't catch NaN (a station with no fixed location), so fall back explicitly.
    const { dlat, dlng } = stationJitter(station.station_id);
    const markerLat = (Number.isFinite(station.lat) ? station.lat : REGION.mapCenter[0]) + dlat;
    const markerLng = (Number.isFinite(station.lng) ? station.lng : REGION.mapCenter[1]) + dlng;

    const islandBounds = displayBoundsFor(station.island);

    const map = L.map(containerRef.current, {
      center: REGION.mapCenter,
      zoom: REGION.mapZoom + 1,
      dragging:        false,
      touchZoom:       false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom:         false,
      keyboard:        false,
      zoomControl:     false,
    });

    const tile = L.tileLayer(TILE_URL[darkMode ? 'dark' : 'light'], {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    });
    tile.addTo(map);
    tileRef.current = tile;

    L.marker([markerLat, markerLng], {
      icon:        stationDivIcon(markerColor, false),
      keyboard:    false,
      interactive: false,
    }).addTo(map);

    // Defer fitBounds until after the flex layout has fully settled.
    // setTimeout(0) fires after the current event loop and CSS layout pass,
    // giving the container its real pixel dimensions before Leaflet measures it.
    setTimeout(() => {
      if (!mapRef.current) return;
      map.invalidateSize();
      if (islandBounds) {
        map.fitBounds(islandBounds, { padding: [4, 4], animate: false });
      } else {
        map.setView([markerLat, markerLng], 10, { animate: false });
      }
    }, 0);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tileRef.current?.setUrl(TILE_URL[darkMode ? 'dark' : 'light']);
  }, [darkMode]);

  return <div ref={containerRef} className="w-full h-full" />;
}
