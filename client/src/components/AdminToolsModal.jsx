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
        </div>
    );
}

export default AdminToolsModal;
