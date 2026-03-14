import React from "react";
import { AlertCircle, CheckCircle, XCircle, Info, X } from "react-feather";

const Alert = ({
  type = "info",
  title,
  message,
  onClose,
  closeable = true,
  className = "",
}) => {
  const configs = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      titleColor: "text-green-400",
      messageColor: "text-green-300",
      iconColor: "text-green-400",
    },
    error: {
      icon: XCircle,
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      titleColor: "text-red-400",
      messageColor: "text-red-300",
      iconColor: "text-red-400",
    },
    warning: {
      icon: AlertCircle,
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      titleColor: "text-orange-400",
      messageColor: "text-orange-300",
      iconColor: "text-orange-400",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      titleColor: "text-blue-400",
      messageColor: "text-blue-300",
      iconColor: "text-blue-400",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.bgColor}
        border
        ${config.borderColor}
        rounded-lg
        p-4
        flex items-start
        gap-3
        backdrop-blur-sm
        ${className}
      `}
    >
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1">
        {title && (
          <h4 className={`font-semibold mb-1 ${config.titleColor}`}>{title}</h4>
        )}
        <p className={`text-sm ${config.messageColor}`}>{message}</p>
      </div>
      {closeable && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-all"
        >
          <X size={18} className="text-text-secondary" />
        </button>
      )}
    </div>
  );
};

export default Alert;
