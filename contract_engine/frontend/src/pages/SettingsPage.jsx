import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              Settings
            </h1>
            <p className="text-text-secondary">
              Manage your account and application preferences.
            </p>
          </div>

          <GlassCard className="p-6 animate-slide-up">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Account
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Full Name</p>
                <p className="text-text-primary">{user?.full_name || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Email</p>
                <p className="text-text-primary">{user?.email || "Not available"}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
