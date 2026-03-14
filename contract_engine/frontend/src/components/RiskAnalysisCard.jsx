const levelColors = {
  Low: "bg-green-100 text-green-800 border-green-300",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  High: "bg-red-100 text-red-800 border-red-300",
};

export default function RiskAnalysisCard({ analysis }) {
  if (!analysis) return null;

  const colorClass = levelColors[analysis.risk_level] || levelColors.Medium;

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-5">
      {/* Risk level badge */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-800">Risk Analysis</h3>
        <span
          className={`px-3 py-1 text-sm font-semibold rounded-full border ${colorClass}`}
        >
          {analysis.risk_level} Risk
        </span>
      </div>

      {/* Issues */}
      {analysis.issues?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Issues Found
          </h4>
          <ul className="space-y-1">
            {analysis.issues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-gray-700 text-sm"
              >
                <span className="text-red-500 mt-0.5">&#9679;</span> {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {analysis.negotiation_suggestions?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Negotiation Suggestions
          </h4>
          <ul className="space-y-1">
            {analysis.negotiation_suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-gray-700 text-sm"
              >
                <span className="text-brand-orange mt-0.5">&#10148;</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vehicle market data */}
      {analysis.vehicle_market_data && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Vehicle Market Data
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Make:</span>{" "}
              <span className="font-medium">
                {analysis.vehicle_market_data.make || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Model:</span>{" "}
              <span className="font-medium">
                {analysis.vehicle_market_data.model || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Year:</span>{" "}
              <span className="font-medium">
                {analysis.vehicle_market_data.year || "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Est. Price:</span>{" "}
              <span className="font-medium">
                {analysis.vehicle_market_data.estimated_market_price
                  ? `$${Number(analysis.vehicle_market_data.estimated_market_price).toLocaleString()}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
