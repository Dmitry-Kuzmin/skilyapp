import { useState, useEffect, useRef, useCallback } from 'react';
import type { DuelResultSnapshot } from '@/features/duel/shared';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Swords, Trophy, LogIn, Sparkles, Zap, Target, TrendingUp, Copy, Check, Hash, Minus, Plus, ArrowLeft, ChevronRight, X, Coins, DollarSign, Gift, Users, Clock, Share2, Search, Shield } from 'lucide-react';
import { extractErrorFromResponse } from '@/utils/errorMessages';
import { DuelLobby } from '@/components/duel/DuelLobby';
import { DuelCreateModal } from '@/components/duel/DuelCreateModal';
import { DuelJoinModal } from '@/components/duel/DuelJoinModal';
import { DuelBattleFullscreen } from '@/components/duel/DuelBattleFullscreen';
import { DuelFindingScreen } from '@/components/duel/parts/DuelFindingScreen';
import { DuelResult } from '@/components/duel/DuelResult';
import { PageLoader } from '@/components/PageLoader';
import { LoadoutSelector } from '@/components/duel/LoadoutSelector';
import { AuthModalNew as AuthModal } from '@/components/AuthModalNew';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AnimatePresence, motion } from '@/components/optimized/Motion';
import { useUserContext } from '@/contexts/UserContext';
import { isTelegramMiniApp as isTelegramMiniAppRaw, getTelegramWebApp as getTelegramWebAppRaw } from '@/lib/telegram';
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { dispatchUserEvent } from '@/lib/notification-events';
import { useDuelRealtime } from '@/hooks/useDuelRealtime';
import { useModal } from '@/hooks/useModal';
import { useSkilyAIToast } from '@/hooks/useSkilyAIToast';
import { toast } from 'sonner';
import { useActiveDuel } from '@/hooks/useActiveDuel';
import type { GameMode } from '@/features/duel/shared';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePDDContext } from '@/contexts/PDDContext';

import { OnlinePlayers } from '@/components/shared/OnlinePlayers';

// Safe wrappers with UNIQUE names for hoisting and resilience
function safeIsTelegramMiniApp() {
    return typeof isTelegramMiniAppRaw === 'function' ? isTelegramMiniAppRaw() : false;
}
function safeGetTelegramWebApp() {
    return typeof getTelegramWebAppRaw === 'function' ? getTelegramWebAppRaw() : null;
}

// 🆕 SAFE CHECKS: Определяем Mini App через обертку
const isInTelegramMiniAppGlobal = safeIsTelegramMiniApp();


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
const debugFetch = (data: unknown) => {
    // Отключено для стабильности
};

