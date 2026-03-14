import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";

export default function ChatWindow({ messages, onSend, loading }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-1">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-20">
            Ask anything about your contract…
          </p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} text={msg.text} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-md text-sm animate-pulse">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="border-t flex items-center px-4 py-3 gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-brand-orange text-white text-sm font-medium rounded-lg hover:bg-brand-orange-hover disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
