import { motion } from "framer-motion";
import { Sparkles, Trophy, Flame, Crown, Calendar, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewSkin {
  id: string;
  name_ru: string;
  metadata: {
    color?: string;
    effect?: string;
    animated?: boolean;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface PreviewBadge {
  id: string;
  name_ru: string;
  metadata: {
    icon?: string;
    color?: string;
    animated?: boolean;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface PreviewSticker {
  id: string;
  name_ru: string;
  metadata: {
    emoji?: string;
    effect?: string;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface AvatarPreviewProps {
  previewSkin?: PreviewSkin | null;
  previewBadges?: PreviewBadge[];
  previewSticker?: PreviewSticker | null;
  userName?: string;
  className?: string;
}

export function AvatarPreview({
  previewSkin,
  previewBadges = [],
  previewSticker,
  userName = "Т",
  className,
}: AvatarPreviewProps) {
  const getInitial = () => {
    if (userName && userName.length > 0) {
      return userName.charAt(0).toUpperCase();
    }
    return "Т";
  };

  const getBadgeIcon = (icon?: string) => {
    switch (icon) {
      case "trophy":
        return <Trophy className="w-4 h-4" />;
      case "flame":
        return <Flame className="w-4 h-4" />;
      case "star":
        return <Star className="w-4 h-4" />;
      case "crown":
        return <Crown className="w-4 h-4" />;
      case "calendar":
        return <Calendar className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const skinColor = previewSkin?.metadata.color || "#6366f1";
  const skinRarity = previewSkin?.rarity || "common";

  return (
    <div className={cn("relative", className)}>
      {/* Основной контейнер аватара */}
      <div className="relative flex flex-col items-center gap-4">
        {/* Аватар с выбранным скином */}
        <motion.div
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center text-4xl font-extrabold text-white shadow-2xl transition-all duration-300",
            previewSkin?.metadata.animated && "animate-pulse",
            skinRarity === "legendary" && "shadow-yellow-500/50 ring-4 ring-yellow-500/30",
            skinRarity === "epic" && "shadow-blue-500/50 ring-4 ring-blue-500/30",
            skinRarity === "rare" && "shadow-blue-500/30 ring-2 ring-blue-500/20"
          )}
          style={{
            background: previewSkin
              ? `radial-gradient(circle at 30% 30%, ${skinColor}ff, ${skinColor}cc 40%, ${skinColor}88 100%)`
              : "radial-gradient(circle at 30% 30%, #6366f1ff, #8b5cf6cc 40%, #6366f188 100%)",
          }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Эффекты скина */}
          {previewSkin?.metadata.effect === "sparkle" && (
            <>
              <Sparkles className="absolute top-2 right-2 w-6 h-6 animate-spin text-white/90 drop-shadow-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(255,255,255,0.15)_100%)] animate-pulse" />
            </>
          )}
          {previewSkin?.metadata.effect === "fire" && (
            <>
              <Flame className="absolute top-2 right-2 w-6 h-6 text-orange-400 animate-bounce drop-shadow-lg" />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-500/40 to-transparent" />
            </>
          )}
          {previewSkin?.metadata.effect === "shine" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer rounded-full" />
          )}

          {/* Частицы для легендарных */}
          {skinRarity === "legendary" && (
            <>
              <motion.div
                className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-300 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0,
                }}
              />
              <motion.div
                className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-orange-300 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.3,
                }}
              />
              <motion.div
                className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-yellow-200 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.7,
                }}
              />
            </>
          )}

          {/* Буква инициала */}
          <span className="relative z-10 drop-shadow-2xl">{getInitial()}</span>

          {/* Градиентная рамка */}
          <div
            className={cn(
              "absolute inset-0 rounded-full border-4 opacity-60",
              skinRarity === "legendary" && "border-yellow-400/60",
              skinRarity === "epic" && "border-blue-400/60",
              skinRarity === "rare" && "border-blue-400/40",
              skinRarity === "common" && "border-gray-400/40"
            )}
          />
        </motion.div>

        {/* Бейджи под аватаром (максимум 3) */}
        {previewBadges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {previewBadges.slice(0, 3).map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden shadow-lg",
                  badge.rarity === "legendary" && "bg-gradient-to-br from-yellow-500/30 via-orange-500/30 to-yellow-500/30 ring-2 ring-yellow-400/50",
                  badge.rarity === "epic" && "bg-gradient-to-br from-blue-500/30 via-pink-500/30 to-blue-500/30 ring-2 ring-blue-400/50",
                  badge.rarity === "rare" && "bg-gradient-to-br from-blue-500/30 via-cyan-500/30 to-blue-500/30 ring-2 ring-blue-400/30",
                  badge.rarity === "common" && "bg-gradient-to-br from-gray-500/30 via-gray-400/30 to-gray-500/30",
                  badge.metadata.animated && "animate-bounce"
                )}
                style={{
                  color: badge.metadata.color || "#6366f1",
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {getBadgeIcon(badge.metadata.icon)}
                {badge.rarity === "legendary" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer rounded-full" />
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Стикер рядом с аватаром (если выбран) */}
        {previewSticker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className={cn(
              "absolute -right-4 top-0 w-16 h-16 rounded-2xl flex items-center justify-center text-5xl shadow-xl",
              previewSticker.rarity === "legendary" && "bg-gradient-to-br from-yellow-400/40 via-orange-400/40 to-yellow-400/40 ring-2 ring-yellow-400/50",
              previewSticker.rarity === "epic" && "bg-gradient-to-br from-blue-400/40 via-pink-400/40 to-blue-400/40 ring-2 ring-blue-400/50",
              previewSticker.rarity === "rare" && "bg-gradient-to-br from-blue-400/40 via-cyan-400/40 to-blue-400/40 ring-2 ring-blue-400/30",
              previewSticker.rarity === "common" && "bg-gradient-to-br from-gray-300/40 via-gray-200/40 to-gray-300/40"
            )}
            whileHover={{ scale: 1.15, rotate: 12 }}
          >
            <div className="drop-shadow-2xl filter brightness-110 contrast-110">
              {previewSticker.metadata.emoji || "😊"}
            </div>
            {previewSticker.rarity === "legendary" && (
              <div className="absolute -inset-1 bg-yellow-400/30 rounded-2xl blur-md animate-pulse" />
            )}
          </motion.div>
        )}

        {/* Информация о выбранном скине */}
        {previewSkin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-1"
          >
            <p className="text-sm font-semibold">{previewSkin.name_ru}</p>
            <p className="text-xs text-muted-foreground">
              {previewSkin.rarity === "legendary" && "Легендарный"}
              {previewSkin.rarity === "epic" && "Эпический"}
              {previewSkin.rarity === "rare" && "Редкий"}
              {previewSkin.rarity === "common" && "Обычный"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

