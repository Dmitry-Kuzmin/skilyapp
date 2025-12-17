import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface BoostFeedbackProps {
  isActive: boolean;
  boostName: string;
  boostType: string;
}

export const BoostFeedback: React.FC<BoostFeedbackProps> = ({ isActive, boostName, boostType }) => {
  // Определяем иконку и цвет в зависимости от типа буста
  const getBoostStyle = () => {
    const isExploit = ['screen_injector', 'input_lag', 'gps_spoofing', 'police_backdoor', 'firewall', 'cryptolocker'].includes(boostType);
    
    if (isExploit) {
      return {
        borderColor: 'border-red-500/50',
        textColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        progressColor: 'bg-red-500',
        scanColor: 'bg-red-500/50',
        label: 'EXPLOIT'
      };
    }
    
    return {
      borderColor: 'border-green-500/50',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
      progressColor: 'bg-green-500',
      scanColor: 'bg-green-500/50',
      label: 'UTILITY'
    };
  };

  const style = getBoostStyle();

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Затемнение фона */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          
          <motion.div
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative ${style.bgColor} ${style.borderColor} border-2 p-6 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.3)] text-center overflow-hidden max-w-sm w-full mx-4`}
          >
            {/* Декоративная полоса сканирования */}
            <motion.div 
              animate={{ top: ['0%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className={`absolute left-0 w-full h-1 ${style.scanColor} blur-[2px]`}
            />

            {/* Иконка */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="mb-3"
            >
              <Zap className={`w-12 h-12 ${style.textColor} mx-auto`} />
            </motion.div>

            {/* Протокол */}
            <div className={`${style.textColor} font-mono text-xs mb-2 tracking-[0.2em] uppercase`}>
              PROTOCOL: {style.label}
            </div>
            
            {/* Название буста */}
            <h2 className="text-2xl font-black text-white italic tracking-tighter mb-4">
              {boostName.toUpperCase()}
            </h2>

            {/* Статус */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-lg font-bold text-white mb-4"
            >
              UPLOADING...
            </motion.div>
            
            {/* Прогресс бар */}
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
              <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={`h-full ${style.progressColor}`}
              />
            </div>
            
            {/* Статистика */}
            <div className="mt-3 flex justify-between text-[10px] font-mono text-zinc-400">
              <span>PACKET_LOSS: 0%</span>
              <span>STATUS: ACTIVE</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

