import React, { useEffect, useRef } from "react";
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

    const drawGraph = (events) => {
        const svg = d3.select(svgRef.current)
            .attr("width", 800)
            .attr("height", 600);

        const simulation = d3.forceSimulation(events)
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(400, 300))
            .force("link", d3.forceLink().id(d => d.id).distance(100));

        const nodes = svg.selectAll("circle")
            .data(events)
            .enter()
            .append("circle")
            .attr("r", 10)
            .attr("fill", "steelblue")
            .call(d3.drag());

        nodes.append("title").text(d => d.title);

        simulation.on("tick", () => {
            nodes.attr("cx", d => d.x).attr("cy", d => d.y);
        });
    };

    return <svg ref={svgRef}></svg>;
};

export default EventGraph;
