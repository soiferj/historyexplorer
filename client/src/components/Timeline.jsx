import React, { useEffect, useState } from "react";
import supabase from "../supabase";

const Timeline = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            let { data, error } = await supabase.from("events").select("*");
    
            if (error) {
                console.error("Error fetching events:", error.message);
                setEvents([]); // Fallback to empty array
                return;
            }
    
            console.log("Fetched Data:", data); // Debugging step
    
            // Ensure `data` is an array before sorting
            if (Array.isArray(data)) {
                setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
            } else {
                setEvents([]); // Prevent errors
            }
        };
    
        fetchEvents();
    }, []);        

    return (
        <div>
            <h2>Historical Timeline</h2>
            <ul>
                {events.map(event => (
                    <li key={event.id}>
                        <strong>{event.date}</strong> - {event.title}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Timeline;
