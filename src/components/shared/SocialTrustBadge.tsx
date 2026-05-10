import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarGroup } from './AvatarGroup';
import { useOnlinePlayers } from '@/hooks/useGamesData';
import { useLanguage } from '@/contexts/LanguageContext';

interface SocialTrustBadgeProps {
  className?: string;
  totalCount?: string;
  showStars?: boolean;
}

export const SocialTrustBadge: React.FC<SocialTrustBadgeProps> = ({
  className,
  showStars = true
}) => {
  const { language } = useLanguage();
  const { data: onlineData } = useOnlinePlayers();

  const socialProofAvatars = (onlineData?.players ?? [])
    .filter(p => p.photoUrl && p.photoUrl.trim() !== '' && p.photoUrl.startsWith('http'))
    .slice(0, 3)
    .map(p => ({
      id: p.id,
      photoUrl: p.photoUrl,
      initials: p.initials
    }));

  const trustText = language === 'ru' ? `Выбор тысяч учеников`
    : language === 'es' ? `La elección de miles de alumnos`
    : `Trusted by thousands of students`;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <AvatarGroup 
        avatars={socialProofAvatars}
        size="md"
        overlap={-12}
        ringColor="ring-[#080B16]"
        moreBgColor="bg-violet-600"
      />
      <div>
        {showStars && (
          <div className="flex text-amber-400 text-[10px] gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-3 h-3 fill-current" />
            ))}
          </div>
        )}
        <p className="text-[11px] font-medium text-slate-400">{trustText}</p>
      </div>
    </div>
  );
};
