import { useEffect, useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountWatermarkProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'premium';
}

/**
 * Watermark компонент для отображения информации об аккаунте
 * Помогает предотвратить передачу аккаунтов
 */
export function AccountWatermark({ className, variant = 'default' }: AccountWatermarkProps) {
  const { user, profileId } = useUserContext();
  const { isLifetime, isPremium } = usePremium();
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    const loadDisplayName = async () => {
      if (!profileId) return;

      // Пытаемся получить имя из профиля
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', profileId)
        .single();

      if (profile) {
        const name = profile.first_name || profile.username || 'Пользователь';
        setDisplayName(name);
      } else if (user?.first_name) {
        setDisplayName(user.first_name);
      }
    };

    loadDisplayName();
  }, [profileId, user]);

  if (!displayName) return null;

  const licenseType = isLifetime ? 'Premium Forever' : isPremium ? 'Premium' : 'Free';

  if (variant === 'minimal') {
    return (
      <div className={cn("fixed bottom-2 right-2 text-xs text-muted-foreground/60 z-50 pointer-events-none", className)}>
        {displayName} • {licenseType}
      </div>
    );
  }

  if (variant === 'premium') {
    return (
      <div className={cn(
        "fixed bottom-3 right-3 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 backdrop-blur-sm z-50 pointer-events-none",
        className
      )}>
        <div className="flex items-center gap-2 text-xs">
          <Crown className="w-3 h-3 text-yellow-500" />
          <span className="font-medium text-foreground">
            {displayName}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{licenseType}</span>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      "fixed bottom-2 right-2 px-2.5 py-1 rounded-md bg-background/80 border border-border/50 backdrop-blur-sm z-50 pointer-events-none shadow-sm",
      className
    )}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-medium">Аккаунт:</span>
        <span className="text-foreground">{displayName}</span>
        <span>•</span>
        <span>{licenseType}</span>
      </div>
    </div>
  );
}

