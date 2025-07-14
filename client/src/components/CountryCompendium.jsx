import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import "../App.css";

const apiUrl = process.env.REACT_APP_API_URL;

// Helper to get continent image with country highlighted
function getContinentImage(country) {
  // Placeholder: use a static image or API for continent map with country highlighted
  // For now, use a generic image or avatar
  return `/images/continents/${country}.png`;
}

function CountryCompendium({ events, isAllowed }) {
  // Map of country to continent (minimal, expand as needed)
  const countryToContinent = {
    Afghanistan: "Asia", Albania: "Europe", Algeria: "Africa", Armenia: "Asia", Austria: "Europe", Azerbaijan: "Asia", Bahrain: "Asia", Bangladesh: "Asia", Belarus: "Europe", Belgium: "Europe", Benin: "Africa", Bhutan: "Asia", Bolivia: "South America", Botswana: "Africa", Brazil: "South America", Bulgaria: "Europe", Burkina: "Africa", Cambodia: "Asia", Cameroon: "Africa", Canada: "North America", Chile: "South America", China: "Asia", Colombia: "South America", "Costa Rica": "North America", Croatia: "Europe", Cuba: "North America", Cyprus: "Asia", "Czech Republic": "Europe", Denmark: "Europe", Djibouti: "Africa", "Dominican Republic": "North America", Ecuador: "South America", Egypt: "Africa", Estonia: "Europe", Ethiopia: "Africa", Finland: "Europe", France: "Europe", Gabon: "Africa", Gambia: "Africa", Georgia: "Asia", Germany: "Europe", Ghana: "Africa", Greece: "Europe", Guatemala: "North America", Guinea: "Africa", Guyana: "South America", Haiti: "North America", Honduras: "North America", Hungary: "Europe", Iceland: "Europe", India: "Asia", Indonesia: "Asia", Iran: "Asia", Iraq: "Asia", Ireland: "Europe", Israel: "Asia", Italy: "Europe", Jamaica: "North America", Japan: "Asia", Jordan: "Asia", Kazakhstan: "Asia", Kenya: "Africa", Korea: "Asia", Kuwait: "Asia", Kyrgyzstan: "Asia", Laos: "Asia", Latvia: "Europe", Lebanon: "Asia", Lesotho: "Africa", Liberia: "Africa", Libya: "Africa", Lithuania: "Europe", Luxembourg: "Europe", Madagascar: "Africa", Malawi: "Africa", Malaysia: "Asia", Mali: "Africa", Malta: "Europe", Mauritania: "Africa", Mauritius: "Africa", Mexico: "North America", Moldova: "Europe", Monaco: "Europe", Mongolia: "Asia", Montenegro: "Europe", Morocco: "Africa", Mozambique: "Africa", Myanmar: "Asia", Namibia: "Africa", Nepal: "Asia", Netherlands: "Europe", "New Zealand": "Oceania", Nicaragua: "North America", Niger: "Africa", Nigeria: "Africa", "North Macedonia": "Europe", Norway: "Europe", Oman: "Asia", Pakistan: "Asia", Panama: "North America", Paraguay: "South America", Peru: "South America", Philippines: "Asia", Poland: "Europe", Portugal: "Europe", Qatar: "Asia", Romania: "Europe", Russia: "Europe", Rwanda: "Africa", "Saudi Arabia": "Asia", Senegal: "Africa", Serbia: "Europe", Seychelles: "Africa", Singapore: "Asia", Slovakia: "Europe", Slovenia: "Europe", Somalia: "Africa", "South Africa": "Africa", Spain: "Europe", "Sri Lanka": "Asia", Sudan: "Africa", Suriname: "South America", Sweden: "Europe", Switzerland: "Europe", Syria: "Asia", Taiwan: "Asia", Tajikistan: "Asia", Tanzania: "Africa", Thailand: "Asia", Togo: "Africa", "Trinidad and Tobago": "North America", Tunisia: "Africa", Turkey: "Asia", Turkmenistan: "Asia", Uganda: "Africa", Ukraine: "Europe", "United Arab Emirates": "Asia", "United Kingdom": "Europe", "United States": "North America", Uruguay: "South America", Uzbekistan: "Asia", Venezuela: "South America", Vietnam: "Asia", Yemen: "Asia", Zambia: "Africa", Zimbabwe: "Africa"
  };

  // Group countries by continent
  const countriesByContinent = useMemo(() => {
    const set = new Set();
    (events || []).forEach(ev => Array.isArray(ev.countries) && ev.countries.forEach(c => set.add(c.charAt(0).toUpperCase() + c.slice(1))));
    const grouped = {};
    Array.from(set).forEach(country => {
      let continent = countryToContinent[country];
      if (!continent) {
        continent = "Unknown";
        // Only log once per country
        if (typeof window !== 'undefined' && !(grouped.__warned && grouped.__warned[country])) {
          console.warn(`Country '${country}' is not associated with a continent in countryToContinent.`);
          if (!grouped.__warned) grouped.__warned = {};
          grouped.__warned[country] = true;
        }
      }
      if (!grouped[continent]) grouped[continent] = [];
      grouped[continent].push(country);
    });
    // Sort countries in each continent
    Object.keys(grouped).forEach(cont => {
      if (cont !== "__warned") grouped[cont].sort((a, b) => a.localeCompare(b));
    });
    // Remove __warned helper
    if (grouped.__warned) delete grouped.__warned;
    return grouped;
  }, [events]);

  // Country details modal state
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState("");
  const [aiSummaryCached, setAiSummaryCached] = useState(false);

  useEffect(() => {
    setAiSummary("");
    setAiSummaryError("");
    setAiSummaryCached(false);
    setAiSummaryLoading(false);
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedCountry) return;
    setAiSummary("");
    setAiSummaryError("");
    setAiSummaryCached(false);
    setAiSummaryLoading(false);
    // Try to fetch cached summary
    const details = getCountryDetails(selectedCountry);
    if (!details || !details.events || details.events.length === 0) return;
    const payload = details.events.map(ev => ({
      title: ev.title,
      date: ev.date,
      description: ev.description,
      tags: ev.tags,
      regions: ev.regions,
      countries: ev.countries
    }));
    fetch(`${apiUrl}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: payload, cacheOnly: true })
    })
      .then(async res => {
        if (!res.ok) return;
        const data = await res.json();
        setAiSummary(data.summary);
        setAiSummaryCached(!!data.cached);
      })
      .catch(() => {});
  }, [selectedCountry]);

  function formatYear(year) {
    if (typeof year !== 'number' || isNaN(year)) return '';
    if (year < 0) return `${-year} BCE`;
    return `${year} CE`;
  }

  function getCountryDetails(country) {
    const countryEvents = (events || []).filter(ev => Array.isArray(ev.countries) && ev.countries.includes(country));
    if (countryEvents.length === 0) return null;
    const years = countryEvents.map(ev => {
      if (!ev.date) return null;
      const y = parseInt(ev.date.split("-")[0], 10);
      return ev.date_type === "BCE" ? -y : y;
    }).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const tagCount = {};
    countryEvents.forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    }));
    const primaryTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    return {
      count: countryEvents.length,
      minYear,
      maxYear,
      primaryTags,
      events: countryEvents
    };
  }

  async function fetchAiSummary(country, forceRegenerate = false) {
    setAiSummaryLoading(true);
    setAiSummaryError("");
    setAiSummary("");
    setAiSummaryCached(false);
    try {
      const details = getCountryDetails(country);
      if (!details || !details.events || details.events.length === 0) {
        setAiSummaryError("No events to summarize.");
        setAiSummaryLoading(false);
        return;
      }
      const payload = details.events.map(ev => ({
        title: ev.title,
        date: ev.date,
        description: ev.description,
        tags: ev.tags,
        regions: ev.regions,
        countries: ev.countries
      }));
      const response = await fetch(`${apiUrl}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ events: payload, forceRegenerate })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate summary");
      setAiSummary(data.summary);
      setAiSummaryCached(!!data.cached);
    } catch (err) {
      setAiSummaryError(err.message);
    } finally {
      setAiSummaryLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-center w-full max-w-7xl px-8 mx-auto mt-2 mb-4 z-10 min-h-0 min-h-[60vh] lg:min-h-[70vh] xl:min-h-[80vh] 2xl:min-h-[90vh]">
        <h1 className="text-3xl font-extrabold mb-8 text-blue-200 text-center tracking-tight drop-shadow-lg">Country Compendium</h1>
        <div className="w-full max-w-4xl mx-auto overflow-y-auto overflow-x-hidden scrollbar-timeline" style={{ maxHeight: '70vh', minHeight: '40vh', paddingRight: '0.5rem', boxSizing: 'border-box' }}>
          {Object.keys(countriesByContinent).sort().map(continent => (
            <div key={continent} className="mb-6">
              <h2 className="text-xl font-bold text-blue-300 mb-2 mt-4">{continent}</h2>
              <ul className="flex flex-wrap gap-x-8 gap-y-2">
                {countriesByContinent[continent].map(country => (
                  <li key={country}>
                    <button
                      className="text-white text-lg font-semibold hover:text-blue-400 focus:underline focus:outline-none transition-colors duration-150 bg-transparent border-none p-0 m-0 cursor-pointer"
                      style={{ background: 'none' }}
                      onClick={() => setSelectedCountry(country)}
                    >
                      {country}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {/* Country details modal */}
      {selectedCountry && (
        <div
          className="fixed inset-0 z-50 flex justify-center items-center bg-black/60"
          onClick={() => setSelectedCountry(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-blue-400/40 p-6 max-w-lg w-full flex flex-col items-center animate-fade-in scrollbar-timeline"
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              paddingRight: '0.5rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button className="absolute top-3 right-3 text-pink-400 hover:text-pink-600 text-2xl font-bold" onClick={() => setSelectedCountry(null)}>&times;</button>
            <img src={getContinentImage(selectedCountry)} alt={selectedCountry}
              onError={e => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCountry)}&background=0D8ABC&color=fff&size=256`;
              }}
              className="w-64 h-40 rounded-lg shadow mb-4 object-cover bg-white border border-blue-200" />
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2 text-center">{selectedCountry}</h2>
            {(() => {
              const details = getCountryDetails(selectedCountry);
              if (!details) return <p className="text-gray-300">No details available.</p>;
              return (
                <div className="w-full text-left mt-2">
                  <p className="text-blue-200 mb-1"><span className="font-semibold">Number of events:</span> {details.count}</p>
                  <p className="text-blue-200 mb-1"><span className="font-semibold">Years covered:</span> {formatYear(details.minYear)} to {formatYear(details.maxYear)}</p>
                  <p className="text-blue-200 mb-1"><span className="font-semibold">Primary tags:</span> {details.primaryTags.length > 0 ? details.primaryTags.join(", ") : "None"}</p>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-pink-300 mb-1">AI Summary</h3>
                    <div className="flex flex-row gap-2 items-center mb-2">
                      {!aiSummary && (
                        isAllowed ? (
                          <button
                            className="px-3 py-1 rounded bg-pink-700 text-white text-xs font-bold hover:bg-pink-800 border border-pink-300 shadow disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => fetchAiSummary(selectedCountry)}
                            disabled={aiSummaryLoading}
                          >
                            {aiSummaryLoading ? "Generating..." : "Generate AI Summary"}
                          </button>
                        ) : null
                      )}
                      {aiSummary && isAllowed && (
                        <button
                          className="px-3 py-1 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 border border-blue-300 shadow disabled:opacity-60 disabled:cursor-not-allowed"
                          onClick={() => fetchAiSummary(selectedCountry, true)}
                          disabled={aiSummaryLoading}
                        >
                          {aiSummaryLoading ? "Regenerating..." : "Regenerate"}
                        </button>
                      )}
                      {aiSummary && (
                        <span className={`text-xs font-semibold ${aiSummaryCached ? 'text-yellow-300' : 'text-green-300'}`}>{aiSummaryCached ? 'Result loaded from cache.' : 'Fresh result (not cached).'}</span>
                      )}
                    </div>
                    {aiSummaryError && <div className="text-red-300 text-sm mb-2">{aiSummaryError}</div>}
                    {aiSummary && (
                      <div className="text-gray-200 whitespace-pre-line text-base bg-gray-800 rounded-xl p-3 border border-blue-400/40 shadow-inner min-h-[3rem] max-h-64 overflow-y-auto scrollbar-timeline">
                        {aiSummary}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

CountryCompendium.propTypes = {
  events: PropTypes.array.isRequired,
  isAllowed: PropTypes.bool
};

export default CountryCompendium;
