import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { Spinner } from "../components/LoadingSpinner";
import { getUserContracts } from "../services/api";
import { Trash2, Eye, Download } from "react-feather";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | analyzed | pending

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const data = await getUserContracts();
        setContracts(data.contracts || []);
      } catch (error) {
        console.error("Failed to fetch contracts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const filteredContracts = contracts.filter((contract) => {
    if (filter === "analyzed") return contract.analyzed;
    if (filter === "pending") return !contract.analyzed;
    return true;
  });

  const handleViewAnalysis = (contract) => {
    sessionStorage.setItem("document_id", contract.document_id);
    navigate(`/analysis?id=${contract.document_id}`);
  };

  const handleDeleteContract = (contractId) => {
    if (
      confirm(
        "Are you sure you want to delete this contract? This action cannot be undone.",
      )
    ) {
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Contract History
            </h1>
            <p className="text-text-secondary">
              View and manage all your uploaded contracts
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 mb-8 animate-slide-up">
            <FilterButton
              label="All Contracts"
              count={contracts.length}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            <FilterButton
              label="Analyzed"
              count={contracts.filter((c) => c.analyzed).length}
              active={filter === "analyzed"}
              onClick={() => setFilter("analyzed")}
            />
            <FilterButton
              label="Pending"
              count={contracts.filter((c) => !c.analyzed).length}
              active={filter === "pending"}
              onClick={() => setFilter("pending")}
            />
          </div>

          {/* Contracts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : filteredContracts.length > 0 ? (
            <div className="space-y-4 animate-slide-up">
              {filteredContracts.map((contract, idx) => (
                <ContractRow
                  key={idx}
                  contract={contract}
                  onView={() => handleViewAnalysis(contract)}
                  onDelete={() => handleDeleteContract(contract.id)}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No {filter !== "all" ? filter : ""} contracts yet
              </h3>
              <p className="text-text-secondary mb-6">
                Upload a contract to see it in your history
              </p>
              <Button variant="primary" onClick={() => navigate("/upload")}>
                Upload Contract
              </Button>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
  );
}

function FilterButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
        active
          ? "glass-card bg-accent-blue/20 border border-accent-blue/50 text-accent-blue"
          : "glass-card border border-white/20 text-text-secondary hover:text-text-primary hover:border-white/30"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function ContractRow({ contract, onView, onDelete }) {
  const uploadDate = new Date(contract.uploaded_at || contract.created_at);

  return (
    <GlassCard hover className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="font-semibold text-text-primary text-lg">
              {contract.filename || "Lease Agreement"}
            </h3>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                contract.analyzed
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-orange-500/10 text-orange-400 border-orange-500/30 animate-pulse"
              }`}
            >
              {contract.analyzed ? "Analyzed" : "Pending"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {contract.sla && (
              <>
                <div>
                  <p className="text-text-tertiary">APR</p>
                  <p className="font-semibold text-text-primary">
                    {contract.sla.apr || "—"}%
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Monthly</p>
                  <p className="font-semibold text-text-primary">
                    ${contract.sla.monthly_payment || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Term</p>
                  <p className="font-semibold text-text-primary">
                    {contract.sla.loan_term || "—"} mo
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Uploaded</p>
                  <p className="font-semibold text-text-primary">
                    {uploadDate.toLocaleDateString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
            onClick={onView}
          >
            <Eye size={16} />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-red-400 hover:text-red-300"
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
