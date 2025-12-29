/**
 * IntersectionGame - Игра "Перекрёстки"
 * Пользователь должен кликнуть на машины в правильном порядке проезда
 * 
 * Особенности:
 * - 3D изометрическая визуализация перекрёстков
 * - Спецтранспорт (скорая, полиция) с приоритетом
 * - Трамваи с особыми правилами ПДД
 * - Разные типы перекрёстков: обычные, Т-образные, круговые
 * - Премиальный UI с неоновыми эффектами и анимациями
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MotionDiv as motion, AnimatePresence } from "@/components/optimized/Motion";
import {
    ArrowLeft,
    Trophy,
    Clock,
    Zap,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Lightbulb,
    Car,
    Ambulance,
    Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";
import { useUserContext } from "@/contexts/UserContext";
import { usePDDContext } from "@/contexts/PDDContext";

// ========== ТИПЫ ==========
type VehicleType = 'car' | 'ambulance' | 'police' | 'fire' | 'tram' | 'truck';
type Direction = 'north' | 'south' | 'east' | 'west';
type TurnDirection = 'left' | 'straight' | 'right';
type IntersectionType = 'regular' | 't-shape' | 'roundabout';

interface Vehicle {
    id: string;
    type: VehicleType;
    color: string;
    direction: Direction;
    turn: TurnDirection;
    priority: number; // 0 = обычный, 1 = помеха справа, 2 = спецтранспорт
    label: string;
    position: { x: number; y: number; rotation: number };
    isClicked: boolean;
    isCorrect: boolean | null;
    correctOrder: number;
}

interface Scenario {
    id: string;
    title: string;
    description: string;
    type: IntersectionType;
    hasTrafficLights: boolean;
    hasMainRoad: boolean;
    mainRoadDirections?: Direction[];
    vehicles: Vehicle[];
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

// ========== СЦЕНАРИИ ПЕРЕКРЁСТКОВ ==========
const generateScenarios = (): Scenario[] => [
    // Уровень 1: Простой перекрёсток - помеха справа
    {
        id: 'scenario-1',
        title: 'Помеха справа',
        description: 'Нерегулируемый перекрёсток равнозначных дорог',
        type: 'regular',
        hasTrafficLights: false,
        hasMainRoad: false,
        vehicles: [
            {
                id: 'car-a',
                type: 'car',
                color: '#3B82F6', // синий
                direction: 'west',
                turn: 'straight',
                priority: 0,
                label: 'A',
                position: { x: 85, y: 50, rotation: 180 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 2
            },
            {
                id: 'car-b',
                type: 'car',
                color: '#EF4444', // красный
                direction: 'south',
                turn: 'straight',
                priority: 0,
                label: 'B',
                position: { x: 50, y: 15, rotation: 90 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 1
            }
        ],
        explanation: 'На нерегулируемом перекрёстке равнозначных дорог нужно уступить помехе справа. Машина B справа от A, поэтому B едет первой.',
        difficulty: 'easy'
    },

    // Уровень 2: Спецтранспорт с сиреной
    {
        id: 'scenario-2',
        title: 'Скорая помощь',
        description: 'На перекрёсток въезжает скорая с включёнными спецсигналами',
        type: 'regular',
        hasTrafficLights: false,
        hasMainRoad: false,
        vehicles: [
            {
                id: 'ambulance-a',
                type: 'ambulance',
                color: '#FFFFFF',
                direction: 'north',
                turn: 'straight',
                priority: 2,
                label: 'A',
                position: { x: 50, y: 85, rotation: -90 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 1
            },
            {
                id: 'car-b',
                type: 'car',
                color: '#22C55E', // зелёный
                direction: 'east',
                turn: 'straight',
                priority: 0,
                label: 'B',
                position: { x: 15, y: 50, rotation: 0 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 2
            },
            {
                id: 'car-c',
                type: 'car',
                color: '#F59E0B', // оранжевый
                direction: 'west',
                turn: 'left',
                priority: 0,
                label: 'C',
                position: { x: 85, y: 45, rotation: 180 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 3
            }
        ],
        explanation: 'Транспортные средства со включёнными спецсигналами (синий маячок + сирена) имеют преимущество. Скорая проезжает первой, затем остальные по правилу помехи справа.',
        difficulty: 'medium'
    },

    // Уровень 3: Т-образный перекрёсток с главной дорогой
    {
        id: 'scenario-3',
        title: 'Т-образный перекрёсток',
        description: 'Главная дорога идёт прямо, второстепенная примыкает справа',
        type: 't-shape',
        hasTrafficLights: false,
        hasMainRoad: true,
        mainRoadDirections: ['west', 'east'],
        vehicles: [
            {
                id: 'car-a',
                type: 'car',
                color: '#8B5CF6', // фиолетовый
                direction: 'east',
                turn: 'straight',
                priority: 1,
                label: 'A',
                position: { x: 15, y: 50, rotation: 0 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 1
            },
            {
                id: 'car-b',
                type: 'car',
                color: '#06B6D4', // бирюзовый
                direction: 'south',
                turn: 'left',
                priority: 0,
                label: 'B',
                position: { x: 50, y: 15, rotation: 90 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 2
            }
        ],
        explanation: 'Транспорт на главной дороге имеет преимущество. Машина A на главной, машина B на второстепенной - уступает.',
        difficulty: 'medium'
    },

    // Уровень 4: Круговое движение
    {
        id: 'scenario-4',
        title: 'Круговое движение',
        description: 'Въезд на круговой перекрёсток',
        type: 'roundabout',
        hasTrafficLights: false,
        hasMainRoad: false,
        vehicles: [
            {
                id: 'car-a',
                type: 'car',
                color: '#EC4899', // розовый
                direction: 'east',
                turn: 'straight',
                priority: 1, // уже на кругу
                label: 'A',
                position: { x: 55, y: 40, rotation: 45 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 1
            },
            {
                id: 'car-b',
                type: 'car',
                color: '#14B8A6', // teal
                direction: 'north',
                turn: 'right',
                priority: 0, // въезжает
                label: 'B',
                position: { x: 50, y: 85, rotation: -90 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 2
            }
        ],
        explanation: 'При въезде на круговое движение нужно уступить тем, кто уже на кругу. Машина A на кругу - проезжает первой.',
        difficulty: 'medium'
    },

    // Уровень 5: Трамвай
    {
        id: 'scenario-5',
        title: 'Трамвай на перекрёстке',
        description: 'Нерегулируемый перекрёсток с трамвайными путями',
        type: 'regular',
        hasTrafficLights: false,
        hasMainRoad: false,
        vehicles: [
            {
                id: 'tram-a',
                type: 'tram',
                color: '#DC2626',
                direction: 'east',
                turn: 'straight',
                priority: 1,
                label: 'A',
                position: { x: 15, y: 50, rotation: 0 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 1
            },
            {
                id: 'car-b',
                type: 'car',
                color: '#3B82F6',
                direction: 'north',
                turn: 'straight',
                priority: 0,
                label: 'B',
                position: { x: 50, y: 85, rotation: -90 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 2
            }
        ],
        explanation: 'Трамвай имеет преимущество перед безрельсовым транспортом на равнозначных дорогах. Трамвай A проезжает первым.',
        difficulty: 'hard'
    },

    // Уровень 6: Сложный перекрёсток с четырьмя машинами
    {
        id: 'scenario-6',
        title: 'Сложный перекрёсток',
        description: 'Четыре машины на нерегулируемом перекрёстке',
        type: 'regular',
        hasTrafficLights: false,
        hasMainRoad: false,
        vehicles: [
            {
                id: 'car-a',
                type: 'car',
                color: '#3B82F6',
                direction: 'north',
                turn: 'straight',
                priority: 0,
                label: 'A',
                position: { x: 45, y: 85, rotation: -90 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 3
            },
            {
                id: 'car-b',
                type: 'car',
                color: '#EF4444',
                direction: 'south',
                turn: 'straight',
                priority: 0,
                label: 'B',
                position: { x: 55, y: 15, rotation: 90 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 1
            },
            {
                id: 'car-c',
                type: 'car',
                color: '#22C55E',
                direction: 'east',
                turn: 'right',
                priority: 0,
                label: 'C',
                position: { x: 15, y: 45, rotation: 0 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 2
            },
            {
                id: 'car-d',
                type: 'car',
                color: '#F59E0B',
                direction: 'west',
                turn: 'left',
                priority: 0,
                label: 'D',
                position: { x: 85, y: 55, rotation: 180 },
                isClicked: false,
                isCorrect: null,
                correctOrder: 4
            }
        ],
        explanation: 'B не имеет помехи справа - едет первым. C поворачивает направо и никому не мешает - вторым. A уступает только C и B, D должен уступить всем при повороте налево.',
        difficulty: 'hard'
    }
];

// ========== КОМПОНЕНТЫ ==========

// Компонент машины
const VehicleComponent: React.FC<{
    vehicle: Vehicle;
    onClick: () => void;
    clickOrder: number | null;
    disabled: boolean;
}> = ({ vehicle, onClick, clickOrder, disabled }) => {
    const getVehicleEmoji = (type: VehicleType) => {
        switch (type) {
            case 'ambulance': return '🚑';
            case 'police': return '🚔';
            case 'fire': return '🚒';
            case 'tram': return '🚃';
            case 'truck': return '🚛';
            default: return '🚗';
        }
    };

    const getVehicleGlow = (type: VehicleType) => {
        switch (type) {
            case 'ambulance':
            case 'police':
            case 'fire':
                return 'shadow-[0_0_30px_rgba(239,68,68,0.8),0_0_60px_rgba(59,130,246,0.6)]';
            case 'tram':
                return 'shadow-[0_0_20px_rgba(234,179,8,0.6)]';
            default:
                return 'shadow-[0_0_15px_rgba(255,255,255,0.3)]';
        }
    };

    return (
        <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: vehicle.isClicked ? 0.9 : 1,
                opacity: vehicle.isClicked ? 0.6 : 1,
                y: vehicle.isClicked ? -10 : 0
            }}
            whileHover={!disabled && !vehicle.isClicked ? { scale: 1.15, y: -5 } : {}}
            whileTap={!disabled && !vehicle.isClicked ? { scale: 0.95 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            onClick={onClick}
            disabled={disabled || vehicle.isClicked}
            className={cn(
                "absolute w-16 h-16 flex flex-col items-center justify-center",
                "rounded-2xl backdrop-blur-md border-2 cursor-pointer",
                "transition-all duration-300",
                vehicle.isClicked
                    ? vehicle.isCorrect
                        ? "border-emerald-400 bg-emerald-500/30"
                        : "border-red-400 bg-red-500/30"
                    : "border-white/30 bg-white/10 hover:border-white/60 hover:bg-white/20",
                !disabled && !vehicle.isClicked && getVehicleGlow(vehicle.type),
                disabled && !vehicle.isClicked && "opacity-50 cursor-not-allowed"
            )}
            style={{
                left: `${vehicle.position.x}%`,
                top: `${vehicle.position.y}%`,
                transform: `translate(-50%, -50%) rotate(${vehicle.position.rotation}deg)`,
            }}
        >
            <div
                className="text-2xl"
                style={{ transform: `rotate(${-vehicle.position.rotation}deg)` }}
            >
                {getVehicleEmoji(vehicle.type)}
            </div>
            <div
                className={cn(
                    "absolute -top-2 -left-2 w-7 h-7 rounded-full",
                    "flex items-center justify-center text-xs font-bold",
                    "border-2",
                    vehicle.isClicked
                        ? vehicle.isCorrect
                            ? "bg-emerald-500 border-emerald-300 text-white"
                            : "bg-red-500 border-red-300 text-white"
                        : "bg-slate-800 border-white/50 text-white"
                )}
                style={{ transform: `rotate(${-vehicle.position.rotation}deg)` }}
            >
                {clickOrder !== null ? clickOrder : vehicle.label}
            </div>

            {/* Спецсигналы для спецтранспорта */}
            {(vehicle.type === 'ambulance' || vehicle.type === 'police' || vehicle.type === 'fire') && !vehicle.isClicked && (
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                >
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3B82F6]" />
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#EF4444]" />
                    </div>
                </motion.div>
            )}
        </motion.button>
    );
};

