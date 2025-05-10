import React, { useState } from "react";

function AddEventForm({ onClose, onEventAdded, accessToken }) {
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

    const apiUrl = process.env.REACT_APP_API_URL;

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const padYear = (year) => {
        if (!year) return "";
        return year.toString().padStart(4, "0");
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
            if (onEventAdded) onEventAdded();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleFormSubmit} className="w-full flex flex-col gap-8 items-center">
            <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Add New Event</h2>
            {error && <div className="text-red-400 mb-4 text-center w-full max-w-md mx-auto font-semibold">{error}</div>}
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
            {/* Optionally add tags, regions, countries, description fields here if needed */}
            <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-3 rounded-xl mt-2 font-bold text-white shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed glow text-base w-full max-w-md mx-auto tracking-wide" disabled={submitting}>
                {submitting ? "Adding..." : "Add Event"}
            </button>
        </form>
    );
}

export default AddEventForm;
