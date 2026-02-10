// Легковесные вопросы для демо-дуэли на лендинге
// Короткие, понятные, визуально привлекательные

export interface DemoQuestion {
    id: number;
    text: string;
    textEn: string;
    answers: string[];
    answersEn: string[];
    correctIndex: number;
    emoji: string;
    signIcon: string; // Иконка дорожного знака
}

export const DEMO_QUESTIONS: DemoQuestion[] = [
    {
        id: 1,
        text: "С какой скоростью можно ехать при буксировке?",
        textEn: "Max speed when towing another vehicle?",
        answers: ["50 км/ч", "70 км/ч"],
        answersEn: ["50 km/h", "70 km/h"],
        correctIndex: 0,
        emoji: "⛓️",
        signIcon: "5️⃣0️⃣"
    },
    {
        id: 2,
        text: "Разрешено ли ехать на желтый сигнал светофора?",
        textEn: "Is it allowed to pass on yellow traffic light?",
        answers: ["Да, если нельзя остановиться без экстренного торможения", "Нет, желтый — это запрещающий сигнал"],
        answersEn: ["Yes, if stopping requires emergency braking", "No, yellow is strictly forbidden"],
        correctIndex: 0,
        emoji: "🚦",
        signIcon: "🟡"
    },
    {
        id: 3,
        text: "Разрешена ли остановка на автомагистрали?",
        textEn: "Is stopping allowed on the motorway?",
        answers: ["Да, на широкой обочине", "Нет, только на спец. площадках"],
        answersEn: ["Yes, on the shoulder", "No, only at rest areas"],
        correctIndex: 1,
        emoji: "🛣️",
        signIcon: "🅿️"
    },
    {
        id: 4,
        text: "При въезде на круг (знак 4.3) приоритет у:",
        textEn: "Entering a roundabout (sign 4.3), priority goes to:",
        answers: ["Въезжающего", "Того, кто на кругу"],
        answersEn: ["Entering vehicle", "Vehicle on the circle"],
        correctIndex: 1,
        emoji: "🔄",
        signIcon: "⭕"
    },
    {
        id: 5,
        text: "Детей на переднем сиденье без кресла можно возить с:",
        textEn: "Children can ride in front without a booster from:",
        answers: ["12 лет", "7 лет"],
        answersEn: ["12 years old", "7 years old"],
        correctIndex: 0,
        emoji: "👶",
        signIcon: "💺"
    }
];
