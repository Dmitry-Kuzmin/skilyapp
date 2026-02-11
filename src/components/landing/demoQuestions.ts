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
        text: "Можно ли обгонять на пешеходном переходе?",
        textEn: "Can you overtake at a pedestrian crossing?",
        answers: ["Да, если нет людей", "Нет, запрещено"],
        answersEn: ["Yes, if no people", "No, forbidden"],
        correctIndex: 1,
        emoji: "🚶",
        signIcon: "🚷"
    },
    {
        id: 2,
        text: "Максимальная скорость в городе:",
        textEn: "Maximum speed in the city:",
        answers: ["50 км/ч", "60 км/ч"],
        answersEn: ["50 km/h", "60 km/h"],
        correctIndex: 0,
        emoji: "🏙️",
        signIcon: "🚗"
    },
    {
        id: 3,
        text: "Этот знак означает:",
        textEn: "This sign means:",
        answers: ["Главная дорога", "Уступи дорогу"],
        answersEn: ["Priority road", "Give way"],
        correctIndex: 1,
        emoji: "⚠️",
        signIcon: "⛔"
    },
    {
        id: 4,
        text: "Разрешен ли разворот на мосту?",
        textEn: "Is U-turn allowed on a bridge?",
        answers: ["Да", "Нет"],
        answersEn: ["Yes", "No"],
        correctIndex: 1,
        emoji: "🌉",
        signIcon: "↩️"
    },
    {
        id: 5,
        text: "Когда включать ближний свет?",
        textEn: "When to turn on low beam?",
        answers: ["Только ночью", "Всегда при движении"],
        answersEn: ["Only at night", "Always when driving"],
        correctIndex: 1,
        emoji: "💡",
        signIcon: "🔦"
    }
];
