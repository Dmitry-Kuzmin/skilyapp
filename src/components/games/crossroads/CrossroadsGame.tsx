import React from 'react';
import { motion, AnimatePresence } from '@/components/optimized/Motion';
import { useCrossroadsGame } from './hooks/useCrossroadsGame';
import { IntersectionVisual } from './components/IntersectionVisual';
import { CROSSROADS_SCENARIOS } from './scenarios';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Zap, RefreshCcw, ArrowRight, Play, AlertCircle, CheckCircle, Sparkles, X, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const CrossroadsGame: React.FC = () => {
    const {
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
    } = useCrossroadsGame();

    if (gameState.status === 'menu') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center space-y-8"
            >
                <div className="p-10 bg-white/5 rounded-[3rem] border-2 border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="relative z-10">
                        <Trophy className="w-24 h-24 mb-6 mx-auto text-yellow-500 drop-shadow-glow-yellow animate-bounce" />
                        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/40 mb-4 uppercase tracking-tighter italic">
                            Перекрёстки
                        </h1>
                        <p className="max-w-md text-white/50 mb-10 text-lg leading-relaxed">
                            Стань экспертом ПДД! Управляй потоком машин и безопасно проезжай самые сложные перекрестки.
                            Светофоры, регулировщик и трамваи ждут тебя.
                        </p>
                        <Button
                            size="lg"
                            onClick={startGame}
                            className="w-full rounded-[1.5rem] h-20 text-xl font-black bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 shadow-[0_15px_30px_rgba(16,185,129,0.3)] border-t border-white/30 transition-all active:scale-95"
                        >
                            В Путь <Play className="ml-2 w-6 h-6 fill-current" />
                        </Button>
                    </div>
                </div>

                <div className="flex gap-6">
                    <div className="flex flex-col p-5 bg-white/5 border border-white/10 rounded-[1.5rem] min-w-[140px] backdrop-blur-sm">
                        <span className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Опыт</span>
                        <span className="text-3xl font-black text-emerald-400">+50 XP</span>
                    </div>
                    <div className="flex flex-col p-5 bg-white/5 border border-white/10 rounded-[1.5rem] min-w-[140px] backdrop-blur-sm">
                        <span className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-1">Монеты</span>
                        <span className="text-3xl font-black text-yellow-400">5 🪙</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col min-h-[600px] w-full max-w-2xl mx-auto space-y-6 relative">
            {/* Header / Stats */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/10 shrink-0 shadow-xl">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-lg font-black text-white tabular-nums">{Math.round(gameState.score)}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <Zap className="w-4 h-4 text-orange-400" />
                        <span className="text-lg font-black text-orange-400 tabular-nums">x{gameState.combo}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70 font-black rounded-full px-3 py-1">
                        {gameState.currentScenarioIndex + 1} / {CROSSROADS_SCENARIOS.length}
                    </Badge>
                    <Badge variant="outline" className={cn(
                        "border-white/10 font-black rounded-full px-3 py-1 uppercase text-[10px] tracking-widest",
                        currentScenario?.difficulty === 'easy' ? "text-emerald-400 bg-emerald-500/10" :
                            currentScenario?.difficulty === 'medium' ? "text-yellow-400 bg-yellow-500/10" :
                                currentScenario?.difficulty === 'hard' ? "text-red-400 bg-red-500/10" : "text-purple-400 bg-purple-500/10"
                    )}>
                        {currentScenario?.difficulty}
                    </Badge>
                </div>
            </div>

            {/* Scenario Title */}
            <div className="text-center space-y-2 px-4">
                <h2 className="text-3xl font-black text-white leading-tight tracking-tighter uppercase italic">
                    {currentScenario?.title}
                </h2>
                <p className="text-white/40 text-sm font-medium">{currentScenario?.description}</p>
            </div>

            {/* Game Visual Area */}
            <div className="flex-1 flex items-center justify-center p-2 isolate">
                {currentScenario && (
                    <IntersectionVisual
                        type={currentScenario.type}
                        hasMainRoad={currentScenario.hasMainRoad}
                        mainRoadDirections={currentScenario.mainRoadDirections}
                        vehicles={currentScenario.vehicles}
                        onVehicleClick={handleVehicleClick}
                        clickedOrder={clickedOrder}
                        status={gameState.status}
                        trafficLights={currentScenario.trafficLights}
                        hasRegulator={currentScenario.hasRegulator}
                        regulatorSignal={currentScenario.regulatorSignal}
                    />
                )}
            </div>

            {/* Feedback & Controls Area */}
            <div className="p-4 shrink-0 relative z-20">
                <AnimatePresence mode="wait">
                    {gameState.status === 'playing' ? (
                        <motion.div
                            key="prompt"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white/5 backdrop-blur-md rounded-[2rem] p-6 text-center border-2 border-dashed border-white/10 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                            <p className="text-white/60 text-sm font-black uppercase tracking-widest mb-4">Кликай по машинам в порядке проезда</p>
                            <div className="flex gap-2 justify-center">
                                {currentScenario?.vehicles.map((_v: any, i: number) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-2 rounded-full transition-all duration-500",
                                            clickedOrder.size > i ? "bg-emerald-400 w-12" : "bg-white/10 w-2"
                                        )}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-4 relative overflow-hidden backdrop-blur-2xl",
                                lastResult === 'correct' ? "bg-emerald-500/20 border-emerald-400/50" : "bg-red-500/20 border-red-400/50"
                            )}
                        >
                            <div className="absolute -right-6 -top-6 opacity-10">
                                {lastResult === 'correct' ? <CheckCircle className="w-40 h-40 text-emerald-400" /> : <AlertCircle className="w-40 h-40 text-red-400" />}
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                {lastResult === 'correct' ? (
                                    <Badge className="bg-emerald-500 text-white border-none px-4 py-1.5 rounded-full font-black text-sm">ПРАВИЛЬНО! ✅</Badge>
                                ) : (
                                    <Badge className="bg-red-500 text-white border-none px-4 py-1.5 rounded-full font-black text-sm">ОШИБКА ❌</Badge>
                                )}
                                {lastResult === 'correct' && <span className="text-emerald-400 font-black text-lg">+{Math.round(100 * (1 + (gameState.combo * 0.2)))} XP</span>}
                            </div>

                            <p className="text-white/80 text-lg leading-relaxed mb-8 font-medium italic">
                                "{currentScenario?.explanation}"
                            </p>

                            <div className="flex gap-4">
                                {lastResult === 'incorrect' && (
                                    <Button
                                        variant="outline"
                                        onClick={restartCurrent}
                                        className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-[1.2rem] h-14 font-black transition-all"
                                    >
                                        <RefreshCcw className="mr-2 w-5 h-5" /> Исправить
                                    </Button>
                                )}
                                <Button
                                    onClick={nextLevel}
                                    className={cn(
                                        "flex-[2] rounded-[1.2rem] h-14 font-black text-lg shadow-xl transition-all active:scale-95",
                                        lastResult === 'correct' ? "bg-emerald-500 hover:bg-emerald-400 hover:shadow-emerald-500/30" : "bg-slate-700 hover:bg-slate-600"
                                    )}
                                >
                                    Далее <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sky Advisor System */}
            <div className="fixed bottom-32 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
                <AnimatePresence>
                    {showSkyHint && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: 20, y: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: 20, y: 10 }}
                            className="bg-indigo-600 text-white p-5 rounded-[2rem] rounded-br-none max-w-[280px] shadow-2xl border-2 border-indigo-400/50 backdrop-blur-xl pointer-events-auto relative mb-4"
                        >
                            <div className="absolute -bottom-2 right-0 w-4 h-4 bg-indigo-600 rotate-45 border-r-2 border-b-2 border-indigo-400/50" />
                            <div className="flex items-start gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-emerald-300 shrink-0 mt-1" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Совет от Ская</span>
                            </div>
                            <p className="text-sm font-bold leading-tight">
                                {currentScenario?.difficulty === 'easy' ? "Смотри только на тех, кто справа от тебя!" :
                                    currentScenario?.hasRegulator ? "Если регулировщик стоит боком — это твой зеленый свет!" :
                                        currentScenario?.hasTrafficLights ? "На светофоре встречные при повороте налево — это закон." :
                                            "Не забывай про приоритет сирены и маячков!"}
                            </p>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleSkyHint}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-white/10 text-white/50"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleSkyHint}
                    className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all border-4 pointer-events-auto",
                        showSkyHint ? "bg-white border-indigo-500 text-indigo-500" : "bg-indigo-600 border-indigo-400 text-white"
                    )}
                >
                    {showSkyHint ? <X className="w-8 h-8" /> : <HelpCircle className="w-8 h-8" />}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center animate-bounce">
                        <Sparkles className="w-3 h-3 text-white" />
                    </div>
                </motion.button>
            </div>
        </div>
    );
};
