import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, TrendingUp, FileText, MessageSquare, BarChart2 } from "react-feather";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: FileText, title: "Contract Analysis", desc: "Upload and analyze lease/loan contracts with AI-powered SLA extraction" },
    { icon: Shield, title: "Risk Detection", desc: "Identify hidden fees, penalty clauses, and unfavorable terms instantly" },
    { icon: TrendingUp, title: "Market Comparison", desc: "Compare your deal against real market data and pricing" },
    { icon: MessageSquare, title: "Negotiation Coach", desc: "Get personalized advice from our AI finance expert" },
    { icon: BarChart2, title: "Deal Comparison", desc: "Compare multiple offers side-by-side to find the best deal" },
    { icon: Shield, title: "PDF Reports", desc: "Download professional analysis reports for your records" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary overflow-hidden">
      {/* Hero */}
      <div className="relative">
        <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full bg-accent-red/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent-red/3 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative">
          {/* Nav */}
          <div className="flex items-center justify-between mb-20 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-red to-accent-red-dark flex items-center justify-center shadow-glow">
                <span className="text-xl">🏎️</span>
              </div>
              <span className="text-2xl font-extrabold text-text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>LEASIFY</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate("/login")} className="btn btn-ghost px-6 py-2">Sign In</button>
              <button onClick={() => navigate("/signup")} className="btn btn-primary px-6 py-2">Get Started</button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-red/10 border border-accent-red/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
              <span className="text-accent-red-light text-sm font-medium">AI-Powered Lease Analysis</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-text-primary mb-6 leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Never Overpay on a
              <span className="bg-gradient-to-r from-accent-red to-accent-red-light bg-clip-text text-transparent"> Car Lease</span> Again
            </h1>
            <p className="text-lg text-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload your contract. Our AI analyzes the terms, compares market prices, detects hidden risks, and gives you expert negotiation strategies — all in seconds.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button onClick={() => navigate("/signup")} className="btn btn-primary btn-large flex items-center gap-2 shadow-glow">
                Start Free Analysis <ArrowRight size={18} />
              </button>
              <button onClick={() => navigate("/login")} className="btn btn-secondary btn-large">
                Sign In
              </button>
            </div>
          </div>

          {/* Sports Car Scene */}
          <div className="flex justify-center mt-16">
            <div className="login-race-scene">
              <div className="race-horizon" />
              <div className="race-track">
                <div className="track-line track-line-1" />
                <div className="track-line track-line-2" />
                <div className="track-line track-line-3" />
              </div>
              <div className="sports-car-3d animate-sports-car-drive">
                <div className="car-body-shell"><div className="car-cabin" /><div className="car-spoiler" /><div className="car-headlight" /></div>
                <div className="car-wheel wheel-front" /><div className="car-wheel wheel-rear" />
                <div className="car-shadow" />
                <div className="car-smoke smoke-1" /><div className="car-smoke smoke-2" /><div className="car-smoke smoke-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-text-primary text-center mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Everything You Need to Get the Best Deal
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-2xl mx-auto">
          Comprehensive tools to analyze, compare, and negotiate your car lease or loan
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, idx) => (
            <div key={title} className="glass-card p-6 hover:border-accent-red/20 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="w-12 h-12 rounded-xl bg-accent-red/10 flex items-center justify-center mb-4">
                <Icon size={22} className="text-accent-red-light" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-text-secondary text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/8 py-8">
        <p className="text-text-tertiary text-sm text-center">
          © 2026 LEASIFY — AI-Powered Car Lease & Loan Analysis
        </p>
      </div>
    </div>
  );
}
