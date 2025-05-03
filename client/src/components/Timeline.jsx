import React, { useRef, useEffect, useState } from "react";
import supabase from "../supabase";
import * as d3 from "d3";

const Timeline = ({ user }) => {
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
            console.log("Allowed Emails:", data);
            console.log("Error:", error);
            if (!error && data) {
                setAllowedEmails(data.map(e => e.email));
            }
        };
        fetchAllowedEmails();
    }, []);

    useEffect(() => {
        const fetchEvents = async () => {
            const { data, error } = await supabase
                .from("events") // Table name
                .select("*")
                .order("date", { ascending: true });

            if (error) {
                console.error("Error fetching events:", error.message);
                return;
            }

            // Sort: BCE descending, CE ascending
            const sorted = (data || []).slice().sort((a, b) => {
                if (a.date_type === b.date_type) {
                    // Parse year as integer for BCE and CE
                    const aYear = a.date ? parseInt(a.date.split("-")[0], 10) : 0;
                    const bYear = b.date ? parseInt(b.date.split("-")[0], 10) : 0;
                    if (a.date_type === "BCE") {
                        // Descending for BCE (e.g., -500, -400, -300)
                        return bYear - aYear;
                    } else {
                        // Ascending for CE (e.g., 100, 200, 300)
                        return aYear - bYear;
                    }
                }
                // BCE before CE
                return a.date_type === "BCE" ? -1 : 1;
            });
            setEvents(sorted);
        };

        fetchEvents();
    }, []);

    // D3 rendering effect, depends on events and searchTerm
    useEffect(() => {
        if (!events || events.length === 0) return;

        const filteredEvents = events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.book_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (Array.isArray(event.tags) && event.tags.some(tag => tag.toLowerCase() === searchTerm.toLowerCase()))
        );

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render
        svg.attr("width", 600)
            .attr("height", Math.max(filteredEvents.length * 100, 100));

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
            .attr("x1", 300)
            .attr("y1", d => yScale(filteredEvents.indexOf(d.source)))
            .attr("x2", 300)
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
            .attr("cx", 300)
            .attr("cy", (d, i) => yScale(i))
            .attr("r", 14)
            .attr("fill", "#3B82F6")
            .style("cursor", "pointer")
            .on("click", (event, d) => setSelectedEvent(d))
            .style("opacity", 0)
            .transition()
            .duration(500)
            .style("opacity", 1);

        svg.selectAll("text")
            .data(filteredEvents)
            .enter()
            .append("text")
            .attr("x", 320)
            .attr("y", (d, i) => yScale(i) + 5)
            .attr("fill", "white")
            .text(d => `${new Date(d.date).getFullYear()} ${d.date_type} – ${d.title}`)
            .style("font-size", "16px");
    }, [events, searchTerm]);

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
            const response = await fetch(`${apiUrl}/events`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(user && { Authorization: `Bearer ${user.access_token}` })
                },
                body: JSON.stringify({
                    ...form,
                    date: form.year ? `${form.year}-01-01` : undefined,
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
            if (!fetchError) setEvents(newEvents || []);
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
            const response = await fetch(`${apiUrl}/events/${selectedEvent.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(user && { Authorization: `Bearer ${user.access_token}` })
                },
                body: JSON.stringify({
                    ...editForm,
                    date: editForm.year ? `${editForm.year}-01-01` : undefined,
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
            if (!fetchError) setEvents(newEvents || []);
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
                    ...(user && { Authorization: `Bearer ${user.access_token}` })
                }
            });
            if (!response.ok) throw new Error("Failed to delete event");
            setSelectedEvent(null);
            // Refetch events
            const { data: newEvents, error: fetchError } = await supabase
                .from("events")
                .select("*")
                .order("date", { ascending: true });
            if (!fetchError) setEvents(newEvents || []);
        } catch (err) {
            alert(err.message);
        }
    };

    // Center the entire page content
    const isAllowed = user && allowedEmails.includes(user.email);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white text-center">
            {/* Collapsible Add Event Form */}
            {isAllowed && (
                <button
                    className="mb-4 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow transition"
                    onClick={() => setShowForm(v => !v)}
                >
                    {showForm ? "Hide Add New Event" : "Add New Event"}
                </button>
            )}
            {showForm && isAllowed && (
                <form onSubmit={handleFormSubmit} className="bg-gray-800/90 p-8 rounded-2xl mb-8 w-full max-w-xl flex flex-col gap-4 shadow-xl border border-gray-700">
                    <h2 className="text-2xl font-bold mb-2 text-blue-300">Add New Event</h2>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="title">Title</label>
                        <input id="title" name="title" value={form.title} onChange={handleFormChange} required placeholder="Title" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="year">Year</label>
                        <input id="year" name="year" value={form.year} onChange={handleFormChange} required placeholder="Year (e.g. 1776)" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" maxLength={4} />
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="date_type">Date Type</label>
                        <select id="date_type" name="date_type" value={form.date_type} onChange={handleFormChange} className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
                            <option value="BCE">BCE</option>
                            <option value="CE">CE</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="book_reference">Book Reference</label>
                        <input id="book_reference" name="book_reference" value={form.book_reference} onChange={handleFormChange} placeholder="Book Reference" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="tags">Tags</label>
                        <input id="tags" name="tags" value={form.tags} onChange={handleFormChange} placeholder="Tags (comma separated)" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="description">Description</label>
                        <textarea id="description" name="description" value={form.description} onChange={handleFormChange} placeholder="Description" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition min-h-[80px] resize-vertical" />
                    </div>
                    <button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 p-3 rounded-lg mt-2 font-bold text-white shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed" disabled={submitting}>{submitting ? "Adding..." : "Add Event"}</button>
                    {error && <div className="text-red-400 mt-1 text-center">{error}</div>}
                </form>
            )}

            {/* Search Bar */}
            <div className="mb-4 w-full flex justify-center">
                <br/><br/>
                <input
                    type="text"
                    placeholder="Search events..."
                    className="p-2 w-64 rounded bg-gray-800 text-white text-center"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <svg ref={svgRef} className="bg-gray-800 rounded-lg mx-auto block"></svg>

            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Modal overlay */}
                    <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setSelectedEvent(null)} />
                    {/* Modal content */}
                    <div className="relative bg-white text-gray-900 p-8 rounded-2xl shadow-2xl border border-blue-500 max-w-lg w-full z-60 flex flex-col items-center animate-fade-in-modal">
                        <button
                            className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700 focus:outline-none"
                            onClick={() => setSelectedEvent(null)}
                            aria-label="Close modal"
                        >
                            &times;
                        </button>
                        {/* Edit mode toggle */}
                        {editMode ? (
                            <form onSubmit={handleEditSubmit} className="bg-gray-800/90 p-8 rounded-2xl mb-8 w-full max-w-xl flex flex-col gap-4 shadow-xl border border-gray-700">
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
                                    <button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 p-3 rounded-lg font-bold text-white shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed">Save</button>
                                    <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded font-bold" onClick={() => setEditMode(false)}>Cancel</button>
                                </div>
                                {editError && <div className="text-red-400 mt-1 text-center">{editError}</div>}
                            </form>
                        ) : (
                            <>
                                {/* Title */}
                                <h2 className="text-3xl font-bold mb-4 text-blue-700">{selectedEvent.title}</h2>
                                {/* Year */}
                                <p className="text-gray-500 mb-2 text-lg">Year: {new Date(selectedEvent.date).getFullYear()} {selectedEvent.date_type}</p>
                                {/* Book Reference */}
                                {selectedEvent.book_reference && (
                                    <p className="mt-2 text-blue-800">Book: {selectedEvent.book_reference}</p>
                                )}
                                {/* Description */}
                                <p className="text-gray-700 mb-4 whitespace-pre-line">{selectedEvent.description}</p>
                                {/* Tags */}
                                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                        <span className="bg-blue-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 italic">
                                            <span className="italic font-normal text-gray-700 mr-1">Tags: </span>{selectedEvent.tags.join(", ")}
                                        </span>
                                    </div>
                                )}
                                {isAllowed && (
                                    <>
                                        <button className="mt-6 bg-blue-600 text-white px-4 py-2 rounded" onClick={startEditEvent}>Edit</button>
                                        <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded" onClick={handleDeleteEvent}>Delete</button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timeline;
