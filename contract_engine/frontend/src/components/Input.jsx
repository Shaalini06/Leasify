import React from "react";

const Input = ({
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  disabled = false,
  required = false,
  className = "",
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-text-primary text-sm font-medium mb-2">
          {label}
          {required && <span className="text-orange-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
            <Icon size={20} />
          </div>
        )}

        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            w-full
            glass-input-container
            bg-white/5
            border
            border-white/10
            rounded-lg
            px-4
            py-2.5
            text-text-primary
            text-base
            placeholder-text-tertiary
            focus:outline-none
            focus:border-accent-blue
            focus:bg-white/8
            focus:ring-2
            focus:ring-accent-blue/30
            transition-all
            duration-200
            disabled:opacity-50
            disabled:cursor-not-allowed
            ${Icon ? "pl-10" : ""}
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && <p className="text-red-400 text-sm mt-1.5">{error}</p>}
    </div>
  );
};

export default Input;
