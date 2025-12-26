import { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePDDContext } from '@/contexts/PDDContext';
import { useTicketsStatus } from '@/hooks/useTicketsStatus';
import { usePDDTickets } from '@/hooks/usePDDTickets';
import { useChallengeBankCount } from '@/hooks/useChallengeBankCount';
import { getAllTestProgress, TestProgress } from '@/utils/testStorage';
import {
    AlertCircle,
    Play,
    Sparkles,
    RotateCcw,
    Clock,
    ArrowRight
} from 'lucide-react';

export type RecommendationType = 'correction' | 'resume' | 'progress' | 'onboarding';

export interface Recommendation {
    type: RecommendationType;
    title: string;
    subtitle: string;
    buttonText: string;
    route: string;
    theme: 'warning' | 'info' | 'primary';
    icon: any;
    data?: any;
}

/**
 * Хук "Умный Инструктор" для Dashboard / Тестов
 * Определяет наилучшее следующее действие для пользователя на основе его прогресса
 */
export function useSmartRecommendation(profileId: string | null) {
    const { t } = useLanguage();
    const { selectedCountry, selectedCategory } = usePDDContext();
    const ticketsStatus = useTicketsStatus(profileId, selectedCountry, selectedCategory);
    const { data: tickets = [] } = usePDDTickets(selectedCountry);
    const { data: mistakesCount = 0 } = useChallengeBankCount(profileId, selectedCountry, selectedCategory);
    const [activeSessions, setActiveSessions] = useState<TestProgress[]>([]);

    // Загружаем активные сессии из локального хранилища
    useEffect(() => {
        async function loadSessions() {
            const sessions = await getAllTestProgress();
            setActiveSessions(sessions);
        }
        loadSessions();
    }, []);

    const recommendation = useMemo((): Recommendation => {
        // 1. CORRECTION MODE (Critical)
        // Если есть ошибки в банке ошибок
        if (mistakesCount >= 5) {
            return {
                type: 'correction',
                title: t('smartMentor.correctionTitle') || 'Работа над ошибками',
                subtitle: t('smartMentor.correctionSubtitle', { count: mistakesCount }) || `У тебя ${mistakesCount} ошибок. Закрой их, чтобы двигаться дальше.`,
                buttonText: t('smartMentor.correctionButton') || 'Разобрать ошибки',
                route: `/test/challenge-bank${selectedCountry === 'russia' ? '?country=russia' : ''}`,
                theme: 'warning',
                icon: AlertCircle,
                data: { count: mistakesCount }
            };
        }

        // 2. RESUME MODE (High)
        // Если есть незаконченная сессия в IndexedDB
        // Берем самую свежую сессию
        const latestActiveSession = [...activeSessions]
            .sort((a, b) => b.lastUpdated - a.lastUpdated)[0];

        if (latestActiveSession && latestActiveSession.currentIndex > 0) {
            const isTicket = latestActiveSession.testId.includes('ticket-');
            const ticketNum = isTicket ? latestActiveSession.testId.split('-')[1] : null;

            return {
                type: 'resume',
                title: t('smartMentor.resumeTitle') || 'Продолжить обучение',
                subtitle: ticketNum
                    ? t('smartMentor.resumeTicketSubtitle', { num: ticketNum, question: latestActiveSession.currentIndex + 1 }) || `Ты остановился на вопросе ${latestActiveSession.currentIndex + 1} в Билете ${ticketNum}.`
                    : t('smartMentor.resumeGenericSubtitle') || `У тебя есть незавершенный тест. Продолжим?`,
                buttonText: t('smartMentor.resumeButton') || 'Продолжить',
                route: `/test/practice?id=${latestActiveSession.testId}&mode=${latestActiveSession.mode}`,
                theme: 'info',
                icon: Clock,
                data: { session: latestActiveSession }
            };
        }

        // Также проверяем "в процессе" из ticketsStatus (если нет локальной сессии)
        if (tickets.length > 0) {
            const ticketsWithStatus = tickets.map(t => {
                const status = ticketsStatus[t.number.toString()];
                return {
                    ...t,
                    completed: status?.completed || false,
                    progress: status ? Math.round((status.answered / status.total) * 100) : 0,
                };
            });

            const inProgress = [...ticketsWithStatus].filter(t => !t.completed && t.progress > 0)
                .sort((a, b) => b.progress - a.progress)[0];

            if (inProgress) {
                return {
                    type: 'resume',
                    title: t('smartMentor.resumeTitle') || 'Продолжить обучение',
                    subtitle: t('smartMentor.resumeProgressSubtitle', { num: inProgress.number, percent: inProgress.progress }) || `Билет №${inProgress.number} пройден на ${inProgress.progress}%. Давай закончим его!`,
                    buttonText: t('smartMentor.resumeButton') || 'Продолжить',
                    route: selectedCountry === 'russia'
                        ? `/learn/russia/ticket/${inProgress.number}`
                        : `/test/practice?topic=${inProgress.number}`,
                    theme: 'info',
                    icon: Clock,
                    data: { ticket: inProgress }
                };
            }
        }

        // 3. PROGRESS MODE (Normal)
        if (tickets.length > 0) {
            const ticketsWithStatus = tickets.map(t => {
                const status = ticketsStatus[t.number.toString()];
                return {
                    ...t,
                    completed: status?.completed || false,
                    progress: status ? Math.round((status.answered / status.total) * 100) : 0,
                };
            });

            // Ищем первый не начатый билет после последнего завершенного
            const lastCompletedIndex = ticketsWithStatus.map(t => t.completed).lastIndexOf(true);
            const nextTicket = lastCompletedIndex === -1
                ? ticketsWithStatus[0]
                : ticketsWithStatus[lastCompletedIndex + 1] || null;

            if (nextTicket && !nextTicket.completed) {
                return {
                    type: 'progress',
                    title: selectedCountry === 'russia'
                        ? (t('smartMentor.ticketTitle', { num: nextTicket.number }) || `Билет №${nextTicket.number}`)
                        : (t('smartMentor.topicTitle', { num: nextTicket.number }) || `Тема №${nextTicket.number}`),
                    subtitle: lastCompletedIndex === -1
                        ? (t('smartMentor.startSubtitle') || 'Начни подготовку с первого билета.')
                        : (t('smartMentor.nextSubtitle') || 'Отличный темп! Переходим к следующей теме.'),
                    buttonText: lastCompletedIndex === -1
                        ? (t('smartMentor.startButtonText', { num: nextTicket.number }) || `Начать обучение`)
                        : (t('smartMentor.nextButtonText') || 'Продолжить путь'),
                    route: selectedCountry === 'russia'
                        ? `/learn/russia/ticket/${nextTicket.number}`
                        : `/test/practice?topic=${nextTicket.id}`,
                    theme: 'primary',
                    icon: Play,
                    data: { ticket: nextTicket }
                };
            }

            // Если все билеты решены
            if (lastCompletedIndex === ticketsWithStatus.length - 1) {
                return {
                    type: 'progress',
                    title: selectedCountry === 'russia' ? 'Экзамен ГИБДД' : 'Examen DGT',
                    subtitle: t('smartMentor.examSubtitle') || 'Вы изучили все билеты! Самое время проверить себя в условиях реального экзамена.',
                    buttonText: t('smartMentor.examButton') || 'Начать экзамен',
                    route: selectedCountry === 'russia' ? '/test/exam-russia' : '/test/exam',
                    theme: 'primary',
                    icon: Sparkles
                };
            }
        }

        // 4. ONBOARDING MODE (Default)
        return {
            type: 'onboarding',
            title: t('smartMentor.onboardingTitle') || 'Твой первый шаг',
            subtitle: t('smartMentor.onboardingSubtitle') || 'Начни подготовку к экзаменам ПДД прямо сейчас.',
            buttonText: t('smartMentor.onboardingButton') || 'Начать обучение',
            route: selectedCountry === 'russia' ? '/learn/russia/ticket/1' : '/test/practice?count=30',
            theme: 'primary',
            icon: Play
        };
    }, [profileId, selectedCountry, ticketsStatus, tickets, mistakesCount, activeSessions, t]);

    return recommendation;
}
