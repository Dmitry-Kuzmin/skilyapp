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
    src: "https://www.vectorlogo.zone/logos/visa/visa-official.svg",
    bg: "bg-white",
    padding: "p-1.5",
  },
  mastercard: {
    src: "https://www.vectorlogo.zone/logos/mastercard/mastercard-official.svg",
    bg: "bg-white",
    padding: "p-1",
  },
  "apple pay": {
    src: "https://www.vectorlogo.zone/logos/apple_pay/apple_pay-official.svg",
    bg: "bg-white",
    padding: "p-1.5",
  },
  applepay: {
    src: "https://www.vectorlogo.zone/logos/apple_pay/apple_pay-official.svg",
    bg: "bg-white",
    padding: "p-1.5",
  },
  "google pay": {
    src: "https://www.vectorlogo.zone/logos/google_pay/google_pay-official.svg",
    bg: "bg-white",
    padding: "p-1",
  },
  googlepay: {
    src: "https://www.vectorlogo.zone/logos/google_pay/google_pay-official.svg",
    bg: "bg-white",
    padding: "p-1",
  },
  paypal: {
    src: "https://www.vectorlogo.zone/logos/paypal/paypal-official.svg",
    bg: "bg-white",
    padding: "p-1.5",
  },
  btc: {
    src: "https://www.vectorlogo.zone/logos/bitcoin/bitcoin-official.svg",
    bg: "bg-[#F7931A]",
    padding: "p-1",
  },
  bitcoin: {
    src: "https://www.vectorlogo.zone/logos/bitcoin/bitcoin-official.svg",
    bg: "bg-[#F7931A]",
    padding: "p-1",
  },
  eth: {
    src: "https://www.vectorlogo.zone/logos/ethereum/ethereum-official.svg",
    bg: "bg-[#627EEA]",
    padding: "p-1",
  },
  ethereum: {
    src: "https://www.vectorlogo.zone/logos/ethereum/ethereum-official.svg",
    bg: "bg-[#627EEA]",
    padding: "p-1",
  },
  usdt: {
    src: "https://www.vectorlogo.zone/logos/tether/tether-official.svg",
    bg: "bg-[#26A17B]",
    padding: "p-1",
  },
  tether: {
    src: "https://www.vectorlogo.zone/logos/tether/tether-official.svg",
    bg: "bg-[#26A17B]",
    padding: "p-1",
  },
  ton: {
    src: "https://cryptologos.cc/logos/toncoin-ton-logo.png?v=025",
    bg: "bg-[#0088CC]",
    padding: "p-1",
  },
  sol: {
    src: "https://www.vectorlogo.zone/logos/solana/solana-official.svg",
    bg: "bg-black",
    padding: "p-1",
  },
  solana: {
    src: "https://www.vectorlogo.zone/logos/solana/solana-official.svg",
    bg: "bg-black",
    padding: "p-1",
  },
  bsc: {
    src: "https://www.vectorlogo.zone/logos/binance/binance-official.svg",
    bg: "bg-[#F3BA2F]",
    padding: "p-1",
  },
  binance: {
    src: "https://www.vectorlogo.zone/logos/binance/binance-official.svg",
    bg: "bg-[#F3BA2F]",
    padding: "p-1",
  },
  tron: {
    src: "https://www.vectorlogo.zone/logos/tron/tron-official.svg",
    bg: "bg-[#EF0027]",
    padding: "p-1",
  },
  trx: {
    src: "https://www.vectorlogo.zone/logos/tron/tron-official.svg",
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
        loading="eager"
        draggable={false}
        onError={(e) => {
          // Fallback if image fails
          console.error(`Failed to load logo for ${name}`);
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