// Компонент стрелки траектории
const TrajectoryArrow: React.FC<{
    direction: Direction;
    turn: TurnDirection;
    color: string;
    position: { x: number; y: number };
}> = ({ direction, turn, color, position }) => {
    // Генерируем SVG path для стрелки
    const getArrowPath = () => {
        const baseLength = 60;

        if (turn === 'straight') {
            return `M 0 ${baseLength} L 0 0 M -8 10 L 0 0 L 8 10`;
        } else if (turn === 'right') {
            return `M 0 ${baseLength} Q 0 20, 40 20 M 30 12 L 40 20 L 30 28`;
        } else {
            return `M 0 ${baseLength} Q 0 20, -40 20 M -30 12 L -40 20 L -30 28`;
        }
    };

    const getRotation = () => {
        switch (direction) {
            case 'north': return 0;
            case 'south': return 180;
            case 'east': return 90;
            case 'west': return -90;
        }
    };

    return (
        <svg
            className="absolute pointer-events-none"
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `translate(-50%, -50%) rotate(${getRotation()}deg)`,
                width: 100,
                height: 100,
            }}
            viewBox="-50 -10 100 80"
        >
            <path
                d={getArrowPath()}
                fill="none"
                stroke={color}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
                filter="drop-shadow(0 0 4px rgba(255,255,255,0.5))"
            />
        </svg>
    );
};

