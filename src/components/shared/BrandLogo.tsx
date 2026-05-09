import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

const BRAND_CONFIG: Record<string, string> = {
  visa:        "/logos/visa.svg",
  mastercard:  "/logos/mastercard.svg",
  applepay:    "/logos/applepay.svg",
  "apple pay": "/logos/applepay.svg",
  googlepay:   "/logos/googlepay.svg",
  "google pay": "/logos/googlepay.svg",
  paypal:      "/logos/paypal.svg",
  btc:         "/logos/btc.svg",
  bitcoin:     "/logos/btc.svg",
  eth:         "/logos/eth.svg",
  ethereum:    "/logos/eth.svg",
  usdt:        "/logos/usdt.svg",
  tether:      "/logos/usdt.svg",
  ton:         "/logos/ton.svg",
  sol:         "/logos/sol.svg",
  solana:      "/logos/sol.svg",
  bsc:         "/logos/bsc.svg",
  binance:     "/logos/bsc.svg",
  tron:        "/logos/trx.svg",
  trx:         "/logos/trx.svg",
};

export function BrandLogo({ name, className, size = 30 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const iconUrl = BRAND_CONFIG[key];

  if (!iconUrl) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 rounded-full bg-white/[0.08] shadow-lg backdrop-blur-md transition-all hover:bg-white/[0.12] hover:scale-110",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={iconUrl}
        alt={name}
        className="w-[55%] h-[55%] invert brightness-[10] contrast-[10]"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
