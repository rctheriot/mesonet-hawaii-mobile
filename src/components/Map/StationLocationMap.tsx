import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station } from '../../types/api';
import { stationDivIcon } from './mapIcons';
import { stationJitter } from './StationMap';

const TILE_URL = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION =
  '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '© <a href="https://carto.com/attributions">CARTO</a>';

// Bounding boxes [SW, NE] per island. fitBounds() computes center + zoom
// automatically so the whole island is visible regardless of screen size.
const ISLAND_BOUNDS: Record<string, L.LatLngBoundsLiteral> = {
  'Hawaii':  [[18.91, -156.07], [20.27, -154.81]],
  'Maui':    [[20.57, -156.70], [21.03, -155.98]],
  'Oahu':    [[21.23, -158.30], [21.72, -157.64]],
  'Kauai':   [[21.87, -159.79], [22.24, -159.29]],
  'Molokai': [[21.05, -157.34], [21.23, -156.71]],
  'Lanai':   [[20.71, -157.07], [20.94, -156.84]],
  'Niihau':  [[21.83, -160.26], [21.99, -160.06]],
};

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

    const { dlat, dlng } = stationJitter(station.station_id);
    const markerLat = (station.lat ?? 20.5) + dlat;
    const markerLng = (station.lng ?? -157.5) + dlng;

    const islandBounds = station.island ? ISLAND_BOUNDS[station.island] : undefined;

    const map = L.map(containerRef.current, {
      // Placeholder view — overridden by fitBounds once the container is sized.
      center: [20.5, -157.5],
      zoom: 8,
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

    // Defer fitBounds to the next animation frame so the flex container
    // has its final painted dimensions before Leaflet measures it.
    requestAnimationFrame(() => {
      map.invalidateSize();
      if (islandBounds) {
        map.fitBounds(islandBounds, { padding: [32, 32], animate: false });
      } else {
        map.setView([markerLat, markerLng], 10, { animate: false });
      }
    });

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
