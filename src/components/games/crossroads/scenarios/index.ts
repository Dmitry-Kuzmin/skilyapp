import { Scenario } from '../types';

export const CROSSROADS_SCENARIOS: Scenario[] = [
    // --- БАЗОВЫЕ (1-8 уже были, переписываем для чистоты и дополняем) ---
    {
        id: 'sc-1',
        title: 'Равнозначный перекрёсток',
        description: 'Классическая помеха справа.',
        type: 'regular',
        hasTrafficLights: false,
        hasMainRoad: false,
        difficulty: 'easy',
        explanation: 'На нерегулируемом перекрёстке равнозначных дорог действует правило "помехи справа".',
        vehicles: [
            { id: 'v1', type: 'car', color: '#3B82F6', direction: 'west', turn: 'straight', priority: 0, label: 'A', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#EF4444', direction: 'south', turn: 'straight', priority: 1, label: 'B', position: { x: 50, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },

    // --- СВЕТОФОРЫ (Новое) ---
    {
        id: 'sc-tl-1',
        title: 'Регулируемый перекрёсток',
        description: 'Поворот налево на зеленый сигнал.',
        type: 'regular',
        hasTrafficLights: true,
        trafficLights: [
            { position: 'north', state: 'green' },
            { position: 'south', state: 'green' },
            { position: 'east', state: 'red' },
            { position: 'west', state: 'red' }
        ],
        hasMainRoad: false,
        difficulty: 'medium',
        explanation: 'При повороте налево на зеленый сигнал нужно уступить встречному транспорту, идущему прямо или направо.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#3B82F6', direction: 'south', turn: 'left', priority: 0, label: 'A', position: { x: 50, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#EF4444', direction: 'north', turn: 'straight', priority: 1, label: 'B', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },
    {
        id: 'sc-tl-2',
        title: 'Дополнительная секция',
        description: 'Поворот направо по стрелке.',
        type: 'regular',
        hasTrafficLights: true,
        trafficLights: [{ position: 'west', state: 'red' }],
        hasMainRoad: false,
        difficulty: 'hard',
        explanation: 'При движении в направлении стрелки, включенной одновременно с красным сигналом, нужно уступить всем остальным.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#8B5CF6', direction: 'west', turn: 'right', priority: 0, label: 'A', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#10B981', direction: 'north', turn: 'straight', priority: 1, label: 'B', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },

    // --- РЕГУЛИРОВЩИК (Новое) ---
    {
        id: 'sc-reg-1',
        title: 'Жест регулировщика',
        description: 'Руки вытянуты в стороны или опущены.',
        type: 'regular',
        hasTrafficLights: false,
        hasRegulator: true,
        regulatorSignal: 'hands-out',
        hasMainRoad: false,
        difficulty: 'hard',
        explanation: 'Со стороны груди и спины движение запрещено. Со стороны боков можно ехать прямо или направо.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#3B82F6', direction: 'south', turn: 'straight', priority: 0, label: 'A', position: { x: 50, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 100 }, // Forbidden
            { id: 'v2', type: 'car', color: '#EF4444', direction: 'west', turn: 'straight', priority: 1, label: 'B', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ],
        // Note: Logic for forbidden needs careful handling in useCrossroadsGame
    },
    {
        id: 'sc-reg-2',
        title: 'Правая рука вперед',
        description: 'Регулировщик указывает направление.',
        type: 'regular',
        hasTrafficLights: false,
        hasRegulator: true,
        regulatorSignal: 'hand-forward',
        hasMainRoad: false,
        difficulty: 'expert',
        explanation: 'Если палка смотрит влево — проезжай как королева! Со стороны левого бока разрешено движение в любом направлении.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#EC4899', direction: 'west', turn: 'left', priority: 1, label: 'A', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#3B82F6', direction: 'north', turn: 'straight', priority: 0, label: 'B', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 100 } // Forbidden from chest
        ]
    },

    // --- ТРАМВАИ + СВЕТОФОРЫ ---
    {
        id: 'sc-mix-1',
        title: 'Трамвай и светофор',
        description: 'Регулируемый перекресток с трамваем.',
        type: 'regular',
        hasTrafficLights: true,
        trafficLights: [{ position: 'south', state: 'green' }],
        hasMainRoad: false,
        difficulty: 'hard',
        explanation: 'При равном праве на проезд (зеленый свет) трамвай имеет преимущество независимо от направления.',
        vehicles: [
            { id: 'v1', type: 'tram', color: '#DC2626', direction: 'south', turn: 'straight', priority: 3, label: 'T', position: { x: 53, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#3B82F6', direction: 'north', turn: 'left', priority: 0, label: 'A', position: { x: 47, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 2 }
        ]
    },

    // --- СПЕЦТРАНСПОРТ + ГЛАВНАЯ ДОРОГА ---
    {
        id: 'sc-mix-2',
        title: 'Приоритет сирены',
        description: 'Скорая против главной дороги.',
        type: 't-shape',
        hasTrafficLights: false,
        hasMainRoad: true,
        mainRoadDirections: ['west', 'east'],
        difficulty: 'medium',
        explanation: 'Спецтранспорт с сиреной и маячком имеет преимущество над знаками приоритета.',
        vehicles: [
            { id: 'v1', type: 'ambulance', color: '#FFFFFF', direction: 'north', turn: 'straight', priority: 2, label: 'A', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#10B981', direction: 'west', turn: 'straight', priority: 1, label: 'B', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 2 }
        ]
    },

    // --- Т-ОБРАЗНЫЙ СЛОЖНЫЙ ---
    {
        id: 'sc-t-2',
        title: 'Т-образный разъезд',
        description: 'Главная дорога поворачивает.',
        type: 't-shape',
        hasTrafficLights: false,
        hasMainRoad: true,
        mainRoadDirections: ['south', 'east'],
        difficulty: 'hard',
        explanation: 'Кто на главной — разъезжаются по помехе справа, затем остальные.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#F59E0B', direction: 'south', turn: 'straight', priority: 1, label: 'A', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#3B82F6', direction: 'east', turn: 'left', priority: 1, label: 'B', position: { x: 25, y: 50, rotation: 0 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v3', type: 'car', color: '#EF4444', direction: 'west', turn: 'straight', priority: 0, label: 'C', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 3 }
        ]
    },

    // --- КОЛЬЦО ЭКСПЕРТ ---
    {
        id: 'sc-round-2',
        title: 'Маневры на кольце',
        description: 'Две машины внутри кольца.',
        type: 'roundabout',
        hasTrafficLights: false,
        hasMainRoad: false,
        difficulty: 'expert',
        explanation: 'При перестроении внутри кольца действует правило помехи справа.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#06B6D4', direction: 'east', turn: 'straight', priority: 1, label: 'A', position: { x: 60, y: 40, rotation: 45 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#8B5CF6', direction: 'south', turn: 'straight', priority: 1, label: 'B', position: { x: 40, y: 40, rotation: 135 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },

    // --- НОВЫЕ СЦЕНАРИИ (Доведение до 20+) ---
    {
        id: 'sc-mix-3',
        title: 'Трамвай и знак STOP',
        description: 'Второстепенная дорога.',
        type: 'regular',
        hasTrafficLights: false,
        hasMainRoad: true,
        mainRoadDirections: ['north', 'south'],
        difficulty: 'medium',
        explanation: 'Знак "Уступи дорогу" или STOP обязывает пропустить всех на главной, включая трамвай.',
        vehicles: [
            { id: 'v1', type: 'tram', color: '#DC2626', direction: 'east', turn: 'straight', priority: 0, label: 'T', position: { x: 25, y: 48, rotation: 0 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#3B82F6', direction: 'north', turn: 'straight', priority: 1, label: 'A', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },
    {
        id: 'sc-reg-3',
        title: 'Регулировщик: Грудь',
        description: 'Движение на грудь запрещено.',
        type: 'regular',
        hasRegulator: true,
        regulatorSignal: 'hand-forward', // Hand pointing towards the driver (west)
        hasTrafficLights: false,
        hasMainRoad: false,
        difficulty: 'hard',
        explanation: 'Если рука регулировщика направлена на тебя — движение запрещено. Как стена.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#EF4444', direction: 'west', turn: 'straight', priority: 0, label: 'A', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#10B981', direction: 'south', turn: 'right', priority: 1, label: 'B', position: { x: 50, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },
    {
        id: 'sc-tl-3',
        title: 'Зеленый и спецсигнал',
        description: 'Ситуация на перекрестке.',
        type: 'regular',
        hasTrafficLights: true,
        trafficLights: [{ position: 'north', state: 'green' }, { position: 'east', state: 'red' }],
        hasMainRoad: false,
        difficulty: 'medium',
        explanation: 'Полиция с маячком может ехать на красный, остальные должны уступить.',
        vehicles: [
            { id: 'v1', type: 'police', color: '#1D4ED8', direction: 'east', turn: 'straight', priority: 2, label: 'P', position: { x: 25, y: 50, rotation: 0 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#F59E0B', direction: 'north', turn: 'straight', priority: 1, label: 'A', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 2 }
        ]
    },
    {
        id: 'sc-t-3',
        title: 'Т-образный: Помеха справа',
        description: 'Равнозначные дороги.',
        type: 't-shape',
        hasTrafficLights: false,
        hasMainRoad: false,
        difficulty: 'easy',
        explanation: 'На Т-образном равнозначном перекрестке также действует правило помехи справа.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#3B82F6', direction: 'east', turn: 'straight', priority: 0, label: 'A', position: { x: 25, y: 50, rotation: 0 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#EF4444', direction: 'south', turn: 'left', priority: 1, label: 'B', position: { x: 50, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },
    {
        id: 'sc-mix-4',
        title: 'Трамвай и помеха справа',
        description: 'Сложный случай.',
        type: 'regular',
        hasTrafficLights: false,
        hasMainRoad: false,
        difficulty: 'expert',
        explanation: 'Трамвай на равнозначном всегда первый. Между машинами — помеха справа.',
        vehicles: [
            { id: 'v1', type: 'tram', color: '#DC2626', direction: 'west', turn: 'straight', priority: 3, label: 'T', position: { x: 75, y: 52, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#3B82F6', direction: 'north', turn: 'left', priority: 0, label: 'A', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 3 },
            { id: 'v3', type: 'car', color: '#10B981', direction: 'south', turn: 'straight', priority: 1, label: 'B', position: { x: 50, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 2 }
        ]
    },
    {
        id: 'sc-tl-4',
        title: 'Стрелка направо',
        description: 'Маневр под красный.',
        type: 'regular',
        hasTrafficLights: true,
        trafficLights: [{ position: 'west', state: 'red' }], // Special arrow imagined logic
        hasMainRoad: false,
        difficulty: 'hard',
        explanation: 'Стрелка с красным — уступи всем. Трамвай на зеленый — первый.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#F59E0B', direction: 'west', turn: 'right', priority: 0, label: 'A', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'tram', color: '#DC2626', direction: 'north', turn: 'straight', priority: 3, label: 'T', position: { x: 53, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },
    {
        id: 'sc-reg-4',
        title: 'Регулировщик: Спина',
        description: 'Движение запрещено.',
        type: 'regular',
        hasRegulator: true,
        regulatorSignal: 'hands-out', // Back to the car A
        hasTrafficLights: false,
        hasMainRoad: false,
        difficulty: 'medium',
        explanation: 'На спину регулировщика ехать нельзя никому и никогда.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#3B82F6', direction: 'north', turn: 'straight', priority: 0, label: 'A', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#EF4444', direction: 'east', turn: 'right', priority: 1, label: 'B', position: { x: 25, y: 50, rotation: 0 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    },
    {
        id: 'sc-comp-2',
        title: 'Главная и Трамвай',
        description: 'Сложное пересечение.',
        type: 'regular',
        hasMainRoad: true,
        mainRoadDirections: ['north', 'south'],
        hasTrafficLights: false,
        difficulty: 'expert',
        explanation: 'На главной дороге трамвай имеет приоритет. Второстепенная уступает всем.',
        vehicles: [
            { id: 'v1', type: 'tram', color: '#DC2626', direction: 'north', turn: 'straight', priority: 3, label: 'T', position: { x: 53, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#3B82F6', direction: 'south', turn: 'left', priority: 1, label: 'A', position: { x: 47, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v3', type: 'car', color: '#F97316', direction: 'west', turn: 'straight', priority: 0, label: 'B', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 3 }
        ]
    },
    {
        id: 'sc-round-3',
        title: 'Кольцо: Скорая',
        description: 'Въезд спецтранспорта.',
        type: 'roundabout',
        hasMainRoad: false,
        hasTrafficLights: false,
        difficulty: 'hard',
        explanation: 'Скорая заезжает на кольцо без очереди.',
        vehicles: [
            { id: 'v1', type: 'ambulance', color: '#FFFFFF', direction: 'north', turn: 'straight', priority: 2, label: 'S', position: { x: 50, y: 85, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#3B82F6', direction: 'east', turn: 'straight', priority: 1, label: 'A', position: { x: 60, y: 40, rotation: 45 }, isClicked: false, isCorrect: null, correctOrder: 2 }
        ]
    },
    {
        id: 'sc-mix-5',
        title: ' STOP и Поворот',
        description: 'Разъезд на главной.',
        type: 'regular',
        hasMainRoad: true,
        mainRoadDirections: ['north', 'west'],
        difficulty: 'expert',
        explanation: 'При повороте главной дороги те, кто на ней, разъезжаются по помехе справа.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#EC4899', direction: 'north', turn: 'right', priority: 1, label: 'A', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 },
            { id: 'v2', type: 'car', color: '#06B6D4', direction: 'west', turn: 'left', priority: 1, label: 'B', position: { x: 75, y: 50, rotation: 180 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v3', type: 'car', color: '#AFB42B', direction: 'east', turn: 'straight', priority: 0, label: 'C', position: { x: 25, y: 50, rotation: 0 }, isClicked: false, isCorrect: null, correctOrder: 3 }
        ]
    },
    {
        id: 'sc-tl-5',
        title: 'Светофор: Разворот',
        description: 'Сложный маневр.',
        type: 'regular',
        hasTrafficLights: true,
        trafficLights: [{ position: 'south', state: 'green' }, { position: 'north', state: 'green' }],
        hasMainRoad: false,
        difficulty: 'expert',
        explanation: 'При развороте на зеленый нужно уступить встречным, идущим прямо или направо.',
        vehicles: [
            { id: 'v1', type: 'car', color: '#3B82F6', direction: 'south', turn: 'left', priority: 0, label: 'A', position: { x: 50, y: 25, rotation: 90 }, isClicked: false, isCorrect: null, correctOrder: 2 },
            { id: 'v2', type: 'car', color: '#EF4444', direction: 'north', turn: 'straight', priority: 1, label: 'B', position: { x: 50, y: 75, rotation: -90 }, isClicked: false, isCorrect: null, correctOrder: 1 }
        ]
    }
];
// ... more to be added in chunks or via scripts if user confirms 20+ at once.
// I've added a solid set of various types now.
