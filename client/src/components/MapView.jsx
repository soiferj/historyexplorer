import React from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl'; 
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';
import mapboxgl from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import { filterByDate } from '@openhistoricalmap/maplibre-gl-dates';
import { createPortal } from 'react-dom';

// Use the same color palette as Timeline
const colorPalette = [
    '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#818cf8', '#f472b6', '#f59e42', '#10b981', '#6366f1', '#e879f9', '#f43f5e', '#0ea5e9', '#fde047', '#22d3ee'
];

// Simple region-to-coords mapping (expand as needed)
const regionCoords = {
  "europe": [51, 10],
  "east asia": [35, 105],
  "south asia": [20, 78],
  "north america": [40, -100],
  "south america": [-15, -60],
  "africa": [2, 21],
  "north africa": [28, 10], // Added/ensured
  "middle east": [29, 45],
  "central america": [15, -90], // Added
  "mediterranean": [38, 18], // Added
  "asia": [34, 100], // Added
  "central asia": [45, 70],
  "oceania": [-22, 140],
  "southeast asia": [10, 105],
  "caribbean": [18, -75],
  "north europe": [60, 20], // Added
  "east europe": [54, 30], // Added
  "north asia": [65, 100], // Added
  "south europe": [41, 15], // Added
  // Add more as needed
};

// Expanded country-to-coords mapping
const countryCoords = {
  "afghanistan": [33.9391, 67.7100],
  "albania": [41.1533, 20.1683],
  "algeria": [28.0339, 1.6596],
  "andorra": [42.5063, 1.5218],
  "angola": [-11.2027, 17.8739],
  "antigua and barbuda": [17.0608, -61.7964],
  "argentina": [-38.4161, -63.6167],
  "armenia": [40.0691, 45.0382],
  "australia": [-25.2744, 133.7751],
  "austria": [47.5162, 14.5501],
  "azerbaijan": [40.1431, 47.5769],
  "bahamas": [25.0343, -77.3963],
  "bahrain": [26.0667, 50.5577],
  "bangladesh": [23.6850, 90.3563],
  "barbados": [13.1939, -59.5432],
  "belarus": [53.7098, 27.9534],
  "belgium": [50.5039, 4.4699],
  "belize": [17.1899, -88.4976],
  "benin": [9.3077, 2.3158],
  "bhutan": [27.5142, 90.4336],
  "bolivia": [-16.2902, -63.5887],
  "bosnia and herzegovina": [43.9159, 17.6791],
  "botswana": [-22.3285, 24.6849],
  "brazil": [-14.235, -51.9253],
  "brunei": [4.5353, 114.7277],
  "bulgaria": [42.7339, 25.4858],
  "burkina faso": [12.2383, -1.5616],
  "burundi": [-3.3731, 29.9189],
  "cabo verde": [16.5388, -23.0418],
  "cambodia": [12.5657, 104.9910],
  "cameroon": [7.3697, 12.3547],
  "canada": [56.1304, -106.3468],
  "central african republic": [6.6111, 20.9394],
  "chad": [15.4542, 18.7322],
  "chile": [-35.6751, -71.5430],
  "china": [35.8617, 104.1954],
  "colombia": [4.5709, -74.2973],
  "comoros": [-11.6455, 43.3333],
  "congo": [-0.2280, 15.8277],
  "democratic republic of the congo": [-4.0383, 21.7587],
  "costa rica": [9.7489, -83.7534],
  "croatia": [45.1000, 15.2000],
  "cuba": [21.5218, -77.7812],
  "cyprus": [35.1264, 33.4299],
  "czechia": [49.8175, 15.4730],
  "denmark": [56.2639, 9.5018],
  "djibouti": [11.8251, 42.5903],
  "dominica": [15.4150, -61.3710],
  "dominican republic": [18.7357, -70.1627],
  "ecuador": [-1.8312, -78.1834],
  "egypt": [26.8206, 30.8025],
  "el salvador": [13.7942, -88.8965],
  "equatorial guinea": [1.6508, 10.2679],
  "eritrea": [15.1794, 39.7823],
  "estonia": [58.5953, 25.0136],
  "eswatini": [-26.5225, 31.4659],
  "ethiopia": [9.1450, 40.4897],
  "fiji": [-17.7134, 178.0650],
  "finland": [61.9241, 25.7482],
  "france": [46.6034, 1.8883],
  "gabon": [-0.8037, 11.6094],
  "gambia": [13.4432, -15.3101],
  "georgia": [42.3154, 43.3569],
  "germany": [51.1657, 10.4515],
  "ghana": [7.9465, -1.0232],
  "greece": [39.0742, 21.8243],
  "grenada": [12.1165, -61.6790],
  "guatemala": [15.7835, -90.2308],
  "guinea": [9.9456, -9.6966],
  "guinea-bissau": [11.8037, -15.1804],
  "guyana": [4.8604, -58.9302],
  "haiti": [18.9712, -72.2852],
  "honduras": [13.2000, -85.6667],
  "hungary": [47.1625, 19.5033],
  "iceland": [64.9631, -19.0208],
  "india": [20.5937, 78.9629],
  "indonesia": [-0.7893, 113.9213],
  "iran": [32.4279, 53.6880],
  "iraq": [33.2232, 43.6793],
  "ireland": [53.4129, -8.2439],
  "israel": [31.0461, 34.8516],
  "italy": [41.8719, 12.5674],
  "jamaica": [18.1096, -77.2975],
  "japan": [36.2048, 138.2529],
  "jordan": [30.5852, 36.2384],
  "kazakhstan": [48.0196, 66.9237],
  "kenya": [-1.2921, 36.8219],
  "kiribati": [-3.3704, -168.7340],
  "north korea": [40.3399, 127.5101],
  "south korea": [35.9078, 127.7669],
  "kosovo": [42.6026, 20.9030],
  "kuwait": [29.3117, 47.4818],
  "kyrgyzstan": [41.2044, 74.7661],
  "laos": [19.8563, 102.4955],
  "latvia": [56.8796, 24.6032],
  "lebanon": [33.8547, 35.8623],
  "lesotho": [-29.6099, 28.2336],
  "liberia": [6.4281, -9.4295],
  "libya": [26.3351, 17.2283],
  "liechtenstein": [47.1660, 9.5554],
  "lithuania": [55.1694, 23.8813],
  "luxembourg": [49.8153, 6.1296],
  "madagascar": [-18.7669, 46.8691],
  "malawi": [-13.2543, 34.3015],
  "malaysia": [4.2105, 101.9758],
  "maldives": [3.2028, 73.2207],
  "mali": [17.5707, -3.9962],
  "malta": [35.9375, 14.3754],
  "marshall islands": [7.1315, 171.1845],
  "mauritania": [21.0079, -10.9408],
  "mauritius": [-20.3484, 57.5522],
  "mexico": [23.6345, -102.5528],
  "micronesia": [7.4256, 150.5508],
  "moldova": [47.4116, 28.3699],
  "monaco": [43.7384, 7.4246],
  "mongolia": [46.8625, 103.8467],
  "montenegro": [42.7087, 19.3744],
  "morocco": [31.7917, -7.0926],
  "mozambique": [-18.6657, 35.5296],
  "myanmar": [21.9162, 95.9560],
  "namibia": [-22.9576, 18.4904],
  "nauru": [-0.5228, 166.9315],
  "nepal": [28.3949, 84.1240],
  "netherlands": [52.1326, 5.2913],
  "new zealand": [-40.9006, 174.8860],
  "nicaragua": [12.8654, -85.2072],
  "niger": [17.6078, 8.0817],
  "nigeria": [9.0820, 8.6753],
  "north macedonia": [41.6086, 21.7453],
  "norway": [60.4720, 8.4689],
  "oman": [21.4735, 55.9754],
  "pakistan": [30.3753, 69.3451],
  "palau": [7.5150, 134.5825],
  "palestine": [31.9522, 35.2332],
  "panama": [8.5380, -80.7821],
  "papua new guinea": [-6.3149, 143.9555],
  "paraguay": [-23.4425, -58.4438],
  "peru": [-9.1900, -75.0152],
  "philippines": [12.8797, 121.7740],
  "poland": [51.9194, 19.1451],
  "portugal": [39.3999, -8.2245],
  "qatar": [25.3548, 51.1839],
  "romania": [45.9432, 24.9668],
  "russia": [61.5240, 105.3188],
  "rwanda": [-1.9403, 29.8739],
  "saint kitts and nevis": [17.3578, -62.782998],
  "saint lucia": [13.9094, -60.9789],
  "saint vincent and the grenadines": [12.9843, -61.2872],
  "samoa": [-13.7590, -172.1046],
  "san marino": [43.9424, 12.4578],
  "sao tome and principe": [0.1864, 6.6131],
  "saudi arabia": [23.8859, 45.0792],
  "senegal": [14.4974, -14.4524],
  "serbia": [44.0165, 21.0059],
  "seychelles": [-4.6796, 55.491977],
  "sierra leone": [8.4606, -11.7799],
  "singapore": [1.3521, 103.8198],
  "slovakia": [48.6690, 19.6990],
  "slovenia": [46.1512, 14.9955],
  "solomon islands": [-9.6457, 160.1562],
  "somalia": [5.1521, 46.1996],
  "south africa": [-30.5595, 22.9375],
  "south sudan": [6.8770, 31.3070],
  "spain": [40.4637, -3.7492],
  "sri lanka": [7.8731, 80.7718],
  "sudan": [12.8628, 30.2176],
  "suriname": [3.9193, -56.0278],
  "sweden": [60.1282, 18.6435],
  "switzerland": [46.8182, 8.2275],
  "syria": [34.8021, 38.9968],
  "taiwan": [23.6978, 120.9605],
  "tajikistan": [38.8610, 71.2761],
  "tanzania": [-6.3690, 34.8888],
  "thailand": [15.8700, 100.9925],
  "timor-leste": [-8.8742, 125.7275],
  "togo": [8.6195, 0.8248],
  "tonga": [-21.1789, -175.1982],
  "trinidad and tobago": [10.6918, -61.2225],
  "tunisia": [33.8869, 9.5375],
  "turkey": [38.9637, 35.2433],
  "turkmenistan": [38.9697, 59.5563],
  "tuvalu": [-7.1095, 177.6493],
  "uganda": [1.3733, 32.2903],
  "ukraine": [48.3794, 31.1656],
  "united arab emirates": [23.4241, 53.8478],
  "united kingdom": [55.3781, -3.4360],
  "united states": [37.0902, -95.7129],
  "uruguay": [-32.5228, -55.7658],
  "uzbekistan": [41.3775, 64.5853],
  "vanuatu": [-15.3767, 166.9592],
  "vatican city": [41.9029, 12.4534],
  "venezuela": [6.4238, -66.5897],
  "vietnam": [14.0583, 108.2772],
  "yemen": [15.5527, 48.5164],
  "zambia": [-13.1339, 27.8493],
  "zimbabwe": [-19.0154, 29.1549],
  "greenland": [71.7069, -42.6043],
  "faroe islands": [62.0, -6.8]
};