// Компонент перекрёстка
const IntersectionVisual: React.FC<{
    type: IntersectionType;
    hasMainRoad: boolean;
    mainRoadDirections?: Direction[];
    vehicles: Vehicle[];
    onVehicleClick: (id: string) => void;
    clickedOrder: Map<string, number>;
    disabled: boolean;
}> = ({ type, hasMainRoad, mainRoadDirections, vehicles, onVehicleClick, clickedOrder, disabled }) => {
    return (
        <div className="relative w-full aspect-square max-w-[500px] mx-auto">
            {/* Фон - трава */}
            <div
                className="absolute inset-0 rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)',
                }}
            >
                {/* Текстура травы */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* Дороги */}
            {type === 'roundabout' ? (
                // Круговое движение
                <>
                    {/* Внешний круг */}
                    <div className="absolute inset-[20%] rounded-full bg-slate-700 border-4 border-slate-800 shadow-inner" />
                    {/* Внутренний круг (островок) */}
                    <div className="absolute inset-[35%] rounded-full bg-emerald-600 border-4 border-yellow-400 shadow-lg" />
                    {/* Въезды */}
                    {['north', 'south', 'east', 'west'].map((dir) => (
                        <div
                            key={dir}
                            className={cn(
                                "absolute bg-slate-700",
                                dir === 'north' || dir === 'south' ? "w-[20%] h-[25%]" : "h-[20%] w-[25%]"
                            )}
                            style={{
                                top: dir === 'north' ? 0 : dir === 'south' ? '75%' : '40%',
                                left: dir === 'west' ? 0 : dir === 'east' ? '75%' : '40%',
                            }}
                        >
                            {/* Разметка */}
                            <div className={cn(
                                "absolute bg-white/80",
                                dir === 'north' || dir === 'south'
                                    ? "left-1/2 -translate-x-1/2 w-1 h-full"
                                    : "top-1/2 -translate-y-1/2 h-1 w-full"
                            )}
                                style={{ opacity: 0.3 }}
                            />
                        </div>
                    ))}
                </>
            ) : type === 't-shape' ? (
                // Т-образный перекрёсток
                <>
                    {/* Горизонтальная дорога (главная) */}
                    <div
                        className={cn(
                            "absolute left-0 right-0 h-[24%] top-[38%]",
                            hasMainRoad ? "bg-slate-600" : "bg-slate-700"
                        )}
                    >
                        {/* Разметка */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 border-t-4 border-dashed border-white/50" />
                        {hasMainRoad && mainRoadDirections?.includes('east') && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 text-xl">◆</div>
                        )}
                    </div>
                    {/* Вертикальная дорога (примыкающая) */}
                    <div className="absolute top-0 h-[38%] w-[24%] left-[38%] bg-slate-700">
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 border-l-4 border-dashed border-white/50" />
                    </div>
                </>
            ) : (
                // Обычный перекрёсток
                <>
                    {/* Вертикальная дорога */}
                    <div className="absolute top-0 bottom-0 left-[38%] right-[38%] bg-slate-700">
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 border-l-4 border-dashed border-white/40" />
                    </div>
                    {/* Горизонтальная дорога */}
                    <div className="absolute left-0 right-0 top-[38%] bottom-[38%] bg-slate-700">
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 border-t-4 border-dashed border-white/40" />
                    </div>
                    {/* Центр перекрёстка */}
                    <div className="absolute left-[38%] right-[38%] top-[38%] bottom-[38%] bg-slate-600" />
                </>
            )}

            {/* Тротуары */}
            <div className="absolute top-0 left-0 w-[35%] h-[35%] rounded-br-2xl bg-amber-100/30 border-r-4 border-b-4 border-amber-200/50" />
            <div className="absolute top-0 right-0 w-[35%] h-[35%] rounded-bl-2xl bg-amber-100/30 border-l-4 border-b-4 border-amber-200/50" />
            <div className="absolute bottom-0 left-0 w-[35%] h-[35%] rounded-tr-2xl bg-amber-100/30 border-r-4 border-t-4 border-amber-200/50" />
            <div className="absolute bottom-0 right-0 w-[35%] h-[35%] rounded-tl-2xl bg-amber-100/30 border-l-4 border-t-4 border-amber-200/50" />

            {/* Стрелки траекторий */}
            {vehicles.filter(v => !v.isClicked).map((vehicle) => (
                <TrajectoryArrow
                    key={`arrow-${vehicle.id}`}
                    direction={vehicle.direction}
                    turn={vehicle.turn}
                    color={vehicle.turn === 'left' ? '#F97316' : '#FFFFFF'}
                    position={vehicle.position}
                />
            ))}

            {/* Машины */}
            {vehicles.map((vehicle) => (
                <VehicleComponent
                    key={vehicle.id}
                    vehicle={vehicle}
                    onClick={() => onVehicleClick(vehicle.id)}
                    clickOrder={clickedOrder.get(vehicle.id) ?? null}
                    disabled={disabled}
                />
            ))}
        </div>
    );
};

