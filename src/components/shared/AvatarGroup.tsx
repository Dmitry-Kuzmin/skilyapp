import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarGroupProps {
  avatars: { photoUrl: string | null; initials: string; id: string }[];
  limit?: number;
  totalCount?: number | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  overlap?: number;
  ringColor?: string;
  moreBgColor?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  limit = 4,
  totalCount,
  size = 'md',
  className,
  overlap = -3,
  ringColor = 'ring-background',
  moreBgColor = 'bg-violet-600'
}) => {
  const displayAvatars = avatars.slice(0, limit);
  
  const sizeClasses = {
    sm: 'h-6 w-6 text-[8px]',
    md: 'h-8 w-8 text-[10px]',
    lg: 'h-10 w-10 text-[12px]'
  };

  return (
    <div className={cn("flex items-center", className)} style={{ marginLeft: `${Math.abs(overlap) / 4}rem` }}>
      <div className="flex" style={{ gap: `${overlap}px` }}>
        {displayAvatars.map((avatar, i) => (
          <motion.div
            key={avatar.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
            style={{ zIndex: limit - i }}
          >
            <Avatar className={cn(
              sizeClasses[size],
              "border-none shadow-lg transition-transform hover:scale-110",
              "ring-2", ringColor
            )}>
              <AvatarImage src={avatar.photoUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-white font-bold uppercase">
                {avatar.initials}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        ))}
        
        {totalCount && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: displayAvatars.length * 0.1 }}
            className="relative"
            style={{ zIndex: 0 }}
          >
            <div className={cn(
              sizeClasses[size],
              "rounded-full border-2 flex items-center justify-center font-bold text-white shadow-lg",
              ringColor.replace('ring-', 'border-'),
              moreBgColor
            )}>
              {typeof totalCount === 'number' ? `+${totalCount}` : totalCount}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
