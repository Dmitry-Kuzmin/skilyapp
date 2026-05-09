import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

// Монохромные иконки simple-icons — нужен цвет через CSS color
// Крипта — цветной фон + белая иконка
// Банки — прозрачный фон, белая иконка (invert не нужен — они уже fill=currentColor)

interface BrandConfig {
  src: string;
  isBank: boolean;
  bg?: string;
}

const BRAND_CONFIG: Record<string, BrandConfig> = {
  visa:        { src: "/logos/visa.svg",      isBank: true },
  mastercard:  { src: "/logos/mastercard.svg",isBank: true },
  "apple pay": { src: "/logos/applepay.svg",  isBank: true },
  applepay:    { src: "/logos/applepay.svg",  isBank: true },
  "google pay":{ src: "/logos/googlepay.svg", isBank: true },
  googlepay:   { src: "/logos/googlepay.svg", isBank: true },
  paypal:      { src: "/logos/paypal.svg",    isBank: true },
  btc:         { src: "/logos/btc.svg",       isBank: false, bg: "#F7931A" },
  bitcoin:     { src: "/logos/btc.svg",       isBank: false, bg: "#F7931A" },
  eth:         { src: "/logos/eth.svg",       isBank: false, bg: "#627EEA" },
  ethereum:    { src: "/logos/eth.svg",       isBank: false, bg: "#627EEA" },
  usdt:        { src: "/logos/usdt.svg",      isBank: false, bg: "#26A17B" },
  tether:      { src: "/logos/usdt.svg",      isBank: false, bg: "#26A17B" },
  ton:         { src: "/logos/ton.svg",       isBank: false, bg: "#0088CC" },
  sol:         { src: "/logos/sol.svg",       isBank: false, bg: "#9945FF" },
  solana:      { src: "/logos/sol.svg",       isBank: false, bg: "#9945FF" },
  bsc:         { src: "/logos/bsc.svg",       isBank: false, bg: "#F3BA2F" },
  binance:     { src: "/logos/bsc.svg",       isBank: false, bg: "#F3BA2F" },
  tron:        { src: "/logos/trx.svg",       isBank: false, bg: "#EF0027" },
  trx:         { src: "/logos/trx.svg",       isBank: false, bg: "#EF0027" },
};

export function BrandLogo({ name, className, size = 36 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const config = BRAND_CONFIG[key];

  if (!config) return null;

  const pad = Math.round(size * 0.14);

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center overflow-hidden transition-transform hover:scale-105",
        config.isBank ? "" : "rounded-xl shadow-sm",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: config.isBank ? "transparent" : config.bg,
        padding: config.isBank ? 0 : pad,
      }}
    >
      {/* simple-icons SVGs используют fill=currentColor, цвет задаём через color */}
      <img
        src={config.src}
        alt={name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          // Банки: белые на тёмном фоне. Крипта: белые поверх цветного фона.
          filter: "brightness(0) invert(1)",
        }}
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
