// Blitz Mode Demo для лендинга
// Показывает таймер и один вопрос в синем неоновом стиле

import React, { useState, useEffect } from 'react';
import { DEMO_QUESTIONS } from './demoQuestions';
import { Clock, Zap } from 'lucide-react';

interface LandingBlitzDemoProps {
    language: 'ru' | 'en';
}

export const LandingBlitzDemo: React.FC<LandingBlitzDemoProps> = ({ language }) => {
    const [timeLeft, setTimeLeft] = useState(5);
    const [currentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);

    const currentQuestion = DEMO_QUESTIONS[currentQuestionIndex];
    const isRussian = language === 'ru';

    // Таймер обратного отсчёта
    useEffect(() => {
        if (timeLeft > 0 && !showFeedback) {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !showFeedback) {
            // Время вышло - автоматически выбираем неправильный ответ
            setShowFeedback(true);
            setTimeout(() => {
                setTimeLeft(5);
                setSelectedAnswer(null);
                setShowFeedback(false);
            }, 2000);
        }
    }, [timeLeft, showFeedback]);

    const handleAnswer = (answerIndex: number) => {
        if (selectedAnswer !== null || showFeedback) return;

        setSelectedAnswer(answerIndex);
        setShowFeedback(true);

        setTimeout(() => {
            setTimeLeft(5);
            setSelectedAnswer(null);
            setShowFeedback(false);
        }, 2000);
    };

    const isCorrect = selectedAnswer === currentQuestion.correctIndex;

    return (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950 via-slate-900 to-blue-950 flex flex-col relative overflow-hidden">
            {/* Neon glow effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none"></div>

            {/* Header with timer */}
            <div className="pt-12 px-6 z-10">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/50 mb-4">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-black text-cyan-400 uppercase tracking-wider">
                            {isRussian ? 'Блиц-раунд' : 'Blitz Round'}
                        </span>
                    </div>

                    {/* Giant Timer */}
                    <div className="relative inline-block">
                        <div className={`text-7xl font-black transition-all duration-300 ${timeLeft <= 2 ? 'text-red-400 animate-pulse scale-110' : 'text-cyan-400'
                            }`}>
                            00:0{timeLeft}
                        </div>
                        <div className={`absolute inset-0 blur-2xl opacity-50 ${timeLeft <= 2 ? 'bg-red-500' : 'bg-cyan-500'
                            }`}></div>
                    </div>
                </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 z-10">
                {/* Question Card */}
                <div className="w-full bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    {/* Декоративная иконка знака */}
                    <div className="absolute -right-2 -top-2 text-4xl opacity-20 rotate-12">
                        {currentQuestion.signIcon}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{currentQuestion.signIcon}</span>
                        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                            {isRussian ? 'Вопрос' : 'Question'} 1/1
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
                            buttonClass += " bg-slate-800 border border-cyan-500/20 text-white hover:bg-cyan-900/50 hover:border-cyan-500/50 hover:scale-105 active:scale-95";
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
};
