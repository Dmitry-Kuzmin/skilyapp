import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { Trophy, Swords, Shield, Zap, Coins, Sparkles, Flame } from 'lucide-react';
import { OpponentActivityIndicator } from './OpponentActivityIndicator';
import { CompactConnectionStatusIndicator } from './CompactConnectionStatusIndicator';
import { memo } from 'react';
import { cn } from '@/lib/utils';

// Функция для генерации инициалов из имени
const getInitials = (name: string): string => {
  if (!name || name.trim().length === 0) return '?';

  // Очищаем имя от лишних символов и разбиваем на части
  // Обрабатываем пробелы, подчеркивания, дефисы как разделители
  const cleaned = name.trim().replace(/[_\-\s]+/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return '?';

  // Если одно слово - берем первые 2 символа (буквы приоритетнее)
  if (words.length === 1) {
    const word = words[0];
    // Ищем первые 2 буквы (пропускаем цифры и спецсимволы)
    // Используем два отдельных класса для латиницы и кириллицы
    const letters = word.match(/[A-Za-z]|[А-Яа-я]/g);
    if (letters && letters.length >= 2) {
      return letters.slice(0, 2).join('').toUpperCase();
    }
    if (letters && letters.length === 1) {
      return letters[0].toUpperCase();
    }
    // Если букв нет - берем первые 2 символа
    return word.substring(0, 2).toUpperCase();
  }

  // Если несколько слов - берем первые буквы каждого слова (максимум 2)
  const initials = words
    .slice(0, 2)
    .map(w => {
      // Берем первую букву из слова (латиница или кириллица)
      const firstLetter = w.match(/[A-Za-z]|[А-Яа-я]/);
      return firstLetter ? firstLetter[0].toUpperCase() : w[0].toUpperCase();
    })
    .join('');

  return initials || '?';
};

interface DuelScoreBoardProps {
  myScore: number;
  opponentScore: number;
  myName: string;
  opponentName: string;
  myPhotoUrl: string | null;
  opponentPhotoUrl: string | null;
  myInsuranceActive: boolean;
  myCoverageDisplay: number;
  opponentInsuranceActive: boolean;
  opponentCoverageDisplay: number;
  opponentActivityStatus: 'online' | 'thinking' | 'answering' | 'reconnecting' | 'offline';
  opponentAnswered: boolean;
  betInfo: {
    totalBank: number;
    betAmount: number;
  } | null;
  seasonBonusDisplay: number;
  isTelegramMobile: boolean;
  // 🆕 Пропсы для компактного индикатора статуса подключения
  opponentIsConnected?: boolean;
  opponentLastSeen?: Date | null;
  combo?: number;
}

export const DuelScoreBoard = memo(({
  myScore,
  opponentScore,
  myName,
  opponentName,
  myPhotoUrl,
  opponentPhotoUrl,
  myInsuranceActive,
  myCoverageDisplay,
  opponentInsuranceActive,
  opponentCoverageDisplay,
  opponentActivityStatus,
  opponentAnswered,
  betInfo,
  seasonBonusDisplay,
  isTelegramMobile,
  opponentIsConnected = true,
  opponentLastSeen = null,
  combo = 0,
}: DuelScoreBoardProps) => {
  return (
    <div className={cn(
      "flex items-center gap-2 md:gap-3 min-w-0 flex-wrap",
      isTelegramMobile && "flex-1 justify-center"
    )}>
      {/* My Score */}
      <motion.div
        className="flex items-center gap-2 md:gap-3 group"
        whileHover={{ scale: 1.02 }}
        animate={myScore > opponentScore ? {
          boxShadow: ['0 0 0px rgba(59, 130, 246, 0)', '0 0 20px rgba(59, 130, 246, 0.5)', '0 0 0px rgba(59, 130, 246, 0)']
        } : {}}
      >
        <div className="relative">
          {myPhotoUrl ? (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border-2 border-blue-500/50 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              <img
                src={myPhotoUrl}
                alt={myName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              <span className="text-sm md:text-base font-bold text-white select-none">
                {getInitials(myName)}
              </span>
            </div>
          )}
          {/* Иконка страховки рядом с фото */}
          {myInsuranceActive && (
            <div className="absolute -bottom-0.5 -left-0.5 z-10 bg-background rounded-full p-0.5 shadow-sm border border-green-500/50">
              <Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
            </div>
          )}
          {/* Иконка КОМБО поверх аватара */}
          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 z-20 flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 rounded-full px-1.5 py-0.5 border border-white dark:border-slate-900 shadow-lg"
              >
                <Flame className="w-2.5 h-2.5 text-white animate-pulse" />
                <span className="text-[10px] font-black text-white ml-0.5">x{combo}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs font-medium text-muted-foreground truncate max-w-[100px] md:max-w-none" title={myName}>{myName}</p>
            {myInsuranceActive && (
              <Shield className="w-3 h-3 text-green-600 dark:text-green-400 shrink-0" title={`Страховка: ${myCoverageDisplay}%`} />
            )}
          </div>
          <motion.div
            key={myScore}
            className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            initial={{ scale: 1.2, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {myScore}
          </motion.div>
        </div>
      </motion.div>

      <div className="text-xl md:text-2xl font-bold text-muted-foreground/30 px-2">VS</div>

      {/* Opponent Score */}
      <motion.div
        className="flex items-center gap-2 md:gap-3 group"
        whileHover={{ scale: 1.02 }}
        animate={opponentAnswered ? { scale: [1, 1.05, 1] } : {}}
      >
        <div className="flex-1 text-right min-w-0">
          <div className="flex items-center justify-end gap-1.5 mb-0.5">
            {opponentInsuranceActive && (
              <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" title={`Страховка: ${opponentCoverageDisplay}%`} />
            )}
            <p
              className="text-xs font-medium text-muted-foreground truncate max-w-[100px] md:max-w-[120px]"
              title={opponentName}
              key={`opponent-name-${opponentName}`}
            >
              {opponentName || 'Соперник'}
            </p>
          </div>
          <motion.div
            key={opponentScore}
            className="text-xl md:text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent text-right"
            initial={{ scale: 1.2, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {opponentScore}
          </motion.div>
        </div>
        <div className="relative">
          {opponentPhotoUrl && opponentPhotoUrl.trim() !== '' && !opponentPhotoUrl.includes('undefined') && !opponentPhotoUrl.includes('null') ? (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border-2 border-orange-500/50 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
              <img
                src={opponentPhotoUrl}
                alt={opponentName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Если изображение не загрузилось - скрываем img и показываем fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                        <span class="text-sm md:text-base font-bold text-white select-none">${getInitials(opponentName)}</span>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
              <span className="text-sm md:text-base font-bold text-white select-none">
                {getInitials(opponentName)}
              </span>
            </div>
          )}

          {/* Индикатор активности соперника - компактный */}
          <div className="absolute -bottom-0.5 -right-0.5 z-10">
            <OpponentActivityIndicator
              status={opponentActivityStatus}
              showTooltip={true}
            />
          </div>

          {/* 🆕 Компактный индикатор статуса подключения с таймером авто-победы */}
          <CompactConnectionStatusIndicator
            lastSeen={opponentLastSeen}
            isConnected={opponentIsConnected}
          />

          {/* Иконка страховки рядом с фото */}
          {opponentInsuranceActive && (
            <div className="absolute -bottom-0.5 -left-0.5 z-10 bg-background rounded-full p-0.5 shadow-sm border border-blue-500/50">
              <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          )}

          {/* Иконка молнии когда соперник отвечает */}
          <AnimatePresence>
            {opponentAnswered && (
              <motion.div
                className="absolute -top-1 -right-1 z-20 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 border-2 border-white"
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: [0, 1.3, 1],
                  rotate: [180, 0],
                }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{
                  duration: 0.6,
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
              >
                <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 text-white fill-white" strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Компактные индикаторы банка и награды - адаптивные */}
      {betInfo && !isTelegramMobile && (
        <div className="flex items-center gap-2.5 ml-2 md:ml-4 flex-wrap">
          {/* Банк - компактный индикатор */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/20 whitespace-nowrap">
            <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              {betInfo.totalBank.toLocaleString('ru-RU')}
            </span>
          </div>

          {/* SP награда - компактный индикатор */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-400/20 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
              +{seasonBonusDisplay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

DuelScoreBoard.displayName = 'DuelScoreBoard';


