import React, { useEffect } from "react";
import { X } from "react-feather";
import Button from "./Button";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = "md",
  closeOnEscape = true,
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div
        className={`
          relative
          w-full
          mx-4
          ${sizes[size]}
          glass-card
          rounded-2xl
          border
          border-white/20
          shadow-2xl
          animate-slide-up
          z-10
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 max-h-[60vh] overflow-y-auto">{children}</div>

        {/* Actions */}
        {actions && (
          <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
