import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import SLASummaryCard from "../components/SLASummaryCard";
import RiskAnalysisCard from "../components/RiskAnalysisCard";
import { extractSLA, analyzeContract } from "../services/api";

export default function Analysis() {
  const documentId = sessionStorage.getItem("document_id");

  const [sla, setSla] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!documentId) return;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        // Step 1: extract SLA fields
        const slaRes = await extractSLA(documentId);
        setSla(slaRes.sla_data);

        // Step 2: run risk analysis
        try {
          const riskRes = await analyzeContract(documentId);
          setRisk(riskRes);
        } catch {
          // Risk analysis may fail if VIN is missing – still show SLA.
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to fetch analysis.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [documentId]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex-1 ml-64 p-8 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Contract Analysis</h2>

        {!documentId && (
          <p className="text-gray-400">
            No contract uploaded yet. Please upload a contract first.
          </p>
        )}

        {loading && (
          <p className="text-brand-orange animate-pulse">Analyzing contract…</p>
        )}
        {error && <p className="text-red-600 font-medium">{error}</p>}

        <SLASummaryCard sla={sla} />
        <RiskAnalysisCard analysis={risk} />
      </main>
    </div>
  );
}
