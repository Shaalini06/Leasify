import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { signup as signupAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) { setError("Please fill in all fields"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await signupAPI(email, password, fullName);
      signup(data.user || { email, full_name: fullName }, data.token);
      navigate("/dashboard");
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.detail || (typeof err === "string" ? err : "Registration failed. Please try again.");
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent-red/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-accent-red/3 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-4 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-red to-accent-red-dark mb-4 shadow-glow animate-neon-pulse">
            <span className="text-3xl">🏎️</span>
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>LEASIFY</h1>
          <p className="text-text-secondary text-sm mt-1">Create your account</p>
        </div>

        <div className="glass-card p-8 animate-fade-in">
          <h2 className="text-xl font-bold text-text-primary mb-6 text-center">Sign Up</h2>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="w-full" />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full" />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full" />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-semibold mb-2 uppercase tracking-wider">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-red to-accent-red-dark text-white font-semibold text-sm hover:shadow-glow-lg transition-all duration-300 disabled:opacity-50">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p className="text-text-secondary text-sm text-center mt-6">
            Already have an account? <Link to="/login" className="text-accent-red-light font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
