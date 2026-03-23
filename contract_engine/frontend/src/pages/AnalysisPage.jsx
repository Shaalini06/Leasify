import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
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
import { Spinner } from "../components/LoadingSpinner";
import Alert from "../components/Alert";
import { analyzeContract, extractSLA, getUserContracts, downloadPDFReport } from "../services/api";
import { RefreshCw, Download } from "react-feather";

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

function formatPercent(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "N/A";
  }
  const text = String(value).trim();
  return text.includes("%") ? text : `${text}%`;
}

function formatMoney(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "$N/A";
  }
  const parsed = extractNumeric(value);
  if (parsed === null) return String(value).startsWith("$") ? String(value) : `$${value}`;
  return `$${parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatLoanTerm(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "N/A";
  const text = String(value).trim();
  return /month|mo/i.test(text) ? text : `${text} months`;
}

function categoryClass(category) {
  const key = String(category || "").toLowerCase();
  if (key === "good") return "bg-green-500/15 text-green-300 border-green-500/40";
  if (key === "mid") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/40";
  return "bg-red-500/15 text-red-300 border-red-500/40";
}

function riskClass(level) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "low") return "bg-green-500/10 text-green-400 border-green-500/30";
  if (normalized === "medium") return "bg-yellow-500/10 text-yellow-300 border-yellow-500/30";
  return "bg-red-500/10 text-red-400 border-red-500/30";
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
    return item
      .map((entry) => toDisplayText(entry))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof item === "object") {
    const preferredKeys = ["message", "detail", "issue", "text", "label", "title", "description"];
    for (const key of preferredKeys) {
      const value = item[key];
      if (typeof value === "string" && value.trim()) return value;
    }

    const values = Object.values(item)
      .map((value) => toDisplayText(value))
      .filter(Boolean);
    if (values.length > 0) return values.join(" | ");
  }

  return "";
}

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [sla, setSla] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [documentId, setDocumentId] = useState(
    new URLSearchParams(location.search).get("id") || sessionStorage.getItem("document_id") || "",
  );

  const handleDownloadPDF = () => {
    if (!documentId) return;
    downloadPDFReport(documentId, `contract_${documentId}`);
  };

  const runExtractionAndAnalysis = async (showSuccessMessage = true, targetDocumentId = null) => {
    const activeDocumentId = String(targetDocumentId || documentId || "");

    if (!activeDocumentId) {
      setError("No contract selected. Please upload a contract first.");
      return;
    }

    setExtracting(true);
    setError("");
    setInfo("");

    try {
      const slaResponse = await extractSLA(activeDocumentId);
      setSla(slaResponse?.sla_data || null);

      const analysisResponse = await analyzeContract(activeDocumentId);
      setAnalysis(analysisResponse);

      if (showSuccessMessage) {
        setInfo("SLA extraction and detailed scoring report refreshed.");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to extract/analyze this contract.");
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      let bootstrapDocumentId = documentId;

      if (!documentId) {
        try {
          const contractsResponse = await getUserContracts();
          const contracts = Array.isArray(contractsResponse?.contracts)
            ? contractsResponse.contracts
            : [];

          const fallbackContract = contracts.find((item) => item.analyzed) || contracts[0];

          if (!fallbackContract?.document_id) {
            setError("No contract selected. Please upload a contract first.");
            setLoading(false);
            return;
          }

          const fallbackId = String(fallbackContract.document_id);
          sessionStorage.setItem("document_id", fallbackId);
          setDocumentId(fallbackId);
          bootstrapDocumentId = fallbackId;
        } catch (contractsError) {
          setError("Failed to load a contract for analysis. Please try again.");
          setLoading(false);
          return;
        }
      }

      await runExtractionAndAnalysis(false, bootstrapDocumentId);
      setLoading(false);
    };

    bootstrap();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
        <Navbar />
        <main className="flex-1 ml-72 flex items-center justify-center">
          <Spinner size="lg" />
        </main>
      </div>
    );
  }

  const hasAnalysis = Boolean(analysis);
  const hasSla = Boolean(sla);

  const issues = (Array.isArray(analysis?.issues) ? analysis.issues : [])
    .map((item) => toDisplayText(item))
    .filter(Boolean);
  const suggestions = (Array.isArray(analysis?.negotiation_suggestions)
    ? analysis.negotiation_suggestions
    : [])
    .map((item) => toDisplayText(item))
    .filter(Boolean);
  const scoreBreakdown = analysis?.score_breakdown || {};
  const breakdownItems = Object.values(scoreBreakdown)
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      label: String(item.label || `Section ${index + 1}`),
      score: clamp(toFiniteNumber(item.score, 0), 0, 100),
    }));
  const completeness = analysis?.sla_completeness || { present_fields: 0, total_fields: 8, completion_percent: 0 };
  const dealScore = clamp(toFiniteNumber(analysis?.deal_score, 0), 0, 100);
  const dealCategory = String(analysis?.deal_category || "bad");

  const radarData = {
    labels: breakdownItems.map((item) => item.label),
    datasets: [
      {
        label: "Score Segment",
        data: breakdownItems.map((item) => item.score),
        backgroundColor: "rgba(220,38,38,0.15)",
        borderColor: "rgba(248,113,113,0.95)",
        pointBackgroundColor: "rgba(248,113,113,1)",
      },
    ],
  };

  const barData = {
    labels: ["APR", "Loan Term", "Monthly Payment", "Total Payment"],
    datasets: [
      {
        label: "Extracted SLA Values",
        data: [
          extractNumeric(sla?.apr) || 0,
          extractNumeric(sla?.loan_term) || 0,
          extractNumeric(sla?.monthly_payment) || 0,
          extractNumeric(sla?.total_payment) || 0,
        ],
        backgroundColor: [
          "rgba(220,38,38,0.7)",
          "rgba(20,184,166,0.7)",
          "rgba(245,158,11,0.7)",
          "rgba(34,197,94,0.7)",
        ],
      },
    ],
  };

  const doughnutData = {
    labels: ["Deal Score", "Gap to Perfect"],
    datasets: [
      {
        data: [dealScore, Math.max(0, 100 - dealScore)],
        backgroundColor: dealCategory === "good"
          ? ["rgba(34,197,94,0.85)", "rgba(34,197,94,0.15)"]
          : dealCategory === "mid"
            ? ["rgba(250,204,21,0.85)", "rgba(250,204,21,0.15)"]
            : ["rgba(239,68,68,0.85)", "rgba(239,68,68,0.15)"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />
      <main className="main-content flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between animate-fade-in">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">Detailed SLA Analysis</h1>
              <p className="text-text-secondary">Score-wise report with risk findings and visual insights.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={handleDownloadPDF}
                disabled={!documentId || extracting}
              >
                <Download size={16} />
                Download PDF Report
              </Button>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => runExtractionAndAnalysis(true)}
                disabled={!documentId || extracting}
                loading={extracting}
              >
                <RefreshCw size={16} />
                Re-Run Extraction
              </Button>
            </div>
          </div>

          {error && (
            <Alert
              type="error"
              title="Analysis Error"
              message={error}
              onClose={() => setError("")}
              className="mb-6"
            />
          )}
          {info && (
            <Alert
              type="success"
              title="Status"
              message={info}
              onClose={() => setInfo("")}
              className="mb-6"
            />
          )}

          {(analysis?.verdict || analysis?.summary_paragraph) && (
            <GlassCard className="mb-8 p-6" hover={false}>
              <h3 className="text-lg font-semibold text-text-primary mb-3">Analysis Verdict</h3>
              {analysis?.verdict && (
                <p className="text-text-secondary text-sm mb-3 text-wrap">
                  {analysis.verdict}
                </p>
              )}
              {analysis?.summary_paragraph && (
                <p className="text-text-primary text-sm leading-relaxed text-wrap">
                  {analysis.summary_paragraph}
                </p>
              )}
            </GlassCard>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 animate-slide-up">
            <SLADataCard label="APR" value={formatPercent(sla?.apr)} icon="📊" />
            <SLADataCard label="Monthly" value={formatMoney(sla?.monthly_payment)} icon="💵" />
            <SLADataCard label="Term" value={formatLoanTerm(sla?.loan_term)} icon="📅" />
            <SLADataCard label="Total" value={formatMoney(sla?.total_payment)} icon="🧾" />
            <GlassCard className="p-4 text-center" hover={false}>
              <p className="text-text-tertiary text-xs mb-2">Deal Score</p>
              <p className={`text-3xl font-bold ${dealCategory === "good" ? "text-green-400" : dealCategory === "mid" ? "text-yellow-300" : "text-red-400"}`}>
                {dealScore}/100
              </p>
              <span className={`mt-2 inline-flex text-xs font-semibold px-2 py-1 rounded-full border ${categoryClass(dealCategory)}`}>
                {dealCategory.toUpperCase()}
              </span>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <GlassCard className="lg:col-span-1" hover={false}>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Risk Summary</h3>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-text-secondary">Overall Risk</p>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${riskClass(analysis?.risk_level)}`}>
                  {String(analysis?.risk_level || "Unknown").toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                {issues.length > 0 ? issues.map((issue, index) => (
                  <div key={`${issue}-${index}`} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-text-secondary text-wrap">
                    {issue}
                  </div>
                )) : (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
                    No major risk flags detected.
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="lg:col-span-2" hover={false}>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Detailed SLA Extraction Coverage</h3>
              <div className="mb-4">
                <p className="text-sm text-text-secondary mb-1">
                  Fields Extracted: {completeness.present_fields}/{completeness.total_fields}
                </p>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${completeness.completion_percent >= 85 ? "bg-green-500" : completeness.completion_percent >= 65 ? "bg-yellow-400" : "bg-red-500"}`}
                    style={{ width: `${Math.max(4, Number(completeness.completion_percent || 0))}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ExtractionRow label="Borrower" value={sla?.borrower_name} />
                <ExtractionRow label="Lender" value={sla?.lender_name} />
                <ExtractionRow label="Due Date" value={sla?.due_date} />
                <ExtractionRow label="VIN" value={sla?.vin} />
              </div>
            </GlassCard>
          </div>

          {(hasAnalysis || hasSla) && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {hasAnalysis ? (
                <GlassCard className="xl:col-span-1" hover={false}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Overall Score</h3>
                  <div className="max-w-xs mx-auto">
                    <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } } }} />
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="xl:col-span-1" hover={false}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Overall Score</h3>
                  <p className="text-text-secondary text-sm">Analysis not available yet.</p>
                </GlassCard>
              )}

              {hasAnalysis && breakdownItems.length > 0 ? (
                <GlassCard className="xl:col-span-1" hover={false}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Score Breakdown Radar</h3>
                  <Radar
                    data={radarData}
                    options={{
                      scales: {
                        r: {
                          angleLines: { color: "rgba(255,255,255,0.12)" },
                          grid: { color: "rgba(255,255,255,0.12)" },
                          pointLabels: { color: "#d4d4d8", font: { size: 11 } },
                          ticks: { display: false },
                          suggestedMin: 0,
                          suggestedMax: 20,
                        },
                      },
                      plugins: { legend: { display: false } },
                    }}
                  />
                </GlassCard>
              ) : (
                <GlassCard className="xl:col-span-1" hover={false}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Score Breakdown Radar</h3>
                  <p className="text-text-secondary text-sm">No score breakdown data available.</p>
                </GlassCard>
              )}

              {hasSla ? (
                <GlassCard className="xl:col-span-1" hover={false}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">SLA Numerical Profile</h3>
                  <Bar
                    data={barData}
                    options={{
                      scales: {
                        x: { ticks: { color: "#d4d4d8" }, grid: { color: "rgba(255,255,255,0.08)" } },
                        y: { ticks: { color: "#d4d4d8" }, grid: { color: "rgba(255,255,255,0.08)" } },
                      },
                      plugins: { legend: { display: false } },
                    }}
                  />
                </GlassCard>
              ) : (
                <GlassCard className="xl:col-span-1" hover={false}>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">SLA Numerical Profile</h3>
                  <p className="text-text-secondary text-sm">SLA extraction not available yet.</p>
                </GlassCard>
              )}
            </div>
          )}

          <GlassCard className="mb-8" hover={false}>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Score-Wise Detailed Report</h3>
            <div className="space-y-3 mb-5">
              {Object.entries(scoreBreakdown).map(([key, item]) => (
                <div key={key} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                  <p className="text-text-secondary text-sm">{item.label}</p>
                  <p className="font-semibold text-text-primary">{item.score}/{item.max_score}</p>
                </div>
              ))}
            </div>

            <h4 className="text-base font-semibold text-text-primary mb-3">Negotiation Suggestions</h4>
            <div className="space-y-3 mb-6">
              {suggestions.length > 0 ? suggestions.map((item, index) => (
                <SuggestionItem key={`${item}-${index}`} text={item} />
              )) : (
                <p className="text-text-secondary text-sm text-wrap">No suggestions available yet.</p>
              )}
            </div>

            <Button variant="primary" onClick={() => navigate("/chat")}>Chat with AI Advisor</Button>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}

function SLADataCard({ label, value, icon }) {
  return (
    <GlassCard className="p-4 text-center" hover={false}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-text-tertiary text-xs mb-2">{label}</p>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </GlassCard>
  );
}

function ExtractionRow({ label, value }) {
  const hasValue = String(value || "").trim().length > 0;
  return (
    <div className={`flex justify-between py-2 px-3 rounded-lg border ${hasValue ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
      <span className="text-text-secondary text-sm">{label}</span>
      <span className={`text-sm font-semibold ${hasValue ? "text-green-300" : "text-red-300"}`}>
        {hasValue ? value : "Missing"}
      </span>
    </div>
  );
}

function SuggestionItem({ text }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30">
      <span className="text-accent-red-light font-bold flex-shrink-0 text-lg">✓</span>
      <span className="text-text-secondary text-sm text-wrap">{text}</span>
    </div>
  );
}
