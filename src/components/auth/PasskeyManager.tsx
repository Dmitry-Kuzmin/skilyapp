/**
 * PasskeyManager
 * 
 * Управление Passkeys в Settings
 * Регистрация новых устройств + удаление старых
 * Премиальный дизайн (Linear/Vercel стиль + Auth Form style)
 */

import { useState, useEffect } from 'react';
import { Fingerprint, Smartphone, Laptop, Trash2, Plus, Loader2, AlertCircle, X, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import {
  registerPasskey,
  listPasskeys,
  deletePasskey,
  isPasskeySupported,
  isPlatformAuthenticatorAvailable,
  type PasskeyCredential,
} from '@/lib/passkey';
// AlertDialog removed — inline confirm used instead to avoid nested modal conflict
import { motion, AnimatePresence } from "@/components/optimized/Motion";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

// Автогенерация названия устройства
function getAutoDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Macintosh/.test(ua)) {
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Mac (Safari)';
    if (/Chrome/.test(ua)) return 'Mac (Chrome)';
    return 'Mac';
  }
  if (/Windows/.test(ua)) {
    if (/Edge/.test(ua)) return 'Windows (Edge)';
    if (/Chrome/.test(ua)) return 'Windows (Chrome)';
    return 'Windows';
  }
  if (/Android/.test(ua)) return 'Android';
  return 'Устройство';
}

