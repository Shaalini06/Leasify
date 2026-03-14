import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import Button from "../components/Button";

const Landing = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary overflow-hidden flex items-center justify-center">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent-blue/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent-orange/10 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[600px]">
          {/* Left Side - Car Animation */}
          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="relative w-full h-96">
              {/* Car Container with animation */}
              <div className="absolute inset-0 flex items-center overflow-hidden">
                <div className="animate-car-move w-full flex justify-center">
                  {/* SVG Car (3D-style) */}
                  <svg
                    viewBox="0 0 400 200"
                    className="w-80 h-auto drop-shadow-2xl animate-car-float"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Car Body */}
                    <defs>
                      <linearGradient
                        id="carGradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          style={{ stopColor: "#3b82f6", stopOpacity: 1 }}
                        />
                        <stop
                          offset="100%"
                          style={{ stopColor: "#60a5fa", stopOpacity: 1 }}
                        />
                      </linearGradient>
                      <linearGradient
                        id="windowGradient"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          style={{ stopColor: "#93c5fd", stopOpacity: 0.6 }}
                        />
                        <stop
                          offset="100%"
                          style={{ stopColor: "#3b82f6", stopOpacity: 0.4 }}
                        />
                      </linearGradient>
                    </defs>

                    {/* Shadows */}
                    <ellipse
                      cx="200"
                      cy="160"
                      rx="80"
                      ry="15"
                      fill="rgba(0,0,0,0.2)"
                    />

                    {/* Main Body */}
                    <path
                      d="M 80 120 L 100 80 L 200 60 L 300 80 L 320 120 Z"
                      fill="url(#carGradient)"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="2"
                    />

                    {/* Roof */}
                    <path
                      d="M 120 80 L 150 50 L 250 50 L 280 80 Z"
                      fill="url(#carGradient)"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="2"
                    />

                    {/* Front Window */}
                    <path
                      d="M 240 75 L 260 65 L 280 75 L 260 85 Z"
                      fill="url(#windowGradient)"
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="1.5"
                    />

                    {/* Rear Window */}
                    <path
                      d="M 140 75 L 160 65 L 180 75 L 160 85 Z"
                      fill="url(#windowGradient)"
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="1.5"
                    />

                    {/* Front Wheel */}
                    <circle
                      cx="120"
                      cy="140"
                      r="20"
                      fill="#1a1f2e"
                      stroke="#60a5fa"
                      strokeWidth="2"
                    />
                    <circle
                      cx="120"
                      cy="140"
                      r="12"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      opacity="0.5"
                    />

                    {/* Rear Wheel */}
                    <circle
                      cx="280"
                      cy="140"
                      r="20"
                      fill="#1a1f2e"
                      stroke="#60a5fa"
                      strokeWidth="2"
                    />
                    <circle
                      cx="280"
                      cy="140"
                      r="12"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      opacity="0.5"
                    />

                    {/* Headlights */}
                    <circle
                      cx="310"
                      cy="105"
                      r="8"
                      fill="#fbbf24"
                      opacity="0.8"
                    />
                    <circle
                      cx="310"
                      cy="115"
                      r="6"
                      fill="#fbbf24"
                      opacity="0.6"
                    />

                    {/* Glow effect */}
                    <circle
                      cx="310"
                      cy="105"
                      r="12"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                      opacity="0.3"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div
              className="text-center mt-12 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <p className="text-text-secondary text-lg">
                <span className="text-accent-blue font-semibold">
                  Smart Lease Analysis
                </span>
              </p>
              <p className="text-text-tertiary text-sm mt-2">
                Understand your car lease before you sign
              </p>
            </div>
          </div>

          {/* Right Side - Auth Card */}
          <div
            className="flex items-center justify-center lg:justify-end animate-slide-in-right"
            style={{ animationDelay: "0.2s" }}
          >
            <GlassCard className="w-full max-w-md p-8 rounded-3xl border border-white/20 shadow-2xl">
              {/* Logo for mobile */}
              <div className="lg:hidden text-center mb-8">
                <div className="w-12 h-12 rounded-lg bg-accent-blue flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold">⚡</span>
                </div>
                <h1 className="text-3xl font-bold text-text-primary">
                  LEASIFY
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                  Smart Lease Analysis
                </p>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-6 border-b border-white/10 p-1">
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 py-2 px-4 rounded-t-lg font-medium transition-all duration-200 text-sm ${
                    activeTab === "login"
                      ? "bg-accent-blue/20 text-accent-blue border-b-2 border-accent-blue"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={`flex-1 py-2 px-4 rounded-t-lg font-medium transition-all duration-200 text-sm ${
                    activeTab === "signup"
                      ? "bg-accent-blue/20 text-accent-blue border-b-2 border-accent-blue"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Login/Signup Content */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    {activeTab === "login" ? "Welcome Back" : "Get Started"}
                  </h2>
                  <p className="text-text-secondary text-sm">
                    {activeTab === "login"
                      ? "Sign in to access your lease analysis"
                      : "Create an account to analyze your lease deals"}
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() =>
                      navigate(activeTab === "login" ? "/login" : "/signup")
                    }
                  >
                    {activeTab === "login" ? "Sign In" : "Create Account"}
                  </Button>

                  {activeTab === "login" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-center"
                      onClick={() => setActiveTab("signup")}
                    >
                      Don't have an account? Sign up
                    </Button>
                  )}

                  {activeTab === "signup" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-center"
                      onClick={() => setActiveTab("login")}
                    >
                      Already have an account? Sign in
                    </Button>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
                  </div>
                  <p className="text-text-secondary text-xs">
                    OCR-powered contract analysis
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
                  </div>
                  <p className="text-text-secondary text-xs">
                    AI-powered negotiation advice
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
                  </div>
                  <p className="text-text-secondary text-xs">
                    VIN lookup and vehicle data
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
