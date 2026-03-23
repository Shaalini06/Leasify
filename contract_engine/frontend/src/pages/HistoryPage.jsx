import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { Spinner } from "../components/LoadingSpinner";
import { deleteContract, getUserContracts, downloadPDFReport } from "../services/api";
import { Trash2, Eye, Download, Search } from "react-feather";

export default function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  const fetchContracts = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getUserContracts();
      setContracts(data.contracts || []);
    } catch (error) {
      console.error("Failed to fetch contracts", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts(true);
  }, [fetchContracts, location.pathname, location.search]);

  useEffect(() => {
    const refreshOnFocus = () => {
      fetchContracts(false);
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        fetchContracts(false);
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchContracts(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      clearInterval(intervalId);
    };
  }, [fetchContracts]);

  const filteredContracts = contracts
    .filter((contract) => {
      if (filter === "analyzed") return contract.analyzed;
      if (filter === "pending") return !contract.analyzed;
      return true;
    })
    .filter((contract) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (contract.filename || "").toLowerCase().includes(q) ||
        String(contract.document_id || contract.id).includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0);
      if (sortBy === "date-asc") return new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0);
      if (sortBy === "score-desc") return (b.deal_score || 0) - (a.deal_score || 0);
      if (sortBy === "score-asc") return (a.deal_score || 0) - (b.deal_score || 0);
      return 0;
    });

  const handleViewAnalysis = (contract) => {
    sessionStorage.setItem("document_id", contract.document_id);
    navigate(`/upload?tab=analysis&id=${contract.document_id}`);
  };

  const handleDeleteContract = async (contract) => {
    const docId = contract?.document_id ?? contract?.id;
    if (!docId) {
      alert("Cannot delete: missing document_id.");
      return;
    }

    if (confirm("Are you sure you want to delete this contract? This action cannot be undone.")) {
      try {
        await deleteContract(docId);
        setSelectedForCompare((prev) => prev.filter((id) => id !== docId));
        await fetchContracts(false);
      } catch (err) {
        console.error("Delete failed", err);
        alert("Failed to delete contract from database.");
      }
    }
  };

  const handleDownloadPDF = (e, contract) => {
    e.stopPropagation();
    downloadPDFReport(contract.document_id, contract.filename || `contract_${contract.document_id}`);
  };

  const toggleCompareSelection = (documentId) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(documentId)) return prev.filter((id) => id !== documentId);
      if (prev.length >= 4) return prev;
      return [...prev, documentId];
    });
  };

  const handleCompareSelected = () => {
    if (selectedForCompare.length < 2) {
      alert("Select at least 2 analyzed contracts to compare.");
      return;
    }
    navigate("/comparison", { state: { preselectedIds: selectedForCompare } });
  };

  function scoreColor(score) {
    if (score >= 75) return "text-green-400";
    if (score >= 50) return "text-yellow-300";
    return "text-red-400";
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />
      <main className="main-content flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">Contract History</h1>
            <p className="text-text-secondary">View, manage, and compare all uploaded contracts</p>
          </div>

          {/* Search & Sort Bar */}
          <GlassCard className="p-4 mb-6" hover={false}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input type="text" placeholder="Search contracts..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm" />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-text-primary">
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="score-desc">Highest Score</option>
                <option value="score-asc">Lowest Score</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Compare: <strong className="text-text-primary">{selectedForCompare.length}/4</strong></span>
                <Button variant="primary" size="sm" onClick={handleCompareSelected} disabled={selectedForCompare.length < 2}>
                  Compare Selected
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Filter Tabs */}
          <div className="flex gap-3 mb-8 animate-slide-up">
            {[
              { key: "all", label: "All", count: contracts.length },
              { key: "analyzed", label: "Analyzed", count: contracts.filter((c) => c.analyzed).length },
              { key: "pending", label: "Pending", count: contracts.filter((c) => !c.analyzed).length },
            ].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  filter === f.key
                    ? "glass-card bg-accent-red/15 border border-accent-red/30 text-accent-red-light"
                    : "glass-card border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20"
                }`}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {/* Contracts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size="md" /></div>
          ) : filteredContracts.length > 0 ? (
            <div className="space-y-4 animate-slide-up">
              {filteredContracts.map((contract, idx) => (
                <GlassCard hover className="p-5" key={contract.id || idx}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="font-semibold text-text-primary text-lg text-wrap">{contract.filename || "Lease Agreement"}</h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                          contract.analyzed
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-accent-gold/10 text-accent-gold border-accent-gold/30 animate-pulse"
                        }`}>
                          {contract.analyzed ? "Analyzed" : "Pending"}
                        </span>
                        {contract.deal_score != null && (
                          <span className={`text-sm font-bold ${scoreColor(contract.deal_score)}`}>
                            Score: {contract.deal_score}/100
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        {contract.sla && (
                          <>
                            <div><p className="text-text-tertiary">APR</p><p className="font-semibold text-text-primary">{contract.sla.apr || "—"}%</p></div>
                            <div><p className="text-text-tertiary">Monthly</p><p className="font-semibold text-text-primary">${contract.sla.monthly_payment || "—"}</p></div>
                            <div><p className="text-text-tertiary">Term</p><p className="font-semibold text-text-primary">{contract.sla.loan_term || "—"} mo</p></div>
                            <div><p className="text-text-tertiary">Uploaded</p><p className="font-semibold text-text-primary">{new Date(contract.uploaded_at || contract.created_at).toLocaleDateString()}</p></div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {contract.analyzed && (
                        <>
                          <Button variant={selectedForCompare.includes(contract.document_id) ? "accent" : "secondary"} size="sm"
                            onClick={() => toggleCompareSelection(contract.document_id)}>
                            {selectedForCompare.includes(contract.document_id) ? "Selected" : "Compare"}
                          </Button>
                          <Button variant="secondary" size="sm" className="flex items-center gap-1.5"
                            onClick={(e) => handleDownloadPDF(e, contract)}>
                            <Download size={14} /> PDF
                          </Button>
                        </>
                      )}
                      <Button variant="secondary" size="sm" className="flex items-center gap-1.5"
                        onClick={() => handleViewAnalysis(contract)}>
                        <Eye size={14} /> View
                      </Button>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteContract(contract)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No {filter !== "all" ? filter : ""} contracts yet</h3>
              <p className="text-text-secondary mb-6">Upload a contract to see it in your history</p>
              <Button variant="primary" onClick={() => navigate("/upload")}>Upload Contract</Button>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
  );
}
