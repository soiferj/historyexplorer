import React, { useRef, useEffect, useState } from "react";
import supabase from "../supabase";
import * as d3 from "d3";

const Timeline = () => {
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

            setEvents(data || []);
        };

        fetchEvents();

        if (!events || events.length === 0) return;

        const filteredEvents = events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.book_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.tags.some(tag => tag.toLowerCase() === searchTerm.toLowerCase())
        );

        const svg = d3.select(svgRef.current)
            .attr("width", 600)
            .attr("height", filteredEvents.length * 100);

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
            .style("opacity", 0) // Start hidden
            .transition()
            .duration(500)
            .style("opacity", 1);

        const nodes = svg.selectAll("circle")
            .data(filteredEvents)
            .enter()
            .append("circle")
            .attr("cx", 300)
            .attr("cy", (d, i) => yScale(i))
            .attr("r", 14)
            .attr("fill", "#3B82F6")
            .style("cursor", "pointer")
            .on("click", (event, d) => setSelectedEvent(d))
            .style("opacity", 0) // Start hidden
            .transition()
            .duration(500)
            .style("opacity", 1); // Fade in

        svg.selectAll("text")
            .data(filteredEvents)
            .enter()
            .append("text")
            .attr("x", 320)
            .attr("y", (d, i) => yScale(i) + 5)
            .attr("fill", "white")
            .text(d => `${new Date(d.date).getFullYear()} ${d.date_type} – ${d.title}`)
            .style("font-size", "16px");

    }, [events]);

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
            const response = await fetch("http://localhost:5000/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

    // Center the entire page content
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white text-center">
            <h1 className="text-4xl font-bold mb-6">Interactive Timeline</h1>

            {/* Collapsible Add Event Form */}
            <button
                className="mb-4 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow transition"
                onClick={() => setShowForm(v => !v)}
            >
                {showForm ? "Hide Add New Event" : "Add New Event"}
            </button>
            {showForm && (
                <form onSubmit={handleFormSubmit} className="bg-gray-800/90 p-8 rounded-2xl mb-8 w-full max-w-xl flex flex-col gap-4 shadow-xl border border-gray-700">
                    <h2 className="text-2xl font-bold mb-2 text-blue-300">Add New Event</h2>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="title">Title</label>
                        <input id="title" name="title" value={form.title} onChange={handleFormChange} required placeholder="Title" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                        <label className="font-semibold text-gray-300" htmlFor="year">Year</label>
                        <input id="year" name="year" value={form.year} onChange={handleFormChange} required placeholder="Year (e.g. 1776)" className="p-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" pattern="\\d{4}" maxLength={4} />
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
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
                    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96 animate-slide-in text-center">
                        <h2 className="text-2xl font-bold mb-2">{selectedEvent.title}</h2>
                        <p className="text-gray-400 mb-2">{selectedEvent.description}</p>
                        <p className="text-gray-500 mb-2">Year: {new Date(selectedEvent.date).getFullYear()} {selectedEvent.date_type}</p>
                        {selectedEvent.book && (
                            <p className="mt-2 text-gray-300"><strong>Book:</strong> {selectedEvent.book}</p>
                        )}
                        <button className="mt-4 bg-red-500 p-2 rounded" onClick={() => setSelectedEvent(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timeline;
