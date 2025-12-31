/**
 * Interactive Quiz Preview - "Try before you buy"
 * 
 * Интерактивный тест прямо на лендинге с AI объяснением.
 * Зацепляет пользователя показом реального функционала.
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Sparkles, ArrowRight, Brain } from 'lucide-react';
import { playClickSound } from '@/services/audioService';

interface QuizPreviewProps {
    onRegisterClick: () => void;
    language: 'ru' | 'es' | 'en';
}

// Примеры вопросов для каждого языка
const DEMO_QUESTIONS = {
    ru: {
        question: "На перекрестке с круговым движением, кто имеет преимущество?",
        image: "/demo-question-roundabout.jpg", // TODO: добавить реальное изображение
        options: [
            "Водители, уже находящиеся на круге",
            "Водители, въезжающие на круг справа",
            "Всегда тот, кто первым подъехал"
        ],
        correctIndex: 0,
        aiExplanation: {
            correct: "🎯 Правильно! В Испании действует правило приоритета для тех, кто УЖЕ на круге. Это одно из ключевых отличий от правил в России.",
            wrong: "❌ Ошибка! В Испании приоритет всегда у тех, кто УЖЕ движется по кругу. В России часто бывает наоборот — приоритет справа. Это одна из самых частых ошибок экспатов на экзамене DGT."
        }
    },
    es: {
        question: "En una rotonda, ¿quién tiene prioridad?",
        image: "/demo-question-roundabout.jpg",
        options: [
            "Los vehículos que ya están en la rotonda",
            "Los vehículos que incorporan por la derecha",
            "Siempre el que llegue primero"
        ],
        correctIndex: 0,
        aiExplanation: {
            correct: "🎯 ¡Correcto! En España, los vehículos que ya circulan dentro de la rotonda tienen siempre la prioridad.",
            wrong: "❌ Error! En las rotondas españolas, la prioridad es siempre para los que YA están circulando dentro. Esta es una de las preguntas más comunes en el examen DGT."
        }
    },
    en: {
        question: "At a roundabout, who has priority?",
        image: "/demo-question-roundabout.jpg",
        options: [
            "Vehicles already on the roundabout",
            "Vehicles entering from the right",
            "Always whoever arrives first"
        ],
        correctIndex: 0,
        aiExplanation: {
            correct: "🎯 Correct! In Spain, vehicles already circulating on the roundabout always have priority.",
            wrong: "❌ Wrong! In Spanish roundabouts, priority always goes to those ALREADY circulating. This is one of the most common mistakes on the DGT exam."
        }
    }
};

export const InteractiveQuizPreview: React.FC<QuizPreviewProps> = ({ onRegisterClick, language }) => {
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [showAI, setShowAI] = useState(false);

    const demo = DEMO_QUESTIONS[language];
    const isCorrect = selectedAnswer === demo.correctIndex;

    const handleAnswerClick = (index: number) => {
        if (showResult) return; // Уже ответили

        playClickSound();
        setSelectedAnswer(index);
        setShowResult(true);

        // Показываем AI объяснение через 800ms
        setTimeout(() => {
            setShowAI(true);
        }, 800);
    };

    const handleTryAgain = () => {
        playClickSound();
        setSelectedAnswer(null);
        setShowResult(false);
        setShowAI(false);
    };

    const getCopy = () => {
        const copies = {
            ru: {
                badge: "Попробуй прямо сейчас",
                title: "Один вопрос может изменить всё",
                subtitle: "Проверь себя на реальном вопросе DGT. Без регистрации.",
                tryAgain: "Попробовать еще раз",
                wantMore: "Хочешь больше вопросов?",
                register: "Начать обучение бесплатно",
                aiSays: "Skily AI объясняет:",
            },
            es: {
                badge: "Prueba ahora mismo",
                title: "Una pregunta puede cambiarlo todo",
                subtitle: "Ponte a prueba con una pregunta real del DGT. Sin registro.",
                tryAgain: "Intentar de nuevo",
                wantMore: "¿Quieres más preguntas?",
                register: "Empezar gratis",
                aiSays: "Skily AI explica:",
            },
            en: {
                badge: "Try it right now",
                title: "One question can change everything",
                subtitle: "Test yourself with a real DGT question. No registration needed.",
                tryAgain: "Try again",
                wantMore: "Want more questions?",
                register: "Start learning free",
                aiSays: "Skily AI explains:",
            }
        };
        return copies[language];
    };

    const copy = getCopy();

    return (
        <div className="relative rounded-[2.5rem] border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl p-8 md:p-12 overflow-hidden">
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50"></div>

            {/* Badge */}
            <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles className="w-3 h-3" />
                {copy.badge}
            </div>

            {/* Title */}
            <div className="relative z-10 mb-8">
                <h3 className="text-3xl md:text-4xl font-black text-white mb-3">
                    {copy.title}
                </h3>
                <p className="text-slate-400 text-lg">
                    {copy.subtitle}
                </p>
            </div>

            {/* Question */}
            <div className="relative z-10 space-y-6">
                <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800">
                    <p className="text-white text-lg font-semibold mb-6">
                        {demo.question}
                    </p>

                    {/* Options */}
                    <div className="space-y-3">
                        {demo.options.map((option, index) => {
                            const isSelected = selectedAnswer === index;
                            const isCorrectOption = index === demo.correctIndex;
                            const showCorrect = showResult && isCorrectOption;
                            const showWrong = showResult && isSelected && !isCorrectOption;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerClick(index)}
                                    disabled={showResult}
                                    className={`
                    w-full text-left px-6 py-4 rounded-xl border-2 transition-all duration-300 font-medium
                    ${!showResult && !isSelected && 'border-slate-700 bg-slate-900/50 hover:border-blue-500/50 hover:bg-blue-500/5'}
                    ${!showResult && isSelected && 'border-blue-500 bg-blue-500/10'}
                    ${showCorrect && 'border-green-500 bg-green-500/10 animate-pulse'}
                    ${showWrong && 'border-red-500 bg-red-500/10'}
                    ${showResult && 'cursor-default'}
                  `}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`
                      ${!showResult && 'text-slate-300'}
                      ${showCorrect && 'text-green-400'}
                      ${showWrong && 'text-red-400'}
                    `}>
                                            {option}
                                        </span>

                                        {showCorrect && (
                                            <CheckCircle2 className="w-6 h-6 text-green-400 animate-in zoom-in" />
                                        )}
                                        {showWrong && (
                                            <XCircle className="w-6 h-6 text-red-400 animate-in zoom-in" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* AI Explanation */}
                {showAI && (
                    <div className={`
            rounded-2xl p-6 border-2 animate-in slide-in-from-bottom-4 duration-500
            ${isCorrect
                            ? 'bg-green-500/5 border-green-500/20'
                            : 'bg-amber-500/5 border-amber-500/20'
                        }
          `}>
                        <div className="flex items-start gap-4">
                            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${isCorrect ? 'bg-green-500/20' : 'bg-amber-500/20'}
              `}>
                                <Brain className={`w-5 h-5 ${isCorrect ? 'text-green-400' : 'text-amber-400'}`} />
                            </div>

                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    {copy.aiSays}
                                </p>
                                <p className={`text-base leading-relaxed ${isCorrect ? 'text-green-100' : 'text-amber-100'}`}>
                                    {isCorrect ? demo.aiExplanation.correct : demo.aiExplanation.wrong}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* CTA */}
                {showResult && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-in slide-in-from-bottom-2 duration-300">
                        <button
                            onClick={handleTryAgain}
                            className="px-6 py-3 rounded-xl border-2 border-slate-700 text-slate-300 font-bold hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                        >
                            {copy.tryAgain}
                        </button>

                        <button
                            onClick={onRegisterClick}
                            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 hover:from-blue-500 hover:via-sky-500 hover:to-cyan-500 text-white font-black shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>{copy.register}</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
