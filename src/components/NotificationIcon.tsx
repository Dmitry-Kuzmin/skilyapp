// ОПТИМИЗАЦИЯ: Используем named imports вместо wildcard для tree-shaking
// Это уменьшает размер bundle, так как импортируются только нужные иконки
import {
  Flame,
  Swords,
  Lightbulb,
  XCircle,
  Rocket,
  CheckCircle2,
  Zap,
  Timer,
  SkipForward,
  Globe,
  Flag,
  Target,
  Trophy,
  Clock,
  Bell,
  Moon,
  Turtle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationIconProps {
  iconName?: string | null;
  className?: string;
  size?: number;
}

// Маппинг строковых имён на компоненты иконок
const iconMap: Record<string, LucideIcon> = {
  'flame': Flame,
  'sword': Swords,
  'lightbulb': Lightbulb,
  'x-circle': XCircle,
  'rocket': Rocket,
  'check-circle': CheckCircle2,
  'zap': Zap,
  'timer': Timer,
  'skip-forward': SkipForward,
  'globe': Globe,
  'flag': Flag,
  'target': Target,
  'trophy': Trophy,
  'clock': Clock,
  'bell': Bell,
  'moon': Moon,
  'turtle': Turtle,
};

export function NotificationIcon({ iconName, className, size = 20 }: NotificationIconProps) {
  if (!iconName) return null;

  // Если это смайлик (старый формат), не показываем
  if (iconName.match(/[\u{1F300}-\u{1F9FF}]/u)) {
    return null;
  }

  const IconComponent = iconMap[iconName.toLowerCase()];
  if (!IconComponent) {
    // Fallback icon
    return <Bell className={cn('text-muted-foreground', className)} size={size} />;
  }

  return <IconComponent className={className} size={size} />;
}

