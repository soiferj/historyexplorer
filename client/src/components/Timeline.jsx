import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

// Color palette for tags/books (define once for use in both UI and D3)
const colorPalette = [
    '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#818cf8', '#f472b6', '#f59e42', '#10b981', '#6366f1', '#e879f9', '#f43f5e', '#0ea5e9', '#fde047', '#22d3ee'
];

const Timeline = (props) => {
    // Destructure all props
    const {
        user, accessToken, events, allEvents, eventsLoading, eventsError,
        showMap, setShowMap, regionFilter, setRegionFilter, clearRegionFilter,
        searchTerm, setSearchTerm, dateFilter, setDateFilter, zoomLevel, setZoomLevel,
        selectedTags, setSelectedTags, selectedBooks, setSelectedBooks,
        selectedRegions, setSelectedRegions, tagSearchTerm, setTagSearchTerm, bookSearchTerm, setBookSearchTerm,
        regionSearchTerm, setRegionSearchTerm, tagOverlapOnly, setTagOverlapOnly
    } = props;

    const svgRef = useRef();
    const [selectedEvent, setSelectedEvent] = useState(null);
    // New state for form fields and loading
    const [form, setForm] = useState({
        title: "",
        description: "",
        book_reference: "",
        year: "",
        tags: "",
        date_type: "CE",
        regions: "",
        countries: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    // Edit mode states
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', description: '', book_reference: '', year: '', tags: '', date_type: 'CE', regions: '', countries: '' });
    const [editError, setEditError] = useState("");

    const apiUrl = process.env.REACT_APP_API_URL;

    // Fetch allowed emails from the server
    const [allowedEmails, setAllowedEmails] = useState([]);
    const [allowedEmailsLoading, setAllowedEmailsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let retryTimeout;
        const fetchAllowedEmails = async () => {
            setAllowedEmailsLoading(true);
            try {
                const response = await fetch(`${apiUrl}/allowed-emails`, {
                    headers: {
                        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch allowed emails");
                const data = await response.json();
                if (isMounted) {
                    setAllowedEmails(data.map(e => e.email));
                    setAllowedEmailsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setAllowedEmails([]);
                    setAllowedEmailsLoading(true); // keep loading
                    retryTimeout = setTimeout(fetchAllowedEmails, 5000);
                }
            }
        };
        fetchAllowedEmails();
        return () => {
            isMounted = false;
            if (retryTimeout) clearTimeout(retryTimeout);
        };
    }, [apiUrl, accessToken]);

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

    // Calculate filtered events (all matching events)
    const filteredEvents = (() => {
        if (!events || events.length === 0) return [];
        let filtered = events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.book_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (Array.isArray(event.tags) && event.tags.some(tag => tag.toLowerCase() === searchTerm.toLowerCase())) ||
            (Array.isArray(event.regions) && event.regions.some(region => region.toLowerCase().includes(searchTerm.toLowerCase())))
        );
        // Apply region filter if set
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
        return filtered;
    })();

    // Helper to get all unique tags from filteredEvents, only include tags with more than 2 entries, sorted alphabetically (case-insensitive)
    function getAllTags(events) {
        const tagCount = {};
        const tagOriginal = {};
        (events || []).forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => {
            const lower = tag.toLowerCase();
            tagCount[lower] = (tagCount[lower] || 0) + 1;
            if (!tagOriginal[lower]) tagOriginal[lower] = tag; // preserve first original case
        }));
        return Object.entries(tagCount)
            .filter(([tag, count]) => count > 2)
            .map(([tag]) => tagOriginal[tag])
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }
    // Helper to get all unique book references from filteredEvents, sorted alphabetically
    function getAllBooks(events) {
        const bookSet = new Set();
        (events || []).forEach(ev => ev.book_reference && bookSet.add(ev.book_reference));
        return Array.from(bookSet).sort((a, b) => a.localeCompare(b));
    }
    // Helper to get all unique regions from filteredEvents, sorted alphabetically
    function getAllRegions(events) {
        const regionSet = new Set();
        (events || []).forEach(ev => Array.isArray(ev.regions) && ev.regions.forEach(region => regionSet.add(region)));
        return Array.from(regionSet).sort((a, b) => a.localeCompare(b));
    }
    // Helper to get all unique countries from filteredEvents, sorted alphabetically
    function getAllCountries(events) {
        const countrySet = new Set();
        (events || []).forEach(ev => Array.isArray(ev.countries) && ev.countries.forEach(country => countrySet.add(country)));
        return Array.from(countrySet).sort((a, b) => a.localeCompare(b));
    }

    // Group events by century
    function ordinalSuffix(n) {
        if (n % 100 >= 11 && n % 100 <= 13) return n + 'th';
        switch (n % 10) {
            case 1: return n + 'st';
            case 2: return n + 'nd';
            case 3: return n + 'rd';
            default: return n + 'th';
        }
    }
    function groupEventsByCentury(events) {
        if (!events || events.length === 0) return [];
        const groups = {};
        events.forEach(event => {
            if (!event.date || !event.date_type) return;
            const year = parseInt(event.date.split("-")[0], 10);
            const centuryNum = Math.ceil(year / 100);
            const centuryLabel = ordinalSuffix(centuryNum);
            let label;
            if (event.date_type === "BCE") {
                label = `${centuryLabel} Century BCE`;
            } else {
                label = `${centuryLabel} Century CE`;
            }
            if (!groups[label]) groups[label] = { label, events: [] };
            groups[label].events.push(event);
        });
        // Sort centuries: BCE descending, then CE ascending
        return Object.values(groups).sort((a, b) => {
            const aIsBCE = a.label.includes('BCE');
            const bIsBCE = b.label.includes('BCE');
            const aNum = parseInt(a.label);
            const bNum = parseInt(b.label);
            if (aIsBCE && bIsBCE) return bNum - aNum;
            if (!aIsBCE && !bIsBCE) return aNum - bNum;
            return aIsBCE ? -1 : 1;
        });
    }
    // Group events by millennium
    function groupEventsByMillennium(events) {
        if (!events || events.length === 0) return [];
        const groups = {};
        events.forEach(event => {
            if (!event.date || !event.date_type) return;
            const year = parseInt(event.date.split("-")[0], 10);
            const millenniumNum = Math.ceil(year / 1000);
            // Use ordinalSuffix for millennium
            const millenniumLabel = ordinalSuffix(millenniumNum);
            let label;
            if (event.date_type === "BCE") {
                label = `${millenniumLabel} Millennium BCE`;
            } else {
                label = `${millenniumLabel} Millennium CE`;
            }
            if (!groups[label]) groups[label] = { label, events: [] };
            groups[label].events.push(event);
        });
        // Sort millennia: BCE descending, then CE ascending
        return Object.values(groups).sort((a, b) => {
            const aIsBCE = a.label.includes('BCE');
            const bIsBCE = b.label.includes('BCE');
            const aNum = parseInt(a.label);
            const bNum = parseInt(b.label);
            if (aIsBCE && bIsBCE) return bNum - aNum;
            if (!aIsBCE && !bIsBCE) return aNum - bNum;
            return aIsBCE ? -1 : 1;
        });
    }

    // Use grouped or flat data for rendering, and filter by selected tags/books if set
    let renderData;
    // Helper: filter for tag overlap
    function filterTagOverlap(events, selectedTags) {
        // Only include events that have at least 2 of the selected tags (case-insensitive)
        return events.filter(ev => {
            if (!Array.isArray(ev.tags)) return false;
            let count = 0;
            for (const tag of ev.tags) {
                if (selectedTags.some(sel => sel.toLowerCase() === tag.toLowerCase())) count++;
                if (count > 1) return true;
            }
            return false;
        });
    }
    if (zoomLevel === 2) {
        // Millennium grouping
        if (regionFilter && selectedRegions.length > 0) {
            renderData = groupEventsByMillennium(filteredEvents.filter(ev => Array.isArray(ev.regions) && ev.regions.some(region => selectedRegions.includes(region))));
        } else if (selectedTags.length > 0) {
            let tagFiltered = filteredEvents.filter(ev => Array.isArray(ev.tags) && ev.tags.some(tag => selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())));
            if (tagOverlapOnly && selectedTags.length > 1) {
                tagFiltered = filterTagOverlap(tagFiltered, selectedTags);
            }
            renderData = groupEventsByMillennium(tagFiltered);
        } else if (selectedBooks.length > 0) {
            renderData = groupEventsByMillennium(filteredEvents.filter(ev => selectedBooks.includes(ev.book_reference)));
        } else {
            renderData = groupEventsByMillennium(filteredEvents);
        }
    } else if (zoomLevel === 1) {
        // Century grouping
        if (regionFilter && selectedRegions.length > 0) {
            renderData = groupEventsByCentury(filteredEvents.filter(ev => Array.isArray(ev.regions) && ev.regions.some(region => selectedRegions.includes(region))));
        } else if (selectedTags.length > 0) {
            let tagFiltered = filteredEvents.filter(ev => Array.isArray(ev.tags) && ev.tags.some(tag => selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())));
            if (tagOverlapOnly && selectedTags.length > 1) {
                tagFiltered = filterTagOverlap(tagFiltered, selectedTags);
            }
            renderData = groupEventsByCentury(tagFiltered);
        } else if (selectedBooks.length > 0) {
            renderData = groupEventsByCentury(filteredEvents.filter(ev => selectedBooks.includes(ev.book_reference)));
        } else {
            renderData = groupEventsByCentury(filteredEvents);
        }
    } else {
        // Per-event
        if (regionFilter && selectedRegions.length > 0) {
            renderData = filteredEvents.filter(ev => Array.isArray(ev.regions) && ev.regions.some(region => selectedRegions.includes(region)));
        } else if (selectedTags.length > 0) {
            let tagFiltered = filteredEvents.filter(ev => Array.isArray(ev.tags) && ev.tags.some(tag => selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())));
            if (tagOverlapOnly && selectedTags.length > 1) {
                tagFiltered = filterTagOverlap(tagFiltered, selectedTags);
            }
            renderData = tagFiltered;
        } else if (selectedBooks.length > 0) {
            renderData = filteredEvents.filter(ev => selectedBooks.includes(ev.book_reference));
        } else {
            renderData = filteredEvents;
        }
    }

    // D3 rendering effect, depends on filteredEvents
    useEffect(() => {
        if (!renderData || renderData.length === 0) {
            d3.select(svgRef.current).selectAll("*").remove();
            return;
        }

        // Responsive SVG width and height
        const isMobile = window.innerWidth < 640;
        const svgWidth = isMobile ? window.innerWidth - 16 : Math.min(window.innerWidth - 40, 900);
        const svgHeight = Math.max(renderData.length * (isMobile ? 80 : 100), 100);
        const timelineX = isMobile ? 60 : 200;
        const textX = timelineX + (isMobile ? 32 : 40);
        const maxTextWidth = svgWidth - textX - 16;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render
        svg.attr("width", "100%")
            .attr("height", svgHeight)
            .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

        if (renderData.length === 0) return;

        const yScale = d3.scaleLinear()
            .domain([0, renderData.length - 1])
            .range([isMobile ? 40 : 50, renderData.length * (isMobile ? 80 : 100) - (isMobile ? 40 : 50)]);

        if (zoomLevel === 2) {
            // Millennium grouping
            const links = renderData.slice(1).map((group, index) => ({
                source: renderData[index],
                target: group
            }));
            svg.selectAll("line")
                .data(links)
                .enter()
                .append("line")
                .attr("x1", timelineX)
                .attr("y1", d => yScale(renderData.indexOf(d.source)))
                .attr("x2", timelineX)
                .attr("y2", d => yScale(renderData.indexOf(d.target)))
                .attr("stroke", "#ccc")
                .attr("stroke-width", isMobile ? 3 : 2)
                .style("opacity", 0)
                .transition()
                .duration(500)
                .style("opacity", 1);
            svg.selectAll("circle")
                .data(renderData)
                .enter()
                .append("circle")
                .attr("cx", timelineX)
                .attr("cy", (d, i) => yScale(i))
                .attr("r", isMobile ? 18 : 24)
                .attr("fill", "#f472b6")
                .style("cursor", "pointer")
                .on("click", (event, d) => {
                    setZoomLevel(1);
                    // Scroll to the first century of this millennium after zoom in
                    setTimeout(() => {
                        if (!timelineContainerRef.current) return;
                        // Find the index of the first event of this millennium in filteredEvents
                        const firstEvent = d.events[0];
                        const idx = filteredEvents.findIndex(ev => ev === firstEvent);
                        if (idx >= 0) {
                            const itemHeight = isMobile ? 80 : 100;
                            timelineContainerRef.current.scrollTo({
                                top: Math.max(0, (itemHeight * idx) - 40),
                                behavior: 'smooth'
                            });
                        }
                    }, 100);
                })
                .style("opacity", 0)
                .transition()
                .duration(500)
                .style("opacity", 1);
            svg.selectAll("g.millennium-label")
                .data(renderData)
                .enter()
                .append("g")
                .attr("class", "millennium-label")
                .attr("transform", (d, i) => `translate(${textX},${yScale(i)})`)
                .on("click", (event, d) => {
                    setZoomLevel(1);
                    setTimeout(() => {
                        if (!timelineContainerRef.current) return;
                        const firstEvent = d.events[0];
                        const idx = filteredEvents.findIndex(ev => ev === firstEvent);
                        if (idx >= 0) {
                            const itemHeight = isMobile ? 80 : 100;
                            timelineContainerRef.current.scrollTo({
                                top: Math.max(0, (itemHeight * idx) - 40),
                                behavior: 'smooth'
                            });
                        }
                    }, 100);
                })
                .each(function (d) {
                    const g = d3.select(this);
                    g.append("text")
                        .attr("y", -8)
                        .attr("fill", "#f472b6")
                        .attr("font-size", 24)
                        .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                        .attr("font-weight", "bold")
                        .attr("text-anchor", "start")
                        .attr("dominant-baseline", "middle")
                        .text(d.label);
                    g.append("text")
                        .attr("y", 20)
                        .attr("fill", "#93c5fd")
                        .attr("font-size", 16)
                        .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                        .attr("text-anchor", "start")
                        .attr("dominant-baseline", "middle")
                        .text(`${d.events.length} event${d.events.length !== 1 ? 's' : ''}`);
                });
        } else if (zoomLevel === 1) {
            // Century grouping
            const links = renderData.slice(1).map((group, index) => ({
                source: renderData[index],
                target: group
            }));
            svg.selectAll("line")
                .data(links)
                .enter()
                .append("line")
                .attr("x1", timelineX)
                .attr("y1", d => yScale(renderData.indexOf(d.source)))
                .attr("x2", timelineX)
                .attr("y2", d => yScale(renderData.indexOf(d.target)))
                .attr("stroke", "#ccc")
                .attr("stroke-width", isMobile ? 3 : 2)
                .style("opacity", 0)
                .transition()
                .duration(500)
                .style("opacity", 1);
            svg.selectAll("circle")
                .data(renderData)
                .enter()
                .append("circle")
                .attr("cx", timelineX)
                .attr("cy", (d, i) => yScale(i))
                .attr("r", isMobile ? 14 : 18)
                .attr("fill", "#6366f1")
                .style("cursor", "pointer")
                .on("click", (event, d) => {
                    setZoomLevel(0);
                    setTimeout(() => {
                        if (!timelineContainerRef.current) return;
                        const firstEvent = d.events[0];
                        const idx = filteredEvents.findIndex(ev => ev === firstEvent);
                        if (idx >= 0) {
                            const itemHeight = isMobile ? 80 : 100;
                            timelineContainerRef.current.scrollTo({
                                top: Math.max(0, (itemHeight * idx) - 40),
                                behavior: 'smooth'
                            });
                        }
                    }, 100);
                })
                .style("opacity", 0)
                .transition()
                .duration(500)
                .style("opacity", 1);
            svg.selectAll("g.century-label")
                .data(renderData)
                .enter()
                .append("g")
                .attr("class", "century-label")
                .attr("transform", (d, i) => `translate(${textX},${yScale(i)})`)
                .on("click", (event, d) => {
                    setZoomLevel(0);
                    setTimeout(() => {
                        if (!timelineContainerRef.current) return;
                        const firstEvent = d.events[0];
                        const idx = filteredEvents.findIndex(ev => ev === firstEvent);
                        if (idx >= 0) {
                            const itemHeight = isMobile ? 80 : 100;
                            timelineContainerRef.current.scrollTo({
                                top: Math.max(0, (itemHeight * idx) - 40),
                                behavior: 'smooth'
                            });
                        }
                    }, 100);
                })
                .each(function (d) {
                    const g = d3.select(this);
                    g.append("text")
                        .attr("y", -8)
                        .attr("fill", "#fbbf24")
                        .attr("font-size", 20)
                        .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                        .attr("font-weight", "bold")
                        .attr("text-anchor", "start")
                        .attr("dominant-baseline", "middle")
                        .text(d.label);
                    g.append("text")
                        .attr("y", 16)
                        .attr("fill", "#93c5fd")
                        .attr("font-size", 16)
                        .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                        .attr("text-anchor", "start")
                        .attr("dominant-baseline", "middle")
                        .text(`${d.events.length} event${d.events.length !== 1 ? 's' : ''}`);
                });
        } else {
            // Per-event rendering
            const links = renderData.slice(1).map((event, index) => ({
                source: renderData[index],
                target: event
            }));

            svg.selectAll("line")
                .data(links)
                .enter()
                .append("line")
                .attr("x1", timelineX)
                .attr("y1", d => yScale(renderData.indexOf(d.source)))
                .attr("x2", timelineX)
                .attr("y2", d => yScale(renderData.indexOf(d.target)))
                .attr("stroke", "#ccc")
                .attr("stroke-width", isMobile ? 3 : 2)
                .style("opacity", 0)
                .transition()
                .duration(500)
                .style("opacity", 1);

            // Color mapping for tags/books (use same as above)
            let colorMap = {};
            if (selectedTags.length > 0) {
                // Build a canonical tag list (case-insensitive, first original-case wins)
                const lowerToOriginal = {};
                selectedTags.forEach(tag => {
                    const lower = tag.toLowerCase();
                    if (!lowerToOriginal[lower]) lowerToOriginal[lower] = tag;
                });
                // Assign colors by order of first appearance in selectedTags (case-insensitive)
                const canonicalTags = Object.values(lowerToOriginal);
                canonicalTags.forEach((tag, idx) => {
                    colorMap[tag.toLowerCase()] = colorPalette[idx % colorPalette.length];
                });
            } else if (selectedBooks.length > 0) {
                selectedBooks.forEach((book, idx) => { colorMap[book] = colorPalette[idx % colorPalette.length]; });
            }

            // Multi-tag circle rendering
            if (selectedTags.length > 1) {
                // Remove any previous circles
                svg.selectAll("g.event-multitag").remove();
                svg.selectAll("g.event-multitag")
                    .data(renderData)
                    .enter()
                    .append("g")
                    .attr("class", "event-multitag")
                    .attr("transform", (d, i) => `translate(${timelineX},${yScale(i)})`)
                    .each(function (d, i) {
                        const g = d3.select(this);
                        // Sort matchingTags by selectedTags order for consistent color order
                        let matchingTags = Array.isArray(d.tags)
                            ? selectedTags
                                .map(sel => d.tags.find(tag => sel.toLowerCase() === tag.toLowerCase()))
                                .filter(Boolean)
                            : [];
                        if (matchingTags.length === 0) matchingTags = [null];
                        // Deduplicate matchingTags by lowercased value, preserving first original-case
                        const seen = new Set();
                        matchingTags = matchingTags.filter(tag => {
                            const lower = tag ? tag.toLowerCase() : '';
                            if (seen.has(lower)) return false;
                            seen.add(lower);
                            return true;
                        });
                        const r = isMobile ? 10 : 14;
                        const arc = d3.arc()
                            .innerRadius(0)
                            .outerRadius(r);
                        const n = matchingTags.length;
                        matchingTags.forEach((tag, idx) => {
                            const startAngle = (2 * Math.PI * idx) / n;
                            const endAngle = (2 * Math.PI * (idx + 1)) / n;
                            const lower = tag ? tag.toLowerCase() : '';
                            g.append("path")
                                .attr("d", arc({ startAngle, endAngle }))
                                .attr("fill", tag ? colorMap[lower] || "#3B82F6" : "#3B82F6")
                                .attr("stroke", "#222")
                                .attr("stroke-width", 1.5);
                        });
                        g.style("cursor", "pointer")
                            .on("mouseover", function (event) {
                                if (!isMobile) {
                                    g.selectAll("path")
                                        .transition()
                                        .duration(150)
                                        .attr("d", arc.outerRadius(22));
                                }
                            })
                            .on("mouseout", function (event) {
                                if (!isMobile) {
                                    g.selectAll("path")
                                        .transition()
                                        .duration(150)
                                        .attr("d", arc.outerRadius(r));
                                }
                            })
                            .on("click", (event) => setSelectedEvent(d));
                    });
            } else {
                svg.selectAll("circle")
                    .data(renderData)
                    .enter()
                    .append("circle")
                    .attr("cx", timelineX)
                    .attr("cy", (d, i) => yScale(i))
                    .attr("r", isMobile ? 10 : 14)
                    .attr("fill", d => {
                        if (selectedTags.length > 0 && Array.isArray(d.tags)) {
                            // Find the first matching tag (case-insensitive) in selectedTags
                            const match = d.tags.find(tag => selectedTags.some(sel => sel.toLowerCase() === tag.toLowerCase()));
                            if (match) {
                                // Always use the color of the canonical tag (first in selectedTags with same lowercased value)
                                const lower = match.toLowerCase();
                                return colorMap[lower] || "#3B82F6";
                            }
                            return "#3B82F6";
                        } else if (selectedBooks.length > 0) {
                            return colorMap[d.book_reference] || "#3B82F6";
                        }
                        return "#3B82F6";
                    })
                    .style("cursor", "pointer")
                    .on("mouseover", function (event, d) {
                        if (!isMobile) {
                            d3.select(this)
                                .transition()
                                .duration(150)
                                .attr("r", 22);
                        }
                    })
                    .on("mouseout", function (event, d) {
                        if (!isMobile) {
                            d3.select(this)
                                .transition()
                                .duration(150)
                                .attr("r", 14);
                        }
                    })
                    .on("click", (event, d) => setSelectedEvent(d))
                    .style("opacity", 0)
                    .transition()
                    .duration(500)
                    .style("opacity", 1);
            }
            // Helper for truncating text with ellipsis
            function truncateText(text, maxWidth, fontSize = 16, fontFamily = 'Orbitron, Segoe UI, Arial, sans-serif') {
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

            // Draw event text (date and title)
            svg.selectAll("g.event-label")
                .data(renderData)
                .enter()
                .append("g")
                .attr("class", "event-label")
                .attr("transform", (d, i) => `translate(${textX},${yScale(i)})`)
                .on("click", (event, d) => setSelectedEvent(d)) // Make the whole label group clickable
                .each(function (d) {
                    const g = d3.select(this);
                    if (isMobile) {
                        g.append("text")
                            .attr("y", -10)
                            .attr("fill", "#93c5fd")
                            .attr("font-size", 16)
                            .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                            .attr("text-anchor", "start")
                            .attr("dominant-baseline", "middle")
                            .text(`${new Date(d.date).getFullYear()} ${d.date_type}`);
                        // Wrap title text for mobile
                        const title = d.title;
                        const words = title.split(' ');
                        const lines = [];
                        let currentLine = words[0] || '';
                        for (let i = 1; i < words.length; i++) {
                            const testLine = currentLine + ' ' + words[i];
                            // Use a temp SVG text to measure width
                            const tempSvg = d3.select(document.body).append("svg").attr("style", "position:absolute;left:-9999px;top:-9999px;");
                            const tempText = tempSvg.append("text")
                                .attr("font-size", 18)
                                .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                                .text(testLine);
                            const width = tempText.node().getComputedTextLength();
                            tempSvg.remove();
                            if (width > maxTextWidth) {
                                lines.push(currentLine);
                                currentLine = words[i];
                            } else {
                                currentLine = testLine;
                            }
                        }
                        lines.push(currentLine);
                        lines.forEach((line, idx) => {
                            g.append("text")
                                .attr("y", 14 + idx * 20)
                                .attr("fill", "white")
                                .attr("font-size", 18)
                                .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                                .attr("font-weight", "bold")
                                .attr("text-anchor", "start")
                                .attr("dominant-baseline", "middle")
                                .text(line);
                        });
                    } else {
                        g.append("text")
                            .attr("y", 5)
                            .attr("fill", "white")
                            .attr("font-size", 16)
                            .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                            .attr("text-anchor", "start")
                            .attr("dominant-baseline", "middle")
                            .text(truncateText(`${new Date(d.date).getFullYear()} ${d.date_type} – ${d.title}`, maxTextWidth));
                    }
                });
    }}, [renderData, zoomLevel, filteredEvents, selectedTags, selectedBooks, selectedRegions]); // End of useEffect for D3 rendering

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
            const regionsArr = form.regions.split(",").map(r => r.trim()).filter(Boolean);
            const countriesArr = form.countries.split(",").map(r => r.trim()).filter(Boolean);
            const response = await fetch(`${apiUrl}/events`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify({
                    ...form,
                    date: paddedYear ? `${paddedYear}-01-01` : undefined,
                    tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
                    regions: regionsArr,
                    countries: countriesArr
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to add event");
            setForm({ title: "", description: "", book_reference: "", year: "", tags: "", date_type: "CE", regions: "", countries: "" });
            setShowForm(false); // Close the modal after successful creation
            // Refetch events
            const eventsRes = await fetch(`${apiUrl}/events`);
            const newEvents = await eventsRes.json();
            const sortedEvents = sortEvents(newEvents);
            // Immediately select the new event for editing
            setTimeout(() => {
                if (!timelineContainerRef.current) return;
                const newEventIdx = sortedEvents.findIndex(ev =>
                    ev.title === form.title &&
                    new Date(ev.date).getFullYear().toString() === paddedYear &&
                    ev.book_reference === form.book_reference
                );
                if (newEventIdx >= 0) {
                    setSelectedEvent(sortedEvents[newEventIdx]);
                    const isMobile = window.innerWidth < 640;
                    const itemHeight = isMobile ? 80 : 100;
                    timelineContainerRef.current.scrollTo({
                        top: Math.max(0, (itemHeight * newEventIdx) - 40),
                        behavior: 'smooth'
                    });
                }
            }, 400); // Wait for re-render
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
            regions: selectedEvent.regions ? selectedEvent.regions.join(", ") : '',
            countries: selectedEvent.countries ? selectedEvent.countries.join(", ") : '',
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
            const regionsArr = editForm.regions.split(",").map(r => r.trim()).filter(Boolean);
            const countriesArr = editForm.countries.split(",").map(r => r.trim()).filter(Boolean);
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
                    regions: regionsArr,
                    countries: countriesArr,
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to update event");
            setEditMode(false);
            setSelectedEvent(null);
        } catch (err) {
            setEditError(err.message);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            console.log('Deleting event:', selectedEvent.id);
            const response = await fetch(`${apiUrl}/events/${selectedEvent.id}`, {
                method: "DELETE",
                headers: {
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                }
            });
            console.log('Delete event response:', response);
            if (!response.ok) throw new Error("Failed to delete event");
            setSelectedEvent(null);
        } catch (err) {
            console.error('Error deleting event:', err);
            alert(err.message);
        }
    };

    // Center the entire page content
    const isAllowed = user && allowedEmails.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    // State for filter modal
    const [showFilters, setShowFilters] = useState(false);
    // Add a ref for the scrollable timeline container
    const timelineContainerRef = useRef();

    useEffect(() => {
        if (showForm) setError("");
    }, [showForm]);

    useEffect(() => {
        // Reset edit mode when a new event is selected
        setEditMode(false);
    }, [selectedEvent]);

    // State for Delete Tags modal
    const [removalSelectedTags, setRemovalSelectedTags] = useState([]);
    const [removalLoading, setRemovalLoading] = useState(false);
    const [removalError, setRemovalError] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Add loading state for enrichment
    const [regenDescriptionLoading, setRegenDescriptionLoading] = useState(false);
    const [regenTagsLoading, setRegenTagsLoading] = useState(false);
    const [regenRegionsLoading, setRegenRegionsLoading] = useState(false);
    const [showAdminToolsModal, setShowAdminToolsModal] = useState(false);
    const [backfillRegionsLoading, setBackfillRegionsLoading] = useState(false);
    const [backfillRegionsResult, setBackfillRegionsResult] = useState("");

    // Helper to convert year/era to comparable number
    function yearEraToComparable(year, era) {
        if (!year) return null;
        const y = parseInt(year, 10);
        if (isNaN(y)) return null;
        return era === 'BCE' ? -y : y;
    }

    // Define local state for tag, book, and region filters
    const [showTagFilter, setShowTagFilter] = useState(false);
    const [showBookFilter, setShowBookFilter] = useState(false);
    const [showRegionFilter, setShowRegionFilter] = useState(false);
    const [showCountryFilter, setShowCountryFilter] = useState(false);
    // Add countries filter state
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [countrySearchTerm, setCountrySearchTerm] = useState("");

    return (
        <>
            <div className="flex flex-col items-center justify-center text-white text-center relative overflow-x-hidden bg-transparent px-2">
                {/* World Map button at the top of timeline controls */}
                <div className="w-full flex justify-center mb-4 gap-4">
                    <button
                        className={`px-4 py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white ${showMap ? 'bg-blue-700' : 'bg-gray-700 hover:bg-blue-700'}`}
                        onClick={() => setShowMap(true)}
                    >
                        World Map
                    </button>
                    <button
                        className={`px-4 py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white ${!showMap ? 'bg-blue-700' : 'bg-gray-700 hover:bg-blue-700'}`}
                        onClick={() => setShowMap(false)}
                    >
                        Timeline
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
                {/* Loading overlay for events or allowed emails */}
                {(eventsLoading || allowedEmailsLoading) && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
                        <div className="glass p-8 rounded-2xl shadow-xl border border-blue-400 animate-pulse text-lg font-bold text-blue-200">
                            Loading timeline...
                        </div>
                    </div>
                )}
                {/* Error message if both fail (optional) */}
                {(!eventsLoading && eventsError) && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
                        <div className="glass p-8 rounded-2xl shadow-xl border border-pink-400 text-lg font-bold text-pink-200">
                            {eventsError}<br/>Retrying...
                        </div>
                    </div>
                )}
                {/* Admin Tools Modal */}
                {isAllowed && showAdminToolsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                        <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => { setShowAdminToolsModal(false); setShowDeleteConfirm(false); }} />
                        <div className="relative glass p-8 rounded-2xl shadow-2xl border border-blue-400 w-full max-w-lg z-60 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#00c6ff33] to-[#ff512f33] backdrop-blur-lg">
                            <button
                                className="absolute top-3 right-3 text-2xl text-blue-300 hover:text-pink-400 focus:outline-none"
                                onClick={() => { setShowAdminToolsModal(false); setShowDeleteConfirm(false); }}
                                aria-label="Close admin tools modal"
                            >
                                &times;
                            </button>
                            <h2 className="text-2xl font-bold mb-4 text-blue-300">Admin Tools</h2>
                            {/* Delete Tags Section */}
                            <div className="w-full mb-8">
                                <h3 className="text-lg font-semibold text-red-300 mb-2">Delete Tags</h3>
                                <div className="mb-4 w-full flex flex-col items-center max-h-40 overflow-y-auto">
                                    {getAllTags(filteredEvents).length === 0 && <div className="text-gray-400">No tags available.</div>}
                                    {getAllTags(filteredEvents).map(tag => (
                                        <label key={tag} className="flex items-center gap-2 mb-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={removalSelectedTags.includes(tag)}
                                                onChange={e => {
                                                    setRemovalSelectedTags(sel => e.target.checked ? [...sel, tag] : sel.filter(t => t !== tag));
                                                }}
                                            />
                                            <span>{tag}</span>
                                        </label>
                                    ))}
                                </div>
                                {removalError && <div className="text-red-400 mb-2">{removalError}</div>}
                                <button
                                    className="mt-2 px-4 py-2 rounded bg-red-700 text-white font-bold hover:bg-red-800 border border-red-300 shadow disabled:opacity-50"
                                    disabled={removalSelectedTags.length === 0 || removalLoading}
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Selected ({removalSelectedTags.length})
                                </button>
                            </div>
                            {/* Confirm Delete Modal (inside admin tools modal) */}
                            {showDeleteConfirm && (
                                <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                                    <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowDeleteConfirm(false)} />
                                    <div className="relative glass p-6 rounded-2xl shadow-2xl border border-red-400 w-full max-w-sm z-70 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#ff512f33] to-[#ff512f33] backdrop-blur-lg">
                                        <h3 className="text-lg font-bold mb-2 text-red-300">Confirm Delete</h3>
                                        <div className="mb-4 text-center text-red-200">
                                            Are you sure you want to delete these tags?
                                            <ul className="mt-2 mb-2 text-red-300 font-bold">
                                                {removalSelectedTags.map(tag => (
                                                    <li key={tag}>{tag}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {removalError && <div className="text-red-400 mb-2">{removalError}</div>}
                                        <div className="flex gap-4 mt-2">
                                            <button
                                                className="px-4 py-2 rounded bg-gray-600 text-white font-bold border border-gray-300 shadow"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                disabled={removalLoading}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="px-4 py-2 rounded bg-red-700 text-white font-bold hover:bg-red-800 border border-red-300 shadow disabled:opacity-50"
                                                disabled={removalLoading}
                                                onClick={async () => {
                                                    setRemovalLoading(true);
                                                    setRemovalError("");
                                                    try {
                                                        for (const tag of removalSelectedTags) {
                                                            const response = await fetch(`${apiUrl}/events/remove-tag`, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Content-Type": "application/json",
                                                                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                                                                },
                                                                body: JSON.stringify({ tag })
                                                            });
                                                            if (!response.ok) throw new Error(`Failed to delete tag: ${tag}`);
                                                        }
                                                        // Refetch events
                                                        const eventsRes = await fetch(`${apiUrl}/events`);
                                                        const newEvents = await eventsRes.json();
                                                        setShowDeleteConfirm(false);
                                                        setShowAdminToolsModal(false);
                                                    } catch (err) {
                                                        setRemovalError(err.message);
                                                    } finally {
                                                        setRemovalLoading(false);
                                                    }
                                                }}
                                            >
                                                {removalLoading ? "Deleting..." : "Confirm Delete"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <hr className="my-6 border-blue-400/40" />
                            <h3 className="text-lg font-semibold text-blue-300 mb-2">Regions Backfill</h3>
                            <button
                                className="px-4 py-2 rounded bg-blue-700 text-white font-bold hover:bg-blue-800 border border-blue-300 shadow disabled:opacity-50"
                                disabled={backfillRegionsLoading}
                                onClick={async () => {
                                    setBackfillRegionsLoading(true);
                                    setBackfillRegionsResult("");
                                    try {
                                        const response = await fetch(`${apiUrl}/events/backfill-regions`, {
                                            method: "POST",
                                            headers: {
                                                ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                                            }
                                        });
                                        const data = await response.json();
                                        if (response.ok) {
                                            setBackfillRegionsResult(`Regions generated for ${data.updated} events.`);
                                            // Refetch events to update UI
                                            const eventsRes = await fetch(`${apiUrl}/events`);
                                            const newEvents = await eventsRes.json();
                                            setShowDeleteConfirm(false);
                                            setShowAdminToolsModal(false);
                                        } else {
                                            setBackfillRegionsResult(data.error || "Failed to backfill regions.");
                                        }
                                    } catch (err) {
                                        setBackfillRegionsResult("Failed to backfill regions.");
                                    } finally {
                                        setBackfillRegionsLoading(false);
                                    }
                                }}
                            >
                                {backfillRegionsLoading ? "Generating..." : "Regenerate All Regions and Countries"}
                            </button>
                            {backfillRegionsResult && (
                                <div className="mt-2 text-blue-200 text-sm">{backfillRegionsResult}</div>
                            )}
                        </div>
                    </div>
                )}
                {/* Add Event and Filters Button (in a single row) */}
                <div className="w-full flex flex-wrap justify-center z-10 mb-4 gap-3 flex-row items-center">
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
                        className="flex items-center gap-1 px-2 py-1 text-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-base rounded bg-gray-800/80 text-white border border-blue-400 hover:bg-blue-600 transition shadow-md"
                        onClick={() => setShowFilters(true)}
                        aria-label="Show filters"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-16.5 6.75h15m-13.5 6.75h12" />
                        </svg>
                        Filters
                    </button>
                </div>
                {/* Event count display */}
                <div className="w-full flex justify-center mb-2">
                    <span className="inline-block bg-gray-900/80 text-blue-200 rounded-full px-4 py-1 text-xs sm:text-sm font-semibold border border-blue-400 shadow">
                        {zoomLevel === 0
                            ? `${renderData.length} event${renderData.length !== 1 ? 's' : ''} shown`
                            : `${renderData.length} group${renderData.length !== 1 ? 's' : ''} shown (${renderData.reduce((sum, g) => sum + (g.events ? g.events.length : 0), 0)} events)`
                        }
                    </span>
                </div>

                {/* Add Event Modal */}
                {showForm && isAllowed && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                        {/* Modal overlay */}
                        <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
                        {/* Modal content */}
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
                            {/* Error at the top */}
                            {error && <div className="text-red-400 mb-4 text-center w-full max-w-md mx-auto font-semibold">{error}</div>}
                            {/* Scrollable form wrapper */}
                            <div style={{width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)'}}>
                                <form onSubmit={handleFormSubmit} className="w-full flex flex-col gap-8 items-center">
                                    <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Add New Event</h2>
                                    <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                        <label className="font-semibold text-blue-200" htmlFor="title">Title</label>
                                        <input id="title" name="title" value={form.title} onChange={handleFormChange} required placeholder="Title" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                    </div>
                                    <div className="flex flex-row gap-4 w-full max-w-md mx-auto">
                                        <div className="flex flex-col gap-2 text-left w-1/2">
                                            <label className="font-semibold text-blue-200" htmlFor="year">Year</label>
                                            <input id="year" name="year" value={form.year} onChange={handleFormChange} required placeholder="Year (e.g. 1776)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" maxLength={4} />
                                        </div>
                                        <div className="flex flex-col gap-2 text-left w-1/2">
                                            <label className="font-semibold text-blue-200" htmlFor="date_type">Date Type</label>
                                            <select id="date_type" name="date_type" value={form.date_type} onChange={handleFormChange} className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner">
                                                <option value="BCE">BCE</option>
                                                <option value="CE">CE</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                        <label className="font-semibold text-blue-200" htmlFor="book_reference">Book</label>
                                        <input id="book_reference" name="book_reference" value={form.book_reference} onChange={handleFormChange} placeholder="Book" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                    </div>
                                    <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                        <label className="font-semibold text-blue-200" htmlFor="regions">Regions</label>
                                        <input id="regions" name="regions" value={form.regions} onChange={handleFormChange} placeholder="Regions (comma separated, e.g. europe, east asia)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                    </div>
                                    <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                        <label className="font-semibold text-blue-200" htmlFor="countries">Countries</label>
                                        <input id="countries" name="countries" value={form.countries} onChange={handleFormChange} placeholder="Countries (comma separated, e.g. france, germany)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                    </div>
                                    <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-3 rounded-xl mt-2 font-bold text-white shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed glow text-base w-full max-w-md mx-auto tracking-wide">
                                        {submitting ? "Adding..." : "Add Event"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters Modal/Popover */}
                {showFilters && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                        {/* Modal overlay */}
                        <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowFilters(false)} />
                        {/* Modal content */}
                        <div
                            className="relative glass p-8 rounded-2xl shadow-2xl border border-blue-400 w-full max-w-md z-60 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#00c6ff33] to-[#ff512f33] backdrop-blur-lg overflow-y-auto"
                            style={{
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                margin: '4rem 1rem 1rem 1rem',
                                boxSizing: 'border-box',
                            }}
                        >
                            <button
                                className="absolute top-3 right-3 text-2xl text-blue-300 hover:text-pink-400 focus:outline-none"
                                onClick={() => setShowFilters(false)}
                                aria-label="Close filters"
                            >
                                &times;
                            </button>
                            <h2 className="text-xl font-bold mb-4 text-blue-300">Filters</h2>
                            {/* Search Bar */}
                            <input
                                type="text"
                                placeholder="Search anything..."
                                className="mb-4 p-3 w-64 rounded-xl bg-gray-800/80 text-white text-center border border-blue-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300 shadow-md"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {/* Date Range Filter */}
                            <div className="mb-4 w-full flex flex-col items-center">
                                <h3 className="text-lg font-semibold text-blue-200 mb-2">Date Filter</h3>
                                <div className="flex flex-wrap justify-center gap-4 z-10">
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
                                </div>
                            </div>
                            {/* Filter by Tag */}
                            <div className="mb-4 w-full flex flex-col items-center">
                              <div className="w-full flex justify-between items-center">
                                <button className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400" onClick={() => setShowTagFilter(v => !v)}>
                                  <span>Filter by Tag</span>
                                  <span>{showTagFilter ? '▲' : '▼'}</span>
                                </button>
                                {selectedTags.length > 0 && (
                                  <button className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={() => setSelectedTags([])}>Clear</button>
                                )}
                              </div>
                              {showTagFilter && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Search tags..."
                                    className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                                    value={tagSearchTerm}
                                    onChange={e => setTagSearchTerm(e.target.value)}
                                  />
                                  <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                                    {getAllTags(allEvents)
                                      .filter(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
                                      .map((tag) => {
                                        const isSelected = selectedTags.includes(tag);
                                        const color = isSelected ? colorPalette[selectedTags.indexOf(tag) % colorPalette.length] : '#2563eb';
                                        return (
                                          <button
                                            key={tag}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: color, border: isSelected ? `2px solid ${color}` : undefined }}
                                            onClick={() => setSelectedTags(tags => tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])}
                                          >
                                            {tag}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Filter by Book */}
                            <div className="mb-4 w-full flex flex-col items-center">
                              <div className="w-full flex justify-between items-center">
                                <button className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400" onClick={() => setShowBookFilter(v => !v)}>
                                  <span>Filter by Book</span>
                                  <span>{showBookFilter ? '▲' : '▼'}</span>
                                </button>
                                {selectedBooks.length > 0 && (
                                  <button className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={() => setSelectedBooks([])}>Clear</button>
                                )}
                              </div>
                              {showBookFilter && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Search books..."
                                    className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                                    value={bookSearchTerm}
                                    onChange={e => setBookSearchTerm(e.target.value)}
                                  />
                                  <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                                    {getAllBooks(allEvents)
                                      .filter(book => book.toLowerCase().includes(bookSearchTerm.toLowerCase()))
                                      .map((book) => {
                                        const isSelected = selectedBooks.includes(book);
                                        const color = isSelected ? colorPalette[selectedBooks.indexOf(book) % colorPalette.length] : '#2563eb';
                                        return (
                                          <button
                                            key={book}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: color, border: isSelected ? `2px solid ${color}` : undefined }}
                                            onClick={() => setSelectedBooks(books => books.includes(book) ? books.filter(b => b !== book) : [...books, book])}
                                          >
                                            {book}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Filter by Region */}
                            <div className="mb-4 w-full flex flex-col items-center">
                              <div className="w-full flex justify-between items-center">
                                <button className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400" onClick={() => setShowRegionFilter(v => !v)}>
                                  <span>Filter by Region</span>
                                  <span>{showRegionFilter ? '▲' : '▼'}</span>
                                </button>
                                {selectedRegions.length > 0 && (
                                  <button className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={() => setSelectedRegions([])}>Clear</button>
                                )}
                              </div>
                              {showRegionFilter && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Search regions..."
                                    className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                                    value={regionSearchTerm}
                                    onChange={e => setRegionSearchTerm(e.target.value)}
                                  />
                                  <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                                    {getAllRegions(allEvents)
                                      .filter(region => region.toLowerCase().includes(regionSearchTerm.toLowerCase()))
                                      .map((region) => {
                                        const isSelected = selectedRegions.includes(region);
                                        const color = isSelected ? colorPalette[selectedRegions.indexOf(region) % colorPalette.length] : '#2563eb';
                                        return (
                                          <button
                                            key={region}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: color, border: isSelected ? `2px solid ${color}` : undefined }}
                                            onClick={() => setSelectedRegions(regions => regions.includes(region) ? regions.filter(r => r !== region) : [...regions, region])}
                                          >
                                            {region}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Filter by Country */}
                            <div className="mb-4 w-full flex flex-col items-center">
                              <div className="w-full flex justify-between items-center">
                                <button className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400" onClick={() => setShowCountryFilter(v => !v)}>
                                  <span>Filter by Country</span>
                                  <span>{showCountryFilter ? '▲' : '▼'}</span>
                                </button>
                                {selectedCountries.length > 0 && (
                                  <button className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={() => setSelectedCountries([])}>Clear</button>
                                )}
                              </div>
                              {showCountryFilter && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Search countries..."
                                    className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                                    value={countrySearchTerm}
                                    onChange={e => setCountrySearchTerm(e.target.value)}
                                  />
                                  <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                                    {getAllCountries(allEvents)
                                      .filter(country => country.toLowerCase().includes(countrySearchTerm.toLowerCase()))
                                      .map((country) => {
                                        const isSelected = selectedCountries.includes(country);
                                        const color = isSelected ? colorPalette[selectedCountries.indexOf(country) % colorPalette.length] : '#2563eb';
                                        return (
                                          <button
                                            key={country}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: color, border: isSelected ? `2px solid ${color}` : undefined }}
                                            onClick={() => setSelectedCountries(countries => countries.includes(country) ? countries.filter(c => c !== country) : [...countries, country])}
                                          >
                                            {country}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Move Clear button to bottom and clear all filters */}
                            <button
                                className="mt-8 px-6 py-2 rounded bg-gray-700 text-white border border-blue-400 hover:bg-blue-600 transition w-full"
                                onClick={() => {
                                    setDateFilter({ startYear: '', startEra: 'BCE', endYear: '', endEra: 'CE' });
                                    setSearchTerm('');
                                    setSelectedTags([]);
                                    setSelectedBooks([]);
                                    setSelectedRegions([]);
                                    setSelectedCountries([]);
                                    setTagSearchTerm('');
                                    setBookSearchTerm('');
                                    setRegionSearchTerm('');
                                    setCountrySearchTerm('');
                                    setTagOverlapOnly(false);
                                }}
                                type="button"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Scrollable timeline container */}
                <div
                    ref={timelineContainerRef}
                    style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '2rem' }}
                    className="timeline-scroll w-full max-w-4xl mx-auto rounded-2xl shadow-2xl bg-gray-800/80 overflow-x-auto sm:overflow-x-visible"
                >
                    <svg ref={svgRef} className="timeline-svg w-full min-w-[340px] sm:min-w-0" />
                </div>

                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ marginTop: '6rem' }}>
                        {/* Modal overlay */}
                        <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => { setSelectedEvent(null); setEditMode(false); }} />
                        {/* Modal content */}
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
                                className="absolute top-4 right-4 text-3xl text-blue-200 hover:text-pink-400 focus:outline-none transition-colors duration-200"
                                onClick={() => { setSelectedEvent(null); setEditMode(false); }}
                                aria-label="Close modal"
                            >
                                &times;
                            </button>
                                                       {/* Scrollable content wrapper for mobile */}
                            <div style={{ width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)' }}>
                                {/* Edit mode toggle */}
                                {editMode ? (
                                    <div style={{width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)'}}>
                                        <form onSubmit={handleEditSubmit} className="w-full flex flex-col gap-8 items-center">
                                            {/* Error at the top */}
                                                                                       {editError && <div className="text-red-400 mb-4 text-center w-full max-w-md mx-auto font-semibold">{editError}</div>}
                                            <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Edit Event</h2>
                                            <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                                                                               <label className="font-semibold text-blue-200" htmlFor="edit-title">Title</label>
                                                <input id="edit-title" name="title" value={editForm.title} onChange={handleEditChange} required placeholder="Title" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                            </div>
                                            <div className="flex flex-row gap-4 w-full max-w-md mx-auto">
                                                <div className="flex flex-col gap-2 text-left w-1/2">
                                                    <label className="font-semibold text-blue-200" htmlFor="edit-year">Year</label>
                                                    <input id="edit-year" name="year" value={editForm.year} onChange={handleEditChange} required placeholder="Year (e.g. 1776)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" maxLength={4} />
                                                </div>
                                                <div className="flex flex-col gap-2 text-left w-1/2">
                                                    <label className="font-semibold text-blue-200" htmlFor="edit-date_type">Date Type</label>
                                                    <select id="edit-date_type" name="date_type" value={editForm.date_type} onChange={handleEditChange} className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner">
                                                        <option value="BCE">BCE</option>
                                                        <option value="CE">CE</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex flexcol gap-2 text-left w-full max-w-md mx-auto">
                                                <label className="font-semibold text-blue-200" htmlFor="edit-book_reference">Book</label>
                                                <input id="edit-book_reference" name="book_reference" value={editForm.book_reference} onChange={handleEditChange} placeholder="Book" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                            </div>
                                            <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                                                                               <label className="font-semibold text-blue-200" htmlFor="edit-description">Description</label>
                                                <textarea id="edit-description" name="description" value={editForm.description} onChange={handleEditChange} placeholder="Description" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner min-h-[80px] resize-vertical placeholder:text-gray-400" />
                                                <button
                                                    type="button"
                                                    className="mt-2 px-3 py-1 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 border border-blue-300 shadow self-end disabled:opacity-60 disabled:cursor-not-allowed"
                                                    disabled={regenDescriptionLoading}
                                                    onClick={async () => {
                                                        setEditError("");
                                                        setRegenDescriptionLoading(true);
                                                                                                               try {
                                                            const response = await fetch(`${apiUrl}/events/enrich-description`, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Content-Type": "application/json",
                                                                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                                                                },
                                                                body: JSON.stringify({
                                                                    title: editForm.title,
                                                                    date: editForm.year ? `${editForm.year.padStart(4, "0")}-01-01` : undefined
                                                                })
                                                            });
                                                            const data = await response.json();
                                                            if (data && data.description) {
                                                                setEditForm(f => ({ ...f, description: data.description }));
                                                            } else if (data && data.error) {
                                                                setEditError("Failed to regenerate description: " + data.error);
                                                            } else {
                                                                setEditError("Failed to regenerate description");
                                                            }
                                                        } catch (err) {
                                                            setEditError("Failed to regenerate description");
                                                        } finally {
                                                            setRegenDescriptionLoading(false);
                                                        }
                                                    }}
                                                >
                                                    {regenDescriptionLoading ? "Regenerating..." : "Regenerate Description"}
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                                <label className="font-semibold text-blue-200" htmlFor="edit-tags">Tags</label>
                                                <input id="edit-tags" name="tags" value={editForm.tags} onChange={handleEditChange} placeholder="Tags (comma separated)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                                <button
                                                    type="button"
                                                    className="mt-2 px-3 py-1 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 border border-blue-300 shadow self-end disabled:opacity-60 disabled:cursor-not-allowed"
                                                    disabled={regenTagsLoading}
                                                    onClick={async () => {
                                                        setEditError("");
                                                        setRegenTagsLoading(true);
                                                        try {
                                                            const response = await fetch(`${apiUrl}/events/enrich-tags`, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Content-Type": "application/json",
                                                                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                                                                },
                                                                body: JSON.stringify({
                                                                    title: editForm.title,
                                                                    date: editForm.year ? `${editForm.year.padStart(4, "0")}-01-01` : undefined
                                                                })
                                                            });
                                                            const data = await response.json();
                                                            if (data && data.tags) {
                                                                setEditForm(f => ({ ...f, tags: data.tags.join(", ") }));
                                                            } else if (data && data.error) {
                                                                setEditError("Failed to regenerate tags: " + data.error);
                                                            } else {
                                                                setEditError("Failed to regenerate tags");
                                                            }
                                                        } catch (err) {
                                                            setEditError("Failed to regenerate tags");
                                                        } finally {
                                                            setRegenTagsLoading(false);
                                                        }
                                                    }}
                                                >
                                                    {regenTagsLoading ? "Regenerating..." : "Regenerate Tags"}
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                                <label className="font-semibold text-blue-200" htmlFor="edit-regions">Regions</label>
                                                <input id="edit-regions" name="regions" value={editForm.regions} onChange={handleEditChange} placeholder="Regions (comma separated, e.g. europe, east asia)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                                <button
                                                    type="button"
                                                    className="mt-2 px-3 py-1 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 border border-blue-300 shadow self-end disabled:opacity-60 disabled:cursor-not-allowed"
                                                    disabled={regenRegionsLoading}
                                                    onClick={async () => {
                                                        setEditError("");
                                                        setRegenRegionsLoading(true);
                                                        try {
                                                            const response = await fetch(`${apiUrl}/events/enrich-tags`, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Content-Type": "application/json",
                                                                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                                                                },
                                                                body: JSON.stringify({
                                                                    title: editForm.title,
                                                                    date: editForm.year ? `${editForm.year.padStart(4, "0")}-01-01` : undefined
                                                                })
                                                            });
                                                            const data = await response.json();
                                                            if (data && Array.isArray(data.regions)) {
                                                                setEditForm(f => ({ ...f, regions: data.regions.join(", ") }));
                                                            } else if (data && data.error) {
                                                                setEditError("Failed to regenerate regions: " + data.error);
                                                            } else {
                                                                setEditError("Failed to regenerate regions");
                                                            }
                                                        } catch (err) {
                                                            setEditError("Failed to regenerate regions");
                                                        } finally {
                                                            setRegenRegionsLoading(false);
                                                        }
                                                    }}
                                                >
                                                    {regenRegionsLoading ? "Regenerating..." : "Regenerate Regions"}
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                                                <label className="font-semibold text-blue-200" htmlFor="edit-countries">Countries</label>
                                                <input id="edit-countries" name="countries" value={editForm.countries} onChange={handleEditChange} placeholder="Countries (comma separated, e.g. france, germany)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                                                <button
                                                    type="button"
                                                    className="mt-2 px-3 py-1 rounded bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 border border-blue-300 shadow self-end disabled:opacity-60 disabled:cursor-not-allowed"
                                                    disabled={regenRegionsLoading}
                                                    onClick={async () => {
                                                        setEditError("");
                                                        setRegenRegionsLoading(true);
                                                        try {
                                                            const response = await fetch(`${apiUrl}/events/enrich-tags`, {
                                                                method: "POST",
                                                                headers: {
                                                                    "Content-Type": "application/json",
                                                                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                                                                },
                                                                body: JSON.stringify({
                                                                    title: editForm.title,
                                                                    date: editForm.year ? `${editForm.year.padStart(4, "0")}-01-01` : undefined
                                                                })
                                                            });
                                                            const data = await response.json();
                                                            if (data && Array.isArray(data.countries)) {
                                                                setEditForm(f => ({ ...f, countries: data.countries.join(", ") }));
                                                            } else if (data && data.error) {
                                                                setEditError("Failed to regenerate countries: " + data.error);
                                                            } else {
                                                                setEditError("Failed to regenerate countries");
                                                            }
                                                        } catch (err) {
                                                            setEditError("Failed to regenerate countries");
                                                        } finally {
                                                            setRegenRegionsLoading(false);
                                                        }
                                                    }}
                                                >
                                                    {regenRegionsLoading ? "Regenerating..." : "Regenerate Countries"}
                                                </button>
                                            </div>
                                            <div className="flex gap-2 mt-2 justify-center w-full max-w-md mx-auto">
                                                <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-3 rounded-xl font-bold text-white shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed glow w-1/2">Save</button>
                                                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded-xl font-bold w-1/2" onClick={() => setEditMode(false)}>Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                ) : (
                                    <>
                                        {/* Title */}
                                        <h2 className="text-3xl font-bold text-blue-400 fancy-heading">{selectedEvent.title}</h2>
                                        {/* Year */}
                                        <p className="text-blue-200 mb-2 text-lg">{new Date(selectedEvent.date).getFullYear()} {selectedEvent.date_type}</p>
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
                                        {/* Regions */}
                                        {selectedEvent.regions && selectedEvent.regions.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                <span className="bg-gradient-to-r from-blue-200 to-pink-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 italic shadow">
                                                    <span className="italic font-normal text-gray-700 mr-1">Regions: </span>{selectedEvent.regions.join(", ")}
                                                </span>
                                            </div>
                                        )}
                                        {/* Countries */}
                                        {selectedEvent.countries && selectedEvent.countries.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                <span className="bg-gradient-to-r from-blue-200 to-pink-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 italic shadow">
                                                    <span className="italic font-normal text-gray-700 mr-1">Countries: </span>{selectedEvent.countries.join(", ")}
                                                </span>
                                            </div>
                                        )}
                                        {isAllowed && (
                                            <div className="flex flex-row gap-2 mt-6 justify-center opacity-70 hover:opacity-100 transition-opacity">
                                                <button className="bg-gradient-to-r from-blue-500 to-pink-500 text-white px-4 py-2 rounded glow font-bold shadow transition-all duration-300" onClick={startEditEvent}>Edit</button>
                                                <button className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded font-bold shadow hover:from-red-600 hover:to-pink-700 transition-all duration-300" onClick={handleDeleteEvent}>Delete</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};


export default Timeline;
