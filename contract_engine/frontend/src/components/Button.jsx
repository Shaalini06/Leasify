const Button = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  type = "button",
  ...props
}) => {
  const baseStyles = "btn transition-all duration-300 font-medium rounded-lg inline-flex items-center justify-center";

  const variants = {
    primary: "bg-gradient-to-r from-accent-red to-accent-red-dark hover:from-accent-red-light hover:to-accent-red text-white shadow-lg hover:shadow-glow",
    secondary: "bg-white/10 hover:bg-white/15 border border-white/20 text-white hover:border-white/30",
    accent: "bg-gradient-to-r from-accent-gold to-yellow-600 hover:from-accent-gold-light hover:to-accent-gold text-white shadow-lg hover:shadow-glow-gold",
    ghost: "text-text-secondary hover:text-text-primary hover:bg-white/5",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
    xl: "px-10 py-4 text-lg",
  };

  return (
    <button
      type={type}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
