export interface LoadingPhrase {
    text: string;
    icon: 'Zap' | 'Shield' | 'Trophy' | 'Sparkles' | 'Clock' | 'Target';
}

export interface LoadingPhrases {
    [key: string]: LoadingPhrase[];
}

export const loadingPhrasesByLang: LoadingPhrases = {
    ru: [
        { text: "Секрет Skily: Банк ошибок запоминает все сложные вопросы для повторения.", icon: 'Shield' },
        { text: "Лайфхак: В Дуэлях можно использовать бусты, чтобы замедлить соперника.", icon: 'Zap' },
        { text: "А вы знали? Ежедневная серия (Streak) дает бонус к лиге и монетам.", icon: 'Target' },
        { text: "Совет: AI-Наставнику можно задавать любые вопросы по правилам.", icon: 'Sparkles' },
        { text: "Фишка: Режим мастера открывает доступ к секретным достижениям профиля.", icon: 'Trophy' },
        { text: "Тренируйте рефлексы в мини-играх — это помогает быстрее принимать решения.", icon: 'Clock' },
        { text: "Приглашайте друзей и получайте % от их выигрышей в турнирах.", icon: 'Zap' },
        { text: "СИНХРОНИЗАЦИЯ... Активируем нейронные связи для лучшего обучения...", icon: 'Sparkles' },
        { text: "ЗАГРУЗКА ЯДРА... Настраиваем систему под ваш стиль вождения...", icon: 'Shield' }
    ],
    es: [
        { text: "Secreto Skily: El Banco de Errores guarda tus fallos para practicar mejor.", icon: 'Shield' },
        { text: "Hack: En los Duelos puedes usar potenciadores para retrasar a tu rival.", icon: 'Zap' },
        { text: "¿Sabías que? La racha diaria otorga bonos extra de liga y monedas.", icon: 'Target' },
        { text: "Consejo: Puedes preguntar a la IA cualquier duda sobre las normas.", icon: 'Sparkles' },
        { text: "Detalle: El Modo Maestro desbloquea logros secretos en tu perfil.", icon: 'Trophy' },
        { text: "Entrena tus reflejos en los minijuegos para decidir más rápido.", icon: 'Clock' },
        { text: "Invita amigos y gana un % de sus premios en los torneos.", icon: 'Zap' },
        { text: "SINCRONIZANDO... Activando conexiones neuronales para aprender...", icon: 'Sparkles' },
        { text: "CARGANDO NÚCLEO... Adaptando el sistema a tu estilo de conducción...", icon: 'Shield' }
    ],
    en: [
        { text: "Skily Secret: The Mistake Bank collects your flaws for targeted practice.", icon: 'Shield' },
        { text: "Hack: Use boosts in Duels to slow down your opponent.", icon: 'Zap' },
        { text: "Did you know? Daily Streak grants league and coin bonuses.", icon: 'Target' },
        { text: "Tip: You can ask the AI Mentor any question about the rules.", icon: 'Sparkles' },
        { text: "Feature: Master Mode unlocks secret achievements for your profile.", icon: 'Trophy' },
        { text: "Train your reflexes in minigames to make faster decisions.", icon: 'Clock' },
        { text: "Invite friends and earn a % of their tournament winnings.", icon: 'Zap' },
        { text: "SYNCHRONIZING... Activating neural connections for better learning...", icon: 'Sparkles' },
        { text: "LOADING CORE... Adjusting the system to your driving style...", icon: 'Shield' }
    ]
};
