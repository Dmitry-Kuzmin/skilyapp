import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

interface BrandConfig {
  src: string;
  bg: string;
}

const BRAND_CONFIG: Record<string, BrandConfig> = {
  // Banks — белый фон, логотип на всю ширину
  visa:        { src: "/logos/visa.svg",       bg: "#FFFFFF" },
  mastercard:  { src: "/logos/mastercard.svg", bg: "#FFFFFF" },
  "apple pay": { src: "/logos/applepay.svg",   bg: "#FFFFFF" },
  applepay:    { src: "/logos/applepay.svg",   bg: "#FFFFFF" },
  "google pay":{ src: "/logos/googlepay.svg",  bg: "#FFFFFF" },
  googlepay:   { src: "/logos/googlepay.svg",  bg: "#FFFFFF" },
  paypal:      { src: "/logos/paypal.svg",     bg: "#FFFFFF" },
  // Крипта — их родной фоновый цвет
  btc:         { src: "/logos/btc.svg",        bg: "#F7931A" },
  bitcoin:     { src: "/logos/btc.svg",        bg: "#F7931A" },
  eth:         { src: "/logos/eth.svg",        bg: "#627EEA" },
  ethereum:    { src: "/logos/eth.svg",        bg: "#627EEA" },
  usdt:        { src: "/logos/usdt.svg",       bg: "#26A17B" },
  tether:      { src: "/logos/usdt.svg",       bg: "#26A17B" },
  ton:         { src: "/logos/ton.svg",        bg: "#0088CC" },
  sol:         { src: "/logos/sol.svg",        bg: "#9945FF" },
  solana:      { src: "/logos/sol.svg",        bg: "#9945FF" },
  bsc:         { src: "/logos/bsc.svg",        bg: "#F3BA2F" },
  binance:     { src: "/logos/bsc.svg",        bg: "#F3BA2F" },
  tron:        { src: "/logos/trx.svg",        bg: "#EF0027" },
  trx:         { src: "/logos/trx.svg",        bg: "#EF0027" },
};

export function BrandLogo({ name, className, size = 32 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const config = BRAND_CONFIG[key];

  if (!config) return null;

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center overflow-hidden rounded-lg shadow-sm transition-transform hover:scale-105",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: config.bg,
        padding: size * 0.1,
      }}
    >
      <img
        src={config.src}
        alt={name}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
