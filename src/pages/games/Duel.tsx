import { useState, useEffect, useRef, useCallback } from 'react';
import type { DuelResultSnapshot } from '@/features/duel/shared';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Swords, Trophy, LogIn, Sparkles, Zap, Target, TrendingUp, Loader2, Copy, Check, Hash, Minus, Plus, ArrowLeft, X, Coins, DollarSign, Gift } from 'lucide-react';
import { extractErrorFromResponse } from '@/utils/errorMessages';
import { DuelLobby } from '@/components/duel/DuelLobby';
import { DuelCreateModal } from '@/components/duel/DuelCreateModal';
import { DuelJoinModal } from '@/components/duel/DuelJoinModal';
import { DuelBattleFullscreen } from '@/components/duel/DuelBattleFullscreen';
import { DuelResult } from '@/components/duel/DuelResult';
import { DuelSkeleton } from '@/components/duel/DuelSkeleton';
import { LoadoutSelector } from '@/components/duel/LoadoutSelector';
import { AuthModalNew as AuthModal } from '@/components/AuthModalNew';
import { useUserContext } from '@/contexts/UserContext';
import { Card } from '@/components/ui/card';
import { isTelegramMiniApp, getTelegramWebApp } from '@/lib/telegram';
import { supabase } from '@/integrations/supabase/client';
import { dispatchUserEvent } from '@/lib/notification-events';
import { motion, AnimatePresence } from 'framer-motion';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { Users, Clock, Share2, Search } from 'lucide-react';
import { useModal } from '@/hooks/useModal';
import { Switch } from '@/components/ui/switch';
import { useLumiToast } from '@/hooks/useLumiToast';
import { toast } from 'sonner';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import type { GameMode } from '@/features/duel/shared';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

const INSURANCE_RATE = 0.15;
const COVERAGE_RATE = 0.6;
const getInsurancePremium = (bet: number) => bet > 0 ? Math.ceil(bet * INSURANCE_RATE) : 0;
const getRiskMultiplierPreview = (bet: number) => {
    if (!bet || bet <= 0) return 1;
    if (bet >= 600) return 4;
    if (bet >= 450) return 3;
    if (bet >= 300) return 2.25;
    if (bet >= 200) return 1.75;
    if (bet >= 100) return 1.25;
    return 1.1;
};
const getSeasonBonusPreview = (bet: number) => bet > 0 ? Math.round(20 * getRiskMultiplierPreview(bet)) : 30;

// 🆕 Helper для debug fetch (только в dev режиме)
// УДАЛЕНО: debug fetch вызовы убраны для стабильности - они вызывали ERR_CONNECTION_REFUSED
const debugFetch = (data: any) => {
    // Отключено для стабильности
};

