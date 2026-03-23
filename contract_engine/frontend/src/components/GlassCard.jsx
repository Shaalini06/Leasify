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
        transition-all
        duration-300
        ${noPadding ? "p-0" : "p-6"}
        ${hover ? "hover:border-white/20 hover:bg-white/8 hover:shadow-lg hover:shadow-accent-red/5 cursor-pointer" : ""}
        ${onClick ? "hover:scale-[1.02]" : ""}
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
