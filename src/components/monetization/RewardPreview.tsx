import { Coins, Crown, Zap, Sparkles, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RewardPreviewProps {
  reward: {
    type: string;
    amount?: number;
    id?: string;
    name_ru?: string;
    image_url?: string;
    rarity?: string;
  };
  isPremium?: boolean;
  size?: 'sm' | 'md';
}

export function RewardPreview({ reward, isPremium = false, size = 'sm' }: RewardPreviewProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-12 h-12 text-sm'
  };
  
  const rarityColors: Record<string, string> = {
    common: 'bg-gray-500/10 border-gray-500/20',
    rare: 'bg-blue-500/10 border-blue-500/20',
    epic: 'bg-purple-500/10 border-purple-500/20',
    legendary: 'bg-yellow-500/10 border-yellow-500/20'
  };
  
  if (reward.type === 'coins') {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border",
        isPremium ? "bg-yellow-500/10 border-yellow-500/20" : "bg-yellow-500/10 border-yellow-500/20"
      )}>
        <Coins className="w-4 h-4 text-yellow-500 shrink-0" />
        <span className="text-xs font-semibold">{reward.amount}</span>
      </div>
    );
  }
  
  if (reward.type === 'boost') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-purple-500/10 border-purple-500/20">
        <Zap className="w-4 h-4 text-purple-500 shrink-0" />
        <span className="text-xs font-medium">{reward.name_ru || 'Буст'}</span>
      </div>
    );
  }
  
  if (reward.type === 'skin' || reward.type === 'badge' || reward.type === 'sticker') {
    return (
      <div className={cn(
        "relative rounded-lg border overflow-hidden group cursor-pointer transition-all hover:scale-105",
        rarityColors[reward.rarity || 'common'],
        sizeClasses[size]
      )}>
        {reward.image_url ? (
          <img 
            src={reward.image_url} 
            alt={reward.name_ru || reward.type}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {reward.type === 'skin' && <Sparkles className="w-5 h-5 text-purple-400" />}
            {reward.type === 'badge' && <Crown className="w-5 h-5 text-yellow-400" />}
            {reward.type === 'sticker' && <ImageIcon className="w-5 h-5 text-blue-400" />}
          </div>
        )}
        {reward.rarity === 'legendary' && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 animate-pulse" />
        )}
        {isPremium && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full border border-yellow-600" />
        )}
      </div>
    );
  }
  
  return null;
}



