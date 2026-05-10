import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, Flame, Trophy } from "lucide-react";

interface OpponentCosmeticsShowcaseProps {
  userId: string | null | undefined;
  fallbackName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface ActiveSkinPayload {
  skin_id: string;
  skin_definitions: {
    name_ru: string;
    rarity: string;
    metadata: { color?: string; effect?: string; emoji?: string; animated?: boolean };
  } | null;
}

interface DisplayedBadgePayload {
  badge_id: string;
  display_order: number;
  badge_definitions: {
    name_ru: string;
    rarity: string;
    metadata: { icon?: string; color?: string; animated?: boolean };
  } | null;
}

const SIZE_MAP = {
  sm: { wrap: "w-12 h-12", text: "text-base", badge: "w-4 h-4 text-[9px]" },
  md: { wrap: "w-20 h-20", text: "text-3xl", badge: "w-5 h-5 text-[11px]" },
  lg: { wrap: "w-28 h-28", text: "text-4xl", badge: "w-6 h-6 text-xs" },
} as const;

export function OpponentCosmeticsShowcase({
  userId,
  fallbackName,
  size = "md",
  className,
}: OpponentCosmeticsShowcaseProps) {
  const [skin, setSkin] = useState<ActiveSkinPayload | null>(null);
  const [badges, setBadges] = useState<DisplayedBadgePayload[]>([]);
  const [collectionCount, setCollectionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [skinResp, badgesResp, totalResp] = await Promise.all([
          supabase
            .from("user_skins")
            .select("skin_id, skin_definitions(name_ru, rarity, metadata)")
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle(),
          supabase
            .from("user_badges")
            .select("badge_id, display_order, badge_definitions(name_ru, rarity, metadata)")
            .eq("user_id", userId)
            .eq("is_displayed", true)
            .order("display_order", { ascending: true })
            .limit(3),
          supabase
            .from("user_skins")
            .select("skin_id", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);
        if (cancelled) return;
        setSkin((skinResp.data as ActiveSkinPayload | null) ?? null);
        setBadges((badgesResp.data as DisplayedBadgePayload[] | null) ?? []);
        setCollectionCount(totalResp.count ?? 0);
      } catch (err) {
        console.warn("[OpponentCosmeticsShowcase] load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const sz = SIZE_MAP[size];
  const meta = skin?.skin_definitions?.metadata;
  const rarity = skin?.skin_definitions?.rarity ?? "common";
  const color = meta?.color || "#6366f1";
  const ringClass =
    rarity === "legendary"
      ? "ring-yellow-400/70"
      : rarity === "epic"
      ? "ring-purple-400/60"
      : rarity === "rare"
      ? "ring-blue-400/60"
      : "ring-white/30";
  const initial = (skin?.skin_definitions?.name_ru ?? fallbackName ?? "?").charAt(0).toUpperCase();

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center text-white font-extrabold relative overflow-hidden shadow-xl ring-2 ring-offset-2 ring-offset-transparent",
          sz.wrap,
          sz.text,
          ringClass,
          meta?.animated && "animate-pulse"
        )}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}ff, ${color}cc 40%, ${color}88 100%)`,
        }}
      >
        {meta?.effect === "sparkle" && (
          <Sparkles className="absolute top-1 right-1 w-3 h-3 text-white/90 animate-spin-slow" />
        )}
        {meta?.effect === "fire" && (
          <Flame className="absolute bottom-1 right-1 w-3 h-3 text-orange-200 animate-bounce" />
        )}
        <span className="relative z-10 drop-shadow-md">{meta?.emoji || initial}</span>
      </div>

      {badges.length > 0 && (
        <div className="flex items-center gap-1">
          {badges.map((b) => {
            const bMeta = b.badge_definitions?.metadata;
            const bColor = bMeta?.color || "#6366f1";
            return (
              <div
                key={b.badge_id}
                className={cn(
                  "rounded-full flex items-center justify-center font-bold border",
                  sz.badge,
                  bMeta?.animated && "animate-bounce"
                )}
                style={{ background: `${bColor}30`, borderColor: `${bColor}80`, color: bColor }}
                title={b.badge_definitions?.name_ru}
              >
                {bMeta?.icon === "trophy" ? (
                  <Trophy className="w-3 h-3" />
                ) : bMeta?.icon === "flame" ? (
                  "🔥"
                ) : bMeta?.icon === "star" ? (
                  "⭐"
                ) : bMeta?.icon === "crown" ? (
                  "👑"
                ) : bMeta?.icon === "calendar" ? (
                  "📅"
                ) : (
                  "•"
                )}
              </div>
            );
          })}
        </div>
      )}

      {collectionCount !== null && collectionCount > 0 && (
        <div className="text-[10px] text-white/70 font-medium tracking-wide">
          {collectionCount} {pluralize(collectionCount)}
        </div>
      )}
    </div>
  );
}

function pluralize(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "предмет";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "предмета";
  return "предметов";
}
