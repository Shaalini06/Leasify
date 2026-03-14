import React from "react";

const LoadingScreen = ({ message = "LEASIFY" }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg-primary z-50">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-blue border-r-accent-blue animate-spin-slow"></div>
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-b-accent-orange animate-spin-slow"
            style={{ animationDirection: "reverse" }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-accent-blue">⚡</div>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-4xl font-bold text-text-primary mb-2 animate-pulse">
          {message}
        </h1>
        <p className="text-text-secondary text-sm animate-pulse-slow">
          Preparing your dashboard...
        </p>

        {/* Progress Bar */}
        <div className="mt-8 w-32 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-orange rounded-full animate-pulse"
            style={{
              animation: "slideInLeft 2s ease-in-out infinite",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const Spinner = ({ size = "md", className = "" }) => {
  const sizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div
      className={`
        ${sizes[size]}
        border-3
        border-white/10
        border-t-accent-blue
        rounded-full
        animate-spin
        ${className}
      `}
    ></div>
  );
};

export { LoadingScreen, Spinner };
export default LoadingScreen;
