import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import UploadCard from "../components/UploadCard";
import { uploadContract } from "../services/api";

export default function UploadContract() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    setStatus("uploading");
    setError("");
    try {
      const data = await uploadContract(file);
      // Persist document_id so downstream pages can use it.
      sessionStorage.setItem("document_id", data.document_id);
      setStatus("success");
      // Redirect to analysis page after a brief delay.
      setTimeout(() => navigate("/analysis"), 800);
    } catch (err) {
      setStatus("error");
      setError(
        err.response?.data?.detail || "Upload failed. Please try again.",
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex-1 ml-64 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Upload Contract
        </h2>

        <UploadCard onUploadSuccess={handleFile} />

        {/* Status feedback */}
        {status === "uploading" && (
          <p className="mt-4 text-brand-orange font-medium animate-pulse">
            Uploading & extracting text…
          </p>
        )}
        {status === "success" && (
          <p className="mt-4 text-green-600 font-medium">
            Upload successful! Redirecting to analysis…
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-red-600 font-medium">{error}</p>
        )}
      </main>
    </div>
  );
}
