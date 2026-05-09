import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

const BRAND_CONFIG: Record<string, string> = {
  visa: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/visa.svg",
  mastercard: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mastercard.svg",
  applepay: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/applepay.svg",
  "apple pay": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/applepay.svg",
  googlepay: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlepay.svg",
  "google pay": "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlepay.svg",
  paypal: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paypal.svg",
  btc: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bitcoin.svg",
  bitcoin: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bitcoin.svg",
  eth: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/ethereum.svg",
  ethereum: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/ethereum.svg",
  usdt: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tether.svg",
  tether: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tether.svg",
  ton: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/ton.svg",
  sol: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/solana.svg",
  solana: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/solana.svg",
  bsc: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/binance.svg",
  binance: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/binance.svg",
  tron: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tron.svg",
  trx: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tron.svg",
};

export function BrandLogo({ name, className, size = 24 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const iconUrl = BRAND_CONFIG[key];

  if (!iconUrl) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 rounded-full bg-white/10 border border-white/10 shadow-sm backdrop-blur-sm transition-all hover:bg-white/20",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={iconUrl}
        alt={name}
        className="w-[60%] h-[60%] invert brightness-200"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
