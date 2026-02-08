/**
 * Красивый скелетон загрузки теста
 * Показывается пока грузятся вопросы
 */

import { useMemo } from 'react';
import { motion } from '@/components/optimized/Motion';
import { Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestSkeletonProps {
    mode?: 'exam-russia' | 'exam' | 'practice' | 'blitz';
    language?: 'ru' | 'es' | 'en';
}

const TIPS_BY_LANG = {
    ru: [
        // 1. Советы по Функционалу
        "💡 Нажмите на виджет прав, чтобы увидеть детальную статистику прогресса.",
        "📅 Не теряйте дни! Заходите ежедневно, чтобы копить баллы водителя.",
        "🐛 Нашли ошибку в вопросе? Используйте кнопку 'Report', мы это ценим!",
        "🔄 Режим 'Smart Review' собирает ваши ошибки и помогает их исправить.",
        "🏆 Хотите сдать экзамен? Наберите 12 баллов в профиле, чтобы открыть симулятор.",
        // 2. Мини-факты ПДД
        "🛑 Знак R-200 (черная полоса) требует полной остановки, даже если шлагбаум открыт.",
        "🚀 На полосе разгона главное — набрать скорость потока, а не тормозить.",
        "🛣️ Синий фон знака — это Autopista. Белый — обычная дорога.",
        "💳 Круглый синий знак с буквой 'Т' — оплата ТОЛЬКО через Telepeaje.",
        // 3. Мотивация
        "💪 Ошибки — это нормально. Лучше ошибиться здесь, чем перед инспектором DGT.",
        "🎓 Каждый пройденный тест приближает вас к правам.",
        "🔥 Держите серию! 3 дня подряд дают бонус к рейтингу.",
        "🧠 Алкоголь выводится из организма медленнее во время сна.",
        "📱 Добавьте Skily на главный экран для быстрого доступа."
    ],
    es: [
        "💡 Tip: Toca el widget del permiso para ver estadísticas detalladas.",
        "📅 ¡No pierdas días! Entra a diario para acumular puntos de conductor.",
        "🐛 ¿Encontraste un error? Usa el botón 'Report', ¡lo valoramos mucho!",
        "🔄 El modo 'Smart Review' recopila tus errores y te ayuda a corregirlos.",
        "🏆 ¿Quieres aprobar? Consigue 12 puntos en el perfil para desbloquear el simulador.",
        "🛑 La señal R-200 (franja negra) requiere parada total, aunque la barrera esté abierta.",
        "🚀 En el carril de aceleración, lo principal es alcanzar la velocidad del flujo, no frenar.",
        "🛣️ El fondo azul significa Autopista/Autovía. El blanco es carretera convencional.",
        "💳 Señal redonda azul con 'T' significa pago SOLO con Telepeaje.",
        "💪 Los errores son normales. Mejor equivocarse aquí que ante la DGT.",
        "🎓 Cada test completado te acerca a tu permiso.",
        "🔥 ¡Mantén la racha! 3 días seguidos dan bonificación de rango.",
        "🧠 El alcohol se elimina más lentamente mientras duermes.",
        "📱 Añade Skily a tu pantalla de inicio para acceso rápido."
    ],
    en: [
        "💡 Tip: Tap the license widget to see detailed progress stats.",
        "📅 Don't lose days! Log in daily to accumulate driver points.",
        "🐛 Found an error? Use the 'Report' button, we appreciate it!",
        "🔄 'Smart Review' mode collects your mistakes and helps you fix them.",
        "🏆 Want to pass? Score 12 points in your profile to unlock the simulator.",
        "🛑 Sign R-200 (black stripe) requires a full stop, even if the barrier is open.",
        "🚀 In the acceleration lane, the key is to reach traffic speed, not brake.",
        "🛣️ Blue background means Motorway. White is a conventional road.",
        "💳 Round blue sign with 'T' means payment ONLY via Telepeaje.",
        "💪 Mistakes are normal. Better to fail here than before the DGT inspector.",
        "🎓 Every test completed brings you closer to your license.",
        "🔥 Keep the streak! 3 days in a row give a rank bonus.",
        "🧠 Alcohol is eliminated slower while sleeping.",
        "📱 Add Skily to your home screen for quick access."
    ]
};

export const TestSkeleton = ({ mode = 'practice', language = 'es' }: TestSkeletonProps) => {
    const isExamRussia = mode === 'exam-russia';

    // Выбираем случайный совет с учетом языка
    const randomTip = useMemo(() => {
        // Если режим РФ, всегда используем русский, иначе - переданный язык
        const effectiveLang = isExamRussia ? 'ru' : language;
        const tips = TIPS_BY_LANG[effectiveLang] || TIPS_BY_LANG.es;
        return tips[Math.floor(Math.random() * tips.length)];
    }, [language, isExamRussia]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
            {/* Header Skeleton */}
            <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-4 py-3 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="h-10 w-24 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-xl animate-pulse" />
                    <div className="h-10 flex-1 max-w-md bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-xl animate-pulse" />
                    <div className="h-10 w-32 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 flex-1 w-full flex flex-col justify-center">
                {/* Loading Animation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <motion.div
                        animate={{
                            rotateY: [0, 360],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl shadow-blue-500/50 mb-6"
                    >
                        <Brain className="w-12 h-12 text-white" />
                    </motion.div>

                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-3 tracking-tight">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        {isExamRussia ? 'Подготовка экзамена...' : 'Загрузка...'}
                    </h3>

                    {/* Tip Container */}
                    <div className="max-w-md mx-auto mt-6">
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent mx-auto mb-4"></div>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium px-4"
                        >
                            {randomTip}
                        </motion.p>
                    </div>
                </motion.div>

                {/* Question Card Skeleton */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden opacity-50 blur-[1px] scale-95 origin-top"
                >
                    {/* ... shortened skeleton content to focus on the tip ... */}
                    {/* Image Skeleton */}
                    <div className="relative w-full aspect-video bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 overflow-hidden">
                        {/* ... */}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
animate = {{
    x: ['-100%', '100%'],
                            }}
transition = {{
    duration: 1.5,
        repeat: Infinity,
            ease: "linear"
}}
className = "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
    />
                    </div >

    {/* Content */ }
    < div className = "p-6 space-y-6" >
        {/* Question Text Skeleton */ }
        < div className = "space-y-3" >
                            <div className="h-6 w-3/4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse" />
                            <div className="h-6 w-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse" />
                            <div className="h-6 w-2/3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse" />
                        </div >

    {/* Answer Options Skeleton */ }
    < div className = "space-y-3" >
    {
        [1, 2, 3, 4].map((i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={cn(
                    "h-16 bg-gradient-to-r rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden relative",
                    i === 1 && "from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10",
                    i === 2 && "from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10",
                    i === 3 && "from-pink-50 to-pink-100/50 dark:from-pink-900/20 dark:to-pink-800/10",
                    i === 4 && "from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10"
                )}
            >
                <motion.div
                    animate={{
                        x: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i * 0.2
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent"
                />
            </motion.div>
        ))
    }
                        </div >
                    </div >

    {/* Footer Button Skeleton */ }
    < div className = "p-6 pt-0" >
        <div className="h-14 w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-600/30 dark:to-purple-600/30 rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/20 animate-pulse" />
                    </div >
                </motion.div >

    {/* Progress Indicators */ }
    < motion.div
initial = {{ opacity: 0 }}
animate = {{ opacity: 1 }}
transition = {{ delay: 0.5 }}
className = "mt-6 flex items-center justify-center gap-2"
    >
{
    [1, 2, 3].map((i) => (
        <motion.div
            key={i}
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
            }}
            className="w-2 h-2 rounded-full bg-blue-500"
        />
    ))
}
                </motion.div >
            </div >
        </div >
    );
};
