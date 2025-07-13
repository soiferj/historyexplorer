import React, { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "";

function Conversations({ userId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/chatbot/conversations?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        setConversations(data.conversations || []);
      })
      .catch(err => setError("Failed to load conversations"))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Conversations</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {conversations.length === 0 && !loading && (
        <div className="text-gray-400">No conversations found.</div>
      )}
      <ul className="space-y-2">
        {conversations.map(conv => (
          <li key={conv.id} className="bg-gray-800 rounded p-3 flex justify-between items-center hover:bg-blue-700 transition cursor-pointer"
              onClick={() => onSelectConversation(conv.id)}>
            <div>
              <div className="font-semibold text-white">{conv.title || `Conversation ${conv.id}`}</div>
              <div className="text-xs text-gray-300">{conv.updatedAt ? new Date(conv.updatedAt).toLocaleString() : ""}</div>
            </div>
            <button className="bg-blue-500 text-white px-3 py-1 rounded">Continue</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Conversations;
