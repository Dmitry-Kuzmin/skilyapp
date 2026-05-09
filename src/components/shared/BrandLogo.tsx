import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

const BRAND_CONFIG: Record<
  string,
  { src: string; bg: string; padding: string; objectFit?: string }
> = {
  visa: {
    src: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
    bg: "bg-white",
    padding: "p-1.5",
  },
  mastercard: {
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
    bg: "bg-white",
    padding: "p-1",
  },
  "apple pay": {
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg",
    bg: "bg-black",
    padding: "p-1.5",
  },
  applepay: {
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg",
    bg: "bg-black",
    padding: "p-1.5",
  },
  "google pay": {
    src: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg",
    bg: "bg-white",
    padding: "p-1",
  },
  googlepay: {
    src: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg",
    bg: "bg-white",
    padding: "p-1",
  },
  paypal: {
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
    bg: "bg-white",
    padding: "p-1.5",
  },
  btc: {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg",
    bg: "bg-[#F7931A]",
    padding: "p-1",
  },
  bitcoin: {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg",
    bg: "bg-[#F7931A]",
    padding: "p-1",
  },
  eth: {
    src: "https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg",
    bg: "bg-[#627EEA]",
    padding: "p-1",
  },
  ethereum: {
    src: "https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg",
    bg: "bg-[#627EEA]",
    padding: "p-1",
  },
  usdt: {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/41/Tether_Logo.png",
    bg: "bg-[#26A17B]",
    padding: "p-1",
  },
  tether: {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/41/Tether_Logo.png",
    bg: "bg-[#26A17B]",
    padding: "p-1",
  },
  ton: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Toncoin-crystal-logo.svg/512px-Toncoin-crystal-logo.svg.png",
    bg: "bg-[#0088CC]",
    padding: "p-0.5",
  },
  sol: {
    src: "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png",
    bg: "bg-black",
    padding: "p-1",
  },
  solana: {
    src: "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png",
    bg: "bg-black",
    padding: "p-1",
  },
  bsc: {
    src: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg",
    bg: "bg-[#F3BA2F]",
    padding: "p-1",
  },
  binance: {
    src: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg",
    bg: "bg-[#F3BA2F]",
    padding: "p-1",
  },
  tron: {
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Tron-logo.svg",
    bg: "bg-[#EF0027]",
    padding: "p-1",
  },
  trx: {
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Tron-logo.svg",
    bg: "bg-[#EF0027]",
    padding: "p-1",
  },
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
      style={{ width: size * 1.8, height: size * 1.1 }}
    >
      <img
        src={config.src}
        alt={name}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}
