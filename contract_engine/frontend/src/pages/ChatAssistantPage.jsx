import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Input from "../components/Input";
import Button from "../components/Button";
import { Spinner } from "../components/LoadingSpinner";
import { chatWithAssistant, getChatHistory } from "../services/api";
import { Send, Plus } from "react-feather";

export default function ChatAssistantPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  const documentId = sessionStorage.getItem("document_id");

  useEffect(() => {
    if (!documentId) {
      navigate("/upload");
      return;
    }

    const fetchHistory = async () => {
      try {
        const data = await getChatHistory(documentId);
        setMessages(data.messages || []);
      } catch (error) {
        console.error("Failed to fetch chat history", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [documentId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSendingMessage(true);

    try {
      const response = await chatWithAssistant(input, documentId);
      const assistantText =
        response?.reply || response?.response || response?.message ||
        "I could not generate a response for that request.";

      const aiMessage = {
        id: Date.now() + 1,
        type: "assistant",
        text: assistantText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: "error",
        text: "Failed to get response. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="flex-1 ml-72 p-8 flex flex-col h-screen overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between animate-fade-in">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">
                AI Negotiation Advisor
              </h1>
              <p className="text-text-secondary">
                Get smart negotiation advice for your lease
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              className="flex items-center gap-2"
              onClick={() => {
                setMessages([]);
                sessionStorage.removeItem("document_id");
              }}
            >
              <Plus size={18} />
              New Chat
            </Button>
          </div>

          {/* Chat Area */}
          <GlassCard className="flex-1 p-6 flex flex-col overflow-hidden mb-6 animate-slide-up">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-5xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      Start Your Negotiation
                    </h3>
                    <p className="text-text-secondary max-w-sm">
                      Ask me anything about your lease, APR, monthly payments,
                      or negotiation strategies
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}

              {sendingMessage && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-lg p-3 max-w-xs">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce"></div>
                      <div
                        className="w-2 h-2 rounded-full bg-accent-blue animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-accent-blue animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                type="text"
                placeholder="Ask about APR, payments, penalties, or negotiations..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sendingMessage}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!input.trim() || sendingMessage}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <Send size={18} />
              </Button>
            </form>
          </GlassCard>

          {/* Quick Suggestions */}
          {messages.length < 2 && (
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <p className="text-text-secondary text-sm mb-3">
                Quick questions:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuickButton
                  text="What APR should I negotiate for?"
                  onClick={() => setInput("What APR should I negotiate for?")}
                />
                <QuickButton
                  text="How to negotiate lower payments?"
                  onClick={() =>
                    setInput("How can I negotiate lower monthly payments?")
                  }
                />
                <QuickButton
                  text="Explain mileage penalties"
                  onClick={() =>
                    setInput(
                      "Can you explain the mileage penalties in my lease?",
                    )
                  }
                />
                <QuickButton
                  text="Is this deal fair?"
                  onClick={() =>
                    setInput(
                      "Is this a fair lease deal based on current market rates?",
                    )
                  }
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ChatMessage({ message }) {
  return (
    <div
      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-xs lg:max-w-md rounded-lg p-4 ${
          message.type === "user"
            ? "bg-accent-blue/20 border border-accent-blue/30 text-text-primary"
            : message.type === "error"
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-white/10 border border-white/20 text-text-secondary"
        }`}
      >
        <p className="text-sm">{message.text}</p>
        <p className="text-xs opacity-70 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function QuickButton({ text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-3 rounded-lg glass-card border border-white/10 text-left text-sm text-text-secondary hover:text-text-primary hover:border-accent-blue/50 transition-all duration-200"
    >
      {text}
    </button>
  );
}