export function PasskeyManager({ hideHeader = false }: { hideHeader?: boolean }) {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PasskeyCredential | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';

  // Проверка поддержки
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isPasskeySupported();
      setIsSupported(supported);

      if (supported) {
        const available = await isPlatformAuthenticatorAvailable();
        setIsAvailable(available);
        if (available) loadPasskeys();
        else setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };
    checkSupport();
  }, []);

  const loadPasskeys = async () => {
    setIsLoading(true);
    const result = await listPasskeys();
    if (result.success && result.passkeys) {
      setPasskeys(result.passkeys);
    } else {
      toast({
        title: 'Ошибка',
        description: result.error || 'Не удалось загрузить список',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const handleRegister = async () => {
    triggerHaptic('medium');
    setIsRegistering(true);
    const finalDeviceName = deviceName.trim() || getAutoDeviceName();
    const result = await registerPasskey({ deviceName: finalDeviceName });

    if (result.success) {
      toast.success('Passkey добавлен', {
        description: `Устройство "${finalDeviceName}" успешно зарегистрировано`,
      });
      setDeviceName('');
      setShowRegisterForm(false);
      loadPasskeys();
    } else {
      toast.error('Ошибка регистрации', {
        description: result.error || 'Не удалось добавить Passkey',
      });
    }
    setIsRegistering(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    triggerHaptic('medium');

    try {
      const result = await deletePasskey(deleteTarget.id);

      if (result.success) {
        toast.success('Passkey удалён', {
          description: `Устройство "${deleteTarget.device_name || 'Без названия'}" удалено`,
        });
        setPasskeys((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        toast.error('Ошибка удаления', {
          description: result.error || 'Не удалось удалить Passkey',
        });
      }
    } catch (err) {
      console.error('[PasskeyManager] Delete error:', err);
      toast.error('Ошибка', {
        description: 'Произошла ошибка при удалении ключа',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeviceIcon = (transports: string[] | null) => {
    if (!transports || transports.includes('internal')) {
      return (
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border",
          isDarkTheme ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"
        )}>
          <Fingerprint className={cn("w-5 h-5", isDarkTheme ? "text-indigo-400" : "text-indigo-600")} />
        </div>
      );
    }
    if (transports.includes('usb')) {
      return (
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border",
          isDarkTheme ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-100"
        )}>
          <Laptop className={cn("w-5 h-5", isDarkTheme ? "text-amber-400" : "text-amber-600")} />
        </div>
      );
    }
    return (
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border",
        isDarkTheme ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
      )}>
        <Smartphone className={cn("w-5 h-5", isDarkTheme ? "text-emerald-400" : "text-emerald-600")} />
      </div>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Никогда';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru });
  };

  if (!isSupported) {
    return (
      <div className={cn(
        "rounded-2xl border p-5 backdrop-blur-sm transition-all",
        isDarkTheme ? "border-amber-500/20 bg-amber-500/5" : "border-amber-200 bg-amber-50"
      )}>
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <h3 className={cn("text-sm font-bold tracking-tight", isDarkTheme ? "text-white" : "text-slate-900")}>Passkeys не поддерживаются</h3>
            <p className={cn("text-[11px] font-medium leading-tight", isDarkTheme ? "text-zinc-500" : "text-slate-500")}>
              Ваш браузер не поддерживает современную биометрию. Используйте Safari, Chrome или Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        {!hideHeader && (
          <div className="space-y-0.5">
            <h3 className={cn("text-lg font-black tracking-tight italic", isDarkTheme ? "text-white" : "text-slate-900")}>
              Passkeys
            </h3>
            <p className={cn("text-[11px] font-medium", isDarkTheme ? "text-zinc-500" : "text-slate-500")}>
              Вход без пароля через биометрию
            </p>
          </div>
        )}

        <div className={cn("flex items-center gap-2", hideHeader && "w-full justify-between")}>
          {hideHeader && (
            <div className="flex items-center gap-2">
              <ShieldCheck className={cn("w-4 h-4", isDarkTheme ? "text-indigo-400" : "text-indigo-600")} />
              <span className={cn("text-sm font-bold tracking-tight", isDarkTheme ? "text-white" : "text-slate-800")}>Passkeys</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {!showRegisterForm && (
              <Button
                onClick={() => {
                  triggerHaptic('light');
                  loadPasskeys();
                }}
                variant="ghost"
                size="icon"
                className={cn(
                  "w-10 h-10 rounded-xl transition-all",
                  isDarkTheme
                    ? "bg-white/5 border border-white/5 text-zinc-400 hover:text-white"
                    : "bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900"
                )}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            )}

            <AnimatePresence>
              {!showRegisterForm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button
                    onClick={() => {
                      triggerHaptic('light');
                      setShowRegisterForm(true);
                    }}
                    className={cn(
                      "h-10 px-5 font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95",
                      isDarkTheme
                        ? "bg-white text-black hover:bg-zinc-200 shadow-white/5"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20"
                    )}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Registration Deck */}
      <AnimatePresence>
        {showRegisterForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "group relative overflow-hidden rounded-3xl border p-6 backdrop-blur-2xl shadow-2xl transition-all",
              isDarkTheme ? "bg-zinc-900/40 border-white/5" : "bg-white border-indigo-100/50"
            )}
          >
            {/* Ambient Shadow glow */}
            <div className={cn(
              "absolute inset-0 opacity-50 pointer-events-none transition-opacity",
              isDarkTheme ? "bg-gradient-to-br from-indigo-500/5 to-transparent" : "bg-gradient-to-br from-indigo-500/[0.03] to-transparent"
            )} />

            <div className="relative z-10 space-y-5">
              <div className="space-y-2">
                <label className={cn("text-[9px] font-black uppercase tracking-[0.25em] ml-1", isDarkTheme ? "text-zinc-500" : "text-slate-400")}>
                  Название устройства
                </label>
                <Input
                  type="text"
                  placeholder="MacBook Pro, iPhone 15, Windows PC..."
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  maxLength={50}
                  className={cn(
                    "h-14 rounded-2xl text-center font-bold placeholder:font-medium transition-all text-sm",
                    isDarkTheme
                      ? "bg-zinc-950/80 border-white/5 focus:border-indigo-500/50 text-white placeholder:text-zinc-700"
                      : "bg-slate-50 border-slate-200 focus:border-indigo-400 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  )}
                  disabled={isRegistering}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering || (deviceName === '' && !isRegistering)}
                  className={cn(
                    "flex-1 h-12 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98]",
                    "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02]",
                    "disabled:opacity-50 disabled:grayscale disabled:scale-100"
                  )}
                >
                  {isRegistering ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-5 h-5" />
                      <span>Зарегистрировать</span>
                    </div>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowRegisterForm(false);
                    setDeviceName('');
                  }}
                  variant="ghost"
                  className={cn(
                    "px-6 h-12 rounded-2xl font-bold text-sm transition-all",
                    isDarkTheme
                      ? "bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      : "bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                  )}
                  disabled={isRegistering}
                >
                  Отмена
                </Button>
              </div>

              <p className={cn("text-[10px] text-center font-medium px-4", isDarkTheme ? "text-zinc-600" : "text-slate-400")}>
                Название опционально. После нажатия браузер запросит Face ID, Touch ID или Windows Hello
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Area */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className={cn("w-8 h-8 animate-spin", isDarkTheme ? "text-indigo-500/50" : "text-indigo-600/50")} />
            <span className={cn("text-[10px] font-black uppercase tracking-widest transition-pulse animate-pulse", isDarkTheme ? "text-zinc-700" : "text-slate-400")}>
              Считывание ключей...
            </span>
          </div>
        ) : passkeys.length === 0 ? (
          !showRegisterForm && (
            <div className={cn(
              "rounded-3xl border p-12 text-center space-y-4 backdrop-blur-sm transition-all",
              isDarkTheme ? "border-white/5 bg-zinc-900/20" : "border-indigo-100/50 bg-indigo-50/30"
            )}>
              <div className={cn(
                "inline-flex items-center justify-center w-16 h-16 rounded-3xl border shadow-inner transition-colors",
                isDarkTheme ? "bg-zinc-900 border-white/5" : "bg-white border-indigo-100"
              )}>
                <Fingerprint className={cn("w-8 h-8", isDarkTheme ? "text-zinc-700" : "text-indigo-200")} />
              </div>
              <div className="space-y-1">
                <h4 className={cn("font-bold italic tracking-tight", isDarkTheme ? "text-zinc-400" : "text-slate-500")}>Нет активных ключей</h4>
                <p className={cn("text-[11px] font-medium", isDarkTheme ? "text-zinc-600" : "text-slate-400")}>
                  Добавьте устройство для сверхбыстрого входа
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <label className={cn("text-[9px] font-black uppercase tracking-[0.25em] px-1", isDarkTheme ? "text-zinc-600" : "text-slate-400")}>
              Твои ключи доступа
            </label>
            <div className="grid gap-2">
              {passkeys.map((passkey) => (
                <motion.div
                  layout
                  key={passkey.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "group flex items-center justify-between p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden",
                    isDarkTheme
                      ? "bg-slate-900/40 border-white/5 hover:border-indigo-500/30 hover:bg-slate-900/60"
                      : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    {getDeviceIcon(passkey.transports)}
                    <div>
                      <h4 className={cn(
                        "text-sm font-black italic tracking-tight uppercase",
                        isDarkTheme ? "text-white" : "text-slate-900"
                      )}>
                        {passkey.device_name || 'Generic Device'}
                      </h4>
                      <p className={cn("text-[10px] font-bold tracking-tight", isDarkTheme ? "text-zinc-500" : "text-slate-400")}>
                        {passkey.last_used_at ? (
                          <>Активен {formatDate(passkey.last_used_at)}</>
                        ) : (
                          <>Добавлен {formatDate(passkey.created_at)}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      triggerHaptic('light');
                      setDeleteTarget(passkey);
                    }}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "w-10 h-10 rounded-2xl transition-all relative z-10",
                      isDarkTheme
                        ? "bg-zinc-950/50 border border-white/5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                        : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 md:opacity-0 md:group-hover:opacity-100"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation — Inline (без Portal, чтобы не конфликтовать с Drawer) */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              "relative overflow-hidden rounded-3xl border p-5 backdrop-blur-xl shadow-2xl transition-all",
              isDarkTheme ? "border-red-500/20 bg-zinc-950/80" : "border-red-200 bg-white shadow-red-500/5"
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0" />

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors",
                  isDarkTheme ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-100"
                )}>
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div className="space-y-1">
                  <h4 className={cn("text-base font-black tracking-tight", isDarkTheme ? "text-white" : "text-slate-900")}>
                    Удалить ключ?
                  </h4>
                  <p className={cn("text-xs font-medium leading-relaxed", isDarkTheme ? "text-zinc-400" : "text-slate-500")}>
                    Устройство <span className={cn("font-bold", isDarkTheme ? "text-white" : "text-slate-900")}>"{deleteTarget.device_name || 'Без названия'}"</span> потеряет доступ к аккаунту. Это действие нельзя отменить.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <Button
                  onClick={() => setDeleteTarget(null)}
                  variant="ghost"
                  disabled={isDeleting}
                  className={cn(
                    "h-10 px-6 rounded-2xl font-bold transition-all",
                    isDarkTheme ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-10 px-8 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/20 min-w-[140px] transition-all active:scale-95"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Удаление...
                    </>
                  ) : (
                    'Да, удалить'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
