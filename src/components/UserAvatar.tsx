import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface UserAvatarProps {
    profileId: string | null;
    className?: string;
    avatarClassName?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    previewSkin?: any; // For shop/inventory
    showPremiumGlow?: boolean;
    onClick?: () => void;
}

/**
 * ОПТИМИЗИРОВАННЫЙ хук для загрузки данных аватара и активного скина
 */
export const useUserAvatarData = (profileId: string | null) => {
    return useQuery({
        queryKey: ['user-avatar-data', profileId],
        queryFn: async () => {
            if (!profileId) return null;

            const [profileResult, skinResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('photo_url, first_name, last_name, username, subscription_status, premium_forever_purchased_at, settings')
                    .eq('id', profileId)
                    .single(),
                supabase
                    .from('user_skins')
                    .select(`
                        is_active,
                        skin_definitions (*)
                    `)
                    .eq('user_id', profileId)
                    .eq('is_active', true)
                    .maybeSingle()
            ]);

            if (profileResult.error) throw profileResult.error;

            return {
                profile: profileResult.data,
                activeSkin: skinResult.data?.skin_definitions || null
            };
        },
        enabled: !!profileId,
        staleTime: 5 * 60 * 1000,
    });
};

export function UserAvatar({
    profileId,
    className,
    avatarClassName,
    size = "md",
    previewSkin,
    showPremiumGlow = true,
    onClick
}: UserAvatarProps) {
    const { data, isLoading } = useUserAvatarData(profileId);

    const profile = data?.profile;
    const activeSkin = previewSkin || data?.activeSkin;

    // Проверка премиума
    const isProfilePremium = useMemo(() => {
        if (!profile) return false;
        if (profile.subscription_status === 'pro' || profile.subscription_status === 'lifetime') return true;
        if (profile.premium_forever_purchased_at) return true;
        if ((profile.settings as any)?.subscription_type === 'lifetime') return true;
        return false;
    }, [profile]);

    const sizeClasses = {
        "xs": "h-6 w-6",
        "sm": "h-8 w-8",
        "md": "h-10 w-10",
        "lg": "h-12 w-12",
        "xl": "h-20 w-20",
        "2xl": "h-32 w-32"
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    if (isLoading && !profile && profileId) {
        return <Skeleton className={cn(sizeClasses[size], "rounded-full", className)} />;
    }

    return (
        <div
            className={cn(
                "relative inline-flex items-center justify-center shrink-0 isolate",
                className
            )}
            onClick={onClick}
        >
            {/* ADVANCED Premium Effects Container */}
            {isProfilePremium && !activeSkin && showPremiumGlow && (
                <>
                    {/* Outer Pulse Glow */}
                    <motion.div
                        className={cn(
                            "absolute rounded-full border-2 border-amber-500/20 blur-md -z-20",
                            size === "2xl" ? "-inset-6" : "-inset-4"
                        )}
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.3, 0.1]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Rotating High-Contrast Border */}
                    <motion.div
                        className={cn(
                            "absolute rounded-full pointer-events-none z-0",
                            size === "2xl" ? "-inset-[4px]" : size === "xl" ? "-inset-[3px]" : "-inset-[2px]"
                        )}
                        style={{
                            background: 'conic-gradient(from 0deg, #f59e0b, #fbbf24 20%, #fff 45%, #fff 55%, #fbbf24 80%, #f59e0b 100%)',
                            boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)'
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                </>
            )}

            {/* ADVANCED Skin Effects based on rarity */}
            {activeSkin && (
                <motion.div
                    className={cn(
                        "absolute rounded-full pointer-events-none z-0",
                        size === "2xl" ? "-inset-[5px]" : size === "xl" ? "-inset-[4px]" : "-inset-[3px]",
                        activeSkin.rarity === "legendary" && "bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.5)]",
                        activeSkin.rarity === "epic" && "bg-gradient-to-br from-blue-400 via-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]",
                        activeSkin.rarity === "rare" && "bg-gradient-to-br from-blue-300 via-blue-500 to-cyan-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    )}
                    animate={activeSkin.rarity === "legendary" ? { rotate: -360 } : undefined}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
            )}

            <Avatar className={cn(
                sizeClasses[size],
                "transition-all relative z-10 overflow-hidden",
                isProfilePremium && !activeSkin
                    ? "ring-[1px] ring-white/10"
                    : !activeSkin ? "ring-[0.5px] ring-border/20" : "",
                activeSkin?.rarity === "legendary" && "ring-1 ring-white/20",
                activeSkin?.rarity === "epic" && "ring-1 ring-white/20",
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
                    size === "2xl" ? "text-4xl" : size === "xl" ? "text-2xl" : "text-sm",
                    // Premium mesh-like background for fallback
                    isProfilePremium && !activeSkin && "bg-slate-950",
                    activeSkin?.rarity === "legendary" && "bg-amber-950",
                    activeSkin?.rarity === "epic" && "bg-indigo-950",
                    activeSkin?.rarity === "rare" && "bg-blue-950",
                    !isProfilePremium && !activeSkin && "bg-primary/20 text-primary"
                )}>
                    {/* Fallback Mesh Gradient Layer */}
                    {isProfilePremium && !activeSkin && (
                        <div className="absolute inset-0 z-0 opacity-60">
                            <div className="absolute -inset-[10%] bg-gradient-to-br from-yellow-500 via-orange-600 to-amber-700 blur-xl" />
                        </div>
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
