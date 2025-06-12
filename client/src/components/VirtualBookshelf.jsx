import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import "../App.css";

const apiUrl = process.env.REACT_APP_API_URL;

// Helper to get cover image (stub: replace with real logic if available)
function getBookCover(book) {
  // If you have a real cover image URL, use it here
  // For now, use a placeholder with the book name
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(book)}&background=0D8ABC&color=fff&size=256`;
}

function VirtualBookshelf({ events }) {
  // Get all unique books
  const books = useMemo(() => {
    const set = new Set();
    (events || []).forEach(ev => ev.book_reference && set.add(ev.book_reference));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  // Book details modal state
  const [selectedBook, setSelectedBook] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState("");
  const [aiSummaryCached, setAiSummaryCached] = useState(false);

  // Reset AI summary state when opening a new book
  React.useEffect(() => {
    setAiSummary("");
    setAiSummaryError("");
    setAiSummaryCached(false);
    setAiSummaryLoading(false);
  }, [selectedBook]);

  // Try to fetch cached summary on book open
  React.useEffect(() => {
    if (!selectedBook) return;
    setAiSummary("");
    setAiSummaryError("");
    setAiSummaryCached(false);
    setAiSummaryLoading(false);
    // Try to fetch cached summary
    const details = getBookDetails(selectedBook);
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
  }, [selectedBook]);

  // Helper to format year with BCE/CE
  function formatYear(year) {
    if (typeof year !== 'number' || isNaN(year)) return '';
    if (year < 0) return `${-year} BCE`;
    return `${year} CE`;
  }

  // Compute book details
  function getBookDetails(book) {
    const bookEvents = (events || []).filter(ev => ev.book_reference === book);
    if (bookEvents.length === 0) return null;
    // Years covered
    const years = bookEvents.map(ev => {
      if (!ev.date) return null;
      const y = parseInt(ev.date.split("-")[0], 10);
      return ev.date_type === "BCE" ? -y : y;
    }).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    // Primary tags
    const tagCount = {};
    bookEvents.forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    }));
    const primaryTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    return {
      count: bookEvents.length,
      minYear,
      maxYear,
      primaryTags,
      events: bookEvents
    };
  }

  // Fetch AI summary for a book's events
  async function fetchAiSummary(book, forceRegenerate = false) {
    setAiSummaryLoading(true);
    setAiSummaryError("");
    setAiSummary("");
    setAiSummaryCached(false);
    try {
      const details = getBookDetails(book);
      if (!details || !details.events || details.events.length === 0) {
        setAiSummaryError("No events to summarize.");
        setAiSummaryLoading(false);
        return;
      }
      // Only send minimal fields to the server
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
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-900 to-pink-900 py-12 px-4 flex flex-col items-center">
      <h1 className="text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Virtual Bookshelf</h1>
      <div className="flex flex-wrap gap-8 justify-center max-w-6xl">
        {books.map(book => (
          <div key={book} className="flex flex-col items-center cursor-pointer group" onClick={() => setSelectedBook(book)}>
            <img
              src={getBookCover(book)}
              alt={book}
              className="w-32 h-48 rounded-lg shadow-lg border-4 border-blue-400 group-hover:scale-105 transition-transform object-cover bg-white"
              style={{ background: '#fff' }}
            />
            <span className="mt-2 text-sm font-semibold text-blue-200 text-center max-w-[8rem] truncate whitespace-normal leading-tight break-words">{book}</span>
          </div>
        ))}
      </div>
      {/* Book details modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setSelectedBook(null)}>
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-pink-300 hover:text-white text-2xl font-bold" onClick={() => setSelectedBook(null)}>&times;</button>
            <div className="flex flex-col items-center">
              <img src={getBookCover(selectedBook)} alt={selectedBook} className="w-32 h-48 rounded-lg shadow-lg border-4 border-blue-400 mb-4 object-cover bg-white" />
              <h2 className="text-2xl font-bold text-blue-300 mb-2 text-center">{selectedBook}</h2>
              {(() => {
                const details = getBookDetails(selectedBook);
                if (!details) return <p className="text-gray-300">No details available.</p>;
                return (
                  <div className="w-full text-left mt-2">
                    <p className="text-blue-200 mb-1"><span className="font-semibold">Number of events:</span> {details.count}</p>
                    <p className="text-blue-200 mb-1"><span className="font-semibold">Years covered:</span> {formatYear(details.minYear)} to {formatYear(details.maxYear)}</p>
                    <p className="text-blue-200 mb-1"><span className="font-semibold">Primary tags:</span> {details.primaryTags.length > 0 ? details.primaryTags.join(", ") : "None"}</p>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-pink-300 mb-1">Generate AI Summary</h3>
                      <div className="flex flex-row gap-2 items-center mb-2">
                        {!aiSummary && (
                          <button
                            className="px-3 py-1 rounded bg-pink-700 text-white text-xs font-bold hover:bg-pink-800 border border-pink-300 shadow disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => fetchAiSummary(selectedBook)}
                            disabled={aiSummaryLoading}
                          >
                            {aiSummaryLoading ? "Generating..." : "Generate AI Summary"}
                          </button>
                        )}
                        {aiSummary && (
                          <button
                            className="px-3 py-1 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 border border-blue-300 shadow disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => fetchAiSummary(selectedBook, true)}
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
                        <div className="text-gray-200 whitespace-pre-line text-base bg-gray-800 rounded-xl p-3 border border-blue-400/40 shadow-inner min-h-[3rem] max-h-64 overflow-y-auto">
                          {aiSummary}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

VirtualBookshelf.propTypes = {
  events: PropTypes.array.isRequired
};

export default VirtualBookshelf;
