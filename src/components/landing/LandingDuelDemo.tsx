// Легковесная демо-дуэль для лендинга
// Ленивая загрузка + CSS-only анимации = 0 влияния на производительность

import React, { useState } from 'react';
import { DEMO_QUESTIONS, DemoQuestion } from './demoQuestions';
import { Zap, Trophy, Target, Coins, Sparkles } from 'lucide-react';
import { playClickSound } from '@/services/audioService';

type GamePhase = 'betting' | 'loading' | 'question' | 'result' | 'victory';

interface LandingDuelDemoProps {
    language: 'ru' | 'en';
    onModeChange?: (mode: 'pvp' | 'blitz') => void;
    onDemoInteraction?: (action: string) => void;
    onWinPotChange?: (amount: number) => void;
    onXpGain?: (xp: number) => void;
}

export const LandingDuelDemo: React.FC<LandingDuelDemoProps> = ({ language, onDemoInteraction, onWinPotChange, onXpGain }) => {
    const [phase, setPhase] = useState<GamePhase>('betting');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [playerScore, setPlayerScore] = useState(0);
    const [botScore, setBotScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [playerCoins, setPlayerCoins] = useState(500); // Динамический баланс
    const [betAmount, setBetAmount] = useState(100);
    const [usedBoost, setUsedBoost] = useState(false);
    const [lastResult, setLastResult] = useState<'win' | 'lose' | 'draw' | null>(null);
    const [showCorrectFlash, setShowCorrectFlash] = useState(false); // Эффект вспышки при правильном ответе

    const currentQuestion = DEMO_QUESTIONS[currentQuestionIndex];
    const isRussian = language === 'ru';

    const BET_OPTIONS = [50, 100, 200];

    const startGame = () => {
        playClickSound();
        onDemoInteraction?.('game_started');
        onDemoInteraction?.(`bet_amount_${betAmount}`);
        setPhase('loading');
        setTimeout(() => setPhase('question'), 1500);
    };

    const handleAnswer = (answerIndex: number) => {
        if (selectedAnswer !== null || showFeedback) return;

        // Звук клика
        playClickSound();
        onDemoInteraction?.('answer_clicked');

        setSelectedAnswer(answerIndex);
        setShowFeedback(true);

        const isCorrect = answerIndex === currentQuestion.correctIndex;

        // Звук и эффект правильно/неправильно
        setTimeout(() => {
            if (isCorrect) {
                playClickSound();
                onDemoInteraction?.('correct_answer');
                setPlayerScore(prev => prev + 1);
                // Показываем вспышку при правильном ответе
                setShowCorrectFlash(true);
                setTimeout(() => setShowCorrectFlash(false), 800);
                // Обновляем XP плашку (+25 XP за правильный ответ)
                onXpGain?.(25);
            } else {
                onDemoInteraction?.('wrong_answer');
            }
        }, 100);

        // Бот отвечает (50% шанс правильно)
        setTimeout(() => {
            const botAnswers = Math.random() > 0.5;
            if (botAnswers) {
                setBotScore(prev => prev + 1);
            }

            // Следующий вопрос или финал
            setTimeout(() => {
                if (currentQuestionIndex < 2) {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setSelectedAnswer(null);
                    setShowFeedback(false);
                } else {
                    // Определяем результат и обновляем баланс
                    const finalPlayerScore = playerScore + (isCorrect ? 1 : 0);
                    const finalBotScore = botScore + (Math.random() > 0.5 ? 1 : 0);

                    if (finalPlayerScore > finalBotScore) {
                        setPlayerCoins(prev => prev + betAmount);
                        setLastResult('win');
                    } else if (finalPlayerScore < finalBotScore) {
                        setPlayerCoins(prev => Math.max(50, prev - betAmount)); // Минимум 50 монет
                        setLastResult('lose');
                    } else {
                        setLastResult('draw');
                    }

                    setPhase('victory');
                    onDemoInteraction?.('game_completed');
                    // Автоперезапуск через 5 секунд
                    setTimeout(() => {
                        resetGame();
                    }, 5000);
                }
            }, 1500);
        }, 800);
    };

    const resetGame = () => {
        setPhase('betting');
        setCurrentQuestionIndex(0);
        setPlayerScore(0);
        setBotScore(0);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setUsedBoost(false);
        setLastResult(null);
        setShowCorrectFlash(false);
    };

    const applyBoost = () => {
        if (!usedBoost && phase === 'betting') {
            playClickSound();
            onDemoInteraction?.('boost_selected');
            setUsedBoost(true);
        }
    };

    const selectBet = (amount: number) => {
        playClickSound();
        setBetAmount(amount);
        onDemoInteraction?.(`bet_selected_${amount}`);
        // Обновляем Win Pot плашку
        onWinPotChange?.(amount * 2);
    };

    // === BETTING SCREEN ===
    if (phase === 'betting') {
        return (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
                {/* Title */}
                <div className="text-center mb-4">
                    <div className="text-[11px] font-bold text-orange-400 uppercase tracking-widest mb-1">
                        {isRussian ? '🎮 Демо-дуэль' : '🎮 Demo Duel'}
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">
                        {isRussian ? 'Вызов бота' : 'Challenge Bot'}
                    </h3>
                    <p className="text-sm font-semibold text-slate-300">
                        {isRussian ? '3 вопроса • Кто быстрее' : '3 questions • Who is faster'}
                    </p>
                </div>

                {/* Balance with last result */}
                <div className={`w-full max-w-xs rounded-xl p-3 mb-4 border transition-all ${lastResult === 'win' ? 'bg-green-500/10 border-green-500/30' :
                    lastResult === 'lose' ? 'bg-red-500/10 border-red-500/30' :
                        'bg-slate-800/30 border-white/5'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{isRussian ? 'Баланс' : 'Balance'}</span>
                            {lastResult === 'win' && <span className="text-[10px] font-bold text-green-400 animate-pulse">↑</span>}
                            {lastResult === 'lose' && <span className="text-[10px] font-bold text-red-400">↓</span>}
                        </div>
                        <span className={`text-lg font-black transition-all ${lastResult === 'win' ? 'text-green-400 animate-pulse' :
                            lastResult === 'lose' ? 'text-red-400' :
                                'text-white'
                            }`}>{playerCoins} <Coins className="w-4 h-4 inline text-yellow-500" /></span>
                    </div>
                    {lastResult && (
                        <div className="mt-1 text-[9px] text-center">
                            {lastResult === 'win' && <span className="text-green-400">{isRussian ? '🎉 Выиграли!' : '🎉 You won!'}</span>}
                            {lastResult === 'lose' && <span className="text-red-400">{isRussian ? '💪 Попробуй ещё!' : '💪 Try again!'}</span>}
                            {lastResult === 'draw' && <span className="text-slate-400">{isRussian ? '🤝 Ничья' : '🤝 Draw'}</span>}
                        </div>
                    )}
                </div>

                {/* Bet Selection */}
                <div className="w-full max-w-xs mb-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                        {isRussian ? 'Выберите ставку' : 'Choose your bet'}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {BET_OPTIONS.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => selectBet(amount)}
                                className={`py-3 rounded-xl font-black text-center transition-all relative overflow-hidden ${betAmount === amount
                                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-[0_0_25px_rgba(249,115,22,0.5)] scale-105 ring-2 ring-orange-400/50'
                                    : 'bg-slate-800/50 border border-white/10 text-slate-400 hover:border-orange-500/30 hover:text-white hover:scale-105'
                                    }`}
                            >
                                {/* Active glow effect */}
                                {betAmount === amount && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-300/30 to-orange-400/0 animate-[shimmer_2s_infinite]"></div>
                                )}
                                <div className="text-lg relative z-10">{amount}</div>
                                <div className="text-[8px] opacity-70 relative z-10"><Coins className="w-3 h-3 inline text-yellow-500" /></div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Boost Selection */}
                <div className="w-full max-w-xs mb-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">
                        {isRussian ? 'Усиление' : 'Boost'}
                    </div>
                    <button
                        onClick={applyBoost}
                        className={`w-full p-3 rounded-xl border transition-all ${usedBoost
                            ? 'bg-orange-500/20 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                            : 'bg-slate-800/50 border-white/10 hover:border-orange-500/30'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                                <Zap className="text-white" size={18} />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-xs font-black text-white">
                                    {isRussian ? '🛢️ Заливка маслом' : '🛢️ Oil Spill'}
                                </div>
                                <div className="text-[9px] text-slate-400">
                                    {isRussian ? 'Замедляет бота' : 'Slows bot down'}
                                </div>
                            </div>
                            {usedBoost && <div className="text-green-400 text-sm font-bold">✓</div>}
                        </div>
                    </button>
                </div>

                {/* Start Button */}
                <button
                    onClick={startGame}
                    className="w-full max-w-xs py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-center shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:scale-105 active:scale-95 transition-all mb-2"
                >
                    {isRussian ? '🚀 Начать дуэль' : '🚀 Start Duel'}
                </button>

                {/* Potential Win - более заметный */}
                <div className="mb-2 text-center bg-slate-800/30 rounded-lg px-4 py-2 border border-yellow-500/20">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{isRussian ? 'Потенциальный выигрыш' : 'Potential win'}</div>
                    <div className="text-lg font-black text-yellow-400 flex items-center justify-center gap-1.5">
                        +{betAmount * 2} <Coins className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="text-[9px] text-slate-600 text-center max-w-xs">
                    {isRussian ? '💡 Демо-режим. Монеты не списываются.' : '💡 Demo mode. Coins are not deducted.'}
                </div>
            </div>
        );
    }

    // === LOADING SCREEN ===
    if (phase === 'loading') {
        return (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-orange-500 animate-spin"></div>
                    <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" size={32} />
                </div>
                <div className="mt-6 text-white font-bold text-sm">
                    {isRussian ? 'Подбираем соперника...' : 'Finding opponent...'}
                </div>
                {usedBoost && (
                    <div className="mt-4 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold animate-pulse">
                        {isRussian ? '🛢️ Бот получил масло на трассе!' : '🛢️ Bot hit oil on track!'}
                    </div>
                )}
            </div>
        );
    }

    // === QUESTION SCREEN ===
    if (phase === 'question') {
        const isCorrect = selectedAnswer === currentQuestion.correctIndex;
        const isWrong = selectedAnswer !== null && !isCorrect;

        return (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col relative overflow-hidden">
                {/* Flash Effect при правильном ответе */}
                {showCorrectFlash && (
                    <div className="absolute inset-0 z-50 pointer-events-none animate-[fadeIn_0.1s_ease-out]">
                        <div className="absolute inset-0 bg-gradient-to-b from-green-500/40 via-green-400/20 to-transparent animate-pulse"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <Sparkles className="w-16 h-16 text-green-400 animate-bounce drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]" />
                        </div>
                    </div>
                )}
                {/* HUD */}
                <div className="pt-12 px-6 flex items-center justify-between z-10">
                    <div className="flex flex-col gap-1">
                        <div className="text-[8px] font-bold text-orange-500/80 uppercase tracking-tighter">
                            {isRussian ? 'Вы' : 'You'}: {playerScore}
                        </div>
                        <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                            <div
                                className="h-full bg-orange-500 shadow-[0_0_15px_#f97316] transition-all duration-500"
                                style={{ width: `${(playerScore / 3) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="text-white font-black italic tracking-tighter text-xl scale-y-125">VS</div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[8px] font-bold text-red-500/80 uppercase tracking-tighter">
                            {isRussian ? 'Бот' : 'Bot'}: {botScore}
                        </div>
                        <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                            <div
                                className="h-full bg-red-500 shadow-[0_0_15px_#ef4444] transition-all duration-500"
                                style={{ width: `${(botScore / 3) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
                    {/* Question Card */}
                    <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
                        {/* Декоративная иконка знака */}
                        <div className="absolute -right-2 -top-2 text-4xl opacity-20 rotate-12">
                            {currentQuestion.signIcon}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{currentQuestion.signIcon}</span>
                            <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                                {isRussian ? 'Вопрос' : 'Question'} {currentQuestionIndex + 1}/3
                            </div>
                        </div>
                        <div className="text-sm text-white font-medium leading-relaxed">
                            {isRussian ? currentQuestion.text : currentQuestion.textEn}
                        </div>
                    </div>

                    {/* Answer Buttons */}
                    <div className="w-full space-y-3">
                        {(isRussian ? currentQuestion.answers : currentQuestion.answersEn).map((answer, index) => {
                            const isSelected = selectedAnswer === index;
                            const isThisCorrect = index === currentQuestion.correctIndex;

                            let buttonClass = "w-full py-4 rounded-xl font-black text-center transition-all duration-300 relative overflow-hidden";

                            if (showFeedback) {
                                if (isThisCorrect) {
                                    buttonClass += " bg-green-500 text-white shadow-[0_0_25px_rgba(34,197,94,0.6)] scale-105 border-2 border-green-300";
                                } else if (isSelected) {
                                    buttonClass += " bg-red-500/80 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-shake opacity-70";
                                } else {
                                    buttonClass += " bg-slate-800/50 border border-white/5 text-slate-600 opacity-40";
                                }
                            } else {
                                buttonClass += " bg-slate-800 border border-white/10 text-white hover:bg-slate-700 hover:scale-105 active:scale-95";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswer(index)}
                                    disabled={showFeedback}
                                    className={buttonClass}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        {showFeedback && isThisCorrect && (
                                            <span className="text-xl animate-bounce">✓</span>
                                        )}
                                        {showFeedback && isSelected && !isThisCorrect && (
                                            <span className="text-xl">✗</span>
                                        )}
                                        {answer}
                                    </span>
                                    {/* Glow effect for correct answer */}
                                    {showFeedback && isThisCorrect && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-300/30 to-green-400/0 animate-[shimmer_1s_infinite]"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // === VICTORY SCREEN ===
    if (phase === 'victory') {
        const playerWon = playerScore > botScore;
        const isDraw = playerScore === botScore;
        const prize = playerWon ? betAmount * 2 : 0;

        return (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6">
                {/* Результат */}
                <div className="text-center mb-6">
                    {playerWon && (
                        <>
                            <div className="relative mb-4">
                                <Trophy className="w-20 h-20 text-yellow-400 mx-auto animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
                                <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full"></div>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2 drop-shadow-lg">
                                {isRussian ? '🏆 Победа!' : '🏆 Victory!'}
                            </h3>
                            <div className="text-3xl font-black text-yellow-400 mb-2 animate-pulse flex items-center justify-center gap-2">+{prize} <Coins className="w-6 h-6 text-yellow-500" /></div>
                            <p className="text-sm text-slate-400 mb-1">
                                {isRussian ? `Счёт: ${playerScore}-${botScore}` : `Score: ${playerScore}-${botScore}`}
                            </p>
                            <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">
                                {isRussian ? 'Ты готов к экзамену!' : 'You are exam ready!'}
                            </p>
                        </>
                    )}
                    {isDraw && (
                        <>
                            <div className="text-5xl mb-4">🤝</div>
                            <h3 className="text-2xl font-black text-white mb-2">
                                {isRussian ? 'Ничья!' : 'Draw!'}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {isRussian ? `Счёт: ${playerScore}-${botScore}` : `Score: ${playerScore}-${botScore}`}
                            </p>
                        </>
                    )}
                    {!playerWon && !isDraw && (
                        <>
                            <div className="text-5xl mb-4 animate-pulse">💪</div>
                            <h3 className="text-2xl font-black text-white mb-2">
                                {isRussian ? 'Почти!' : 'Almost!'}
                            </h3>
                            <p className="text-sm text-slate-400 mb-1">
                                {isRussian ? `Счёт: ${playerScore}-${botScore}` : `Score: ${playerScore}-${botScore}`}
                            </p>
                            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                                {isRussian ? 'Практика делает мастера!' : 'Practice makes perfect!'}
                            </p>
                        </>
                    )}
                </div>

                {/* Кнопка "Попробовать снова" */}
                <button
                    onClick={() => {
                        playClickSound();
                        onDemoInteraction?.('retry_clicked');
                        resetGame();
                    }}
                    className="w-full max-w-xs py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-center shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:scale-105 active:scale-95 transition-all mb-4"
                >
                    {isRussian ? '🔄 Попробовать снова' : '🔄 Try Again'}
                </button>

                <div className="text-[10px] text-slate-600">
                    {isRussian ? 'или подожди 5 сек...' : 'or wait 5 sec...'}
                </div>
            </div>
        );
    }

    return null;
};
