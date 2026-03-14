import { useState } from "react";
import Navbar from "../components/Navbar";
import ChatWindow from "../components/ChatWindow";
import { chatWithAssistant } from "../services/api";

export default function ChatAssistant() {
  const documentId = sessionStorage.getItem("document_id");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (text) => {
    // Append user message immediately for responsive UI.
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const data = await chatWithAssistant(text, Number(documentId));
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      const detail =
        err.response?.data?.detail || "Failed to get advice. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `⚠️ ${detail}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />

      <main
        className="flex-1 ml-64 p-8 flex flex-col"
        style={{ height: "100vh" }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Negotiation Assistant
        </h2>

        {!documentId && (
          <p className="text-gray-400 mb-4">
            Upload a contract first so the assistant has context.
          </p>
        )}

        <div className="flex-1 min-h-0">
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}
