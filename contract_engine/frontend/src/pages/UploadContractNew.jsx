import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { uploadContract, extractSLA } from "../services/api";
import { Upload, FileText, Check } from "react-feather";

export default function UploadContractPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadedContract, setUploadedContract] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ["application/pdf", "image/png", "image/jpeg"];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Please upload a PDF or image file (JPG, PNG)");
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const response = await uploadContract(file);
      setUploadedContract(response);
      setSuccess("Contract uploaded successfully!");
      setFile(null);
      sessionStorage.setItem("document_id", response.document_id);

      if (response.document_id) {
        handleExtractSLA(response.document_id);
      }
    } catch (err) {
      setError(
        err.detail ||
          err.message ||
          "Failed to upload contract. Please try again.",
      );
      setUploading(false);
    }
  };

  const handleExtractSLA = async (docId) => {
    setAnalyzing(true);
    try {
      await extractSLA(docId);
      setSuccess("SLA extracted successfully!");
      setTimeout(() => {
        navigate("/analysis");
      }, 1500);
    } catch (err) {
      setError("Failed to extract SLA data");
      setAnalyzing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-accent-blue", "bg-accent-blue/5");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("border-accent-blue", "bg-accent-blue/5");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-accent-blue", "bg-accent-blue/5");
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Upload Contract
            </h1>
            <p className="text-text-secondary">
              Upload a PDF or image of your lease agreement for analysis
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <Alert
              type="error"
              title="Upload Error"
              message={error}
              onClose={() => setError("")}
              className="mb-6"
            />
          )}
          {success && (
            <Alert
              type="success"
              title="Success"
              message={success}
              onClose={() => setSuccess("")}
              className="mb-6"
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Area */}
            <div className="lg:col-span-2 animate-slide-up">
              <GlassCard noPadding className="p-0 overflow-hidden">
                <form onSubmit={handleUpload} className="p-8">
                  {/* Drag and Drop Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-accent-blue hover:bg-accent-blue/5"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-accent-blue/10 mb-4">
                      <Upload size={32} className="text-accent-blue" />
                    </div>

                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                      Drag and drop your contract
                    </h3>
                    <p className="text-text-secondary mb-4">
                      or click to browse your files
                    </p>

                    <p className="text-text-tertiary text-sm">
                      Supported formats: PDF, JPG, PNG (Max 10MB)
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Selected File */}
                  {file && (
                    <div className="mt-8 p-4 rounded-xl bg-accent-blue/10 border border-accent-blue/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText size={24} className="text-accent-blue" />
                          <div>
                            <p className="font-semibold text-text-primary">
                              {file.name}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-text-secondary hover:text-text-primary"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="mt-8 flex gap-4">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={uploading || analyzing}
                      disabled={!file || uploading || analyzing}
                      className="flex-1"
                    >
                      {uploading
                        ? "Uploading..."
                        : analyzing
                          ? "Analyzing..."
                          : "Upload & Analyze"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => navigate("/dashboard")}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </GlassCard>

              {/* Upload Status */}
              {uploadedContract && (
                <div className="mt-8 animate-slide-up">
                  <GlassCard className="p-6 border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Check size={24} className="text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-400">
                          Upload Complete
                        </h4>
                        <p className="text-text-secondary text-sm mt-1">
                          Your contract is being analyzed. Redirecting to
                          analysis page...
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )}
            </div>

            {/* Tips */}
            <div
              className="lg:col-span-1 animate-slide-in-right"
              style={{ animationDelay: "0.2s" }}
            >
              <GlassCard className="p-6 sticky top-8">
                <h3 className="font-semibold text-text-primary mb-4">
                  Tips for Best Results
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="text-accent-orange font-semibold flex-shrink-0">
                      1.
                    </span>
                    <span className="text-text-secondary text-sm">
                      Use high-quality, clear images
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-orange font-semibold flex-shrink-0">
                      2.
                    </span>
                    <span className="text-text-secondary text-sm">
                      Ensure all text is readable
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-orange font-semibold flex-shrink-0">
                      3.
                    </span>
                    <span className="text-text-secondary text-sm">
                      Include all relevant pages
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-orange font-semibold flex-shrink-0">
                      4.
                    </span>
                    <span className="text-text-secondary text-sm">
                      File size under 10MB
                    </span>
                  </li>
                </ul>

                <div className="mt-6 p-4 rounded-xl bg-accent-blue/10 border border-accent-blue/30">
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-accent-blue">
                      Pro Tip:
                    </span>{" "}
                    Our AI extracts APR, payment terms, and penalty clauses
                    automatically
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
