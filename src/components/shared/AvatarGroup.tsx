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
  overlap = -3, // This prop is now mapped to space-x classes for better consistency
  ringColor = 'ring-background',
  moreBgColor = 'bg-violet-600'
}) => {
  const displayAvatars = avatars.slice(0, limit);
  
  const sizeClasses = {
    sm: 'h-6 w-6 text-[8px]',
    md: 'h-8 w-8 text-[10px]',
    lg: 'h-10 w-10 text-[12px]'
  };

  // Map overlap to tailwind space-x classes
  const spaceClass = overlap <= -12 ? '-space-x-3' : overlap <= -8 ? '-space-x-2' : '-space-x-1';

  return (
    <div className={cn("flex items-center group", className)}>
      <div className={cn("flex items-center", spaceClass)}>
        {displayAvatars.map((avatar, i) => (
          <motion.div
            key={avatar.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="relative transition-transform duration-300 group-hover:translate-x-1"
            style={{ zIndex: i + 1 }}
          >
            <Avatar className={cn(
              sizeClasses[size],
              "border-none shadow-lg",
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
            className="relative transition-transform duration-300 group-hover:translate-x-1"
            style={{ zIndex: limit + 1 }}
          >
            <div className={cn(
              sizeClasses[size],
              "rounded-full border-2 flex items-center justify-center font-bold text-white shadow-lg",
              ringColor.replace('ring-', 'border-').replace('ring-[', 'border-['),
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
