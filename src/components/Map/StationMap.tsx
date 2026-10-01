import { useEffect, useRef } from 'react';
import { LuCrosshair } from 'react-icons/lu';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Station } from '../../types/api';
import { stationStatusKey, STATUS_HEX, STATUS_HOLLOW } from '../../theme';
import { stationDivIcon, selectedPinIcon, userLocationIcon, clusterCountIcon, clusterValueIcon } from './mapIcons';
import { clusterPoints, median } from './cluster';

// ─── Tile sources (CartoDB raster) ───────────────────────────────────────────
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

import { haversineKm, stationJitter } from '../../utils/geo';
import { REGION } from '../../config/regions';
export { haversineKm, stationJitter };

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

// ─── Clustering ───────────────────────────────────────────────────────────────
// At low zoom, stations that would overlap are drawn as one group marker. Past
// CLUSTER_MAX_ZOOM every station is drawn on its own, so all stay reachable.
export const CLUSTER_MAX_ZOOM = 10;
const CLUSTER_RADIUS_PX = 50;

export type ClusterStyle = 'median' | 'range';

export interface ClusterOptions {
  style: ClusterStyle;
  // Raw (API-unit) value per station, for the median/range styles. Omitted in
  // status mode and for variables that must not be combined (water level), and
  // the group then shows a count.
  values?: Map<string, number>;
  colorFor?: (raw: number) => string;
  labelFor?: (raw: number) => string;
}

// Picks the group marker for a set of stations. `memberColor` is the colour each
// member would be drawn in on its own (status colour, value colour, or gray).
function clusterIcon(ids: string[], opts: ClusterOptions, memberColor: (id: string) => string): L.DivIcon {
  const { values, colorFor, labelFor } = opts;
  const raw = values ? ids.map(id => values.get(id)).filter((v): v is number => v != null && Number.isFinite(v)) : [];

  if (!values || !colorFor || !labelFor || raw.length === 0) {
    const counts = new Map<string, number>();
    for (const id of ids) {
      const c = memberColor(id);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return clusterCountIcon(ids.length, Array.from(counts, ([color, n]) => ({ color, n })));
  }

  if (opts.style === 'median') {
    const m = median(raw)!;
    return clusterValueIcon(colorFor(m), labelFor(m), ids.length);
  }

  const lo = Math.min(...raw), hi = Math.max(...raw);
  const loLabel = labelFor(lo), hiLabel = labelFor(hi);
  return loLabel === hiLabel
    ? clusterValueIcon(colorFor(lo), loLabel, ids.length)
    : clusterValueIcon(`linear-gradient(90deg, ${colorFor(lo)}, ${colorFor(hi)})`, `${loLabel}–${hiLabel}`, ids.length);
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
  // Group overlapping stations at low zoom. Omit to draw every station (the
  // favourites map, which has few). Pass a memoised object — a new one re-clusters.
  cluster?: ClusterOptions;
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
  cluster,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const tileRef       = useRef<L.TileLayer | null>(null);
  const markersRef    = useRef<Record<string, L.Marker>>({});
  const metaRef       = useRef<Record<string, { color: string; hollow: boolean }>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const clusterLayerRef = useRef<L.LayerGroup | null>(null);

  // Keep callbacks in refs so effects that run once don't capture stale closures.
  const onSelectRef = useRef(onSelectStation);
  onSelectRef.current = onSelectStation;

  // Latest values for recluster(), which also runs from the map's zoomend
  // handler (registered once) and so must not close over render-time props.
  const clusterRef = useRef(cluster);
  clusterRef.current = cluster;
  const selectedRef = useRef(selectedStationId);
  selectedRef.current = selectedStationId;
  const varColorsRef = useRef(varColors);
  varColorsRef.current = varColors;

  // Show or hide each station marker and rebuild the group markers for the
  // current zoom. Clusters are computed in projected pixels, which don't change
  // on pan, so this only needs to run on zoom and when the data changes.
  function recluster() {
    const map = mapRef.current;
    const layer = clusterLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const markers = markersRef.current;
    const show = (id: string) => { if (!map.hasLayer(markers[id])) markers[id].addTo(map); };
    const opts = clusterRef.current;
    const zoom = map.getZoom();

    if (!opts || zoom > CLUSTER_MAX_ZOOM) {
      Object.keys(markers).forEach(show);
      return;
    }

    // The selected station is never folded into a group.
    const selected = selectedRef.current;
    if (selected && markers[selected]) show(selected);
    const points = Object.keys(markers)
      .filter(id => id !== selected)
      .map(id => {
        const p = map.project(markers[id].getLatLng(), zoom);
        return { id, x: p.x, y: p.y };
      });

    const colors = varColorsRef.current;
    const memberColor = (id: string) =>
      colors ? (colors.get(id) ?? '#94a3b8') : (metaRef.current[id]?.color ?? '#94a3b8');

    for (const c of clusterPoints(points, CLUSTER_RADIUS_PX)) {
      if (c.ids.length === 1) { show(c.ids[0]); continue; }
      c.ids.forEach(id => markers[id].remove());
      const group = L.marker(map.unproject([c.x, c.y], zoom), {
        icon: clusterIcon(c.ids, opts, memberColor),
        keyboard: false,
      });
      // Tapping a group zooms to fit its stations rather than opening one.
      group.on('click', () => {
        const bounds = L.latLngBounds(c.ids.map(id => markers[id].getLatLng()));
        map.flyToBounds(bounds, { padding: [60, 60], maxZoom: CLUSTER_MAX_ZOOM + 2, duration: 0.8 });
      });
      layer.addLayer(group);
    }
  }
  const reclusterRef = useRef(recluster);
  reclusterRef.current = recluster;

  // ── 1. Initialize map (runs once) ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: initialCenter ?? REGION.mapCenter,
      zoom: initialZoom ?? REGION.mapZoom,
      zoomControl: false,
      // Region-scoped pan limit — a hardcoded Hawaii box here silently snapped
      // other regions' maps into the middle of the Pacific.
      maxBounds: L.latLngBounds(REGION.mapMaxBounds),
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

    clusterLayerRef.current = L.layerGroup().addTo(map);
    map.on('zoomend', () => reclusterRef.current());

    mapRef.current = map;
    tileRef.current = tile;

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      clusterLayerRef.current = null;
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
    recluster();
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
    recluster();
  }, [selectedStationId, varColors, varLabels, varArrows]);

  // ── 5b. Re-cluster when grouping options change ──────────────────────────
  useEffect(() => {
    recluster();
  }, [cluster]);

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
              <LuCrosshair size={15} strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
