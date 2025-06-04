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
    const [dedupeTagsLoading, setDedupeTagsLoading] = useState(false);
    const [dedupeTagsResult, setDedupeTagsResult] = useState("");
    const [showDedupeTagsModal, setShowDedupeTagsModal] = useState(false);
    const [dedupeTagMapping, setDedupeTagMapping] = useState(null);
    const [showDedupeConfirmModal, setShowDedupeConfirmModal] = useState(false);
    const [deleteChatbotLoading, setDeleteChatbotLoading] = useState(false);
    const [deleteChatbotResult, setDeleteChatbotResult] = useState("");
    const [showDeleteChatbotModal, setShowDeleteChatbotModal] = useState(false);
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

    // Dedupe Tags: Step 1 - Call LLM to get mapping
    async function handleDedupeTags() {
        setDedupeTagsLoading(true);
        setDedupeTagsResult("");
        setDedupeTagMapping(null);
        try {
            const allTags = getAllTags(allEvents);
            const body = { tags: allTags };
            const response = await fetch(`${apiUrl}/events/dedupe-tags`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (response.ok && data.mapping) {
                setDedupeTagMapping(data.mapping); // mapping: { oldTag: newTag, ... }
                setShowDedupeConfirmModal(true);
            } else {
                setDedupeTagsResult(data.error || "Failed to generate dedupe mapping.");
            }
        } catch (err) {
            setDedupeTagsResult("Failed to generate dedupe mapping.");
        } finally {
            setDedupeTagsLoading(false);
        }
    }

    // Dedupe Tags: Step 2 - Confirm and apply mapping
    async function handleConfirmDedupeTags() {
        setDedupeTagsLoading(true);
        setDedupeTagsResult("");
        try {
            const response = await fetch(`${apiUrl}/events/apply-dedupe-tags`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify({ mapping: dedupeTagMapping })
            });
            const data = await response.json();
            if (response.ok) {
                setDedupeTagsResult(`Tags deduplicated for ${data.updated} events.`);
                setShowDedupeTagsModal(false);
                setShowDedupeConfirmModal(false);
                onClose();
                if (onEventsUpdated) onEventsUpdated();
            } else {
                setDedupeTagsResult(data.error || "Failed to apply dedupe mapping.");
            }
        } catch (err) {
            setDedupeTagsResult("Failed to apply dedupe mapping.");
        } finally {
            setDedupeTagsLoading(false);
        }
    }

    // Delete All Chatbot Conversations
    async function handleDeleteAllChatbot() {
        setDeleteChatbotLoading(true);
        setDeleteChatbotResult("");
        try {
            const response = await fetch(`${apiUrl}/chatbot/delete-all`, {
                method: "POST",
                headers: {
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                }
            });
            const data = await response.json();
            if (response.ok) {
                setDeleteChatbotResult("All chatbot conversations deleted.");
                setShowDeleteChatbotModal(false);
            } else {
                setDeleteChatbotResult(data.error || "Failed to delete conversations.");
            }
        } catch (err) {
            setDeleteChatbotResult("Failed to delete conversations.");
        } finally {
            setDeleteChatbotLoading(false);
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
            <hr className="my-6 border-blue-400/40" />
            {/* Dedupe Tags Section */}
            <h3 className="text-lg font-semibold text-yellow-300 mb-2">Deduplicate Tags</h3>
            <div className="w-full flex flex-col items-center mb-6">
                <button
                    className="px-4 py-2 rounded bg-yellow-700 text-white font-bold hover:bg-yellow-800 border border-yellow-300 shadow disabled:opacity-50"
                    disabled={dedupeTagsLoading}
                    onClick={handleDedupeTags}
                >
                    {dedupeTagsLoading ? "Generating Mapping..." : "Deduplicate Tags with AI"}
                </button>
                {dedupeTagsResult && (
                    <div className="mt-2 text-yellow-200 text-sm">{dedupeTagsResult}</div>
                )}
            </div>
            {/* Dedupe Tags Confirm Modal */}
            {showDedupeConfirmModal && dedupeTagMapping && (
                <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowDedupeConfirmModal(false)} />
                    <div className="relative glass p-6 rounded-2xl shadow-2xl border border-yellow-400 w-full max-w-lg z-70 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#ffe25933] to-[#ffa75133] backdrop-blur-lg">
                        <h3 className="text-lg font-bold mb-2 text-yellow-300">Confirm Tag Deduplication</h3>
                        <div className="mb-4 text-center text-yellow-200 max-h-60 overflow-y-auto w-full">
                            <p className="mb-2">The following tag changes will be made. You can reject or edit any mapping:</p>
                            <ul className="text-yellow-100 text-left text-xs max-h-40 overflow-y-auto">
                                {Object.entries(dedupeTagMapping).map(([oldTag, newTag]) => (
                                    <li key={oldTag} className="flex items-center gap-2 mb-1">
                                        <span className="font-bold">{oldTag}</span> →
                                        <input
                                            className="bg-yellow-900 text-yellow-100 rounded px-1 py-0.5 border border-yellow-400 w-40 text-xs"
                                            value={newTag}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setDedupeTagMapping(prev => ({ ...prev, [oldTag]: val }));
                                            }}
                                        />
                                        {oldTag !== newTag && (
                                            <button
                                                className="ml-2 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-800"
                                                title="Reject this mapping"
                                                onClick={() => {
                                                    setDedupeTagMapping(prev => {
                                                        const copy = { ...prev };
                                                        copy[oldTag] = oldTag;
                                                        return copy;
                                                    });
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex gap-4 mt-2">
                            <button
                                className="px-4 py-2 rounded bg-gray-600 text-white font-bold border border-gray-300 shadow"
                                onClick={() => setShowDedupeConfirmModal(false)}
                                disabled={dedupeTagsLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-yellow-700 text-white font-bold hover:bg-yellow-800 border border-yellow-300 shadow disabled:opacity-50"
                                disabled={dedupeTagsLoading}
                                onClick={handleConfirmDedupeTags}
                            >
                                {dedupeTagsLoading ? "Applying..." : "Proceed with Deduplication"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <hr className="my-6 border-yellow-400/40" />
            {/* Delete All Chatbot Conversations Section */}
            <h3 className="text-lg font-semibold text-pink-300 mb-2">Chatbot Tools</h3>
            <div className="w-full flex flex-col items-center mb-6">
                <button
                    className="px-4 py-2 rounded bg-pink-700 text-white font-bold hover:bg-pink-800 border border-pink-300 shadow disabled:opacity-50"
                    disabled={deleteChatbotLoading}
                    onClick={() => setShowDeleteChatbotModal(true)}
                >
                    {deleteChatbotLoading ? "Deleting..." : "Delete All Chatbot Conversations"}
                </button>
                {deleteChatbotResult && (
                    <div className="mt-2 text-pink-200 text-sm">{deleteChatbotResult}</div>
                )}
            </div>
            {/* Confirm Delete All Chatbot Conversations Modal */}
            {showDeleteChatbotModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowDeleteChatbotModal(false)} />
                    <div className="relative glass p-6 rounded-2xl shadow-2xl border border-pink-400 w-full max-w-sm z-70 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#ff5e6233] to-[#ffb88c33] backdrop-blur-lg">
                        <h3 className="text-lg font-bold mb-2 text-pink-300">Confirm Delete All Conversations</h3>
                        <div className="mb-4 text-center text-pink-200">
                            Are you sure you want to <span className="font-bold text-pink-300">delete ALL chatbot conversations</span>? This action cannot be undone.
                        </div>
                        <div className="flex gap-4 mt-2">
                            <button
                                className="px-4 py-2 rounded bg-gray-600 text-white font-bold border border-gray-300 shadow"
                                onClick={() => setShowDeleteChatbotModal(false)}
                                disabled={deleteChatbotLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-pink-700 text-white font-bold hover:bg-pink-800 border border-pink-300 shadow disabled:opacity-50"
                                disabled={deleteChatbotLoading}
                                onClick={handleDeleteAllChatbot}
                            >
                                {deleteChatbotLoading ? "Deleting..." : "Confirm Delete All"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminToolsModal;
