/**
 * ReloadPrompt - Компонент для ручного обновления PWA
 * Показывает баннер, когда доступна новая версия приложения
 * 
 * КРИТИЧНО: Без этого компонента пользователи застрянут на старой версии
 * при registerType: 'prompt'
 */

import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[ReloadPrompt] SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('[ReloadPrompt] SW registration error:', error);
    },
    onNeedRefresh() {
      console.log('[ReloadPrompt] 🔄 New version available');
    },
  });

  // Не показываем, если обновление не требуется
  if (!needRefresh) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-zinc-900 border-t border-zinc-800 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                Доступно обновление!
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Новая версия приложения готова к установке
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                // Закрываем баннер без обновления
                setNeedRefresh(false);
              }}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => {
                // Обновляем Service Worker и перезагружаем страницу
                updateServiceWorker(true);
              }}
              size="sm"
              className="bg-white text-black hover:bg-zinc-100 font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

















