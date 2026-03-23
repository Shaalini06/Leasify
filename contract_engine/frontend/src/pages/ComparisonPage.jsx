import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Chart as ChartJS, BarElement, CategoryScale, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { Spinner } from "../components/LoadingSpinner";
import { getUserContracts, compareContracts } from "../services/api";
import { ArrowLeft, AlertTriangle, CheckCircle, TrendingUp } from "react-feather";

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

function parseNumber(value) {
  if (value === null || value === undefined) return 0;
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function categoryStyle(category) {
  const v = String(category || "").toLowerCase();
  if (v === "good") return { card: "bg-green-500/10 border-green-500/30", text: "text-green-400", badge: "bg-green-500/15 border-green-500/40 text-green-300" };
  if (v === "mid") return { card: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-300", badge: "bg-yellow-500/15 border-yellow-500/40 text-yellow-200" };
  return { card: "bg-red-500/10 border-red-500/30", text: "text-red-400", badge: "bg-red-500/15 border-red-500/40 text-red-300" };
}

export default function ComparisonPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const preselectedIds = location.state?.preselectedIds || [];
  const [allContracts, setAllContracts] = useState([]);
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const data = await getUserContracts();
        setAllContracts(data.contracts || []);
        if (preselectedIds.length > 0) {
          const initial = (data.contracts || []).filter((c) => preselectedIds.includes(c.document_id));
          setSelectedContracts(initial.slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch contracts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  useEffect(() => {
    if (selectedContracts.length >= 2) handleCompare();
    else setComparisonData(null);
  }, [selectedContracts]);

  const handleSelectContract = (contract) => {
    if (selectedContracts.find((c) => c.document_id === contract.document_id)) {
      setSelectedContracts((prev) => prev.filter((c) => c.document_id !== contract.document_id));
      setComparisonData(null);
    } else if (selectedContracts.length < 4) {
      setSelectedContracts((prev) => [...prev, contract]);
    }
  };

  const handleCompare = async () => {
    if (selectedContracts.length < 2) return;
    setComparing(true);
    try {
      const contractIds = selectedContracts.map((c) => c.document_id);
      const data = await compareContracts(contractIds);
      setComparisonData(data);
    } catch (error) {
      console.error("Comparison failed", error);
    } finally {
      setComparing(false);
    }
  };

  const chartData = useMemo(() => {
    if (!comparisonData?.ranked_deals) return null;
    return {
      labels: comparisonData.ranked_deals.map((deal) => deal.filename || `Deal ${deal.document_id}`),
      datasets: [{
        label: "Deal Score",
        data: comparisonData.ranked_deals.map((deal) => deal.score),
        backgroundColor: comparisonData.ranked_deals.map((deal) => {
          if (deal.category === "good") return "rgba(34,197,94,0.75)";
          if (deal.category === "mid") return "rgba(250,204,21,0.75)";
          return "rgba(239,68,68,0.75)";
        }),
        borderRadius: 8,
      }],
    };
  }, [comparisonData]);

  const bestDeal = comparisonData?.best_deal;
  const worstDeal = comparisonData?.ranked_deals?.[comparisonData.ranked_deals.length - 1];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />
      <main className="main-content flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-text-primary mb-2">Compare Deals</h1>
                <p className="text-text-secondary">Side-by-side comparison with best/worst deal highlighting</p>
              </div>
              <Button variant="secondary" className="flex items-center gap-2" onClick={() => navigate("/history")}>
                <ArrowLeft size={16} /> Back to History
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size="md" /></div>
          ) : (
            <>
              {/* Selection */}
              <div className="mb-8 animate-slide-up">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Select Contracts ({selectedContracts.length}/4)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allContracts.filter((c) => c.analyzed).map((contract) => {
                    const selected = selectedContracts.some((c) => c.document_id === contract.document_id);
                    const disabled = selectedContracts.length >= 4 && !selected;
                    return (
                      <div key={contract.id || contract.document_id} onClick={() => !disabled && handleSelectContract(contract)}
                        className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                          selected ? "glass-card border-accent-red bg-accent-red/10" : "glass-card border-white/10 hover:border-white/20"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {selected && (
                          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-accent-red flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        )}
                        <h3 className="font-semibold text-text-primary mb-3 text-wrap">{contract.filename || "Contract"}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-text-tertiary">APR</span><span className="font-semibold text-text-primary">{parseNumber(contract.sla?.apr) || "—"}%</span></div>
                          <div className="flex justify-between"><span className="text-text-tertiary">Monthly</span><span className="font-semibold text-text-primary">${parseNumber(contract.sla?.monthly_payment) || "—"}</span></div>
                          <div className="flex justify-between"><span className="text-text-tertiary">Term</span><span className="font-semibold text-text-primary">{parseNumber(contract.sla?.loan_term) || "—"}mo</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {allContracts.length === 0 && (
                  <GlassCard className="p-8 text-center">
                    <p className="text-text-secondary mb-4">No contracts available to compare</p>
                    <Button variant="primary" onClick={() => navigate("/upload")}>Upload a Contract</Button>
                  </GlassCard>
                )}
              </div>

              {/* Action */}
              <div className="mb-8 flex gap-3 animate-slide-up">
                <Button variant="primary" size="lg" onClick={handleCompare} loading={comparing} disabled={selectedContracts.length < 2}>
                  Compare {selectedContracts.length} Contracts
                </Button>
                <Button variant="secondary" size="lg" onClick={() => setSelectedContracts([])}>Clear</Button>
              </div>

              {/* Results */}
              {comparisonData && (
                <div className="animate-slide-up space-y-6">
                  {/* Score difference banner */}
                  {bestDeal && worstDeal && bestDeal.document_id !== worstDeal.document_id && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <GlassCard className="p-5 border-green-500/20 bg-green-500/5">
                        <div className="flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-green-400" /><span className="text-xs text-green-400 font-bold uppercase">Best Deal</span></div>
                        <p className="font-bold text-green-300 text-lg">{bestDeal.filename}</p>
                        <p className="text-green-400 text-2xl font-extrabold mt-1">{bestDeal.score}/100</p>
                      </GlassCard>
                      <GlassCard className="p-5 border-accent-gold/20 bg-accent-gold/5">
                        <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-accent-gold" /><span className="text-xs text-accent-gold font-bold uppercase">Score Gap</span></div>
                        <p className="text-accent-gold text-3xl font-extrabold mt-1">{(bestDeal.score || 0) - (worstDeal.score || 0)} pts</p>
                        <p className="text-text-secondary text-sm mt-1">difference between best & worst</p>
                      </GlassCard>
                      <GlassCard className="p-5 border-red-500/20 bg-red-500/5">
                        <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-red-400" /><span className="text-xs text-red-400 font-bold uppercase">Worst Deal</span></div>
                        <p className="font-bold text-red-300 text-lg">{worstDeal.filename}</p>
                        <p className="text-red-400 text-2xl font-extrabold mt-1">{worstDeal.score}/100</p>
                      </GlassCard>
                    </div>
                  )}

                  {/* Chart */}
                  <GlassCard className="p-6" hover={false}>
                    <h3 className="font-semibold text-text-primary mb-4">Deal Score Chart</h3>
                    {chartData && (
                      <Bar data={chartData} options={{
                        scales: {
                          x: { ticks: { color: "#71717a" }, grid: { color: "rgba(255,255,255,0.05)" } },
                          y: { ticks: { color: "#71717a" }, grid: { color: "rgba(255,255,255,0.05)" }, min: 0, max: 100 },
                        },
                        plugins: { legend: { display: false } },
                      }} />
                    )}
                  </GlassCard>

                  {/* Ranked Deals */}
                  <GlassCard className="p-6" hover={false}>
                    <h3 className="font-semibold text-text-primary mb-4">Ranked Deals</h3>
                    <div className="space-y-3">
                      {comparisonData.ranked_deals.map((deal, idx) => {
                        const cs = categoryStyle(deal.category);
                        const isWorst = idx === comparisonData.ranked_deals.length - 1 && comparisonData.ranked_deals.length > 1;
                        return (
                          <div key={deal.document_id} className={`p-4 rounded-xl border ${cs.card} ${isWorst ? "ring-1 ring-red-500/30" : ""}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className={`font-semibold ${cs.text}`}>#{idx + 1} {deal.filename || `Deal ${deal.document_id}`}</h4>
                                <p className="text-xs opacity-85 mt-1">Score: {deal.score}/100</p>
                              </div>
                              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cs.badge}`}>
                                {String(deal.category || "bad").toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                              <div className="p-2 rounded bg-black/20 border border-white/8">
                                <p className="text-text-tertiary text-xs">APR</p>
                                <p className="text-text-primary font-semibold">{parseNumber(deal.sla?.apr) || "-"}%</p>
                              </div>
                              <div className="p-2 rounded bg-black/20 border border-white/8">
                                <p className="text-text-tertiary text-xs">Monthly</p>
                                <p className="text-text-primary font-semibold">${parseNumber(deal.sla?.monthly_payment) || "-"}</p>
                              </div>
                              <div className="p-2 rounded bg-black/20 border border-white/8">
                                <p className="text-text-tertiary text-xs">Term</p>
                                <p className="text-text-primary font-semibold">{parseNumber(deal.sla?.loan_term) || "-"} mo</p>
                              </div>
                              <div className="p-2 rounded bg-black/20 border border-white/8">
                                <p className="text-text-tertiary text-xs">Total</p>
                                <p className="text-text-primary font-semibold">${parseNumber(deal.sla?.total_payment) || "-"}</p>
                              </div>
                            </div>
                            {/* Risk info from analysis */}
                            {deal.analysis_report?.issues?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {deal.analysis_report.issues.map((issue, i) => (
                                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{issue}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>

                  {/* Recommendation */}
                  <GlassCard className="p-6 border-green-500/30 bg-green-500/8" hover={false}>
                    <h3 className="font-semibold text-green-300 mb-3">🏆 Best Deal Recommendation</h3>
                    <p className="text-text-secondary">
                      Best deal is <span className="font-bold text-green-300">{comparisonData.best_deal?.filename || "N/A"}</span>
                      {" "}with score <span className="font-bold text-green-300">{comparisonData.best_deal?.score || 0}/100</span>.
                      {comparisonData.ranked_deals?.length > 1 && (
                        <> The worst deal scores {worstDeal?.score || 0}/100, a gap of{" "}
                          <span className="font-bold text-accent-gold">{(bestDeal?.score || 0) - (worstDeal?.score || 0)} points</span>.</>
                      )}
                    </p>
                  </GlassCard>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
