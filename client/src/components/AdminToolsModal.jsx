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
    const [dedupeTagsLoading, setDedupeTagsLoading] = useState(false);
    const [dedupeTagsResult, setDedupeTagsResult] = useState("");
    const [showDedupeTagsModal, setShowDedupeTagsModal] = useState(false);
    const [dedupeTagMapping, setDedupeTagMapping] = useState(null);
    const [showDedupeConfirmModal, setShowDedupeConfirmModal] = useState(false);
    const [deleteChatbotLoading, setDeleteChatbotLoading] = useState(false);
    const [deleteChatbotResult, setDeleteChatbotResult] = useState("");
    const [showDeleteChatbotModal, setShowDeleteChatbotModal] = useState(false);
    const [configs, setConfigs] = useState([]);
    const [configsLoading, setConfigsLoading] = useState(false);
    const [configsError, setConfigsError] = useState("");
    const [configEdits, setConfigEdits] = useState({});
    const [configSaveStatus, setConfigSaveStatus] = useState("");
    const [regenDescriptionsLoading, setRegenDescriptionsLoading] = useState(false);
    const [regenDescriptionsResult, setRegenDescriptionsResult] = useState("");
    const [showRegenDescriptionsModal, setShowRegenDescriptionsModal] = useState(false);
    const [addBookUrl, setAddBookUrl] = useState("");
    const [addBookLoading, setAddBookLoading] = useState(false);
    const [addBookResult, setAddBookResult] = useState("");
    const [bookCoverOptions, setBookCoverOptions] = useState([]); // [{url, id}]
    const [selectedBookCover, setSelectedBookCover] = useState(null);
    const [coverSuggestedName, setCoverSuggestedName] = useState("");
    const [coverFileNameInput, setCoverFileNameInput] = useState("");
    const [showBookCoverModal, setShowBookCoverModal] = useState(false);
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

    // --- Configs Section ---
    // Fetch configs on mount
    React.useEffect(() => {
        async function fetchConfigs() {
            setConfigsLoading(true);
            setConfigsError("");
            try {
                const response = await fetch(`${apiUrl}/config`, {
                    headers: {
                        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                    }
                });
                const data = await response.json();
                if (response.ok && Array.isArray(data)) {
                    setConfigs(data);
                    setConfigEdits({});
                } else {
                    setConfigsError(data.error || "Failed to fetch configs.");
                }
            } catch (err) {
                setConfigsError("Failed to fetch configs.");
            } finally {
                setConfigsLoading(false);
            }
        }
        fetchConfigs();
        // eslint-disable-next-line
    }, []);

    async function handleConfigEditSave(key) {
        setConfigSaveStatus("");
        try {
            const response = await fetch(`${apiUrl}/config`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify({ key, value: configEdits[key] })
            });
            const data = await response.json();
            if (response.ok) {
                setConfigs(cfgs => cfgs.map(cfg => cfg.key === key ? { ...cfg, value: configEdits[key] } : cfg));
                setConfigSaveStatus(`Saved '${key}'!`);
            } else {
                setConfigSaveStatus(data.error || `Failed to save '${key}'.`);
            }
        } catch (err) {
            setConfigSaveStatus(`Failed to save '${key}'.`);
        }
    }

    // --- Regenerate All Descriptions ---
    async function handleRegenDescriptions() {
        setRegenDescriptionsLoading(true);
        setRegenDescriptionsResult("");
        try {
            const response = await fetch(`${apiUrl}/events/regenerate-descriptions`, {
                method: "POST",
                headers: {
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                }
            });
            const data = await response.json();
            if (response.ok) {
                setRegenDescriptionsResult(`Descriptions regenerated for ${data.updated} events.`);
                setShowRegenDescriptionsModal(false);
                setShowDeleteConfirm(false);
                onClose();
                if (onEventsUpdated) onEventsUpdated();
            } else {
                setRegenDescriptionsResult(data.error || "Failed to regenerate descriptions.");
            }
        } catch (err) {
            setRegenDescriptionsResult("Failed to regenerate descriptions.");
        } finally {
            setRegenDescriptionsLoading(false);
        }
    }

    // --- Dedupe Tag Mapping Edits ---
    const [dedupeTagEdits, setDedupeTagEdits] = useState({});
    // Reset edits when mapping changes
    React.useEffect(() => {
        if (showDedupeConfirmModal && dedupeTagMapping) {
            setDedupeTagEdits({});
        }
    }, [showDedupeConfirmModal, dedupeTagMapping]);

    // --- Add Book by OpenLibrary URL ---
    async function handleAddBookByUrl() {
        setAddBookLoading(true);
        setAddBookResult("");
        setBookCoverOptions([]);
        setSelectedBookCover(null);
        try {
            // Validate OpenLibrary URL
            const match = addBookUrl.match(/openlibrary.org\/(works|books)\/(OL[\dA-Z]+[MW])\/?/i);
            if (!match) {
                setAddBookResult("Invalid OpenLibrary URL.");
                setAddBookLoading(false);
                return;
            }
            // Fetch book data from OpenLibrary to get cover options
            const olType = match[1];
            const olId = match[2];
            const olApiUrl = olType === "works"
                ? `https://openlibrary.org/works/${olId}.json`
                : `https://openlibrary.org/books/${olId}.json`;
            const olResp = await fetch(olApiUrl);
            if (!olResp.ok) throw new Error("Failed to fetch from OpenLibrary API");
            const olData = await olResp.json();
            let coverIds = [];
            if (olData.covers && Array.isArray(olData.covers)) {
                coverIds = olData.covers;
            }
            // Compose cover URLs (large, medium, small)
            const coverOptions = coverIds.map(id => ({
                id,
                url: `https://covers.openlibrary.org/b/id/${id}-L.jpg`
            }));
            // Always prompt admin to select/confirm the cover and filename when at least one cover exists
            // Extract a suggested filename from the title, or fall back to URL segment or cover id
            const title = olData.title || "";
            const normalizeFileName = (t) => {
                const base = (t || "").normalize("NFKD").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
                return base ? (base + '.jpg') : '';
            };
            const deriveFromUrl = (u) => {
                try {
                    const parsed = new URL(u);
                    const segs = parsed.pathname.split('/').filter(Boolean);
                    // try third segment (e.g. /works/OL.../Formula), then second (id), else empty
                    return segs[2] || segs[1] || '';
                } catch (e) {
                    return '';
                }
            };
            const urlFallback = deriveFromUrl(addBookUrl);
            const suggestedFromTitle = normalizeFileName(title);
            const suggestedFromUrl = normalizeFileName(urlFallback);
            // If no title-based suggestion, use URL-based suggestion, else use cover id as last resort
            let suggested = suggestedFromTitle || suggestedFromUrl;
            if (!suggested && coverOptions && coverOptions.length > 0) {
                suggested = `cover_${coverOptions[0].id}.jpg`;
            }
            setCoverSuggestedName(suggested);
            setCoverFileNameInput(suggested);

            // Always show modal so admin can confirm/edit filename.
            setBookCoverOptions(coverOptions);
            setCoverSuggestedName(suggested);
            setCoverFileNameInput(suggested);
            // Pre-select first cover if available (keeps selection logic identical)
            setSelectedBookCover(coverOptions.length > 0 ? coverOptions[0] : null);
            setShowBookCoverModal(true);
            setAddBookLoading(false);
            return; // Wait for admin to confirm filename/cover (even if no covers)
        } catch (err) {
            setAddBookResult("Failed to add book: " + err.message);
            setAddBookLoading(false);
        }
    }

    function sanitizeFileNameInput(input) {
        if (!input) return '';
        // remove path chars, keep base name
        let name = input.replace(/\\/g, '/').split('/').pop();
        // remove extension if present
        name = name.replace(/\.[^/.]+$/, '');
    // keep underscores by allowing word chars (letters, numbers, underscore) and spaces
    const clean = name.normalize("NFKD").replace(/[^\w ]/g, "").replace(/\s+/g, "_");
        return clean ? (clean + '.jpg') : '';
    }

    async function submitBookToBackend(url, coverId, coverFilename) {
        setAddBookLoading(true);
        setAddBookResult("");
        try {
            const response = await fetch(`${apiUrl}/books/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                },
                body: JSON.stringify({ openlibrary_url: url, cover_id: coverId, cover_filename: coverFilename })
            });
            const data = await response.json();
            if (response.ok) {
                setAddBookResult("Book added successfully!");
                if (data && data.covers_found === false) {
                    setAddBookResult("Book added, but no cover image was available to upload.");
                }
                setAddBookUrl("");
            } else {
                setAddBookResult(data.error || "Failed to add book.");
            }
        } catch (err) {
            setAddBookResult("Failed to add book: " + err.message);
        } finally {
            setAddBookLoading(false);
            setShowBookCoverModal(false);
        }
    }

    return (
        // Full-screen admin tools page (replaces modal)
        <div className="min-h-screen w-full overflow-y-auto flex flex-col items-center p-6 sm:p-10 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <div className="w-full max-w-6xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight drop-shadow-lg">Admin Tools</h2>
                </div>
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
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Regenerate All Descriptions</h3>
            <div className="w-full flex flex-col items-center">
                <button
                    className="px-4 py-2 rounded bg-blue-700 text-white font-bold hover:bg-blue-800 border border-blue-300 shadow disabled:opacity-50"
                    disabled={regenDescriptionsLoading}
                    onClick={() => setShowRegenDescriptionsModal(true)}
                >
                    {regenDescriptionsLoading ? "Regenerating..." : "Regenerate All Descriptions"}
                </button>
                {regenDescriptionsResult && (
                    <div className="mt-2 text-blue-200 text-sm">{regenDescriptionsResult}</div>
                )}
            </div>
            {/* Modal for confirmation */}
            {showRegenDescriptionsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="bg-gray-900 p-6 rounded-xl shadow-xl max-w-md w-full border border-blue-400">
                        <h2 className="text-lg font-bold text-red-400 mb-2">Warning</h2>
                        <p className="text-blue-100 mb-4">This will <span className="font-bold text-red-300">regenerate ALL descriptions</span> for every event in the database. This action cannot be undone. Are you sure you want to continue?</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                className="px-4 py-2 rounded bg-gray-700 text-white font-semibold border border-gray-500 hover:bg-gray-600"
                                onClick={() => setShowRegenDescriptionsModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-red-700 text-white font-bold border border-red-400 hover:bg-red-800 disabled:opacity-60"
                                disabled={regenDescriptionsLoading}
                                onClick={handleRegenDescriptions}
                            >
                                {regenDescriptionsLoading ? "Regenerating..." : "Yes, Regenerate All"}
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
            <hr className="my-6 border-green-400/40" />
            {/* Configs Section */}
            <h3 className="text-lg font-semibold text-green-300 mb-2">App Configs</h3>
            <div className="w-full flex flex-col items-center mb-6">
                {configsLoading && <div className="text-green-200">Loading configs...</div>}
                {configsError && <div className="text-red-400 mb-2">{configsError}</div>}
                {!configsLoading && !configsError && configs.length === 0 && (
                    <div className="text-gray-400">No configs found.</div>
                )}
                {!configsLoading && configs.length > 0 && (
                    <table className="w-full max-w-lg text-sm border border-green-400 rounded bg-gradient-to-br from-[#232526cc] via-[#a8ff7833] to-[#78ffd633] mb-2">
                        <thead>
                            <tr className="text-green-200">
                                <th className="p-2 border-b border-green-400 text-left">Key</th>
                                <th className="p-2 border-b border-green-400 text-left">Value</th>
                                <th className="p-2 border-b border-green-400"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {configs.map(cfg => (
                                <tr key={cfg.key}>
                                    <td className="p-2 border-b border-green-400 font-mono text-green-300">{cfg.key}</td>
                                    <td className="p-2 border-b border-green-400">
                                        <input
                                            className="w-full bg-green-900 text-green-100 rounded px-2 py-1 border border-green-400"
                                            value={configEdits[cfg.key] !== undefined ? configEdits[cfg.key] : cfg.value}
                                            onChange={e => setConfigEdits(edits => ({ ...edits, [cfg.key]: e.target.value }))}
                                        />
                                    </td>
                                    <td className="p-2 border-b border-green-400">
                                        <button
                                            className="px-3 py-1 rounded bg-green-700 text-white font-bold hover:bg-green-800 border border-green-300 shadow disabled:opacity-50"
                                            disabled={configEdits[cfg.key] === undefined || configEdits[cfg.key] === cfg.value}
                                            onClick={() => handleConfigEditSave(cfg.key)}
                                        >
                                            Save
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {configSaveStatus && <div className="text-green-200 mt-2">{configSaveStatus}</div>}
            </div>
            <hr className="my-6 border-purple-400/40" />
            {/* Dedupe Tags Section */}
            <h3 className="text-lg font-semibold text-purple-300 mb-2">Dedupe Tags</h3>
            <div className="w-full flex flex-col items-center mb-6">
                <button
                    className="px-4 py-2 rounded bg-purple-700 text-white font-bold hover:bg-purple-800 border border-purple-300 shadow disabled:opacity-50"
                    disabled={dedupeTagsLoading}
                    onClick={() => setShowDedupeTagsModal(true)}
                >
                    {dedupeTagsLoading ? "Generating Mapping..." : "Dedupe Tags"}
                </button>
                {dedupeTagsResult && (
                    <div className="mt-2 text-purple-200 text-sm">{dedupeTagsResult}</div>
                )}
            </div>
            {/* Dedupe Tags Modal */}
            {showDedupeTagsModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowDedupeTagsModal(false)} />
                    <div className="relative glass p-6 rounded-2xl shadow-2xl border border-purple-400 w-full max-w-sm z-70 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#a18cd133] to-[#fbc2eb33] backdrop-blur-lg">
                        <h3 className="text-lg font-bold mb-2 text-purple-300">Dedupe Tags</h3>
                        <div className="mb-4 text-center text-purple-200">
                            This will generate a mapping to deduplicate similar tags using AI. Proceed?
                        </div>
                        <div className="flex gap-4 mt-2">
                            <button
                                className="px-4 py-2 rounded bg-gray-600 text-white font-bold border border-gray-300 shadow"
                                onClick={() => setShowDedupeTagsModal(false)}
                                disabled={dedupeTagsLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-purple-700 text-white font-bold hover:bg-purple-800 border border-purple-300 shadow disabled:opacity-50"
                                disabled={dedupeTagsLoading}
                                onClick={handleDedupeTags}
                            >
                                {dedupeTagsLoading ? "Generating..." : "Generate Mapping"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Dedupe Tags Confirm Modal */}
            {showDedupeConfirmModal && dedupeTagMapping && (
                <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
                    <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowDedupeConfirmModal(false)} />
                    <div className="relative glass p-6 rounded-2xl shadow-2xl border border-purple-400 w-full max-w-md z-70 flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#a18cd133] to-[#fbc2eb33] backdrop-blur-lg">
                        <h3 className="text-lg font-bold mb-2 text-purple-300">Confirm Dedupe Mapping</h3>
                        <div className="mb-4 text-center text-purple-200 max-h-48 overflow-y-auto w-full">
                            <div className="mb-2">You can edit the new tag values before applying:</div>
                            <ul className="text-purple-100 text-xs w-full">
                                {Object.entries(dedupeTagMapping).map(([oldTag, newTag]) => {
                                    const isEdited = dedupeTagEdits[oldTag] !== undefined;
                                    const value = isEdited ? dedupeTagEdits[oldTag] : newTag;
                                    // Show X if edited and value is not equal to oldTag, or if the auto-mapping is different from the oldTag (i.e., auto-mapped)
                                    const showUndo = isEdited ? value !== oldTag : oldTag !== newTag;
                                    return (
                                        <li key={oldTag} className="flex items-center gap-2 mb-1">
                                            <span className="font-bold min-w-[80px]">{oldTag}</span>
                                            <span className="mx-1">→</span>
                                            <input
                                                className="bg-purple-900 text-purple-100 rounded px-2 py-1 border border-purple-400 flex-1 min-w-0"
                                                value={value}
                                                onChange={e => setDedupeTagEdits(edits => ({ ...edits, [oldTag]: e.target.value }))}
                                            />
                                            {showUndo && (
                                                <button
                                                    className="ml-1 text-red-400 hover:text-red-600 font-bold text-lg px-1"
                                                    title="Undo edit"
                                                    onClick={() => setDedupeTagEdits(edits => {
                                                        // If reverting to oldTag, treat as no edit (remove from edits)
                                                        if ((edits[oldTag] ?? newTag) === oldTag) {
                                                            const c = { ...edits };
                                                            delete c[oldTag];
                                                            return c;
                                                        }
                                                        // Otherwise, set to oldTag
                                                        return { ...edits, [oldTag]: oldTag };
                                                    })}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
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
                                className="px-4 py-2 rounded bg-purple-700 text-white font-bold hover:bg-purple-800 border border-purple-300 shadow disabled:opacity-50"
                                disabled={dedupeTagsLoading}
                                onClick={() => {
                                    // Compose mapping with edits and send directly to backend (do not update local state first)
                                    const mapping = Object.fromEntries(
                                        Object.entries(dedupeTagMapping).map(([oldTag, newTag]) => [oldTag, dedupeTagEdits[oldTag] !== undefined ? dedupeTagEdits[oldTag] : newTag])
                                    );
                                    // Call backend with the mapping, not the possibly stale dedupeTagMapping state
                                    (async () => {
                                        setDedupeTagsLoading(true);
                                        setDedupeTagsResult("");
                                        try {
                                            const response = await fetch(`${apiUrl}/events/apply-dedupe-tags`, {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    ...(accessToken && { Authorization: `Bearer ${accessToken}` })
                                                },
                                                body: JSON.stringify({ mapping })
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
                                    })();
                                }}
                            >
                                {dedupeTagsLoading ? "Applying..." : "Apply Mapping"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <hr className="my-6 border-orange-400/40" />
            <h3 className="text-lg font-semibold text-orange-300 mb-2">Add Book by OpenLibrary URL</h3>
            <div className="w-full flex flex-col items-center mb-6">
                <form className="flex flex-col sm:flex-row gap-2 w-full max-w-lg" onSubmit={e => { e.preventDefault(); handleAddBookByUrl(); }}>
                    <input
                        className="flex-1 px-3 py-2 rounded border border-orange-400 bg-orange-900 text-orange-100"
                        type="text"
                        placeholder="Paste OpenLibrary URL (e.g. https://openlibrary.org/works/OL12345W)"
                        value={addBookUrl}
                        onChange={e => setAddBookUrl(e.target.value)}
                        disabled={addBookLoading}
                        required
                    />
                    <button
                        className="px-4 py-2 rounded bg-orange-700 text-white font-bold hover:bg-orange-800 border border-orange-300 shadow disabled:opacity-50"
                        type="submit"
                        disabled={addBookLoading || !addBookUrl}
                    >
                        {addBookLoading ? "Adding..." : "Add Book"}
                    </button>
                </form>
                {addBookResult && <div className="mt-2 text-orange-200 text-sm">{addBookResult}</div>}
            </div>
            {/* Book Cover Selection Modal */}
            {showBookCoverModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="bg-gray-900 p-6 rounded-xl shadow-xl max-w-lg w-full border border-orange-400 flex flex-col items-center">
                        <h2 className="text-lg font-bold text-orange-300 mb-2">Select Book Cover</h2>
                        <div className="flex flex-wrap gap-4 justify-center mb-4">
                            {bookCoverOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    className={`border-4 rounded-lg ${selectedBookCover?.id === opt.id ? 'border-orange-400' : 'border-transparent'} focus:outline-none`}
                                    onClick={() => setSelectedBookCover(opt)}
                                >
                                    <img src={opt.url} alt="Book cover option" className="w-32 h-48 object-cover rounded" />
                                </button>
                            ))}
                        </div>
                                    {/* Filename validation / edit area */}
                                    <div className="w-full max-w-md">
                                        <label className="text-sm text-orange-200">Image filename</label>
                                        <input
                                            className="w-full px-3 py-2 rounded border border-orange-400 bg-orange-900 text-orange-100 mt-1"
                                            type="text"
                                            value={coverFileNameInput}
                                            onChange={e => setCoverFileNameInput(e.target.value)}
                                            placeholder={coverSuggestedName || 'example_book_title.jpg'}
                                        />
                                        <div className="text-xs text-orange-300 mt-1">
                                            Will be saved as: <span className="font-mono text-orange-100">{sanitizeFileNameInput(coverFileNameInput) || '(invalid name)'}</span>
                                        </div>
                                    </div>
                        <div className="flex gap-4 mt-2">
                            <button
                                className="px-4 py-2 rounded bg-gray-700 text-white font-semibold border border-gray-500 hover:bg-gray-600"
                                onClick={() => { setShowBookCoverModal(false); setBookCoverOptions([]); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-orange-700 text-white font-bold border border-orange-400 hover:bg-orange-800 disabled:opacity-60"
                                disabled={!sanitizeFileNameInput(coverFileNameInput)}
                                onClick={() => {
                                    const filename = sanitizeFileNameInput(coverFileNameInput);
                                    setShowBookCoverModal(false);
                                    submitBookToBackend(addBookUrl, selectedBookCover ? selectedBookCover.id : undefined, filename);
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default AdminToolsModal;
