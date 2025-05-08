import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import Timeline from "./components/Timeline";
import MapView from "./components/MapView";
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
    const [tagSearchTerm, setTagSearchTerm] = useState("");
    const [bookSearchTerm, setBookSearchTerm] = useState("");
    const [regionSearchTerm, setRegionSearchTerm] = useState("");
    const [tagOverlapOnly, setTagOverlapOnly] = useState(false);

    // Fetch events once
    useEffect(() => {
        let isMounted = true;
        let retryTimeout;
        const fetchEvents = async () => {
            setEventsLoading(true);
            setEventsError(null);
            try {
                const apiUrl = process.env.REACT_APP_API_URL;
                const response = await fetch(`${apiUrl}/events`);
                if (!response.ok) throw new Error("Failed to fetch events");
                const data = await response.json();
                if (isMounted) {
                    setEvents(data);
                    setEventsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setEvents([]);
                    setEventsError(err.message);
                    setEventsLoading(true);
                    retryTimeout = setTimeout(fetchEvents, 5000);
                }
            }
        };
        fetchEvents();
        return () => {
            isMounted = false;
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
    };

    // Filtering logic (same as Timeline)
    function yearEraToComparable(year, era) {
        if (!year) return null;
        const y = parseInt(year, 10);
        if (isNaN(y)) return null;
        return era === 'BCE' ? -y : y;
    }
    // Apply all filters (AND logic for tags, books, regions)
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
        // Apply tag filter (all selected tags must be present)
        if (selectedTags.length > 0) {
            filtered = filtered.filter(event => Array.isArray(event.tags) && selectedTags.every(tag => event.tags.includes(tag)));
        }
        // Apply book filter (event must match one of the selected books)
        if (selectedBooks.length > 0) {
            filtered = filtered.filter(event => selectedBooks.includes(event.book_reference));
        }
        // Apply region filter (event must match one of the selected regions)
        if (selectedRegions.length > 0) {
            filtered = filtered.filter(event => Array.isArray(event.regions) && event.regions.some(region => selectedRegions.includes(region)));
        }
        return filtered;
    })();

    // World/Timeline toggle and region select
    const handleRegionSelect = (region) => {
        setRegionFilter(region);
        setShowMap(false);
    };
    const clearRegionFilter = () => setRegionFilter(null);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col relative overflow-x-hidden">
            <style>{`
                .fancy-heading { font-family: 'Orbitron', 'Segoe UI', Arial, sans-serif; letter-spacing: 2px; text-shadow: 0 2px 16px #00c6ff99, 0 1px 0 #232526; }
            `}</style>
            {/* Header with login/logout at top right */}
            <div className="w-full flex flex-wrap items-center justify-between px-3 sm:px-8 pt-3 sm:pt-4 z-20 gap-2">
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
            {/* Main content below header */}
            <div className="flex flex-col items-center w-full max-w-5xl px-8 mx-auto mt-2 mb-4 z-10 min-h-0">
                {showMap ? (
                    <MapView
                        events={filteredEvents}
                        onRegionSelect={handleRegionSelect}
                        loading={eventsLoading}
                        error={eventsError}
                        onBackToTimeline={() => setShowMap(false)}
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
                        tagSearchTerm={tagSearchTerm}
                        setTagSearchTerm={setTagSearchTerm}
                        bookSearchTerm={bookSearchTerm}
                        setBookSearchTerm={setBookSearchTerm}
                        regionSearchTerm={regionSearchTerm}
                        setRegionSearchTerm={setRegionSearchTerm}
                        tagOverlapOnly={tagOverlapOnly}
                        setTagOverlapOnly={setTagOverlapOnly}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
