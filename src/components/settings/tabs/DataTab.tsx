/**
 * DataTab - Вкладка "Данные"
 */

import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { clearServiceWorkerAndCache, hasServiceWorkers } from '@/utils/clearServiceWorker';

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
    </h3>
);

export const DataTab: React.FC = () => {
    const [hasSW, setHasSW] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            hasServiceWorkers().then(setHasSW);
        }
    }, []);

    const handleClearCache = () => {
        triggerHaptic('medium');
        localStorage.clear();
        sessionStorage.clear();
        toast.success('Кэш очищен', { duration: 1500 });
    };

    const handleClearSW = async () => {
        if (!confirm('Очистить Service Worker и кэш? Страница перезагрузится.')) {
            return;
        }

        triggerHaptic('heavy');
        setClearing(true);

        try {
            await clearServiceWorkerAndCache();
            toast.success('Service Worker очищен');
        } catch (error) {
            console.error('[DataTab] Ошибка очистки SW:', error);
            toast.error('Ошибка очистки');
            setClearing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Кэш */}
            <div>
                <SectionTitle title="Кэш и хранилище" />
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                <Database className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Локальный кэш</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Ускоряет загрузку приложения</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearCache}
                        >
                            Очистить
                        </Button>
                    </div>
                </div>
            </div>

            {/* Service Worker */}
            {(import.meta.env.DEV || hasSW) && (
                <div>
                    <SectionTitle title="Разработка" />
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
                        <div className="space-y-3">
                            {hasSW && (
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-amber-500" />
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        Service Worker активен
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Используйте при проблемах с устаревшим кодом
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearSW}
                                disabled={clearing}
                                className="w-full"
                            >
                                {clearing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                        Очистка...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Очистить Service Worker и кэш
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTab;
