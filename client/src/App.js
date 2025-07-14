import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import Timeline from "./components/Timeline";
import MapView from "./components/MapView";
import AddEventForm from "./components/AddEventForm";
import FiltersPopover from "./components/FiltersPopover";
import AdminToolsModal from "./components/AdminToolsModal";
import TagEvolutionChart from "./components/TagEvolutionChart";
import Chatbot from "./components/Chatbot";
import EventModal from "./components/EventModal";
import VirtualBookshelf from "./components/VirtualBookshelf";
import Conversations from "./components/Conversations";
import "./index.css";

function App() {
    const [session, setSession] = useState(null);
    // Centralized state
    const [showMap, setShowMap] = useState(false);
    const [events, setEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState(null);
    // Filters/groupings
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
    const [searchTerms, setSearchTerms] = useState([""]);
    const [searchLogic, setSearchLogic] = useState("AND");
    // Add state for hamburger menu
    const [showMenu, setShowMenu] = useState(false);
    // Add state for localEditForm
    const [localEditForm, setLocalEditForm] = useState(null);
    // Add state for editBookMode and newBook
    const [editBookMode, setEditBookMode] = useState('existing');
    const [newBook, setNewBook] = useState('');
    // Add state for bookshelf, conversations view, and selected conversation for chatbot
    const [showBookshelf, setShowBookshelf] = useState(false);
    const [showConversations, setShowConversations] = useState(false);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    // Add state for share link copied feedback
    const [shareCopied, setShareCopied] = useState(false);

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
        // --- MULTI FREE TEXT FILTER LOGIC ---
        let filtered = events;
        const nonEmptyTerms = searchTerms.map(t => t.trim()).filter(Boolean);
        if (nonEmptyTerms.length > 0) {
            if (searchLogic === "AND") {
                filtered = filtered.filter(event =>
                    nonEmptyTerms.every(term =>
                        event.title.toLowerCase().includes(term.toLowerCase()) ||
                        event.book_reference.toLowerCase().includes(term.toLowerCase()) ||
                        event.description.toLowerCase().includes(term.toLowerCase()) ||
                        (Array.isArray(event.tags) && event.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase())))
                    )
                );
            } else {
                filtered = filtered.filter(event =>
                    nonEmptyTerms.some(term =>
                        event.title.toLowerCase().includes(term.toLowerCase()) ||
                        event.book_reference.toLowerCase().includes(term.toLowerCase()) ||
                        event.description.toLowerCase().includes(term.toLowerCase()) ||
                        (Array.isArray(event.tags) && event.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase())))
                    )
                );
            }
        }
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
        searchTerms.some(t => t.trim() !== '') ||
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

    // Add state for controlling EventModal visibility
    const showEventModal = !!selectedEvent;

    // --- LIFTED HANDLERS FOR MODAL ---
    // These handlers use state from App.js and are passed to both Timeline and EventModal
    const startEditEvent = () => {
        if (!selectedEvent) return;
        setEditMode(true);
        setLocalEditForm({
            title: selectedEvent.title || '',
            description: selectedEvent.description || '',
            book_reference: selectedEvent.book_reference || '',
            year: selectedEvent.date ? new Date(selectedEvent.date).getFullYear().toString() : '',
            tags: Array.isArray(selectedEvent.tags) ? selectedEvent.tags : (selectedEvent.tags ? selectedEvent.tags.split(/,\s*/) : []),
            date_type: selectedEvent.date_type || 'CE',
            regions: Array.isArray(selectedEvent.regions) ? selectedEvent.regions : (selectedEvent.regions ? selectedEvent.regions.split(/,\s*/) : []),
            countries: Array.isArray(selectedEvent.countries) ? selectedEvent.countries : (selectedEvent.countries ? selectedEvent.countries.split(/,\s*/) : []),
        });
    };

    // Add: handleEditSubmit for EventModal
    const handleEditSubmit = async (e, updatedForm) => {
        if (e) e.preventDefault();
        setEditError("");
        try {
            const formToSave = updatedForm || localEditForm;
            const apiUrl = process.env.REACT_APP_API_URL;
            const paddedYear = formToSave.year ? formToSave.year.toString().padStart(4, "0") : "";
            const tagsArr = Array.isArray(formToSave.tags) ? formToSave.tags : (formToSave.tags ? formToSave.tags.split(/,\s*/) : []);
            const regionsArr = Array.isArray(formToSave.regions) ? formToSave.regions : (formToSave.regions ? formToSave.regions.split(/,\s*/) : []);
            const countriesArr = Array.isArray(formToSave.countries) ? formToSave.countries : (formToSave.countries ? formToSave.countries.split(/,\s*/) : []);
            const response = await fetch(`${apiUrl}/events/${selectedEvent._id || selectedEvent.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
                    },
                    body: JSON.stringify({
                        ...formToSave,
                        date: paddedYear ? `${paddedYear}-01-01` : undefined,
                        tags: tagsArr,
                        regions: regionsArr,
                        countries: countriesArr,
                    })
                }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to update event");
            setEditMode(false);
            setSelectedEvent(null);
            await fetchEvents();
        } catch (err) {
            setEditError(err.message);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/events/${selectedEvent._id || selectedEvent.id}`, {
                method: "DELETE",
                headers: {
                    ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
                }
            });
            if (!response.ok) throw new Error("Failed to delete event");
            setSelectedEvent(null);
            setEditMode(false);
            await fetchEvents();
        } catch (err) {
            alert("Error deleting event: " + (err.message || err));
        }
    };

    // Add a handler for edit form changes
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setLocalEditForm(f => ({ ...f, [name]: value }));
    };

    // Utility functions for unique values (same as Timeline)
    const getAllBooks = (events) => {
        const bookSet = new Set();
        (events || []).forEach(ev => ev.book_reference && bookSet.add(ev.book_reference));
        return Array.from(bookSet).sort((a, b) => a.localeCompare(b));
    };
    const getAllTags = (events) => {
        const tagSet = new Set();
        (events || []).forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => tagSet.add(tag)));
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    };
    const getAllRegions = (events) => {
        const regionSet = new Set();
        (events || []).forEach(ev => Array.isArray(ev.regions) && ev.regions.forEach(region => regionSet.add(region)));
        return Array.from(regionSet).sort((a, b) => a.localeCompare(b));
    };
    const getAllCountries = (events) => {
        const countrySet = new Set();
        (events || []).forEach(ev => Array.isArray(ev.countries) && ev.countries.forEach(country => countrySet.add(country)));
        return Array.from(countrySet).sort((a, b) => a.localeCompare(b));
    };

    // On mount, check for ?event= in URL and open modal if found
    useEffect(() => {
        // On mount, check for ?event= in URL and open modal if found
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('event');
        // Restore filters from URL if present
        const urlSearch = params.get('search');
        if (urlSearch) setSearchTerms(urlSearch.split(','));
        const urlLogic = params.get('logic');
        if (urlLogic) setSearchLogic(urlLogic);
        const urlStartYear = params.get('startYear');
        if (urlStartYear) setDateFilter(f => ({ ...f, startYear: urlStartYear }));
        const urlStartEra = params.get('startEra');
        if (urlStartEra) setDateFilter(f => ({ ...f, startEra: urlStartEra }));
        const urlEndYear = params.get('endYear');
        if (urlEndYear) setDateFilter(f => ({ ...f, endYear: urlEndYear }));
        const urlEndEra = params.get('endEra');
        if (urlEndEra) setDateFilter(f => ({ ...f, endEra: urlEndEra }));
        const urlTags = params.get('tags');
        if (urlTags) setSelectedTags(urlTags.split(','));
        const urlBooks = params.get('books');
        if (urlBooks) setSelectedBooks(urlBooks.split(','));
        const urlRegions = params.get('regions');
        if (urlRegions) setSelectedRegions(urlRegions.split(','));
        const urlCountries = params.get('countries');
        if (urlCountries) setSelectedCountries(urlCountries.split(','));
        const urlOverlap = params.get('overlap');
        if (urlOverlap === '1') setTagOverlapOnly(true);
        if (eventId && events && events.length > 0) {
            // Try to find event by id or _id
            const found = events.find(ev => ev.id === eventId || ev._id === eventId);
            if (found) {
                setSelectedEvent(found);
            }
        }
        // Do NOT close the modal if no event param, to avoid interfering with normal modal usage
        // Only open if param is present
        // eslint-disable-next-line
    }, [events]);

    // Utility: encode filters as query params for sharing
    function getShareableUrl() {
        const params = new URLSearchParams();
        if (searchTerms.some(t => t.trim() !== '')) params.set('search', searchTerms.filter(t => t.trim() !== '').join(','));
        if (searchLogic && searchLogic !== 'AND') params.set('logic', searchLogic);
        if (dateFilter.startYear) params.set('startYear', dateFilter.startYear);
        if (dateFilter.startEra && dateFilter.startEra !== 'BCE') params.set('startEra', dateFilter.startEra);
        if (dateFilter.endYear) params.set('endYear', dateFilter.endYear);
        if (dateFilter.endEra && dateFilter.endEra !== 'CE') params.set('endEra', dateFilter.endEra);
        if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
        if (selectedBooks.length > 0) params.set('books', selectedBooks.join(','));
        if (selectedRegions.length > 0) params.set('regions', selectedRegions.join(','));
        if (selectedCountries.length > 0) params.set('countries', selectedCountries.join(','));
        if (tagOverlapOnly) params.set('overlap', '1');
        // Timeline view only
        params.delete('event');
        return window.location.origin + window.location.pathname + '?' + params.toString();
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col relative overflow-x-hidden">
            <style>{`
                .fancy-heading { font-family: 'Orbitron', 'Segoe UI', Arial, sans-serif; letter-spacing: 2px; text-shadow: 0 2px 16px #00c6ff99, 0 1px 0 #232526; }
            `}</style>
            {/* Header with login/logout at top right */}
            <div className="w-full flex flex-wrap items-center justify-between px-3 sm:px-8 pt-3 sm:pt-4 z-60 gap-2">
                <h1 className="fancy-heading text-xl sm:text-3xl font-extrabold text-blue-200 text-left whitespace-nowrap truncate max-w-[60vw]">History Explorer</h1>
                <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                    {/* Hamburger menu button */}
                    <button
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-700 text-white focus:outline-none mr-2"
                        onClick={() => setShowMenu(v => !v)}
                        aria-label="Open menu"
                    >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
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
            {/* Hamburger menu dropdown */}
            {showMenu && (
                <div className="fixed inset-0 z-50 flex items-start justify-end">
                    <div className="fixed inset-0 bg-black/30" onClick={() => setShowMenu(false)} />
                    <div
                        className="relative bg-gradient-to-br from-[#232526ee] via-[#00c6ff22] to-[#ff512f22] backdrop-blur-xl shadow-2xl border-2 border-blue-400/60 rounded-l-3xl mt-4 mr-2 p-6 pt-14 w-72 flex flex-col gap-5 animate-fade-in-modal z-60 glass-menu"
                        style={{
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                            border: '1.5px solid rgba(255,255,255,0.18)',
                            background: 'rgba(34, 49, 63, 0.85)',
                            minHeight: '60vh',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                        }}
                    >
                        <button
                            className="absolute top-3 right-3 text-2xl text-blue-200 hover:text-pink-400 focus:outline-none bg-gray-900/70 rounded-full w-9 h-9 flex items-center justify-center shadow-lg border border-blue-400/40 transition-all duration-150 hover:scale-110 z-70"
                            onClick={() => setShowMenu(false)}
                            aria-label="Close menu"
                        >
                            &times;
                        </button>
                        <div className="flex flex-col gap-3 mt-2">
                            <button
                                className={`w-full px-4 py-2 rounded-xl font-bold shadow border border-blue-400 text-white text-left transition-all duration-150 text-base tracking-wide ${!showMap && !showTagEvolution && !showBookshelf && !showConversations ? 'bg-blue-700/90 scale-[1.03]' : 'bg-gray-700/80 hover:bg-blue-700/80 hover:scale-105'}`}
                                onClick={() => { setShowMap(false); setShowTagEvolution(false); setShowBookshelf(false); setShowConversations(false); setShowMenu(false); }}
                            >
                                Timeline
                            </button>
                            <button
                                className={`w-full px-4 py-2 rounded-xl font-bold shadow border border-blue-400 text-white text-left transition-all duration-150 text-base tracking-wide ${showMap ? 'bg-blue-700/90 scale-[1.03]' : 'bg-gray-700/80 hover:bg-blue-700/80 hover:scale-105'}`}
                                onClick={() => { setShowMap(true); setShowTagEvolution(false); setShowBookshelf(false); setShowConversations(false); setShowMenu(false); }}
                            >
                                World Map
                            </button>
                            <button
                                className={`w-full px-4 py-2 rounded-xl font-bold shadow border border-blue-400 text-white text-left transition-all duration-150 text-base tracking-wide ${showTagEvolution ? 'bg-blue-700/90 scale-[1.03]' : 'bg-gray-700/80 hover:bg-blue-700/80 hover:scale-105'}`}
                                onClick={() => { setShowMap(false); setShowTagEvolution(true); setShowBookshelf(false); setShowConversations(false); setShowMenu(false); }}
                            >
                                Event Distribution
                            </button>
                            <button
                                className={`w-full px-4 py-2 rounded-xl font-bold shadow border border-blue-400 text-white text-left transition-all duration-150 text-base tracking-wide ${showBookshelf ? 'bg-blue-700/90 scale-[1.03]' : 'bg-gray-700/80 hover:bg-blue-700/80 hover:scale-105'}`}
                                onClick={() => { setShowMap(false); setShowTagEvolution(false); setShowBookshelf(true); setShowConversations(false); setShowMenu(false); }}
                            >
                                Bookshelf
                            </button>
                            <button
                                className={`w-full px-4 py-2 rounded-xl font-bold shadow border border-blue-400 text-white text-left transition-all duration-150 text-base tracking-wide ${showConversations ? 'bg-blue-700/90 scale-[1.03]' : 'bg-gray-700/80 hover:bg-blue-700/80 hover:scale-105'}`}
                                onClick={() => { setShowMap(false); setShowTagEvolution(false); setShowBookshelf(false); setShowConversations(true); setShowMenu(false); }}
                            >
                                Conversations
                            </button>
                        </div>
                        <div className="my-3 border-t border-blue-400/30" />
                        {isAllowed && (
                            <button
                                className="w-full px-4 py-2 rounded-xl font-bold shadow border border-pink-400 text-white text-left bg-gray-700/80 hover:bg-pink-700/80 hover:scale-105 transition-all duration-150 text-base tracking-wide"
                                onClick={() => { setShowAdminToolsModal(true); setRemovalSelectedTags([]); setRemovalError(""); setShowMenu(false); }}
                            >
                                Admin Tools
                            </button>
                        )}
                    </div>
                </div>
            )}
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
            {/* Discrete Share Button - bottom left corner */}
            <button
                className="fixed bottom-4 left-4 z-50 px-3 py-1 rounded bg-blue-900/80 text-blue-100 text-xs border border-blue-400 shadow hover:bg-blue-800 transition-all focus:outline-none"
                style={{fontWeight: 600, opacity: 0.85}}
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(getShareableUrl());
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 1500);
                    } catch (e) {
                        alert('Failed to copy link');
                    }
                }}
                aria-label="Share timeline link"
                title="Copy link to this timeline view"
            >
                Share
            </button>
            {shareCopied && (
                <span className="fixed bottom-16 left-4 z-50 px-3 py-1 rounded bg-green-700 text-white text-xs font-semibold border border-green-300 shadow">Link copied!</span>
            )}
            {/* Floating Chatbot */}
            {isAllowed && (
                <Chatbot
                    userId={session?.user?.id || null}
                    events={events}
                    setSelectedEvent={setSelectedEvent}
                    setEditMode={setEditMode}
                    conversationId={selectedConversationId}
                    open={!!selectedConversationId}
                    onClose={() => setSelectedConversationId(null)}
                />
            )}
            {/* Event Modal (always above Chatbot) */}
            {showEventModal && (
                <EventModal
                    selectedEvent={selectedEvent}
                    editMode={editMode}
                    handleEditSubmit={handleEditSubmit}
                    handleEditChange={handleEditChange}
                    localEditForm={localEditForm}
                    setLocalEditForm={setLocalEditForm}
                    editError={editError}
                    editBookMode={editBookMode}
                    setEditBookMode={setEditBookMode}
                    newBook={newBook}
                    setNewBook={setNewBook}
                    getAllBooks={getAllBooks}
                    getAllTags={getAllTags}
                    getAllRegions={getAllRegions}
                    getAllCountries={getAllCountries}
                    validEvents={events}
                    handleDeleteEvent={handleDeleteEvent}
                    startEditEvent={startEditEvent}
                    submitting={false}
                    Spinner={null}
                    isAllowed={isAllowed}
                    setShowModal={() => setSelectedEvent(null)}
                    showModal={showEventModal}
                    allEvents={events}
                />
            )}
            {/* Timeline/Map/Tag Evolution toggle and region filter below controls */}
            <div className="w-full flex justify-center mb-4 gap-4">
                {/* Removed World Map, Timeline, Tag Evolution buttons from here, now in hamburger menu */}
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
                            searchTerms={searchTerms}
                            setSearchTerms={setSearchTerms}
                            searchLogic={searchLogic}
                            setSearchLogic={setSearchLogic}
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
            <div className="flex flex-col items-center w-full max-w-7xl px-8 mx-auto mt-2 mb-4 z-10 min-h-0 min-h-[60vh] lg:min-h-[70vh] xl:min-h-[80vh] 2xl:min-h-[90vh]">
                {showConversations ? (
                    <Conversations
                        userId={session?.user?.id}
                        onSelectConversation={convId => {
                            setSelectedConversationId(convId);
                            setSelectedEvent(null); // close any event modal
                            setEditMode(false);
                            // Do NOT close conversations view
                        }}
                    />
                ) : showBookshelf ? (
                    <VirtualBookshelf events={events} isAllowed={isAllowed} />
                ) : showMap ? (
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
                    <div className="w-full flex justify-center items-center">
                        <TagEvolutionChart
                            className="mx-auto w-full"
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
                    </div>
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
                        tagOverlapOnly={tagOverlapOnly}
                        setTagOverlapOnly={setTagOverlapOnly}
                        searchTerms={searchTerms}
                        setSearchTerms={setSearchTerms}
                        searchLogic={searchLogic}
                        setSearchLogic={setSearchLogic}
                        selectedEvent={selectedEvent}
                        setSelectedEvent={setSelectedEvent}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        editError={editError}
                        setEditError={setEditError}
                        hideControls={true}
                        isAllowed={isAllowed}
                        startEditEvent={startEditEvent}
                        handleDeleteEvent={handleDeleteEvent}
                        tagSearchTerm={tagSearchTerm}
                        setTagSearchTerm={setTagSearchTerm}
                        bookSearchTerm={bookSearchTerm}
                        setBookSearchTerm={setBookSearchTerm}
                        regionSearchTerm={regionSearchTerm}
                        setRegionSearchTerm={setRegionSearchTerm}
                        onEventsUpdated={fetchEvents}
                        localEditForm={localEditForm}
                        setLocalEditForm={setLocalEditForm}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
