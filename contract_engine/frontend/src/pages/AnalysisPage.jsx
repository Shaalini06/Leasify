import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Input from "../components/Input";
import Button from "../components/Button";
import { Spinner } from "../components/LoadingSpinner";
import Alert from "../components/Alert";
import { analyzeContract, extractSLA, lookupVIN } from "../services/api";
import { Download, RefreshCw, Search } from "react-feather";


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
  if (parsed === null) {
    return String(value).startsWith("$") ? String(value) : `$${value}`;
  }
  return `$${parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}


function formatLoanTerm(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "N/A";
  }
  const text = String(value).trim();
  return /month|mo/i.test(text) ? text : `${text} months`;
}


function issueSeverity(issue, fallbackRiskLevel) {
  const text = String(issue || "").toLowerCase();
  if (
    text.includes("high") ||
    text.includes("overpriced") ||
    text.includes("risky")
  ) {
    return "high";
  }
  if (
    text.includes("long") ||
    text.includes("duration") ||
    text.includes("monthly")
  ) {
    return "medium";
  }

  const normalized = String(fallbackRiskLevel || "").toLowerCase();
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [sla, setSla] = useState(null);
  const [activeTab, setActiveTab] = useState("sla-vin");
  const [vinInput, setVinInput] = useState("");
  const [vinResult, setVinResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [lookingUpVin, setLookingUpVin] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const documentId =
    new URLSearchParams(location.search).get("id") ||
    sessionStorage.getItem("document_id");

  const runExtractionAndAnalysis = async (showSuccessMessage = true) => {
    if (!documentId) {
      setError("No contract selected. Please upload a contract first.");
      return;
    }

    setExtracting(true);
    setError("");
    setInfo("");

    try {
      const slaResponse = await extractSLA(documentId);
      const extractedSla = slaResponse?.sla_data || null;
      setSla(extractedSla);

      if (extractedSla?.vin) {
        setVinInput(String(extractedSla.vin));
      }

      let analysisWarning = "";
      try {
        const analysisResponse = await analyzeContract(documentId);
        setAnalysis(analysisResponse);
      } catch (analysisError) {
        setAnalysis(null);
        analysisWarning =
          analysisError?.response?.data?.detail ||
          "SLA extracted, but risk analysis could not be completed yet.";
      }

      if (showSuccessMessage) {
        setActiveTab("analysis");
        setInfo(
          analysisWarning
            ? `SLA extracted successfully. ${analysisWarning}`
            : "SLA extracted and risk analysis refreshed.",
        );
      } else if (analysisWarning) {
        setInfo(analysisWarning);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to extract SLA data. Please try again.",
      );
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    if (!documentId) {
      setError("No contract selected. Please upload a contract first.");
      setLoading(false);
      return;
    }

    const bootstrap = async () => {
      await runExtractionAndAnalysis(false);
      setLoading(false);
    };

    bootstrap();
  }, [documentId]);

  const handleLookupVin = async (event) => {
    event.preventDefault();
    const cleanVin = String(vinInput || "").trim().toUpperCase();
    setInfo("");

    if (!cleanVin) {
      setError("Enter a VIN to check with the NHTSA database.");
      return;
    }

    setLookingUpVin(true);
    setError("");

    try {
      const vinData = await lookupVIN(cleanVin);
      setVinResult(vinData);
      const makeModel = [vinData?.make, vinData?.model].filter(Boolean).join(" ");
      const year = vinData?.model_year ? ` (${vinData.model_year})` : "";
      setInfo(
        makeModel
          ? `NHTSA lookup success: ${makeModel}${year}`
          : "VIN lookup completed using NHTSA data.",
      );
    } catch (err) {
      setVinResult(null);
      setError(
        err?.response?.data?.detail ||
          "VIN lookup failed. Please verify the VIN and try again.",
      );
    } finally {
      setLookingUpVin(false);
    }
  };

  const handleDownloadReport = async () => {
    // TODO: Implement PDF download
    alert("PDF download coming soon!");
  };

  const riskLevel = analysis?.risk_level || "Unknown";
  const issues = Array.isArray(analysis?.issues) ? analysis.issues : [];
  const suggestions =
    Array.isArray(analysis?.negotiation_suggestions) &&
    analysis.negotiation_suggestions.length > 0
      ? analysis.negotiation_suggestions
      : [
          "Run SLA extraction to generate personalized negotiation suggestions.",
        ];

  const effectiveVehicle = vinResult || {};
  const marketVehicle = analysis?.vehicle_market_data || {};

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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between animate-fade-in">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">
                Contract Analysis
              </h1>
              <p className="text-text-secondary">
                Detailed breakdown of lease terms and SLA data
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="md"
                className="flex items-center gap-2"
                onClick={handleDownloadReport}
              >
                <Download size={18} />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Action Sections */}
          <GlassCard className="p-2 mb-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("sla-vin")}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "sla-vin"
                    ? "bg-accent-blue text-white"
                    : "bg-white/5 text-text-secondary hover:bg-white/10"
                }`}
              >
                SLA & VIN
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analysis")}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "analysis"
                    ? "bg-accent-blue text-white"
                    : "bg-white/5 text-text-secondary hover:bg-white/10"
                }`}
              >
                Analysis Output
              </button>
            </div>
          </GlassCard>

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

          {activeTab === "sla-vin" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <GlassCard className="p-6 animate-slide-up">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  SLA Extraction
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Extract SLA details from the uploaded contract to populate APR,
                  loan term, payment details, and VIN.
                </p>
                <p className="text-text-tertiary text-xs mb-4">
                  Document ID: {documentId || "Not available"}
                </p>
                <Button
                  variant="primary"
                  className="flex items-center gap-2"
                  onClick={() => runExtractionAndAnalysis(true)}
                  disabled={!documentId || extracting}
                  loading={extracting}
                >
                  <RefreshCw size={16} />
                  Extract SLA & Analyze
                </Button>
              </GlassCard>

              <GlassCard className="p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  VIN Lookup (NHTSA)
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Enter a VIN to verify make, model, and year directly from the
                  NHTSA database.
                </p>
                <form onSubmit={handleLookupVin} className="space-y-3">
                  <Input
                    label="VIN"
                    placeholder="Enter 17-character VIN"
                    value={vinInput}
                    onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                    disabled={lookingUpVin}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="flex items-center gap-2"
                    disabled={lookingUpVin}
                    loading={lookingUpVin}
                  >
                    <Search size={16} />
                    Check VIN with NHTSA
                  </Button>
                </form>

                {vinResult && (
                  <div className="mt-5 p-4 rounded-lg bg-accent-blue/10 border border-accent-blue/30">
                    <p className="text-xs uppercase tracking-wide text-accent-blue mb-3">
                      Fetched from NHTSA
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-text-secondary">VIN</span>
                        <span className="text-text-primary font-medium text-right break-all">
                          {vinResult.vin || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-text-secondary">Make</span>
                        <span className="text-text-primary font-medium text-right">
                          {vinResult.make || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-text-secondary">Model</span>
                        <span className="text-text-primary font-medium text-right">
                          {vinResult.model || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-text-secondary">Model Year</span>
                        <span className="text-text-primary font-medium text-right">
                          {vinResult.model_year || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {activeTab === "analysis" && (
            sla || analysis ? (
              <>
                {/* SLA Data Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
                  <SLADataCard
                    label="Annual Percentage Rate"
                    value={formatPercent(sla?.apr)}
                    icon="📊"
                  />
                  <SLADataCard
                    label="Monthly Payment"
                    value={formatMoney(sla?.monthly_payment)}
                    icon="💰"
                  />
                  <SLADataCard
                    label="Loan Term"
                    value={formatLoanTerm(sla?.loan_term)}
                    icon="📅"
                  />
                  <SLADataCard
                    label="Total Payment"
                    value={formatMoney(sla?.total_payment)}
                    icon="💳"
                  />
                </div>

                {/* Detailed Information */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Vehicle Information */}
                  <GlassCard className="lg:col-span-1 animate-slide-in-left">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                      Vehicle Information
                    </h3>
                    <div className="space-y-3">
                      <InfoRow
                        label="VIN"
                        value={
                          effectiveVehicle.vin ||
                          sla?.vin ||
                          "Not extracted"
                        }
                      />
                      <InfoRow
                        label="Make / Model"
                        value={
                          effectiveVehicle.make && effectiveVehicle.model
                            ? `${effectiveVehicle.make} ${effectiveVehicle.model}`
                            : marketVehicle.make && marketVehicle.model
                              ? `${marketVehicle.make} ${marketVehicle.model}`
                              : "N/A"
                        }
                      />
                      <InfoRow
                        label="Model Year"
                        value={
                          effectiveVehicle.model_year || marketVehicle.year || "N/A"
                        }
                      />
                      <InfoRow
                        label="Lender"
                        value={sla?.lender_name || "N/A"}
                      />
                      <InfoRow
                        label="Vehicle Price"
                        value={
                          sla?.vehicle_price
                            ? formatMoney(sla.vehicle_price)
                            : marketVehicle.estimated_market_price
                              ? formatMoney(marketVehicle.estimated_market_price)
                              : "$N/A"
                        }
                      />
                    </div>
                  </GlassCard>

                  {/* Risk Analysis */}
                  <GlassCard
                    className="lg:col-span-2 animate-slide-in-right"
                    style={{ animationDelay: "0.1s" }}
                  >
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                      Risk Analysis
                    </h3>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-text-secondary">Overall Risk Level</p>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                          riskLevel.toLowerCase() === "high"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : riskLevel.toLowerCase() === "medium"
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                              : "bg-green-500/10 text-green-400 border-green-500/30"
                        }`}
                      >
                        {String(riskLevel).toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {issues.length > 0 ? (
                        issues.map((issue, index) => (
                          <RiskItem
                            key={`${issue}-${index}`}
                            title={issue}
                            severity={issueSeverity(issue, riskLevel)}
                            details="Detected from SLA terms, pricing, and market checks"
                          />
                        ))
                      ) : (
                        <RiskItem
                          title="No issues identified yet"
                          severity="low"
                          details="Run analysis after SLA extraction to generate risk findings"
                        />
                      )}
                    </div>
                  </GlassCard>
                </div>

                {/* Negotiation Suggestions */}
                <GlassCard
                  className="mb-8 animate-slide-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    💡 Negotiation Suggestions
                  </h3>
                  <div className="space-y-3">
                    {suggestions.map((item, index) => (
                      <SuggestionItem key={`${item}-${index}`} text={item} />
                    ))}
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Button variant="primary" onClick={() => navigate("/chat")}>
                      Chat with AI Advisor
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => navigate("/comparison")}
                    >
                      Compare Offers
                    </Button>
                  </div>
                </GlassCard>
              </>
            ) : (
              <GlassCard className="p-12 text-center">
                <p className="text-text-secondary">No analysis available</p>
              </GlassCard>
            )
          )}
        </div>
      </main>
    </div>
  );
}

function SLADataCard({ label, value, icon }) {
  return (
    <GlassCard className="p-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-text-tertiary text-xs mb-2">{label}</p>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </GlassCard>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10">
      <span className="text-text-secondary text-sm">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function RiskItem({ title, severity, details }) {
  const severityColors = {
    low: "bg-green-500/10 text-green-400 border-green-500/30",
    medium: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    high: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-text-primary">{title}</h4>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full border ${
            severityColors[severity]
          }`}
        >
          {severity.toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-text-secondary">{details}</p>
    </div>
  );
}

function SuggestionItem({ text }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-accent-blue/10 border border-accent-blue/30">
      <span className="text-accent-blue font-bold flex-shrink-0 text-lg">
        ✓
      </span>
      <span className="text-text-secondary text-sm">{text}</span>
    </div>
  );
}
