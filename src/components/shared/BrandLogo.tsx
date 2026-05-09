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
  padding: string;
}

const BRAND_CONFIG: Record<string, BrandConfig> = {
  visa:        { src: "/logos/visa.svg",       bg: "bg-white",        padding: "p-1.5" },
  mastercard:  { src: "/logos/mastercard.svg", bg: "bg-white",        padding: "p-0.5" },
  "apple pay": { src: "/logos/applepay.svg",   bg: "bg-black",        padding: "p-0" },
  applepay:    { src: "/logos/applepay.svg",   bg: "bg-black",        padding: "p-0" },
  "google pay":{ src: "/logos/googlepay.svg",  bg: "bg-white",        padding: "p-1.5" },
  googlepay:   { src: "/logos/googlepay.svg",  bg: "bg-white",        padding: "p-1.5" },
  paypal:      { src: "/logos/paypal.svg",     bg: "bg-white",        padding: "p-1.5" },
  btc:         { src: "/logos/btc.svg",        bg: "bg-[#F7931A]",    padding: "p-1.5" },
  bitcoin:     { src: "/logos/btc.svg",        bg: "bg-[#F7931A]",    padding: "p-1.5" },
  eth:         { src: "/logos/eth.svg",        bg: "bg-[#627EEA]",    padding: "p-1.5" },
  ethereum:    { src: "/logos/eth.svg",        bg: "bg-[#627EEA]",    padding: "p-1.5" },
  usdt:        { src: "/logos/usdt.svg",       bg: "bg-[#26A17B]",    padding: "p-1.5" },
  tether:      { src: "/logos/usdt.svg",       bg: "bg-[#26A17B]",    padding: "p-1.5" },
  ton:         { src: "/logos/ton.svg",        bg: "bg-[#0088CC]",    padding: "p-0" },
  sol:         { src: "/logos/sol.svg",        bg: "bg-black",        padding: "p-1.5" },
  solana:      { src: "/logos/sol.svg",        bg: "bg-black",        padding: "p-1.5" },
  bsc:         { src: "/logos/bsc.svg",        bg: "bg-[#F3BA2F]",    padding: "p-1.5" },
  binance:     { src: "/logos/bsc.svg",        bg: "bg-[#F3BA2F]",    padding: "p-1.5" },
  tron:        { src: "/logos/trx.svg",        bg: "bg-[#EF0027]",    padding: "p-1.5" },
  trx:         { src: "/logos/trx.svg",        bg: "bg-[#EF0027]",    padding: "p-1.5" },
};

export function BrandLogo({ name, className, size = 30 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const config = BRAND_CONFIG[key];

  if (!config) return null;

  // Use the brand color for crypto, and white for most banks
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 rounded-full shadow-md overflow-hidden transition-all hover:scale-110",
        config.bg,
        config.padding,
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={config.src}
        alt={name}
        className="w-full h-full object-contain"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
