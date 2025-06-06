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
  const [model, setModel] = useState("gpt-4.1-nano"); // Add model selection state
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    // Admin command: /id
    if (input.trim() === '/id') {
      setMessages((msgs) => [
        ...msgs,
        { sender: 'user', content: input },
        { sender: 'bot', content: conversationId ? `Conversation ID: ${conversationId}` : 'No conversation ID yet.' }
      ]);
      setInput("");
      return;
    }
    // Admin command: /debug
    if (input.trim() === '/debug') {
      setLoading(true);
      setMessages((msgs) => [
        ...msgs,
        { sender: 'user', content: input }
      ]);
      setInput("");
      setError("");
      try {
        if (!conversationId) throw new Error('No conversation ID yet.');
        const res = await fetch(`${API_URL}/chatbot/debug`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId })
        });
        if (!res.ok) throw new Error('Failed to fetch debug info');
        const data = await res.json();
        // Defensive: ensure data exists and messages is always an array
        let safeMessages = [];
        if (data && data.messages && typeof data.messages.length === 'number' && Array.isArray(data.messages)) {
          safeMessages = data.messages;
        }
        setMessages((msgs) => [
          ...msgs,
          { sender: 'bot', content: 'Raw chat history from DB:\n' + JSON.stringify(safeMessages, null, 2) }
        ]);
      } catch (err) {
        setMessages((msgs) => [
          ...msgs,
          { sender: 'bot', content: `Debug error: ${err.message}` }
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }
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
          model, // Send selected model
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
    if (!eventLinks || eventLinks.length === 0) return (
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
    // Defensive: ensure safeEventLinks is an array of objects with a text property
    const safeEventLinks = Array.isArray(eventLinks) ? eventLinks.filter(l => l && typeof l.text === 'string') : [];
    const sortedLinks = [...safeEventLinks].sort((a, b) => (b.text.length - a.text.length));
    let workingContent = content;
    let result = [];
    let key = 0;
    // Build a regex to match any of the link texts (escape special chars)
    const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkTexts = sortedLinks.map(l => escapeRegExp(l.text));
    if (linkTexts.length === 0) {
      return <ReactMarkdown>{content}</ReactMarkdown>;
    }
    const regex = new RegExp(linkTexts.join('|'), 'g');
    let match;
    let lastPos = 0;
    while ((match = regex.exec(workingContent)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;
      // Push text before the link as a span (inline)
      if (matchIndex > lastPos) {
        const textSegment = workingContent.slice(lastPos, matchIndex);
        if (textSegment) {
          result.push(
            <span key={key++}>{textSegment}</span>
          );
        }
      }
      // Find the link object for this text
      const link = sortedLinks.find(l => l.text === matchText);
      if (link) {
        const eventId = link.id.startsWith('event:') ? link.id.slice(6) : link.id;
        const event = events.find(ev => String(ev.id) === String(eventId));
        result.push(
          <button
            key={key++}
            className="underline text-pink-300 hover:text-blue-300 font-semibold focus:outline-none bg-transparent border-0 p-0 m-0 inline"
            style={{ cursor: 'pointer', display: 'inline', background: 'none' }}
            onClick={() => {
              if (event && setSelectedEvent) setSelectedEvent(event);
            }}
            type="button"
          >
            {matchText}
          </button>
        );
      } else {
        result.push(
          <span key={key++}>{matchText}</span>
        );
      }
      lastPos = matchIndex + matchText.length;
    }
    // Push any remaining text as a span (inline)
    if (lastPos < workingContent.length) {
      const textSegment = workingContent.slice(lastPos);
      if (textSegment) {
        result.push(
          <span key={key++}>{textSegment}</span>
        );
      }
    }
    return <div className="prose prose-invert max-w-none" style={{ display: 'inline' }}>{result}</div>;
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
            {/* Model selector below top bar */}
            <div className="w-full flex justify-end px-4 pt-2 pb-1">
              <label htmlFor="model-select" className="text-xs text-blue-200 mr-2 self-center">Model:</label>
              <select
                id="model-select"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="rounded bg-gray-900 text-blue-200 border border-blue-400 px-2 py-1 text-xs focus:outline-none shadow-sm hover:border-pink-400 transition-colors duration-150"
                style={{ minWidth: 120 }}
              >
                <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              </select>
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
                  // Special case: render /debug output as raw, unformatted text
                  if (msg.content && msg.content.startsWith('Raw chat history from DB:')) {
                    return (
                      <div
                        key={idx}
                        className={`my-2 flex justify-start`}
                      >
                        <pre className="px-3 py-2 rounded-xl max-w-[80%] text-xs shadow bg-gray-800 text-pink-200 overflow-x-auto whitespace-pre-wrap">
                          {msg.content}
                        </pre>
                      </div>
                    );
                  }
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
