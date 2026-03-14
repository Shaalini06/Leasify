import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/Input";
import Button from "../components/Button";
import GlassCard from "../components/GlassCard";
import Alert from "../components/Alert";
import { LoadingScreen, Spinner } from "../components/LoadingSpinner";
import { login } from "../services/api";
import { Mail, Lock } from "react-feather";

export default function Login() {
  const navigate = useNavigate();
  const { login: loginAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Call API to login
      const response = await login(email, password);

      // Store auth token and navigate
      loginAuth(response.user || { email }, response.token);

      // Show loading screen
      setShowLoading(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setError(
        err.detail || err.message || "Failed to sign in. Please try again.",
      );
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigate("/signup");
  };

  if (showLoading) {
    return <LoadingScreen message="LEASIFY" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary flex items-center justify-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute bottom-32 right-10 w-80 h-80 bg-accent-orange/10 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left side - Info */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 animate-slide-in-left">
            <div>
              <h1 className="text-5xl font-bold text-text-primary mb-4">
                Welcome to <span className="text-accent-blue">LEASIFY</span>
              </h1>
              <p className="text-xl text-text-secondary">
                Understand your car lease before you sign
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-lg">📋</span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">
                    Smart Contract Analysis
                  </h3>
                  <p className="text-text-secondary text-sm">
                    AI-powered OCR extraction of lease terms and SLA data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent-orange/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-lg">💡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">
                    AI-Powered Negotiation
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Get intelligent advice on lease terms and negotiation tips
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-lg">🚗</span>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">
                    Vehicle Intelligence
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Complete vehicle data and market comparison insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div
            className="flex items-center justify-center animate-slide-in-right"
            style={{ animationDelay: "0.2s" }}
          >
            <GlassCard className="w-full max-w-md p-8 rounded-3xl border border-white/20 shadow-2xl">
              <div className="mb-8 text-center">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-blue to-accent-blue-light flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold">⚡</span>
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-2">
                  Sign In
                </h2>
                <p className="text-text-secondary">Welcome back to LEASIFY</p>
              </div>

              {error && (
                <Alert
                  type="error"
                  title="Authentication Error"
                  message={error}
                  onClose={() => setError("")}
                  className="mb-6"
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={Mail}
                  required
                  disabled={loading}
                />

                <Input
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  required
                  disabled={loading}
                />

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-accent-blue cursor-pointer"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-accent-blue hover:text-accent-blue-light transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-text-secondary text-sm">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={handleSignUp}
                    className="font-semibold text-accent-blue hover:text-accent-blue-light transition-colors"
                  >
                    Create one
                  </button>
                </p>
              </div>

              {/* Social login (optional) */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-text-tertiary text-xs text-center mb-4">
                  Or continue with
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="glass-card py-2.5 px-4 rounded-lg hover:bg-white/12 transition-all duration-200 text-sm text-text-secondary hover:text-text-primary flex items-center justify-center gap-2">
                    <span>Google</span>
                  </button>
                  <button className="glass-card py-2.5 px-4 rounded-lg hover:bg-white/12 transition-all duration-200 text-sm text-text-secondary hover:text-text-primary flex items-center justify-center gap-2">
                    <span>Apple</span>
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
