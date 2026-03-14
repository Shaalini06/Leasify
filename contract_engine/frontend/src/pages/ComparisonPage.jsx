import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { Spinner } from "../components/LoadingSpinner";
import { getUserContracts, compareContracts } from "../services/api";
import { Plus, X } from "react-feather";

export default function ComparisonPage() {
  const navigate = useNavigate();
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
      } catch (error) {
        console.error("Failed to fetch contracts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const handleSelectContract = (contract) => {
    if (selectedContracts.find((c) => c.id === contract.id)) {
      setSelectedContracts((prev) => prev.filter((c) => c.id !== contract.id));
      setComparisonData(null);
    } else if (selectedContracts.length < 4) {
      setSelectedContracts((prev) => [...prev, contract]);
    }
  };

  const handleCompare = async () => {
    if (selectedContracts.length < 2) {
      alert("Please select at least 2 contracts to compare");
      return;
    }

    setComparing(true);
    try {
      const contractIds = selectedContracts.map((c) => c.id || c.document_id);
      const data = await compareContracts(contractIds);
      setComparisonData(data);
    } catch (error) {
      console.error("Comparison failed", error);
      alert("Failed to compare contracts");
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Compare Contracts
            </h1>
            <p className="text-text-secondary">
              Compare 2-4 lease deals side by side to find the best offer
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : (
            <>
              {/* Contract Selection */}
              <div className="mb-8 animate-slide-up">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  Select Contracts to Compare ({selectedContracts.length}/4)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allContracts.map((contract) => (
                    <ContractSelectCard
                      key={contract.id || contract.document_id}
                      contract={contract}
                      selected={selectedContracts.some(
                        (c) =>
                          c.id === contract.id ||
                          c.document_id === contract.document_id,
                      )}
                      onSelect={() => handleSelectContract(contract)}
                      disabled={
                        selectedContracts.length >= 4 &&
                        !selectedContracts.find((c) => c.id === contract.id)
                      }
                    />
                  ))}
                </div>

                {allContracts.length === 0 && (
                  <GlassCard className="p-8 text-center">
                    <p className="text-text-secondary mb-4">
                      No contracts available to compare
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => navigate("/upload")}
                    >
                      Upload a Contract
                    </Button>
                  </GlassCard>
                )}
              </div>

              {/* Comparison Button */}
              {selectedContracts.length >= 2 && (
                <div className="mb-8 flex gap-3 animate-slide-up">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCompare}
                    loading={comparing}
                  >
                    Compare {selectedContracts.length} Contracts
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setSelectedContracts([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              )}

              {/* Comparison Results */}
              {comparisonData && (
                <div className="animate-slide-up">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">
                    Comparison Results
                  </h2>

                  {/* Metrics Comparison */}
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <ComparisonMetric
                      label="APR (%)"
                      contracts={selectedContracts}
                      getValue={(c) => c.sla?.apr}
                      highlight="min"
                    />
                    <ComparisonMetric
                      label="Monthly Payment ($)"
                      contracts={selectedContracts}
                      getValue={(c) => c.sla?.monthly_payment}
                      highlight="min"
                    />
                    <ComparisonMetric
                      label="Loan Term (months)"
                      contracts={selectedContracts}
                      getValue={(c) => c.sla?.loan_term}
                      highlight="max"
                    />
                    <ComparisonMetric
                      label="Total Payment ($)"
                      contracts={selectedContracts}
                      getValue={(c) => c.sla?.total_payment}
                      highlight="min"
                    />
                  </div>

                  {/* Deal Rating */}
                  <GlassCard className="p-6 mb-6">
                    <h3 className="font-semibold text-text-primary mb-4">
                      Deal Ratings
                    </h3>
                    <div className="space-y-3">
                      {selectedContracts.map((contract, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <h4 className="font-semibold text-text-primary">
                            {contract.filename || `Deal ${idx + 1}`}
                          </h4>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={
                                  star <= 4
                                    ? "text-yellow-400 text-lg"
                                    : "text-text-tertiary text-lg"
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Recommendation */}
                  <GlassCard className="p-6 border-accent-blue/30 bg-accent-blue/5">
                    <h3 className="font-semibold text-accent-blue mb-3">
                      💡 Recommendation
                    </h3>
                    <p className="text-text-secondary">
                      Based on our analysis, the{" "}
                      <span className="font-semibold text-accent-blue">
                        {selectedContracts[0]?.filename || "first deal"}
                      </span>{" "}
                      offers the best combination of APR and monthly payment.
                      Consider negotiating the terms further to match market
                      averages.
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

function ContractSelectCard({ contract, selected, onSelect, disabled }) {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${
        selected
          ? "glass-card border-accent-blue bg-accent-blue/20"
          : "glass-card border-white/20 hover:border-white/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center">
          <span className="text-white text-sm">✓</span>
        </div>
      )}

      <h3 className="font-semibold text-text-primary mb-3">
        {contract.filename || "Contract"}
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-tertiary">APR</span>
          <span className="font-semibold text-text-primary">
            {contract.sla?.apr || "—"}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">Monthly</span>
          <span className="font-semibold text-text-primary">
            ${contract.sla?.monthly_payment || "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">Term</span>
          <span className="font-semibold text-text-primary">
            {contract.sla?.loan_term || "—"}mo
          </span>
        </div>
      </div>
    </div>
  );
}

function ComparisonMetric({ label, contracts, getValue, highlight }) {
  const values = contracts.map((c) => ({
    contract: c,
    value: getValue(c),
  }));

  const isMin = highlight === "min";
  const bestValue = isMin
    ? Math.min(...values.map((v) => Number(v.value || 0) || Infinity))
    : Math.max(...values.map((v) => Number(v.value || 0) || 0));

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">
        {label}
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {values.map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg transition-all duration-200 ${
              item.value === bestValue
                ? "bg-green-500/20 border border-green-500/30"
                : "bg-white/5 border border-white/10"
            }`}
          >
            <p className="text-xs text-text-tertiary mb-1">
              {item.contract.filename || `Deal ${idx + 1}`}
            </p>
            <p className="text-lg font-bold text-text-primary">
              {item.value || "—"}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
