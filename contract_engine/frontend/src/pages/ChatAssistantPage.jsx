import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { chatWithAssistant } from "../services/api";
import { Send, MessageSquare, FileText } from "react-feather";

export default function ChatAssistantPage() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id") || sessionStorage.getItem("document_id") || null;
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: docId
        ? "Hi there! 🏎️ I'm your car finance negotiation coach. I can see your uploaded contract — ask me anything about the terms, pricing, or how to negotiate a better deal."
        : "Hi there! 🏎️ I'm your car finance negotiation coach. Upload a contract first for personalized advice, or ask me general questions about car leases and loans.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithAssistant(text, docId);
      setMessages((prev) => [...prev, { role: "assistant", content: response.advice || response.reply || "I couldn't generate a response. Please try again." }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />
      <main className="main-content flex-1 ml-72 p-8 flex flex-col h-screen min-h-0 overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="mb-6 animate-fade-in flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-red to-accent-red-dark flex items-center justify-center shadow-glow">
                <MessageSquare size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary">Negotiation AI</h1>
            </div>
            <p className="text-text-secondary text-sm">Your personal car finance expert — powered by AI</p>
          </div>

          {/* Contract Context */}
          {docId && (
            <GlassCard className="p-3 mb-4 flex items-center gap-3 flex-shrink-0" hover={false}>
              <FileText size={16} className="text-accent-red-light flex-shrink-0" />
              <p className="text-sm text-text-secondary">Contract loaded: <span className="text-text-primary font-medium">Document #{docId}</span></p>
            </GlassCard>
          )}

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-accent-red to-accent-red-dark text-white"
                    : "glass-card text-text-primary"
                }`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🏎️</span>
                      <span className="text-xs font-semibold text-accent-red-light">LEASIFY Coach</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="glass-card p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏎️</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-accent-red-light rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-accent-red-light rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-accent-red-light rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <GlassCard className="p-4 flex items-center gap-3 flex-shrink-0" hover={false}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask about your contract terms, negotiation strategies, or car finance..."
              rows="1" className="flex-1 resize-none py-2 bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary text-sm" />
            <Button variant="primary" onClick={handleSend} disabled={loading || !input.trim()} className="flex-shrink-0 flex items-center gap-2">
              <Send size={16} /> Send
            </Button>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
