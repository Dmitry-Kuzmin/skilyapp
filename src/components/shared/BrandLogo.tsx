import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

interface BrandConfig {
  src: string;
  bg?: string;        // undefined = без подложки (банки)
  padding?: string;
}

const BANK_KEYS = new Set([
  "visa", "mastercard", "apple pay", "applepay",
  "google pay", "googlepay", "paypal"
]);

const BRAND_CONFIG: Record<string, BrandConfig> = {
  // Банки — без подложки, просто логотип
  visa:        { src: "/logos/visa.svg" },
  mastercard:  { src: "/logos/mastercard.svg" },
  "apple pay": { src: "/logos/applepay.svg" },
  applepay:    { src: "/logos/applepay.svg" },
  "google pay":{ src: "/logos/googlepay.svg" },
  googlepay:   { src: "/logos/googlepay.svg" },
  paypal:      { src: "/logos/paypal.svg" },
  // Крипта — с цветным фоном
  btc:         { src: "/logos/btc.svg",  bg: "#F7931A", padding: "p-1.5" },
  bitcoin:     { src: "/logos/btc.svg",  bg: "#F7931A", padding: "p-1.5" },
  eth:         { src: "/logos/eth.svg",  bg: "#627EEA", padding: "p-1.5" },
  ethereum:    { src: "/logos/eth.svg",  bg: "#627EEA", padding: "p-1.5" },
  usdt:        { src: "/logos/usdt.svg", bg: "#26A17B", padding: "p-1.5" },
  tether:      { src: "/logos/usdt.svg", bg: "#26A17B", padding: "p-1.5" },
  ton:         { src: "/logos/ton.svg",  bg: "#0088CC", padding: "p-1.5" },
  sol:         { src: "/logos/sol.svg",  bg: "#9945FF", padding: "p-1.5" },
  solana:      { src: "/logos/sol.svg",  bg: "#9945FF", padding: "p-1.5" },
  bsc:         { src: "/logos/bsc.svg",  bg: "#F3BA2F", padding: "p-1.5" },
  binance:     { src: "/logos/bsc.svg",  bg: "#F3BA2F", padding: "p-1.5" },
  tron:        { src: "/logos/trx.svg",  bg: "#EF0027", padding: "p-1.5" },
  trx:         { src: "/logos/trx.svg",  bg: "#EF0027", padding: "p-1.5" },
};

export function BrandLogo({ name, className, size = 36 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const config = BRAND_CONFIG[key];

  if (!config) return null;

  const isBank = BANK_KEYS.has(key);

  if (isBank) {
    return (
      <img
        src={config.src}
        alt={name}
        className={cn(
          "shrink-0 object-contain transition-transform hover:scale-110",
          className
        )}
        style={{ height: size, width: "auto", filter: "brightness(0) invert(1)" }}
        loading="eager"
        draggable={false}
      />
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-transform hover:scale-105",
        config.padding ?? "p-1.5",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: config.bg,
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
