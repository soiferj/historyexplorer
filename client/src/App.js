import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import Timeline from "./components/Timeline";
import MapView from "./components/MapView";
import AddEventForm from "./components/AddEventForm";
import FiltersPopover from "./components/FiltersPopover";
import AdminToolsModal from "./components/AdminToolsModal";
import TagEvolutionChart from "./components/TagEvolutionChart";
import "./index.css";

function App() {
    const [session, setSession] = useState(null);
    // Centralized state
    const [showMap, setShowMap] = useState(false);
    const [events, setEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState(null);
    // Filters/groupings
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState({ startYear: '', startEra: 'BCE', endYear: '', endEra: 'CE' });
    const [regionFilter, setRegionFilter] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(0); // 0: event, 1: century, 2: millennium
    const [groupMode, setGroupMode] = useState('none');
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedBooks, setSelectedBooks] = useState([]);
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [tagSearchTerm, setTagSearchTerm] = useState("");
    const [bookSearchTerm, setBookSearchTerm] = useState("");
    const [regionSearchTerm, setRegionSearchTerm] = useState("");
    const [tagOverlapOnly, setTagOverlapOnly] = useState(false);
    // Add state for always-visible controls
    const [showForm, setShowForm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showAdminToolsModal, setShowAdminToolsModal] = useState(false);
    const [removalSelectedTags, setRemovalSelectedTags] = useState([]);
    const [removalLoading, setRemovalLoading] = useState(false);
    const [removalError, setRemovalError] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    // Add state for selectedEvent and setSelectedEvent
    const [selectedEvent, setSelectedEvent] = useState(null);
    // Add state for editMode and setEditMode
    const [editMode, setEditMode] = useState(false);
    // Add state for editError and setEditError
    const [editError, setEditError] = useState("");
    // Tag Evolution view toggle
    const [showTagEvolution, setShowTagEvolution] = useState(false);

    // Fetch events function for use in Timeline
    const fetchEvents = async () => {
        setEventsLoading(true);
        setEventsError(null);
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/events`);
            if (!response.ok) throw new Error("Failed to fetch events");
            const data = await response.json();
            setEvents(data);
            setEventsLoading(false);
        } catch (err) {
            setEvents([]);
            setEventsError(err.message);
            setEventsLoading(true);
        }
    };

    // Fetch events once
    useEffect(() => {
        let retryTimeout;
        const initialFetch = async () => {
            await fetchEvents();
        };
        initialFetch();
        return () => {
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => {
            if (listener && typeof listener.unsubscribe === "function") {
                listener.unsubscribe();
            }
        };
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: "google" });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null); // Explicitly clear session
        window.location.reload(); // Force UI update (optional, but ensures logout everywhere)
    };

    // Filtering logic (same as Timeline)
    function yearEraToComparable(year, era) {
        if (!year) return null;
        const y = parseInt(year, 10);
        if (isNaN(y)) return null;
        return era === 'BCE' ? -y : y;
    }
    // Apply all filters (AND/OR logic for tags, books, regions, countries)
    const filteredEvents = (() => {
        if (!events || events.length === 0) return [];
        let filtered = events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.book_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (Array.isArray(event.tags) && event.tags.some(tag => tag.toLowerCase() === searchTerm.toLowerCase()))
        );
        if (regionFilter) {
            filtered = filtered.filter(event => Array.isArray(event.regions) && event.regions.includes(regionFilter));
        }
        const startComparable = yearEraToComparable(dateFilter.startYear, dateFilter.startEra);
        const endComparable = yearEraToComparable(dateFilter.endYear, dateFilter.endEra);
        if (startComparable !== null || endComparable !== null) {
            filtered = filtered.filter(event => {
                const eventYear = event.date ? parseInt(event.date.split("-")[0], 10) : null;
                const eventComparable = event.date_type === 'BCE' ? -eventYear : eventYear;
                if (startComparable !== null && eventComparable < startComparable) return false;
                if (endComparable !== null && eventComparable > endComparable) return false;
                return true;
            });
        }
        // --- Main filter logic for tag/book/region/country ---
        const hasTag = selectedTags.length > 0;
        const hasBook = selectedBooks.length > 0;
        const hasRegion = selectedRegions.length > 0;
        const hasCountry = selectedCountries.length > 0;
        if (hasTag || hasBook || hasRegion || hasCountry) {
            if (tagOverlapOnly) {
                // INTERSECTION: event must match ALL selected filters
                filtered = filtered.filter(event => {
                    // Tag: must have ALL selected tags (case-insensitive)
                    const tagOk = !hasTag || (Array.isArray(event.tags) && selectedTags.every(tag => event.tags.some(evTag => evTag.toLowerCase() === tag.toLowerCase())));
                    // Book: must match one of the selected books
                    const bookOk = !hasBook || selectedBooks.includes(event.book_reference);
                    // Region: must match one of the selected regions (case-insensitive)
                    const regionOk = !hasRegion || (Array.isArray(event.regions) && selectedRegions.every(region => event.regions.some(evRegion => evRegion.toLowerCase() === region.toLowerCase())));
                    // Country: must match one of the selected countries (case-insensitive)
                    const countryOk = !hasCountry || (Array.isArray(event.countries) && selectedCountries.every(country => event.countries.some(evCountry => evCountry.toLowerCase() === country.toLowerCase())));
                    return tagOk && bookOk && regionOk && countryOk;
                });
            } else {
                // UNION: event matches ANY selected filter
                filtered = filtered.filter(event => {
                    const tagMatch = hasTag && Array.isArray(event.tags) && event.tags.some(evTag => selectedTags.some(tag => evTag.toLowerCase() === tag.toLowerCase()));
                    const bookMatch = hasBook && selectedBooks.includes(event.book_reference);
                    const regionMatch = hasRegion && Array.isArray(event.regions) && event.regions.some(evRegion => selectedRegions.some(region => evRegion.toLowerCase() === region.toLowerCase()));
                    const countryMatch = hasCountry && Array.isArray(event.countries) && event.countries.some(evCountry => selectedCountries.some(country => evCountry.toLowerCase() === country.toLowerCase()));
                    return tagMatch || bookMatch || regionMatch || countryMatch;
                });
            }
        }
        return filtered;
    })();

    // Compute if any filter is set (for Filters button highlight)
    const anyFilterSet = (
        searchTerm.trim() !== '' ||
        dateFilter.startYear !== '' ||
        dateFilter.endYear !== '' ||
        selectedTags.length > 0 ||
        selectedBooks.length > 0 ||
        selectedRegions.length > 0 ||
        selectedCountries.length > 0 ||
        tagOverlapOnly
    );

    // World/Timeline toggle and region select
    const handleRegionSelect = (region) => {
        setRegionFilter(region);
        setShowMap(false);
    };
    const clearRegionFilter = () => setRegionFilter(null);

    // Helper: isAllowed (admin)
    const [allowedEmails, setAllowedEmails] = useState([]);
    useEffect(() => {
        let isMounted = true;
        let retryTimeout;
        const apiUrl = process.env.REACT_APP_API_URL;
        const fetchAllowedEmails = async () => {
            try {
                const response = await fetch(`${apiUrl}/allowed-emails`, {
                    headers: {
                        ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch allowed emails");
                const data = await response.json();
                if (isMounted) {
                    setAllowedEmails(data.map(e => e.email));
                }
            } catch (err) {
                if (isMounted) {
                    setAllowedEmails([]);
                    retryTimeout = setTimeout(fetchAllowedEmails, 5000);
                }
            }
        };
        fetchAllowedEmails();
        return () => {
            isMounted = false;
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [session?.access_token]);
    const isAllowed = session?.user && allowedEmails.map(e => e.toLowerCase()).includes(session.user.email.toLowerCase());

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col relative overflow-x-hidden">
            <style>{`
                .fancy-heading { font-family: 'Orbitron', 'Segoe UI', Arial, sans-serif; letter-spacing: 2px; text-shadow: 0 2px 16px #00c6ff99, 0 1px 0 #232526; }
            `}</style>
            {/* Header with login/logout at top right */}
            <div className="w-full flex flex-wrap items-center justify-between px-3 sm:px-8 pt-3 sm:pt-4 z-60 gap-2">
                <h1 className="fancy-heading text-xl sm:text-3xl font-extrabold text-blue-200 text-left whitespace-nowrap truncate max-w-[60vw]">History Explorer</h1>
                <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                    {session?.user && (
                        <span className="text-blue-200 font-semibold drop-shadow text-xs sm:text-sm truncate max-w-[40vw]">{session.user.email}</span>
                    )}
                    {session?.user ? (
                        <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 sm:px-4 rounded-xl font-semibold shadow transition-all duration-200 border border-gray-600/60 text-xs sm:text-base whitespace-nowrap">Logout</button>
                    ) : (
                        <button onClick={handleLogin} className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white px-3 py-2 sm:px-4 rounded-xl font-bold shadow-lg transition-all duration-300 glow text-xs sm:text-base whitespace-nowrap">Login with Google</button>
                    )}
                </div>
            </div>
            {/* Always-visible controls: Add Event, Filters, Admin Tools */}
            <div className="w-full flex flex-wrap justify-center z-10 mb-4 gap-3 flex-row items-center mt-4">
                {isAllowed && (
                    <>
                        <button
                            className="px-2 py-1 text-sm sm:px-4 sm:py-2 sm:text-base rounded bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 font-bold text-white shadow transition-all duration-200 glow border border-white/20"
                            onClick={() => setShowForm(true)}
                        >
                            Add New Event
                        </button>
                        <button
                            className="px-2 py-1 text-sm sm:px-4 sm:py-2 sm:text-base rounded bg-gradient-to-r from-blue-700 to-pink-700 hover:from-blue-800 hover:to-pink-800 font-bold text-white shadow transition-all duration-200 border border-white/20 ml-2"
                            onClick={() => {
                                setShowAdminToolsModal(true);
                                setRemovalSelectedTags([]);
                                setRemovalError("");
                            }}
                        >
                            Admin Tools
                        </button>
                    </>
                )}
                <button
                    className={`flex items-center gap-1 px-2 py-1 text-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-base rounded border transition shadow-md ${anyFilterSet ? 'bg-green-700 border-green-300 text-white hover:bg-green-800' : 'bg-gray-800/80 text-white border-blue-400 hover:bg-blue-600'}`}
                    onClick={() => {
                        setTagSearchTerm("");
                        setBookSearchTerm("");
                        setRegionSearchTerm("");
                        setShowFilters(true);
                    }}
                    aria-label="Show filters"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-16.5 6.75h15m-13.5 6.75h12" />
                    </svg>
                    {anyFilterSet ? 'Filters*' : 'Filters'}
                </button>
                <span className="ml-2 px-3 py-1 rounded-full bg-gray-800 text-gray-200 text-xs sm:text-sm font-semibold border border-gray-500/60 shadow-sm min-w-[2.5rem] text-center inline-flex items-center" title="Number of events shown">
                    {filteredEvents.length} events
                </span>
            </div>
            {/* Timeline/Map/Tag Evolution toggle and region filter below controls */}
            <div className="w-full flex justify-center mb-4 gap-4">
                <button
                    className={`px-2 py-1 sm:px-4 sm:py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white text-sm sm:text-base ${showMap ? 'bg-blue-700' : 'bg-gray-700 hover:bg-blue-700'}`}
                    onClick={() => { setShowMap(true); setShowTagEvolution(false); }}
                >
                    World Map
                </button>
                <button
                    className={`px-2 py-1 sm:px-4 sm:py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white text-sm sm:text-base ${!showMap && !showTagEvolution ? 'bg-blue-700' : 'bg-gray-700 hover:bg-blue-700'}`}
                    onClick={() => { setShowMap(false); setShowTagEvolution(false); }}
                >
                    Timeline
                </button>
                <button
                    className={`px-2 py-1 sm:px-4 sm:py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white text-sm sm:text-base ${showTagEvolution ? 'bg-blue-700' : 'bg-gray-700 hover:bg-blue-700'}`}
                    onClick={() => { setShowMap(false); setShowTagEvolution(true); }}
                >
                    Tag Evolution
                </button>
                {regionFilter && (
                    <button
                        className="ml-2 px-3 py-2 rounded bg-pink-700 text-white font-bold border border-pink-300 shadow"
                        onClick={clearRegionFilter}
                    >
                        Clear Region Filter
                    </button>
                )}
            </div>
            {/* Modals/popovers for Add Event, Filters, Admin Tools */}
            {/* Add Event Modal */}
            {showForm && isAllowed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
                    <div
                        className="relative glass p-10 rounded-3xl shadow-2xl border-2 border-blue-400/60 w-full max-w-xl z-60 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526ee] via-[#00c6ff22] to-[#ff512f22] backdrop-blur-xl"
                        style={{
                            maxHeight: '70vh',
                            overflow: 'hidden',
                            margin: '1rem',
                            boxSizing: 'border-box',
                        }}
                    >
                        <button
                            className="absolute top-4 right-4 text-3xl text-blue-200 hover:text-pink-400 focus:outline-none"
                            onClick={() => setShowForm(false)}
                            aria-label="Close modal"
                        >
                            &times;
                        </button>
                        {/* Add Event Form */}
                        <AddEventForm
                            onClose={() => setShowForm(false)}
                            onEventAdded={async (newEvent) => {
                                await fetchEvents();
                                setShowForm(false);
                                // Always switch to timeline view after adding
                                setShowMap(false);
                                setShowTagEvolution(false);
                                // Find the new event in the refreshed events list by id
                                const latestEvent = (events || []).find(e => e.id === newEvent.id);
                                setSelectedEvent(latestEvent || newEvent); // fallback to newEvent if not found
                            }}
                            accessToken={session?.access_token}
                            allEvents={events}
                            setSelectedEvent={setSelectedEvent} // Pass down for possible use in AddEventForm
                        />
                    </div>
                </div>
            )}
            {/* Filters Modal/Popover */}
            {showFilters && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => setShowFilters(false)} />
                    <div
                        className="relative glass p-10 rounded-3xl shadow-2xl border-2 border-blue-400/60 w-full max-w-xl z-60 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526ee] via-[#00c6ff22] to-[#ff512f22] backdrop-blur-xl"
                        style={{
                            maxHeight: '70vh',
                            overflow: 'hidden',
                            margin: '1rem',
                            boxSizing: 'border-box',
                        }}
                    >
                        <button
                            className="absolute top-4 right-4 text-3xl text-blue-200 hover:text-pink-400 focus:outline-none"
                            onClick={() => setShowFilters(false)}
                            aria-label="Close filters"
                        >
                            &times;
                        </button>
                        {/* Filters UI */}
                        <FiltersPopover
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            dateFilter={dateFilter}
                            setDateFilter={setDateFilter}
                            selectedTags={selectedTags}
                            setSelectedTags={setSelectedTags}
                            selectedBooks={selectedBooks}
                            setSelectedBooks={setSelectedBooks}
                            selectedRegions={selectedRegions}
                            setSelectedRegions={setSelectedRegions}
                            selectedCountries={selectedCountries}
                            setSelectedCountries={setSelectedCountries}
                            tagSearchTerm={tagSearchTerm}
                            setTagSearchTerm={setTagSearchTerm}
                            bookSearchTerm={bookSearchTerm}
                            setBookSearchTerm={setBookSearchTerm}
                            regionSearchTerm={regionSearchTerm}
                            setRegionSearchTerm={setRegionSearchTerm}
                            tagOverlapOnly={tagOverlapOnly}
                            setTagOverlapOnly={setTagOverlapOnly}
                            allEvents={events}
                            onClose={() => setShowFilters(false)}
                        />
                    </div>
                </div>
            )}
            {/* Admin Tools Modal */}
            {isAllowed && showAdminToolsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => { setShowAdminToolsModal(false); setShowDeleteConfirm(false); }} />
                    <div
                        className="relative glass p-10 rounded-3xl shadow-2xl border-2 border-blue-400/60 w-full max-w-xl z-60 flex flex-col items-center justify-center animate-fade-in-modal bg-gradient-to-br from-[#232526ee] via-[#00c6ff22] to-[#ff512f22] backdrop-blur-xl text-center"
                        style={{
                            maxHeight: '70vh',
                            overflow: 'hidden',
                            margin: '1rem',
                            boxSizing: 'border-box',
                        }}
                    >
                        <button
                            className="absolute top-4 right-4 text-3xl text-blue-200 hover:text-pink-400 focus:outline-none"
                            onClick={() => { setShowAdminToolsModal(false); setShowDeleteConfirm(false); }}
                            aria-label="Close admin tools modal"
                        >
                            &times;
                        </button>
                        <div className="w-full flex flex-col items-center justify-center text-center">
                            <AdminToolsModal
                                removalSelectedTags={removalSelectedTags}
                                setRemovalSelectedTags={setRemovalSelectedTags}
                                removalLoading={removalLoading}
                                setRemovalLoading={setRemovalLoading}
                                removalError={removalError}
                                setRemovalError={setRemovalError}
                                showDeleteConfirm={showDeleteConfirm}
                                setShowDeleteConfirm={setShowDeleteConfirm}
                                allEvents={events}
                                accessToken={session?.access_token}
                                onClose={() => setShowAdminToolsModal(false)}
                                onEventsUpdated={fetchEvents}
                            />
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col items-center w-full max-w-5xl px-8 mx-auto mt-2 mb-4 z-10 min-h-0">
                {showMap ? (
                    <MapView
                        events={filteredEvents}
                        onRegionSelect={handleRegionSelect}
                        setSelectedRegions={setSelectedRegions}
                        setSelectedCountries={setSelectedCountries}
                        loading={eventsLoading}
                        error={eventsError}
                        onBackToTimeline={() => setShowMap(false)}
                    />
                ) : showTagEvolution ? (
                    <TagEvolutionChart
                        events={filteredEvents}
                        selectedTags={selectedTags}
                        tagColors={(() => {
                          // Build tag color map as in Timeline
                          const colorPalette = [
                            '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#818cf8', '#f472b6', '#f59e42', '#10b981', '#6366f1', '#e879f9', '#f43f5e', '#0ea5e9', '#fde047', '#22d3ee'
                          ];
                          const tagMap = {};
                          (selectedTags || []).forEach((tag, idx) => {
                            tagMap[tag] = colorPalette[idx % colorPalette.length];
                          });
                          return tagMap;
                        })()}
                    />
                ) : (
                    <Timeline
                        user={session?.user}
                        accessToken={session?.access_token}
                        events={filteredEvents}
                        allEvents={events}
                        eventsLoading={eventsLoading}
                        eventsError={eventsError}
                        showMap={showMap}
                        setShowMap={setShowMap}
                        regionFilter={regionFilter}
                        setRegionFilter={setRegionFilter}
                        clearRegionFilter={clearRegionFilter}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        dateFilter={dateFilter}
                        setDateFilter={setDateFilter}
                        zoomLevel={zoomLevel}
                        setZoomLevel={setZoomLevel}
                        groupMode={groupMode}
                        setGroupMode={setGroupMode}
                        selectedTags={selectedTags}
                        setSelectedTags={setSelectedTags}
                        selectedBooks={selectedBooks}
                        setSelectedBooks={setSelectedBooks}
                        selectedRegions={selectedRegions}
                        setSelectedRegions={setSelectedRegions}
                        selectedCountries={selectedCountries}
                        setSelectedCountries={setSelectedCountries}
                        tagSearchTerm={tagSearchTerm}
                        setTagSearchTerm={setTagSearchTerm}
                        bookSearchTerm={bookSearchTerm}
                        setBookSearchTerm={setBookSearchTerm}
                        regionSearchTerm={regionSearchTerm}
                        setRegionSearchTerm={setRegionSearchTerm}
                        tagOverlapOnly={tagOverlapOnly}
                        setTagOverlapOnly={setTagOverlapOnly}
                        onEventsUpdated={fetchEvents}
                        selectedEvent={selectedEvent}
                        setSelectedEvent={setSelectedEvent}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        editError={editError}
                        setEditError={setEditError}
                        // Remove the controls from Timeline itself
                        hideControls={true}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
