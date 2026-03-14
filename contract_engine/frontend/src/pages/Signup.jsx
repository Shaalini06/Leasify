import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/Input";
import Button from "../components/Button";
import GlassCard from "../components/GlassCard";
import Alert from "../components/Alert";
import { LoadingScreen } from "../components/LoadingSpinner";
import { signup } from "../services/api";
import { Mail, Lock, User } from "react-feather";

export default function Signup() {
  const navigate = useNavigate();
  const { signup: signupAuth } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!agreeToTerms) {
      setError("You must agree to the terms and conditions");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await signup(email, password, fullName);
      signupAuth(
        response.user || { email, full_name: fullName },
        response.token,
      );
      setShowLoading(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err.detail || err.message || "Failed to create account");
      setLoading(false);
    }
  };

  if (showLoading) {
    return <LoadingScreen message="LEASIFY" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary flex items-center justify-center relative overflow-hidden py-12">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute bottom-32 right-10 w-80 h-80 bg-accent-orange/10 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <div
          className="animate-slide-in-right"
          style={{ animationDelay: "0.2s" }}
        >
          <GlassCard className="w-full p-8 rounded-3xl border border-white/20 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-blue to-accent-blue-light flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold">⚡</span>
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-2">
                Create Account
              </h2>
              <p className="text-text-secondary">
                Join LEASIFY and start analyzing leases
              </p>
            </div>

            {error && (
              <Alert
                type="error"
                title="Sign Up Error"
                message={error}
                onClose={() => setError("")}
                className="mb-6"
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={User}
                required
                disabled={loading}
              />

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

              <Input
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={Lock}
                required
                disabled={loading}
              />

              <label className="flex items-start gap-2 pt-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="w-4 h-4 mt-1 rounded bg-white/10 border border-white/20 accent-accent-blue cursor-pointer"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary">
                  I agree to the{" "}
                  <a
                    href="#"
                    className="text-accent-blue hover:text-accent-blue-light"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="text-accent-blue hover:text-accent-blue-light"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-text-secondary text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="font-semibold text-accent-blue hover:text-accent-blue-light transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
