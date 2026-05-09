import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number; // This will now act as the base height
}

interface BrandConfig {
  src: string;
  bg: string;
  padding: string;
  isDark?: boolean;
}

const BRAND_CONFIG: Record<string, BrandConfig> = {
  visa:        { src: "/logos/visa.svg",       bg: "bg-white",        padding: "px-2 py-1" },
  mastercard:  { src: "/logos/mastercard.svg", bg: "bg-white",        padding: "px-1.5 py-1" },
  "apple pay": { src: "/logos/applepay.svg",   bg: "bg-white",        padding: "px-2 py-1" },
  applepay:    { src: "/logos/applepay.svg",   bg: "bg-white",        padding: "px-2 py-1" },
  "google pay":{ src: "/logos/googlepay.svg",  bg: "bg-white",        padding: "px-2 py-1" },
  googlepay:   { src: "/logos/googlepay.svg",  bg: "bg-white",        padding: "px-2 py-1" },
  paypal:      { src: "/logos/paypal.svg",     bg: "bg-white",        padding: "px-2 py-1" },
  btc:         { src: "/logos/btc.svg",        bg: "bg-white",        padding: "p-0.5" },
  bitcoin:     { src: "/logos/btc.svg",        bg: "bg-white",        padding: "p-0.5" },
  eth:         { src: "/logos/eth.svg",        bg: "bg-white",        padding: "p-0.5" },
  ethereum:    { src: "/logos/eth.svg",        bg: "bg-white",        padding: "p-0.5" },
  usdt:        { src: "/logos/usdt.svg",       bg: "bg-white",        padding: "p-0.5" },
  tether:      { src: "/logos/usdt.svg",       bg: "bg-white",        padding: "p-0.5" },
  ton:         { src: "/logos/ton.svg",        bg: "bg-white",        padding: "p-0.5" },
  sol:         { src: "/logos/sol.svg",        bg: "bg-white",        padding: "p-0.5" },
  solana:      { src: "/logos/sol.svg",        bg: "bg-white",        padding: "p-0.5" },
  bsc:         { src: "/logos/bsc.svg",        bg: "bg-white",        padding: "p-0.5" },
  binance:     { src: "/logos/bsc.svg",        bg: "bg-white",        padding: "p-0.5" },
  tron:        { src: "/logos/trx.svg",        bg: "bg-white",        padding: "p-0.5" },
  trx:         { src: "/logos/trx.svg",        bg: "bg-white",        padding: "p-0.5" },
};

export function BrandLogo({ name, className, size = 24 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const config = BRAND_CONFIG[key];

  if (!config) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 rounded-md border border-white/20 shadow-sm transition-all hover:scale-105",
        config.bg,
        config.padding,
        className
      )}
      style={{ height: size, minWidth: size }}
    >
      <img
        src={config.src}
        alt={name}
        className="h-full w-auto object-contain"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
