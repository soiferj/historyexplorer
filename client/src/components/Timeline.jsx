import React, { useRef, useEffect, useState } from "react";
import supabase from "../supabase";
import * as d3 from "d3";

const Timeline = () => {
    const svgRef = useRef();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);

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

        const svg = d3.select(svgRef.current)
            .attr("width", 600)
            .attr("height", events.length * 100);

        const yScale = d3.scaleLinear()
            .domain([0, events.length - 1])
            .range([50, events.length * 100 - 50]);

        const links = events.slice(1).map((event, index) => ({
            source: events[index],
            target: event
        }));

        svg.selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("x1", 300)
            .attr("y1", d => yScale(events.indexOf(d.source)))
            .attr("x2", 300)
            .attr("y2", d => yScale(events.indexOf(d.target)))
            .attr("stroke", "#ccc")
            .attr("stroke-width", 2);

        const nodes = svg.selectAll("circle")
            .data(events)
            .enter()
            .append("circle")
            .attr("cx", 300)
            .attr("cy", (d, i) => yScale(i))
            .attr("r", 14)
            .attr("fill", "#3B82F6")
            .style("cursor", "pointer")
            .on("click", (event, d) => setSelectedEvent(d));

        svg.selectAll("text")
            .data(events)
            .enter()
            .append("text")
            .attr("x", 320)
            .attr("y", (d, i) => yScale(i) + 5)
            .attr("fill", "white")
            .text(d => `${new Date(d.date).toLocaleDateString()} – ${d.title}`)
            .style("font-size", "16px");

    }, [events]);

    return (
        <div className="relative p-6 bg-gray-900 text-white">
            <h1 className="text-4xl font-bold text-center mb-6">Interactive Timeline</h1>

            <svg ref={svgRef} className="bg-gray-800 rounded-lg"></svg>

            {selectedEvent && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96">
                        <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                        <p className="text-gray-400">{selectedEvent.description}</p>
                        <button className="mt-4 bg-red-500 p-2 rounded" onClick={() => setSelectedEvent(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timeline;
