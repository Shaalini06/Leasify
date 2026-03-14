export default function SLASummaryCard({ sla }) {
  if (!sla) return null;

  const fields = [
    { label: "APR", value: sla.apr },
    { label: "Loan Term", value: sla.loan_term },
    { label: "Monthly Payment", value: sla.monthly_payment },
    { label: "Total Payment", value: sla.total_payment },
    { label: "Due Date", value: sla.due_date },
    { label: "Lender", value: sla.lender_name },
    { label: "Borrower", value: sla.borrower_name },
    { label: "VIN", value: sla.vin },
  ];

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">SLA Summary</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex flex-col">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {label}
            </span>
            <span className="text-gray-800 font-medium mt-1">
              {value || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