export default function Duel() {
    const [searchParams] = useSearchParams();

    // 🔍 Debug logs for initialization
    useEffect(() => {
        const code = searchParams.get('code');
        const startParam = getTelegramWebApp()?.initDataUnsafe?.start_param;
        console.log('[Duel] 🧩 Component Mounted. URL Code:', code, 'StartParam:', startParam);
    }, []);

    const { isAuthenticated, profileId, user, supabaseUser } = useUserContext();
    const { showDuelJoinError, showDuelJoinSuccess, showDuelNotification, ToastContainer } = useLumiToast();
    const { activeDuel, saveActiveDuel, clearActiveDuel, updateActiveDuel, isChecking } = useActiveDuel();
    const { enabled: duelsEnabled, isLoading: flagsLoading } = useFeatureFlag('duels_enabled', true);
    const [mode, setMode] = useState<GameMode>('menu');
    const [duelId, setDuelId] = useState<string | null>(null);
    const [duelCode, setDuelCode] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [isBattleHidden, setIsBattleHidden] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [dataLoaded, setDataLoaded] = useState(false);
    const isTelegramUser = isTelegramMiniApp();

    // Inline join state
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isFindingMatch, setIsFindingMatch] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const hasAutoJoinedRef = useRef(false);
    // 🆕 CRITICAL FIX: Ref для хранения snapshot (передается напрямую из памяти, минуя localStorage)
    const duelResultSnapshotRef = useRef<DuelResultSnapshot | null>(null);
    const [duelPreview, setDuelPreview] = useState<{ bet_amount: number; num_questions: number } | null>(null);

    // Inline create state
    const [numQuestions, setNumQuestions] = useState(10);
    const [isCreating, setIsCreating] = useState(false);
    const [createdCode, setCreatedCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [waitTime, setWaitTime] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'checking'>('checking');

    // Betting state
    const [betType, setBetType] = useState<'none' | 'fixed' | 'custom'>('none');
    const [betAmount, setBetAmount] = useState(0);
    const [userCoins, setUserCoins] = useState(0);
    const [duelStats, setDuelStats] = useState({ totalDuels: 0, wins: 0 });
    const { openModal: openBoostShop } = useModal('BOOST_SHOP');
    const lowCoinsPromptedRef = useRef(false);
    const [hostInsuranceEnabled, setHostInsuranceEnabled] = useState(false);
    const [joinInsuranceEnabled, setJoinInsuranceEnabled] = useState(false);
    const hostInsurancePremium = hostInsuranceEnabled && betAmount > 0 ? getInsurancePremium(betAmount) : 0;
    const hostTotalStake = betAmount + hostInsurancePremium;
    const joinPreviewBet = duelPreview?.bet_amount || 0;
    const joinInsurancePremiumValue = joinInsuranceEnabled && joinPreviewBet > 0 ? getInsurancePremium(joinPreviewBet) : 0;
    const joinTotalRequired = joinPreviewBet > 0 ? joinPreviewBet + joinInsurancePremiumValue : joinPreviewBet;

    // Use realtime hook when duel is created
    const { state: duelState } = useDuelRealtime(createdCode && duelId ? duelId : null);


    const navigate = useNavigate();

    // 🆕 Telegram BackButton и swipe-back для экрана настройки дуэли (не для battle/results)
    useEffect(() => {
        // Только для menu режима (экран настройки)
        if (mode !== 'menu' || !isTelegramMiniApp()) return;

        const webApp = getTelegramWebApp();
        if (!webApp || !webApp.BackButton) return;

        webApp.BackButton.show();

        const handleBack = () => {
            console.log('[Duel] BackButton clicked - navigating to dashboard');
            navigate('/dashboard');
        };

        webApp.BackButton.onClick(handleBack);

        // 🆕 Swipe-back от левого края
        const EDGE_ZONE_PX = 20;
        const MIN_SWIPE_DISTANCE = 100;
        const startRef = { x: 0, y: 0, active: false };

        const onTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            if (t.clientX <= EDGE_ZONE_PX) {
                startRef.x = t.clientX;
                startRef.y = t.clientY;
                startRef.active = true;
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!startRef.active) return;
            startRef.active = false;

            const t = e.changedTouches[0];
            const dx = t.clientX - startRef.x;
            const dy = Math.abs(t.clientY - startRef.y);

            if (dx > MIN_SWIPE_DISTANCE && dy < 100) {
                console.log('[Duel] Swipe-back detected - navigating to dashboard');
                navigate('/dashboard');
            }
        };

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            webApp.BackButton.offClick(handleBack);
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }, [mode, navigate]);

    // Initial loading - показываем skeleton до полной загрузки
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsInitialLoading(false);
        }, 300); // Минимальная задержка для плавности

        return () => clearTimeout(timer);
    }, []);

    // Load user coins and duel stats
    useEffect(() => {
        const loadData = async () => {
            if (!profileId) {
                setDataLoaded(true);
                return;
            }

            // Load coins
            const { data: coinsData, error: coinsError } = await supabase
                .from('profiles')
                .select('coins')
                .eq('id', profileId)
                .single();

            if (!coinsError && coinsData) {
                setUserCoins(coinsData.coins || 0);
            }

            // Load duel stats
            const { data: statsData, error: statsError } = await supabase
                .from('duel_stats')
                .select('total_duels, wins')
                .eq('user_id', profileId)
                .maybeSingle();

            if (!statsError && statsData) {
                setDuelStats({
                    totalDuels: statsData.total_duels || 0,
                    wins: statsData.wins || 0,
                });
            } else if (statsError && statsError.code !== 'PGRST116') {
                // PGRST116 = no rows returned, which is fine for new users
                console.error('[Duel] Error loading duel stats:', statsError);
            }

            setDataLoaded(true);
        };

        loadData();
    }, [profileId]);

    useEffect(() => {
        if (betAmount <= 0) {
            setHostInsuranceEnabled(false);
        }
    }, [betAmount]);

    // Define handleDuelStarted early so it can be used in useEffect dependencies
    const handleDuelStarted = useCallback((targetDuelId?: string) => {
        debugFetch({ location: 'Duel.tsx:156', message: 'handleDuelStarted called', data: { targetDuelId, currentDuelId: duelId, currentMode: mode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
        const activeDuelId = targetDuelId || duelId;
        console.log('[Duel] ⚡ DUEL STARTED! Switching to battle mode. DuelId:', activeDuelId);

        if (!activeDuelId) {
            console.error('[Duel] ❌ Cannot start battle: no duelId');
            // #region agent log
            debugFetch({ location: 'Duel.tsx:160', message: 'Cannot start - no duelId', data: { targetDuelId, currentDuelId: duelId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion
            return;
        }

        // Убеждаемся, что duelId установлен
        if (targetDuelId && targetDuelId !== duelId) {
            setDuelId(targetDuelId);
            // #region agent log
            debugFetch({ location: 'Duel.tsx:166', message: 'Updating duelId', data: { targetDuelId, oldDuelId: duelId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion
        }

        // Reset hidden state when starting new battle
        setIsBattleHidden(false);

        // Immediate state change
        // #region agent log
        debugFetch({ location: 'Duel.tsx:174', message: 'Setting mode to battle', data: { activeDuelId, previousMode: mode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
        // #endregion
        setMode('battle');

        // Multiple retries for Telegram reliability
        const retries = [50, 150, 300];
        retries.forEach((delay, index) => {
            setTimeout(() => {
                console.log(`[Duel] Battle mode retry #${index + 1}`);
                // #region agent log
                debugFetch({ location: 'Duel.tsx:181', message: 'Battle mode retry', data: { retryIndex: index + 1, delay, activeDuelId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
                // #endregion
                setMode('battle');
            }, delay);
        });
    }, [duelId]);

    // Восстановление состояния активной дуэли при загрузке страницы
    useEffect(() => {
        // Ждем завершения проверки activeDuel и загрузки данных
        if (isChecking || !dataLoaded) return;

        // Проверяем URL параметр duelId (приоритет выше)
        const urlDuelId = searchParams.get('duelId');

        if (urlDuelId) {
            console.log('[Duel] 🔄 Restoring duel from URL:', urlDuelId);
            setDuelId(urlDuelId);

            // Проверяем статус дуэли и переходим к нужному экрану
            const checkAndRestore = async () => {
                try {
                    const { data, error } = await supabase
                        .from('duels')
                        .select('status, code')
                        .eq('id', urlDuelId)
                        .maybeSingle();

                    if (error || !data) {
                        console.error('[Duel] Error checking duel status:', error);
                        return;
                    }

                    setDuelCode(data.code);

                    if (data.status === 'active') {
                        // Если дуэль активна - переходим к битве
                        console.log('[Duel] ✅ Duel is active, going to battle');
                        handleDuelStarted(urlDuelId);
                    } else if (data.status === 'waiting') {
                        // Если дуэль в ожидании - переходим к лобби
                        console.log('[Duel] ⏳ Duel is waiting, going to lobby');
                        setMode('create');
                    }
                } catch (err) {
                    console.error('[Duel] Exception checking duel:', err);
                }
            };

            checkAndRestore();
            return;
        }

        // Если нет URL параметра, проверяем activeDuel
        if (activeDuel && activeDuel.duelId) {
            console.log('[Duel] 🔄 Restoring active duel from localStorage:', {
                duelId: activeDuel.duelId,
                mode: activeDuel.mode,
                currentIndex: activeDuel.currentIndex
            });

            setDuelId(activeDuel.duelId);
            setDuelCode(activeDuel.duelCode);

            // Проверяем актуальный статус дуэли в БД для определения правильного экрана
            const checkDuelStatusAndRestore = async () => {
                try {
                    const { data, error } = await supabase
                        .from('duels')
                        .select('status')
                        .eq('id', activeDuel.duelId)
                        .maybeSingle();

                    if (error || !data) {
                        console.error('[Duel] Error checking duel status for restore:', error);
                        // КРИТИЧНО: При ошибке проверки - очищаем зависшее состояние
                        console.log('[Duel] ⚠️ Error checking duel, clearing stale state');
                        clearActiveDuel();
                        return;
                    }

                    // Определяем правильный экран на основе актуального статуса
                    if (data.status === 'finished') {
                        // Дуэль завершена - НЕ очищаем activeDuel (Delayed Cleanup strategy)
                        // Данные нужны для экрана результатов, очистка произойдет при выходе
                        console.log('[Duel] ✅ Duel is finished, going to results (keeping activeDuel for data)');
                        // Устанавливаем duelId если его нет
                        if (!duelId && activeDuel.duelId) {
                            setDuelId(activeDuel.duelId);
                        }
                        // Переходим к результатам без очистки activeDuel
                        setMode('result');
                    } else if (data.status === 'active') {
                        // Дуэль активна - проверяем режим сохраненного состояния
                        if (activeDuel.mode === 'waiting') {
                            // Если пользователь уже закончил все вопросы - переходим к экрану ожидания
                            console.log('[Duel] ⏳ User finished all questions, restoring to waiting screen');
                            handleDuelStarted(activeDuel.duelId);
                            // DuelBattleFullscreen сам определит что нужно показать экран ожидания
                        } else {
                            // Переходим к битве
                            console.log('[Duel] ✅ Duel is active, restoring to battle mode');
                            handleDuelStarted(activeDuel.duelId);
                        }
                    } else if (data.status === 'waiting' || activeDuel.mode === 'waiting') {
                        // Дуэль в ожидании - переходим к лобби
                        console.log('[Duel] ⏳ Duel is waiting, restoring to lobby');
                        setMode('create');
                    }
                } catch (err) {
                    console.error('[Duel] Exception checking duel status for restore:', err);
                    // КРИТИЧНО: При исключении - очищаем зависшее состояние
                    console.log('[Duel] ⚠️ Exception checking duel, clearing stale state');
                    clearActiveDuel();
                }
            };

            checkDuelStatusAndRestore();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChecking, activeDuel, searchParams, dataLoaded, handleDuelStarted]);

    useEffect(() => {
        // Показываем уведомления только после полной загрузки данных
        if (!dataLoaded) return;

        const suggestLowCoins = async () => {
            const { data } = await supabase.functions.invoke('assistant-suggest', {
                body: { trigger: 'low_coins_in_duel' },
            });
            const message = data?.suggestion?.message;
            if (message) {
                toast.info(message, {
                    action: {
                        label: 'Купить монеты',
                        onClick: () => openBoostShop(),
                    },
                });
            }
        };

        if (userCoins > 0 && userCoins < 50 && !lowCoinsPromptedRef.current && profileId) {
            lowCoinsPromptedRef.current = true;
            suggestLowCoins();
            dispatchUserEvent(profileId, 'low_balance', {
                coins_left: userCoins,
                page: 'duel_menu',
            });
        }
    }, [userCoins, dataLoaded, profileId]);

    // Эффект для обработки параметра code из Telegram (Deep Link)
    useEffect(() => {
        // Ждем загрузки профиля и основных данных
        if (!dataLoaded || !profileId || isChecking) return;

        // 1. Пытаемся достать из URL (Native Browser way)
        const urlParams = new URLSearchParams(window.location.search);
        const urlCode = urlParams.get('code') || searchParams.get('code');

        // 2. Пытаемся достать из Telegram start_param (startapp)
        // Формат может быть: "CODE" (напрямую) или "duel_CODE" (старый формат)
        const tgStartParam = getTelegramWebApp()?.initDataUnsafe?.start_param;

        let code = urlCode;
        if (!code && tgStartParam) {
            // Если начинается с duel_ - старый формат
            if (tgStartParam.startsWith('duel_')) {
                code = tgStartParam.replace('duel_', '');
            } else {
                // Новый формат - код напрямую (4 символа)
                code = tgStartParam;
            }
        }

        console.log('[Duel] 🕵️ Checking for code. URL:', urlCode, 'TG:', tgStartParam, 'Final:', code);

        // 3. Если нашли код - запускаем вступление
        if (code && (code.length === 4 || code.length === 6)) {
            if (hasAutoJoinedRef.current || duelId) {
                console.log('[Duel] ⏭️ Skipping: already joined/joining or in lobby');
                return;
            }

            console.log('[Duel] 🚀 AUTO-JOIN INITIATED for code:', code);
            // Сразу ставим флаг, чтобы не зациклиться
            hasAutoJoinedRef.current = true;

            // Даем задержку для стабильности
            setTimeout(() => {
                handleInlineJoin(code);
            }, 800);
        }
    }, [searchParams, dataLoaded, profileId, isChecking]); // Убрал mode из зависимостей чтобы избежать цикла

    // Check if we're waiting for profile to load
    const isLoadingProfile = (user || supabaseUser) && !profileId;

    const handleDuelCreated = (id: string, code: string) => {
        setDuelId(id);
        setDuelCode(code);
        setMode('create');
    };

    const handleDuelJoined = async (id: string, code: string, autoStarted?: boolean) => {
        // #region agent log
        debugFetch({ location: 'Duel.tsx:339', message: 'handleDuelJoined called', data: { id, code, autoStarted, currentMode: mode, currentDuelId: duelId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
        // #endregion
        if (!id || !code) {
            console.error('[Duel] ❌ Invalid parameters for handleDuelJoined:', { id, code });
            return;
        }

        console.log('[Duel] Player joined duel:', id, 'autoStarted:', autoStarted);

        try {
            setDuelId(id);
            setDuelCode(code);
            // #region agent log
            debugFetch({ location: 'Duel.tsx:348', message: 'Duel ID and code set', data: { id, code }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion

            // Если дуэль автозапустилась, сразу переходим к битве
            if (autoStarted) {
                console.log('[Duel] ✅ AUTO-STARTED = TRUE, going straight to battle!');
                // #region agent log
                debugFetch({ location: 'Duel.tsx:352', message: 'Auto-started - calling handleDuelStarted', data: { id, currentMode: mode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
                // #endregion
                handleDuelStarted(id); // Передаем id для гарантии
                return;
            }

            // Check if duel is already active (fallback check)
            // #region agent log
            debugFetch({ location: 'Duel.tsx:359', message: 'Checking duel status from DB', data: { id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion
            const { data, error } = await supabase
                .from('duels')
                .select('status')
                .eq('id', id)
                .maybeSingle();

            // #region agent log
            debugFetch({ location: 'Duel.tsx:365', message: 'Duel status check result', data: { hasError: !!error, status: data?.status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion
            if (error) {
                console.error('[Duel] Error checking duel status:', error);
                // Продолжаем с переходом в лобби даже при ошибке проверки
            }

            if (data?.status === 'active') {
                console.log('[Duel] Duel already active, going straight to battle!');
                // #region agent log
                debugFetch({ location: 'Duel.tsx:370', message: 'Duel active - calling handleDuelStarted', data: { id, currentMode: mode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
                // #endregion
                handleDuelStarted(id); // Передаем id для гарантии
            } else if (data?.status === 'finished') {
                // 🆕 CRITICAL FIX: Если дуэль уже завершена при присоединении - это ошибка
                console.error('[Duel] ❌ Cannot join: duel is already finished');
                toast.error('Дуэль уже завершена. Создайте новую или присоединитесь к другой.');
                setMode('menu');
                setDuelId(null);
                setDuelCode(null);
            } else {
                console.log('[Duel] Going to lobby to wait for start');
                // #region agent log
                debugFetch({ location: 'Duel.tsx:374', message: 'Setting mode to create (lobby)', data: { currentMode: mode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
                // #endregion
                setMode('create');
            }
        } catch (error) {
            console.error('[Duel] ❌ Error in handleDuelJoined:', error);
            // #region agent log
            debugFetch({ location: 'Duel.tsx:377', message: 'Error in handleDuelJoined', data: { errorMessage: error instanceof Error ? error.message : String(error) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion
            // При ошибке возвращаемся в меню
            setMode('menu');
            setDuelId(null);
            setDuelCode(null);
            toast.error('Ошибка при присоединении к дуэли');
        }
    };


    // Handle widget expand - restore battle mode when widget is expanded
    // When widget is expanded, we need to restore battle mode
    // The widget is displayed via portal, so we need a way to restore battle
    // We'll use a ref or event listener to detect widget expansion
    // Actually, simpler: add a callback that restores battle mode
    const handleWidgetExpand = () => {
        if (duelId && isBattleHidden) {
            setIsBattleHidden(false);
            setMode('battle');
        }
    };

    // 🆕 CRITICAL FIX: Принимаем snapshot напрямую из памяти (минуя localStorage)
    const handleDuelFinished = (snapshot?: DuelResultSnapshot) => {
        console.log('[Duel] 🎯🎯🎯 handleDuelFinished called - transitioning to results', {
            currentMode: mode,
            duelId,
            willSetMode: 'result',
            hasSnapshot: !!snapshot
        });

        // 🆕 CRITICAL FIX: Сохраняем snapshot в ref для передачи в DuelResult (минуя localStorage)
        if (snapshot) {
            duelResultSnapshotRef.current = snapshot;
            console.log('[Duel] ✅ Snapshot saved to ref (direct memory transfer)');
        }

        // КРИТИЧНО: Проверяем, что duelId установлен перед переходом к результатам
        if (!duelId) {
            console.error('[Duel] ❌ ERROR: handleDuelFinished called but duelId is null! Cannot show results.');
            toast.error('Ошибка: ID дуэли не найден');
            return;
        }

        // 🆕 CRITICAL FIX: "Delayed Cleanup" Strategy
        // НЕ очищаем activeDuel при переходе к результатам - данные должны остаться
        // Очистка произойдет только когда пользователь уйдет с экрана результатов
        // Это гарантирует 100% наличие данных для useDuelResults и устраняет race condition
        console.log('[Duel] ✅ Keeping activeDuel data for results screen (will be cleared on exit)');

        console.log('[Duel] ✅ duelId is valid, proceeding with mode change...');

        // Устанавливаем режим результата - используем функциональное обновление для гарантии
        setMode((currentMode) => {
            console.log('[Duel] 🔄 setMode callback executing. Current mode:', currentMode);
            if (currentMode !== 'result') {
                console.log('[Duel] ✅✅✅ Setting mode to result (was:', currentMode, ')');
                return 'result';
            }
            console.log('[Duel] ⚠️ Mode already set to result, no change needed');
            return currentMode;
        });

        console.log('[Duel] ✅ Mode transition initiated, duelId:', duelId);

        // Force re-render check after small delay
        setTimeout(() => {
            console.log('[Duel] 🔍 Post-transition check - current mode should be "result"');
        }, 100);
    };

    const handleBackToMenu = useCallback(() => {
        // Очищаем активную дуэль при выходе в меню
        clearActiveDuel();

        setMode('menu');
        setDuelId(null);
        setDuelCode(null);
        setIsBattleHidden(false);
        setJoinCode('');
        setCreatedCode(null);
        setCopied(false);
        hasAutoJoinedRef.current = false;
    }, [clearActiveDuel]);

    // Check if user needs to login
    const handleActionClick = (action: () => void) => {
        // For non-Telegram users, require authentication first
        if (!isAuthenticated && !isTelegramUser) {
            setShowAuthModal(true);
            return;
        }

        // If we have a user but profileId is still loading, just execute the action
        // The profileId will be checked inside DuelLobby/DuelJoin when they try to invoke the function
        action();
    };

    // Handle inline join
    const handleInlineJoin = async (code: string) => {
        console.log('[Duel] 🚀 Starting auto-join with code:', code);

        if (!code || (code.length !== 4 && code.length !== 6)) {
            console.warn('[Duel] ⚠️ Invalid code length:', code?.length);
            return;
        }

        if (!profileId) {
            console.warn('[Duel] ⚠️ Missing profileId, delaying join...');
            return;
        }

        if (hasAutoJoinedRef.current && isJoining) {
            console.log('[Duel] ⏳ Join already in progress, skipping duplicate');
            return;
        }

        hasAutoJoinedRef.current = true;
        setIsJoining(true);
        setMode('menu'); // Остаемся в меню, но показываем лоадер через isJoining state

        try {
            console.log('[Duel] ⚡ Invoking join_duel with code:', code, 'Profile:', profileId);

            // Добавляем логирование параметров вызова
            const invokeParams = {
                action: 'join_duel',
                profile_id: profileId,
                code: code.toUpperCase(),
                insurance_enabled: joinInsuranceEnabled,
                insurance_rate: joinInsuranceEnabled ? INSURANCE_RATE : 0,
                insurance_coverage_rate: joinInsuranceEnabled ? COVERAGE_RATE : 0,
            };
            console.log('[Duel] Invoke parameters:', invokeParams);

            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: invokeParams,
            });

            // #region agent log
            debugFetch({ location: 'Duel.tsx:496', message: 'join_duel response received', data: { hasError: !!error, autoStarted: data?.auto_started, duelStatus: data?.duel?.status, duelId: data?.duel?.id, playerId: data?.player?.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion
            console.log('[Duel] join_duel response:', { data, error });

            if (error) {
                console.error('[Duel] ❌ join_duel error:', error);
                throw error;
            }

            // Проверяем, что данные корректны
            if (!data || !data.duel || !data.duel.id || !data.duel.code) {
                console.error('[Duel] ❌ Invalid response data:', data);
                throw new Error('Неверный ответ от сервера. Попробуйте еще раз.');
            }

            console.log('[Duel] join_duel data:', {
                auto_started: data.auto_started,
                duel_status: data.duel?.status,
                duel_id: data.duel?.id,
                player_id: data.player?.id
            });

            showDuelJoinSuccess(data.auto_started);

            // #region agent log
            debugFetch({ location: 'Duel.tsx:519', message: 'Calling handleDuelJoined', data: { duelId: data.duel.id, duelCode: data.duel.code, autoStarted: data.auto_started, currentMode: mode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' });
            // #endregion
            // Передаем auto_started в handleDuelJoined для правильной обработки
            handleDuelJoined(data.duel.id, data.duel.code, data.auto_started);
            setJoinCode('');
            hasAutoJoinedRef.current = false;
            setIsJoining(false);
            // #region agent log
            debugFetch({ location: 'Duel.tsx:522', message: 'Join completed successfully', data: { duelId: data.duel.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' });
            // #endregion
        } catch (error: any) {
            console.error('[Duel] ❌ Error in handleInlineJoin:', error);
            // #region agent log
            debugFetch({ location: 'Duel.tsx:524', message: 'Join error occurred', data: { errorMessage: error?.message, errorCode: error?.code }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' });
            // #endregion

            // Показываем ошибку пользователю
            showDuelJoinError(error);

            // Сбрасываем состояние для возможности повторной попытки
            hasAutoJoinedRef.current = false;
            setIsJoining(false);
            const detailedError = error.status
                ? `${error.status}: ${error.message || JSON.stringify(error)}`
                : error.message || JSON.stringify(error);
            setJoinError(detailedError);
            setJoinCode(''); // Clear code on error to allow retry

            // Убеждаемся, что режим остается в 'menu' или 'join' при ошибке
            if (mode === 'battle') {
                setMode('menu');
                setDuelId(null);
                setDuelCode(null);
            }
        }
    };

    // Load duel preview when code is entered
    useEffect(() => {
        const loadDuelPreview = async () => {
            if (joinCode.length === 4 && profileId) {
                try {
                    const { data, error } = await supabase
                        .from('duels')
                        .select('bet_amount, num_questions, bet_type')
                        .eq('code', joinCode.toUpperCase())
                        .single();

                    if (!error && data) {
                        setDuelPreview({
                            bet_amount: (data as any).bet_amount || 0,
                            num_questions: (data as any).num_questions || 10
                        });
                    }
                } catch (e) {
                    setDuelPreview(null);
                }
            } else {
                setDuelPreview(null);
            }
        };

        loadDuelPreview();
    }, [joinCode, profileId]);

    // Auto-join when code is 4 characters (but only if has enough coins for bet)
    useEffect(() => {
        if (joinCode.length === 4 && !isJoining && profileId && !hasAutoJoinedRef.current && (isAuthenticated || isTelegramUser)) {
            // Check if user has enough coins for bet
            if (duelPreview && duelPreview.bet_amount > 0) {
                const previewPremium = joinInsuranceEnabled ? getInsurancePremium(duelPreview.bet_amount) : 0;
                const requiredCoins = duelPreview.bet_amount + previewPremium;
                if (userCoins < requiredCoins) {
                    toast.error(`Недостаточно монет! Нужно ${requiredCoins}, у вас ${userCoins}`);
                    return;
                }
            }

            const timer = setTimeout(() => {
                if (joinCode.length === 4 && !hasAutoJoinedRef.current) {
                    handleInlineJoin(joinCode);
                }
            }, 500);

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joinCode, isJoining, profileId, isAuthenticated, isTelegramUser, duelPreview, userCoins]);

    // Handle inline create
    const handleInlineCreate = async () => {
        if (!dataLoaded) return; // Не показываем модалку до загрузки

        if (!profileId) {
            return; // Не показываем ошибку до загрузки данных
        }

        if (isCreating) return;

        setIsCreating(true);

        try {
            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: {
                    action: 'create_duel',
                    profile_id: profileId,
                    num_questions: numQuestions,
                    difficulty: 'mix',
                    bet_amount: betAmount,
                    bet_type: betType,
                    insurance_enabled: hostInsuranceEnabled,
                    insurance_rate: hostInsuranceEnabled ? INSURANCE_RATE : 0,
                    insurance_coverage_rate: hostInsuranceEnabled ? COVERAGE_RATE : 0,
                },
            });

            if (error) throw error;

            // Reload coins after bet
            if (betAmount > 0) {
                setUserCoins(userCoins - betAmount);
            }

            setCreatedCode(data.duel.code);

            // Auto-copy code to clipboard
            try {
                await navigator.clipboard.writeText(data.duel.code);
                setCopied(true);
                toast.success('Дуэль создана! Код скопирован в буфер обмена 🎮');
                setTimeout(() => setCopied(false), 3000);
            } catch (error) {
                toast.success('Дуэль создана! 🎮');
            }

            // Store duel ID and code for lobby navigation
            setDuelId(data.duel.id);
            setDuelCode(data.duel.code);
            setConnectionStatus('checking');
            setWaitTime(0);

            dispatchUserEvent(profileId, 'duel_invite_created', {
                duel_id: data.duel.id,
                duel_code: data.duel.code,
                bet_amount: betAmount,
                num_questions: numQuestions,
                opponent_name: 'соперник',
            });

            setIsCreating(false);
        } catch (error: any) {
            showDuelJoinError(error);
            setIsCreating(false);
        }
    };

    const handleFindMatch = async () => {
        if (!dataLoaded || !profileId) {
            console.warn('[Duel] Cannot find match: dataLoaded=', dataLoaded, 'profileId=', profileId);
            return;
        }
        if (isFindingMatch) return;

        setIsFindingMatch(true);

        try {
            // Валидация и подготовка данных
            const numQuestionsValue = Number(numQuestions);
            const betAmountValue = Number(betAmount);

            // Проверка на валидные числа
            if (isNaN(numQuestionsValue) || numQuestionsValue < 5 || numQuestionsValue > 30) {
                throw new Error(`Неверное количество вопросов: ${numQuestionsValue}. Должно быть от 5 до 30.`);
            }

            if (isNaN(betAmountValue) || betAmountValue < 0 || betAmountValue > 10000) {
                throw new Error(`Неверная ставка: ${betAmountValue}. Должна быть от 0 до 10000.`);
            }

            if (!profileId || typeof profileId !== 'string') {
                throw new Error('Profile ID не найден. Пожалуйста, войдите в систему.');
            }

            // Подготовка данных для отправки
            const requestBody: any = {
                action: 'find_match',
                profile_id: profileId,
                num_questions: numQuestionsValue,
                difficulty: 'mix' as const,
                bet_amount: betAmountValue,
                bet_type: betType || 'none',
            };

            // Добавляем insurance поля только если они нужны
            if (hostInsuranceEnabled && betAmountValue > 0) {
                requestBody.insurance_enabled = true;
                requestBody.insurance_rate = INSURANCE_RATE;
                requestBody.insurance_coverage_rate = COVERAGE_RATE;
            }

            console.log('[Duel] ✅ Validated request body:', {
                ...requestBody,
                profile_id: profileId ? `${profileId.substring(0, 8)}...` : 'MISSING'
            });

            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: requestBody,
            });

            if (error) {
                console.error('[Duel] ❌ Supabase function error:', {
                    message: error.message,
                    name: error.name,
                    context: error.context,
                    stack: error.stack
                });

                // Пытаемся извлечь детали из error.context (это Response объект)
                if (error.context && typeof error.context.json === 'function') {
                    try {
                        // Клонируем response, чтобы можно было прочитать его несколько раз
                        const clonedResponse = error.context.clone();
                        const errorBody = await clonedResponse.json();
                        console.error('[Duel] ❌ Error body details:', errorBody);
                        // Добавляем детали в error для последующей обработки
                        (error as any).errorDetails = errorBody;
                    } catch (e) {
                        console.warn('[Duel] Could not parse error body:', e);
                        // Пробуем прочитать как текст
                        try {
                            const clonedResponse = error.context.clone();
                            const errorText = await clonedResponse.text();
                            console.error('[Duel] ❌ Error body (text):', errorText);
                            (error as any).errorDetails = { message: errorText };
                        } catch (e2) {
                            console.warn('[Duel] Could not read error body as text:', e2);
                        }
                    }
                }

                throw error;
            }

            // Reload coins after bet
            if (betAmount > 0) {
                setUserCoins(userCoins - betAmount);
            }

            setDuelId(data.duel.id);
            setDuelCode(data.duel.code);

            // Если автозапуск произошел - сразу переходим к битве
            if (data.auto_started) {
                handleDuelStarted(data.duel.id);
                toast.success(data.opponent_type === 'bot' ? `Соперник ${data.bot_name || 'найден'}!` : 'Соперник найден!');
            } else {
                // Fallback: переходим в лобби (не должно происходить, так как автозапуск всегда true)
                setCreatedCode(data.duel.code);
                setConnectionStatus('checking');
                setWaitTime(0);
                toast.success('Соперник найден!');
            }
        } catch (error: any) {
            console.error('[Duel] ❌ Error finding match:', error);

            // Пытаемся извлечь детали ошибки из ответа Edge Function
            let errorMessage = 'Ошибка при поиске соперника';
            let errorDetails: any = null;

            // Пробуем разные способы извлечения деталей ошибки
            // errorDetails уже должен быть установлен в блоке выше (если error.context был Response)
            if (error?.errorDetails) {
                errorDetails = error.errorDetails;
            } else if (error?.context && typeof error.context.json === 'function') {
                // Если errorDetails еще не установлен, пытаемся прочитать из Response
                try {
                    const clonedResponse = error.context.clone();
                    errorDetails = await clonedResponse.json().catch(() => null);
                } catch (e) {
                    console.warn('[Duel] Could not parse error body in catch:', e);
                }
            } else if (error?.context?.message) {
                errorMessage = error.context.message;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            // Если есть детали валидации
            if (errorDetails?.details && Array.isArray(errorDetails.details)) {
                const validationErrors = errorDetails.details
                    .map((d: any) => {
                        const field = d.path?.join('.') || 'unknown';
                        const value = d.received !== undefined ? ` (получено: ${JSON.stringify(d.received)})` : '';
                        return `${field}: ${d.message}${value}`;
                    })
                    .join('\n');
                errorMessage = `Ошибка валидации:\n${validationErrors}`;
                console.error('[Duel] ❌ Validation errors:', errorDetails.details);
                console.error('[Duel] ❌ Received params:', errorDetails.received);
            } else if (errorDetails?.message) {
                errorMessage = errorDetails.message;
            } else if (errorDetails?.error) {
                errorMessage = errorDetails.error;
            }

            // Показываем ошибку в toast (для длинных сообщений используем description)
            if (errorMessage.includes('\n')) {
                const [title, ...lines] = errorMessage.split('\n');
                toast.error(title, {
                    description: lines.join('\n'),
                    duration: 5000,
                });
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsFindingMatch(false);
        }
    };

    const handleCopyCode = async () => {
        if (!createdCode) return;

        try {
            await navigator.clipboard.writeText(createdCode);
            setCopied(true);
            toast.success('Код скопирован!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Не удалось скопировать код');
        }
    };

    const handleShare = () => {
        if (createdCode && window.Telegram?.WebApp) {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(`Присоединяйся к дуэли! Код: ${createdCode}`)}`;
            (window.Telegram.WebApp as any).openTelegramLink?.(shareUrl);
        }
    };

    const handleCancelDuel = async () => {
        if (!duelId || !profileId) return;

        try {
            const { data, error } = await supabase.functions.invoke('duel-manager', {
                body: {
                    action: 'cancel_duel',
                    duel_id: duelId,
                    profile_id: profileId
                }
            });

            if (error) throw error;

            if (data.success) {
                const refundAmount = data.refunded || 0;

                if (refundAmount > 0) {
                    toast.success(`Дуэль отменена! Возвращено ${refundAmount} монет`, {
                        duration: 3000
                    });
                    // Update local coin balance
                    setUserCoins(prev => prev + refundAmount);
                } else {
                    toast.success('Дуэль отменена!', {
                        duration: 2000
                    });
                }

                // Reset state
                setCreatedCode(null);
                setDuelId(null);
                setDuelCode(null);
                setWaitTime(0);
                setConnectionStatus('checking');
            }
        } catch (error: any) {
            console.error('Error canceling duel:', error);
            const errorMsg = error?.message || 'Не удалось отменить дуэль';
            toast.error(errorMsg);
        }
    };

    // Countdown logic
    // УБРАНО: startCountdown - дуэль начинается сразу без задержки

    // Check duel status when created
    useEffect(() => {
        if (!duelId || !createdCode || !profileId) return;

        let isActive = true;
        let checkCount = 0;
        const MAX_CHECKS = 120; // 120 seconds max

        console.log('[Duel] Initializing status check for:', duelId);

        const checkStatus = async () => {
            if (!isActive) return;

            checkCount++;

            try {
                const { data, error } = await supabase.functions.invoke('duel-manager', {
                    body: {
                        action: 'check_status',
                        duel_id: duelId,
                        profile_id: profileId
                    }
                });

                if (error) {
                    console.error('[Duel] Error checking duel status:', error);
                    // 🆕 CRITICAL FIX: При ошибке Edge Function пробуем прямой запрос к БД
                    try {
                        const { data: duelData } = await supabase
                            .from('duels')
                            .select('status')
                            .eq('id', duelId)
                            .maybeSingle();

                        if (duelData?.status === 'active') {
                            console.log('[Duel] ✅ DUEL IS ACTIVE (from DB fallback)! Starting battle...');
                            setConnectionStatus('connected');
                            handleDuelStarted(duelId || undefined);
                            isActive = false;
                        } else if (duelData?.status === 'finished') {
                            console.warn('[Duel] ⚠️ Duel is finished (from DB fallback), clearing state...');
                            isActive = false;
                            setConnectionStatus('connected');
                            setDuelId(null);
                            setDuelCode(null);
                            setMode('menu');
                            toast.error('Дуэль уже завершена. Создайте новую или присоединитесь к другой.');
                        }
                    } catch (dbError) {
                        console.error('[Duel] Error in DB fallback:', dbError);
                    }
                    return;
                }

                if (!data || data.error) {
                    console.warn('[Duel] Duel not found or no access:', data?.error);
                    return;
                }

                console.log('[Duel] Duel status:', data.status);

                if (data.status === 'active') {
                    console.log('[Duel] ✅ DUEL IS ACTIVE! Starting battle immediately...');
                    setConnectionStatus('connected');
                    handleDuelStarted(duelId || undefined);
                    isActive = false;
                } else if (data.status === 'finished') {
                    // 🆕 CRITICAL FIX: Если дуэль уже завершена, но игрок еще не играл - это ошибка
                    // Останавливаем проверку и очищаем состояние
                    console.warn('[Duel] ⚠️ Duel is already finished, but player hasn\'t played yet. Clearing state...');
                    isActive = false;
                    setConnectionStatus('connected');
                    // Очищаем состояние дуэли
                    setDuelId(null);
                    setDuelCode(null);
                    setMode('menu');
                    toast.error('Дуэль уже завершена. Создайте новую или присоединитесь к другой.');
                } else if (data.status === 'waiting') {
                    // 🆕 CRITICAL FIX: Если дуэль в ожидании, проверяем количество игроков
                    // Если уже 2 игрока, но статус еще waiting - возможно дуэль скоро станет active
                    setConnectionStatus('connected');
                    // Продолжаем проверку статуса
                } else {
                    setConnectionStatus('connected');
                }
            } catch (err) {
                console.error('[Duel] Exception checking status:', err);
            }
        };

        // Immediate check
        checkStatus();

        // ОПТИМИЗАЦИЯ: Используем requestIdleCallback для некритических проверок
        // Увеличиваем интервал до 1000ms для уменьшения нагрузки на основной поток
        const scheduleNextCheck = () => {
            if (checkCount >= MAX_CHECKS || !isActive) {
                return;
            }

            // Используем requestIdleCallback если доступен, иначе setTimeout
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    if (isActive && checkCount < MAX_CHECKS) {
                        checkStatus();
                        setTimeout(scheduleNextCheck, 1000);
                    }
                }, { timeout: 1000 });
            } else {
                setTimeout(() => {
                    if (isActive && checkCount < MAX_CHECKS) {
                        checkStatus();
                        scheduleNextCheck();
                    }
                }, 1000);
            }
        };

        const interval = setTimeout(scheduleNextCheck, 1000);

        return () => {
            isActive = false;
            clearTimeout(interval);
        };
    }, [duelId, createdCode, profileId]);

    // Handle timer
    useEffect(() => {
        if (!createdCode) return;

        const timer = setInterval(() => {
            setWaitTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [createdCode]);

    // УБРАНО: Countdown логика - дуэль начинается сразу когда стартовала

    // Handle opponent joined
    useEffect(() => {
        if (duelState.opponentJoined && createdCode && dataLoaded) {
            console.log('[Duel] Opponent joined!');
            showDuelNotification('opponent_joined');
        }
    }, [duelState.opponentJoined, createdCode, dataLoaded, showDuelNotification]);

    // Handle duel started from realtime - сразу переходим к битве
    useEffect(() => {
        if (duelState.duelStarted && createdCode && duelId) {
            console.log('[Duel] ✅ Duel started signal from realtime! Starting battle immediately...');
            handleDuelStarted(duelId);
        }
    }, [duelState.duelStarted, createdCode, duelId, handleDuelStarted]);

    // Показываем skeleton screen при начальной загрузке - ПОСЛЕ всех хуков!
    // 🚦 FEATURE FLAG: Проверка включения дуэлей
    if (flagsLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    // Убрали отдельный экран ошибки - теперь блокируем кнопку в Games.tsx

    if (isInitialLoading || (!dataLoaded && !isTelegramUser)) {
        return <DuelSkeleton />;
    }

    // Fullscreen modes - no Layout/Footer
    // But if hidden, show menu with widget overlay
    if (mode === 'battle' && duelId && !isBattleHidden) {
        return (
            <DuelBattleFullscreen
                duelId={duelId}
                onExit={handleBackToMenu}
                onDuelFinished={handleDuelFinished}
                onHide={() => {
                    // When game is hidden, switch to menu mode
                    // State is already saved via updateActiveDuel/saveActiveDuel in DuelBattleFullscreen
                    // Force a small delay to ensure state is saved before switching modes
                    setTimeout(() => {
                        setIsBattleHidden(true);
                        setMode('menu');
                    }, 100);
                }}
                onWidgetExpand={handleWidgetExpand}
            />
        );
    }

    // Lobby also fullscreen without footer
    return (
        <>
            <ToastContainer />
            {mode === 'create' && duelCode ? (
                <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
                    <DuelLobby
                        duelId={duelId}
                        duelCode={duelCode}
                        onDuelCreated={handleDuelCreated}
                        onDuelStarted={handleDuelStarted}
                        onCancel={handleBackToMenu}
                    />
                </div>
            ) : (
                <Layout>
                    {/* Старый виджет убран - используем ActiveDuelWidget из Layout */}

                    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-[1370px]">
                        {isLoadingProfile && (
                            <Card className="max-w-2xl mx-auto p-6 sm:p-8 md:p-12 text-center space-y-4 sm:space-y-6">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                                    <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl sm:text-2xl font-bold">Загрузка профиля...</h2>
                                    <p className="text-sm sm:text-base text-muted-foreground">Пожалуйста, подождите</p>
                                </div>
                            </Card>
                        )}

                        {!isLoadingProfile && !isAuthenticated && !isTelegramUser && (
                            <Card className="max-w-2xl mx-auto p-6 sm:p-8 md:p-12 text-center space-y-4 sm:space-y-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                                    <LogIn className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                        Войдите, чтобы играть
                                    </h2>
                                    <p className="text-muted-foreground text-base sm:text-lg">
                                        Для участия в дуэлях необходимо авторизоваться
                                    </p>
                                </div>
                                <Button size="lg" onClick={() => setShowAuthModal(true)} className="px-6 sm:px-8">
                                    <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                    Войти
                                </Button>
                            </Card>
                        )}

                        {!isLoadingProfile && (isAuthenticated || isTelegramUser) && mode === 'menu' && (
                            <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10 animate-fade-in">

                                {/* Hero Section - Premium */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="relative overflow-hidden rounded-3xl border px-4 py-6 md:px-10 md:py-12 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 border-violet-500/30 shadow-[0_0_60px_rgba(139,92,246,0.5)]"
                                >
                                    {/* Noise texture */}
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

                                    {/* Glow effect */}
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl -z-10" />

                                    <div className="relative z-10">
                                        {/* Icon + Title */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 md:gap-4 md:mb-8">
                                            <motion.div
                                                whileHover={{ scale: 1.05, rotate: 5 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="p-2.5 md:p-4 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-xl"
                                            >
                                                <Swords className="w-7 h-7 md:w-10 md:h-10 text-white" />
                                            </motion.div>
                                            <div>
                                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Дуэль</h1>
                                                <p className="text-sm md:text-lg text-white/90 font-medium mt-1">Сразись с соперником за монеты</p>
                                            </div>
                                        </div>

                                        {/* User stats */}
                                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                                            {/* Total Duels */}
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="p-3 md:p-6 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300"
                                            >
                                                <div className="flex flex-col items-center gap-1 md:flex-row md:items-center md:gap-2 mb-1.5 md:mb-2">
                                                    <Swords className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
                                                    <span className="text-xs md:text-sm text-white/70 font-medium text-center md:text-left whitespace-nowrap">Всего</span>
                                                </div>
                                                <div className="text-2xl md:text-4xl font-black text-white text-center md:text-left">
                                                    {dataLoaded ? duelStats.totalDuels : '—'}
                                                </div>
                                            </motion.div>

                                            {/* Wins */}
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="p-3 md:p-6 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300"
                                            >
                                                <div className="flex flex-col items-center gap-1 md:flex-row md:items-center md:gap-2 mb-1.5 md:mb-2">
                                                    <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-300" />
                                                    <span className="text-xs md:text-sm text-white/70 font-medium text-center md:text-left">Побед</span>
                                                </div>
                                                <div className="text-2xl md:text-4xl font-black text-white text-center md:text-left">
                                                    {dataLoaded ? duelStats.wins : '—'}
                                                </div>
                                            </motion.div>

                                            {/* Coins Balance */}
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="p-3 md:p-6 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300"
                                            >
                                                <div className="flex flex-col items-center gap-1 md:flex-row md:items-center md:gap-2 mb-1.5 md:mb-2">
                                                    <Coins className="w-4 h-4 md:w-5 md:h-5 text-amber-300" />
                                                    <span className="text-xs md:text-sm text-white/70 font-medium text-center md:text-left">Монет</span>
                                                </div>
                                                <div className="text-2xl md:text-4xl font-black text-white text-center md:text-left">{userCoins}</div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* УБРАНО: Countdown Overlay - дуэль начинается сразу без задержки */}

                                {/* Unified Action Card - Premium Design */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <Card className="p-0 border border-border/40 shadow-2xl rounded-3xl sm:rounded-[2rem] overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl relative group">
                                        {/* Premium border glow */}
                                        <div className="absolute inset-0 rounded-3xl sm:rounded-[2rem] bg-gradient-to-r from-primary/10 via-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />

                                        <div className={`grid ${createdCode ? 'md:grid-cols-1' : 'md:grid-cols-2'} divide-y md:divide-y-0 ${createdCode ? '' : 'md:divide-x'} divide-border/30`}>
                                            {/* Create Duel Section - Premium */}
                                            <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 bg-gradient-to-br from-violet-50/80 via-purple-50/60 to-indigo-50/80 dark:from-violet-950/20 dark:via-purple-950/15 dark:to-indigo-950/20 overflow-hidden">
                                                {/* Noise texture */}
                                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

                                                {/* Animated background pattern */}
                                                <div className="absolute inset-0 opacity-5 dark:opacity-10">
                                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(139,92,246)_1px,transparent_0)] [background-size:24px_24px]" />
                                                </div>

                                                {/* Gradient overlay */}
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-400/20 to-purple-500/20 rounded-full blur-3xl -z-10" />

                                                <div className="relative space-y-5 sm:space-y-6">
                                                    <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                                                        <motion.div
                                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/40 flex-shrink-0 ring-4 ring-violet-500/20"
                                                        >
                                                            {/* Shine effect */}
                                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                                                            <Swords className="h-7 w-7 sm:h-8 sm:w-8 text-white relative z-10 drop-shadow-md" />
                                                        </motion.div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-1.5 bg-gradient-to-r from-violet-700 to-purple-700 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                                                                Создать дуэль
                                                            </h3>
                                                            <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
                                                                Создайте дуэль и пригласите друга на битву знаний
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {!createdCode ? (
                                                        <>
                                                            {/* User coins display */}
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="flex items-center justify-end gap-2 text-sm"
                                                            >
                                                                <Coins className="h-4 w-4 text-amber-500" />
                                                                <span className="font-bold text-muted-foreground">Ваш баланс:</span>
                                                                <span className="font-black text-amber-600 dark:text-amber-400">{userCoins}</span>
                                                                <span className="text-muted-foreground">монет</span>
                                                            </motion.div>

                                                            <div className="space-y-4">
                                                                {/* Number of questions */}
                                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                                                                    <motion.div
                                                                        initial={{ opacity: 0, x: -20 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: 0.5 }}
                                                                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/80 dark:bg-emerald-950/40 backdrop-blur-sm border-2 border-emerald-200/50 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10 shrink-0 ring-1 ring-emerald-500/20 w-full sm:w-auto"
                                                                    >
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={() => setNumQuestions(Math.max(5, numQuestions - 5))}
                                                                            disabled={isCreating || numQuestions <= 5}
                                                                            className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation disabled:hover:scale-100"
                                                                        >
                                                                            <Minus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                                                                        </motion.button>
                                                                        <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 min-w-[3rem] text-center px-2">
                                                                            {numQuestions}
                                                                        </span>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={() => setNumQuestions(Math.min(30, numQuestions + 5))}
                                                                            disabled={isCreating || numQuestions >= 30}
                                                                            className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation disabled:hover:scale-100"
                                                                        >
                                                                            <Plus className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                                                                        </motion.button>
                                                                    </motion.div>
                                                                </div>

                                                                {/* Betting options */}
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.6 }}
                                                                    className="space-y-3"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Coins className="h-4 w-4 text-amber-500" />
                                                                        <span className="text-sm font-bold text-muted-foreground">Ставка (опционально)</span>
                                                                    </div>

                                                                    {/* Bet type selector */}
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant={betType === 'none' ? 'default' : 'outline'}
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setBetType('none');
                                                                                setBetAmount(0);
                                                                            }}
                                                                            className="flex-1 text-xs sm:text-sm"
                                                                        >
                                                                            Без ставки
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant={betType === 'fixed' ? 'default' : 'outline'}
                                                                            size="sm"
                                                                            onClick={() => setBetType('fixed')}
                                                                            className="flex-1 text-xs sm:text-sm"
                                                                        >
                                                                            Фикс.
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant={betType === 'custom' ? 'default' : 'outline'}
                                                                            size="sm"
                                                                            onClick={() => setBetType('custom')}
                                                                            className="flex-1 text-xs sm:text-sm"
                                                                        >
                                                                            Своя
                                                                        </Button>
                                                                    </div>

                                                                    {/* Fixed bet amounts */}
                                                                    {betType === 'fixed' && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            className="grid grid-cols-4 gap-2"
                                                                        >
                                                                            {[10, 50, 100, 500].map((amount) => (
                                                                                <Button
                                                                                    key={amount}
                                                                                    type="button"
                                                                                    variant={betAmount === amount ? 'default' : 'outline'}
                                                                                    size="sm"
                                                                                    onClick={() => setBetAmount(amount)}
                                                                                    disabled={userCoins < amount}
                                                                                    className="text-xs sm:text-sm font-bold"
                                                                                >
                                                                                    {amount}
                                                                                </Button>
                                                                            ))}
                                                                        </motion.div>
                                                                    )}

                                                                    {/* Custom bet input */}
                                                                    {betType === 'custom' && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            className="space-y-2"
                                                                        >
                                                                            <Input
                                                                                type="number"
                                                                                min="1"
                                                                                max={Math.min(userCoins, 10000)}
                                                                                value={betAmount || ''}
                                                                                onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                                                                                placeholder="Введите сумму"
                                                                                className="text-center font-bold"
                                                                            />
                                                                            <p className="text-xs text-muted-foreground text-center">
                                                                                Макс: {Math.min(userCoins, 10000)} монет
                                                                            </p>
                                                                        </motion.div>
                                                                    )}

                                                                    {/* Bet info */}
                                                                    {betAmount > 0 && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0 }}
                                                                            animate={{ opacity: 1 }}
                                                                            className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50"
                                                                        >
                                                                            <div className="flex items-start gap-2 text-xs">
                                                                                <DollarSign className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                                                                <div className="space-y-1">
                                                                                    <p className="font-semibold text-foreground">
                                                                                        Банк: <span className="text-amber-600 dark:text-amber-400">{betAmount * 2}</span> монет
                                                                                    </p>
                                                                                    <p className="text-muted-foreground">
                                                                                        Победитель: <span className="text-green-600 dark:text-green-400 font-bold">{betAmount * 2}</span> монет (банк полностью)
                                                                                    </p>
                                                                                    <p className="text-muted-foreground">
                                                                                        При ничьей: ставки и страховка возвращаются
                                                                                    </p>
                                                                                    <p className="text-muted-foreground">
                                                                                        Season Points: <span className="font-semibold text-primary">{getSeasonBonusPreview(betAmount)} SP</span>
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-3 p-3 rounded-lg bg-white/70 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40 flex flex-col gap-2">
                                                                                <div className="flex items-center justify-between gap-4">
                                                                                    <div>
                                                                                        <p className="text-sm font-semibold text-foreground">Страховка дуэли</p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            +{hostInsurancePremium} монет • возврат {Math.round(COVERAGE_RATE * 100)}% ставки при поражении
                                                                                        </p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            Всего нужно: <span className="font-bold text-foreground">{hostTotalStake}</span> монет
                                                                                        </p>
                                                                                    </div>
                                                                                    <Switch
                                                                                        checked={hostInsuranceEnabled}
                                                                                        onCheckedChange={(checked) => setHostInsuranceEnabled(checked)}
                                                                                        disabled={betAmount <= 0 || hostTotalStake > userCoins}
                                                                                    />
                                                                                </div>
                                                                                {hostTotalStake > userCoins && (
                                                                                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                                                                                        Нужно ещё {hostTotalStake - userCoins} монет для страховки
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </motion.div>

                                                                {/* Loadout Selector */}
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.7 }}
                                                                >
                                                                    <LoadoutSelector />
                                                                </motion.div>

                                                                {/* Action buttons */}
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.8 }}
                                                                    className="w-full space-y-3"
                                                                >
                                                                    {/* Find Match button */}
                                                                    <Button
                                                                        size="lg"
                                                                        onClick={() => handleActionClick(() => handleFindMatch())}
                                                                        disabled={isFindingMatch || isCreating || (betType !== 'none' && betAmount <= 0) || (betAmount > 0 && hostTotalStake > userCoins)}
                                                                        className="w-full h-12 text-sm sm:text-base font-black rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:via-teal-700 hover:to-cyan-700 text-white shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 touch-manipulation relative overflow-hidden group"
                                                                    >
                                                                        {/* Shine effect on hover */}
                                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                                                        {isFindingMatch ? (
                                                                            <>
                                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />
                                                                                <span className="hidden sm:inline relative z-10">Поиск соперника...</span>
                                                                                <span className="sm:hidden relative z-10">Поиск...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Search className="mr-2 h-4 w-4 relative z-10" />
                                                                                <span className="relative z-10">Найти игру</span>
                                                                            </>
                                                                        )}
                                                                    </Button>

                                                                    {/* Create button */}
                                                                    <Button
                                                                        size="lg"
                                                                        onClick={() => handleActionClick(() => handleInlineCreate())}
                                                                        disabled={isCreating || isFindingMatch || (betType !== 'none' && betAmount <= 0) || (betAmount > 0 && hostTotalStake > userCoins)}
                                                                        variant="outline"
                                                                        className="w-full h-12 text-sm sm:text-base font-black rounded-2xl border-2 border-violet-500/50 hover:border-violet-500 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all duration-300 disabled:opacity-50 touch-manipulation relative overflow-hidden group"
                                                                    >
                                                                        {isCreating ? (
                                                                            <>
                                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />
                                                                                <span className="hidden sm:inline relative z-10">Создание...</span>
                                                                                <span className="sm:hidden relative z-10">Создание</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Swords className="mr-2 h-4 w-4 relative z-10" />
                                                                                <span className="hidden sm:inline relative z-10">
                                                                                    {betAmount > 0 ? `Создать за ${betAmount} монет` : 'Создать дуэль по коду'}
                                                                                </span>
                                                                                <span className="sm:hidden relative z-10">
                                                                                    {betAmount > 0 ? `За ${betAmount}` : 'Создать'}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </motion.div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Lobby State - Compact & Improved */}
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ duration: 0.3, type: "spring" }}
                                                                className="space-y-4"
                                                            >
                                                                {/* Header with Connection Status - Compact */}
                                                                <div className="flex items-center justify-end mb-2">
                                                                    {/* Connection status - Compact */}
                                                                    <div className="flex items-center gap-1.5">
                                                                        <motion.div
                                                                            className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                                            animate={connectionStatus === 'connected' ? {} : { scale: [1, 1.2, 1] }}
                                                                            transition={{ duration: 1, repeat: Infinity }}
                                                                        />
                                                                        <span className="text-muted-foreground text-xs">
                                                                            {connectionStatus === 'connected' ? 'Подключено' : 'Подключение...'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Compact Header with Waiting Indicator */}
                                                                <div className="text-center space-y-2">
                                                                    <motion.div
                                                                        animate={{ rotate: [0, 5, -5, 0] }}
                                                                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                                                                        className="w-14 h-14 mx-auto bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 relative"
                                                                    >
                                                                        {/* Pulsing indicator for waiting */}
                                                                        {!duelState.opponentJoined && (
                                                                            <motion.div
                                                                                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                                                                                transition={{ duration: 2, repeat: Infinity }}
                                                                                className="absolute inset-0 rounded-2xl bg-emerald-500/30"
                                                                            />
                                                                        )}
                                                                        <Users className="h-7 w-7 text-white relative z-10" />
                                                                    </motion.div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <h3 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                                                                Ожидание соперника
                                                                            </h3>
                                                                            {!duelState.opponentJoined && (
                                                                                <motion.div
                                                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                                                    className="flex gap-0.5"
                                                                                >
                                                                                    <span className="text-emerald-600">.</span>
                                                                                    <motion.span
                                                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                                                                        className="text-emerald-600"
                                                                                    >.</motion.span>
                                                                                    <motion.span
                                                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                                                                        className="text-emerald-600"
                                                                                    >.</motion.span>
                                                                                </motion.div>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground">Поделитесь кодом с другом</p>
                                                                    </div>
                                                                </div>

                                                                {/* Code Display - Compact & Improved */}
                                                                <motion.div
                                                                    initial={{ scale: 0.95, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    transition={{ delay: 0.1, type: "spring" }}
                                                                    className="relative"
                                                                >
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.98 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        className="relative bg-gradient-to-br from-white/95 via-emerald-50/90 to-teal-50/90 dark:from-emerald-950/50 dark:via-emerald-950/40 dark:to-teal-950/40 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border-2 border-emerald-500/50 ring-2 ring-emerald-500/10 cursor-pointer group hover:border-emerald-500/70 hover:ring-emerald-500/20 transition-all duration-200 shadow-md hover:shadow-lg"
                                                                        onClick={handleCopyCode}
                                                                        style={{
                                                                            boxShadow: copied
                                                                                ? 'rgba(16, 185, 129, 0.35) 0px 0px 30px'
                                                                                : 'rgba(16, 185, 129, 0.08) 0px 0px 15px'
                                                                        }}
                                                                    >
                                                                        {/* Code with Copy Icon - рядом с кодом */}
                                                                        <div className="flex items-center justify-center gap-3 mb-3 relative z-10">
                                                                            <motion.div
                                                                                key={createdCode}
                                                                                initial={{ scale: 1.1, opacity: 0 }}
                                                                                animate={{ scale: 1, opacity: 1 }}
                                                                                transition={{ duration: 0.4, type: "spring" }}
                                                                                className="text-5xl sm:text-6xl md:text-7xl font-black tracking-[0.2em] bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent select-all"
                                                                            >
                                                                                {createdCode}
                                                                            </motion.div>
                                                                            <motion.div
                                                                                animate={{ scale: copied ? [1, 1.2, 1] : 1 }}
                                                                                transition={{ duration: 0.3 }}
                                                                                className="flex-shrink-0"
                                                                            >
                                                                                {copied ? (
                                                                                    <Check className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                                                                                ) : (
                                                                                    <Copy className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                                                                                )}
                                                                            </motion.div>
                                                                        </div>

                                                                        {/* Label in border - рамка с текстом */}
                                                                        <div className="relative z-10">
                                                                            <div className="absolute inset-x-0 top-0 flex items-center justify-center">
                                                                                <div className="bg-background px-3">
                                                                                    <AnimatePresence mode="wait">
                                                                                        {copied ? (
                                                                                            <motion.span
                                                                                                key="copied"
                                                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                                exit={{ opacity: 0, scale: 0.9 }}
                                                                                                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                                                                                            >
                                                                                                Скопировано!
                                                                                            </motion.span>
                                                                                        ) : (
                                                                                            <motion.span
                                                                                                key="default"
                                                                                                initial={{ opacity: 0 }}
                                                                                                animate={{ opacity: 1 }}
                                                                                                exit={{ opacity: 0 }}
                                                                                                className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
                                                                                            >
                                                                                                КОД ДУЭЛИ
                                                                                            </motion.span>
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                </motion.div>

                                                                {/* Stats & Actions - Compact Layout */}
                                                                <div className="space-y-3">
                                                                    {/* Stats - Compact */}
                                                                    <div className="flex items-center justify-center gap-3">
                                                                        <motion.div
                                                                            initial={{ scale: 0.9, opacity: 0 }}
                                                                            animate={{ scale: 1, opacity: 1 }}
                                                                            transition={{ delay: 0.2 }}
                                                                            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/10 dark:to-teal-500/10 px-4 py-2 rounded-xl border border-emerald-500/30 backdrop-blur-sm"
                                                                        >
                                                                            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                                            <div className="flex items-baseline gap-1">
                                                                                <span className="font-black text-lg text-emerald-700 dark:text-emerald-300">{duelState.opponentJoined ? '2' : '1'}</span>
                                                                                <span className="text-muted-foreground/50 text-sm">/</span>
                                                                                <span className="font-black text-lg text-emerald-700 dark:text-emerald-300">2</span>
                                                                                <span className="text-xs text-muted-foreground ml-1">игроков</span>
                                                                            </div>
                                                                        </motion.div>

                                                                        <motion.div
                                                                            initial={{ scale: 0.9, opacity: 0 }}
                                                                            animate={{ scale: 1, opacity: 1 }}
                                                                            transition={{ delay: 0.25 }}
                                                                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 dark:from-blue-500/10 dark:to-indigo-500/10 px-4 py-2 rounded-xl border border-blue-500/30 backdrop-blur-sm"
                                                                        >
                                                                            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                                            <span className="font-mono font-black text-lg text-blue-700 dark:text-blue-300">
                                                                                {Math.floor(waitTime / 60)}:{(waitTime % 60).toString().padStart(2, '0')}
                                                                            </span>
                                                                        </motion.div>
                                                                    </div>

                                                                    {/* Action Buttons - Compact */}
                                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                                        {isTelegramUser && (
                                                                            <Button
                                                                                onClick={handleShare}
                                                                                size="default"
                                                                                className="flex-1 h-10 text-sm font-semibold bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:via-teal-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
                                                                            >
                                                                                <Share2 className="mr-2 h-4 w-4" />
                                                                                Поделиться
                                                                            </Button>
                                                                        )}

                                                                        {!duelState.opponentJoined && (
                                                                            <Button
                                                                                onClick={handleCancelDuel}
                                                                                variant="ghost"
                                                                                size="default"
                                                                                className="flex-1 h-10 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                                                                            >
                                                                                <X className="mr-2 h-4 w-4" />
                                                                                Отменить
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Opponent Joined Animation - Compact */}
                                                                <AnimatePresence>
                                                                    {duelState.opponentJoined && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                                            className="relative bg-gradient-to-r from-green-500/25 via-emerald-500/25 to-green-500/25 dark:from-green-500/15 dark:via-emerald-500/15 dark:to-green-500/15 border-2 border-green-500/50 rounded-xl p-4 shadow-lg shadow-green-500/20 overflow-hidden"
                                                                        >
                                                                            <div className="flex items-center justify-center gap-2 relative z-10">
                                                                                <motion.div
                                                                                    animate={{ rotate: 360 }}
                                                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                                                >
                                                                                    <Sparkles className="h-4 w-4 text-green-500" />
                                                                                </motion.div>
                                                                                <p className="text-green-700 dark:text-green-300 font-black text-lg">
                                                                                    Соперник найден!
                                                                                </p>
                                                                                <motion.div
                                                                                    animate={{ rotate: -360 }}
                                                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                                                >
                                                                                    <Sparkles className="h-4 w-4 text-green-500" />
                                                                                </motion.div>
                                                                            </div>
                                                                            <motion.p
                                                                                initial={{ opacity: 0, y: 10 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                transition={{ delay: 0.3 }}
                                                                                className="text-foreground/90 font-bold text-base sm:text-lg text-center relative z-10"
                                                                            >
                                                                                Приготовьтесь к битве! Битва начнется через 3 секунды... ⚔️
                                                                            </motion.p>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>

                                                            </motion.div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Join Duel Section - Premium (Hidden when duel is created) */}
                                            {!createdCode && (
                                                <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/80 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-yellow-950/20 overflow-hidden">
                                                    {/* Animated background pattern */}
                                                    <div className="absolute inset-0 opacity-5 dark:opacity-10">
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(251,191,36)_1px,transparent_0)] [background-size:24px_24px]" />
                                                    </div>

                                                    {/* Gradient overlay */}
                                                    <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-3xl -z-10" />

                                                    <div className="relative space-y-5 sm:space-y-6">
                                                        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                                                            <motion.div
                                                                whileHover={{ scale: 1.1, rotate: -5 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/40 flex-shrink-0 ring-4 ring-amber-500/20"
                                                            >
                                                                {/* Shine effect */}
                                                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                                                                <LogIn className="h-7 w-7 sm:h-8 sm:w-8 text-white relative z-10 drop-shadow-md" />
                                                            </motion.div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-2xl sm:text-3xl font-black text-foreground mb-1.5 bg-gradient-to-r from-amber-700 to-orange-700 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                                                                    Присоединиться
                                                                </h3>
                                                                <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
                                                                    Введите код дуэли от друга и начните битву
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4 sm:space-y-5">
                                                            <div className="space-y-3">
                                                                <Label htmlFor="join-code" className="text-sm sm:text-base font-bold text-foreground/90">
                                                                    Код дуэли
                                                                </Label>
                                                                <div className="relative">
                                                                    {/* Premium input container */}
                                                                    <div className="relative group">
                                                                        <Input
                                                                            id="join-code"
                                                                            placeholder="AB12"
                                                                            value={joinCode}
                                                                            onChange={(e) => {
                                                                                const newCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                                                                                setJoinCode(newCode);
                                                                                hasAutoJoinedRef.current = false;
                                                                            }}
                                                                            maxLength={4}
                                                                            disabled={isJoining || (!isAuthenticated && !isTelegramUser)}
                                                                            className="text-center text-2xl sm:text-3xl md:text-4xl tracking-[0.25em] sm:tracking-[0.3em] font-black h-14 sm:h-16 bg-white/90 dark:bg-amber-950/30 backdrop-blur-sm border-2 border-amber-300/50 dark:border-amber-700/50 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 rounded-2xl disabled:opacity-50 touch-manipulation shadow-xl shadow-amber-500/10 transition-all duration-300 placeholder:text-amber-300/50 dark:placeholder:text-amber-700/50"
                                                                            autoFocus={false}
                                                                        />
                                                                        {/* Glow effect on focus */}
                                                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />

                                                                        {isJoining && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, scale: 0 }}
                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2"
                                                                            >
                                                                                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-amber-600 dark:text-amber-400" />
                                                                            </motion.div>
                                                                        )}
                                                                    </div>

                                                                    {/* Premium indicators */}
                                                                    <div className="flex justify-center gap-2 sm:gap-2.5 pt-3">
                                                                        {Array.from({ length: 4 }).map((_, i) => (
                                                                            <motion.div
                                                                                key={i}
                                                                                initial={{ scale: 0 }}
                                                                                animate={{ scale: 1 }}
                                                                                transition={{ delay: i * 0.1, type: "spring" }}
                                                                                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${i < joinCode.length
                                                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 w-8 sm:w-10 shadow-lg shadow-amber-500/50'
                                                                                    : 'bg-amber-200/50 dark:bg-amber-900/30 w-2 sm:w-2.5'
                                                                                    }`}
                                                                            />
                                                                        ))}
                                                                    </div>

                                                                    <motion.p
                                                                        animate={{ opacity: joinCode.length === 4 ? 1 : 0.6 }}
                                                                        className="text-xs sm:text-sm text-center text-muted-foreground/80 pt-2 px-2 font-medium"
                                                                    >
                                                                        {joinCode.length < 4 ? 'Введите 4 символа' : joinCode.length === 4 ? '✨ Автоприсоединение...' : ''}
                                                                    </motion.p>
                                                                </div>
                                                            </div>

                                                            {/* Bet Warning / Preview */}
                                                            <AnimatePresence>
                                                                {duelPreview && duelPreview.bet_amount > 0 && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        transition={{ delay: 0.2 }}
                                                                        className={`p-4 sm:p-5 rounded-2xl border-2 ${userCoins >= joinTotalRequired
                                                                            ? 'bg-gradient-to-br from-amber-100/60 via-orange-100/40 to-yellow-100/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30 border-amber-500/40'
                                                                            : 'bg-gradient-to-br from-red-100/60 via-red-50/40 to-red-100/60 dark:from-red-950/30 dark:via-red-950/20 dark:to-red-950/30 border-red-500/40'
                                                                            } backdrop-blur-sm shadow-lg`}
                                                                    >
                                                                        <div className="flex items-start gap-3 sm:gap-4">
                                                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ${userCoins >= duelPreview.bet_amount
                                                                                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30 ring-amber-500/20'
                                                                                : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30 ring-red-500/20'
                                                                                }`}>
                                                                                <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                                <p className="text-sm sm:text-base font-bold text-foreground">
                                                                                    {userCoins >= joinTotalRequired ? '💰 Дуэль со ставкой!' : '⚠️ Недостаточно монет!'}
                                                                                </p>
                                                                                <p className="text-xs sm:text-sm text-muted-foreground">
                                                                                    Ставка: <span className="font-bold text-foreground">{duelPreview.bet_amount}</span> монет
                                                                                </p>
                                                                                {joinInsuranceEnabled && (
                                                                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                                                                        Страховка: <span className="font-bold text-foreground">+{joinInsurancePremiumValue}</span> монет • возврат {Math.round(COVERAGE_RATE * 100)}%
                                                                                    </p>
                                                                                )}
                                                                                <p className="text-xs sm:text-sm text-muted-foreground">
                                                                                    Всего нужно: <span className="font-bold text-foreground">{joinTotalRequired}</span> монет
                                                                                </p>
                                                                                <p className="text-xs sm:text-sm text-muted-foreground">
                                                                                    У вас: <span className={`font-bold ${userCoins >= joinTotalRequired ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                                        {userCoins}
                                                                                    </span> монет
                                                                                </p>
                                                                                {userCoins < joinTotalRequired && (
                                                                                    <p className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                                                                                        Нужно ещё {joinTotalRequired - userCoins} монет
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>

                                                            {/* Hint Box - shown when no preview */}
                                                            {!duelPreview && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: 0.2 }}
                                                                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-100/60 via-orange-100/40 to-yellow-100/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30 border border-amber-300/50 dark:border-amber-800/50 backdrop-blur-sm shadow-lg"
                                                                >
                                                                    <div className="flex items-start gap-3 sm:gap-4">
                                                                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20">
                                                                            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed font-medium">
                                                                                Попросите друга поделиться кодом из экрана ожидания дуэли
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}

                                                            {duelPreview && duelPreview.bet_amount > 0 && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 5 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="p-3 rounded-2xl bg-white/70 dark:bg-amber-950/30 border border-amber-200/40 dark:border-amber-800/40 flex items-center justify-between gap-4"
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-foreground">Добавить страховку</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            +{joinInsurancePremiumValue} монет • возврат {Math.round(COVERAGE_RATE * 100)}% при поражении
                                                                        </p>
                                                                    </div>
                                                                    <Switch
                                                                        checked={joinInsuranceEnabled}
                                                                        onCheckedChange={(checked) => setJoinInsuranceEnabled(checked)}
                                                                        disabled={userCoins < joinTotalRequired}
                                                                    />
                                                                </motion.div>
                                                            )}

                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.3 }}
                                                            >
                                                                <Button
                                                                    size="lg"
                                                                    onClick={() => {
                                                                        if (joinCode.length === 4) {
                                                                            handleInlineJoin(joinCode);
                                                                        }
                                                                    }}
                                                                    disabled={
                                                                        joinCode.length !== 4 ||
                                                                        isJoining ||
                                                                        (!isAuthenticated && !isTelegramUser) ||
                                                                        (duelPreview && duelPreview.bet_amount > 0 && userCoins < joinTotalRequired)
                                                                    }
                                                                    className="w-full h-12 sm:h-12 text-sm sm:text-base font-black rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:via-amber-700 hover:to-orange-700 text-white shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation relative overflow-hidden group"
                                                                >
                                                                    {/* Shine effect */}
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                                                    {isJoining ? (
                                                                        <>
                                                                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin relative z-10" />
                                                                            <span className="hidden sm:inline relative z-10">Присоединение...</span>
                                                                            <span className="sm:hidden relative z-10">Присоединение</span>
                                                                        </>
                                                                    ) : duelPreview && duelPreview.bet_amount > 0 ? (
                                                                        <>
                                                                            <Coins className="mr-2 h-4 w-4 sm:h-5 sm:w-5 relative z-10" />
                                                                            <span className="hidden sm:inline relative z-10">
                                                                                Присоединиться за {joinTotalRequired} монет
                                                                            </span>
                                                                            <span className="sm:hidden relative z-10">За {joinTotalRequired}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5 relative z-10" />
                                                                            <span className="relative z-10">Присоединиться</span>
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </motion.div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>

                                {/* How to Play Section - Premium */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <Card className="p-6 sm:p-8 md:p-10 bg-gradient-to-br from-card/95 via-card/90 to-primary/10 border border-primary/30 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                                        {/* Animated background glow */}
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 via-blue-500/10 to-cyan-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 -z-10" />

                                        <h3 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
                                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary via-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl shadow-primary/40 ring-4 ring-primary/20">
                                                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                                                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white relative z-10" />
                                            </div>
                                            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                                                Как играть
                                            </span>
                                        </h3>

                                        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                                            {[
                                                { icon: Swords, title: 'Создайте или присоединитесь', desc: 'Пригласите друга или введите код дуэли', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                                { icon: Zap, title: 'Отвечайте быстрее', desc: 'Бонус за скорость до +40%', gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                                { icon: Target, title: 'Собирайте комбо', desc: 'До +20% за серию правильных ответов', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                                                { icon: Trophy, title: 'Побеждайте!', desc: 'Получайте награды и поднимайтесь в рейтинге', gradient: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                                            ].map((item, index) => {
                                                const Icon = item.icon;
                                                return (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.7 + index * 0.1 }}
                                                        whileHover={{ scale: 1.02, y: -2 }}
                                                        className={`flex items-start gap-4 sm:gap-5 p-5 sm:p-6 rounded-2xl ${item.bg} border-2 ${item.border} hover:border-opacity-40 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl group/item relative overflow-hidden`}
                                                    >
                                                        {/* Hover glow effect */}
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover/item:opacity-10 transition-opacity duration-300 -z-10`} />

                                                        <div className={`relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${item.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl ring-4 ring-opacity-20 group-hover/item:scale-110 transition-transform duration-300`}>
                                                            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                                                            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white relative z-10" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 pt-1">
                                                            <div className="font-black text-base sm:text-lg mb-1.5 text-foreground">{item.title}</div>
                                                            <div className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">{item.desc}</div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                </motion.div>
                            </div>
                        )}

                        {!isLoadingProfile && mode === 'create' && (
                            <DuelLobby
                                duelId={duelId}
                                duelCode={duelCode}
                                onDuelCreated={handleDuelCreated}
                                onDuelStarted={handleDuelStarted}
                                onCancel={handleBackToMenu}
                            />
                        )}

                        {mode === 'result' && duelId && (
                            <DuelResult
                                duelId={duelId}
                                onRematch={() => {
                                    duelResultSnapshotRef.current = null; // Очищаем snapshot при реванше
                                    setMode('create');
                                }}
                                onBackToMenu={() => {
                                    duelResultSnapshotRef.current = null; // Очищаем snapshot при выходе
                                    handleBackToMenu();
                                }}
                                initialSnapshot={duelResultSnapshotRef.current || undefined}
                            />
                        )}

                        {/* Debug: показываем состояние для отладки */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-xs rounded z-50">
                                Mode: {mode} | DuelId: {duelId ? '✅' : '❌'}
                            </div>
                        )}

                        {dataLoaded && (
                            <AuthModal
                                open={showAuthModal}
                                onClose={() => setShowAuthModal(false)}
                            />
                        )}

                        {/* Modals */}
                        <DuelCreateModal
                            open={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            onDuelCreated={handleDuelCreated}
                        />

                        <DuelJoinModal
                            open={showJoinModal}
                            onClose={() => setShowJoinModal(false)}
                            onDuelJoined={handleDuelJoined}
                        />
                    </div>
                </Layout>
            )}
        </>
    );
}
