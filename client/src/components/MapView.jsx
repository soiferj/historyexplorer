import React from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  "congo (democratic republic)": [-4.0383, 21.7587],
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
  "korea, north": [40.3399, 127.5101],
  "korea, south": [35.9078, 127.7669],
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
  "zimbabwe": [-19.0154, 29.1549]
};

const MapView = ({ events = [], onRegionSelect, setSelectedRegions, setSelectedCountries, loading, error, onBackToTimeline }) => {
  // Toggle state: 'region' or 'country'
  const [viewMode, setViewMode] = React.useState('country');
  // Animation state
  const [animating, setAnimating] = React.useState(false);
  const [currentLineIdx, setCurrentLineIdx] = React.useState(-1);
  const [linesToDraw, setLinesToDraw] = React.useState([]);
  const [paused, setPaused] = React.useState(false);
  const [speed, setSpeed] = React.useState(900); // Animation speed in ms per frame
  const timerRef = React.useRef(null);

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
    if (viewMode === 'region') {
      setSelectedRegions && setSelectedRegions([name]);
    } else {
      setSelectedCountries && setSelectedCountries([name]);
    }
  };

  return (
    <div className="w-full h-[500px] relative">
      <div className="w-full flex justify-center mb-4 gap-4">
        <button
          className="px-4 py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white bg-gray-700 hover:bg-blue-700"
          onClick={onBackToTimeline}
        >
          Timeline
        </button>
        <button
          className="px-4 py-2 rounded font-bold shadow transition-all duration-200 border border-green-400 text-white bg-gray-700 hover:bg-green-700"
          onClick={() => setViewMode(viewMode === 'country' ? 'region' : 'country')}
        >
          {viewMode === 'country' ? 'Show by Region' : 'Show by Country'}
        </button>
      </div>
      {/* Animation controls row */}
      <div className="w-full flex justify-center mb-4 gap-2 items-center">
        <span className="text-white font-semibold mr-2">Animation</span>
        {/* Frame counter */}
        <span className="text-pink-200 font-mono text-sm mr-2">
          {linesToDraw.length > 0 ? `${Math.max(0, currentLineIdx + 1)} / ${linesToDraw.length}` : '0 / 0'}
        </span>
        <button
          className="p-2 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-lg"
          onClick={handlePlay}
          title="Play"
          style={{ minWidth: 32 }}
          disabled={animating || (events || []).length === 0}
        >
          <span role="img" aria-label="Play">&#9654;</span>
        </button>
        <button
          className="p-2 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-lg"
          onClick={handlePauseResume}
          title={paused ? "Resume" : "Pause"}
          style={{ minWidth: 32 }}
          disabled={!animating}
        >
          {paused ? <span role="img" aria-label="Resume">&#9654;&#10073;</span> : <span role="img" aria-label="Pause">&#10073;&#10073;</span>}
        </button>
        <button
          className="p-2 rounded shadow border border-red-400 text-white bg-gray-700 hover:bg-red-700 text-lg"
          onClick={handleStop}
          title="Stop"
          style={{ minWidth: 32 }}
          disabled={!animating && currentLineIdx === -1}
        >
          <span role="img" aria-label="Stop">&#9632;</span>
        </button>
        <div className="flex gap-1">
          <button
            className="p-2 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-lg"
            onClick={handleBack}
            title="Back"
            style={{ minWidth: 32 }}
            disabled={!animating && currentLineIdx <= 0}
          >
            &#8592;
          </button>
          <button
            className="p-2 rounded shadow border border-gray-400 text-white bg-gray-700 hover:bg-gray-600 text-lg"
            onClick={handleForward}
            title="Forward"
            style={{ minWidth: 32 }}
            disabled={!animating && currentLineIdx >= linesToDraw.length - 1}
          >
            &#8594;
          </button>
        </div>
        {/* Speed control - moved to the right of playback controls */}
        <div className="flex items-center ml-4">
          <label className="text-white text-xs mr-1" htmlFor="speed-slider">Speed</label>
          <input
            id="speed-slider"
            type="range"
            min="200"
            max="2000"
            step="100"
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            style={{ width: 90 }}
          />
          <span className="text-blue-200 text-xs ml-2">{(speed / 1000).toFixed(1)}s</span>
        </div>
      </div>
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10">Loading map...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10 text-red-300">{error}</div>}
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%", borderRadius: "1rem", zIndex: 1 }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {viewMode === 'region' && regionList.map((region, idx) => {
          const coords = regionCoords[region.toLowerCase()];
          if (!coords) return null;
          return (
            <CircleMarker
              key={region}
              center={coords}
              radius={18}
              fillColor={regionColor[region]}
              color="#222"
              weight={2}
              fillOpacity={0.85}
              eventHandlers={{
                click: () => handleMarkerClick(region)
              }}
              style={{ cursor: "pointer" }}
            >
              <Tooltip direction="top" offset={[0, -10]}>{region} ({regionEvents[region].length} events)</Tooltip>
            </CircleMarker>
          );
        })}
        {viewMode === 'country' && countryList.map((country, idx) => {
          const coords = countryCoords[country.toLowerCase()];
          if (!coords) return null;
          return (
            <CircleMarker
              key={country}
              center={coords}
              radius={12}
              fillColor={countryColor[country]}
              color="#222"
              weight={2}
              fillOpacity={0.85}
              eventHandlers={{
                click: () => handleMarkerClick(country)
              }}
              style={{ cursor: "pointer" }}
            >
              <Tooltip direction="top" offset={[0, -10]}>{country} ({countryEvents[country].length} events)</Tooltip>
            </CircleMarker>
          );
        })}
        {/* Animated lines */}
        {linesToDraw.slice(0, currentLineIdx + 1).map((line, idx) => (
          idx === currentLineIdx && line.dests && line.eventTitle && (
            line.dests.map((dest, dIdx) => (
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
                    fontSize: 16,
                    boxShadow: '0 2px 8px #0008',
                    border: `1px solid ${dest.color}`,
                    textShadow: '0 1px 4px #000a',
                    whiteSpace: 'nowrap',
                  }}>{line.eventTitle} {line.year ? `(${line.year} ${line.dateType || ''})` : ''}</span>
                </Tooltip>
              </Marker>
            ))
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