// Map era/century tile layers
// Add minZoom/maxZoom for each era
// Add recommended center/zoom for each era
const mapEras = [
  {
    label: 'Modern',
    value: 'modern',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 1,
    maxZoom: 18,
    center: [20, 0],
    zoom: 2
  },
  {
    label: 'Historical',
    value: 'ohm',
    url: 'https://www.openhistoricalmap.org/map-styles/main/main.json', // Not used by TileLayer, but for reference
    attribution: '<a href="https://www.openhistoricalmap.org/">OpenHistoricalMap</a>',
    minZoom: 1,
    maxZoom: 18,
    center: [20, 0],
    zoom: 2
  },
  {
    label: 'Roman Empire',
    value: 'roman',
    url: 'https://dh.gu.se/tiles/imperium/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; <a href="http://pelagios.org/">Pelagios</a> Imperium Romanum project.',
    minZoom: 3,
    maxZoom: 7,
    center: [41, 15],
    zoom: 4
  },
  {
    label: 'Historical Basemaps',
    value: 'historical-basemaps',
    url: '', // Not used
    attribution: '<a href="https://github.com/aourednik/historical-basemaps">Historical Basemaps</a>',
    minZoom: 1,
    maxZoom: 10,
    center: [30, 10],
    zoom: 2
  },
  // Add more eras as needed
];

