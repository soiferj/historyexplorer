import React, { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "";



function Conversations({ userId }) {
  const [conversations, setConversations] = useState([]);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openConvId, setOpenConvId] = useState(null);
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
                    onClick={() => setOpenConvId(openConvId === conv.id ? null : conv.id)}
                  >
                    {openConvId === conv.id ? "Hide" : "Show"}
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
              {openConvId === conv.id && (
                <div className="mt-3 bg-gray-900 rounded p-3">
                  {(messagesByConversation[conv.id] && messagesByConversation[conv.id].length > 0) ? (
                    <ul className="space-y-2">
                      {messagesByConversation[conv.id].map(msg => (
                        <li key={msg.id} className="text-sm text-gray-200">
                          <span className={`font-bold ${msg.sender === 'user' ? 'text-blue-300' : 'text-pink-300'}`}>{msg.sender === 'user' ? 'You' : 'AI'}:</span> {msg.content}
                          <span className="ml-2 text-xs text-gray-400">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-400">No messages in this conversation.</div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Conversations;
