import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import supabase from "../supabase";

const EventGraph = () => {
    const svgRef = useRef();

    useEffect(() => {
        const fetchEvents = async () => {
            let { data, error } = await supabase.from("events").select("*");
    
            if (error) {
                console.error("Error fetching events:", error.message);
                return;
            }
    
            console.log("Fetched Data:", data); // Debugging
    
            // Ensure data exists before drawing graph
            if (Array.isArray(data) && data.length > 0) {
                drawGraph(data);
            } else {
                console.warn("No events found!");
            }
        };
    
        fetchEvents();
    }, []);    

    const [selectedEvent, setSelectedEvent] = useState(null);

    const drawGraph = (events) => {
        const svg = d3.select(svgRef.current)
            .attr("width", 800)
            .attr("height", 600);
    
        const simulation = d3.forceSimulation(events)
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(400, 300))
            .force("link", d3.forceLink().id(d => d.id).distance(120));
    
        const nodes = svg.selectAll("circle")
            .data(events)
            .enter()
            .append("circle")
            .attr("r", 14)
            .attr("fill", d => d.tags.includes("Revolution") ? "#EF4444" : "#3B82F6")
            .style("cursor", "pointer")
            .on("mouseover", function() {
                d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
            })
            .on("mouseout", function() {
                d3.select(this).attr("stroke", "none");
            })
            .on("click", (event, d) => {
                setSelectedEvent(d); // Save clicked event data
            });
    
        nodes.append("title").text(d => d.title);
    
        simulation.on("tick", () => {
            nodes.attr("cx", d => d.x).attr("cy", d => d.y);
        });
    };    

    return (
        <div className="relative">
            <svg ref={svgRef} className="bg-gray-800 rounded-lg"></svg>

            {selectedEvent && (
                <div className="absolute top-10 left-10 bg-white text-black shadow-lg rounded p-4 w-64">
                    <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
                    <p className="text-gray-700">{selectedEvent.description}</p>
                    <p className="text-gray-500">Date: {new Date(selectedEvent.date).toLocaleDateString()}</p>
                    <button
                        className="mt-2 bg-red-500 text-white p-2 rounded hover:bg-red-700"
                        onClick={() => setSelectedEvent(null)}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default EventGraph;
