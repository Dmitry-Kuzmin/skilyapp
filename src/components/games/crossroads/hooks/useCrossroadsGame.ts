import { useState, useCallback, useEffect, useMemo } from 'react';
import { GameState, Scenario, Vehicle, Difficulty } from '../types';
import { CROSSROADS_SCENARIOS } from '../scenarios';
import { sounds } from '@/lib/sounds';
import { haptics } from '@/lib/haptics';
import { useUserContext } from '@/contexts/UserContext';
import { dispatchUserEvent } from '@/lib/notification-events';

export const useCrossroadsGame = () => {
    const { profileId } = useUserContext();
    const [gameState, setGameState] = useState<GameState>({
        status: 'menu',
        currentScenarioIndex: 0,
        score: 0,
        combo: 0,
        correctAnswers: 0,
        totalAttempts: 0,
        elapsedTime: 0,
        history: []
    });

    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [clickedOrder, setClickedOrder] = useState<Map<string, number>>(new Map());
    const [showExplanation, setShowExplanation] = useState(false);
    const [showSkyHint, setShowSkyHint] = useState(false);
    const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);

    // Filtered and shuffled scenarios
    useEffect(() => {
        const shuffled = [...CROSSROADS_SCENARIOS].sort(() => Math.random() - 0.5);
        setScenarios(shuffled);
    }, []);

    const currentScenario = useMemo(() => {
        if (scenarios.length === 0) return null;
        return scenarios[gameState.currentScenarioIndex % scenarios.length];
    }, [scenarios, gameState.currentScenarioIndex]);

    const startGame = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            status: 'playing',
            currentScenarioIndex: 0,
            score: 0,
            combo: 0,
            correctAnswers: 0,
            totalAttempts: 0,
            elapsedTime: 0
        }));
        setClickedOrder(new Map());
        setShowExplanation(false);
        setShowSkyHint(false);
        setLastResult(null);
        sounds.notificationPop();
        haptics.buttonClick();
    }, []);

    const handleVehicleClick = useCallback((vehicleId: string) => {
        if (!currentScenario || gameState.status !== 'playing') return;

        const vehicle = currentScenario.vehicles.find(v => v.id === vehicleId);
        if (!vehicle || clickedOrder.has(vehicleId)) return;

        const nextOrder = clickedOrder.size + 1;
        const newClickedOrder = new Map(clickedOrder);
        newClickedOrder.set(vehicleId, nextOrder);
        setClickedOrder(newClickedOrder);

        sounds.notificationPop();
        haptics.buttonClick();

        if (newClickedOrder.size === currentScenario.vehicles.length) {
            // All vehicles clicked, check the order
            setTimeout(() => checkOrder(newClickedOrder), 600);
        }
    }, [currentScenario, gameState.status, clickedOrder]);

    const checkOrder = useCallback((finalOrder: Map<string, number>) => {
        if (!currentScenario) return;

        setGameState(prev => ({ ...prev, status: 'checking' }));

        let isAllCorrect = true;
        currentScenario.vehicles.forEach(vehicle => {
            if (finalOrder.get(vehicle.id) !== vehicle.correctOrder) {
                isAllCorrect = false;
            }
        });

        setLastResult(isAllCorrect ? 'correct' : 'incorrect');

        if (isAllCorrect) {
            sounds.correctAnswer();
            haptics.correctAnswer();

            // Начисление наград
            const points = Math.round(100 * (1 + (gameState.combo * 0.2)));
            if (profileId) {
                dispatchUserEvent(profileId, 'game_result', {
                    game_type: 'crossroads',
                    scenario_id: currentScenario.id,
                    score: points,
                    xp_earned: 50,
                    coins_earned: 5,
                    is_correct: true,
                    difficulty: currentScenario.difficulty
                });
            }

            setGameState(prev => ({
                ...prev,
                totalAttempts: prev.totalAttempts + 1,
                correctAnswers: prev.correctAnswers + 1,
                combo: prev.combo + 1,
                score: prev.score + points
            }));
        } else {
            setGameState(prev => ({
                ...prev,
                totalAttempts: prev.totalAttempts + 1,
                combo: 0
            }));
            sounds.wrongAnswer();
            haptics.wrongAnswer();
        }

        setShowExplanation(true);
    }, [currentScenario, gameState.combo, profileId]);

    const nextLevel = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            status: 'playing',
            currentScenarioIndex: prev.currentScenarioIndex + 1
        }));
        setClickedOrder(new Map());
        setShowExplanation(false);
        setShowSkyHint(false);
        setLastResult(null);
    }, []);

    const toggleSkyHint = useCallback(() => {
        setShowSkyHint(prev => !prev);
        if (!showSkyHint) {
            sounds.notificationPop();
        }
    }, [showSkyHint]);

    return {
        gameState,
        currentScenario,
        clickedOrder,
        showExplanation,
        showSkyHint,
        toggleSkyHint,
        lastResult,
        handleVehicleClick,
        startGame,
        nextLevel,
        restartCurrent
    };
};
