import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, Shield, Trophy, Target, Clock, Zap, Smartphone, Monitor, Info, History, Flame } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { OpponentActivityIndicator } from './OpponentActivityIndicator';
import { CompactConnectionStatusIndicator } from './CompactConnectionStatusIndicator';
import { memo, useState, useEffect, useRef } from 'react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { cn } from '@/lib/utils';

// Функция для генерации инициалов из имени (оставлена на всякий случай)
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

const getFallbackAvatar = (name: string) => {
  if (!name) return `https://i.pravatar.cc/150?u=fallback`;
  const lowerName = name.toLowerCase().trim();

  const isFemale = lowerName.endsWith('a') || lowerName.endsWith('я') || lowerName.endsWith('и') || lowerName.endsWith('ah') || lowerName === 'chloe' || lowerName === 'zoe';

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const femaleIds = [1, 5, 9, 10, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 47, 48, 49];
  const maleIds = [3, 4, 6, 7, 8, 11, 12, 13, 14, 15, 17, 18, 33, 37, 46, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67];

  const ids = isFemale ? femaleIds : maleIds;
  const index = Math.abs(hash) % ids.length;
  return `https://i.pravatar.cc/150?img=${ids[index]}`;
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
  // Props for connection status indicator
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

  // Функция для получения только имени
  const getFirstName = (fullName: string | null) => {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  };

  const myDisplayName = getFirstName(myName) || 'Ты';
  const opponentDisplayName = getFirstName(opponentName) || 'Соперник';

  const [myImgError, setMyImgError] = useState(false);
  const [opponentImgError, setOpponentImgError] = useState(false);

  return (
    <div className={cn(
      "flex items-center gap-2 md:gap-3 min-w-0 flex-nowrap",
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
          <div className={cn(
            "relative p-0.5 rounded-2xl transition-all duration-500",
            myInsuranceActive && "ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]"
          )}>
            {myInsuranceActive && (
              <>
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.4, 1],
                    rotate: [0, 90, 180, 270, 360]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-6 rounded-full bg-gradient-to-r from-emerald-400/30 via-green-400/50 to-emerald-400/30 blur-2xl z-0 pointer-events-none"
                />
                <motion.div
                  animate={{
                    opacity: [0.5, 0.9, 0.5],
                    scale: [1.2, 1.6, 1.2]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 blur-sm z-0 shadow-[0_0_15px_rgba(52,211,153,0.8)] pointer-events-none"
                />
              </>
            )}
            <Avatar className="h-10 w-10 md:h-12 md:w-12 rounded-xl border border-white/10 shadow-sm relative z-10 bg-background">
              <AvatarImage src={(myPhotoUrl && !myImgError) ? myPhotoUrl : getFallbackAvatar(myName)} alt={myName || ''} onError={() => setMyImgError(true)} />
              <AvatarFallback className="bg-slate-800 text-slate-400 font-bold uppercase">
                {getInitials(myName)}
              </AvatarFallback>
            </Avatar>
          </div>
          {/* Иконка страховки рядом с фото */}
          <AnimatePresence>
            {myInsuranceActive && (
              <motion.div
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                className="absolute -bottom-1 -left-1 z-30 bg-emerald-500 rounded-lg p-0.5 shadow-[0_0_10px_rgba(16,185,129,0.5)] border border-white/20"
              >
                <Shield className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Иконка КОМБО поверх аватара */}
          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5 z-30 flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 rounded-full px-1.5 py-0.5 border border-white dark:border-slate-900 shadow-lg"
              >
                <Flame className="w-2.5 h-2.5 text-white animate-pulse" />
                <span className="text-[10px] font-black text-white ml-0.5">x{combo}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-start gap-0.5 mb-0.5">
            <p className="text-xs font-medium text-muted-foreground truncate max-w-[100px] md:max-w-none" title={myName || 'Ты'}>{myDisplayName}</p>
            {myInsuranceActive && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/30"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Страховка</span>
              </motion.div>
            )}
          </div>
          <div className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ml-1 flex items-center overflow-visible">
            <AnimatedCounter value={myScore} />
          </div>
        </div>
      </motion.div>

      <div className="text-xl md:text-2xl font-black text-muted-foreground/20 px-1">VS</div>

      {/* Opponent Score */}
      <motion.div
        className="flex items-center gap-2 md:gap-3 group"
        whileHover={{ scale: 1.02 }}
        animate={opponentAnswered ? { scale: [1, 1.05, 1] } : {}}
      >
        <div className="flex-1 text-right min-w-0">
          <div className="flex flex-col items-end gap-0.5 mb-0.5">
            <p
              className="text-xs font-medium text-muted-foreground truncate max-w-[100px] md:max-w-[120px]"
              title={opponentName}
              key={`opponent-name-${opponentName}`}
            >
              {opponentDisplayName || 'Соперник'}
            </p>
            {opponentInsuranceActive && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/30"
              >
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Страховка</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
              </motion.div>
            )}
          </div>
          <div className="text-xl md:text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent text-right mr-1 flex items-center justify-end overflow-visible">
            <AnimatedCounter value={opponentScore} />
          </div>
        </div>
        <div className="relative">
          <div className={cn(
            "relative p-0.5 rounded-2xl transition-all duration-500",
            opponentInsuranceActive && "ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]"
          )}>
            {opponentInsuranceActive && (
              <>
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.4, 1],
                    rotate: [0, 90, 180, 270, 360]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-6 rounded-full bg-gradient-to-r from-emerald-400/30 via-green-400/50 to-emerald-400/30 blur-2xl z-0 pointer-events-none"
                />
                <motion.div
                  animate={{
                    opacity: [0.5, 0.9, 0.5],
                    scale: [1.2, 1.6, 1.2]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 blur-sm z-0 shadow-[0_0_15px_rgba(52,211,153,0.8)] pointer-events-none"
                />
              </>
            )}
            <Avatar className="h-10 w-10 md:h-12 md:w-12 rounded-xl border border-white/10 shadow-sm relative z-20 bg-background">
              <AvatarImage src={(opponentPhotoUrl && opponentPhotoUrl.trim() !== '' && !opponentPhotoUrl.includes('undefined') && !opponentPhotoUrl.includes('null') && !opponentImgError) ? opponentPhotoUrl : getFallbackAvatar(opponentName)} alt={opponentName || ''} onError={() => setOpponentImgError(true)} />
              <AvatarFallback className="bg-slate-800 text-white font-bold uppercase">
                {getInitials(opponentName)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Индикатор активности соперника - компактный */}
          <div className="absolute -bottom-0.5 -right-0.5 z-30">
            <OpponentActivityIndicator
              status={opponentActivityStatus}
              showTooltip={true}
            />
          </div>

          {/* Connection status indicator with auto-win timer */}
          <CompactConnectionStatusIndicator
            lastSeen={opponentLastSeen ? new Date(opponentLastSeen) : null}
            isConnected={opponentIsConnected}
          />

          {/* Иконка страховки рядом с фото */}
          <AnimatePresence>
            {opponentInsuranceActive && (
              <motion.div
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                className="absolute -bottom-1 -left-1 z-30 bg-emerald-500 rounded-lg p-0.5 shadow-[0_0_10px_rgba(16,185,129,0.5)] border border-white/20"
              >
                <Shield className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Иконка молнии когда соперник отвечает */}
          <AnimatePresence>
            {opponentAnswered && (
              <motion.div
                className="absolute -top-1.5 -right-1.5 z-30 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 border-2 border-white"
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
    </div>
  );
});

DuelScoreBoard.displayName = 'DuelScoreBoard';
