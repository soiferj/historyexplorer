import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.REACT_APP_API_URL || "";

// Add props for events and setSelectedEvent
function Chatbot({ userId, events = [], setSelectedEvent }) {
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

  // Helper: extract JSON event links from the end of the message
  function extractEventLinks(content) {
    // Look for a JSON array at the end of the message
    const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]$/);
    if (!jsonMatch) return [];
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }

  // Helper: remove the JSON event links from the message content
  function stripEventLinks(content) {
    return content.replace(/\[\s*{[\s\S]*}\s*\]$/, '').trim();
  }

  // Helper: render message content with clickable event links
  function renderMessageWithLinks(content, eventLinks) {
    if (!eventLinks || eventLinks.length === 0) return <ReactMarkdown className="prose prose-invert max-w-none">{content}</ReactMarkdown>;
    let result = [];
    let lastIndex = 0;
    let key = 0;
    let workingContent = content;
    // For each event link, replace the first occurrence of the text with a clickable link
    eventLinks.forEach(link => {
      const { id, text } = link;
      if (!id || !text) return;
      const idx = workingContent.indexOf(text, lastIndex);
      if (idx === -1) return;
      // Push text before the link
      if (idx > lastIndex) {
        result.push(workingContent.slice(lastIndex, idx));
      }
      // Find the event by id (strip 'event:' prefix if present)
      const eventId = id.startsWith('event:') ? id.slice(6) : id;
      const event = events.find(ev => String(ev.id) === String(eventId));
      result.push(
        <button
          key={key++}
          className="underline text-pink-300 hover:text-blue-300 font-semibold focus:outline-none bg-transparent border-0 p-0 m-0 inline"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (event && setSelectedEvent) setSelectedEvent(event);
          }}
          type="button"
        >
          {text}
        </button>
      );
      lastIndex = idx + text.length;
    });
    // Push any remaining text
    if (lastIndex < workingContent.length) {
      result.push(workingContent.slice(lastIndex));
    }
    return result;
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <button
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-2xl font-bold transition-all duration-300"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
        >
          💬
        </button>
      )}
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-0 right-0 left-0 top-0 z-50 flex items-center justify-center" style={{ background: 'none', pointerEvents: 'auto' }}>
          {/* Modal overlay */}
          <div
            className="fixed inset-0 bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            style={{ cursor: 'pointer' }}
          />
          {/* Modal content */}
          <div
            className="relative glass p-0 rounded-3xl shadow-2xl border-2 border-blue-400/60 w-full max-w-md z-60 flex flex-col animate-fade-in-modal bg-gradient-to-br from-[#232526ee] via-[#00c6ff22] to-[#ff512f22] backdrop-blur-xl"
            style={{
              maxHeight: '70vh',
              overflow: 'hidden',
              margin: '1rem',
              boxSizing: 'border-box',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-700 to-pink-700 rounded-t-3xl">
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
                  className="text-white text-3xl sm:text-2xl font-bold hover:text-pink-200 focus:outline-none p-2 sm:p-0 rounded-full transition-all duration-200 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  type="button"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 bg-transparent" style={{ maxHeight: 400 }}>
              {messages.length === 0 && (
                <div className="text-gray-400 text-sm text-center mt-8">Ask me anything about history!</div>
              )}
              {messages.map((msg, idx) => {
                if (msg.sender === "user") {
                  return (
                    <div
                      key={idx}
                      className={`my-2 flex justify-end`}
                    >
                      <div className="px-3 py-2 rounded-xl max-w-[80%] text-sm shadow bg-blue-500 text-white">
                        {msg.content}
                      </div>
                    </div>
                  );
                } else {
                  // For bot messages, extract event links and strip them from the visible content
                  const eventLinks = extractEventLinks(msg.content);
                  const visibleContent = stripEventLinks(msg.content);
                  return (
                    <div
                      key={idx}
                      className={`my-2 flex justify-start`}
                    >
                      <div className="px-3 py-2 rounded-xl max-w-[80%] text-sm shadow bg-gray-700 text-gray-100">
                        {renderMessageWithLinks(visibleContent, eventLinks)}
                      </div>
                    </div>
                  );
                }
              })}
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
            <form onSubmit={sendMessage} className="flex items-center px-3 py-2 border-t bg-transparent rounded-b-3xl">
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
