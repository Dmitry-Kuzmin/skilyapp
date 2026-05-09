import React from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: number;
}

const BRAND_CONFIG: Record<string, string> = {
  visa: "logos:visa",
  mastercard: "logos:mastercard",
  applepay: "logos:apple-pay",
  "apple pay": "logos:apple-pay",
  googlepay: "logos:google-pay",
  "google pay": "logos:google-pay",
  paypal: "logos:paypal",
  btc: "cryptocurrency-color:btc",
  bitcoin: "cryptocurrency-color:btc",
  eth: "cryptocurrency-color:eth",
  ethereum: "cryptocurrency-color:eth",
  usdt: "cryptocurrency-color:usdt",
  tether: "cryptocurrency-color:usdt",
  ton: "token-branded:ton", // Используем проверенный набор для TON
  sol: "cryptocurrency-color:sol",
  solana: "cryptocurrency-color:sol",
  bsc: "cryptocurrency-color:bnb",
  binance: "cryptocurrency-color:bnb",
  tron: "cryptocurrency-color:trx",
  trx: "cryptocurrency-color:trx",
};

export function BrandLogo({ name, className, size = 32 }: BrandLogoProps) {
  const key = name.toLowerCase().trim();
  const iconName = BRAND_CONFIG[key];

  if (!iconName) return null;

  const isCrypto = iconName.startsWith("cryptocurrency") || iconName.startsWith("token");
  const isApplePay = key.includes("apple");

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-transform hover:scale-110",
        isCrypto && "drop-shadow-sm",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon 
        icon={iconName} 
        width={size} 
        height={size} 
        className={cn(
          "max-w-full max-h-full",
          // Инвертируем черный логотип Apple Pay для видимости на темном фоне
          isApplePay && "invert brightness-[10]"
        )}
      />
    </div>
  );
}
