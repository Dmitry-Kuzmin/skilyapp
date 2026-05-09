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
  visa:        { src: "/logos/visa.svg",       bg: "bg-white",        padding: "px-2 py-1" },
  mastercard:  { src: "/logos/mastercard.svg", bg: "bg-white",        padding: "p-1" },
  "apple pay": { src: "/logos/applepay.svg",   bg: "bg-black",        padding: "px-2 py-1" },
  applepay:    { src: "/logos/applepay.svg",   bg: "bg-black",        padding: "px-2 py-1" },
  "google pay":{ src: "/logos/googlepay.svg",  bg: "bg-white",        padding: "px-2 py-1" },
  googlepay:   { src: "/logos/googlepay.svg",  bg: "bg-white",        padding: "px-2 py-1" },
  paypal:      { src: "/logos/paypal.svg",     bg: "bg-white",        padding: "px-2 py-1" },
  btc:         { src: "/logos/btc.svg",        bg: "bg-[#F7931A]",    padding: "p-1" },
  bitcoin:     { src: "/logos/btc.svg",        bg: "bg-[#F7931A]",    padding: "p-1" },
  eth:         { src: "/logos/eth.svg",        bg: "bg-[#627EEA]",    padding: "p-1" },
  ethereum:    { src: "/logos/eth.svg",        bg: "bg-[#627EEA]",    padding: "p-1" },
  usdt:        { src: "/logos/usdt.svg",       bg: "bg-[#26A17B]",    padding: "p-1" },
  tether:      { src: "/logos/usdt.svg",       bg: "bg-[#26A17B]",    padding: "p-1" },
  ton:         { src: "/logos/ton.svg",        bg: "bg-[#0088CC]",    padding: "p-1" },
  sol:         { src: "/logos/sol.svg",        bg: "bg-black",        padding: "p-1" },
  solana:      { src: "/logos/sol.svg",        bg: "bg-black",        padding: "p-1" },
  bsc:         { src: "/logos/bsc.svg",        bg: "bg-[#F3BA2F]",    padding: "p-1" },
  binance:     { src: "/logos/bsc.svg",        bg: "bg-[#F3BA2F]",    padding: "p-1" },
  tron:        { src: "/logos/trx.svg",        bg: "bg-[#EF0027]",    padding: "p-1" },
  trx:         { src: "/logos/trx.svg",        bg: "bg-[#EF0027]",    padding: "p-1" },
};

export function BrandLogo({ name, className, size = 24 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const config = BRAND_CONFIG[key];

  if (!config) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 overflow-hidden rounded-lg",
        config.bg,
        config.padding,
        className
      )}
      style={{ width: size * 1.9, height: size * 1.2 }}
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
