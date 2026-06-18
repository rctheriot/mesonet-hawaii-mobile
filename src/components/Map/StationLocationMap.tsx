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

// Keys must match exactly what islandFromCoords() returns in src/api/stations.ts.
// Bounds are trimmed aggressively to the main landmass so fitBounds picks the
// highest zoom level that fits the island on a mobile screen.
const ISLAND_BOUNDS: Record<string, L.LatLngBoundsLiteral> = {
  'Hawaiʻi Island': [[18.880300, -156.140442], [20.287961, -154.769897]],
  'Maui':           [[20.562082, -156.735077], [21.050540, -155.965347]],
  'Oʻahu':          [[21.245222, -158.294449], [21.718680, -157.637329]],
  'Kauaʻi':         [[21.88, -159.78], [22.23, -159.30]],
  'Molokaʻi':       [[21.032596, -157.329712], [21.233702, -156.691818]],
  'Lānaʻi':         [[20.722722, -157.085609], [20.938034, -156.798592]],
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
