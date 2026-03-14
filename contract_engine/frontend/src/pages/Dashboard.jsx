import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import DataCard from "../components/DataCard";
import Button from "../components/Button";
import { Spinner } from "../components/LoadingSpinner";
import { getUserContracts } from "../services/api";
import {
  Upload,
  BarChart2,
  Zap,
  Clock,
  TrendingUp,
  FileText,
  Settings,
} from "react-feather";

export default function Dashboard() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContracts: 0,
    pendingReviews: 0,
    avgAPR: 0,
  });

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const data = await getUserContracts();
        setContracts(data.contracts || []);

        // Calculate stats
        const total = data.contracts?.length || 0;
        const avgAPR =
          data.contracts?.reduce((sum, c) => sum + (c.sla?.apr || 0), 0) /
            total || 0;

        setStats({
          totalContracts: total,
          pendingReviews:
            data.contracts?.filter((c) => !c.analyzed).length || 0,
          avgAPR: avgAPR.toFixed(2),
        });
      } catch (error) {
        console.error("Failed to fetch contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">
                Dashboard
              </h1>
              <p className="text-text-secondary">
                Welcome back. Here's what's happening with your leases.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex items-center gap-2"
                onClick={() => navigate("/settings")}
              >
                <Settings size={18} />
                Settings
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex items-center gap-2"
                onClick={() => navigate("/upload")}
              >
                <Upload size={18} />
                Upload Contract
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <DataCard
            icon={FileText}
            label="Total Contracts"
            value={stats.totalContracts}
            subtext="Analyzed"
          />
          <DataCard
            icon={Clock}
            label="Pending Review"
            value={stats.pendingReviews}
            subtext="Awaiting analysis"
          />
          <DataCard
            icon={TrendingUp}
            label="Average APR"
            value={`${stats.avgAPR}%`}
            subtext="Across all deals"
          />
          <DataCard
            icon={Zap}
            label="Negotiations"
            value="0"
            subtext="Active conversations"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Quick Actions
            </h2>
            <div
              className="space-y-3 animate-slide-in-right"
              style={{ animationDelay: "0.1s" }}
            >
              <ActionCard
                icon={Upload}
                title="Upload Contract"
                description="Upload PDF or image"
                onClick={() => navigate("/upload")}
              />
              <ActionCard
                icon={BarChart2}
                title="View Analysis"
                description="Check extracted SLA data"
                onClick={() => navigate("/analysis")}
              />
              <ActionCard
                icon={Zap}
                title="Negotiate"
                description="Get AI advice"
                onClick={() => navigate("/chat")}
              />
              <ActionCard
                icon={Clock}
                title="History"
                description="View past contracts"
                onClick={() => navigate("/history")}
              />
            </div>
          </div>

          {/* Recent Contracts */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Recent Contracts
              </h2>
              <button className="text-accent-blue hover:text-accent-blue-light text-sm font-medium">
                View all
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" />
              </div>
            ) : contracts.length > 0 ? (
              <div className="space-y-3 animate-slide-up">
                {contracts.slice(0, 4).map((contract, idx) => (
                  <ContractCard
                    key={idx}
                    contract={contract}
                    onView={() => navigate(`/analysis?id=${contract.id}`)}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <div className="inline-block p-4 rounded-lg bg-accent-blue/10 mb-4">
                  <Upload size={32} className="text-accent-blue" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No contracts yet
                </h3>
                <p className="text-text-secondary mb-6">
                  Upload your first lease or loan contract to get started
                </p>
                <Button variant="primary" onClick={() => navigate("/upload")}>
                  Upload Contract
                </Button>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <FeatureCard
            icon="🔍"
            title="AI-Powered Analysis"
            description="Automatic extraction of lease terms, APR, and payment details using advanced OCR"
          />
          <FeatureCard
            icon="💼"
            title="Smart Negotiation"
            description="Get AI-powered recommendations on how to negotiate better lease terms"
          />
          <FeatureCard
            icon="📊"
            title="Deal Comparison"
            description="Compare multiple lease offers side-by-side to find the best deal"
          />
        </div>
      </main>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, onClick }) {
  return (
    <GlassCard hover onClick={onClick} className="p-4 cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-blue/20">
          <Icon size={20} className="text-accent-blue" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
            {title}
          </h3>
          <p className="text-xs text-text-tertiary mt-1">{description}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function ContractCard({ contract, onView }) {
  return (
    <GlassCard hover onClick={onView} className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <FileText size={20} className="text-accent-blue" />
            </div>
            <h3 className="font-semibold text-text-primary">
              {contract.filename || "Lease Agreement"}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4 ml-13">
            {contract.sla && (
              <>
                <div>
                  <p className="text-xs text-text-tertiary">APR</p>
                  <p className="font-semibold text-accent-orange">
                    {contract.sla.apr || "—"}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Monthly</p>
                  <p className="font-semibold text-text-primary">
                    ${contract.sla.monthly_payment || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Term</p>
                  <p className="font-semibold text-text-primary">
                    {contract.sla.loan_term || "—"} mo
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          {contract.analyzed ? (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs font-medium text-green-400">
                Analyzed
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-xs font-medium text-orange-400">
                Pending
              </span>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <GlassCard className="p-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </GlassCard>
  );
}