const MapView = ({ events = [], onRegionSelect, setSelectedRegions, setSelectedCountries, loading, error, onBackToTimeline }) => {
  
  const apiUrl = process.env.REACT_APP_API_URL;
  
  // Toggle state: 'region' or 'country'
  const [viewMode, setViewMode] = React.useState('country');
  // Animation state
  const [animating, setAnimating] = React.useState(false);
  const [currentLineIdx, setCurrentLineIdx] = React.useState(-1);
  const [linesToDraw, setLinesToDraw] = React.useState([]);
  const [paused, setPaused] = React.useState(false);
  const [speed] = React.useState(4000); // Animation speed in ms per frame (changed from 1500 to 4000)
  const timerRef = React.useRef(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalEvents, setModalEvents] = React.useState([]);
  const [modalTitle, setModalTitle] = React.useState("");
  const [selectedEra, setSelectedEra] = React.useState('modern');
  const selectedEraObj = mapEras.find(e => e.value === selectedEra) || mapEras[0];
  const [mapCenter, setMapCenter] = React.useState(selectedEraObj.center);
  const [mapZoom, setMapZoom] = React.useState(selectedEraObj.zoom);
  const [selectedYear, setSelectedYear] = React.useState(null);

  // Add state for toggling events
  const [showEvents, setShowEvents] = React.useState(true);

  // Add state for tempYear (for slider dragging)
  const [tempYear, setTempYear] = React.useState(null);

  // Compute min/max year and date type from sorted events (for OHM slider)
  const ohmYearData = React.useMemo(() => {
    // Build a sorted list of years with their date types
    const filtered = (events || []).filter(ev => ev.date && !isNaN(parseInt(ev.date.split("-"), 10)));
    if (filtered.length === 0) return null;
    // Map to { year: number, dateType: 'BCE'|'CE' }
    const yearObjs = filtered.map(ev => {
      let y = parseInt(ev.date.split("-")[0], 10);
      let type = ev.date_type || 'CE';
      if (type === 'BCE') y = -Math.abs(y); // BCE as negative
      else y = Math.abs(y); // CE as positive
      return { year: y, dateType: type };
    });
    // Sort: BCE (negative, descending), then CE (positive, ascending)
    yearObjs.sort((a, b) => a.year - b.year);
    const years = yearObjs.map(obj => obj.year);
    const yearToType = {};
    yearObjs.forEach(obj => { yearToType[obj.year] = obj.dateType; });
    return {
      min: years[0],
      max: years[years.length - 1],
      years,
      yearToType,
    };
  }, [events]);

  // Compute centuries from events for OHM dropdown
  const ohmCenturyData = React.useMemo(() => {
    if (!ohmYearData) return null;
    // Map each year to its century and dateType
    const centuriesSet = new Set();
    const centuryToYear = {};
    const centuryToType = {};
    ohmYearData.years.forEach(y => {
      let absYear = Math.abs(y);
      let type = ohmYearData.yearToType[y] || (y < 0 ? 'BCE' : 'CE');
      let centuryNum;
      if (type === 'BCE') {
        centuryNum = Math.ceil(absYear / 100);
        const firstYear = -((centuryNum - 1) * 100 + 1);
        centuriesSet.add(`-${centuryNum}`);
        centuryToYear[`-${centuryNum}`] = firstYear;
        centuryToType[`-${centuryNum}`] = 'BCE';
      } else {
        centuryNum = Math.ceil(absYear / 100);
        const firstYear = (centuryNum - 1) * 100 + 1;
        centuriesSet.add(`${centuryNum}`);
        centuryToYear[`${centuryNum}`] = firstYear;
        centuryToType[`${centuryNum}`] = 'CE';
      }
    });
    // Calculate latest century BEFORE adding 21st
    const sortedBefore21 = Array.from(centuriesSet).sort((a, b) => parseInt(a) - parseInt(b));
    const latestCenturyBefore21 = sortedBefore21[sortedBefore21.length - 1];
    // Always include 21st century CE
    centuriesSet.add('21');
    if (!centuryToYear['21']) {
      centuryToYear['21'] = 2001;
      centuryToType['21'] = 'CE';
    }
    // Sort centuries: BCE (negative, descending), then CE (positive, ascending)
    const sorted = Array.from(centuriesSet).sort((a, b) => parseInt(a) - parseInt(b));
    return {
      centuries: sorted,
      centuryToYear,
      centuryToType,
      latestCenturyBefore21,
    };
  }, [ohmYearData]);

  // Set default selectedYear when OHM is selected or events change
  React.useEffect(() => {
    if (selectedEra === 'ohm' && ohmYearData) {
      setSelectedYear(y => {
        // Always default to the last (most recent) year in the filtered events
        const lastYear = ohmYearData.max;
        if (y == null || y < ohmYearData.min || y > ohmYearData.max) {
          return lastYear;
        }
        return y;
      });
    }
  }, [selectedEra, ohmYearData, ohmCenturyData]);

  // Group events by region
  const regionEvents = React.useMemo(() => {
    const grouped = {};
    (events || []).forEach(ev => {
      (ev.regions || []).forEach(region => {
        if (!grouped[region]) grouped[region] = [];
        grouped[region].push(ev);
      });
    });
    return grouped;
  }, [events]);

  // Group events by country
  const countryEvents = React.useMemo(() => {
    const grouped = {};
    (events || []).forEach(ev => {
      (ev.countries || []).forEach(country => {
        if (!grouped[country]) grouped[country] = [];
        grouped[country].push(ev);
      });
    });
    return grouped;
  }, [events]);

  // Assign a color to each region/country (by order)
  const regionList = React.useMemo(() => Object.keys(regionEvents), [regionEvents]);
  const countryList = React.useMemo(() => Object.keys(countryEvents), [countryEvents]);
  const regionColor = React.useMemo(() => regionList.reduce((acc, region, idx) => {
    acc[region] = colorPalette[idx % colorPalette.length];
    return acc;
  }, {}), [regionList]);
  const countryColor = React.useMemo(() => countryList.reduce((acc, country, idx) => {
    acc[country] = colorPalette[idx % colorPalette.length];
    return acc;
  }, {}), [countryList]);

  // Helper to sort events: BCE descending, CE ascending
  function sortEvents(events) {
    return (events || []).slice().sort((a, b) => {
      if (a.date_type === b.date_type) {
        const aYear = a.date ? parseInt(a.date.split("-")[0], 10) : 0;
        const bYear = b.date ? parseInt(b.date.split("-")[0], 10) : 0;
        if (a.date_type === "BCE") {
          return bYear - aYear; // Descending for BCE
        } else {
          return aYear - bYear; // Ascending for CE
        }
      }
      return a.date_type === "BCE" ? -1 : 1;
    });
  }

  // Calculate lines to draw whenever events or viewMode change
  React.useEffect(() => {
    let lines = [];
    // Use sorted events for animation order
    const sortedEvents = sortEvents(events);
    sortedEvents.forEach(ev => {
      const year = ev.date ? new Date(ev.date).getFullYear() : undefined;
      const dateType = ev.date_type || '';
      if (viewMode === 'region' && ev.regions && ev.regions.length > 0) {
        // Group all regions for this event into a single frame
        const dests = (ev.regions || []).map(region => {
          const coords = regionCoords[region.toLowerCase()];
          if (!coords) {
            console.warn(`Region not found in regionCoords: '${region}' (event: ${ev.title})`);
            return null;
          }
          return {
            coords,
            name: region,
            color: regionColor[region] || '#f472b6',
            count: (regionEvents[region] || []).length
          };
        }).filter(Boolean);
        if (dests.length > 0) {
          lines.push({
            points: [],
            dests,
            eventTitle: ev.title,
            year,
            dateType
          });
        }
      } else if (viewMode === 'country' && ev.countries && ev.countries.length > 0) {
        // Group all countries for this event into a single frame
        const dests = (ev.countries || []).map(country => {
          const coords = countryCoords[country.toLowerCase()];
          if (!coords) {
            console.warn(`Country not found in countryCoords: '${country}' (event: ${ev.title})`);
            return null;
          }
          return {
            coords,
            name: country,
            color: countryColor[country] || '#f472b6',
            count: (countryEvents[country] || []).length
          };
        }).filter(Boolean);
        if (dests.length > 0) {
          lines.push({
            points: [],
            dests,
            eventTitle: ev.title,
            year,
            dateType
          });
        }
      }
    });
    setLinesToDraw(lines);
    setCurrentLineIdx(-1);
    setPaused(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [events, viewMode, countryColor, regionColor, regionEvents, countryEvents]);

  // Animation effect: step through linesToDraw
  React.useEffect(() => {
    if (!animating || paused) return;
    if (!linesToDraw.length) return;
    if (currentLineIdx >= linesToDraw.length - 1) {
      timerRef.current = setTimeout(() => setAnimating(false), 1200);
      return;
    }
    timerRef.current = setTimeout(() => {
      setCurrentLineIdx(idx => idx + 1);
    }, speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [animating, paused, currentLineIdx, linesToDraw, speed]);

  // During animation or manual frame change, if OHM is selected, set the map year to the event's year (respecting BCE/CE sign)
  React.useEffect(() => {
    if (
      selectedEra === 'ohm' &&
      currentLineIdx >= 0 &&
      linesToDraw[currentLineIdx] &&
      linesToDraw[currentLineIdx].year != null
    ) {
      let y = linesToDraw[currentLineIdx].year;
      let type = linesToDraw[currentLineIdx].dateType || (y < 0 ? 'BCE' : 'CE');
      // Ensure BCE is negative, CE is positive
      if (type === 'BCE') y = -Math.abs(y);
      else y = Math.abs(y);
      if (y !== selectedYear) {
        setSelectedYear(y);
      }
    }
    // Only run when currentLineIdx, selectedEra, linesToDraw, or selectedYear changes
  }, [selectedEra, currentLineIdx, linesToDraw, selectedYear]);

  // Stop animation
  const handleStop = () => {
    setAnimating(false);
    setPaused(false);
    setCurrentLineIdx(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Pause/Resume animation
  const handlePauseResume = () => {
    if (!animating) return;
    setPaused(p => !p);
  };

  // Step forward
  const handleForward = () => {
    if (!linesToDraw.length) return;
    setCurrentLineIdx(idx => {
      if (idx < linesToDraw.length - 1) {
        return idx + 1;
      }
      return idx;
    });
  };

  // Step back
  const handleBack = () => {
    setCurrentLineIdx(idx => Math.max(idx - 1, -1));
  };

  // Play animation from current frame
  const handlePlay = () => {
    if (linesToDraw.length === 0) return;
    // If at the end, reset to beginning
    if (currentLineIdx >= linesToDraw.length - 1) {
      setCurrentLineIdx(-1);
      setAnimating(true);
      setPaused(false);
      return;
    }
    setAnimating(true);
    setPaused(false);
  };

  // Handler for marker click (region or country)
  const handleMarkerClick = (name) => {
    let eventsList = [];
    if (viewMode === 'region') {
      setSelectedRegions && setSelectedRegions([name]);
      eventsList = regionEvents[name] || [];
    } else {
      setSelectedCountries && setSelectedCountries([name]);
      eventsList = countryEvents[name] || [];
    }
    setModalTitle(name);
    setModalEvents(sortEvents(eventsList));
    setModalOpen(true);
  };

  // Helper component to animate map view on event change
  function MapAnimator({ currentLine, animating }) {
    const map = useMap();
    React.useEffect(() => {
      if (!currentLine || !animating) return;
      if (!currentLine.dests || currentLine.dests.length === 0) return;
      const coordsList = currentLine.dests.map(dest => dest.coords).filter(Boolean);
      if (coordsList.length === 1) {
        map.setView(coordsList[0], 4, { animate: true }); // Zoom in on single country/region
      } else if (coordsList.length > 1) {
        const bounds = L.latLngBounds(coordsList);
        map.fitBounds(bounds, { padding: [60, 60], animate: true, maxZoom: 5 });
      }
    }, [currentLine, animating, map]);
    return null;
  }

  // Helper to set map view on era change
  function MapEraViewSetter({ center, zoom }) {
    const map = useMap();
    React.useEffect(() => {
      map.setView(center, zoom, { animate: true });
    }, [center, zoom, map]);
    return null;
  }

  // Track previous era to only reset view when era actually changes
  const prevEraRef = React.useRef(selectedEra);
  React.useEffect(() => {
    if (prevEraRef.current !== selectedEra) {
      setMapCenter(selectedEraObj.center);
      setMapZoom(selectedEraObj.zoom);
      prevEraRef.current = selectedEra;
    }
    // Do not reset view if only selectedEraObj changes (e.g., props update)
  }, [selectedEra, selectedEraObj]);

  // Track map center/zoom on user interaction to preserve state and trigger re-render for clustering
  const handleMapMove = React.useCallback((map) => {
    setMapCenter(map.getCenter());
    setMapZoom(map.getZoom()); // <-- update zoom state
  }, []);

  // Custom MapEventHandler to update center/zoom state
  function MapEventHandler() {
    const map = useMap();
    React.useEffect(() => {
      const onMove = () => handleMapMove(map);
      map.on('moveend', onMove);
      map.on('zoomend', onMove);
      return () => {
        map.off('moveend', onMove);
        map.off('zoomend', onMove);
      };
    }, [map]);
    return null;
  }

  // Fetch geojson for historical-basemaps era
  const [historicalGeojson, setHistoricalGeojson] = React.useState(null);
  const [historicalGeojsonLoading, setHistoricalGeojsonLoading] = React.useState(false);
  const [historicalGeojsonError, setHistoricalGeojsonError] = React.useState(null);
  const [availableHistoricalYears, setAvailableHistoricalYears] = React.useState([]);
  const [availableHistoricalYearsLoading, setAvailableHistoricalYearsLoading] = React.useState(false);
  const [availableHistoricalYearsError, setAvailableHistoricalYearsError] = React.useState(null);

  // Fetch geojson for historical-basemaps era
  React.useEffect(() => {
    if (selectedEra !== 'historical-basemaps' || !selectedYear) {
      setHistoricalGeojson(null);
      setHistoricalGeojsonError(null);
      return;
    }
    let isMounted = true;
    setHistoricalGeojsonLoading(true);
    setHistoricalGeojsonError(null);
    const fetchGeojson = async () => {
      try {
        let yearStr = selectedYear < 0 ? `bc${Math.abs(selectedYear)}` : `${selectedYear}`;
        const response = await fetch(`${apiUrl}/historical-map/${yearStr}`);
        if (!response.ok) throw new Error('Map not found for year');
        const data = await response.json();
        if (isMounted) {
          setHistoricalGeojson(data.geojson);
          setHistoricalGeojsonLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setHistoricalGeojson(null);
          setHistoricalGeojsonError(e.message || 'Failed to load map');
          setHistoricalGeojsonLoading(false);
        }
      }
    };
    fetchGeojson();
    return () => { isMounted = false; };
  }, [selectedEra, selectedYear, apiUrl]);

  // Fetch available years from backend (proxy) using async/await and apiUrl
  React.useEffect(() => {
    if (selectedEra !== 'historical-basemaps') return;
    let isMounted = true;
    setAvailableHistoricalYearsLoading(true);
    setAvailableHistoricalYearsError(null);
    const fetchYears = async () => {
      try {
        const response = await fetch(`${apiUrl}/historical-map/years`);
        if (!response.ok) throw new Error('Failed to fetch available years');
        const data = await response.json();
        if (isMounted) {
          setAvailableHistoricalYears(Array.isArray(data.years) ? data.years : []);
          setAvailableHistoricalYearsLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setAvailableHistoricalYears([]);
          setAvailableHistoricalYearsError(e.message || 'Failed to load years');
          setAvailableHistoricalYearsLoading(false);
        }
      }
    };
    fetchYears();
    return () => { isMounted = false; };
  }, [selectedEra, apiUrl]);

  // Filter availableHistoricalYears for historical-basemaps to only years >= -2000
  const filteredHistoricalYears = React.useMemo(() => {
    return availableHistoricalYears.filter(y => y >= -2000);
  }, [availableHistoricalYears]);

  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // Handle Escape key to exit full screen
  React.useEffect(() => {
    if (!isFullScreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Prevent body scroll when full screen
  React.useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullScreen]);

  const mapJSX = (
    <div className={`w-full h-[500px] relative${selectedEra === 'ohm' ? ' pb-16' : ' pb-8'}${isFullScreen ? ' fixed inset-0 z-[9999] bg-black' : ''}`}
      style={isFullScreen ? { height: '100vh', width: '100vw', borderRadius: 0, top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' } : {}}>
      {/* Era/Century selector */}
      <div className="w-full flex justify-center mb-2 gap-4">
        <label htmlFor="era-select" className="text-white font-semibold mr-2">Map Type:</label>
        <select
          id="era-select"
          className="px-3 py-1 rounded border border-blue-400 bg-gray-800 text-white shadow"
          value={selectedEra}
          onChange={e => setSelectedEra(e.target.value)}
        >
          {mapEras.map(era => (
            <option key={era.value} value={era.value}>{era.label}</option>
          ))}
        </select>
      </div>
      {/* OHM Year Slider */}
      {selectedEra === 'ohm' && ohmYearData && (
        <>
          {/* Custom style for larger slider thumb only (not the track) */}
          <style>{`
            #ohm-year-slider::-webkit-slider-thumb {
              width: 32px;
              height: 32px;
              background: #60a5fa;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 2px 8px #0004;
              cursor: pointer;
              -webkit-appearance: none;
              appearance: none;
            }
            #ohm-year-slider::-moz-range-thumb {
              width: 32px;
              height: 32px;
              background: #60a5fa;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 2px 8px #0004;
              cursor: pointer;
            }
            #ohm-year-slider::-ms-thumb {
              width: 32px;
              height: 32px;
              background: #60a5fa;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 2px 8px #0004;
              cursor: pointer;
            }
          `}</style>
          <div className="w-full flex flex-col items-center mb-2 gap-2">
            {/* Year input + slider row (now replaces the label) */}
            <div className="flex items-center gap-3 w-full max-w-lg">
              <span className="text-blue-200 font-mono text-xs min-w-[40px] text-right">
                {ohmYearData.min < 0 ? `${Math.abs(ohmYearData.min)} BCE` : `${ohmYearData.min} CE`}
              </span>
              <input
                id="ohm-year-slider"
                type="range"
                min={ohmYearData.min}
                max={ohmYearData.max}
                step={1}
                value={tempYear != null ? tempYear : (selectedYear ?? ohmYearData.max)}
                onChange={e => {
                  setTempYear(Number(e.target.value));
                }}
                onMouseUp={e => {
                  if (tempYear != null) setSelectedYear(tempYear);
                  setTempYear(null);
                }}
                onTouchEnd={e => {
                  if (tempYear != null) setSelectedYear(tempYear);
                  setTempYear(null);
                }}
                className="flex-1 accent-blue-400 h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
              />
              <div className="text-blue-100 text-xs mt-1 flex items-center gap-2 justify-center">
                <input
                  type="number"
                  min={ohmYearData.min < 0 ? Math.abs(ohmYearData.min) : ohmYearData.min}
                  max={ohmYearData.max}
                  value={(() => {
                    const y = tempYear != null ? tempYear : (selectedYear ?? ohmYearData.max);
                    return y < 0 ? Math.abs(y) : y;
                  })()}
                  onChange={e => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = ohmYearData.min < 0 ? Math.abs(ohmYearData.min) : ohmYearData.min;
                    // Determine BCE/CE from selector
                    const era = (tempYear != null ? tempYear : (selectedYear ?? ohmYearData.max)) < 0 ? 'BCE' : 'CE';
                    if (era === 'BCE') val = -Math.abs(val);
                    if (era === 'CE') val = Math.abs(val);
                    // Clamp
                    if (val < ohmYearData.min) val = ohmYearData.min;
                    if (val > ohmYearData.max) val = ohmYearData.max;
                    setTempYear(val);
                  }}
                  onBlur={e => {
                    if (tempYear != null) setSelectedYear(tempYear);
                    setTempYear(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tempYear != null) {
                      setSelectedYear(tempYear);
                      setTempYear(null);
                    }
                  }}
                  className="w-20 px-2 py-1 rounded border border-blue-400 bg-gray-800 text-blue-100 font-mono text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  aria-label="Enter year manually"
                />
                <select
                  value={(tempYear != null ? tempYear : (selectedYear ?? ohmYearData.max)) < 0 ? 'BCE' : 'CE'}
                  onChange={e => {
                    let y = tempYear != null ? tempYear : (selectedYear ?? ohmYearData.max);
                    let val = Math.abs(y);
                    if (e.target.value === 'BCE') val = -val;
                    setTempYear(val);
                  }}
                  className="px-2 py-1 rounded border border-blue-400 bg-gray-800 text-blue-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  aria-label="Select BCE or CE"
                >
                  <option value="CE">CE</option>
                  <option value="BCE">BCE</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Historical Basemaps year slider (replaces dropdown) */}
      {selectedEra === 'historical-basemaps' && filteredHistoricalYears && filteredHistoricalYears.length > 0 && (
        <>
          <style>{`
            #historical-basemaps-year-slider::-webkit-slider-thumb {
              width: 32px;
              height: 32px;
              background: #38bdf8;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 2px 8px #0004;
              cursor: pointer;
              -webkit-appearance: none;
              appearance: none;
            }
            #historical-basemaps-year-slider::-moz-range-thumb {
              width: 32px;
              height: 32px;
              background: #38bdf8;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 2px 8px #0004;
              cursor: pointer;
            }
            #historical-basemaps-year-slider::-ms-thumb {
              width: 32px;
              height: 32px;
              background: #38bdf8;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 2px 8px #0004;
              cursor: pointer;
            }
          `}</style>
          <div className="w-full flex flex-col items-center mb-2 gap-2">
            <div className="flex items-center gap-3 w-full max-w-lg">
              <span className="text-blue-200 font-mono text-xs min-w-[40px] text-right">
                {filteredHistoricalYears[0] < 0 ? `${Math.abs(filteredHistoricalYears[0])} BCE` : `${filteredHistoricalYears[0]} CE`}
              </span>
              <input
                id="historical-basemaps-year-slider"
                type="range"
                min={Math.min(...filteredHistoricalYears)}
                max={Math.max(...filteredHistoricalYears)}
                step={1}
                value={tempYear != null ? tempYear : (selectedYear ?? Math.max(...filteredHistoricalYears))}
                onChange={e => {
                  setTempYear(Number(e.target.value));
                }}
                onMouseUp={e => {
                  if (tempYear != null) {
                    // Find closest available year <= tempYear
                    let y = tempYear;
                    let closest = filteredHistoricalYears.filter(yr => yr <= y).pop();
                    if (closest == null) closest = filteredHistoricalYears[0];
                    setSelectedYear(closest);
                  }
                  setTempYear(null);
                }}
                onTouchEnd={e => {
                  if (tempYear != null) {
                    let y = tempYear;
                    let closest = filteredHistoricalYears.filter(yr => yr <= y).pop();
                    if (closest == null) closest = filteredHistoricalYears[0];
                    setSelectedYear(closest);
                  }
                  setTempYear(null);
                }}
                className="flex-1 accent-cyan-400 h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
              />
              <div className="text-blue-100 text-xs mt-1 flex items-center gap-2 justify-center">
                <input
                  type="number"
                  min={Math.abs(Math.min(...filteredHistoricalYears))}
                  max={Math.max(...filteredHistoricalYears)}
                  value={(() => {
                    const y = tempYear != null ? tempYear : (selectedYear ?? Math.max(...filteredHistoricalYears));
                    return y < 0 ? Math.abs(y) : y;
                  })()}
                  onChange={e => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = Math.abs(Math.min(...filteredHistoricalYears));
                    // Determine BCE/CE from selector
                    const era = (tempYear != null ? tempYear : (selectedYear ?? Math.max(...filteredHistoricalYears))) < 0 ? 'BCE' : 'CE';
                    if (era === 'BCE') val = -Math.abs(val);
                    if (era === 'CE') val = Math.abs(val);
                    // Clamp
                    if (val < Math.min(...filteredHistoricalYears)) val = Math.min(...filteredHistoricalYears);
                    if (val > Math.max(...filteredHistoricalYears)) val = Math.max(...filteredHistoricalYears);
                    setTempYear(val);
                  }}
                  onBlur={e => {
                    if (tempYear != null) {
                      let y = tempYear;
                      let closest = filteredHistoricalYears.filter(yr => yr <= y).pop();
                      if (closest == null) closest = filteredHistoricalYears[0];
                      setSelectedYear(closest);
                    }
                    setTempYear(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tempYear != null) {
                      let y = tempYear;
                      let closest = filteredHistoricalYears.filter(yr => yr <= y).pop();
                      if (closest == null) closest = filteredHistoricalYears[0];
                      setSelectedYear(closest);
                      setTempYear(null);
                    }
                  }}
                  className="w-20 px-2 py-1 rounded border border-cyan-400 bg-gray-800 text-blue-100 font-mono text-xs text-center focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
                  aria-label="Enter year manually"
                />
                <select
                  value={(tempYear != null ? tempYear : (selectedYear ?? Math.max(...filteredHistoricalYears))) < 0 ? 'BCE' : 'CE'}
                  onChange={e => {
                    let y = tempYear != null ? tempYear : (selectedYear ?? Math.max(...filteredHistoricalYears));
                    let val = Math.abs(y);
                    if (e.target.value === 'BCE') val = -val;
                    setTempYear(val);
                    // Do not setSelectedYear here, wait for blur/enter
                  }}
                  className="px-2 py-1 rounded border border-cyan-400 bg-gray-800 text-blue-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
                  aria-label="Select BCE or CE"
                >
                  <option value="CE">CE</option>
                  <option value="BCE">BCE</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Modal for timeline of events in selected region/country */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-lg w-full relative border-2 border-blue-400 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-white text-2xl font-bold hover:text-pink-400"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-blue-200 mb-4 text-center">{modalTitle} Timeline</h2>
            {modalEvents.length === 0 ? (
              <div className="text-gray-300 text-center">No events found.</div>
            ) : (
              <ol className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {modalEvents.map((ev, idx) => {
                  // Extract year, remove leading zeros
                  let year = ev.date ? ev.date.split("-")[0].replace(/^0+/, "") : "?";
                  // If year is empty after removing zeros, fallback to "?"
                  if (!year) year = "?";
                  return (
                    <li key={ev.id || idx} className="bg-gray-800 rounded px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 border-l-4 border-blue-400">
                      <span className="font-semibold text-pink-200 flex-1">{ev.title}</span>
                      <span className="text-blue-100 text-xs font-mono">{year} {ev.date_type || ""}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
      {/* Controls row: toggle events, region/country toggle, and animation controls side-by-side */}
      <div className="w-full flex justify-center mb-4 gap-2">
        <button
          className="px-2 py-1 rounded text-sm font-semibold shadow transition-all duration-200 border border-yellow-400 text-white bg-gray-700 hover:bg-yellow-700 min-w-[120px]"
          onClick={() => setShowEvents(v => !v)}
          type="button"
        >
          {showEvents ? 'Hide Events' : 'Show Events'}
        </button>
        <AnimationControlsDropdown
          animating={animating}
          paused={paused}
          currentLineIdx={currentLineIdx}
          linesToDraw={linesToDraw}
          events={events}
          handlePlay={handlePlay}
          handlePauseResume={handlePauseResume}
          handleStop={handleStop}
          handleBack={handleBack}
          handleForward={handleForward}
        />
        <button
          className="px-2 py-1 rounded text-sm font-semibold shadow transition-all duration-200 border border-green-400 text-white bg-gray-700 hover:bg-green-700 min-w-[120px]"
          onClick={() => setViewMode(viewMode === 'country' ? 'region' : 'country')}
          type="button"
        >
          {viewMode === 'country' ? 'Show Events by Region' : 'Show Events by Country'}
        </button>
      </div>
      {/* Map component */}
      <div className="relative w-full h-[500px]" style={isFullScreen ? {height: 'calc(100vh - 0px)'} : {}}>
        {/* Full Screen Toggle Button - absolutely positioned inside the map window, top right, above zoom controls */}
        <div style={{ position: 'absolute', top: 14, right: 18, zIndex: 1001, pointerEvents: 'auto' }}>
          <button
            className="p-1 rounded-full shadow border border-blue-400 text-white bg-gray-800 hover:bg-blue-700 transition opacity-70 hover:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-blue-400"
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 0 }}
            onClick={() => setIsFullScreen(v => !v)}
            aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            type="button"
          >
            {isFullScreen ? (
              // Arrows pointing in for exit full screen
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 7L3 3M3 3V7M3 3H7" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 13L17 17M17 17H13M17 17V13" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              // Arrows pointing out for enter full screen
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7V3H7" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 13V17H13" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 3L8 8" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 17L12 12" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          minZoom={selectedEraObj.minZoom}
          maxZoom={selectedEraObj.maxZoom}
          style={{ height: "100%", width: "100%", borderRadius: "1rem", zIndex: 1, background: selectedEra === 'historical-basemaps' ? '#b3e0ff' : undefined }}
          scrollWheelZoom={true}
        >
          <MapEventHandler />
          <MapAnimator currentLine={linesToDraw[currentLineIdx] || null} animating={animating && !paused} />
          {/* Map layer selection logic */}
          {selectedEra === 'ohm' ? (
            <OHMMapLibreLayer
              enabled={true}
              attribution={selectedEraObj.attribution}
              year={selectedYear ?? (ohmYearData && ohmYearData.max)}
              dateType={(() => {
                const y = selectedYear ?? (ohmYearData && ohmYearData.max);
                if (ohmYearData) {
                  let type = y < 0 ? 'BCE' : 'CE';
                  return type;
                }
                return 'CE';
              })()}
              key={(() => {
                const y = selectedYear ?? (ohmYearData && ohmYearData.max);
                const type = y < 0 ? 'BCE' : 'CE';
                return `${y}-${type}`;
              })()}
            />
          ) : selectedEra === 'historical-basemaps' ? (
            <>
              {historicalGeojsonLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-20 text-blue-200">Loading historical map...</div>
              )}
              {historicalGeojsonError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-20 text-red-300">{historicalGeojsonError}</div>
              )}
              {historicalGeojson && (
                <>
                  <GeoJSON 
                    data={historicalGeojson} 
                    style={{ color: '#888', weight: 1, fillOpacity: 0.4 }} 
                    key={selectedYear != null ? `historical-${selectedYear}` : 'historical'}
                  />
                  {/* Region labels for inhabited regions only, using inhabit_since/until, with clustering and dot */}
                  {(() => {
                    if (!historicalGeojson.features) return null;
                    let zoom = mapZoom;
                    const minRadius = 1;
                    const maxRadius = 12;
                    const minZoom = 2;
                    const maxZoom = 10;
                    const clusterRadius = Math.max(minRadius, maxRadius - ((zoom - minZoom) * (maxRadius - minRadius) / (maxZoom - minZoom)));
                    const clusterThreshold = 4; // Only show individual labels at zoom >= 4
                    let labelPoints = historicalGeojson.features.map((feature, idx) => {
                      const props = feature.properties || {};
                      let since = props.inhabit_since;
                      let until = props.inhabit_until;
                      const parseYear = y => {
                        if (y == null) return null;
                        if (typeof y === 'number') return y;
                        if (typeof y === 'string') {
                          if (/^\d+$/.test(y)) return parseInt(y, 10); // CE
                          if (/^(-?\d+)$/.test(y)) return parseInt(y, 10); // negative
                          if (/^bc\s*(\d+)$/i.test(y)) return -parseInt(y.match(/^bc\s*(\d+)$/i)[1], 10); // BCE
                        }
                        return null;
                      };
                      since = parseYear(since);
                      until = parseYear(until);
                      let inhabited = true;
                      if (since != null && selectedYear < since) inhabited = false;
                      if (until != null && selectedYear > until) inhabited = false;
                      if (!inhabited) return null;
                      // Get centroid
                      let lat = null, lng = null;
                      if (feature.geometry && feature.geometry.type && feature.geometry.coordinates) {
                        try {
                          if (feature.geometry.type === 'Polygon') {
                            const coords = feature.geometry.coordinates[0];
                            if (coords && coords.length > 2) {
                              const lats = coords.map(c => c[1]);
                              const lngs = coords.map(c => c[0]);
                              lat = lats.reduce((a, b) => a + b, 0) / lats.length;
                              lng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
                            }
                          } else if (feature.geometry.type === 'MultiPolygon') {
                            const coords = feature.geometry.coordinates[0][0];
                            if (coords && coords.length > 2) {
                              const lats = coords.map(c => c[1]);
                              const lngs = coords.map(c => c[0]);
                              lat = lats.reduce((a, b) => a + b, 0) / lats.length;
                              lng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
                            }
                          }
                        } catch (e) { /* ignore */ }
                      }
                      if (lat == null || lng == null) return null;
                      const label = props.name || props.label || props.admin || props.country || props.NAME || props.ABBREVN || props.SUBJECTO || props.PARTOF;
                      if (!label) return null;
                      return { lat, lng, label, idx };
                    }).filter(Boolean);
                    let clusters = [];
                    if (zoom < clusterThreshold) {
                      labelPoints.forEach(pt => {
                        let found = false;
                        for (let cluster of clusters) {
                          const d = Math.sqrt(Math.pow(cluster.lat - pt.lat, 2) + Math.pow(cluster.lng - pt.lng, 2));
                          if (d < clusterRadius) {
                            cluster.points.push(pt);
                            cluster.lat = (cluster.lat * (cluster.points.length - 1) + pt.lat) / cluster.points.length;
                            cluster.lng = (cluster.lng * (cluster.points.length - 1) + pt.lng) / cluster.points.length;
                            found = true;
                            break;
                          }
                        }
                        if (!found) clusters.push({ lat: pt.lat, lng: pt.lng, points: [pt] });
                      });
                      // Always render clusters as circles, even if size 1, at low zoom
                      return clusters.map((cluster, cidx) => (
                        <Marker
                          key={`region-label-cluster-${cidx}`}
                          position={[cluster.lat, cluster.lng]}
                          icon={L.divIcon({
                            className: 'region-label-cluster',
                            html: `<div style=\"background:rgba(24,24,32,0.85);border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:2px solid #60a5fa;box-shadow:0 2px 8px #0008;font-weight:700;font-size:15px;color:#fff;\">${cluster.points.length}</div>`
                          })}
                          interactive={false}
                        />
                      ));
                    } else {
                      // Only render individual labels and dots when zoomed in
                      return labelPoints.map((pt) => (
                        <Marker
                          key={`region-label-${pt.idx}`}
                          position={[pt.lat, pt.lng]}
                          icon={L.divIcon({
                            className: 'region-label',
                            html: `<span style=\"color:#fff;background:rgba(24,24,32,0.85);border-radius:8px;padding:2px 10px;font-weight:700;font-size:10px;box-shadow:0 2px 8px #0008;border:1px solid #60a5fa;text-shadow:0 1px 4px #000a;white-space:normal;width:120px;line-height:1.2;text-align:center;overflow-wrap:anywhere;word-break:break-word;display:block;\">${pt.label}</span>`
                          })}
                          interactive={false}
                        />
                      ));
                    }
                  })()}
                </>
              )}
            </>
          ) : (
            <TileLayer
              attribution={selectedEraObj.attribution}
              url={selectedEraObj.url}
              errorTileUrl="https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg"
            />
          )}
          {showEvents && viewMode === 'region' && regionList.map((region, idx) => {
            const coords = regionCoords[region.toLowerCase()];
            if (!coords) return null;
            let isActiveRegion = false;
            if (currentLineIdx >= 0 && linesToDraw[currentLineIdx] && linesToDraw[currentLineIdx].dests) {
              isActiveRegion = linesToDraw[currentLineIdx].dests.some(dest => dest.name === region);
            }
            // Responsive circle size
            const isMobileRegion = window.innerWidth < 640;
            const baseRadiusRegion = isMobileRegion ? 12 : 10;
            const activeRadiusRegion = isMobileRegion ? 22 : 16;
            return (
              <CircleMarker
                key={region}
                center={coords}
                radius={isActiveRegion ? activeRadiusRegion : baseRadiusRegion}
                fillColor={regionColor[region]}
                color={isActiveRegion ? '#fff' : '#222'}
                weight={isActiveRegion ? 10 : 2}
                fillOpacity={isActiveRegion ? 1 : 0.85}
                eventHandlers={{
                  click: () => handleMarkerClick(region)
                }}
                style={{
                  cursor: "pointer",
                  filter: isActiveRegion ? `drop-shadow(0 0 0.5rem #fff) drop-shadow(0 0 1.5rem ${regionColor[region]}) drop-shadow(0 0 2.5rem #fff)` : undefined,
                  zIndex: isActiveRegion ? 1000 : undefined
                }}
              >
                <Tooltip direction="top" offset={[0, -10]}>{region} ({regionEvents[region].length} events)</Tooltip>
              </CircleMarker>
            );
          })}
          {showEvents && viewMode === 'country' && countryList.map((country, idx) => {
            const coords = countryCoords[country.toLowerCase()];
            if (!coords) return null;
            let isActiveCountry = false;
            if (currentLineIdx >= 0 && linesToDraw[currentLineIdx] && linesToDraw[currentLineIdx].dests) {
              isActiveCountry = linesToDraw[currentLineIdx].dests.some(dest => dest.name === country);
            }
            // Responsive circle size
            const isMobileCountry = window.innerWidth < 640;
            const baseRadiusCountry = isMobileCountry ? 8 : 7;
            const activeRadiusCountry = isMobileCountry ? 14 : 12;
            return (
              <CircleMarker
                key={country}
                center={coords}
                radius={isActiveCountry ? activeRadiusCountry : baseRadiusCountry}
                fillColor={countryColor[country]}
                color={isActiveCountry ? '#fff' : '#222'}
                weight={isActiveCountry ? 10 : 2}
                fillOpacity={isActiveCountry ? 1 : 0.85}
                eventHandlers={{
                  click: () => handleMarkerClick(country)
                }}
                style={{
                  cursor: "pointer",
                  filter: isActiveCountry ? `drop-shadow(0 0 0.5rem #fff) drop-shadow(0 0 1.5rem ${countryColor[country]}) drop-shadow(0 0 2.5rem #fff)` : undefined,
                  zIndex: isActiveCountry ? 1000 : undefined
                }}
              >
                <Tooltip direction="top" offset={[0, -10]}>{country} ({countryEvents[country].length} events)</Tooltip>
              </CircleMarker>
            );
          })}
          {/* Animated lines */}
          {showEvents && linesToDraw.slice(0, currentLineIdx + 1).map((line, idx) => (
            idx === currentLineIdx && line.dests && line.eventTitle && (
              line.dests.map((dest, dIdx) => (
                dIdx === 0 ? (
                  <Marker
                    key={idx + '-' + dIdx}
                    position={dest.coords}
                    icon={L.divIcon({
                      className: 'event-label-marker',
                      html: '<div></div>', // invisible marker
                      iconSize: [1, 1],
                      iconAnchor: [0, 0],
                    })}
                    interactive={false}
                    zIndexOffset={1000}
                  >
                    <Tooltip
                      direction="top"
                      offset={[0, -18]}
                      permanent
                      className="event-label-tooltip"
                      opacity={1}
                    >
                      <span style={{
                        color: '#fff',
                        background: 'rgba(24,24,32,0.85)',
                        borderRadius: 8,
                        padding: '2px 10px',
                        fontWeight: 700,
                        fontSize: 11,
                        boxShadow: '0 2px 8px #0008',
                        border: `1px solid ${dest.color}`,
                        textShadow: '0 1px 4px #000a',
                        whiteSpace: 'normal', // allow wrapping for date below
                        wordBreak: 'keep-all',
                        maxWidth: 260,
                        lineHeight: 1.2,
                        textAlign: 'center',
                        overflowWrap: 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'inline-block',
                      }}>
                        {line.eventTitle}
                        {line.year && (
                          <span style={{
                            display: 'block',
                            fontWeight: 400,
                            fontSize: 10,
                            color: '#a5b4fc',
                            marginTop: 2,
                            letterSpacing: 0.5,
                          }}>{line.year} {line.dateType || ''}</span>
                        )}
                      </span>
                    </Tooltip>
                  </Marker>
                ) : null
              ))
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );

  // Only use portal for full screen, otherwise render normally
  if (isFullScreen) {
    return createPortal(mapJSX, document.body);
  }
  return mapJSX;
};

// Helper component to add MapLibre GL layer for OHM
function OHMMapLibreLayer({ enabled, attribution, year, dateType }) {
  const map = useMap();
  const mlMapRef = React.useRef(null);
  const languageControlRef = React.useRef(null);
  // Force a full reload of the OHM map when year or dateType changes by using a key on the container
  React.useEffect(() => {
    if (!enabled) return;
    // Remove any previous OHM maplibre layers
    map.eachLayer(layer => {
      if (layer && layer.options && layer.options.attribution && String(layer.options.attribution).includes('OpenHistoricalMap')) {
        map.removeLayer(layer);
      }
    });
    // Add a new OHM maplibre layer
    const maplibreLayer = L.maplibreGL({
      style: 'https://www.openhistoricalmap.org/map-styles/main/main.json',
      attribution: attribution || '<a href="https://www.openhistoricalmap.org/">OpenHistoricalMap</a>'
    });
    map.addLayer(maplibreLayer);

    const mlMap = maplibreLayer.getMaplibreMap && maplibreLayer.getMaplibreMap();
    mlMapRef.current = mlMap;
    if (!mlMap) return;

    const y = Math.abs(year);
    const type = dateType || 'CE';
    const yearStr = type === 'BCE' ? `-${y}` : `${y}`;
    const isoDate = `${yearStr}-01-01`;
    mlMap.once('styledata', function () {
      filterByDate(mlMap, isoDate);
    });

    const language = new MapboxLanguage({
      defaultLanguage: 'en',
      languageSource: 'osm',
    });
    mlMap.addControl(language);

    // let newStyle = language.setLanguage(mlMap.getStyle(), 'en');
    // // Style diffing seems to miss changes to expression variable values for some reason.
    // mlMap.setStyle(newStyle, { diff: false });
  }, [enabled, map, attribution, year, dateType]);
  return null;
}

// Update AnimationControlsDropdown to always render the button and dropdown together
function AnimationControlsDropdown({ animating, paused, currentLineIdx, linesToDraw, events, handlePlay, handlePauseResume, handleStop, handleBack, handleForward }) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: window.innerWidth / 2 - 120, y: 100 }); // smaller default position
  const [dragging, setDragging] = React.useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });
  const windowRef = React.useRef(null);

  // Mouse and touch event handlers for drag
  const onMouseDown = (e) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    document.body.style.userSelect = 'none';
  };
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setDragging(true);
    const touch = e.touches[0];
    dragOffset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    };
    document.body.style.userSelect = 'none';
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 220, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y))
      });
    };
    const onMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
    };
    const onTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 220, touch.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, touch.clientY - dragOffset.current.y))
      });
    };
    const onTouchEnd = () => {
      setDragging(false);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging]);

  return (
    <div className="relative z-50">
      <button
        className="px-2 py-1 rounded text-xs font-semibold border border-blue-400 text-white bg-gray-700 hover:bg-blue-700"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="animation-controls-panel"
        style={{ minWidth: 100 }}
        type="button"
           >
        {open ? 'Hide Animation Controls' : 'Show Animation Controls'}
      </button>
      {open && (
        <div
          ref={windowRef}
          className="fixed shadow-lg border border-blue-400 rounded-lg bg-gray-800 py-1 px-1 min-w-[160px] w-max flex flex-wrap justify-center gap-1 items-center text-xs cursor-default"
          style={{
            left: position.x,
            top: position.y,
            zIndex: 1000,
            boxShadow: '0 8px 32px #000a',
            userSelect: dragging ? 'none' : 'auto',
            transition: dragging ? 'none' : 'box-shadow 0.2s',
            minWidth: 160,
            padding: 6,
            borderRadius: 10,
            maxWidth: 260
          }}
        >
          <div
            className="w-full flex items-center justify-end cursor-move mb-1 select-none"
            style={{ cursor: 'move', marginBottom: 2, minHeight: 18 }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            <button
              className="ml-2 text-white hover:text-pink-400 text-lg font-bold px-1"
              onClick={() => setOpen(false)}
              title="Close"
              style={{ lineHeight: 1 }}
              type="button"
            >
              ×
            </button>
          </div>
          <span className="text-white font-semibold mr-1">Anim</span>
          <span className="text-pink-200 font-mono text-xs mr-1">
            {linesToDraw.length > 0 ? `${Math.max(0, currentLineIdx + 1)} / ${linesToDraw.length}` : '0 / 0'}
          </span>
          <button
            className="p-1 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-base"
            onClick={handlePlay}
            title="Play"
            style={{ minWidth: 24 }}
            disabled={animating || (events || []).length === 0}
            type="button"
          >
            <span role="img" aria-label="Play">&#9654;</span>
          </button>
          <button
            className="p-1 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-base"
            onClick={handlePauseResume}
            title={paused ? "Resume" : "Pause"}
            style={{ minWidth: 24 }}
            disabled={!animating}
            type="button"
          >
            {paused ? <span role="img" aria-label="Resume">&#9654;&#10073;</span> : <span role="img" aria-label="Pause">&#10073;&#10073;</span>}
          </button>
          <button
            className="p-1 rounded shadow border border-red-400 text-white bg-gray-700 hover:bg-red-700 text-base"
            onClick={handleStop}
            title="Stop"
            style={{ minWidth: 24 }}
            disabled={!animating && currentLineIdx === -1}
            type="button"
                            >
            <span role="img" aria-label="Stop">&#9632;</span>
          </button>
          <div className="flex gap-0.5">
            <button
              className="p-1 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-base"
              onClick={handleBack}
              title="Back"
              style={{ minWidth: 24 }}
              disabled={!animating && currentLineIdx <= 0}
              type="button"
            >
              &#8592;
            </button>
            <button
              className="p-1 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-base"
              onClick={handleForward}
              title="Forward"
              style={{ minWidth: 24 }}
              disabled={!animating && currentLineIdx >= linesToDraw.length - 1}
              type="button"
            >
              &#8594;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for ordinal suffix
function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default MapView;
