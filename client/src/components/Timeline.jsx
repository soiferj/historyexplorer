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
            <div className="overflow-x-auto whitespace-nowrap bg-gray-100 p-4 rounded">
                <div className="flex space-x-4">
                    {events.map(event => (
                        <div key={event.id} className="bg-white shadow-lg rounded p-4 inline-block min-w-[250px]">
                            <p className="text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
