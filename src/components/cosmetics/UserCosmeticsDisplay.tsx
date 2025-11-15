import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserCosmeticsDisplayProps {
  userId: string;
  variant?: "avatar" | "badges" | "full";
  className?: string;
}

interface ActiveSkin {
  skin_id: string;
  skin_definitions: {
    name_ru: string;
    metadata: {
      color?: string;
      effect?: string;
      animated?: boolean;
    };
  };
}

interface DisplayedBadge {
  badge_id: string;
  display_order: number;
  badge_definitions: {
    name_ru: string;
    rarity: string;
    metadata: {
      icon?: string;
      color?: string;
      animated?: boolean;
    };
  };
}

export function UserCosmeticsDisplay({ userId, variant = "full", className }: UserCosmeticsDisplayProps) {
  const [activeSkin, setActiveSkin] = useState<ActiveSkin | null>(null);
  const [displayedBadges, setDisplayedBadges] = useState<DisplayedBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadCosmetics();
    }
  }, [userId]);

  const loadCosmetics = async () => {
    try {
      setLoading(true);

      // Загружаем активный скин
      const { data: skinData } = await supabase
        .from("user_skins")
        .select("skin_id, skin_definitions(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (skinData) {
        setActiveSkin(skinData as ActiveSkin);
      }

      // Загружаем отображаемые бейджи
      const { data: badgesData } = await supabase
        .from("user_badges")
        .select("badge_id, display_order, badge_definitions(*)")
        .eq("user_id", userId)
        .eq("is_displayed", true)
        .order("display_order", { ascending: true })
        .limit(3);

      if (badgesData) {
        setDisplayedBadges(badgesData as DisplayedBadge[]);
      }
    } catch (error) {
      console.error("Error loading cosmetics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Только аватар
  if (variant === "avatar") {
    if (!activeSkin) return null;

    return (
      <div
        className={cn(
          "relative w-full h-full rounded-full flex items-center justify-center overflow-hidden",
          activeSkin.skin_definitions.metadata.animated && "animate-pulse",
          className
        )}
        style={{
          background: activeSkin.skin_definitions.metadata.color || "#6366f1",
        }}
      >
        {activeSkin.skin_definitions.metadata.effect === "sparkle" && (
          <Sparkles className="absolute top-1 right-1 w-3 h-3 animate-spin text-white/80" />
        )}
      </div>
    );
  }

  // Только бейджи
  if (variant === "badges") {
    if (displayedBadges.length === 0) return null;

    return (
      <div className={cn("flex items-center gap-1", className)}>
        {displayedBadges.map((badge) => (
          <div
            key={badge.badge_id}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs",
              badge.badge_definitions.metadata.animated && "animate-bounce"
            )}
            style={{
              background: `${badge.badge_definitions.metadata.color || "#6366f1"}20`,
              color: badge.badge_definitions.metadata.color || "#6366f1",
            }}
            title={badge.badge_definitions.name_ru}
          >
            {badge.badge_definitions.metadata.icon === "trophy" && <Trophy className="w-3 h-3" />}
            {badge.badge_definitions.metadata.icon === "flame" && "🔥"}
            {badge.badge_definitions.metadata.icon === "star" && "⭐"}
            {badge.badge_definitions.metadata.icon === "crown" && "👑"}
            {badge.badge_definitions.metadata.icon === "calendar" && "📅"}
          </div>
        ))}
      </div>
    );
  }

  // Полное отображение (скин + бейджи)
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Активный скин */}
      {activeSkin && (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white relative overflow-hidden",
              activeSkin.skin_definitions.metadata.animated && "animate-pulse"
            )}
            style={{
              background: activeSkin.skin_definitions.metadata.color || "#6366f1",
            }}
          >
            {activeSkin.skin_definitions.metadata.effect === "sparkle" && (
              <Sparkles className="absolute top-0.5 right-0.5 w-2.5 h-2.5 animate-spin" />
            )}
            {activeSkin.skin_definitions.name_ru.charAt(0)}
          </div>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {activeSkin.skin_definitions.name_ru}
          </Badge>
        </div>
      )}

      {/* Отображаемые бейджи */}
      {displayedBadges.length > 0 && (
        <div className="flex items-center gap-1">
          {displayedBadges.map((badge) => (
            <Badge
              key={badge.badge_id}
              variant="outline"
              className={cn(
                "text-xs flex items-center gap-1",
                badge.badge_definitions.metadata.animated && "animate-bounce"
              )}
              style={{
                borderColor: badge.badge_definitions.metadata.color || "#6366f1",
                color: badge.badge_definitions.metadata.color || "#6366f1",
              }}
            >
              {badge.badge_definitions.metadata.icon === "trophy" && <Trophy className="w-3 h-3" />}
              {badge.badge_definitions.metadata.icon === "flame" && "🔥"}
              {badge.badge_definitions.metadata.icon === "star" && "⭐"}
              {badge.badge_definitions.metadata.icon === "crown" && "👑"}
              {badge.badge_definitions.metadata.icon === "calendar" && "📅"}
              {badge.badge_definitions.name_ru}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

