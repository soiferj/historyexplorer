import React, { useRef, useEffect, useState } from "react";
import supabase from "../supabase";
import * as d3 from "d3";

const Timeline = () => {
    const svgRef = useRef();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

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
            .text(d => `${new Date(d.date).getFullYear()} – ${d.title}`)
            .style("font-size", "16px");

    }, [events]);

    // Center the entire page content
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white text-center">
            <h1 className="text-4xl font-bold mb-6">Interactive Timeline</h1>

            {/* Search Bar */}
            <div className="mb-4 w-full flex justify-center">
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
                        <p className="text-gray-500 mb-2">Year: {new Date(selectedEvent.date).getFullYear()}</p>
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
