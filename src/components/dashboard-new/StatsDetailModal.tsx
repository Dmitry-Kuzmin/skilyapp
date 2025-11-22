import React, { useState, useEffect } from 'react';
import { UnifiedModal } from '@/components/ui/unified-modal';
import { useModalRoute } from '@/hooks/useModalRoute';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, Target, Zap, Award, BarChart3, 
  CheckCircle2, Clock, Star, Coins, Flame
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    averageScore: number;
    currentStreak: number;
    testsCompleted: number;
    accuracy: number;
    coins: number;
    xp?: number;
    level?: number;
  };
  statType: 'xp' | 'tests' | 'accuracy' | 'streak' | 'coins' | 'level';
}

export const StatsDetailModal: React.FC<StatsDetailModalProps> = ({
  open,
  onOpenChange,
  stats,
  statType
}) => {
  const route = useModalRoute(`stats-${statType}`);
  const isOpen = open || route.isOpen;
  
  const handleOpenChange = (state: boolean) => {
    if (onOpenChange) {
      onOpenChange(state);
    }
    if (state) {
      route.openModal();
    } else {
      route.closeModal();
    }
  };

  const getStatInfo = () => {
    switch (statType) {
      case 'xp':
        return {
          title: 'Опыт (XP)',
          icon: Zap,
          value: stats.xp || 0,
          description: 'Опыт, который ты получаешь за прохождение тестов и выполнение заданий.',
          details: [
            { label: 'Текущий уровень', value: stats.level || 1 },
            { label: 'XP до следующего уровня', value: `${5000 - ((stats.xp || 0) % 5000)} XP` },
            { label: 'Всего набрано', value: `${stats.xp || 0} XP` },
          ],
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20'
        };
      case 'tests':
        return {
          title: 'Всего тестов',
          icon: BarChart3,
          value: stats.testsCompleted,
          description: 'Количество пройденных тестов. Чем больше тестов, тем лучше твоя подготовка.',
          details: [
            { label: 'Пройдено тестов', value: stats.testsCompleted },
            { label: 'Средний результат', value: `${stats.averageScore}%` },
            { label: 'Точность', value: `${stats.accuracy}%` },
          ],
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20'
        };
      case 'accuracy':
        return {
          title: 'Точность',
          icon: Target,
          value: `${stats.accuracy}%`,
          description: 'Процент правильных ответов во всех пройденных тестах.',
          details: [
            { label: 'Текущая точность', value: `${stats.accuracy}%` },
            { label: 'Средний результат', value: `${stats.averageScore}%` },
            { label: 'Пройдено тестов', value: stats.testsCompleted },
          ],
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20'
        };
      case 'streak':
        return {
          title: 'Серия дней',
          icon: Flame,
          value: stats.currentStreak,
          description: 'Количество дней подряд, когда ты проходил тесты.',
          details: [
            { label: 'Текущая серия', value: `${stats.currentStreak} дней` },
            { label: 'Рекордная серия', value: `${stats.currentStreak} дней` },
            { label: 'Продолжай тренироваться!', value: '🔥' },
          ],
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20'
        };
      case 'coins':
        return {
          title: 'Монеты',
          icon: Coins,
          value: stats.coins,
          description: 'Виртуальная валюта для покупки бустов и улучшений.',
          details: [
            { label: 'Текущий баланс', value: `${stats.coins} монет` },
            { label: 'Заработано всего', value: `${stats.coins} монет` },
            { label: 'Использовано', value: '0 монет' },
          ],
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20'
        };
      case 'level':
        return {
          title: 'Уровень',
          icon: Star,
          value: stats.level || 1,
          description: 'Твой текущий уровень прогресса в обучении.',
          details: [
            { label: 'Текущий уровень', value: stats.level || 1 },
            { label: 'Опыт', value: `${stats.xp || 0} XP` },
            { label: 'XP до следующего', value: `${5000 - ((stats.xp || 0) % 5000)} XP` },
          ],
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20'
        };
      default:
        return null;
    }
  };

  const statInfo = getStatInfo();
  if (!statInfo) return null;

  const Icon = statInfo.icon;
  const progress = statType === 'xp' 
    ? ((stats.xp || 0) % 5000) / 5000 * 100
    : statType === 'accuracy'
    ? stats.accuracy
    : statType === 'level'
    ? ((stats.xp || 0) % 5000) / 5000 * 100
    : 0;

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={statInfo.title}
      className="max-w-md"
      showTitleBar={true}
      modalRouteKey={`stats-${statType}`}
    >
      <div className="space-y-4">
        {/* Main stat card */}
        <Card className={`${statInfo.bgColor} ${statInfo.borderColor} border-2 p-6`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full ${statInfo.bgColor} ${statInfo.borderColor} border-2 flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${statInfo.color}`} />
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-400 mb-1">{statInfo.title}</div>
              <div className={`text-3xl font-bold ${statInfo.color}`}>
                {statInfo.value}
              </div>
            </div>
          </div>
          
          {progress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Прогресс</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </Card>

        {/* Description */}
        <Card className="bg-slate-800/50 border border-slate-700/50 p-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {statInfo.description}
          </p>
        </Card>

        {/* Details */}
        <div className="space-y-2">
          {statInfo.details.map((detail, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-slate-800/30 border border-slate-700/30 p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">{detail.label}</span>
                  <span className="text-sm font-semibold text-white">{detail.value}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </UnifiedModal>
  );
};

