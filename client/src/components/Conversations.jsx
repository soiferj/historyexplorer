import React, { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "";



function Conversations({ userId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Removed openConvId state; handled by parent
  const [deletingId, setDeletingId] = useState(null);

  const fetchConversations = () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/chatbot/conversations?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        setConversations(Array.isArray(data.conversations) ? data.conversations : []);
        setMessagesByConversation(data.messagesByConversation || {});
      })
      .catch(err => setError("Failed to load conversations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line
  }, [userId]);

  const handleDelete = async (convId) => {
    if (!window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) return;
    setDeletingId(convId);
    try {
      const res = await fetch(`${API_URL}/chatbot/conversation/${convId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete conversation");
      fetchConversations();
    } catch (err) {
      setError("Error deleting conversation");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Conversations</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {conversations.length === 0 && !loading && (
        <div className="text-gray-400">No conversations found.</div>
      )}
      <ul className="space-y-2">
        {conversations.map(conv => {
          // Find the first user message for this conversation
          const firstUserMsg = (messagesByConversation[conv.id] || []).find(msg => msg.sender === 'user');
          return (
            <li key={conv.id} className="bg-gray-800 rounded p-3">
              <div className="flex justify-between items-center gap-2">
                <div>
                  <div className="font-semibold text-white">
                    {firstUserMsg ? firstUserMsg.content : `Conversation ${conv.id}`}
                  </div>
                  <div className="text-xs text-gray-300">{conv.updatedAt ? new Date(conv.updatedAt).toLocaleString() : ""}</div>
                </div>
                <div className="flex gap-2">
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                  onClick={() => onSelectConversation(conv.id)}
                >
                  Show
                </button>
                  <button
                    className={`bg-red-500 text-white px-3 py-1 rounded ${deletingId === conv.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => handleDelete(conv.id)}
                    disabled={deletingId === conv.id}
                  >
                    {deletingId === conv.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              {/* Removed dropdown message view; handled by chatbot modal */}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Conversations;
