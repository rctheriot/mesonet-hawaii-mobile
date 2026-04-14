import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station, StationMonitor } from '../../types/api';
import { stationStatusKey, STATUS_HEX, STATUS_HOLLOW } from '../../theme';
import { stationDivIcon, selectedPinIcon, userLocationIcon } from './mapIcons';

// ─── Tile sources (CartoDB raster — same provider as before) ──────────────────
const TILE_URL = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION =
  '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '© <a href="https://carto.com/attributions">CARTO</a>';

// ─── Haversine distance ───────────────────────────────────────────────────────
// Exported for use in ExploreScreen's station list sorting.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface StationMapProps {
  stations: Station[];
  monitorData: Record<string, StationMonitor>;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  flyToCoords?: { lat: number; lng: number; zoom?: number };
  panToCoords?: { lat: number; lng: number };
  userLocation?: { latitude: number; longitude: number } | null;
  darkMode?: boolean;
  onCenterOnUser?: () => void;
  geoLoading?: boolean;
  // Pass false when the map's container div is hidden (e.g. list view)
  // so Leaflet can recalculate tile layout when it becomes visible again.
  isVisible?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StationMap({
  stations,
  monitorData,
  selectedStationId,
  onSelectStation,
  flyToCoords,
  panToCoords,
  userLocation,
  darkMode = false,
  onCenterOnUser,
  geoLoading = false,
  isVisible = true,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const tileRef       = useRef<L.TileLayer | null>(null);
  const markersRef    = useRef<Record<string, L.Marker>>({});
  const metaRef       = useRef<Record<string, { color: string; hollow: boolean }>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Keep callbacks in refs so effects that run once don't capture stale closures.
  const onSelectRef = useRef(onSelectStation);
  onSelectRef.current = onSelectStation;

  // ── 1. Initialize map (runs once) ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20.5, -157.5],
      zoom: 7,
      zoomControl: false,       // added manually at top-right below
      // Rotation and tilt are not features of Leaflet — map always points north.
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tile = L.tileLayer(TILE_URL.light, {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    });
    tile.addTo(map);

    mapRef.current = map;
    tileRef.current = tile;

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      markersRef.current = {};
      metaRef.current = {};
    };
  }, []);

  // ── 2. Swap tile URL on theme change ─────────────────────────────────────
  // tileLayer.setUrl() only swaps the URL — markers are completely unaffected.
  useEffect(() => {
    tileRef.current?.setUrl(TILE_URL[darkMode ? 'dark' : 'light']);
  }, [darkMode]);

  // ── 3. Invalidate size when map becomes visible ───────────────────────────
  // Leaflet needs to recalculate tile layout after a hidden→visible transition.
  useEffect(() => {
    if (isVisible) mapRef.current?.invalidateSize();
  }, [isVisible]);

  // ── 4. Add / update station markers ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || stations.length === 0) return;

    stations.forEach((station) => {
      const { station_id, lat, lng } = station;
      if (!lat || !lng) return;

      const key    = stationStatusKey(station, monitorData);
      const color  = STATUS_HEX[key];
      const hollow = STATUS_HOLLOW[key];
      metaRef.current[station_id] = { color, hollow };

      if (markersRef.current[station_id]) {
        // Already on the map — update status color.
        // Skip if it's currently showing the selected pin; effect 5 owns that icon.
        if (station_id !== selectedStationId) {
          markersRef.current[station_id].setIcon(stationDivIcon(color, hollow));
        }
        return;
      }

      const marker = L.marker([lat, lng], {
        icon: stationDivIcon(color, hollow),
        keyboard: false,
      });
      marker.on('click', () => onSelectRef.current(station_id));
      marker.addTo(map);
      markersRef.current[station_id] = marker;
    });
  }, [stations, monitorData]);

  // ── 5. Selected station → teardrop pin ───────────────────────────────────
  // marker.setIcon() is synchronous. No events, no timing, no separate marker.
  // Theme changes do not affect this — setUrl() never touches markers.
  useEffect(() => {
    // Reset every marker back to its status-color circle
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const meta = metaRef.current[id];
      if (meta) marker.setIcon(stationDivIcon(meta.color, meta.hollow));
    });

    // Swap the selected station to the pin icon
    if (selectedStationId && markersRef.current[selectedStationId]) {
      markersRef.current[selectedStationId].setIcon(selectedPinIcon());
    }
  }, [selectedStationId]);

  // ── 6. User location marker ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const { latitude, longitude } = userLocation;
    if (userMarkerRef.current) {
      // Move existing marker — avoids re-creating the pulsing DOM element
      userMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      userMarkerRef.current = L.marker([latitude, longitude], {
        icon: userLocationIcon(),
        keyboard: false,
        zIndexOffset: 1000, // renders above all station markers
      }).addTo(map);
    }
  }, [userLocation]);

  // ── 7. Fly to coords (with optional zoom change) ──────────────────────────
  useEffect(() => {
    if (!flyToCoords || !mapRef.current) return;
    const { lat, lng, zoom } = flyToCoords;
    mapRef.current.flyTo([lat, lng], zoom ?? mapRef.current.getZoom(), { duration: 1.2 });
  }, [flyToCoords]);

  // ── 8. Pan to coords (no zoom change) ────────────────────────────────────
  useEffect(() => {
    if (!panToCoords || !mapRef.current) return;
    mapRef.current.panTo([panToCoords.lat, panToCoords.lng], { animate: true, duration: 0.8 });
  }, [panToCoords]);

  return (
    <div className="relative w-full h-full isolate">
      {/* Leaflet renders into this div */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Center-on-user button — React overlay, simpler than a custom Leaflet control */}
      {onCenterOnUser && (
        <button
          onClick={onCenterOnUser}
          disabled={geoLoading}
          className="absolute top-2.5 left-2.5 z-[1001] w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded shadow border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
          aria-label="Center on my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <line x1="12" y1="2"  x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2"  y1="12" x2="6"  y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
        </button>
      )}
    </div>
  );
}
