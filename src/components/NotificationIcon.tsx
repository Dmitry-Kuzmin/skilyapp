import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationIconProps {
  iconName?: string | null;
  className?: string;
  size?: number;
}

const iconMap: Record<string, keyof typeof Icons> = {
  'flame': 'Flame',
  'sword': 'Swords',
  'lightbulb': 'Lightbulb',
  'x-circle': 'XCircle',
  'rocket': 'Rocket',
  'check-circle': 'CheckCircle2',
  'zap': 'Zap',
  'timer': 'Timer',
  'skip-forward': 'SkipForward',
  'globe': 'Globe',
  'flag': 'Flag',
  'target': 'Target',
  'trophy': 'Trophy',
  'clock': 'Clock',
  'bell': 'Bell',
  'moon': 'Moon',
  'turtle': 'Turtle',
};

export function NotificationIcon({ iconName, className, size = 20 }: NotificationIconProps) {
  if (!iconName) return null;

  // Если это смайлик (старый формат), не показываем
  if (iconName.match(/[\u{1F300}-\u{1F9FF}]/u)) {
    return null;
  }

  const iconKey = iconMap[iconName.toLowerCase()];
  if (!iconKey) {
    // Fallback icon
    return <Icons.Bell className={cn('text-muted-foreground', className)} size={size} />;
  }

  const IconComponent = Icons[iconKey] as React.ComponentType<{ className?: string; size?: number }>;
  if (!IconComponent) {
    return <Icons.Bell className={cn('text-muted-foreground', className)} size={size} />;
  }

  return <IconComponent className={className} size={size} />;
}