export default function Duel() {
    const [searchParams, setSearchParams] = useSearchParams();

    // 🔍 Debug logs for initialization
    useEffect(() => {
        const code = searchParams.get('code');
        const startParam = safeGetTelegramWebApp()?.initDataUnsafe?.start_param;
        console.log('[Duel] 🧩 Component Mounted. URL Code:', code, 'StartParam:', startParam);

        // КРИТИЧНО: Скролл вверх при монтировании, чтобы экран копирования был сверху
        window.scrollTo(0, 0);
    }, []);

    const { isAuthenticated, profileId, user, supabaseUser } = useUserContext();
    const { selectedCategory } = usePDDContext(); // Get category from context
    const { showDuelJoinError, showDuelJoinSuccess, showDuelNotification, ToastContainer } = useSkilyAIToast();
    const { activeDuel, saveActiveDuel, clearActiveDuel, updateActiveDuel, isChecking } = useActiveDuel();
    const { enabled: duelsEnabled, isLoading: flagsLoading } = useFeatureFlag('duels_enabled', true);

    // Map selected category to A_B or C_D for duel manager
    const licenseCategory: 'A_B' | 'C_D' = (() => {
        const cat = selectedCategory?.toUpperCase();
        if (cat === 'C' || cat === 'D' || cat === 'CE' || cat === 'DE' || cat === 'C_D') {
            return 'C_D';
        }
        return 'A_B';
    })();

    const [mode, setMode] = useState<GameMode>('menu');
    const [duelId, setDuelId] = useState<string | null>(null);
    const [duelCode, setDuelCode] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [isBattleHidden, setIsBattleHidden] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [dataLoaded, setDataLoaded] = useState(false);
    const isTelegramUser = safeIsTelegramMiniApp();

    // Режим экрана: null = выбор режима, 'random' = случайный, 'friend' = с другом
    const [duelMode, setDuelMode] = useState<'random' | 'friend' | null>(null);

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
    const [betType, setBetType] = useState<'fixed' | 'custom'>('fixed');
    const [betAmount, setBetAmount] = useState(10);
    const [userCoins, setUserCoins] = useState(0);
    const [duelStats, setDuelStats] = useState({ totalDuels: 0, wins: 0 });
    const { openModal: openBoostShop } = useModal('BOOST_SHOP');
    const lowCoinsPromptedRef = useRef(false);
    const [hostInsuranceEnabled, setHostInsuranceEnabled] = useState(true);
    const [joinInsuranceEnabled, setJoinInsuranceEnabled] = useState(true);
    const hostInsurancePremium = hostInsuranceEnabled && betAmount > 0 ? getInsurancePremium(betAmount) : 0;
    const hostTotalStake = betAmount + hostInsurancePremium;
    const joinPreviewBet = duelPreview?.bet_amount || 0;
    const joinInsurancePremiumValue = joinInsuranceEnabled && joinPreviewBet > 0 ? getInsurancePremium(joinPreviewBet) : 0;
    const joinTotalRequired = joinPreviewBet > 0 ? joinPreviewBet + joinInsurancePremiumValue : joinPreviewBet;

    const [rematchOpponent, setRematchOpponent] = useState<{ id?: string; name?: string; isBot?: boolean } | null>(null);
    const [showRematchSetup, setShowRematchSetup] = useState(false);
    const [rematchInsuranceEnabled, setRematchInsuranceEnabled] = useState(true); // Страховка активна по умолчанию
    const [userProfile, setUserProfile] = useState<{ firstName: string | null; photoUrl: string | null }>({ firstName: null, photoUrl: null });

    // Use realtime hook when duel is created
    const { state: duelState } = useDuelRealtime(createdCode && duelId ? duelId : null);


    const navigate = useNavigate();

    // 🆕 Telegram BackButton и swipe-back для экрана настройки дуэли (не для battle/results)
    useEffect(() => {
        const isTG = safeIsTelegramMiniApp();
        if (!isTG) return;

        const webApp = safeGetTelegramWebApp();
        if (!webApp || !webApp.BackButton) return;

        // Показываем кнопку только в режиме меню
        if (mode === 'menu') {
            webApp.BackButton.show();
        } else {
            webApp.BackButton.hide();
        }

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
                setUserProfile({
                    firstName: (coinsData as any).first_name || null,
                    photoUrl: (coinsData as any).photo_url || null
                });
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
        setRematchOpponent(null);

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
        const webApp = safeGetTelegramWebApp();
        const tgStartParam = webApp?.initDataUnsafe?.start_param;

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

            // Вызываем присоединение без искусственной задержки
            handleInlineJoin(code);
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

        // 🔥 КРИТИЧНО: Очищаем URL от параметров старой дуэли
        setSearchParams(new URLSearchParams());

        setMode('menu');
        setDuelId(null);
        setDuelCode(null);
        setRematchOpponent(null);
        setIsBattleHidden(false);
        setJoinCode('');
        setCreatedCode(null);
        setCopied(false);
        setDuelMode(null);
        hasAutoJoinedRef.current = false;
    }, [clearActiveDuel, setSearchParams]);

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

            const { data, error } = await supabase.functions.invoke('duel-matchmaking', {
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
            const { data, error } = await supabase.functions.invoke('duel-matchmaking', {
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
                    license_category: licenseCategory, // Pass category
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
                console.log('Clipboard API blocked:', error);
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

    const handleFindMatch = async (immediateBot = false, argRematchOpponent?: { id?: string; name?: string; isBot?: boolean }, argInsuranceEnabled?: boolean) => {
        if (!dataLoaded || !profileId) {
            console.warn('[Duel] Cannot find match: dataLoaded=', dataLoaded, 'profileId=', profileId);
            return;
        }
        if (isFindingMatch) return;

        console.log('[Duel] 🔍 handleFindMatch initiated:', { immediateBot, argRematchOpponent, rematchOpponent });

        // Сбрасываем старые идентификаторы перед началом нового поиска
        setCreatedCode(null);
        setDuelId(null);
        setDuelCode(null);
        setJoinCode('');

        // Используем либо переданного оппонента, либо сохраненного в стейте (для реванша с настройками)
        const activeRematchOpponent = argRematchOpponent || rematchOpponent;
        const isActuallyRematch = !!activeRematchOpponent;

        setIsFindingMatch(true);
        setMode('finding');

        console.log('[Duel] 🚀 Finding match with params:', {
            isActuallyRematch,
            opponentName: activeRematchOpponent?.name,
            immediate_bot: immediateBot || (isActuallyRematch && activeRematchOpponent?.isBot)
        });

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
            const requestBody: Record<string, unknown> = {
                action: 'find_match',
                profile_id: profileId,
                num_questions: numQuestionsValue,
                difficulty: 'mix' as const,
                bet_amount: betAmountValue,
                bet_type: betType || 'none',
                license_category: licenseCategory, // Pass category
                immediate_bot: immediateBot || (isActuallyRematch && activeRematchOpponent?.isBot), // Флаг для мгновенного создания бота при реванше
                rematch_opponent_id: activeRematchOpponent?.id,
                rematch_bot_name: activeRematchOpponent?.isBot ? activeRematchOpponent.name : undefined,
            };

            // Страховка: если передан argInsuranceEnabled — используем его напрямую, иначе из стейта
            const effectiveInsurance = argInsuranceEnabled !== undefined ? argInsuranceEnabled : hostInsuranceEnabled;
            if (effectiveInsurance && betAmountValue > 0) {
                requestBody.insurance_enabled = true;
                requestBody.insurance_rate = INSURANCE_RATE;
                requestBody.insurance_coverage_rate = COVERAGE_RATE;
            }

            console.log('[Duel] ✅ Validated request body:', {
                ...requestBody,
                profile_id: profileId ? `${profileId.substring(0, 8)}...` : 'MISSING'
            });

            const { data, error } = await supabase.functions.invoke('duel-matchmaking', {
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

            console.log('[Duel] 📦 Match found data:', {
                auto_started: data.auto_started,
                opponent_type: data.opponent_type,
                bot_name: data.bot_name,
                duel_id: data.duel.id
            });

            // Если автозапуск произошел - сразу переходим к битве
            if (data.auto_started) {
                if (activeRematchOpponent && data.opponent_type === 'bot') {
                    // Премиальная задержка для ощущения "вызова"
                    toast.loading(`Вызываем ${activeRematchOpponent.name || data.bot_name || 'соперника'} на реванш...`, { id: 'rematch-bot-loading' });

                    setTimeout(() => {
                        toast.success(`${activeRematchOpponent.name || data.bot_name || 'Соперник'} принял ваш вызов!`, {
                            id: 'rematch-bot-loading',
                            icon: '⚔️'
                        });

                        setTimeout(() => {
                            handleDuelStarted(data.duel.id);
                        }, 1000);
                    }, 1800);
                } else {
                    handleDuelStarted(data.duel.id);
                    toast.success(data.opponent_type === 'bot' ? `Соперник ${data.bot_name || 'найден'}!` : 'Соперник найден!');
                }
            } else {
                // FALLBACK: Если не автозапуск (например, нашли реального игрока, но нужно ждать подтверждения)
                if (isActuallyRematch) {
                    console.log('[Duel] 🔄 Rematch fallback: forcing battle start for bot or showing error');
                    if (data.opponent_type === 'bot') {
                        handleDuelStarted(data.duel.id);
                    } else {
                        // Для людей - переходим в лобби
                        setCreatedCode(data.duel.code);
                        setMode('create');
                    }
                } else {
                    setCreatedCode(data.duel.code);
                    setMode('create');
                    setConnectionStatus('checking');
                    setWaitTime(0);
                    toast.success('Соперник найден!');
                }
            }
        } catch (error: any) {
            setIsFindingMatch(false);
            setMode('menu'); // Возвращаемся в меню при ошибке поиска
            console.error('[Duel] ❌ Error finding match:', error);

            // Пытаемся извлечь детали ошибки из ответа Edge Function
            let errorMessage = 'Ошибка при поиске соперника';
            let errorDetails: Record<string, unknown> | null = null;

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
                const validationErrors = (errorDetails.details as Array<{ path?: string[]; message: string; received?: unknown }>)
                    .map((d) => {
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
            console.log('Clipboard API blocked:', error);
            toast.error('Не удалось скопировать код. Код: ' + createdCode);
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
            const { data, error } = await supabase.functions.invoke('duel-matchmaking', {
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
                const { data, error } = await supabase.functions.invoke('duel-matchmaking', {
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
                    <svg className="w-8 h-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </Layout>
        );
    }

    // Убрали отдельный экран ошибки - теперь блокируем кнопку в Games.tsx

    if (isInitialLoading || (!dataLoaded && !isTelegramUser) || isLoadingProfile) {
        return <PageLoader />;
    }

    // Fullscreen modes - no Layout/Footer
    // But if hidden, show menu with widget overlay
    if (mode === 'battle' && duelId && !isBattleHidden) {
        return (
            <DuelBattleFullscreen
                key={duelId} // 🔥 CRITICAL: Force remount on duelId change to reset all state
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
                <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
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

                    <div className={cn(
                        "container mx-auto px-3 sm:px-4 max-w-[1370px]",
                        mode === 'result' ? "pt-0 pb-6" : "py-4 sm:py-6"
                    )}>
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
                            <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10 animate-fade-in pb-8">

                                {/* 🏆 NEW PREMIUM UNIFIED HERO BLOCK (Stats + Quick Actions) */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative overflow-hidden rounded-[40px] border border-white/[0.05] bg-[#0b0d14] shadow-2xl mb-8"
                                >
                                    {/* Abstract background elements */}
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
                                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] -z-10" />
                                    <div className="absolute inset-0 opacity-[0.02] bg-[url('/noise.svg')] pointer-events-none" />

                                    <div className="p-6 sm:p-10 md:p-12 space-y-10">
                                        {/* HEADER ROW: Title & Description + Stats */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                            {/* Title & Desc */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-primary/30 flex items-center justify-center shadow-lg backdrop-blur-xl">
                                                        <Swords className="w-7 h-7 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Дуэль</h1>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-xs font-black uppercase tracking-widest text-emerald-500/80">Live Multiplayer</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-slate-400 text-base sm:text-lg max-w-md font-medium leading-relaxed">
                                                    Сразись с соперниками по всей стране, заработай рейтинг и монеты
                                                </p>
                                            </div>

                                            {/* Stats Cards (Compact) */}
                                            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-[450px]">
                                                {[
                                                    { label: 'Всего', val: dataLoaded ? duelStats.totalDuels : '—', icon: Hash, color: 'text-slate-400' },
                                                    { label: 'Побед', val: dataLoaded ? duelStats.wins : '—', icon: Trophy, color: 'text-yellow-500' },
                                                    { label: 'Монет', val: userCoins, icon: Coins, color: 'text-amber-500' }
                                                ].map((stat, i) => (
                                                    <div key={i} className="group relative flex flex-col p-4 rounded-3xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <stat.icon size={12} className={stat.color} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
                                                        </div>
                                                        <div className="text-xl sm:text-2xl font-black text-white">
                                                            {stat.val}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* SELECTION ROW: Big Buttons (only if no mode selected) */}
                                        <AnimatePresence mode="wait">
                                            {duelMode === null && !createdCode && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.4 }}
                                                    className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6"
                                                >
                                                    {/* BUTTON: RANDOM BATTLE */}
                                                    <button
                                                        onClick={() => handleActionClick(() => {
                                                            setRematchOpponent(null);
                                                            setDuelMode('random');
                                                        })}
                                                        className="group relative flex flex-col items-center justify-between p-6 sm:p-8 min-h-[220px] rounded-[32px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-500 overflow-hidden text-center"
                                                    >
                                                        {/* Flare */}
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                        <div className="absolute -top-6 -right-6 text-primary/5 group-hover:text-primary/10 transition-colors duration-500 pointer-events-none">
                                                            <Search className="w-40 h-40 transform rotate-[15deg] group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                                                        </div>

                                                        <div className="relative z-10 space-y-4 text-center">
                                                            <div className="flex flex-col items-center gap-4">
                                                                <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                                                                    <Search className="w-6 h-6 text-white" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Случайный бой</h3>
                                                                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px] mx-auto">
                                                                        Мгновенный подбор равного по силе врага
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="relative z-10 flex items-center justify-between mt-6">
                                                            <OnlinePlayers
                                                                baseCount={1240}
                                                                className="w-full flex-row-reverse"
                                                            />
                                                        </div>
                                                    </button>

                                                    {/* BUTTON: PLAY WITH FRIEND */}
                                                    <button
                                                        onClick={() => handleActionClick(() => {
                                                            setRematchOpponent(null);
                                                            setDuelMode('friend');
                                                        })}
                                                        className="group relative flex flex-col items-center justify-between p-6 sm:p-8 min-h-[220px] rounded-[32px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] hover:border-amber-500/40 hover:bg-amber-500/[0.02] transition-all duration-500 overflow-hidden text-center"
                                                    >
                                                        {/* Flare */}
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                        <div className="absolute -top-6 -right-6 text-amber-500/5 group-hover:text-amber-500/10 transition-colors duration-500 pointer-events-none">
                                                            <Users className="w-40 h-40 transform rotate-[-10deg] group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                                                        </div>

                                                        <div className="relative z-10 space-y-4 text-center">
                                                            <div className="flex flex-col items-center gap-4">
                                                                <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                                                                    <Users className="w-6 h-6 text-white" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Игра с другом</h3>
                                                                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px] mx-auto">
                                                                        Создай комнату и пригласи товарища по коду
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="relative z-10 mt-6">
                                                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 transition-all">
                                                                <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                                                    Создать лобби <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                    </div>
                                </motion.div>

                                {/* — Поиск и Лобби — */}
                                <AnimatePresence mode="wait">


                                    {/* — Случайный соперник — */}
                                    {(duelMode === 'random' || duelMode === 'friend' || createdCode) && (
                                        <motion.div
                                            key={duelMode === 'random' ? 'random' : 'friend'}
                                            className="mb-12 sm:mb-16"
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                        >
                                            {/* Блок настроек лобби */}

                                            <Card className="p-0 border border-border/40 shadow-xl rounded-3xl sm:rounded-[2rem] overflow-hidden bg-card relative">
                                                <div className={`grid ${(duelMode === 'friend' || createdCode) ? 'md:grid-cols-2' : 'md:grid-cols-1'} divide-y md:divide-y-0 ${(duelMode === 'friend' || createdCode) ? 'md:divide-x' : ''} divide-border/30`}>
                                                    {/* Create Duel Section - Premium */}
                                                    <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 bg-gradient-to-br from-violet-50/80 via-purple-50/60 to-indigo-50/80 dark:from-violet-950/20 dark:via-purple-950/15 dark:to-indigo-950/20 overflow-hidden">
                                                        {/* Noise texture */}
                                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("/noise.svg")' }} />

                                                        {/* Animated background pattern */}
                                                        <div className="absolute inset-0 opacity-5 dark:opacity-10">
                                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(139,92,246)_1px,transparent_0)] [background-size:24px_24px]" />
                                                        </div>

                                                        {/* Gradient overlay */}
                                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-400/20 to-purple-500/20 rounded-full blur-3xl -z-10" />

                                                        <div className="relative space-y-6 sm:space-y-8">
                                                            {/* Встроенная кнопка назад и идентификатор режима */}
                                                            <div className="flex items-center justify-between">
                                                                <button
                                                                    onClick={() => {
                                                                        console.log('[Duel] 🔙 Back to menu from setup, clearing rematch data');
                                                                        setDuelMode(null);
                                                                        setRematchOpponent(null);
                                                                    }}
                                                                    className="group/back flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 shadow-lg backdrop-blur-md"
                                                                >
                                                                    <ArrowLeft size={18} className="text-slate-400 group-hover/back:text-white transition-colors" />
                                                                    <span className="text-[11px] font-black text-slate-400 group-hover/back:text-white uppercase tracking-[0.2em]">Назад</span>
                                                                </button>

                                                                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-xl shadow-inner">
                                                                    {duelMode === 'random' ? (
                                                                        <Search size={14} className="text-violet-400" />
                                                                    ) : (
                                                                        <Users size={14} className="text-amber-400" />
                                                                    )}
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                                                        {rematchOpponent ? 'REMATCH' : duelMode === 'random' ? 'RANDOM MATCH' : 'PRIVATE DUEL'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between pt-2">
                                                                {/* Title is now in Hero block, only showing mode badge here */}
                                                                <div />
                                                            </div>

                                                            {!createdCode ? (
                                                                <>
                                                                    <div className={cn(
                                                                        "grid gap-4",
                                                                        duelMode === 'random' ? "lg:grid-cols-2" : "grid-cols-1"
                                                                    )}>
                                                                        {/* 💎 ADVANCED BETTING CARD (Reactive & Haptic) */}
                                                                        <motion.div
                                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                                            animate={betAmount > 0 && betAmount >= Math.floor(userCoins / 10) * 10 && userCoins > 0 ? { boxShadow: "0 0 30px rgba(249, 115, 22, 0.3)", opacity: 1, scale: 1 } : { boxShadow: "0 0 0px rgba(0,0,0,0)", opacity: 1, scale: 1 }}
                                                                            className={cn(
                                                                                "relative overflow-hidden rounded-3xl p-5 border transition-all duration-300",
                                                                                betAmount > 0
                                                                                    ? "bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-black border-orange-200 dark:border-orange-800"
                                                                                    : "bg-secondary/30 border-transparent dark:bg-white/5"
                                                                            )}
                                                                        >
                                                                            {/* Background Noise & Haptics Trigger Helper */}
                                                                            <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.svg')] pointer-events-none" />

                                                                            {/* HEADER */}
                                                                            <div className="flex justify-between items-center mb-6 relative z-10">
                                                                                <div className={cn(
                                                                                    "flex items-center gap-2 font-black text-[10px] tracking-[0.2em] uppercase transition-colors",
                                                                                    betAmount > 0 ? "text-orange-600 dark:text-orange-500" : "text-muted-foreground/60"
                                                                                )}>
                                                                                    <Zap size={14} className={betAmount > 0 && betAmount >= Math.floor(userCoins / 10) * 10 ? "animate-pulse" : ""} />
                                                                                    {betAmount > 0 ? 'Азартный режим' : 'Тренировка'}
                                                                                </div>
                                                                                <motion.button
                                                                                    layout
                                                                                    onClick={() => openBoostShop({ initialTab: 'coins' })}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors group relative overflow-hidden"
                                                                                >
                                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                                                                    <span className="opacity-70">БАЛАНС:</span>
                                                                                    <span className="text-xs">{userCoins.toLocaleString()}</span>
                                                                                    <Coins size={12} className="text-amber-500 ml-0.5 group-hover:rotate-12 transition-transform" />
                                                                                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center ml-0.5">
                                                                                        <Plus size={10} strokeWidth={3} className="text-amber-600 dark:text-amber-400" />
                                                                                    </div>
                                                                                </motion.button>
                                                                            </div>

                                                                            {/* MAIN CONTROLLER */}
                                                                            <div className="flex items-center justify-between gap-3 relative z-10 mb-6">
                                                                                {/* MINUS */}
                                                                                <motion.button
                                                                                    whileTap={{ scale: 0.9 }}
                                                                                    onClick={() => {
                                                                                        const newValue = Math.max(10, betAmount - 10);
                                                                                        setBetAmount(newValue);
                                                                                        setBetType('custom');
                                                                                        safeGetTelegramWebApp()?.HapticFeedback?.impactOccurred('light');
                                                                                    }}
                                                                                    disabled={betAmount <= 10 || isCreating}
                                                                                    className="w-12 h-12 rounded-full bg-white dark:bg-white/10 shadow-sm border border-black/5 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-orange-500 transition-colors disabled:opacity-30 shrink-0"
                                                                                >
                                                                                    <Minus size={20} />
                                                                                </motion.button>

                                                                                {/* SLOT MACHINE DISPLAY */}
                                                                                <div className="flex flex-col items-center justify-center h-20 w-full">
                                                                                    <div className="flex flex-col items-center">
                                                                                        <div className="flex items-baseline gap-1 relative">
                                                                                            <AnimatePresence mode='popLayout'>
                                                                                                <motion.span
                                                                                                    key={betAmount}
                                                                                                    initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                                                                                                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                                                                                                    exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                                                                                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                                                                    className="text-4xl font-black text-foreground tracking-tighter tabular-nums leading-none"
                                                                                                >
                                                                                                    {betAmount}
                                                                                                </motion.span>
                                                                                            </AnimatePresence>
                                                                                            <Coins className="absolute -right-8 top-0 w-6 h-6 text-amber-500 animate-pulse" />
                                                                                        </div>
                                                                                        {/* PROFIT BADGE */}
                                                                                        <motion.div
                                                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                                            className="mt-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5"
                                                                                        >
                                                                                            <Trophy size={12} className="fill-current" />
                                                                                            ПРИЗ: {betAmount * 2}
                                                                                        </motion.div>

                                                                                        {/* ENTRY FEE BADGE (IF INSURANCE) */}
                                                                                        {hostInsuranceEnabled && betAmount > 0 && (
                                                                                            <motion.div
                                                                                                initial={{ opacity: 0, y: 5 }}
                                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                                className="mt-1 flex items-center gap-1.5"
                                                                                            >
                                                                                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                                                                                                    ВСЕГО К СПИСАНИЮ: <span className="text-foreground font-bold">{hostTotalStake}</span>
                                                                                                </span>
                                                                                                <Coins size={8} className="text-amber-500" />
                                                                                            </motion.div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* PLUS */}
                                                                                <motion.button
                                                                                    whileTap={{ scale: 0.9 }}
                                                                                    onClick={() => {
                                                                                        const newValue = Math.min(Math.floor(userCoins / 10) * 10, betAmount + 10);
                                                                                        setBetAmount(newValue);
                                                                                        setBetType('custom');
                                                                                        safeGetTelegramWebApp()?.HapticFeedback?.impactOccurred('medium');
                                                                                    }}
                                                                                    disabled={isCreating} // Allow going up to max coins logic handled in onClick
                                                                                    className={cn(
                                                                                        "w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-all shrink-0",
                                                                                        betAmount > 0
                                                                                            ? "bg-orange-500 shadow-orange-500/40 hover:bg-orange-600 hover:scale-105"
                                                                                            : "bg-zinc-800 dark:bg-white dark:text-black hover:bg-zinc-700"
                                                                                    )}
                                                                                >
                                                                                    <Plus size={24} strokeWidth={3} />
                                                                                </motion.button>
                                                                            </div>

                                                                            {/* PRESETS */}
                                                                            <div className="grid grid-cols-4 gap-2 relative z-10 mb-4">
                                                                                {[10, 20, 50, "MAX"].map((val, i) => {
                                                                                    const isSelected = val === 'MAX'
                                                                                        ? (betAmount === Math.floor(userCoins / 10) * 10 && userCoins >= 10 && betAmount > 0)
                                                                                        : betAmount === val;

                                                                                    return (
                                                                                        <motion.button
                                                                                            key={i}
                                                                                            whileTap={{ scale: 0.95 }}
                                                                                            onClick={() => {
                                                                                                const valNum = val === 'MAX' ? Math.max(10, Math.floor(userCoins / 10) * 10) : Number(val);
                                                                                                if (valNum <= userCoins || val === 'MAX') {
                                                                                                    setBetAmount(valNum);
                                                                                                    setBetType('fixed');
                                                                                                    safeGetTelegramWebApp()?.HapticFeedback?.impactOccurred(val === 'MAX' ? 'heavy' : 'light');
                                                                                                }
                                                                                            }}
                                                                                            disabled={val !== 'MAX' && typeof val === 'number' && val > userCoins}
                                                                                            className={cn(
                                                                                                "h-12 rounded-xl text-[11px] font-black transition-all border",
                                                                                                isSelected
                                                                                                    ? "bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20"
                                                                                                    : val === 'MAX'
                                                                                                        ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                                                                                                        : "bg-white dark:bg-white/5 border-transparent text-muted-foreground hover:bg-black/5 hover:text-foreground disabled:opacity-30"
                                                                                            )}
                                                                                        >
                                                                                            {val}
                                                                                        </motion.button>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            {/* 🛡️ INSURANCE TOGGLE */}
                                                                            <motion.div
                                                                                initial={{ opacity: 0, y: 5 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                className={cn(
                                                                                    "relative z-10 flex items-center justify-between p-3 rounded-2xl border transition-all duration-300",
                                                                                    hostInsuranceEnabled
                                                                                        ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                                                        : "bg-black/5 border-transparent"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={cn(
                                                                                        "p-2 rounded-xl transition-colors relative",
                                                                                        hostInsuranceEnabled ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground"
                                                                                    )}>
                                                                                        <Shield size={14} />
                                                                                        {hostInsuranceEnabled && (
                                                                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full border border-emerald-500 animate-pulse" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className="text-[10px] font-black uppercase tracking-wide text-foreground">Страховка</span>
                                                                                            {hostInsuranceEnabled && (
                                                                                                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter bg-emerald-500/10 px-1 rounded leading-none">Активна</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <span className="text-[9px] text-muted-foreground">Возврат {Math.round(COVERAGE_RATE * 100)}% при проигрыше</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="flex items-center gap-1 text-emerald-500">
                                                                                        <span className="text-[10px] font-bold">+{hostInsurancePremium}</span>
                                                                                        <Coins size={10} className="text-amber-500" />
                                                                                    </div>
                                                                                    <Switch
                                                                                        checked={hostInsuranceEnabled}
                                                                                        onCheckedChange={setHostInsuranceEnabled}
                                                                                        className="data-[state=checked]:bg-emerald-500 scale-75"
                                                                                    />
                                                                                </div>
                                                                            </motion.div>

                                                                            {/* 🎯 QUESTIONS COUNT */}
                                                                            <motion.div
                                                                                initial={{ opacity: 0, y: 5 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                className="relative z-10 flex items-center justify-between p-3 rounded-2xl border transition-all mt-2 bg-black/5 dark:bg-white/5 border-transparent"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-2 rounded-xl bg-white/50 dark:bg-black/50 text-muted-foreground border border-black/5 dark:border-white/5 shadow-sm">
                                                                                        <Target size={14} />
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-black uppercase tracking-wide text-foreground">Вопросы</span>
                                                                                        <span className="text-[9px] text-muted-foreground">Длина поединка</span>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-1 bg-white dark:bg-black/40 rounded-xl p-1 shadow-sm border border-black/5 dark:border-white/5">
                                                                                    <button
                                                                                        onClick={() => setNumQuestions(Math.max(5, numQuestions - 5))}
                                                                                        disabled={isCreating || numQuestions <= 5}
                                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-all active:scale-95 text-foreground"
                                                                                    >
                                                                                        <Minus size={12} />
                                                                                    </button>
                                                                                    <div className="w-8 text-center font-black text-sm tabular-nums text-foreground">
                                                                                        {numQuestions}
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => setNumQuestions(Math.min(30, numQuestions + 5))}
                                                                                        disabled={isCreating || numQuestions >= 30}
                                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-all active:scale-95 text-foreground"
                                                                                    >
                                                                                        <Plus size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            </motion.div>
                                                                        </motion.div>

                                                                        <LoadoutSelector />
                                                                    </div>

                                                                    <div className="space-y-4 pt-2">
                                                                        {/* Action buttons */}
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: 10 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            transition={{ delay: 0.8 }}
                                                                            className="w-full space-y-3"
                                                                        >
                                                                            {duelMode === 'random' && (
                                                                                <Button
                                                                                    size="lg"
                                                                                    onClick={() => handleActionClick(() => handleFindMatch())}
                                                                                    disabled={isFindingMatch || isCreating || (betType !== 'none' && betAmount <= 0) || (betAmount > 0 && hostTotalStake > userCoins)}
                                                                                    variant="outline"
                                                                                    className="w-full h-12 text-sm sm:text-base font-black rounded-2xl border-2 border-violet-500/50 hover:border-violet-500 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all duration-300 disabled:opacity-50 touch-manipulation relative overflow-hidden group"
                                                                                >
                                                                                    {/* Shine effect on hover */}
                                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                                                                    {isFindingMatch ? (
                                                                                        <>
                                                                                            <svg className="mr-2 h-4 w-4 animate-spin relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                            </svg>
                                                                                            <span className="hidden sm:inline relative z-10">Поиск соперника...</span>
                                                                                            <span className="sm:hidden relative z-10">Поиск...</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Search className="mr-2 h-4 w-4 relative z-10" />
                                                                                            <span className="relative z-10">
                                                                                                {rematchOpponent ? (
                                                                                                    betAmount > 0
                                                                                                        ? hostTotalStake > userCoins
                                                                                                            ? `Недостаточно: ${hostTotalStake}`
                                                                                                            : `Реванш за ${hostTotalStake}`
                                                                                                        : 'Начать реванш'
                                                                                                ) : (
                                                                                                    betAmount > 0
                                                                                                        ? hostTotalStake > userCoins
                                                                                                            ? `Недостаточно: ${hostTotalStake}`
                                                                                                            : `Найти игру за ${hostTotalStake}`
                                                                                                        : 'Найти игру'
                                                                                                )}
                                                                                            </span>
                                                                                            {betAmount > 0 && <Coins size={14} className={cn("ml-1.5 relative z-10", hostTotalStake > userCoins ? "text-zinc-500" : "text-amber-500")} />}
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                            )}

                                                                            {/* Create button */}
                                                                            {duelMode !== 'random' && (
                                                                                <Button
                                                                                    size="lg"
                                                                                    onClick={() => handleActionClick(() => handleInlineCreate())}
                                                                                    disabled={isCreating || isFindingMatch || (betType !== 'none' && betAmount <= 0) || (betAmount > 0 && hostTotalStake > userCoins)}
                                                                                    variant="outline"
                                                                                    className="w-full h-12 text-sm sm:text-base font-black rounded-2xl border-2 border-violet-500/50 hover:border-violet-500 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all duration-300 disabled:opacity-50 touch-manipulation relative overflow-hidden group"
                                                                                >
                                                                                    {isCreating ? (
                                                                                        <>
                                                                                            <svg className="mr-2 h-4 w-4 animate-spin relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                            </svg>
                                                                                            <span className="hidden sm:inline relative z-10">Создание...</span>
                                                                                            <span className="sm:hidden relative z-10">Создание</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Swords className="mr-2 h-4 w-4 relative z-10" />
                                                                                            <span className="hidden sm:inline relative z-10">
                                                                                                {betAmount > 0
                                                                                                    ? hostTotalStake > userCoins
                                                                                                        ? `Недостаточно: ${hostTotalStake}`
                                                                                                        : `Создать за ${hostTotalStake}`
                                                                                                    : 'Создать дуэль по коду'}
                                                                                            </span>
                                                                                            <span className="sm:hidden relative z-10">
                                                                                                {betAmount > 0
                                                                                                    ? hostTotalStake > userCoins
                                                                                                        ? `Нужно ${hostTotalStake}`
                                                                                                        : `За ${hostTotalStake}`
                                                                                                    : 'Создать'}
                                                                                            </span>
                                                                                            {betAmount > 0 && <Coins size={12} className={cn("ml-1 relative z-10", hostTotalStake > userCoins ? "text-zinc-500" : "text-amber-500")} />}
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                            )}
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
                                                                                    <Shield className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
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

                                                    {/* Join Duel Section — только в режиме 'friend' */}
                                                    {!createdCode && duelMode === 'friend' && (
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
                                                                                        <svg className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                        </svg>
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
                                                                                            {userCoins >= joinTotalRequired ? (
                                                                                                <span className="flex items-center gap-1.5 font-bold">
                                                                                                    <Coins size={14} className="text-amber-500" />
                                                                                                    <span>Дуэль со ставкой!</span>
                                                                                                </span>
                                                                                            ) : '⚠️ Недостаточно монет!'}
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
                                                                            className={cn(
                                                                                "p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4",
                                                                                joinInsuranceEnabled
                                                                                    ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                                                    : "bg-white/70 dark:bg-amber-950/30 border-amber-200/40 dark:border-amber-800/40"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={cn(
                                                                                    "p-2 rounded-xl transition-colors relative",
                                                                                    joinInsuranceEnabled ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                                                                                )}>
                                                                                    <Shield size={14} />
                                                                                    {joinInsuranceEnabled && (
                                                                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full border border-emerald-500 animate-pulse" />
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <p className="text-sm font-semibold text-foreground leading-none">Страховка</p>
                                                                                        {joinInsuranceEnabled && (
                                                                                            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter bg-emerald-500/10 px-1 rounded leading-none">Активна</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                                        +{joinInsurancePremiumValue} монет • возврат {Math.round(COVERAGE_RATE * 100)}%
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <Switch
                                                                                checked={joinInsuranceEnabled}
                                                                                onCheckedChange={(checked) => setJoinInsuranceEnabled(checked)}
                                                                                disabled={userCoins < joinTotalRequired}
                                                                                className="data-[state=checked]:bg-emerald-500 scale-75"
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
                                                                                    <svg className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                    </svg>
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
                                    )}
                                </AnimatePresence>

                                {/* How to Play Section */}
                                <div className="animate-fade-in-up [animation-delay:200ms] relative">
                                    <div className="absolute inset-x-0 -top-16 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                                    <div className="p-8 sm:p-12 bg-[#0b0d14] dark:bg-[#0b0d14] border border-white/[0.04] rounded-[32px] shadow-2xl relative overflow-hidden">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 sm:mb-12">
                                            <div className="space-y-3 text-left">
                                                <h3 className="text-3xl sm:text-4xl font-black flex items-center gap-3.5">
                                                    <Sparkles className="h-7 w-7 text-primary" />
                                                    <span className="text-white tracking-tight">
                                                        Как играть
                                                    </span>
                                                </h3>
                                                <p className="text-slate-400 text-sm sm:text-base font-medium max-w-md leading-relaxed">
                                                    Узнайте основные механики дуэлей и начните побеждать прямо сейчас
                                                </p>
                                            </div>

                                            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-[#161b26] rounded-full border border-white/5 h-fit">
                                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Multiplayer</span>
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                                            {[
                                                { icon: Swords, title: 'Создайте или присоединитесь', desc: 'Пригласите друга или введите секретный код дуэли для начала битвы', color: 'blue' },
                                                { icon: Zap, title: 'Отвечайте быстрее', desc: 'Чем быстрее ваш ответ, тем больше очков вы получаете', color: 'purple' },
                                                { icon: Target, title: 'Собирайте комбо', desc: 'Серия правильных ответов активирует множитель очков до x3', color: 'red' },
                                                { icon: Trophy, title: 'Побеждайте!', desc: 'Получайте награды и поднимайтесь в глобальном рейтинге', color: 'orange' },
                                            ].map((item, index) => {
                                                const Icon = item.icon;
                                                const colorClasses: Record<string, string> = {
                                                    blue: 'from-indigo-600 to-blue-500 shadow-indigo-500/20',
                                                    purple: 'from-purple-600 to-violet-500 shadow-purple-500/20',
                                                    red: 'from-rose-600 to-red-500 shadow-rose-500/20',
                                                    orange: 'from-amber-600 to-orange-500 shadow-amber-500/20'
                                                };

                                                return (
                                                    <div
                                                        key={index}
                                                        className="group/item flex items-center gap-5 p-5 rounded-[22px] bg-[#151921] border border-white/[0.02] hover:bg-[#1a202b] hover:border-white/[0.05] transition-all duration-300 cursor-default"
                                                    >
                                                        <div className={`flex-shrink-0 w-11 h-11 rounded-[14px] bg-gradient-to-br ${colorClasses[item.color]} flex items-center justify-center shadow-lg`}>
                                                            <Icon className="h-5 w-5 text-white" />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <h4 className="font-bold text-base text-white">
                                                                {item.title}
                                                            </h4>
                                                            <p className="text-[12px] text-slate-400 leading-snug">
                                                                {item.desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
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
                                onRematch={(isBotRematch, opponentData) => {
                                    console.log('[Duel] 🔄 Rematch initiated:', { isBotRematch, opponentData });
                                    duelResultSnapshotRef.current = null;

                                    setDuelId(null);
                                    setDuelCode(null);
                                    setCreatedCode(null);
                                    setJoinCode('');
                                    setSearchParams(new URLSearchParams());

                                    setRematchOpponent(opponentData);
                                    setRematchInsuranceEnabled(true); // По умолчанию страховка включена

                                    if (isBotRematch) {
                                        setDuelMode('random');
                                    } else {
                                        setDuelMode('friend');
                                    }

                                    // Показываем попап настройки реванша
                                    setShowRematchSetup(true);
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

                        {mode === 'finding' && (
                            <DuelFindingScreen
                                userName={userProfile.firstName}
                                userPhotoUrl={userProfile.photoUrl}
                                betAmount={betAmount}
                                questionCount={numQuestions}
                                insuranceEnabled={rematchOpponent ? rematchInsuranceEnabled : hostInsuranceEnabled}
                                onCancel={handleCancelDuel}
                                rematchOpponent={rematchOpponent}
                            />
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

                        {/* Попап настройки реванша */}
                        <AnimatePresence>
                            {showRematchSetup && rematchOpponent && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                                    onClick={() => {
                                        setShowRematchSetup(false);
                                        setMode('menu');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0.85, opacity: 0, y: 20 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 0.9, opacity: 0, y: 10 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                        className="relative w-full max-w-sm bg-background rounded-3xl border border-border/50 shadow-2xl overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Заголовок */}
                                        <div className="relative p-5 pb-4 bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-purple-600/20 border-b border-border/30">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-purple-500/5" />
                                            <div className="relative flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
                                                    <Swords className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-foreground">Реванш!</h3>
                                                    <p className="text-xs text-muted-foreground font-medium">
                                                        vs <span className="text-foreground font-bold">{rematchOpponent.name || 'Соперник'}</span>
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowRematchSetup(false);
                                                        setMode('menu');
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="ml-auto w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-5 space-y-4">
                                            {/* Условия дуэли */}
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/40">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Вопросов</span>
                                                    <span className="text-lg font-black text-foreground">{numQuestions}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 border border-border/40">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Ставка</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Coins className="w-4 h-4 text-amber-500" />
                                                        <span className="text-lg font-black text-amber-500">{betAmount > 0 ? betAmount : 'Нет'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Страховка */}
                                            {betAmount > 0 && (
                                                <motion.div
                                                    animate={{
                                                        borderColor: rematchInsuranceEnabled ? 'rgba(16, 185, 129, 0.5)' : 'rgba(var(--border), 0.4)',
                                                        backgroundColor: rematchInsuranceEnabled ? 'rgba(16, 185, 129, 0.07)' : 'rgba(var(--muted), 0.4)'
                                                    }}
                                                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                            rematchInsuranceEnabled ? "bg-emerald-500/20" : "bg-muted/60"
                                                        )}>
                                                            <Shield className={cn("w-4 h-4", rematchInsuranceEnabled ? "text-emerald-500" : "text-muted-foreground")} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">Страховка</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                +{getInsurancePremium(betAmount)} монет • возврат {Math.round(COVERAGE_RATE * 100)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={rematchInsuranceEnabled}
                                                        onCheckedChange={setRematchInsuranceEnabled}
                                                    />
                                                </motion.div>
                                            )}

                                            {/* Активная страховка индикатор */}
                                            {betAmount > 0 && rematchInsuranceEnabled && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1"
                                                >
                                                    <Shield className="w-3.5 h-3.5" />
                                                    <span>Страховка активна — ваш аватар будет в зелёной ауре</span>
                                                </motion.div>
                                            )}

                                            {/* Кнопки */}
                                            <div className="flex flex-col gap-2 pt-1">
                                                <Button
                                                    onClick={() => {
                                                        setShowRematchSetup(false);
                                                        setMode('menu');
                                                        handleFindMatch(false, rematchOpponent, rematchInsuranceEnabled);
                                                    }}
                                                    className="w-full h-12 text-base font-black rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-600 to-purple-600 hover:from-indigo-600 hover:via-blue-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 relative overflow-hidden group"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                    <Swords className="w-4 h-4 mr-2 relative z-10" />
                                                    <span className="relative z-10">В бой!</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setShowRematchSetup(false);
                                                        setRematchOpponent(null);
                                                        setMode('menu');
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="w-full h-10 text-sm font-medium text-muted-foreground hover:text-foreground rounded-2xl"
                                                >
                                                    Отмена
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </Layout >
            )
            }
        </>
    );
}
