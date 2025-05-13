import React, { useState, useMemo } from "react";

function AddEventForm({ onClose, onEventAdded, accessToken, allEvents = [] }) {
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
        // Book validation
        if (bookMode === 'existing') {
            // Allow empty string ("None") as valid
            if (form.book_reference !== '' && !allBooks.includes(form.book_reference)) {
                setError("Please select an existing book or choose 'None'.");
                setSubmitting(false);
                return;
            }
        } else if (bookMode === 'new') {
            if (!form.book_reference || form.book_reference.trim() === "") {
                setError("Please enter a new book name.");
                setSubmitting(false);
                return;
            }
        }
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
            if (!data || !data.id) {
                setError("Failed to add event: No event ID returned from server.");
                setSubmitting(false);
                return;
            }
            setForm({ title: "", description: "", book_reference: "", year: "", tags: "", date_type: "CE", regions: "", countries: "" });
            if (onEventAdded) onEventAdded(data); // Pass the new event to the callback
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to get all unique books from allEvents
    const allBooks = useMemo(() => {
        const bookSet = new Set();
        (allEvents || []).forEach(ev => ev.book_reference && bookSet.add(ev.book_reference));
        return Array.from(bookSet).sort((a, b) => a.localeCompare(b));
    }, [allEvents]);

    // Toggle for book input mode
    const [bookMode, setBookMode] = useState('existing'); // 'existing' or 'new'

    return (
        <div className="w-full max-h-[70vh] overflow-y-auto flex flex-col items-center">
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
                        <div className="flex gap-0 items-center mb-2">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-l-xl border font-semibold text-sm transition ${form.date_type === 'BCE' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-200'} border-blue-400/40`}
                                onClick={() => setForm(f => ({ ...f, date_type: 'BCE' }))}
                                aria-pressed={form.date_type === 'BCE'}
                                style={{ marginRight: '-1px', zIndex: form.date_type === 'BCE' ? 2 : 1 }}
                            >
                                BCE
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-r-xl border font-semibold text-sm transition ${form.date_type === 'CE' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                                onClick={() => setForm(f => ({ ...f, date_type: 'CE' }))}
                                aria-pressed={form.date_type === 'CE'}
                                style={{ marginLeft: '-1px', zIndex: form.date_type === 'CE' ? 2 : 1 }}
                            >
                                CE
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                    <label className="font-semibold text-blue-200" htmlFor="book_reference">Book</label>
                    <div className="flex gap-0 items-center mb-2">
                        <button
                            type="button"
                            className={`px-3 py-1 rounded-l-xl border font-semibold text-sm transition ${bookMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-200'} border-blue-400/40`}
                            onClick={() => setBookMode('existing')}
                            aria-pressed={bookMode === 'existing'}
                            style={{ marginRight: '-1px', zIndex: bookMode === 'existing' ? 2 : 1 }}
                        >
                            Existing Book
                        </button>
                        <button
                            type="button"
                            className={`px-3 py-1 rounded-r-xl border font-semibold text-sm transition ${bookMode === 'new' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                            onClick={() => setBookMode('new')}
                            aria-pressed={bookMode === 'new'}
                            style={{ marginLeft: '-1px', zIndex: bookMode === 'new' ? 2 : 1 }}
                        >
                            New Book
                        </button>
                    </div>
                    {bookMode === 'existing' ? (
                        <select
                            id="book_reference_select"
                            className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-base border border-blue-400/40 shadow-inner"
                            value={form.book_reference && allBooks.includes(form.book_reference) ? form.book_reference : ''}
                            onChange={e => setForm(f => ({ ...f, book_reference: e.target.value }))}
                        >
                            <option value="">None</option>
                            {allBooks.map(book => (
                                <option key={book} value={book}>{book}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id="book_reference"
                            name="book_reference"
                            value={form.book_reference}
                            onChange={handleFormChange}
                            placeholder="Type new book"
                            className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-pink-400/40 shadow-inner placeholder:text-gray-400"
                            required
                        />
                    )}
                </div>
                {/* Optionally add tags, regions, countries, description fields here if needed */}
                <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-3 rounded-xl mt-2 font-bold text-white shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed glow text-base w-full max-w-md mx-auto tracking-wide" disabled={submitting}>
                    {submitting ? "Adding..." : "Add Event"}
                </button>
            </form>
        </div>
    );
}

export default AddEventForm;
