import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function LogoIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="em-grad-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="em-grad-inner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="em-accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer rounded squircle */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="url(#em-grad-bg)"
        className="drop-shadow-md"
      />
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="11"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />

      {/* Wallet / Card body layer */}
      <path
        d="M11 16C11 14.8954 11.8954 14 13 14H33C34.1046 14 35 14.8954 35 16V31C35 32.6569 33.6569 34 32 34H13C11.8954 34 11 33.1046 11 32V16Z"
        fill="#022c22"
        fillOpacity="0.45"
      />

      {/* Upward diagonal growth wave / cash dynamic fold */}
      <path
        d="M12 28.5L18.5 22L24.5 25.5L34 16.5"
        stroke="url(#em-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Arrow tip at growth point */}
      <path
        d="M29 16.5H34V21.5"
        stroke="url(#em-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glowing coin / clasp dot */}
      <circle
        cx="33"
        cy="26"
        r="3.5"
        fill="url(#em-grad-inner)"
        stroke="#ffffff"
        strokeWidth="1.5"
        filter="url(#glow)"
      />
    </svg>
  );
}

export default function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const pixelSizes = {
    sm: 28,
    md: 38,
    lg: 48,
    xl: 64,
  };

  const textSizes = {
    sm: { title: "text-sm", sub: "text-[10px]" },
    md: { title: "text-base", sub: "text-xs" },
    lg: { title: "text-lg", sub: "text-xs" },
    xl: { title: "text-2xl", sub: "text-sm" },
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative shrink-0">
        <LogoIcon size={pixelSizes[size]} />
      </div>
      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-bold tracking-tight text-white ${textSizes[size].title}`}>
            Catatan<span className="text-emerald-400">Keuangan</span>
          </span>
          <span className={`font-medium tracking-wider uppercase text-emerald-300/80 ${textSizes[size].sub}`}>
            Simpel & Aman
          </span>
        </div>
      )}
    </div>
  );
}
