import React from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
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
  "middle east": [29, 45],
  "oceania": [-22, 140],
  "southeast asia": [10, 105],
  "central asia": [45, 70],
  "caribbean": [18, -75],
  // Add more as needed
};

// Simple country-to-coords mapping (expand as needed)
const countryCoords = {
  "united states": [37.0902, -95.7129],
  "china": [35.8617, 104.1954],
  "india": [20.5937, 78.9629],
  "brazil": [-14.235, -51.9253],
  "germany": [51.1657, 10.4515],
  "france": [46.6034, 1.8883],
  "united kingdom": [55.3781, -3.4360],
  "japan": [36.2048, 138.2529],
  "australia": [-25.2744, 133.7751],
  "south africa": [-30.5595, 22.9375],
  // Add more as needed
};

const MapView = ({ events = [], onRegionSelect, loading, error, onBackToTimeline }) => {
  // Toggle state: 'region' or 'country'
  const [viewMode, setViewMode] = React.useState('region');

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
  const regionList = Object.keys(regionEvents);
  const countryList = Object.keys(countryEvents);
  const regionColor = regionList.reduce((acc, region, idx) => {
    acc[region] = colorPalette[idx % colorPalette.length];
    return acc;
  }, {});
  const countryColor = countryList.reduce((acc, country, idx) => {
    acc[country] = colorPalette[idx % colorPalette.length];
    return acc;
  }, {});

  // Handler for marker click (region or country)
  const handleMarkerClick = (name) => {
    if (viewMode === 'region') {
      onRegionSelect && onRegionSelect(name);
    } else {
      // Optionally, you can add a callback for country select
      // For now, just alert or do nothing
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
          onClick={() => setViewMode(viewMode === 'region' ? 'country' : 'region')}
        >
          {viewMode === 'region' ? 'Show by Country' : 'Show by Region'}
        </button>
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
      </MapContainer>
    </div>
  );
};

export default MapView;
