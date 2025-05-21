import React, { useState } from "react";

function AdminToolsModal({
    removalSelectedTags, setRemovalSelectedTags,
    removalLoading, setRemovalLoading,
    removalError, setRemovalError,
    showDeleteConfirm, setShowDeleteConfirm,
    allEvents,
    accessToken,
    onClose,
    onEventsUpdated
}) {
    const [backfillRegionsLoading, setBackfillRegionsLoading] = useState(false);
    const [backfillRegionsResult, setBackfillRegionsResult] = useState("");
    const [showBackfillRegionsModal, setShowBackfillRegionsModal] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL;

    // Helper to get all unique tags from allEvents
    function getAllTags(events) {
        const tagCount = {};
        const tagOriginal = {};
        (events || []).forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => {
            const lower = tag.toLowerCase();
            tagCount[lower] = (tagCount[lower] || 0) + 1;
            if (!tagOriginal[lower]) tagOriginal[lower] = tag;
        }));
        return Object.entries(tagCount)
            .filter(([tag, count]) => count > 2)
            .map(([tag]) => tagOriginal[tag])
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }

    async function handleDeleteTags() {
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
            onClose();
            if (onEventsUpdated) onEventsUpdated();
        } catch (err) {
            setRemovalError(err.message);
        } finally {
            setRemovalLoading(false);
        }
    }

    async function handleBackfillRegions() {
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
                onClose();
                if (onEventsUpdated) onEventsUpdated();
            } else {
                setBackfillRegionsResult(data.error || "Failed to backfill regions.");
            }
        } catch (err) {
            setBackfillRegionsResult("Failed to backfill regions.");
        } finally {
            setBackfillRegionsLoading(false);
        }
    }

    return (
        <div className="w-full max-h-[70vh] overflow-y-auto flex flex-col items-center mt-8 sm:mt-12">
            <h2 className="text-3xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Admin Tools</h2>
            {/* Delete Tags Section */}
            <div className="w-full mb-8">
                <h3 className="text-lg font-semibold text-red-300 mb-2">Delete Tags</h3>
                <div className="mb-4 w-full flex flex-col items-center max-h-40 overflow-y-auto">
                    {getAllTags(allEvents).length === 0 && <div className="text-gray-400">No tags available.</div>}
                    {getAllTags(allEvents).map(tag => (
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
            {/* Confirm Delete Modal */}
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
                                onClick={handleDeleteTags}
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
                                onClick={handleBackfillRegions}
                            >
                                {backfillRegionsLoading ? "Generating..." : "Yes, Overwrite All"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminToolsModal;
