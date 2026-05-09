import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

interface BrandConfig {
  src: string;
  bg?: string;
}

const BANK_KEYS = new Set([
  "visa", "mastercard", "apple pay", "applepay",
  "google pay", "googlepay", "paypal",
]);

const BRAND_CONFIG: Record<string, BrandConfig> = {
  visa:        { src: "/logos/visa.svg" },
  mastercard:  { src: "/logos/mastercard.svg" },
  "apple pay": { src: "/logos/applepay.svg" },
  applepay:    { src: "/logos/applepay.svg" },
  "google pay":{ src: "/logos/googlepay.svg" },
  googlepay:   { src: "/logos/googlepay.svg" },
  paypal:      { src: "/logos/paypal.svg" },
  btc:         { src: "/logos/btc.svg",  bg: "#F7931A" },
  bitcoin:     { src: "/logos/btc.svg",  bg: "#F7931A" },
  eth:         { src: "/logos/eth.svg",  bg: "#627EEA" },
  ethereum:    { src: "/logos/eth.svg",  bg: "#627EEA" },
  usdt:        { src: "/logos/usdt.svg", bg: "#26A17B" },
  tether:      { src: "/logos/usdt.svg", bg: "#26A17B" },
  ton:         { src: "/logos/ton.svg",  bg: "#0088CC" },
  sol:         { src: "/logos/sol.svg",  bg: "#9945FF" },
  solana:      { src: "/logos/sol.svg",  bg: "#9945FF" },
  bsc:         { src: "/logos/bsc.svg",  bg: "#F3BA2F" },
  binance:     { src: "/logos/bsc.svg",  bg: "#F3BA2F" },
  tron:        { src: "/logos/trx.svg",  bg: "#EF0027" },
  trx:         { src: "/logos/trx.svg",  bg: "#EF0027" },
};

export function BrandLogo({ name, className, size = 36 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const config = BRAND_CONFIG[key];

  if (!config) return null;

  const isBank = BANK_KEYS.has(key);
  const padding = size * 0.12;

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center overflow-hidden transition-transform hover:scale-105",
        isBank ? "rounded-lg" : "rounded-xl shadow-sm",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: isBank ? "transparent" : config.bg,
        padding: isBank ? 0 : padding,
      }}
    >
      <img
        src={config.src}
        alt={name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          // Инвертируем только тёмные банковские лого (Visa, ApplePay)
          filter: isBank ? "brightness(0) invert(1)" : "none",
        }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