// ========== ГЛАВНЫЙ КОМПОНЕНТ ==========
const IntersectionGame = () => {
    const navigate = useNavigate();
    const { profileId } = useUserContext();
    const { selectedCountry } = usePDDContext();

    // Состояние игры
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'checking' | 'result'>('menu');
    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
    const [clickedOrder, setClickedOrder] = useState<Map<string, number>>(new Map());
    const [score, setScore] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [streak, setStreak] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);

    // Инициализация сценариев
    useEffect(() => {
        const generatedScenarios = generateScenarios();
        // Перемешиваем для разнообразия
        const shuffled = [...generatedScenarios].sort(() => Math.random() - 0.5);
        setScenarios(shuffled);
    }, []);

    // Загрузка текущего сценария
    useEffect(() => {
        if (scenarios.length > 0 && gameState === 'playing') {
            const scenario = { ...scenarios[currentScenarioIndex % scenarios.length] };
            // Сбрасываем состояние машин
            scenario.vehicles = scenario.vehicles.map(v => ({
                ...v,
                isClicked: false,
                isCorrect: null
            }));
            setCurrentScenario(scenario);
            setClickedOrder(new Map());
            setShowHint(false);
            setShowExplanation(false);
            setLastResult(null);
        }
    }, [scenarios, currentScenarioIndex, gameState]);

    // Начало игры
    const startGame = useCallback(() => {
        setGameState('playing');
        setCurrentScenarioIndex(0);
        setScore(0);
        setTotalCorrect(0);
        setTotalAttempts(0);
        setStreak(0);
        sounds.notificationPop();
        haptics.buttonClick();
    }, []);

    // Клик по машине
    const handleVehicleClick = useCallback((vehicleId: string) => {
        if (!currentScenario || gameState !== 'playing') return;

        const vehicle = currentScenario.vehicles.find(v => v.id === vehicleId);
        if (!vehicle || vehicle.isClicked) return;

        const newClickedOrder = new Map(clickedOrder);
        const clickNumber = clickedOrder.size + 1;
        newClickedOrder.set(vehicleId, clickNumber);
        setClickedOrder(newClickedOrder);

        // Обновляем состояние машины
        setCurrentScenario(prev => {
            if (!prev) return null;
            return {
                ...prev,
                vehicles: prev.vehicles.map(v =>
                    v.id === vehicleId ? { ...v, isClicked: true } : v
                )
            };
        });

        sounds.notificationPop();
        haptics.buttonClick();

        // Проверяем, все ли машины кликнуты
        if (clickNumber === currentScenario.vehicles.length) {
            // Проверяем порядок
            setTimeout(() => checkAnswer(newClickedOrder), 500);
        }
    }, [currentScenario, clickedOrder, gameState]);

    // Проверка ответа
    const checkAnswer = useCallback((finalOrder: Map<string, number>) => {
        if (!currentScenario) return;

        setGameState('checking');

        let allCorrect = true;
        const updatedVehicles = currentScenario.vehicles.map(vehicle => {
            const clickedPosition = finalOrder.get(vehicle.id);
            const isCorrect = clickedPosition === vehicle.correctOrder;
            if (!isCorrect) allCorrect = false;
            return { ...vehicle, isCorrect };
        });

        setCurrentScenario(prev => prev ? { ...prev, vehicles: updatedVehicles } : null);
        setTotalAttempts(prev => prev + 1);
        setLastResult(allCorrect ? 'correct' : 'incorrect');

        if (allCorrect) {
            setTotalCorrect(prev => prev + 1);
            const newStreak = streak + 1;
            setStreak(newStreak);
            const points = 100 * (1 + Math.floor(newStreak / 3) * 0.5); // Бонус за серию
            setScore(prev => prev + points);
            sounds.correctAnswer();
            haptics.correctAnswer();
        } else {
            setStreak(0);
            sounds.wrongAnswer();
            haptics.wrongAnswer();
        }

        // Показываем объяснение
        setTimeout(() => {
            setShowExplanation(true);
        }, 1000);
    }, [currentScenario, streak]);

    // Следующий сценарий
    const nextScenario = useCallback(() => {
        if (currentScenarioIndex + 1 >= scenarios.length) {
            setGameState('result');
        } else {
            setCurrentScenarioIndex(prev => prev + 1);
            setGameState('playing');
        }
    }, [currentScenarioIndex, scenarios.length]);

    // Повторить текущий сценарий
    const retryScenario = useCallback(() => {
        setGameState('playing');
    }, []);

    // Вернуться в меню
    const goToMenu = useCallback(() => {
        setGameState('menu');
        setCurrentScenarioIndex(0);
    }, []);

    // Рендер меню
    const renderMenu = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-8"
        >
            {/* Hero */}
            <div className="text-center space-y-4">
                <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-8xl mb-4"
                >
                    🚦
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
                    ПЕРЕКРЁСТКИ
                </h1>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                    Разрули пробку! Выбери правильный порядок проезда перекрёстка
                </p>
            </div>

            {/* Особенности */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
                {[
                    { icon: '🚗', title: 'Машины' },
                    { icon: '🚑', title: 'Спецтранспорт' },
                    { icon: '🚃', title: 'Трамваи' },
                    { icon: '🔄', title: 'Кольца' }
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex flex-col items-center p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border"
                    >
                        <span className="text-3xl mb-2">{item.icon}</span>
                        <span className="text-sm font-medium text-muted-foreground">{item.title}</span>
                    </motion.div>
                ))}
            </div>

            {/* Кнопка старта */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="relative group px-12 py-5 rounded-full font-black text-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-[0_10px_40px_rgba(249,115,22,0.4)] hover:shadow-[0_15px_50px_rgba(249,115,22,0.5)] transition-all duration-300"
            >
                <span className="relative z-10 flex items-center gap-3">
                    <Zap className="w-6 h-6" />
                    ИГРАТЬ
                </span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
            </motion.button>
        </motion.div>
    );

    // Рендер игры
    const renderGame = () => {
        if (!currentScenario) return null;

        const difficultyColors = {
            easy: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
            medium: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
            hard: 'text-red-400 border-red-400/30 bg-red-400/10'
        };

        const difficultyLabels = {
            easy: 'Легко',
            medium: 'Средне',
            hard: 'Сложно'
        };

        return (
            <div className="space-y-6 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge className={difficultyColors[currentScenario.difficulty]}>
                            {difficultyLabels[currentScenario.difficulty]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {currentScenarioIndex + 1} / {scenarios.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Streak */}
                        {streak > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                            >
                                <Zap className="w-4 h-4 text-amber-400" />
                                <span className="text-sm font-bold text-amber-400">{streak}x</span>
                            </motion.div>
                        )}

                        {/* Score */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="font-bold">{score}</span>
                        </div>
                    </div>
                </div>

                {/* Title & Description */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">{currentScenario.title}</h2>
                    <p className="text-muted-foreground">{currentScenario.description}</p>
                    <p className="text-sm text-amber-400">
                        Кликай на машины в порядке их проезда
                    </p>
                </div>

                {/* Перекрёсток */}
                <IntersectionVisual
                    type={currentScenario.type}
                    hasMainRoad={currentScenario.hasMainRoad}
                    mainRoadDirections={currentScenario.mainRoadDirections}
                    vehicles={currentScenario.vehicles}
                    onVehicleClick={handleVehicleClick}
                    clickedOrder={clickedOrder}
                    disabled={gameState !== 'playing'}
                />

                {/* Результат */}
                <AnimatePresence>
                    {lastResult && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={cn(
                                "p-4 rounded-2xl text-center",
                                lastResult === 'correct'
                                    ? "bg-emerald-500/20 border border-emerald-500/30"
                                    : "bg-red-500/20 border border-red-500/30"
                            )}
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                {lastResult === 'correct' ? (
                                    <>
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                        <span className="text-lg font-bold text-emerald-400">Правильно!</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-6 h-6 text-red-400" />
                                        <span className="text-lg font-bold text-red-400">Неправильно</span>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Объяснение */}
                <AnimatePresence>
                    {showExplanation && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-blue-400 mb-1">Объяснение</p>
                                        <p className="text-sm text-muted-foreground">
                                            {currentScenario.explanation}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Правильный порядок: {currentScenario.vehicles
                                                .sort((a, b) => a.correctOrder - b.correctOrder)
                                                .map(v => v.label)
                                                .join(' → ')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Кнопки */}
                            <div className="flex gap-3 mt-4">
                                {lastResult === 'incorrect' && (
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={retryScenario}
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Повторить
                                    </Button>
                                )}
                                <Button
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
                                    onClick={nextScenario}
                                >
                                    {currentScenarioIndex + 1 >= scenarios.length ? 'Результаты' : 'Далее'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Подсказка */}
                {!showExplanation && gameState === 'playing' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHint(!showHint)}
                        className="w-full text-muted-foreground"
                    >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
                    </Button>
                )}

                <AnimatePresence>
                    {showHint && !showExplanation && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-muted-foreground"
                        >
                            💡 Помни: спецтранспорт с сиреной — всегда первый; на равнозначных — уступи помехе справа;
                            трамвай имеет преимущество на равнозначных дорогах.
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // Рендер результатов
    const renderResults = () => {
        const percentage = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

        const getMessage = () => {
            if (percentage >= 90) return { emoji: '🏆', text: 'Отлично!', subtitle: 'Ты настоящий мастер!' };
            if (percentage >= 70) return { emoji: '🎉', text: 'Хорошо!', subtitle: 'Продолжай в том же духе!' };
            if (percentage >= 50) return { emoji: '👍', text: 'Неплохо!', subtitle: 'Есть куда расти' };
            return { emoji: '📚', text: 'Нужна практика', subtitle: 'Повтори правила ПДД' };
        };

        const message = getMessage();

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-8"
            >
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-8xl"
                >
                    {message.emoji}
                </motion.div>

                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black">{message.text}</h2>
                    <p className="text-muted-foreground">{message.subtitle}</p>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                    <div className="p-4 rounded-2xl bg-card/60 border border-border text-center">
                        <div className="text-2xl font-bold text-amber-400">{score}</div>
                        <div className="text-xs text-muted-foreground">Очки</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-card/60 border border-border text-center">
                        <div className="text-2xl font-bold text-emerald-400">{totalCorrect}/{totalAttempts}</div>
                        <div className="text-xs text-muted-foreground">Правильно</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-card/60 border border-border text-center">
                        <div className="text-2xl font-bold text-blue-400">{percentage}%</div>
                        <div className="text-xs text-muted-foreground">Точность</div>
                    </div>
                </div>

                {/* Кнопки */}
                <div className="flex gap-3 w-full max-w-md">
                    <Button variant="outline" className="flex-1" onClick={goToMenu}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Меню
                    </Button>
                    <Button
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
                        onClick={startGame}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Играть снова
                    </Button>
                </div>
            </motion.div>
        );
    };

    return (
        <Layout>
            <div className="min-h-screen bg-background pb-24">
                {/* Header */}
                <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
                    <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/games')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <h1 className="font-bold text-lg">Перекрёстки</h1>

                        <div className="w-10" /> {/* Spacer */}
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto">
                    {gameState === 'menu' && renderMenu()}
                    {(gameState === 'playing' || gameState === 'checking') && renderGame()}
                    {gameState === 'result' && renderResults()}
                </div>
            </div>
        </Layout>
    );
};

export default IntersectionGame;
