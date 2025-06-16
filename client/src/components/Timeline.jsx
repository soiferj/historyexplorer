import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import EventModal from './EventModal';

// Color palette for tags/books (define once for use in both UI and D3)
const colorPalette = [
    '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#818cf8', '#f472b6', '#f59e42', '#10b981', '#6366f1', '#e879f9', '#f43f5e', '#0ea5e9', '#fde047', '#22d3ee'
];

const Timeline = (props) => {
    // Destructure all props
    const {
        user, accessToken, events, allEvents, eventsLoading, eventsError,
        showMap, setShowMap, regionFilter, clearRegionFilter,
        selectedEvent, setSelectedEvent,
        editMode, setEditMode, editForm, setEditForm, editError, setEditError,
        filteredEvents, setFilteredEvents, zoomLevel, setZoomLevel,
        selectedTags, setSelectedTags, selectedBooks, setSelectedBooks,
        selectedRegions, setSelectedRegions, tagSearchTerm, setTagSearchTerm, bookSearchTerm, setBookSearchTerm,
        regionSearchTerm, setRegionSearchTerm, tagOverlapOnly, setTagOverlapOnly, selectedCountries, setSelectedCountries,
        hideControls // <-- add this prop
    } = props;

    const svgRef = useRef();
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
    // Edit mode states
    const [localEditMode, setLocalEditMode] = useState(false);
    const [localEditForm, setLocalEditForm] = useState({ title: '', description: '', book_reference: '', year: '', tags: '', date_type: 'CE', regions: '', countries: '' });
    const [localEditError, setLocalEditError] = useState("");

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
    // const filteredEvents = (() => { ... })(); // <-- REMOVE THIS BLOCK

    // Add these state hooks near the top of the Timeline component, before any usage:
    const [editBookMode, setEditBookMode] = useState("existing");
    const [newBook, setNewBook] = useState("");
    const [editTagMode, setEditTagMode] = useState("existing");
    const [newTag, setNewTag] = useState("");
    const [editRegionMode, setEditRegionMode] = useState("existing");
    const [newRegion, setNewRegion] = useState("");
    const [editCountryMode, setEditCountryMode] = useState("existing");
    const [newCountry, setNewCountry] = useState("");

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
    // Always use the events prop for rendering
    // Ensure events are sorted before any grouping or rendering
    const validEvents = sortEvents(Array.isArray(events) ? events : []);
    let renderData;
    if (zoomLevel === 2) {
        if (regionFilter && selectedRegions.length > 0) {
            renderData = groupEventsByMillennium(validEvents.filter(ev => Array.isArray(ev.regions) && ev.regions.some(region => selectedRegions.includes(region))));
        } else if (selectedTags.length > 0) {
            let tagFiltered = validEvents.filter(ev => Array.isArray(ev.tags) && ev.tags.some(tag => selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())));
            if (tagOverlapOnly && selectedTags.length > 1) {
                tagFiltered = filterTagOverlap(tagFiltered, selectedTags);
            }
            renderData = groupEventsByMillennium(tagFiltered);
        } else if (selectedBooks.length > 0) {
            renderData = groupEventsByMillennium(validEvents.filter(ev => selectedBooks.includes(ev.book_reference)));
        } else {
            renderData = groupEventsByMillennium(validEvents);
        }
    } else if (zoomLevel === 1) {
        if (regionFilter && selectedRegions.length > 0) {
            renderData = groupEventsByCentury(validEvents.filter(ev => Array.isArray(ev.regions) && ev.regions.some(region => selectedRegions.includes(region))));
        } else if (selectedTags.length > 0) {
            let tagFiltered = validEvents.filter(ev => Array.isArray(ev.tags) && ev.tags.some(tag => selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase())));
            if (tagOverlapOnly && selectedTags.length > 1) {
                tagFiltered = filterTagOverlap(tagFiltered, selectedTags);
            }
            renderData = groupEventsByCentury(tagFiltered);
        } else if (selectedBooks.length > 0) {
            renderData = groupEventsByCentury(validEvents.filter(ev => selectedBooks.includes(ev.book_reference)));
        } else {
            renderData = groupEventsByCentury(validEvents);
        }
    } else {
        renderData = validEvents;
    }

    // D3 rendering effect, depends on filteredEvents
    const [timelineSize, setTimelineSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        function handleResize() {
            setTimelineSize({ width: window.innerWidth, height: window.innerHeight });
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        svg.attr("width", svgWidth)
           .attr("height", svgHeight);

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
                    if (typeof setEditMode === 'function') setEditMode(false);
                    setSelectedEvent(d);
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
                        const idx = validEvents.findIndex(ev => ev === firstEvent);
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
                        const idx = validEvents.findIndex(ev => ev === firstEvent);
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
                        const idx = validEvents.findIndex(ev => ev === firstEvent);
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

            // Build global filter color map (same as legend)
            const filterTypes = [
                { type: 'Tag', values: selectedTags || [] },
                { type: 'Book', values: selectedBooks || [] },
                { type: 'Region', values: selectedRegions || [] },
                { type: 'Country', values: selectedCountries || [] },
            ];
            const allFilters = filterTypes.flatMap(ft => ft.values.map(v => ({ type: ft.type, value: v })));
            const colorPalette = [
                '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#818cf8', '#f472b6', '#f59e42', '#10b981', '#6366f1', '#e879f9', '#f43f5e', '#0ea5e9', '#fde047', '#22d3ee'
            ];
            // Map filter value (case-insensitive for tags/regions/countries) to color
            const colorMap = {};
            allFilters.forEach((f, idx) => {
                let key = f.value;
                if (['Tag', 'Region', 'Country'].includes(f.type)) key = key.toLowerCase();
                colorMap[`${f.type}:${key}`] = colorPalette[idx % colorPalette.length];
            });

            // Multi-filter (multi-segment) circle rendering
            // Build all matching filters for each event, in the same order as allFilters
            if ((selectedTags.length + selectedBooks.length + selectedRegions.length + selectedCountries.length) > 1) {
                svg.selectAll("g.event-multitag").remove();
                svg.selectAll("g.event-multitag")
                    .data(renderData)
                    .enter()
                    .append("g")
                    .attr("class", "event-multitag")
                    .attr("transform", (d, i) => `translate(${timelineX},${yScale(i)})`)
                    .each(function (d, i) {
                        const g = d3.select(this);
                        // Find all matching filters for this event, in allFilters order
                        let matchingFilters = allFilters.filter(f => {
                            if (f.type === 'Tag' && Array.isArray(d.tags)) return d.tags.some(tag => tag.toLowerCase() === f.value.toLowerCase());
                            if (f.type === 'Book' && d.book_reference) return d.book_reference === f.value;
                            if (f.type === 'Region' && Array.isArray(d.regions)) return d.regions.some(region => region.toLowerCase() === f.value.toLowerCase());
                            if (f.type === 'Country' && Array.isArray(d.countries)) return d.countries.some(country => country.toLowerCase() === f.value.toLowerCase());
                            return false;
                        });
                        if (matchingFilters.length === 0) matchingFilters = [null];
                        const r = isMobile ? 10 : 14;
                        const arc = d3.arc().innerRadius(0).outerRadius(r);
                        const n = matchingFilters.length;
                        matchingFilters.forEach((filt, idx) => {
                            const startAngle = (2 * Math.PI * idx) / n;
                            const endAngle = (2 * Math.PI * (idx + 1)) / n;
                            let color = '#3B82F6';
                            if (filt) {
                                let key = filt.value;
                                if (["Tag", "Region", "Country"].includes(filt.type)) key = key.toLowerCase();
                                color = colorMap[`${filt.type}:${key}`] || color;
                            }
                            g.append("path")
                                .attr("d", arc({ startAngle, endAngle }))
                                .attr("fill", color)
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
                            .on("click", (event) => {
                                if (typeof setEditMode === 'function') setEditMode(false);
                                setSelectedEvent(d);
                            });
                    });
            } else {
                // Multi-tag circle rendering (only if multiple tags and no other filters)
                if (selectedTags.length > 1) {
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
                                    .attr("fill", tag ? colorMap['Tag:' + lower] || "#3B82F6" : "#3B82F6")
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
                                .on("click", (event) => {
                                    if (typeof setEditMode === 'function') setEditMode(false);
                                    setSelectedEvent(d);
                                });
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
                            // Priority: tag, book, region, country (first match)
                            if (selectedTags.length > 0 && Array.isArray(d.tags)) {
                                const match = d.tags.find(tag => selectedTags.some(sel => sel.toLowerCase() === tag.toLowerCase()));
                                if (match) return colorMap[`Tag:${match.toLowerCase()}`] || "#3B82F6";
                            }
                            if (selectedBooks.length > 0 && d.book_reference) {
                                if (selectedBooks.includes(d.book_reference)) return colorMap[`Book:${d.book_reference}`] || "#3B82F6";
                            }
                            if (selectedRegions.length > 0 && Array.isArray(d.regions)) {
                                const match = d.regions.find(region => selectedRegions.some(sel => sel.toLowerCase() === region.toLowerCase()));
                                if (match) return colorMap[`Region:${match.toLowerCase()}`] || "#3B82F6";
                            }
                            if (selectedCountries.length > 0 && Array.isArray(d.countries)) {
                                const match = d.countries.find(country => selectedCountries.some(sel => sel.toLowerCase() === country.toLowerCase()));
                                if (match) return colorMap[`Country:${match.toLowerCase()}`] || "#3B82F6";
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
                        .on("click", (event, d) => {
                            if (typeof setEditMode === 'function') setEditMode(false);
                            setSelectedEvent(d);
                        })
                        .style("opacity", 0)
                        .transition()
                        .duration(500)
                        .style("opacity", 1);
                }
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
                .on("click", (event, d) => {
                    if (typeof setEditMode === 'function') setEditMode(false);
                    setSelectedEvent(d);
                }) // Make the whole label group clickable
                .each(function (d) {
                    const g = d3.select(this);
                    if (isMobile) {
                        g.append("text")
                            .attr("y", -10)
                            .attr("fill", "#93c5fd")
                            .attr("font-size", 13)
                            .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
                            .attr("text-anchor", "start")
                            .attr("dominant-baseline", "middle")
                            .text(`${new Date(d.date).getFullYear()} ${d.date_type}`);
                        // Improved word wrapping for mobile, smaller font, unlimited lines, bigger right margin
                        const title = d.title;
                        const words = title.split(' ');
                        const lines = [];
                        let currentLine = words[0] || '';
                        const fontSize = 13;
                        const fontFamily = 'Orbitron, Segoe UI, Arial, sans-serif';
                        // Use a much smaller maxTextWidth for margin (e.g. 80px instead of 40)
                        const wrapWidth = maxTextWidth - 80;
                        for (let i = 1; i < words.length; i++) {
                            const testLine = currentLine + ' ' + words[i];
                            const tempSvg = d3.select(document.body).append("svg").attr("style", "position:absolute;left:-9999px;top:-9999px;");
                            const tempText = tempSvg.append("text")
                                .attr("font-size", fontSize)
                                .attr("font-family", fontFamily)
                                .text(testLine);
                            const width = tempText.node().getComputedTextLength();
                            tempSvg.remove();
                            if (width > wrapWidth) {
                                lines.push(currentLine);
                                currentLine = words[i];
                            } else {
                                currentLine = testLine;
                            }
                        }
                        if (currentLine) lines.push(currentLine);
                        lines.forEach((line, idx) => {
                            g.append("text")
                                .attr("y", 8 + idx * 15)
                                .attr("fill", "white")
                                .attr("font-size", fontSize)
                                .attr("font-family", "Orbitron, Segoe UI, Arial, sans-serif")
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
                            // Split label: year/date_type (less prominent), title (more prominent)
                            .html(function(d) {
                                const year = new Date(d.date).getFullYear();
                                const dateType = d.date_type;
                                const title = d.title;
                                // Use tspan for styling
                                return `<tspan class='event-year' style='font-size:13px; fill:#ccc;'>${year} ${dateType} – </tspan><tspan class='event-title' style='font-size:18px; font-weight:bold; fill:white;'>${truncateText(title, maxTextWidth)}</tspan>`;
                            });
                    }
                });
    }}, [renderData, zoomLevel, filteredEvents, selectedTags, selectedBooks, selectedRegions, setZoomLevel, timelineSize]); // added setZoomLevel to deps

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
            if (props.onEventsUpdated) props.onEventsUpdated();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const startEditEvent = () => {
        if (!selectedEvent) return;
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
        if (typeof setEditMode === 'function') setEditMode(true);
        setLocalEditError("");
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setLocalEditForm(f => ({ ...f, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setLocalEditError("");
        try {
            const paddedYear = padYear(localEditForm.year);
            const tagsArr = Array.isArray(localEditForm.tags) ? localEditForm.tags : (localEditForm.tags ? localEditForm.tags.split(/,\s*/) : []);
            const regionsArr = Array.isArray(localEditForm.regions) ? localEditForm.regions : (localEditForm.regions ? localEditForm.regions.split(/,\s*/) : []);
            const countriesArr = Array.isArray(localEditForm.countries) ? localEditForm.countries : (localEditForm.countries ? localEditForm.countries.split(/,\s*/) : []);
            const response = await fetch(`${apiUrl}/events/${selectedEvent.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify({
                    ...localEditForm,
                    date: paddedYear ? `${paddedYear}-01-01` : undefined,
                    tags: tagsArr,
                    regions: regionsArr,
                    countries: countriesArr,
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to update event");
            setEditMode(false);
            setSelectedEvent(null);
            if (props.onEventsUpdated) props.onEventsUpdated();
        } catch (err) {
            setLocalEditError(err.message);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        try {
            const response = await fetch(`${apiUrl}/events/${selectedEvent._id || selectedEvent.id}`, {
                method: "DELETE",
                headers: {
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                }
            });
            if (!response.ok) throw new Error("Failed to delete event");
            setSelectedEvent(null);
            setShowEventModal(false); // Ensure modal closes after delete
            // Refetch events and update timeline
            const eventsRes = await fetch(`${apiUrl}/events`);
            const newEvents = await eventsRes.json();
            const sortedEvents = sortEvents(newEvents);
            if (props.onEventsUpdated) props.onEventsUpdated(sortedEvents);
            // If you use setFilteredEvents, update it as well
            if (setFilteredEvents) setFilteredEvents(sortedEvents);
        } catch (err) {
            alert("Error deleting event: " + (err.message || err));
        }
    };

    // Center the entire page content
    const isAllowed = user && allowedEmails.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    // State for filter modal
    const [showFilters, setShowFilters] = useState(false);
    // Add a ref for the scrollable timeline container
    const timelineContainerRef = useRef();

    // State for Delete Tags modal
    const [removalSelectedTags, setRemovalSelectedTags] = useState([]);
    const [removalLoading, setRemovalLoading] = useState(false);
    const [removalError, setRemovalError] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Add loading state for enrichment
    const [regenDescriptionLoading, setRegenDescriptionLoading] = useState(false);
    const [regenTagsLoading, setRegenTagsLoading] = useState(false);
    const [regenRegionsLoading, setRegenRegionsLoading] = useState(false);
    const [regenCountriesLoading, setRegenCountriesLoading] = useState(false);
    const [showAdminToolsModal, setShowAdminToolsModal] = useState(false);
    const [backfillRegionsLoading, setBackfillRegionsLoading] = useState(false);
    const [backfillRegionsResult, setBackfillRegionsResult] = useState("");
    const [showBackfillRegionsModal, setShowBackfillRegionsModal] = useState(false);

    // AI-generated summary state
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState("");
    const [summaryError, setSummaryError] = useState("");
    const [showSummaryModal, setShowSummaryModal] = useState(false); // NEW: controls summary modal
    const [showEnableFilterModal, setShowEnableFilterModal] = useState(false);
    // Track if summary is from cache
    const [summaryCached, setSummaryCached] = useState(false);
    // Track if force regenerate is loading
    const [forceRegenLoading, setForceRegenLoading] = useState(false);

    // Only allow summary if a filter is set
    const summaryAllowed = (
      (Array.isArray(props.selectedTags) && props.selectedTags.filter(Boolean).length > 0) ||
      (Array.isArray(props.selectedBooks) && props.selectedBooks.filter(Boolean).length > 0) ||
      (Array.isArray(props.selectedRegions) && props.selectedRegions.filter(Boolean).length > 0) ||
      (Array.isArray(props.selectedCountries) && props.selectedCountries.filter(Boolean).length > 0) ||
      (typeof props.tagSearchTerm === 'string' && props.tagSearchTerm.trim().length > 0) ||
      (typeof props.bookSearchTerm === 'string' && props.bookSearchTerm.trim().length > 0) ||
      (typeof props.regionSearchTerm === 'string' && props.regionSearchTerm.trim().length > 0) ||
      (Array.isArray(props.searchTerms) && props.searchTerms.some(t => t && t.trim().length > 0))
    );

    // Spinner SVG for loading indication
    const Spinner = () => (
      <svg className="animate-spin inline-block mr-2 text-white" style={{width: '1em', height: '1em', verticalAlign: 'middle'}} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    );

    // Handler to generate summary
    const handleGenerateSummary = async (forceRegenerate = false) => {
      if (!forceRegenerate) setSummaryLoading(true);
      setSummaryError("");
      setSummaryText("");
      setSummaryCached(false);
      if (!forceRegenerate) setShowSummaryModal(true); // Open modal immediately
      try {
        // Only send visible events (renderData or validEvents)
        const eventsToSummarize = Array.isArray(renderData)
          ? (renderData.flatMap(g => g.events ? g.events : g))
          : validEvents;
        // Remove duplicates by id
        const uniqueEvents = Array.from(new Map(eventsToSummarize.map(ev => [ev.id, ev])).values());
        // Only send minimal fields to the server
        const payload = uniqueEvents.map(ev => ({
          title: ev.title,
          date: ev.date,
          description: ev.description,
          tags: ev.tags,
          regions: ev.regions,
          countries: ev.countries
        }));
        const response = await fetch(`${apiUrl}/summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` })
          },
          body: JSON.stringify({ events: payload, forceRegenerate })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate summary");
        setSummaryText(data.summary);
        setSummaryCached(!!data.cached);
      } catch (err) {
        setSummaryError(err.message);
      } finally {
        if (!forceRegenerate) setSummaryLoading(false);
        if (forceRegenerate) setForceRegenLoading(false);
      }
    };

    // Add state for controlling the EventModal visibility
    const [showEventModal, setShowEventModal] = useState(false);

    // When an event is selected, open the modal
    useEffect(() => {
      if (selectedEvent) {
        setShowEventModal(true);
      } else {
        setShowEventModal(false);
      }
    }, [selectedEvent]);

    // Scroll to selected event when modal opens
    useEffect(() => {
      if (!selectedEvent || !timelineContainerRef.current) return;
      // Find the index of the selected event in the current renderData (flat list)
      let idx = -1;
      if (zoomLevel === 0 && Array.isArray(renderData)) {
        idx = renderData.findIndex(ev => ev.id === selectedEvent.id);
      } else if (zoomLevel === 1 || zoomLevel === 2) {
        // For grouped views, find the group and the event index within the group
        let flatIdx = 0;
        for (const group of renderData) {
          if (Array.isArray(group.events)) {
            const eventIdx = group.events.findIndex(ev => ev.id === selectedEvent.id);
            if (eventIdx !== -1) {
              idx = flatIdx + eventIdx;
              break;
            }
            flatIdx += group.events.length;
          }
        }
      }
      if (idx >= 0) {
        const isMobile = window.innerWidth < 640;
        const itemHeight = isMobile ? 80 : 100;
        timelineContainerRef.current.scrollTo({
          top: Math.max(0, (itemHeight * idx) - 40),
          behavior: 'smooth'
        });
      }
    }, [selectedEvent, showEventModal, renderData, zoomLevel]);

    return (
        <>
            <div className="flex flex-col items-center justify-center text-white text-center relative overflow-x-hidden bg-transparent px-2">
                {/* Zoom controls above the timeline */}
                <div className="w-full flex justify-center mb-2 gap-2 items-center">
              {/* Zoom controls above the timeline (commented out for now) */}
              {(
                <>
                  <button
                    className={`px-3 py-1 rounded font-bold shadow border border-blue-400 text-white bg-gray-700 transition-all duration-200 ${zoomLevel === 2 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    onClick={() => setZoomLevel(z => Math.min(2, z + 1))}
                    disabled={zoomLevel === 2}
                    aria-label="Zoom Out"
                  >
                    -
                  </button>
                  <span className="px-2 py-1 text-blue-200 font-semibold select-none">
                    {zoomLevel === 2 ? 'Millennium' : zoomLevel === 1 ? 'Century' : 'Event'}
                  </span>
                  <button
                    className={`px-3 py-1 rounded font-bold shadow border border-blue-400 text-white bg-gray-700 transition-all duration-200 ${zoomLevel === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    onClick={() => setZoomLevel(z => Math.max(0, z - 1))}
                    disabled={zoomLevel === 0}
                    aria-label="Zoom In"
                  >
                    +
                  </button>
                </>
              )}
              {/* AI Summary only for admins */}
              {props.isAllowed && summaryAllowed && (
                <button
                  className="ml-4 px-2 py-1 rounded font-bold shadow transition-all duration-200 border border-pink-400 text-white bg-pink-700 hover:bg-pink-800 text-xs sm:text-sm"
                  onClick={() => {
                    if (!summaryAllowed) {
                      setShowEnableFilterModal(true);
                      return;
                    }
                    handleGenerateSummary();
                  }}
                  disabled={summaryLoading}
                  aria-label="Generate AI Summary"
                  style={{ minWidth: 80 }}
                >
                  {summaryLoading ? <><Spinner /> Generating...</> : "AI Summary"}
                </button>
              )}
            </div>

                {/* AI Timeline Summary Modal */}
                {props.isAllowed && showSummaryModal && (
                  <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ marginTop: '6rem' }}>
                    {/* Modal overlay */}
                    <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => setShowSummaryModal(false)} />
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
                        onClick={() => setShowSummaryModal(false)}
                        aria-label="Close summary modal"
                      >
                        &times;
                      </button>
                      <div style={{ width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)' }}>
                        <h2 className="text-3xl font-bold text-blue-400 fancy-heading mb-4 text-center">AI-Generated Summary</h2>
                        {summaryError && (
                          <div className="w-full max-w-2xl mx-auto mb-4 p-4 rounded-xl bg-red-900/80 border border-red-400 text-red-200 text-center font-bold">
                            {summaryError}
                          </div>
                        )}
                        {/* Show cache status and force regenerate button */}
                        {summaryText && (
                          <div className="mb-4 flex flex-col items-center gap-2">
                            {summaryCached ? (
                              <>
                                <span className="text-xs text-yellow-300 font-semibold">Result loaded from cache.</span>
                                <button
                                  className="px-3 py-1 rounded bg-pink-700 text-white text-xs font-bold hover:bg-pink-800 border border-pink-300 shadow disabled:opacity-60 disabled:cursor-not-allowed"
                                  disabled={forceRegenLoading}
                                  onClick={() => {
                                    setForceRegenLoading(true);
                                    handleGenerateSummary(true);
                                  }}
                                >
                                  {forceRegenLoading ? <><Spinner /> Regenerating...</> : "Regenerate Summary"}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-green-300 font-semibold">Fresh result (not cached).</span>
                            )}
                          </div>
                        )}
                        {summaryLoading && (
                          <div style={{ textAlign: 'center', margin: '1em 0' }}>
                            <Spinner /> Generating...
                          </div>
                        )}
                        {/* Existing summary display logic follows, e.g. */}
                        {!summaryLoading && summaryText && (
                          <div className="text-lg text-white whitespace-pre-line text-left">
                            {summaryText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Enable Filter Modal */}
                {props.isAllowed && showEnableFilterModal && (
                  <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => setShowEnableFilterModal(false)} />
                    <div
                      className="relative glass p-10 rounded-3xl shadow-2xl border-2 border-pink-400/60 w-full max-w-md z-60 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526ee] via-[#ff512f22] to-[#ff512f22] backdrop-blur-xl"
                      style={{
                        maxHeight: '40vh',
                        overflow: 'hidden',
                        margin: '1rem',
                        boxSizing: 'border-box',
                      }}
                    >
                      <button
                        className="absolute top-4 right-4 text-3xl text-blue-200 hover:text-pink-400 focus:outline-none"
                        onClick={() => setShowEnableFilterModal(false)}
                        aria-label="Close modal"
                      >
                        &times;
                      </button>
                      <div className="w-full text-center">
                        <h2 className="text-2xl font-bold text-pink-400 mb-4">Please enable a filter to use the AI summary</h2>
                        <button
                          className="mt-4 px-4 py-2 rounded bg-blue-700 text-white font-bold hover:bg-blue-800 border border-blue-300 shadow"
                          onClick={() => setShowEnableFilterModal(false)}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* World Map button at the top of timeline controls */}
                {!hideControls && (
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
                )}
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
                        <div className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]" onClick={() => { setShowAdminToolsModal(false); setShowDeleteConfirm(false); }} />
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
                                onClick={() => { setShowAdminToolsModal(false); setShowDeleteConfirm(false); }}
                                aria-label="Close admin tools modal"
                            >
                                &times;
                            </button>
                            <div style={{ width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)' }}>
                                <h2 className="text-3xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Admin Tools</h2>
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
                                                    className="px-4 py-2 rounded bg-gray-600 text-white font-bold border border-gray-500 hover:bg-gray-500"
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    disabled={removalLoading}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="px-4 py-2 rounded bg-red-700 text-white font-bold hover:bg-red-800 border border-red-300 shadow disabled:opacity-60"
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
                                <div className="w-full flex flex-col items-center">
                                  <button
                                    className="px-4 py-2 rounded bg-blue-700 text-white font-bold hover:bg-blue-800 border border-blue-300 shadow disabled:opacity-50"
                                    disabled={backfillRegionsLoading}
                                    onClick={() => setShowBackfillRegionsModal(true)}
                                  >
                                    {backfillRegionsLoading ? "Generating..." : "Regenerate All Regions and Countries"}
                                  </button>
                                  {backfillRegionsResult && (
                                    <div className="mt-2 text-blue-200 text-sm">{backfillRegionsResult}</div>
                                  )}
                                </div>
                                {/* Modal for confirmation */}
                                {showBackfillRegionsModal && (
                                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                                    <div className="bg-gray-900 p-6 rounded-xl shadow-xl max-w-md w-full border border-blue-400">
                                      <h2 className="text-lg font-bold text-red-400 mb-2">Warning</h2>
                                      <p className="text-blue-100 mb-4">This will <span className="font-bold text-red-300">overwrite all existing regions and countries</span> for every event in the database. This action cannot be undone. Are you sure you want to continue?</p>
                                      <div className="flex gap-4 justify-end">
                                        <button
                                          className="px-4 py-2 rounded bg-gray-700 text-white font-semibold border border-gray-500 hover:bg-gray-600"
                                          onClick={() => setShowBackfillRegionsModal(false)}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          className="px-4 py-2 rounded bg-red-700 text-white font-bold border border-red-400 hover:bg-red-800 disabled:opacity-60"
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
                                                setShowBackfillRegionsModal(false);
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
                                          {backfillRegionsLoading ? "Generating..." : "Yes, Overwrite All"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* Filter Legend */}
                {(selectedTags?.length > 0 || selectedBooks?.length > 0 || selectedRegions?.length > 0 || selectedCountries?.length > 0) && (
                  (() => {
                    // Build a global list of all selected filter values, preserving order by type
                    const filterTypes = [
                      { type: 'Tag', values: selectedTags || [], colorClass: 'text-blue-200' },
                      { type: 'Book', values: selectedBooks || [], colorClass: 'text-pink-200' },
                      { type: 'Region', values: selectedRegions || [], colorClass: 'text-green-200' },
                      { type: 'Country', values: selectedCountries || [], colorClass: 'text-yellow-200' },
                    ];
                    // Flatten to [{type, value, colorClass}]
                    const allFilters = filterTypes.flatMap(ft => ft.values.map(v => ({ type: ft.type, value: v, colorClass: ft.colorClass })));
                    const colorPalette = [
                      '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#818cf8', '#f472b6', '#f59e42', '#10b981', '#6366f1', '#e879f9', '#f43f5e', '#0ea5e9', '#fde047', '#22d3ee'
                    ];
                    return (
                      <div className="flex flex-wrap gap-4 justify-center mb-4 w-full max-w-4xl mx-auto">
                        {allFilters.map((filter, idx) => (
                          <div key={filter.type + ':' + filter.value} className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full inline-block" style={{ background: colorPalette[idx % colorPalette.length] }}></span>
                            <span className={`${filter.colorClass} text-sm font-semibold`}>{filter.type}: {filter.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
                {/* Scrollable timeline container */}
                <div
                    ref={timelineContainerRef}
                    style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '2rem' }}
                    className="timeline-scroll w-full max-w-4xl mx-auto rounded-2xl shadow-2xl bg-gray-800/80 overflow-x-auto sm:overflow-x-visible"
                >
                    <svg ref={svgRef} className="timeline-svg w-full min-w-[340px] sm:min-w-0" />
                </div>

                {selectedEvent && showEventModal && (
                    <EventModal
                        selectedEvent={selectedEvent}
                        editMode={editMode}
                        handleEditSubmit={handleEditSubmit}
                        handleEditChange={handleEditChange}
                        localEditForm={localEditForm}
                        editError={editError}
                        editBookMode={editBookMode}
                        setEditBookMode={setEditBookMode}
                        newBook={newBook}
                        setNewBook={setNewBook}
                        getAllBooks={getAllBooks}
                        validEvents={validEvents}
                        regenDescriptionLoading={regenDescriptionLoading}
                        regenTagsLoading={regenTagsLoading}
                        regenRegionsLoading={regenRegionsLoading}
                        regenCountriesLoading={regenCountriesLoading}
                        handleDeleteEvent={handleDeleteEvent}
                        startEditEvent={startEditEvent}
                        submitting={submitting}
                        Spinner={Spinner}
                        isAllowed={isAllowed}
                        setShowModal={() => {
                            setShowEventModal(false);
                            setSelectedEvent(null);
                            if (typeof setEditMode === 'function') setEditMode(false);
                        }}
                        showModal={showEventModal}
                    />
                )}
            </div>
        </>
    );
};


export default Timeline;
