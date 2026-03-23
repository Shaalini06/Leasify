import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Radar } from "react-chartjs-2";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { uploadContract, extractSLA, analyzeContract, downloadPDFReport } from "../services/api";
import { Upload, FileText, Check, AlertTriangle, CheckCircle, TrendingUp, Shield, Download } from "react-feather";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
);

function extractNumeric(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/,/g, "");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function riskGaugeValue(level) {
  const key = String(level || "").toLowerCase();
  if (key === "low") return 25;
  if (key === "medium") return 60;
  if (key === "high") return 90;
  return 0;
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toDisplayText(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (Array.isArray(item)) {
    return item.map((entry) => toDisplayText(entry)).filter(Boolean).join(" ");
  }
  if (typeof item === "object") {
    const preferredKeys = ["message", "detail", "issue", "text", "label", "title", "description"];
    for (const key of preferredKeys) {
      const value = item[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    const objectValues = Object.values(item).map((value) => toDisplayText(value)).filter(Boolean);
    if (objectValues.length > 0) return objectValues.join(" | ");
  }
  return "";
}

function SkeletonCard({ className = "" }) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="skeleton h-4 w-32 mb-4" />
      <div className="skeleton h-8 w-20 mb-3" />
      <div className="skeleton h-3 w-48" />
    </div>
  );
}

function riskLevelColor(level) {
  const key = String(level || "").toLowerCase();
  if (key === "high") return "text-red-400";
  if (key === "medium") return "text-yellow-400";
  return "text-green-400";
}

function dealCategoryStyle(category) {
  const key = String(category || "").toLowerCase();
  if (key === "good") return { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" };
  if (key === "mid") return { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-300" };
  return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" };
}

export default function UploadContractPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const initialTab = searchParams.get("tab") === "analysis" ? "analysis" : "upload";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadedContract, setUploadedContract] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const autoAnalyzedByDocumentRef = useRef(new Set());

  const savedDocumentId = sessionStorage.getItem("document_id") || "";
  const queryDocumentId = searchParams.get("id") || "";
  const activeDocumentId = queryDocumentId || savedDocumentId;
  const scoreBreakdown = analysisData?.score_breakdown || {};
  const breakdownItems = Object.values(scoreBreakdown)
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      label: String(item.label || `Section ${index + 1}`),
      score: clamp(toFiniteNumber(item.score, 0), 0, 100),
    }));

  const completeness = analysisData?.sla_completeness || {
    present_fields: 0,
    total_fields: 8,
    completion_percent: 0,
  };

  const dealScore = clamp(toFiniteNumber(analysisData?.deal_score, 0), 0, 100);
  const riskScore = clamp(toFiniteNumber(riskGaugeValue(analysisData?.risk_level), 0), 0, 100);
  const completionPercent = clamp(toFiniteNumber(completeness?.completion_percent, 0), 0, 100);

  const doughnutData = {
    labels: ["Deal Score", "Gap"],
    datasets: [{
      data: [dealScore, Math.max(0, 100 - dealScore)],
      backgroundColor: ["rgba(220, 38, 38, 0.85)", "rgba(220, 38, 38, 0.12)"],
      borderWidth: 0,
    }],
  };

  const riskDoughnutData = {
    labels: ["Risk Weight", "Remaining"],
    datasets: [{
      data: [riskScore, Math.max(0, 100 - riskScore)],
      backgroundColor: ["rgba(245, 158, 11, 0.85)", "rgba(245, 158, 11, 0.12)"],
      borderWidth: 0,
    }],
  };

  const radarData = {
    labels: breakdownItems.map((item) => item.label),
    datasets: [{
      label: "Section Score",
      data: breakdownItems.map((item) => item.score),
      backgroundColor: "rgba(220, 38, 38, 0.15)",
      borderColor: "rgba(248, 113, 113, 0.9)",
      pointBackgroundColor: "rgba(248, 113, 113, 1)",
    }],
  };

  const issueItems = (Array.isArray(analysisData?.issues) ? analysisData.issues : [])
    .map((item) => toDisplayText(item)).filter(Boolean);
  const goodClauseItems = (Array.isArray(analysisData?.good_clauses) ? analysisData.good_clauses : [])
    .map((item) => toDisplayText(item)).filter(Boolean);
  const suggestionItems = (Array.isArray(analysisData?.negotiation_suggestions) ? analysisData.negotiation_suggestions : [])
    .map((item) => toDisplayText(item)).filter(Boolean);
  const detailedFindingItems = (Array.isArray(analysisData?.detailed_findings) ? analysisData.detailed_findings : [])
    .map((item) => toDisplayText(item)).filter(Boolean);

  const vehicleData = analysisData?.vehicle_data || {};
  const marketData = analysisData?.vehicle_market_data || {};
  const vinStatus = analysisData?.vin_status || "unknown";
  const verdict = analysisData?.verdict || "";

  const barData = {
    labels: ["APR", "Loan Term", "Monthly", "Total"],
    datasets: [{
      label: "SLA Numeric Profile",
      data: [
        toFiniteNumber(extractNumeric(slaData?.apr), 0),
        toFiniteNumber(extractNumeric(slaData?.loan_term), 0),
        toFiniteNumber(extractNumeric(slaData?.monthly_payment), 0),
        toFiniteNumber(extractNumeric(slaData?.total_payment), 0),
      ],
      backgroundColor: [
        "rgba(220, 38, 38, 0.7)",
        "rgba(34, 197, 94, 0.7)",
        "rgba(245, 158, 11, 0.7)",
        "rgba(168, 85, 247, 0.7)",
      ],
    }],
  };

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (queryTab === "upload" || queryTab === "analysis") {
      setActiveTab(queryTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const bootstrapAnalysis = async () => {
      if (activeTab !== "analysis" || !activeDocumentId || analyzing) return;
      if (autoAnalyzedByDocumentRef.current.has(String(activeDocumentId))) return;
      autoAnalyzedByDocumentRef.current.add(String(activeDocumentId));
      await runAnalysisFlow(activeDocumentId, false);
    };
    bootstrapAnalysis();
  }, [activeTab, activeDocumentId]);

  useEffect(() => {
    if (!activeDocumentId) {
      setSlaData(null);
      setAnalysisData(null);
    }
  }, [activeDocumentId]);

  const setTab = (tabName, docId = activeDocumentId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabName);
    if (docId) { nextParams.set("id", String(docId)); } else { nextParams.delete("id"); }
    setSearchParams(nextParams);
    setActiveTab(tabName);
  };

  const runAnalysisFlow = async (docId, showSuccessMessage = true) => {
    setAnalyzing(true);
    setError("");
    try {
      const slaResponse = await extractSLA(docId);
      setSlaData(slaResponse?.sla_data || null);
      try {
        const analysisResponse = await analyzeContract(docId);
        setAnalysisData(analysisResponse || null);
      } catch (analysisError) {
        setAnalysisData(null);
        setError(analysisError?.response?.data?.detail || "SLA extraction completed, but detailed analysis failed.");
      }
      setTab("analysis", docId);
      if (showSuccessMessage) setSuccess("Contract processed. Analysis tab opened with latest results.");
    } catch (extractError) {
      setError(extractError?.response?.data?.detail || "Upload succeeded, but SLA extraction failed.");
    } finally {
      setAnalyzing(false);
    }
  };

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
    if (!file) { setError("Please select a file"); return; }
    setUploading(true);
    setError("");
    try {
      const response = await uploadContract(file);
      setUploadedContract(response);
      setSuccess("Contract uploaded successfully!");
      setFile(null);
      sessionStorage.setItem("document_id", response.document_id);
      if (response.document_id) await runAnalysisFlow(response.document_id, true);
    } catch (err) {
      setError(err.detail || err.message || "Failed to upload contract. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add("border-accent-red", "bg-accent-red/5"); };
  const handleDragLeave = (e) => { e.currentTarget.classList.remove("border-accent-red", "bg-accent-red/5"); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-accent-red", "bg-accent-red/5");
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleDownloadPDF = () => {
    if (activeDocumentId) downloadPDFReport(activeDocumentId, `contract_${activeDocumentId}`);
  };

  const catStyle = dealCategoryStyle(analysisData?.deal_category);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />
      <main className="main-content flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">Contract Workspace</h1>
            <p className="text-text-secondary">Upload contract files and review analysis results in one place</p>
          </div>

          {/* Tab Switcher */}
          <div className="mb-6 animate-slide-up">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
              <button type="button" onClick={() => setTab("upload")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "upload"
                    ? "bg-accent-red/20 text-text-primary border border-accent-red/30"
                    : "text-text-secondary hover:text-text-primary"
                }`}>
                Upload
              </button>
              <button type="button" onClick={() => setTab("analysis")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "analysis"
                    ? "bg-accent-gold/15 text-text-primary border border-accent-gold/30"
                    : "text-text-secondary hover:text-text-primary"
                }`}>
                Analysis
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && <Alert type="error" title="Error" message={error} onClose={() => setError("")} className="mb-6" />}
          {success && <Alert type="success" title="Success" message={success} onClose={() => setSuccess("")} className="mb-6" />}

          {/* ══════════ UPLOAD TAB ══════════ */}
          {activeTab === "upload" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 animate-slide-up">
                <GlassCard noPadding className="p-0 overflow-hidden">
                  <form onSubmit={handleUpload} className="p-8">
                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/15 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-accent-red hover:bg-accent-red/5">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent-red/10 mb-4">
                        <Upload size={32} className="text-accent-red-light" />
                      </div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">Drag and drop your contract</h3>
                      <p className="text-text-secondary mb-4">or click to browse your files</p>
                      <p className="text-text-tertiary text-sm">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
                      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                    </div>

                    {file && (
                      <div className="mt-8 p-4 rounded-xl bg-accent-red/10 border border-accent-red/25">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText size={24} className="text-accent-red-light" />
                            <div>
                              <p className="font-semibold text-text-primary">{file.name}</p>
                              <p className="text-sm text-text-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setFile(null)} className="text-text-secondary hover:text-text-primary">✕</button>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex gap-4">
                      <Button type="submit" variant="primary" size="lg" loading={uploading || analyzing} disabled={!file || uploading || analyzing} className="flex-1">
                        {uploading ? "Uploading..." : analyzing ? "Analyzing..." : "Upload & Analyze"}
                      </Button>
                      <Button type="button" variant="secondary" size="lg" onClick={() => navigate("/dashboard")}>Cancel</Button>
                    </div>
                  </form>
                </GlassCard>

                {uploadedContract && (
                  <div className="mt-8 animate-slide-up">
                    <GlassCard className="p-6 border-green-500/30 bg-green-500/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <Check size={24} className="text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-400">Upload Complete</h4>
                          <p className="text-text-secondary text-sm mt-1">Processing complete. Open the Analysis tab for results.</p>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                )}
              </div>

              {/* Tips Sidebar */}
              <div className="lg:col-span-1 animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
                <GlassCard className="p-6 sticky top-8">
                  <h3 className="font-semibold text-text-primary mb-4">Tips for Best Results</h3>
                  <ul className="space-y-4">
                    {["Use high-quality, clear images", "Ensure all text is readable", "Include all relevant pages", "File size under 10MB"].map((tip, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-accent-red font-semibold flex-shrink-0">{i + 1}.</span>
                        <span className="text-text-secondary text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 p-4 rounded-xl bg-accent-red/8 border border-accent-red/20">
                    <p className="text-sm text-text-secondary">
                      <span className="font-semibold text-accent-red-light">Pro Tip:</span>{" "}
                      Our AI extracts APR, payment terms, and penalty clauses automatically
                    </p>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* ══════════ ANALYSIS TAB ══════════ */}
          {activeTab === "analysis" && (
            <div className="animate-slide-up space-y-6">
              {!activeDocumentId && (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">No Contract Selected</h3>
                  <p className="text-text-secondary text-sm mb-4">Upload a contract first, then this tab will show analysis results.</p>
                  <Button type="button" variant="primary" onClick={() => setTab("upload")}>Go to Upload</Button>
                </GlassCard>
              )}

              {activeDocumentId && (
                <>
                  {/* Header bar */}
                  <GlassCard className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-text-primary">Analysis Results</h3>
                        <p className="text-text-secondary text-sm mt-1">Document ID: {activeDocumentId}</p>
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="secondary" loading={analyzing} disabled={analyzing}
                          onClick={() => { autoAnalyzedByDocumentRef.current.delete(String(activeDocumentId)); runAnalysisFlow(activeDocumentId, false); }}>
                          {analyzing ? "Refreshing..." : "Refresh"}
                        </Button>
                        {analysisData && (
                          <Button type="button" variant="primary" onClick={handleDownloadPDF} className="flex items-center gap-2">
                            <Download size={16} /> PDF Report
                          </Button>
                        )}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Loading Skeleton */}
                  {analyzing && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <SkeletonCard /><SkeletonCard /><SkeletonCard />
                      <SkeletonCard className="lg:col-span-2" /><SkeletonCard />
                    </div>
                  )}

                  {/* Empty State */}
                  {!analyzing && !analysisData && !slaData && (
                    <GlassCard className="p-6">
                      <p className="text-text-secondary text-sm">Analysis results are not available yet. Use Refresh.</p>
                    </GlassCard>
                  )}

                  {/* ─── Results Grid ─── */}
                  {!analyzing && (analysisData || slaData) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Verdict Banner */}
                      {verdict && (
                        <div className={`lg:col-span-3 p-5 rounded-xl border ${catStyle.border} ${catStyle.bg}`}>
                          <div className="flex items-start gap-3">
                            <Shield size={22} className={catStyle.text} />
                            <div>
                              <h4 className={`font-bold text-base ${catStyle.text}`}>AI Verdict</h4>
                              <p className="text-text-secondary text-sm mt-1">{verdict}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fairness Score */}
                      <GlassCard className="p-6 lg:col-span-1">
                        <p className="text-text-tertiary text-xs mb-1 uppercase tracking-wide">Fairness Score</p>
                        <p className={`text-4xl font-extrabold ${catStyle.text}`}>{dealScore}<span className="text-lg text-text-tertiary">/100</span></p>
                        <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}>
                          {String(analysisData?.deal_category || "N/A").toUpperCase()}
                        </span>
                      </GlassCard>

                      {/* Risk Level */}
                      <GlassCard className="p-6 lg:col-span-1">
                        <p className="text-text-tertiary text-xs mb-1 uppercase tracking-wide">Risk Level</p>
                        <p className={`text-4xl font-extrabold ${riskLevelColor(analysisData?.risk_level)}`}>{analysisData?.risk_level || "N/A"}</p>
                        <p className="text-text-tertiary text-xs mt-2">{issueItems.length} issue(s) detected</p>
                      </GlassCard>

                      {/* Completeness */}
                      <GlassCard className="p-6 lg:col-span-1">
                        <p className="text-text-tertiary text-xs mb-1 uppercase tracking-wide">SLA Completeness</p>
                        <p className="text-4xl font-extrabold text-text-primary">{completionPercent.toFixed(0)}%</p>
                        <div className="w-full h-2.5 bg-white/8 rounded-full overflow-hidden mt-3">
                          <div className="h-full bg-gradient-to-r from-accent-red to-accent-red-light rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(4, completionPercent)}%` }} />
                        </div>
                        <p className="text-xs text-text-secondary mt-2">{completeness.present_fields}/{completeness.total_fields} fields</p>
                      </GlassCard>

                      {/* SLA Table */}
                      {slaData && (
                        <GlassCard className="p-6 lg:col-span-3">
                          <h4 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-accent-red-light" /> SLA Extraction
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: "APR", value: slaData.apr, suffix: "%" },
                              { label: "Loan Term", value: slaData.loan_term, suffix: " mo" },
                              { label: "Monthly Payment", value: slaData.monthly_payment, prefix: "$" },
                              { label: "Total Payment", value: slaData.total_payment, prefix: "$" },
                              { label: "Due Date", value: slaData.due_date },
                              { label: "Lender", value: slaData.lender_name },
                              { label: "Borrower", value: slaData.borrower_name },
                              { label: "VIN", value: slaData.vin },
                            ].map((field) => (
                              <div key={field.label} className="p-3 rounded-lg bg-white/5 border border-white/8">
                                <p className="text-text-tertiary text-xs">{field.label}</p>
                                <p className="font-semibold text-text-primary mt-1 text-sm">
                                  {field.prefix || ""}{field.value || "—"}{field.value ? (field.suffix || "") : ""}
                                </p>
                              </div>
                            ))}
                          </div>
                        </GlassCard>
                      )}

                      {/* VIN Status */}
                      {vinStatus && vinStatus !== "valid" && vinStatus !== "missing" && (
                        <div className="lg:col-span-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/8">
                          <div className="flex items-center gap-3">
                            <AlertTriangle size={18} className="text-yellow-400" />
                            <p className="text-sm text-yellow-300">
                              VIN Status: <strong>{vinStatus}</strong> — {vinStatus === "invalid" ? "VIN format is invalid. Analysis continued without VIN decode." : "VIN decode failed. Analysis continued with available data."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Risks - RED */}
                      <GlassCard className="p-6 lg:col-span-2">
                        <h4 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                          <AlertTriangle size={18} className="text-red-400" /> Risks Detected
                        </h4>
                        {issueItems.length > 0 ? (
                          <div className="space-y-2">
                            {issueItems.map((issue, index) => (
                              <div key={`${issue}-${index}`} className="clause-bad p-3 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                <span className="text-sm">{issue}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-green-400">✓ No major risks detected.</p>
                        )}
                      </GlassCard>

                      {/* Good Clauses - GREEN */}
                      <GlassCard className="p-6 lg:col-span-1">
                        <h4 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                          <CheckCircle size={18} className="text-green-400" /> Positives
                        </h4>
                        {goodClauseItems.length > 0 ? (
                          <div className="space-y-2">
                            {goodClauseItems.map((clause, index) => (
                              <div key={`${clause}-${index}`} className="clause-good p-3 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                                <span className="text-sm">{clause}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary">No specific positives highlighted.</p>
                        )}
                      </GlassCard>

                      {/* Market Price Comparison */}
                      {marketData.estimated_market_price && (
                        <GlassCard className="p-6 lg:col-span-3">
                          <h4 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                            <TrendingUp size={18} className="text-accent-gold" /> Market Price Comparison
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                              <p className="text-text-tertiary text-xs">Vehicle</p>
                              <p className="font-semibold text-text-primary text-sm mt-1">
                                {marketData.make} {marketData.model} {marketData.year}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                              <p className="text-text-tertiary text-xs">Est. Market Price</p>
                              <p className="font-semibold text-accent-gold text-sm mt-1">${marketData.estimated_market_price?.toLocaleString()}</p>
                            </div>
                            {marketData.estimated_market_price_min && (
                              <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                                <p className="text-text-tertiary text-xs">Min Price</p>
                                <p className="font-semibold text-text-primary text-sm mt-1">${marketData.estimated_market_price_min?.toLocaleString()}</p>
                              </div>
                            )}
                            {marketData.estimated_market_price_max && (
                              <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                                <p className="text-text-tertiary text-xs">Max Price</p>
                                <p className="font-semibold text-text-primary text-sm mt-1">${marketData.estimated_market_price_max?.toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </GlassCard>
                      )}

                      {/* Charts Row */}
                      <GlassCard className="p-6 lg:col-span-1">
                        <h4 className="text-sm font-semibold text-text-primary mb-3">Deal Score</h4>
                        <div className="max-w-[170px] mx-auto">
                          <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } } }} />
                        </div>
                      </GlassCard>
                      <GlassCard className="p-6 lg:col-span-1">
                        <h4 className="text-sm font-semibold text-text-primary mb-3">Risk Gauge</h4>
                        <div className="max-w-[170px] mx-auto">
                          <Doughnut data={riskDoughnutData} options={{ plugins: { legend: { display: false } } }} />
                        </div>
                      </GlassCard>
                      <GlassCard className="p-6 lg:col-span-1">
                        <h4 className="text-sm font-semibold text-text-primary mb-3">SLA Numeric Chart</h4>
                        <Bar data={barData} options={{
                          scales: {
                            x: { ticks: { color: "#71717a" }, grid: { color: "rgba(255,255,255,0.05)" } },
                            y: { ticks: { color: "#71717a" }, grid: { color: "rgba(255,255,255,0.05)" } },
                          },
                          plugins: { legend: { display: false } },
                        }} />
                      </GlassCard>

                      {/* Radar */}
                      {breakdownItems.length > 0 && (
                        <GlassCard className="p-6 lg:col-span-2">
                          <h4 className="text-base font-semibold text-text-primary mb-3">Score Breakdown</h4>
                          <Radar data={radarData} options={{
                            scales: {
                              r: {
                                angleLines: { color: "rgba(255,255,255,0.08)" },
                                grid: { color: "rgba(255,255,255,0.08)" },
                                pointLabels: { color: "#b4b4b8", font: { size: 11 } },
                                ticks: { display: false },
                                suggestedMin: 0, suggestedMax: 20,
                              },
                            },
                            plugins: { legend: { display: false } },
                          }} />
                        </GlassCard>
                      )}

                      {/* Suggestions */}
                      <GlassCard className={`p-6 ${breakdownItems.length > 0 ? "lg:col-span-1" : "lg:col-span-3"}`}>
                        <h4 className="text-base font-semibold text-text-primary mb-3">Negotiation Tips</h4>
                        {suggestionItems.length > 0 ? (
                          <ol className="space-y-2">
                            {suggestionItems.map((item, index) => (
                              <li key={`${item}-${index}`} className="text-sm text-text-secondary flex gap-2">
                                <span className="text-accent-gold font-bold flex-shrink-0">{index + 1}.</span> {item}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm text-text-secondary">Suggestions will appear after analysis.</p>
                        )}
                      </GlassCard>

                      {/* Detailed Findings */}
                      {detailedFindingItems.length > 0 && (
                        <GlassCard className="p-6 lg:col-span-3">
                          <h4 className="text-base font-semibold text-text-primary mb-3">Detailed Findings</h4>
                          <ul className="space-y-2">
                            {detailedFindingItems.map((finding, index) => (
                              <li key={`${finding}-${index}`} className="text-sm text-text-secondary">• {finding}</li>
                            ))}
                          </ul>
                        </GlassCard>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
