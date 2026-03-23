import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";
import { getUserContracts } from "../services/api";
import { Upload, Clock, BarChart2, MessageSquare, FileText, TrendingUp } from "react-feather";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, analyzed: 0, pending: 0, avgScore: 0 });

  useEffect(() => {
    getUserContracts()
      .then((data) => {
        const contracts = data.contracts || [];
        const analyzed = contracts.filter((c) => c.analyzed);
        const scores = analyzed.map((c) => c.deal_score || 0).filter((s) => s > 0);
        setStats({
          total: contracts.length,
          analyzed: analyzed.length,
          pending: contracts.length - analyzed.length,
          avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        });
      })
      .catch(() => {});
  }, []);

  const quickActions = [
    { icon: Upload, label: "Upload Contract", desc: "Analyze a new lease or loan", to: "/upload", color: "from-accent-red to-accent-red-dark" },
    { icon: Clock, label: "View History", desc: "Browse past analyses", to: "/history", color: "from-accent-gold to-yellow-700" },
    { icon: BarChart2, label: "Compare Deals", desc: "Side-by-side comparison", to: "/comparison", color: "from-green-600 to-green-800" },
    { icon: MessageSquare, label: "Negotiation AI", desc: "Get expert advice", to: "/chat", color: "from-purple-600 to-purple-800" },
  ];

  const statCards = [
    { label: "Total Contracts", value: stats.total, icon: FileText, color: "text-accent-red-light" },
    { label: "Analyzed", value: stats.analyzed, icon: TrendingUp, color: "text-green-400" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-accent-gold" },
    { label: "Avg Score", value: stats.avgScore > 0 ? `${stats.avgScore}/100` : "—", icon: BarChart2, color: "text-purple-400" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />
      <main className="main-content flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">Dashboard</h1>
            <p className="text-text-secondary">Welcome back! Here's an overview of your contract analyses.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 animate-slide-up">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <GlassCard key={label} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">{label}</span>
                  <Icon size={18} className={color} />
                </div>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </GlassCard>
            ))}
          </div>

          {/* Quick Actions */}
          <h2 className="text-xl font-bold text-text-primary mb-5">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            {quickActions.map(({ icon: Icon, label, desc, to, color }) => (
              <GlassCard hover key={label} className="p-6 cursor-pointer group" onClick={() => navigate(to)}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-glow group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">{label}</h3>
                <p className="text-text-secondary text-sm">{desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
