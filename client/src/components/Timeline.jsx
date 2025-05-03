import React, { useRef, useEffect, useState } from "react";
import supabase from "../supabase";
import * as d3 from "d3";

const Timeline = ({ user, accessToken }) => {
    const svgRef = useRef();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    // New state for form fields and loading
    const [form, setForm] = useState({
        title: "",
        description: "",
        book_reference: "",
        year: "",
        tags: "",
        date_type: "CE"
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    // Edit mode states
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', description: '', book_reference: '', year: '', tags: '', date_type: 'CE' });
    const [editError, setEditError] = useState("");

    const apiUrl = process.env.REACT_APP_API_URL;

    // Fetch allowed emails from Supabase
    const [allowedEmails, setAllowedEmails] = useState([]);

    useEffect(() => {
        const fetchAllowedEmails = async () => {
            const { data, error } = await supabase.from("allowed_emails").select("email");
            if (!error && data) {
                setAllowedEmails(data.map(e => e.email));
            }
        };
        fetchAllowedEmails();
    }, []);

    useEffect(() => {
        const fetchEvents = async () => {
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .order("date", { ascending: true });

            if (error) {
                console.error("Error fetching events:", error.message);
                return;
            }
            setEvents(sortEvents(data));
        };

        fetchEvents();
    }, []);

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

    // Date filter state
    const [dateFilter, setDateFilter] = useState({
        startYear: '',
        startEra: 'BCE',
        endYear: '',
        endEra: 'CE'
    });

    // Helper to convert year/era to comparable number
    function yearEraToComparable(year, era) {
        if (!year) return null;
        const y = parseInt(year, 10);
        if (isNaN(y)) return null;
        return era === 'BCE' ? -y : y;
    }

    // Calculate filtered events (all matching events)
    const filteredEvents = (() => {
        if (!events || events.length === 0) return [];
        let filtered = events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.book_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (Array.isArray(event.tags) && event.tags.some(tag => tag.toLowerCase() === searchTerm.toLowerCase()))
        );
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
        return filtered;
    })();

    // D3 rendering effect, depends on filteredEvents
    useEffect(() => {
        if (!filteredEvents || filteredEvents.length === 0) {
            d3.select(svgRef.current).selectAll("*").remove();
            return;
        }

        // Responsive SVG width
        const svgWidth = Math.min(window.innerWidth - 40, 900); // up to 900px, with margin
        const svgHeight = Math.max(filteredEvents.length * 100, 100);
        const timelineX = 200; // move timeline left for more text space
        const textX = timelineX + 40;
        const maxTextWidth = svgWidth - textX - 40;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render
        svg.attr("width", "100%")
            .attr("height", svgHeight)
            .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

        if (filteredEvents.length === 0) return;

        const yScale = d3.scaleLinear()
            .domain([0, filteredEvents.length - 1])
            .range([50, filteredEvents.length * 100 - 50]);

        const links = filteredEvents.slice(1).map((event, index) => ({
            source: filteredEvents[index],
            target: event
        }));

        svg.selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("x1", timelineX)
            .attr("y1", d => yScale(filteredEvents.indexOf(d.source)))
            .attr("x2", timelineX)
            .attr("y2", d => yScale(filteredEvents.indexOf(d.target)))
            .attr("stroke", "#ccc")
            .attr("stroke-width", 2)
            .style("opacity", 0)
            .transition()
            .duration(500)
            .style("opacity", 1);

        svg.selectAll("circle")
            .data(filteredEvents)
            .enter()
            .append("circle")
            .attr("cx", timelineX)
            .attr("cy", (d, i) => yScale(i))
            .attr("r", 14)
            .attr("fill", "#3B82F6")
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this)
                  .transition()
                  .duration(150)
                  .attr("r", 22);
            })
            .on("mouseout", function (event, d) {
                d3.select(this)
                  .transition()
                  .duration(150)
                  .attr("r", 14);
            })
            .on("click", (event, d) => setSelectedEvent(d))
            .style("opacity", 0)
            .transition()
            .duration(500)
            .style("opacity", 1);

        // Helper for truncating text with ellipsis
        function truncateText(text, maxWidth, fontSize = 16, fontFamily = 'Orbitron, Segoe UI, Arial, sans-serif') {
            // Create a temporary SVG text element to measure width
            const tempSvg = d3.select(document.body).append("svg").attr("style", "position:absolute;left:-9999px;top:-9999px;");
            const tempText = tempSvg.append("text")
                .attr("font-size", fontSize)
                .attr("font-family", fontFamily)
                .text(text);
            let width = tempText.node().getComputedTextLength();
            let truncated = text;
            while (width > maxWidth && truncated.length > 3) {
                truncated = truncated.slice(0, -1);
                tempText.text(truncated + '…');
                width = tempText.node().getComputedTextLength();
            }
            tempSvg.remove();
            return width > maxWidth ? truncated + '…' : truncated;
        }

        svg.selectAll("text")
            .data(filteredEvents)
            .enter()
            .append("text")
            .attr("x", textX)
            .attr("y", (d, i) => yScale(i) + 5)
            .attr("fill", "white")
            .attr("font-size", 16)
            .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("style", `max-width: ${maxTextWidth}px; overflow: visible;`)
            .text(d => truncateText(`${new Date(d.date).getFullYear()} ${d.date_type} – ${d.title}`, maxTextWidth));
    }, [filteredEvents]);

    // Helper to pad year to 4 digits
    function padYear(year) {
        if (!year) return "0001";
        return year.toString().padStart(4, "0");
    }

    // Add event handler
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        try {
            const paddedYear = padYear(form.year);
            const response = await fetch(`${apiUrl}/events`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify({
                    ...form,
                    date: paddedYear ? `${paddedYear}-01-01` : undefined,
                    tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to add event");
            setForm({ title: "", description: "", book_reference: "", year: "", tags: "", date_type: "CE" });
            // Refetch events
            const { data: newEvents, error: fetchError } = await supabase
                .from("events")
                .select("*")
                .order("date", { ascending: true });
            if (!fetchError) setEvents(sortEvents(newEvents));
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const startEditEvent = () => {
        if (!selectedEvent) return;
        setEditForm({
            title: selectedEvent.title || '',
            description: selectedEvent.description || '',
            book_reference: selectedEvent.book_reference || '',
            year: selectedEvent.date ? new Date(selectedEvent.date).getFullYear().toString() : '',
            tags: selectedEvent.tags ? selectedEvent.tags.join(", ") : '',
            date_type: selectedEvent.date_type || 'CE',
        });
        setEditMode(true);
        setEditError("");
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(f => ({ ...f, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditError("");
        try {
            const paddedYear = padYear(editForm.year);
            const response = await fetch(`${apiUrl}/events/${selectedEvent.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify({
                    ...editForm,
                    date: paddedYear ? `${paddedYear}-01-01` : undefined,
                    tags: editForm.tags.split(",").map(t => t.trim()).filter(Boolean),
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to update event");
            setEditMode(false);
            setSelectedEvent(null);
            // Refetch events
            const { data: newEvents, error: fetchError } = await supabase
                .from("events")
                .select("*")
                .order("date", { ascending: true });
            if (!fetchError) setEvents(sortEvents(newEvents));
        } catch (err) {
            setEditError(err.message);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            const response = await fetch(`${apiUrl}/events/${selectedEvent.id}`, {
                method: "DELETE",
                headers: {
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                }
            });
            if (!response.ok) throw new Error("Failed to delete event");
            setSelectedEvent(null);
            // Refetch events
            const { data: newEvents, error: fetchError } = await supabase
                .from("events")
                .select("*")
                .order("date", { ascending: true });
            if (!fetchError) setEvents(sortEvents(newEvents));
        } catch (err) {
            alert(err.message);
        }
    };

    // Center the entire page content
    const isAllowed = user && allowedEmails.includes(user.email);

    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-screen text-white text-center relative overflow-x-hidden bg-transparent px-2">
                {/* Collapsible Add Event Form */}
                {isAllowed && (
                    <>
                        {/* Space between login and add new event */}
                        <div style={{ height: '1.5rem' }} />
                        <button
                            className="mb-4 px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 font-bold text-white shadow-2xl transition-all duration-300 glow z-10 text-lg tracking-wide border-2 border-white/20"
                            onClick={() => setShowForm(v => !v)}
                        >
                            {showForm ? "Hide Add New Event" : "Add New Event"}
                        </button>
                    </>
                )}
                {showForm && isAllowed && (
                    <form onSubmit={handleFormSubmit} className="glass p-10 rounded-3xl mb-10 w-full max-w-2xl flex flex-col gap-6 shadow-2xl border-2 border-blue-400 z-10 animate-fade-in-modal items-center mx-auto bg-gradient-to-br from-[#232526cc] via-[#00c6ff33] to-[#ff512f33] backdrop-blur-lg">
                        <h2 className="text-3xl font-extrabold mb-4 text-blue-300 text-center">Add New Event</h2>
                        <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                            <label className="font-semibold text-gray-300" htmlFor="title">Title</label>
                            <input id="title" name="title" value={form.title} onChange={handleFormChange} required placeholder="Title" className="p-4 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg" />
                        </div>
                        <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                            <label className="font-semibold text-gray-300" htmlFor="year">Year</label>
                            <input id="year" name="year" value={form.year} onChange={handleFormChange} required placeholder="Year (e.g. 1776)" className="p-4 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg" maxLength={4} />
                        </div>
                        <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                            <label className="font-semibold text-gray-300" htmlFor="date_type">Date Type</label>
                            <select id="date_type" name="date_type" value={form.date_type} onChange={handleFormChange} className="p-4 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg">
                                <option value="BCE">BCE</option>
                                <option value="CE">CE</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                            <label className="font-semibold text-gray-300" htmlFor="book_reference">Book Reference</label>
                            <input id="book_reference" name="book_reference" value={form.book_reference} onChange={handleFormChange} placeholder="Book Reference" className="p-4 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg" />
                        </div>
                        <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                            <label className="font-semibold text-gray-300" htmlFor="tags">Tags</label>
                            <input id="tags" name="tags" value={form.tags} onChange={handleFormChange} placeholder="Tags (comma separated)" className="p-4 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg" />
                        </div>
                        <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                            <label className="font-semibold text-gray-300" htmlFor="description">Description</label>
                            <textarea id="description" name="description" value={form.description} onChange={handleFormChange} placeholder="Description" className="p-4 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition min-h-[80px] resize-vertical text-lg" />
                        </div>
                        <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-4 rounded-xl mt-2 font-bold text-white shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed glow text-lg w-full max-w-md mx-auto">{submitting ? "Adding..." : "Add Event"}</button>
                        {error && <div className="text-red-400 mt-1 text-center w-full max-w-md mx-auto">{error}</div>}
                    </form>
                )}

                {/* Space between add new event and search */}
                <div style={{ height: '1.5rem' }} />

                {/* Search Bar */}
                <div className="mb-4 w-full flex justify-center z-10">
                    <input
                        type="text"
                        placeholder="Search events..."
                        className="p-3 w-72 rounded-xl bg-gray-800/80 text-white text-center border border-blue-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300 shadow-md"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Add space between search and filter */}
                <div style={{ height: '1.5rem' }} />

                {/* Date Range Filter */}
                <div className="mb-4 w-full flex flex-wrap justify-center gap-4 z-10">
                    <div className="flex items-center gap-2">
                        <label className="text-blue-200 font-semibold">From</label>
                        <input
                            type="number"
                            min="1"
                            max="9999"
                            value={dateFilter.startYear}
                            onChange={e => setDateFilter(f => ({ ...f, startYear: e.target.value }))}
                            placeholder="Year"
                            className="w-20 p-2 rounded bg-gray-800 text-white border border-blue-400"
                        />
                        <select
                            value={dateFilter.startEra}
                            onChange={e => setDateFilter(f => ({ ...f, startEra: e.target.value }))}
                            className="p-2 rounded bg-gray-800 text-white border border-blue-400"
                        >
                            <option value="BCE">BCE</option>
                            <option value="CE">CE</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-blue-200 font-semibold">To</label>
                        <input
                            type="number"
                            min="1"
                            max="9999"
                            value={dateFilter.endYear}
                            onChange={e => setDateFilter(f => ({ ...f, endYear: e.target.value }))}
                            placeholder="Year"
                            className="w-20 p-2 rounded bg-gray-800 text-white border border-blue-400"
                        />
                        <select
                            value={dateFilter.endEra}
                            onChange={e => setDateFilter(f => ({ ...f, endEra: e.target.value }))}
                            className="p-2 rounded bg-gray-800 text-white border border-blue-400"
                        >
                            <option value="BCE">BCE</option>
                            <option value="CE">CE</option>
                        </select>
                    </div>
                    <button
                        className="ml-2 px-4 py-2 rounded bg-gray-700 text-white border border-blue-400 hover:bg-blue-600 transition"
                        onClick={() => setDateFilter({ startYear: '', startEra: 'BCE', endYear: '', endEra: 'CE' })}
                        type="button"
                    >
                        Clear
                    </button>
                </div>

                {/* Scrollable timeline container */}
                <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '2rem' }} className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl bg-gray-800/80">
                    <svg ref={svgRef} className="timeline-svg w-full" />
                </div>

                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        {/* Modal overlay */}
                        <div className="fixed inset-0 bg-gradient-to-br from-[#232526cc] via-[#00c6ff88] to-[#ff512fcc] blur-sm" onClick={() => setSelectedEvent(null)} />
                        {/* Modal content */}
                        <div className="relative glass text-gray-100 p-8 rounded-2xl shadow-2xl border border-blue-400 max-w-lg w-full z-60 flex flex-col items-center animate-fade-in-modal">
                            <button
                                className="absolute top-3 right-3 text-2xl text-blue-300 hover:text-pink-400 focus:outline-none"
                                onClick={() => setSelectedEvent(null)}
                                aria-label="Close modal"
                            >
                                &times;
                            </button>
                            {/* Edit mode toggle */}
                            {editMode ? (
                                <form onSubmit={handleEditSubmit} className="glass p-8 rounded-2xl mb-8 w-full max-w-xl flex flex-col gap-4 shadow-xl border border-blue-400">
                                    <h2 className="text-2xl font-bold mb-2 text-blue-300">Edit Event</h2>
                                    {/* Title */}
                                    <div className="flex flex-col gap-2 text-left">
                                        <label className="font-semibold text-gray-300" htmlFor="edit-title">Title</label>
                                        <input id="edit-title" name="title" value={editForm.title} onChange={handleEditChange} required placeholder="Title" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                                    </div>
                                    {/* Year */}
                                    <div className="flex flex-col gap-2 text-left">
                                        <label className="font-semibold text-gray-300" htmlFor="edit-year">Year</label>
                                        <input id="edit-year" name="year" value={editForm.year} onChange={handleEditChange} required placeholder="Year (e.g. 1776)" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" maxLength={4} />
                                    </div>
                                    {/* Book Reference */}
                                    <div className="flex flex-col gap-2 text-left">
                                        <label className="font-semibold text-gray-300" htmlFor="edit-book_reference">Book Reference</label>
                                        <input id="edit-book_reference" name="book_reference" value={editForm.book_reference} onChange={handleEditChange} placeholder="Book Reference" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                                    </div>
                                    {/* Description */}
                                    <div className="flex flex-col gap-2 text-left">
                                        <label className="font-semibold text-gray-300" htmlFor="edit-description">Description</label>
                                        <textarea id="edit-description" name="description" value={editForm.description} onChange={handleEditChange} placeholder="Description" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition min-h-[80px] resize-vertical" />
                                    </div>
                                    {/* Tags */}
                                    <div className="flex flex-col gap-2 text-left">
                                        <label className="font-semibold text-gray-300" htmlFor="edit-tags">Tags</label>
                                        <input id="edit-tags" name="tags" value={editForm.tags} onChange={handleEditChange} placeholder="Tags (comma separated)" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                                    </div>
                                    {/* Date Type */}
                                    <div className="flex flex-col gap-2 text-left">
                                        <label className="font-semibold text-gray-300" htmlFor="edit-date_type">Date Type</label>
                                        <select id="edit-date_type" name="date_type" value={editForm.date_type} onChange={handleEditChange} className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
                                            <option value="BCE">BCE</option>
                                            <option value="CE">CE</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 mt-2 justify-center">
                                        <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-3 rounded-lg font-bold text-white shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed glow">Save</button>
                                        <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded font-bold" onClick={() => setEditMode(false)}>Cancel</button>
                                    </div>
                                    {editError && <div className="text-red-400 mt-1 text-center">{editError}</div>}
                                </form>
                            ) : (
                                <>
                                    {/* Title */}
                                    <h2 className="text-3xl font-bold mb-4 text-blue-400 fancy-heading">{selectedEvent.title}</h2>
                                    {/* Year */}
                                    <p className="text-blue-200 mb-2 text-lg">Year: {new Date(selectedEvent.date).getFullYear()} {selectedEvent.date_type}</p>
                                    {/* Book Reference */}
                                    {selectedEvent.book_reference && (
                                        <p className="mt-2 text-pink-300">Book: {selectedEvent.book_reference}</p>
                                    )}
                                    {/* Description */}
                                    <p className="text-gray-200 mb-4 whitespace-pre-line">{selectedEvent.description}</p>
                                    {/* Tags */}
                                    {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                            <span className="bg-gradient-to-r from-blue-200 to-pink-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 italic shadow">
                                                <span className="italic font-normal text-gray-700 mr-1">Tags: </span>{selectedEvent.tags.join(", ")}
                                            </span>
                                        </div>
                                    )}
                                    {isAllowed && (
                                        <>
                                            <button className="mt-6 bg-gradient-to-r from-blue-500 to-pink-500 text-white px-4 py-2 rounded glow font-bold shadow transition-all duration-300" onClick={startEditEvent}>Edit</button>
                                            <button className="mt-2 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded font-bold shadow hover:from-red-600 hover:to-pink-700 transition-all duration-300" onClick={handleDeleteEvent}>Delete</button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Timeline;
