import { useState } from "react";
import Navbar from "../components/Navbar";
import GlassCard from "../components/GlassCard";
import Input from "../components/Input";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { lookupVIN } from "../services/api";
import { Search } from "react-feather";

export default function VinLookupPage() {
  const [vinInput, setVinInput] = useState("");
  const [vinResult, setVinResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleLookupVin = async (event) => {
    event.preventDefault();
    const cleanVin = String(vinInput || "").trim().toUpperCase();
    setInfo("");

    if (!cleanVin) {
      setError("Enter a VIN to check with the NHTSA database.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const vinData = await lookupVIN(cleanVin);
      setVinResult(vinData);
      const makeModel = [vinData?.make, vinData?.model].filter(Boolean).join(" ");
      const year = vinData?.model_year ? ` (${vinData.model_year})` : "";
      setInfo(
        makeModel
          ? `NHTSA lookup success: ${makeModel}${year}`
          : "VIN lookup completed using NHTSA data.",
      );
    } catch (err) {
      setVinResult(null);
      setError(
        err?.response?.data?.detail ||
          "VIN lookup failed. Please verify the VIN and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Navbar />

      <main className="main-content flex-1 ml-72 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-text-primary mb-2">VIN Lookup</h1>
            <p className="text-text-secondary">
              Dedicated VIN verification section using NHTSA vehicle data.
            </p>
          </div>

          {error && (
            <Alert
              type="error"
              title="VIN Lookup Error"
              message={error}
              onClose={() => setError("")}
              className="mb-6"
            />
          )}

          {info && (
            <Alert
              type="success"
              title="VIN Lookup Complete"
              message={info}
              onClose={() => setInfo("")}
              className="mb-6"
            />
          )}

          <GlassCard className="p-6 animate-slide-up" hover={false}>
            <h3 className="text-lg font-semibold text-text-primary mb-2">NHTSA VIN Decoder</h3>
            <p className="text-text-secondary text-sm mb-4">
              Enter a 17-character VIN to verify make, model, and model year.
            </p>
            <form onSubmit={handleLookupVin} className="space-y-3">
              <Input
                label="VIN"
                placeholder="Enter 17-character VIN"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="secondary"
                className="flex items-center gap-2"
                disabled={loading}
                loading={loading}
              >
                <Search size={16} />
                Check VIN with NHTSA
              </Button>
            </form>

            {vinResult && (
              <div className="mt-5 p-4 rounded-lg bg-accent-red/10 border border-accent-red/30">
                <p className="text-xs uppercase tracking-wide text-accent-red-light mb-3">
                  Fetched from NHTSA
                </p>
                <div className="space-y-2 text-sm">
                  <InfoRow label="VIN" value={vinResult.vin || "N/A"} />
                  <InfoRow label="Make" value={vinResult.make || "N/A"} />
                  <InfoRow label="Model" value={vinResult.model || "N/A"} />
                  <InfoRow label="Model Year" value={vinResult.model_year || "N/A"} />
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-medium text-right break-all">{value}</span>
    </div>
  );
}
