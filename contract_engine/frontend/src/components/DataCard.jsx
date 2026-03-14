import React from "react";

const DataCard = ({ icon: Icon, label, value, subtext, className = "" }) => {
  return (
    <div
      className={`
        glass-card
        rounded-xl
        border
        border-white/10
        p-5
        transition-all
        duration-300
        hover:border-white/20
        hover:bg-white/12
        hover:shadow-lg
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-secondary text-sm font-medium mb-1">
            {label}
          </p>
          <p className="text-text-primary text-2xl font-bold">{value}</p>
          {subtext && (
            <p className="text-text-tertiary text-xs mt-1">{subtext}</p>
          )}
        </div>
        {Icon && (
          <div className="text-accent-blue p-2 rounded-lg bg-accent-blue/10">
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCard;
