export interface GlossaryEntry {
  label: string;
  description: string;
  examplesImperial: string[];
  examplesMetric: string[];
  unitNote: string;
}

export const VARIABLE_GLOSSARY: Record<string, GlossaryEntry> = {
  // ── Temperature ────────────────────────────────────────────────────────────
  Tair_1_Avg: {
    label: 'Air Temperature',
    description: 'The temperature of the air at the station, measured in the shade to avoid direct sunlight.',
    examplesImperial: [
      '60–70°F: a comfortable Hawaii morning',
      '80–90°F: a hot, sunny afternoon',
      '90°F+: very hot, unusual at higher elevations',
    ],
    examplesMetric: [
      '16–21°C: a comfortable Hawaii morning',
      '27–32°C: a hot, sunny afternoon',
      '32°C+: very hot, unusual at higher elevations',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },
  Tair_2_Avg: {
    label: 'Air Temperature (Sensor 2)',
    description: 'A second air temperature sensor at the same station, used for redundancy or measuring at a different height.',
    examplesImperial: [
      '60–70°F: a comfortable Hawaii morning',
      '80–90°F: a hot, sunny afternoon',
    ],
    examplesMetric: [
      '16–21°C: a comfortable Hawaii morning',
      '27–32°C: a hot, sunny afternoon',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },
  Tsrf_1_Avg: {
    label: 'Surface Temperature',
    description: 'The temperature of the ground surface directly below the sensor. On sunny days this can run much hotter than the air temperature.',
    examplesImperial: [
      'Similar to air temp in shade or overcast conditions',
      '20–30°F hotter than air on sunny days over dark pavement',
    ],
    examplesMetric: [
      'Similar to air temp in shade or overcast conditions',
      '10–17°C hotter than air on sunny days over dark pavement',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },
  Tsky_1_Avg: {
    label: 'Sky Temperature',
    description: 'The apparent temperature of the sky measured by an infrared sensor. Clear skies appear very cold; cloud cover makes the sky seem much warmer.',
    examplesImperial: [
      '-40°F or colder: clear, dry sky',
      '32–50°F: partly cloudy',
      'Near air temperature: low overcast clouds',
    ],
    examplesMetric: [
      '-40°C or colder: clear, dry sky',
      '0–10°C: partly cloudy',
      'Near air temperature: low overcast clouds',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },

  // ── Humidity ───────────────────────────────────────────────────────────────
  RH_1_Avg: {
    label: 'Relative Humidity',
    description: 'How much moisture is in the air compared to how much it could hold at that temperature. Higher values feel more humid and muggy.',
    examplesImperial: [
      '30–50%: dry and comfortable',
      '70–80%: noticeably humid',
      '90%+: typical in rainforests, feels very sticky',
    ],
    examplesMetric: [
      '30–50%: dry and comfortable',
      '70–80%: noticeably humid',
      '90%+: typical in rainforests, feels very sticky',
    ],
    unitNote: 'Displayed as a percentage (0–100%)',
  },
  RH_2_Avg: {
    label: 'Relative Humidity (Sensor 2)',
    description: 'A second humidity sensor for redundancy or measuring at a different height.',
    examplesImperial: [
      '30–50%: dry and comfortable',
      '70%+: muggy conditions',
      '90%+: rainforest-level humidity',
    ],
    examplesMetric: [
      '30–50%: dry and comfortable',
      '70%+: muggy conditions',
      '90%+: rainforest-level humidity',
    ],
    unitNote: 'Displayed as a percentage (0–100%)',
  },
  VP_1_Avg: {
    label: 'Vapor Pressure',
    description: 'The pressure exerted by water vapor in the air. A direct measure of how much moisture is present, independent of temperature.',
    examplesImperial: [
      '0.5 kPa: dry mountain air',
      '2–3 kPa: typical coastal Hawaii conditions',
      '4+ kPa: very humid tropical air',
    ],
    examplesMetric: [
      '0.5 kPa: dry mountain air',
      '2–3 kPa: typical coastal Hawaii conditions',
      '4+ kPa: very humid tropical air',
    ],
    unitNote: 'Measured in kPa (kilopascals)',
  },
  VP_2_Avg: {
    label: 'Vapor Pressure (Sensor 2)',
    description: 'A second vapor pressure sensor for redundancy.',
    examplesImperial: [
      '0.5 kPa: dry mountain air',
      '2–3 kPa: typical coastal Hawaii',
    ],
    examplesMetric: [
      '0.5 kPa: dry mountain air',
      '2–3 kPa: typical coastal Hawaii',
    ],
    unitNote: 'Measured in kPa (kilopascals)',
  },
  VPsat_1_Avg: {
    label: 'Saturation Vapor Pressure',
    description: 'The maximum water vapor the air can hold at the current temperature. When actual vapor pressure reaches this value, the air is at 100% humidity and dew or fog can form.',
    examplesImperial: [
      'Warm air can hold far more moisture than cool air',
      'When this matches actual vapor pressure, fog and dew form',
    ],
    examplesMetric: [
      'Warm air can hold far more moisture than cool air',
      'When this matches actual vapor pressure, fog and dew form',
    ],
    unitNote: 'Measured in kPa (kilopascals)',
  },
  VPsat_2_Avg: {
    label: 'Saturation Vapor Pressure (Sensor 2)',
    description: 'A second saturation vapor pressure reading for redundancy.',
    examplesImperial: [
      'Higher at warmer temperatures',
      'When reached, dew or fog forms',
    ],
    examplesMetric: [
      'Higher at warmer temperatures',
      'When reached, dew or fog forms',
    ],
    unitNote: 'Measured in kPa (kilopascals)',
  },
  VPD_1_Avg: {
    label: 'Vapor Pressure Deficit',
    description: 'The "drying power" of the air — how far it is from being fully saturated. High VPD means the air is actively pulling moisture from plants, soil, and skin.',
    examplesImperial: [
      '0–0.5 kPa: humid, low stress for plants',
      '1–2 kPa: moderate drying conditions',
      '3+ kPa: high stress — rapid evaporation, drought concern',
    ],
    examplesMetric: [
      '0–0.5 kPa: humid, low stress for plants',
      '1–2 kPa: moderate drying conditions',
      '3+ kPa: high stress — rapid evaporation, drought concern',
    ],
    unitNote: 'Measured in kPa (kilopascals)',
  },
  VPD_2_Avg: {
    label: 'Vapor Pressure Deficit (Sensor 2)',
    description: 'A second VPD sensor for redundancy.',
    examplesImperial: [
      '0–0.5 kPa: humid',
      '3+ kPa: high drying stress',
    ],
    examplesMetric: [
      '0–0.5 kPa: humid',
      '3+ kPa: high drying stress',
    ],
    unitNote: 'Measured in kPa (kilopascals)',
  },

  // ── Rainfall ───────────────────────────────────────────────────────────────
  RF_1_Tot300s: {
    label: 'Rainfall (24hr Total)',
    description: 'Total rainfall accumulated over the past 24 hours at this station.',
    examplesImperial: [
      '0.1 in: a light shower',
      '1 in: moderate rain for the day',
      '4+ in: heavy rain — potential flooding in low-lying areas',
    ],
    examplesMetric: [
      '2.5 mm: a light shower',
      '25 mm: moderate rain for the day',
      '100+ mm: heavy rain — potential flooding in low-lying areas',
    ],
    unitNote: 'Displayed in inches (Imperial) or millimeters (Metric)',
  },
  RFint_1_Max: {
    label: 'Rainfall Intensity',
    description: 'The maximum rate at which rain is falling over a short interval. Intense short bursts are more likely to cause flooding than the same total spread over many hours.',
    examplesImperial: [
      '0.1 in/hr: light drizzle',
      '0.5 in/hr: moderate rain',
      '2+ in/hr: heavy downpour — flash flood risk increases significantly',
    ],
    examplesMetric: [
      '2.5 mm/hr: light drizzle',
      '12.7 mm/hr: moderate rain',
      '50+ mm/hr: heavy downpour — flash flood risk increases significantly',
    ],
    unitNote: 'Displayed in inches/hr (Imperial) or mm/hr (Metric)',
  },

  // ── Wind ───────────────────────────────────────────────────────────────────
  WS_1_Avg: {
    label: 'Wind Speed',
    description: "Average wind speed over the measurement interval. Hawaii's trade winds typically blow from the northeast at 10–20 mph.",
    examplesImperial: [
      '0–8 mph: calm to light breeze',
      '9–20 mph: typical trade wind conditions',
      '21–38 mph: strong winds, breezy advisory levels',
      '39+ mph: potentially damaging winds',
    ],
    examplesMetric: [
      '0–3.6 m/s: calm to light breeze',
      '4–9 m/s: typical trade wind conditions',
      '9.4–17 m/s: strong winds, breezy advisory levels',
      '17.5+ m/s: potentially damaging winds',
    ],
    unitNote: 'Displayed in mph (Imperial) or m/s (Metric)',
  },
  WDrs_1_Avg: {
    label: 'Wind Direction',
    description: "The compass direction the wind is coming FROM, measured in degrees clockwise from north. Hawaii's prevailing trade winds come from the northeast.",
    examplesImperial: [
      '0° / 360°: North',
      '45°: Northeast — typical trade winds',
      '90°: East',
      '180°: South',
      '270°: West',
    ],
    examplesMetric: [
      '0° / 360°: North',
      '45°: Northeast — typical trade winds',
      '90°: East',
      '180°: South',
      '270°: West',
    ],
    unitNote: 'Measured in degrees (0–360°)',
  },

  // ── Pressure ───────────────────────────────────────────────────────────────
  P_1_Avg: {
    label: 'Station Pressure',
    description: "Atmospheric air pressure at the station's actual elevation. Pressure naturally decreases with altitude, so mountain stations read lower than sea-level stations.",
    examplesImperial: [
      '~29.9 inHg at sea level',
      '~27.0 inHg at 3,000 ft elevation',
      'Rapid drops can signal an approaching storm',
    ],
    examplesMetric: [
      '~1013 hPa at sea level',
      '~915 hPa at 900 m elevation',
      'Rapid drops can signal an approaching storm',
    ],
    unitNote: 'Displayed in inHg (Imperial) or hPa (Metric)',
  },
  Psl_1_Avg: {
    label: 'Sea Level Pressure',
    description: 'Atmospheric pressure adjusted to what it would be at sea level. This allows fair comparison between stations at different elevations and is used in weather forecasting.',
    examplesImperial: [
      '29.92 inHg: standard atmosphere',
      '30.1+ inHg: high pressure — clear, calm weather likely',
      '29.5 inHg or lower: low pressure — stormy conditions possible',
    ],
    examplesMetric: [
      '1013 hPa: standard atmosphere',
      '1019+ hPa: high pressure — clear, calm weather likely',
      '999 hPa or lower: low pressure — stormy conditions possible',
    ],
    unitNote: 'Displayed in inHg (Imperial) or hPa (Metric)',
  },

  // ── Radiation ──────────────────────────────────────────────────────────────
  SWin_1_Avg: {
    label: 'Solar Radiation (Incoming)',
    description: 'The amount of sunlight energy arriving at the surface from the sun. Drives daytime heating, evaporation, and plant growth. Zero at night.',
    examplesImperial: [
      '0 W/m²: nighttime',
      '200–400 W/m²: partly cloudy day',
      '800–1000 W/m²: clear, sunny afternoon',
      '1000+ W/m²: peak direct tropical sun',
    ],
    examplesMetric: [
      '0 W/m²: nighttime',
      '200–400 W/m²: partly cloudy day',
      '800–1000 W/m²: clear, sunny afternoon',
      '1000+ W/m²: peak direct tropical sun',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  SWout_1_Avg: {
    label: 'Solar Radiation (Outgoing)',
    description: 'Sunlight reflected back from the surface. Lighter-colored surfaces reflect more than dark vegetation or water.',
    examplesImperial: [
      'Low values over dark forests or water',
      'Higher values over light-colored sand or bare soil',
    ],
    examplesMetric: [
      'Low values over dark forests or water',
      'Higher values over light-colored sand or bare soil',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  LWin_1_Avg: {
    label: 'Longwave Radiation (Incoming)',
    description: 'Heat energy radiated downward from the sky and clouds. Clouds radiate warmth back to the surface — this is why cloudy nights stay warmer than clear nights.',
    examplesImperial: [
      '300–400 W/m²: clear night sky',
      '400+ W/m²: heavy cloud cover',
    ],
    examplesMetric: [
      '300–400 W/m²: clear night sky',
      '400+ W/m²: heavy cloud cover',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  LWout_1_Avg: {
    label: 'Longwave Radiation (Outgoing)',
    description: 'Heat energy radiated upward from the ground. All warm surfaces emit heat radiation — this is the primary way Earth loses heat overnight.',
    examplesImperial: [
      'Higher values from warm surfaces',
      'Lower values from cooler surfaces',
    ],
    examplesMetric: [
      'Higher values from warm surfaces',
      'Lower values from cooler surfaces',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  SWnet_1_Avg: {
    label: 'Net Solar Radiation',
    description: 'Incoming solar radiation minus what is reflected back. Positive values mean the surface is absorbing more sunlight than it reflects.',
    examplesImperial: [
      'Near zero or negative at night',
      'Positive and rising through the morning as the sun climbs',
    ],
    examplesMetric: [
      'Near zero or negative at night',
      'Positive and rising through the morning as the sun climbs',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  LWnet_1_Avg: {
    label: 'Net Longwave Radiation',
    description: 'The balance between heat radiated from the ground and heat coming down from the sky. Usually negative — meaning the ground loses more heat than it receives from above.',
    examplesImperial: [
      'Strongly negative on clear, dry nights (rapid surface cooling)',
      'Near zero under thick cloud cover (clouds trap heat)',
    ],
    examplesMetric: [
      'Strongly negative on clear, dry nights (rapid surface cooling)',
      'Near zero under thick cloud cover (clouds trap heat)',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  Rnet_1_Avg: {
    label: 'Net Radiation',
    description: 'The total energy balance at the surface — all incoming energy minus all outgoing. Positive means the surface is gaining energy (warming); negative means it is losing energy (cooling).',
    examplesImperial: [
      'Positive during the day when sunlight dominates',
      'Negative at night as the ground radiates heat away',
      'Used to estimate evaporation rates and forecast temperature swings',
    ],
    examplesMetric: [
      'Positive during the day when sunlight dominates',
      'Negative at night as the ground radiates heat away',
      'Used to estimate evaporation rates and forecast temperature swings',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  Albedo_1_Avg: {
    label: 'Albedo',
    description: 'The fraction of sunlight reflected by the surface. A value near 0 means nearly all light is absorbed; near 1 means nearly all is reflected.',
    examplesImperial: [
      '0.05–0.15: dark forests or volcanic rock',
      '0.20–0.25: typical grassland',
      '0.30–0.40: dry bare soil',
      '0.80+: fresh snow or white sand',
    ],
    examplesMetric: [
      '0.05–0.15: dark forests or volcanic rock',
      '0.20–0.25: typical grassland',
      '0.30–0.40: dry bare soil',
      '0.80+: fresh snow or white sand',
    ],
    unitNote: 'Unitless ratio (0 to 1)',
  },

  // ── Soil ───────────────────────────────────────────────────────────────────
  Tsoil_1_Avg: {
    label: 'Soil Temperature (Shallow)',
    description: 'Temperature of the soil at a shallow depth. Affects seed germination, root health, and microbial activity in the top layer.',
    examplesImperial: [
      '50–60°F: cool soils, slow plant growth',
      '65–85°F: ideal range for most tropical crops',
      '90°F+: heat stress for shallow roots',
    ],
    examplesMetric: [
      '10–16°C: cool soils, slow plant growth',
      '18–29°C: ideal range for most tropical crops',
      '32°C+: heat stress for shallow roots',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },
  Tsoil_2_Avg: {
    label: 'Soil Temperature (Depth 2)',
    description: 'Temperature at a deeper soil layer. Changes more slowly than the surface, showing the delayed effect of surface conditions on root zones.',
    examplesImperial: [
      'Lags surface temperature by hours',
      'More stable indicator of root zone conditions',
    ],
    examplesMetric: [
      'Lags surface temperature by hours',
      'More stable indicator of root zone conditions',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },
  Tsoil_3_Avg: {
    label: 'Soil Temperature (Depth 3)',
    description: 'Temperature at an even deeper soil layer. Very stable — changes over days rather than hours.',
    examplesImperial: [
      'Reflects long-term ground temperature trends',
      'Useful for understanding deep root and irrigation timing',
    ],
    examplesMetric: [
      'Reflects long-term ground temperature trends',
      'Useful for understanding deep root and irrigation timing',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },
  Tsoil_4_Avg: {
    label: 'Soil Temperature (Deepest)',
    description: 'Temperature at the deepest measured soil depth. The most stable reading — useful for tracking seasonal ground temperature shifts.',
    examplesImperial: [
      'Changes slowly over weeks rather than days',
      'Reflects long-term baseline ground conditions',
    ],
    examplesMetric: [
      'Changes slowly over weeks rather than days',
      'Reflects long-term baseline ground conditions',
    ],
    unitNote: 'Displayed in °F (Imperial) or °C (Metric)',
  },
  SHFsrf_1_Avg: {
    label: 'Soil Heat Flux',
    description: 'The rate at which heat is moving into or out of the ground. Positive means the ground is warming up (absorbing heat); negative means it is cooling down (releasing stored heat).',
    examplesImperial: [
      'Positive during the day as the sun warms the soil',
      'Negative at night as stored heat escapes upward',
      'Used in agriculture to understand soil warming cycles and irrigation timing',
    ],
    examplesMetric: [
      'Positive during the day as the sun warms the soil',
      'Negative at night as stored heat escapes upward',
      'Used in agriculture to understand soil warming cycles and irrigation timing',
    ],
    unitNote: 'Measured in W/m² (watts per square meter)',
  },
  SM_1_Avg: {
    label: 'Soil Moisture (Shallow)',
    description: 'The amount of water held in the shallow soil layer, as a fraction of the total soil volume. Critical for agriculture, drought monitoring, and wildfire risk assessment.',
    examplesImperial: [
      '0–10%: very dry — drought stress, elevated fire risk',
      '20–35%: well-watered — good growing conditions',
      '40%+: saturated — waterlogging or runoff possible',
    ],
    examplesMetric: [
      '0–10%: very dry — drought stress, elevated fire risk',
      '20–35%: well-watered — good growing conditions',
      '40%+: saturated — waterlogging or runoff possible',
    ],
    unitNote: 'Displayed as a percentage (volumetric water content)',
  },
  SM_2_Avg: {
    label: 'Soil Moisture (Depth 2)',
    description: 'Water content in a deeper soil layer. A longer-term moisture reserve that plants draw on during dry periods between rain events.',
    examplesImperial: [
      'Lower than surface during dry spells',
      'More stable — does not swing as quickly with individual rain events',
    ],
    examplesMetric: [
      'Lower than surface during dry spells',
      'More stable — does not swing as quickly with individual rain events',
    ],
    unitNote: 'Displayed as a percentage (volumetric water content)',
  },
  SM_3_Avg: {
    label: 'Soil Moisture (Deepest)',
    description: 'Water content at the deepest measured soil depth. Reflects long-term drainage patterns and groundwater recharge.',
    examplesImperial: [
      'Very stable under normal conditions',
      'Slow to respond to individual rain events',
    ],
    examplesMetric: [
      'Very stable under normal conditions',
      'Slow to respond to individual rain events',
    ],
    unitNote: 'Displayed as a percentage (volumetric water content)',
  },
};
