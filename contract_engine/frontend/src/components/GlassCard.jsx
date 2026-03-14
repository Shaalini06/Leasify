import React from "react";

const GlassCard = ({
  children,
  className = "",
  hover = true,
  noPadding = false,
  onClick,
  ...props
}) => {
  return (
    <div
      className={`
        glass-card
        rounded-2xl
        border
        border-white/10
        backdrop-blur-xl
        background: rgba(255, 255, 255, 0.1);
        transition-all
        duration-300
        ${noPadding ? "p-0" : "p-6"}
        ${hover ? "hover:border-white/20 hover:bg-white/12 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer" : ""}
        ${onClick ? "hover:scale-105" : ""}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
