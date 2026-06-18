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
    const lat = (station.lat ?? 20.5) + dlat;
    const lng = (station.lng ?? -157.5) + dlng;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 11,
      // Fully static — no panning or zooming.
      dragging:         false,
      touchZoom:        false,
      scrollWheelZoom:  false,
      doubleClickZoom:  false,
      boxZoom:          false,
      keyboard:         false,
      zoomControl:      false,
    });

    const tile = L.tileLayer(TILE_URL[darkMode ? 'dark' : 'light'], {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    });
    tile.addTo(map);
    tileRef.current = tile;

    L.marker([lat, lng], {
      icon: stationDivIcon(markerColor, false),
      keyboard: false,
      interactive: false,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap tile URL when dark mode changes without rebuilding the map.
  useEffect(() => {
    tileRef.current?.setUrl(TILE_URL[darkMode ? 'dark' : 'light']);
  }, [darkMode]);

  return <div ref={containerRef} className="w-full h-full" />;
}
