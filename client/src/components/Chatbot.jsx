import React, { useState, useRef, useEffect } from "react";

const API_URL = process.env.REACT_APP_API_URL || "";

function Chatbot({ userId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    const userMsg = { sender: "user", content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput(""); // Clear input immediately after submit
    try {
      const res = await fetch(`${API_URL}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: input,
          userId,
        }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages(data.messages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <button
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white rounded-full shadow-lg w-16 h-16 flex items-center justify-center text-3xl font-bold transition-all duration-300"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
        >
          💬
        </button>
      )}
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 max-w-[95vw] bg-gray-900 rounded-2xl shadow-2xl border border-blue-300 flex flex-col animate-fade-in-modal">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-700 to-pink-700 rounded-t-2xl">
            <span className="font-bold text-white text-lg">History AI</span>
            <div className="flex items-center gap-2">
              <button
                className="text-xs bg-blue-400 hover:bg-blue-500 text-white rounded px-2 py-1 mr-2 transition-all duration-200"
                onClick={() => {
                  setMessages([]);
                  setConversationId(null);
                  setError("");
                }}
                aria-label="Start new conversation"
                type="button"
              >
                New Chat
              </button>
              <button
                className="text-white text-2xl font-bold hover:text-pink-200 focus:outline-none"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                type="button"
              >
                &times;
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 bg-gray-800" style={{ maxHeight: 400 }}>
            {messages.length === 0 && (
              <div className="text-gray-400 text-sm text-center mt-8">Ask me anything about history!</div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`my-2 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-3 py-2 rounded-xl max-w-[80%] text-sm shadow ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="my-2 flex justify-start">
                <div className="px-3 py-2 rounded-xl max-w-[80%] text-sm shadow bg-gray-700 text-gray-100 flex items-center">
                  <span className="typing">
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {error && <div className="text-red-400 text-xs px-4 pb-1">{error}</div>}
          <form onSubmit={sendMessage} className="flex items-center px-3 py-2 border-t bg-gray-900">
            <input
              className="flex-1 rounded-xl border border-gray-700 px-3 py-2 mr-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder-gray-400"
              type="text"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2 font-bold disabled:opacity-50"
              disabled={loading || !input.trim()}
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}
      <style>{`
  .typing .dot {
    animation: blink 1.4s infinite both;
    font-size: 1.5em;
    margin-right: 2px;
    opacity: 0.5;
  }
  .typing .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  .typing .dot:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes blink {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }
`}</style>
    </>
  );
}

export default Chatbot;
