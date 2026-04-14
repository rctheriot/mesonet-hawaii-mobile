import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Station, StationMonitor } from '../../types/api';
import { stationStatusKey, STATUS_HEX, STATUS_HOLLOW } from '../../theme';

const MAP_STYLES = {
  dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

interface StationMapProps {
  stations: Station[];
  monitorData: Record<string, StationMonitor>;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  flyToCoords?: { lat: number; lng: number; zoom?: number };
  panToCoords?: { lat: number; lng: number };
  userLocation?: { latitude: number; longitude: number } | null;
  darkMode?: boolean;
  // Called when user taps the Center on Me button
  onCenterOnUser?: () => void;
  // True while location is being requested — shows a spinner state on the button
  geoLoading?: boolean;
}

// Haversine distance in km
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

function markerStyle(station: Station, monitor: Record<string, StationMonitor>): { color: string; hollow: boolean } {
  const key = stationStatusKey(station, monitor);
  return { color: STATUS_HEX[key], hollow: STATUS_HOLLOW[key] };
}

export default function StationMap({
  stations,
  monitorData,
  selectedStationId,
  onSelectStation,
  flyToCoords,
  panToCoords,
  userLocation,
  darkMode = true,
  onCenterOnUser,
  geoLoading = false,
}: StationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const markerMetaRef = useRef<Record<string, { color: string; hollow: boolean }>>({});
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isMountedRef = useRef(false);
  // Store the callback in a ref so the markers effect doesn't list it as a dependency.
  // If it were a dep, every re-render of App would recreate all markers unnecessarily.
  const onSelectStationRef = useRef(onSelectStation);
  onSelectStationRef.current = onSelectStation;

  // Refs for the center button — lets us update text/disabled without re-initializing the map.
  const onCenterOnUserRef = useRef(onCenterOnUser);
  onCenterOnUserRef.current = onCenterOnUser;
  const centerBtnRef = useRef<HTMLButtonElement | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: darkMode ? MAP_STYLES.dark : MAP_STYLES.light,
      center: [-157.5, 20.5], // Hawaii
      zoom: 7,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    // Add center-on-user button as a MapLibre control so it sits directly below
    // the zoom buttons in the same top-right group rather than floating separately.
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = 'Center on my location';
    btn.setAttribute('aria-label', 'Center on my location');
    // SVG crosshair icon — matches MapLibre's 29×29 button footprint
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
    </svg>`;
    btn.style.cssText = 'display:flex; align-items:center; justify-content:center; width:29px; height:29px; cursor:pointer;';
    btn.onclick = () => onCenterOnUserRef.current?.();
    centerBtnRef.current = btn;

    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    container.appendChild(btn);

    map.addControl(
      { onAdd: () => container, onRemove: () => container.parentNode?.removeChild(container) },
      'top-left'
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      centerBtnRef.current = null;
    };
  }, []);

  // Sync geoLoading state to the center button DOM element
  useEffect(() => {
    const btn = centerBtnRef.current;
    if (!btn) return;
    btn.disabled = geoLoading;
    btn.style.opacity = geoLoading ? '0.5' : '1';
  }, [geoLoading]);

  // Swap map style when dark/light mode changes.
  // Skip on first mount — isMountedRef guards against wiping markers before they're added.
  // setStyle() destroys all DOM layers, so we clear marker refs so the markers effect
  // re-adds them fresh once the new style fires its 'load' event.
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(darkMode ? MAP_STYLES.dark : MAP_STYLES.light);
    markersRef.current = {};
    markerMetaRef.current = {};
  }, [darkMode]);

  // Add/update markers when stations or monitor data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || stations.length === 0) return;

    // Wait for map style to load before adding markers
    const addMarkers = () => {
      stations.forEach((station) => {
        const { station_id, lat, lng } = station;
        if (!lat || !lng) return;

        const { color, hollow } = markerStyle(station, monitorData);

        if (markersRef.current[station_id]) {
          // Marker exists — just update its color in place.
          // markerMetaRef must stay in sync here so the highlight effect
          // can restore the correct color when a station is deselected.
          const el = markersRef.current[station_id].getElement();
          const dot = el.querySelector('.station-dot') as HTMLElement | null;
          if (dot) {
            dot.style.backgroundColor = hollow ? 'transparent' : color;
            dot.style.borderColor = color;
          }
          markerMetaRef.current[station_id] = { color, hollow };
          return;
        }

        const el = document.createElement('div');
        el.className = 'station-marker';
        // Tall enough for the pin (24px) when selected; circle fits inside
        el.style.cssText = 'cursor:pointer; width:20px; height:28px; display:flex; align-items:flex-end; justify-content:center;';

        const dot = document.createElement('div');
        dot.className = 'station-dot';
        dot.style.cssText = `
          width: 12px; height: 12px; border-radius: 50%;
          background-color: ${hollow ? 'transparent' : color};
          border: ${hollow ? `2px dashed ${color}` : '1px solid rgba(255,255,255,0.6)'};
          transition: transform 0.15s;
          box-shadow: ${hollow ? 'none' : '0 0 4px rgba(0,0,0,0.5)'};
        `;
        el.appendChild(dot);

        // Pin SVG — shown only when this station is selected
        const pin = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pin.setAttribute('class', 'station-pin');
        pin.setAttribute('width', '20');
        pin.setAttribute('height', '28');
        pin.setAttribute('viewBox', '0 0 20 28');
        pin.setAttribute('fill', 'none');
        pin.style.cssText = 'display:none; position:absolute; top:0; left:0; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));';
        pin.innerHTML = `
          <path d="M10 0C4.477 0 0 4.477 0 10C0 16.5 10 28 10 28C10 28 20 16.5 20 10C20 4.477 15.523 0 10 0Z" fill="#0ea5e9"/>
          <circle cx="10" cy="10" r="4" fill="white"/>
        `;
        el.style.position = 'relative';
        el.appendChild(pin);

        el.addEventListener('mouseenter', () => { dot.style.transform = 'scale(1.4)'; });
        el.addEventListener('mouseleave', () => { dot.style.transform = 'scale(1)'; });
        el.addEventListener('click', () => onSelectStationRef.current(station_id));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        markersRef.current[station_id] = marker;
        markerMetaRef.current[station_id] = { color, hollow };
      });
    };

    // After a style swap, the style won't be loaded yet — wait for 'load' before adding markers.
    if (map.isStyleLoaded()) {
      addMarkers();
    } else {
      map.once('load', addMarkers);
    }
  }, [stations, monitorData]);

  // Highlight selected station — swap between circle dot and teardrop pin
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      const dot = el.querySelector('.station-dot') as HTMLElement | null;
      const pin = el.querySelector('.station-pin') as HTMLElement | null;
      if (!dot) return;
      const selected = id === selectedStationId;
      const meta = markerMetaRef.current[id];
      if (selected) {
        dot.style.display = 'none';
        if (pin) pin.style.display = 'block';
      } else {
        dot.style.display = '';
        if (pin) pin.style.display = 'none';
        dot.style.backgroundColor = meta?.hollow ? 'transparent' : (meta?.color ?? '');
        dot.style.border = meta?.hollow
          ? `2px dashed ${meta.color}`
          : '1px solid rgba(255,255,255,0.6)';
      }
    });
  }, [selectedStationId]);

  // Fly to coords (with optional zoom)
  useEffect(() => {
    if (flyToCoords && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToCoords.lng, flyToCoords.lat],
        ...(flyToCoords.zoom != null ? { zoom: flyToCoords.zoom } : {}),
        duration: 1200,
      });
    }
  }, [flyToCoords]);

  // Pan to coords without changing zoom (list selection)
  useEffect(() => {
    if (panToCoords && mapRef.current) {
      mapRef.current.easeTo({ center: [panToCoords.lng, panToCoords.lat], duration: 800 });
    }
  }, [panToCoords]);

  // NOTE: ResizeObserver was intentionally removed. Calling map.resize() caused
  // visible flickering when the panel was dragged. The CSS bottom offset on the
  // container handles the layout instead.

  // Show/update user location dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const el = document.createElement('div');
    el.style.cssText = 'width:24px; height:24px; display:flex; align-items:center; justify-content:center; position:relative;';

    // Outer pulsing ring
    const ring = document.createElement('div');
    ring.style.cssText = `
      position:absolute; width:24px; height:24px; border-radius:50%;
      background: rgba(59,130,246,0.25);
      border: 1.5px solid rgba(59,130,246,0.5);
      animation: user-loc-pulse 2s ease-in-out infinite;
    `;
    // Inner filled dot
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:relative; width:14px; height:14px; border-radius:50%;
      background: #3b82f6;
      border: 2.5px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    `;
    el.appendChild(ring);
    el.appendChild(dot);

    // Inject keyframes once if not already present
    if (!document.getElementById('user-loc-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'user-loc-pulse-style';
      style.textContent = `
        @keyframes user-loc-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.5); opacity: 0.2; }
        }
      `;
      document.head.appendChild(style);
    }

    userMarkerRef.current?.remove();
    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map);
  }, [userLocation]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
