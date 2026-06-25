import L from 'leaflet';

// ─── Station circle ───────────────────────────────────────────────────────────
// Default marker for every station. Color and fill reflect live status.

// arrowDeg: wind direction in degrees the wind blows FROM (meteorological standard,
// 0=N, 90=E…). When set, draws a directional arrow that points DOWNWIND (the way the
// wind is going), so a 90° "from-east" reading shows an arrow pointing west.
export function stationDivIcon(color: string, hollow: boolean, label?: string, arrowDeg?: number): L.DivIcon {
  if (!label) {
    // Status / no-data mode — small circle only
    return L.divIcon({
      className: '',
      html: `<div style="
        width:10px; height:10px; border-radius:50%;
        background:${hollow ? 'transparent' : color};
        border:${hollow ? `2px dashed ${color}` : '1.5px solid rgba(255,255,255,0.7)'};
        box-shadow:${hollow ? 'none' : '0 0 4px rgba(0,0,0,0.45)'};
        cursor:pointer;
      "></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
  }

  // Variable mode — colored pill with white label (+ optional direction arrow for wind)
  // Arrow art points up (north) at 0°. The reading is the FROM-direction, so add 180°
  // to point the arrow downwind — the direction the wind is actually blowing toward.
  const inner = arrowDeg != null
    ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style="transform:rotate(${arrowDeg + 180}deg); flex-shrink:0; display:block;">
        <path d="M6 1 L10.5 10.5 L6 7 L1.5 10.5 Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round" paint-order="stroke fill"/>
      </svg>`
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color}; border-radius:5px; padding:3px 6px;
      display:inline-flex; align-items:center; gap:3px; cursor:pointer;
      box-shadow:0 1px 5px rgba(0,0,0,0.45); white-space:nowrap;
    ">${inner}<span style="color:white; font-size:12px; font-weight:700; line-height:1; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,-1px 0 0 #000,1px 0 0 #000,0 -1px 0 #000,0 1px 0 #000;">${label}</span></div>`,
    // null overrides Leaflet's default 12×12, letting the pill size to its content
    iconSize: null as unknown as L.PointExpression,
    iconAnchor: [8, 11],
  });
}

// ─── Selected station pin ─────────────────────────────────────────────────────
// Sky-blue teardrop shown instead of the circle when a station is selected.
// iconAnchor at [11, 30] places the tip of the pin exactly on the coordinate.

export function selectedPinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="22" height="30" viewBox="0 0 20 28" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="display:block; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5)); cursor:pointer;">
      <path d="M10 0C4.477 0 0 4.477 0 10C0 16.5 10 28 10 28C10 28 20 16.5 20 10C20 4.477 15.523 0 10 0Z"
            fill="#0ea5e9"/>
      <circle cx="10" cy="10" r="4" fill="white"/>
    </svg>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
  });
}

// ─── User location dot ────────────────────────────────────────────────────────
// Blue filled dot with a pulsing outer ring — distinct from station markers.

export function userLocationIcon(): L.DivIcon {
  // Inject the pulse keyframes once per page load
  if (!document.getElementById('map-user-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'map-user-pulse-style';
    style.textContent = `
      @keyframes map-user-pulse {
        0%, 100% { transform: scale(1);   opacity: 0.85; }
        50%       { transform: scale(1.7); opacity: 0.15; }
      }
    `;
    document.head.appendChild(style);
  }

  return L.divIcon({
    className: '',
    html: `<div style="width:26px; height:26px; position:relative;
                       display:flex; align-items:center; justify-content:center;">
      <div style="
        position:absolute; width:26px; height:26px; border-radius:50%;
        background:rgba(59,130,246,0.35);
        border:2px solid rgba(96,165,250,0.8);
        animation:map-user-pulse 2s ease-in-out infinite;
      "></div>
      <div style="
        position:relative; width:14px; height:14px; border-radius:50%;
        background:#3b82f6;
        border:2.5px solid white;
        box-shadow:0 0 0 2px rgba(255,255,255,0.55), 0 1px 5px rgba(0,0,0,0.55);
      "></div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}
