import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station } from '../../types/api';
import { stationStatusKey, STATUS_HEX, STATUS_HOLLOW } from '../../theme';
import { stationDivIcon, selectedPinIcon, userLocationIcon } from './mapIcons';

// ─── Tile sources (CartoDB raster) ───────────────────────────────────────────
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

// ─── Marker icon helper ───────────────────────────────────────────────────────
function applyVarIcon(
  marker: L.Marker,
  id: string,
  meta: { color: string; hollow: boolean },
  varColors?: Map<string, string>,
  varLabels?: Map<string, string>,
  varArrows?: Map<string, number>,
) {
  if (varColors) {
    const color = varColors.get(id);
    const label = varLabels?.get(id);
    if (color && label) {
      marker.setIcon(stationDivIcon(color, false, label, varArrows?.get(id)));
    } else {
      marker.setIcon(stationDivIcon('#94a3b8', false)); // no data → gray dot
    }
  } else {
    marker.setIcon(stationDivIcon(meta.color, meta.hollow));
  }
}

// ─── Location obfuscation ─────────────────────────────────────────────────────

// Returns a small deterministic lat/lng offset for a station so its map marker
// doesn't reveal the precise installation location. The same station_id always
// produces the same offset (hash-based), so the map is consistent between
// sessions. Real coordinates are used everywhere else (distance calc, flyTo).
// ±0.0003° ≈ ±33 m per axis — max diagonal displacement ~45 m (~½ acre).
export function stationJitter(stationId: string): { dlat: number; dlng: number } {
  let h = 0;
  for (let i = 0; i < stationId.length; i++) {
    h = Math.imul(h, 31) + stationId.charCodeAt(i);
    h |= 0;
  }
  const a = ((h & 0xFFFF) >>> 0) / 0xFFFF;
  const b = (((h >>> 16) & 0xFFFF) >>> 0) / 0xFFFF;
  const MAX = 0.0003;
  return { dlat: (a - 0.5) * 2 * MAX, dlng: (b - 0.5) * 2 * MAX };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface StationMapProps {
  stations: Station[];
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
  // Current panel height in px — triggers a debounced invalidateSize so tiles
  // fill correctly after the panel is dragged or first opened.
  panelHeight?: number;
  // Restored camera state — used on init so returning from a detail page
  // puts the map back at the same position and zoom.
  initialCenter?: [number, number];
  initialZoom?: number;
  onCameraChange?: (lat: number, lng: number, zoom: number) => void;
  varColors?: Map<string, string>;
  varLabels?: Map<string, string>;
  varArrows?: Map<string, number>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StationMap({
  stations,
  selectedStationId,
  onSelectStation,
  flyToCoords,
  panToCoords,
  userLocation,
  darkMode = false,
  onCenterOnUser,
  geoLoading = false,
  isVisible = true,
  panelHeight,
  initialCenter,
  initialZoom,
  onCameraChange,
  varColors,
  varLabels,
  varArrows,
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
      center: initialCenter ?? [20.5, -157.5],
      zoom: initialZoom ?? 7,
      zoomControl: false,
      maxBounds: L.latLngBounds([17, -163], [24, -152]),
      maxBoundsViscosity: 1.0,
    });

    if (onCameraChange) {
      map.on('moveend', () => {
        const c = map.getCenter();
        onCameraChange(c.lat, c.lng, map.getZoom());
      });
    }

    const tile = L.tileLayer(TILE_URL[darkMode ? 'dark' : 'light'], {
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

  // ── 3b. Invalidate size when panel height changes ─────────────────────────
  // Debounced so it fires once after a drag settles, not on every pixel.
  // animate:false avoids the flicker that a live ResizeObserver caused.
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false });
    }, 150);
    return () => clearTimeout(t);
  }, [panelHeight, isVisible]);

  // ── 4. Add / update station markers ──────────────────────────────────────
  // Also depends on varColors/varLabels/varArrows so that a background station
  // refetch doesn't reset variable-mode markers back to status colors.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || stations.length === 0) return;

    stations.forEach((station) => {
      const { station_id, lat, lng } = station;
      if (!lat || !lng) return;

      const key    = stationStatusKey(station);
      const color  = STATUS_HEX[key];
      const hollow = STATUS_HOLLOW[key];
      // Keep metaRef in sync so effect 5 can restore the right status color
      // when a station is deselected.
      metaRef.current[station_id] = { color, hollow };

      if (markersRef.current[station_id]) {
        if (station_id !== selectedStationId) {
          applyVarIcon(markersRef.current[station_id], station_id, { color, hollow }, varColors, varLabels, varArrows);
        }
        return;
      }

      const { dlat, dlng } = stationJitter(station_id);
      const marker = L.marker([lat + dlat, lng + dlng], {
        icon: stationDivIcon(color, hollow),
        keyboard: false,
      });
      marker.on('click', () => onSelectRef.current(station_id));
      marker.addTo(map);
      markersRef.current[station_id] = marker;
    });
  }, [stations, varColors, varLabels, varArrows]);

  // ── 5. Selected station → teardrop pin ───────────────────────────────────
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const meta = metaRef.current[id];
      if (!meta) return;
      applyVarIcon(marker, id, meta, varColors, varLabels, varArrows);
    });

    if (selectedStationId && markersRef.current[selectedStationId]) {
      markersRef.current[selectedStationId].setIcon(selectedPinIcon());
    }
  }, [selectedStationId, varColors, varLabels, varArrows]);

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
  // Guard against isVisible: Leaflet computes NaN pixel coords on a hidden (0×0) container.
  // Including isVisible as a dependency means the effect re-runs on show, so the fly still happens.
  useEffect(() => {
    if (!flyToCoords || !mapRef.current || !isVisible) return;
    const { lat, lng, zoom } = flyToCoords;
    mapRef.current.flyTo([lat, lng], zoom ?? mapRef.current.getZoom(), { duration: 1.2 });
  }, [flyToCoords, isVisible]);

  // ── 8. Pan to coords (no zoom change) ────────────────────────────────────
  useEffect(() => {
    if (!panToCoords || !mapRef.current || !isVisible) return;
    mapRef.current.panTo([panToCoords.lat, panToCoords.lng], { animate: true, duration: 0.8 });
  }, [panToCoords, isVisible]);

  return (
    <div className="relative w-full h-full z-0">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-2.5 right-2.5 z-[1001] flex flex-row rounded-xl overflow-hidden shadow border border-slate-200 dark:border-zinc-600">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-600 transition-colors text-lg font-light leading-none"
          aria-label="Zoom in"
        >+</button>
        <div className="w-px bg-slate-200 dark:bg-zinc-600" />
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-600 transition-colors text-lg font-light leading-none"
          aria-label="Zoom out"
        >−</button>
        {onCenterOnUser && (
          <>
            <div className="w-px bg-slate-200 dark:bg-zinc-600" />
            <button
              onClick={onCenterOnUser}
              disabled={geoLoading}
              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-600 disabled:opacity-40 transition-colors"
              aria-label="Center on my location"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2.2"
                   strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2"  x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2"  y1="12" x2="6"  y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
