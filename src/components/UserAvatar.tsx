import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "@/components/optimized/Motion";
import { useProfileData, useUserSkins } from "@/hooks/useProfileData";
import { Crown, Bell } from "lucide-react";

interface UserAvatarProps {
    profileId: string | null;
    className?: string;
    avatarClassName?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    previewSkin?: any; // For shop/inventory
    showPremiumGlow?: boolean;
    forcePremium?: boolean;
    unreadCount?: number;
    showNotificationBadge?: boolean;
    onClick?: () => void;
}

export function UserAvatar({
    profileId,
    className,
    avatarClassName,
    size = "md",
    previewSkin,
    showPremiumGlow = true,
    forcePremium,
    unreadCount = 0,
    showNotificationBadge = true,
    onClick
}: UserAvatarProps) {
    const { profileData: profile, loading: isLoading } = useProfileData(profileId);
    const { data: activeSkinData } = useUserSkins(profileId);
    const [isHovered, setIsHovered] = useState(false);

    const activeSkin = previewSkin || activeSkinData;

    // Проверка премиума через унифицированный геттер или принудительно
    const isProfilePremium = useMemo(() => {
        if (forcePremium !== undefined) return forcePremium;
        if (!profile) return false;
        return profile.subscription_status === 'pro' ||
            profile.subscription_status === 'lifetime' ||
            !!profile.premium_forever_purchased_at ||
            (profile.settings as any)?.subscription_type === 'lifetime';
    }, [profile, forcePremium]);

    const sizeClasses = {
        "xs": "h-6 w-6",
        "sm": "h-8 w-8",
        "md": "h-10 w-10",
        "lg": "h-12 w-12",
        "xl": "h-20 w-20",
        "2xl": "h-32 w-32",
        "3xl": "h-40 w-40"
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    if (isLoading && !profile && profileId) {
        return <Skeleton className={cn(sizeClasses[size || "md"], "rounded-full", className)} />;
    }

    return (
        <div
            className={cn(
                "relative inline-flex items-center justify-center shrink-0 isolate rounded-full transition-transform duration-500",
                isHovered && "scale-[1.04]",
                className
            )}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* PREMIUM Rotating Metallic Border - RESTORED & OPTIMIZED */}
            {isProfilePremium && !activeSkin && showPremiumGlow && (
                <>
                    <motion.div
                        className={cn(
                            "absolute rounded-full pointer-events-none z-[5]",
                            size === "2xl" || size === "3xl" ? "-inset-[4px]" : size === "xl" ? "-inset-[3px]" : "-inset-[2.5px]"
                        )}
                        style={{
                            padding: '2px',
                            background: 'conic-gradient(from 0deg, #f59e0b 0%, #fbbf24 25%, #fff 50%, #fbbf24 75%, #f59e0b 100%)',
                            boxShadow: isHovered 
                                ? '0 0 20px rgba(245, 158, 11, 0.6)' 
                                : '0 0 12px rgba(245, 158, 11, 0.3)'
                        }}
                        animate={{ 
                            rotate: 360
                        }}
                        transition={{ 
                            duration: isHovered ? 2 : 4, 
                            repeat: Infinity, 
                            ease: "linear" 
                        }}
                    >
                        {/* Inner masking to create the hollow ring effect */}
                        <div className="w-full h-full rounded-full bg-background" />
                    </motion.div>

                    {/* Premium Aura Particles */}
                    <div className="absolute inset-0 pointer-events-none z-0 overflow-visible">
                        {Array.from({ length: size === "xl" || size === "2xl" || size === "3xl" ? 14 : 10 }).map((_, i) => {
                            const angle = (i * 360) / (size === "xl" || size === "2xl" || size === "3xl" ? 14 : 10);
                            const radius = size === "xl" || size === "2xl" || size === "3xl" ? (isHovered ? 80 : 60) : (isHovered ? 40 : 30);
                            return (
                                <motion.div
                                    key={i}
                                    className="absolute top-1/2 left-1/2 rounded-full bg-amber-500"
                                    style={{
                                        width: isHovered ? '1.8px' : '1.2px',
                                        height: isHovered ? '1.8px' : '1.2px',
                                        boxShadow: '0 0 6px rgba(245, 158, 11, 0.6)',
                                        marginLeft: '-0.6px',
                                        marginTop: '-0.6px'
                                    }}
                                    animate={{
                                        opacity: isHovered ? [0, 0.9, 0] : [0, 0.6, 0],
                                        scale: isHovered ? [0, 1.4, 0] : [0, 1, 0],
                                        x: [
                                            Math.cos(angle * Math.PI / 180) * (radius * (isHovered ? 0.4 : 0.7)),
                                            Math.cos((angle + (isHovered ? 30 : 15)) * Math.PI / 180) * radius
                                        ],
                                        y: [
                                            Math.sin(angle * Math.PI / 180) * (radius * (isHovered ? 0.4 : 0.7)),
                                            Math.sin((angle + (isHovered ? 30 : 15)) * Math.PI / 180) * radius
                                        ],
                                    }}
                                    transition={{
                                        duration: isHovered ? 1.5 : 4,
                                        repeat: Infinity,
                                        delay: i * 0.4,
                                        ease: "easeInOut"
                                    }}
                                />
                            );
                        })}
                    </div>
                </>
            )}

            {/* Refined Mini Crown Badge - Minimalist Style */}
            {isProfilePremium && !activeSkin && showPremiumGlow && (
                <motion.div
                    className={cn(
                        "absolute z-30 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-md shadow-sm border border-white/10",
                        size === "xl" || size === "2xl" || size === "3xl" 
                            ? "w-6 h-6 bottom-[-2px] right-[-2px]" 
                            : "w-3.5 h-3.5 -bottom-1 -right-1"
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <Crown className={cn("text-amber-500/90 fill-amber-500/90", size === "xl" || size === "2xl" || size === "3xl" ? "h-3 w-3" : "h-2 w-2")} />
                </motion.div>
            )}

            {/* Notification Badge - Symmetrical to Premium Badge (Bell Icon) */}
            {showNotificationBadge && unreadCount > 0 && (
                <motion.div
                    className={cn(
                        "absolute z-30 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-md shadow-sm border border-white/10",
                        size === "xl" || size === "2xl" || size === "3xl" 
                            ? "w-6 h-6 top-[-2px] right-[-2px]" 
                            : "w-3.5 h-3.5 -top-1 -right-1"
                    )}
                    initial={{ scale: 0 }}
                    animate={{ 
                        scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                        scale: {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        },
                        type: "spring", 
                        stiffness: 300, 
                        damping: 25 
                    }}
                >
                    <Bell className={cn(
                        "text-red-500 fill-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]", 
                        size === "xl" || size === "2xl" || size === "3xl" ? "h-3 w-3" : "h-2 w-2"
                    )} />
                </motion.div>
            )}

            {/* ADVANCED Skin Effects based on rarity or specific ID */}
            {activeSkin && (
                <>
                    <motion.div
                        className={cn(
                            "absolute rounded-full pointer-events-none z-0",
                            size === "2xl" ? "-inset-[5px]" : size === "xl" ? "-inset-[4px]" : "-inset-[3px]",
                            // Специфичные рамки
                            activeSkin.id === 'frame_novice' && "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400",
                            activeSkin.id === 'frame_season_1_premium' && "bg-gradient-to-b from-[#EED08A] to-[#C5A059] shadow-[0_0_20px_rgba(197,160,89,0.5)]",
                            // Общие по редкости
                            !['frame_novice', 'frame_season_1_premium'].includes(activeSkin.id) && activeSkin.rarity === "legendary" && "bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.5)]",
                            !['frame_novice', 'frame_season_1_premium'].includes(activeSkin.id) && activeSkin.rarity === "epic" && "bg-gradient-to-br from-blue-400 via-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]",
                            !['frame_novice', 'frame_season_1_premium'].includes(activeSkin.id) && activeSkin.rarity === "rare" && "bg-gradient-to-br from-blue-300 via-blue-500 to-cyan-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        )}
                        animate={activeSkin.id === 'frame_season_1_premium' ? { scale: [1, 1.02, 1] } : activeSkin.rarity === "legendary" && !['frame_novice', 'frame_season_1_premium'].includes(activeSkin.id) ? { rotate: -360 } : undefined}
                        transition={{ duration: activeSkin.id === 'frame_season_1_premium' ? 2 : 8, repeat: Infinity, ease: activeSkin.id === 'frame_season_1_premium' ? "easeInOut" : "linear" }}
                    />

                    {/* Дополнительный вращающийся паттерн для season 1 premium */}
                    {activeSkin.id === 'frame_season_1_premium' && (
                        <motion.div
                            className={cn(
                                "absolute rounded-full pointer-events-none z-[1]",
                                size === "2xl" ? "-inset-[3px]" : size === "xl" ? "-inset-[2px]" : "-inset-[1px]",
                                "border border-dashed border-black/30"
                            )}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        />
                    )}
                </>
            )}

            <Avatar className={cn(
                sizeClasses[size],
                "transition-all relative z-10 overflow-hidden",
                isProfilePremium && !activeSkin
                    ? "ring-[1px] ring-white/10"
                    : !activeSkin ? "ring-[0.5px] ring-white/5" : "",
                activeSkin?.rarity === "legendary" && "ring-[1px] ring-white/20",
                activeSkin?.rarity === "epic" && "ring-[1px] ring-white/15",
                avatarClassName
            )}>
                <AvatarImage
                    src={profile?.photo_url || undefined}
                    className="object-cover"
                />

                {/* ADVANCED INTERNAL GLINT - Very fast and bright sweep */}
                {(isProfilePremium || (activeSkin && activeSkin.rarity !== 'common')) && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                        <motion.div
                            className="absolute -inset-[200%] bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            style={{ rotate: '25deg' }}
                            animate={{
                                x: ['-100%', '300%']
                            }}
                            transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                repeatDelay: 1.5
                            }}
                        />
                    </div>
                )}

                <AvatarFallback className={cn(
                    "text-white font-black overflow-hidden relative",
                    size === "3xl" ? "text-5xl" : size === "2xl" ? "text-4xl" : size === "xl" ? "text-2xl" : "text-sm",
                    // Premium mesh-like background for fallback
                    isProfilePremium && !activeSkin && "bg-slate-950",
                    activeSkin?.rarity === "legendary" && "bg-amber-950",
                    activeSkin?.rarity === "epic" && "bg-indigo-950",
                    activeSkin?.rarity === "rare" && "bg-blue-950",
                    !isProfilePremium && !activeSkin && "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                )}>
                    {/* Fallback Mesh Gradient Layer */}
                    {isProfilePremium && !activeSkin && (
                        <div className="absolute inset-0 z-0 opacity-80 bg-gradient-to-br from-yellow-600 via-orange-700 to-amber-900" />
                    )}

                    {/* Skin Fallback Layer */}
                    {activeSkin && (
                        <div className="absolute inset-0 z-0 opacity-80">
                            <div className={cn(
                                "absolute -inset-[10%] blur-lg",
                                activeSkin.rarity === "legendary" && "bg-gradient-to-tr from-yellow-400 to-orange-600",
                                activeSkin.rarity === "epic" && "bg-gradient-to-tr from-blue-500 to-purple-600",
                                activeSkin.rarity === "rare" && "bg-gradient-to-tr from-blue-400 to-cyan-600"
                            )} />
                        </div>
                    )}

                    <span className="relative z-10 drop-shadow-md">
                        {activeSkin?.metadata?.emoji || getInitials(profile?.first_name)}
                    </span>
                </AvatarFallback>

                {/* Particle bits for Legendary (Constant, non-blinking) */}
                {activeSkin?.rarity === "legendary" && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-200/40 rounded-full blur-[1px]" />
                        <div className="absolute bottom-1/3 right-1/4 w-0.5 h-0.5 bg-white/30 rounded-full" />
                    </div>
                )}
            </Avatar>

            {/* Animations are now handled via framer-motion for better control */}
        </div>
    );
}
