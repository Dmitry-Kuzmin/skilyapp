// =====================================================
// Переводы Telegram-бота (ru, en, es)
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type SupportedLanguage = 'ru' | 'en' | 'es';

// Определяем язык из Telegram language_code
export function normalizeLanguage(langCode?: string): SupportedLanguage {
    if (!langCode) return 'ru';

    const normalized = langCode.toLowerCase().split('-')[0];

    if (['ru', 'uk', 'be', 'kk'].includes(normalized)) return 'ru';
    if (['es', 'ca', 'gl'].includes(normalized)) return 'es';
    if (['en', 'de', 'fr', 'it', 'pt', 'nl'].includes(normalized)) return 'en';

    return 'ru'; // fallback
}

// Получить язык пользователя
export async function getUserLanguage(
    telegramId: number,
    telegramLangCode: string | undefined,
    supabase: SupabaseClient
): Promise<SupportedLanguage> {
    // Сначала проверяем профиль (явный выбор пользователя)
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('settings')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (profile?.settings?.language) {
            return profile.settings.language as SupportedLanguage;
        }
    } catch (e) {
        console.error('[getUserLanguage] Error:', e);
    }

    // Иначе используем Telegram language_code
    return normalizeLanguage(telegramLangCode);
}

// Словарь переводов
const translations: Record<string, Record<SupportedLanguage, string>> = {
    // =====================================================
    // /start - Приветствие
    // =====================================================
    'start.welcome.new': {
        ru: `<b>Привет, {name}!</b> 👋

Я — твой штурман в мире ПДД.

🏎 <b>Skily</b> — это не скучные тесты, а гонки, дуэли и прокачка.

<i>Тебя ждут 2000+ вопросов, AI-помощник и дуэли с друзьями.</i>

Готов сдать на права играючи?`,
        en: `<b>Hi, {name}!</b> 👋

I'm your navigator in the world of traffic rules.

🏎 <b>Skily</b> — not boring tests, but races, duels and leveling up.

<i>2000+ questions, AI assistant and duels with friends await you.</i>

Ready to get your license while having fun?`,
        es: `<b>¡Hola, {name}!</b> 👋

Soy tu navegador en el mundo de las normas de tráfico.

🏎 <b>Skily</b> — no son tests aburridos, sino carreras, duelos y mejoras.

<i>Te esperan más de 2000 preguntas, asistente IA y duelos con amigos.</i>

¿Listo para sacarte el carnet jugando?`
    },

    'start.welcome.returning': {
        ru: `<b>С возвращением, {name}!</b> 👋

{streakEmoji} Серия: <b>{streak} дней</b>
🎯 Готовность: <b>{readiness}%</b>

{motivation}`,
        en: `<b>Welcome back, {name}!</b> 👋

{streakEmoji} Streak: <b>{streak} days</b>
🎯 Readiness: <b>{readiness}%</b>

{motivation}`,
        es: `<b>¡Bienvenido de nuevo, {name}!</b> 👋

{streakEmoji} Racha: <b>{streak} días</b>
🎯 Preparación: <b>{readiness}%</b>

{motivation}`
    },

    'start.motivation.noStreak': {
        ru: '<i>Не дай серии остыть — позанимайся сегодня!</i>',
        en: '<i>Don\'t let the streak cool down — practice today!</i>',
        es: '<i>¡No dejes que la racha se enfríe — practica hoy!</i>'
    },

    'start.motivation.hasStreak': {
        ru: '<i>Отличная работа! Продолжай в том же духе.</i>',
        en: '<i>Great job! Keep up the good work.</i>',
        es: '<i>¡Excelente trabajo! Sigue así.</i>'
    },

    // =====================================================
    // /stats - Статистика
    // =====================================================
    'stats.title': {
        ru: '📊 <b>Твоя статистика</b>',
        en: '📊 <b>Your Statistics</b>',
        es: '📊 <b>Tus Estadísticas</b>'
    },

    'stats.readiness': {
        ru: '🎯 Готовность к экзамену: <b>{value}%</b>',
        en: '🎯 Exam readiness: <b>{value}%</b>',
        es: '🎯 Preparación para el examen: <b>{value}%</b>'
    },

    'stats.streak': {
        ru: '🔥 Серия дней: <b>{value}</b>',
        en: '🔥 Day streak: <b>{value}</b>',
        es: '🔥 Racha de días: <b>{value}</b>'
    },

    'stats.tests': {
        ru: '📝 Тесты:',
        en: '📝 Tests:',
        es: '📝 Tests:'
    },

    'stats.testsCompleted': {
        ru: '• Пройдено: {value}',
        en: '• Completed: {value}',
        es: '• Completados: {value}'
    },

    'stats.questionsAnswered': {
        ru: '• Вопросов: {value}',
        en: '• Questions: {value}',
        es: '• Preguntas: {value}'
    },

    'stats.correctAnswers': {
        ru: '• Правильных: {value} ({percent}%)',
        en: '• Correct: {value} ({percent}%)',
        es: '• Correctas: {value} ({percent}%)'
    },

    'stats.duels': {
        ru: '⚔️ Дуэли:',
        en: '⚔️ Duels:',
        es: '⚔️ Duelos:'
    },

    'stats.duelsPlayed': {
        ru: '• Сыграно: {value}',
        en: '• Played: {value}',
        es: '• Jugados: {value}'
    },

    'stats.lastTest': {
        ru: '🕐 Последний тест: {date}',
        en: '🕐 Last test: {date}',
        es: '🕐 Último test: {date}'
    },

    'stats.noProfile': {
        ru: '❌ Профиль не найден. Сначала откройте приложение через /start',
        en: '❌ Profile not found. First open the app via /start',
        es: '❌ Perfil no encontrado. Primero abre la app con /start'
    },

    'stats.noStats': {
        ru: '📊 У тебя пока нет статистики. Начни обучение в приложении!',
        en: '📊 No statistics yet. Start learning in the app!',
        es: '📊 Aún no tienes estadísticas. ¡Empieza a aprender en la app!'
    },

    // =====================================================
    // /duel - Дуэли
    // =====================================================
    'duel.title': {
        ru: '⚔️ <b>Дуэли на Skilyapp</b>',
        en: '⚔️ <b>Duels on Skilyapp</b>',
        es: '⚔️ <b>Duelos en Skilyapp</b>'
    },

    'duel.description': {
        ru: `Создавай дуэль, кидай код другу и сражайся прямо в приложении.
Все дуэли, рейтинги и реванши теперь на <a href="{url}/duels">skilyapp.com/duels</a>.

Выбери действие ниже или жми "Создать дуэль", чтобы открыть веб-приложение. 🚀`,
        en: `Create a duel, share the code with a friend and battle in the app.
All duels, ratings and rematches are at <a href="{url}/duels">skilyapp.com/duels</a>.

Choose an action below or tap "Create duel" to open the web app. 🚀`,
        es: `Crea un duelo, comparte el código con un amigo y lucha en la app.
Todos los duelos, rankings y revanchas en <a href="{url}/duels">skilyapp.com/duels</a>.

Elige una acción o toca "Crear duelo" para abrir la app. 🚀`
    },

    'duel.invite': {
        ru: `⚔️ <b>Вызов на дуэль!</b>

Чтобы бросить вызов, напиши в любом чате:

<code>@skilyapp_bot дуэль</code>

Я создам красивую карточку с приглашением! 🎴

После выбора — твой друг откроет приложение и примет вызов.`,
        en: `⚔️ <b>Duel Challenge!</b>

To challenge someone, write in any chat:

<code>@skilyapp_bot duel</code>

I'll create a beautiful invite card! 🎴

After selection — your friend will open the app and accept the challenge.`,
        es: `⚔️ <b>¡Reto a duelo!</b>

Para retar a alguien, escribe en cualquier chat:

<code>@skilyapp_bot duelo</code>

¡Crearé una tarjeta de invitación bonita! 🎴

Después de seleccionar — tu amigo abrirá la app y aceptará el reto.`
    },

    // =====================================================
    // /help - Помощь
    // =====================================================
    'help.title': {
        ru: '❓ <b>Помощь</b>',
        en: '❓ <b>Help</b>',
        es: '❓ <b>Ayuda</b>'
    },

    'help.commands': {
        ru: `<b>Доступные команды:</b>
/start — Главное меню
/stats — Твоя статистика
/duel — Начать дуэль
/streak — Серия дней
/settings — Настройки
/help — Эта справка`,
        en: `<b>Available commands:</b>
/start — Main menu
/stats — Your statistics
/duel — Start a duel
/streak — Day streak
/settings — Settings
/help — This help`,
        es: `<b>Comandos disponibles:</b>
/start — Menú principal
/stats — Tus estadísticas
/duel — Iniciar un duelo
/streak — Racha de días
/settings — Configuración
/help — Esta ayuda`
    },

    'help.about': {
        ru: '<b>О приложении:</b>\nSkilyapp — это современная подготовка к экзамену DGT с дуэлями, челленджами и прогрессом.',
        en: '<b>About:</b>\nSkilyapp — modern DGT exam preparation with duels, challenges and progress tracking.',
        es: '<b>Acerca de:</b>\nSkilyapp — preparación moderna para el examen DGT con duelos, desafíos y seguimiento de progreso.'
    },

    'help.support': {
        ru: '<b>Поддержка:</b>\nЕсли возникли вопросы, напиши {contact}',
        en: '<b>Support:</b>\nIf you have questions, contact {contact}',
        es: '<b>Soporte:</b>\nSi tienes preguntas, contacta a {contact}'
    },

    // =====================================================
    // /settings - Настройки
    // =====================================================
    'settings.title': {
        ru: '⚙️ <b>Настройки</b>',
        en: '⚙️ <b>Settings</b>',
        es: '⚙️ <b>Configuración</b>'
    },

    'settings.description': {
        ru: 'Настрой уведомления и параметры бота под себя.',
        en: 'Customize notifications and bot settings.',
        es: 'Personaliza las notificaciones y configuración del bot.'
    },

    // =====================================================
    // /streak - Серия
    // =====================================================
    'streak.title': {
        ru: '🔥 <b>Серия дней</b>',
        en: '🔥 <b>Day Streak</b>',
        es: '🔥 <b>Racha de Días</b>'
    },

    'streak.noStreak': {
        ru: `У тебя пока нет активной серии.

Начни заниматься каждый день, чтобы:
• Получать бонусы
• Улучшать результаты
• Быстрее подготовиться к экзамену

Начни прямо сейчас! 💪`,
        en: `You don't have an active streak yet.

Start practicing every day to:
• Earn bonuses
• Improve results
• Prepare faster for the exam

Start now! 💪`,
        es: `Aún no tienes una racha activa.

Empieza a practicar cada día para:
• Ganar bonos
• Mejorar resultados
• Prepararte más rápido para el examen

¡Empieza ahora! 💪`
    },

    'streak.current': {
        ru: '🔥 <b>Серия: {days} {daysWord}</b>',
        en: '🔥 <b>Streak: {days} days</b>',
        es: '🔥 <b>Racha: {days} días</b>'
    },

    'streak.todayActive': {
        ru: '✅ Сегодня ты уже позанимался',
        en: '✅ You already practiced today',
        es: '✅ Ya practicaste hoy'
    },

    'streak.todayInactive': {
        ru: '⏰ Не забудь позаниматься сегодня!',
        en: '⏰ Don\'t forget to practice today!',
        es: '⏰ ¡No olvides practicar hoy!'
    },

    'streak.motivation.30': {
        ru: 'Невероятно! 🏆',
        en: 'Incredible! 🏆',
        es: '¡Increíble! 🏆'
    },

    'streak.motivation.14': {
        ru: 'Отличный результат! 🌟',
        en: 'Great result! 🌟',
        es: '¡Gran resultado! 🌟'
    },

    'streak.motivation.7': {
        ru: 'Так держать! 💪',
        en: 'Keep it up! 💪',
        es: '¡Sigue así! 💪'
    },

    'streak.motivation.0': {
        ru: 'Хорошее начало! 👍',
        en: 'Good start! 👍',
        es: '¡Buen comienzo! 👍'
    },

    // =====================================================
    // Профиль
    // =====================================================
    'profile.title': {
        ru: '👤 <b>Твой профиль</b>',
        en: '👤 <b>Your Profile</b>',
        es: '👤 <b>Tu Perfil</b>'
    },

    'profile.rank': {
        ru: 'Ранг',
        en: 'Rank',
        es: 'Rango'
    },

    'profile.readiness': {
        ru: '🎯 Готовность',
        en: '🎯 Readiness',
        es: '🎯 Preparación'
    },

    'profile.streak': {
        ru: '🔥 Серия',
        en: '🔥 Streak',
        es: '🔥 Racha'
    },

    'profile.tests': {
        ru: '📝 Тесты',
        en: '📝 Tests',
        es: '📝 Tests'
    },

    'profile.duels': {
        ru: '⚔️ Дуэли',
        en: '⚔️ Duels',
        es: '⚔️ Duelos'
    },

    'profile.accuracy': {
        ru: '✓ Точность',
        en: '✓ Accuracy',
        es: '✓ Precisión'
    },

    'profile.detailedStats': {
        ru: '📊 Детальная статистика',
        en: '📊 Detailed Statistics',
        es: '📊 Estadísticas Detalladas'
    },

    // Ранги
    'rank.novice': {
        ru: 'Новичок',
        en: 'Novice',
        es: 'Novato'
    },

    'rank.student': {
        ru: 'Ученик',
        en: 'Student',
        es: 'Estudiante'
    },

    'rank.advanced': {
        ru: 'Продвинутый',
        en: 'Advanced',
        es: 'Avanzado'
    },

    'rank.expert': {
        ru: 'Эксперт',
        en: 'Expert',
        es: 'Experto'
    },

    'rank.master': {
        ru: 'Мастер',
        en: 'Master',
        es: 'Maestro'
    },

    // =====================================================
    // Inline Query результаты
    // =====================================================
    'inline.article.button': {
        ru: '📖 Читать статью',
        en: '📖 Read article',
        es: '📖 Leer artículo'
    },

    'inline.duel.title': {
        ru: '⚔️ Вызов на дуэль!',
        en: '⚔️ Duel Challenge!',
        es: '⚔️ ¡Reto a duelo!'
    },

    'inline.duel.description': {
        ru: 'Прими вызов и сразись со мной!',
        en: 'Accept the challenge and battle me!',
        es: '¡Acepta el reto y enfréntate a mí!'
    },

    'inline.duel.button': {
        ru: '🎮 Принять вызов!',
        en: '🎮 Accept Challenge!',
        es: '🎮 ¡Aceptar Reto!'
    },

    // =====================================================
    // Кнопки клавиатуры
    // =====================================================
    'keyboard.openApp': {
        ru: '🚀 Открыть Skily',
        en: '🚀 Open Skily',
        es: '🚀 Abrir Skily'
    },

    'keyboard.profile': {
        ru: '👤 Профиль',
        en: '👤 Profile',
        es: '👤 Perfil'
    },

    'keyboard.challengeFriend': {
        ru: '⚔️ Вызвать друга',
        en: '⚔️ Challenge Friend',
        es: '⚔️ Retar Amigo'
    },

    'keyboard.backToMenu': {
        ru: '← Назад в меню',
        en: '← Back to menu',
        es: '← Volver al menú'
    },

    'keyboard.notifications': {
        ru: '🔔 Уведомления',
        en: '🔔 Notifications',
        es: '🔔 Notificaciones'
    },

    'keyboard.language': {
        ru: '🌍 Язык',
        en: '🌍 Language',
        es: '🌍 Idioma'
    },

    // =====================================================
    // Tips - Советы
    // =====================================================
    'tips.title': {
        ru: '🧠 <b>Учебные советы Skily</b>',
        en: '🧠 <b>Skily Study Tips</b>',
        es: '🧠 <b>Consejos de Estudio Skily</b>'
    },

    'tips.unavailable': {
        ru: '🧠 Советы временно недоступны. Загляни позже — я пополню базу!',
        en: '🧠 Tips temporarily unavailable. Check back later!',
        es: '🧠 Consejos no disponibles temporalmente. ¡Vuelve más tarde!'
    },

    'tips.intro': {
        ru: 'Выбери тему, а я дам короткий инсайт, который помогает на тестах и в реальных сценариях. Никакой воды — только практика.',
        en: 'Choose a topic and I\'ll give you a quick insight that helps on tests and in real scenarios. No fluff — just practice.',
        es: 'Elige un tema y te daré un consejo rápido que ayuda en los tests y en escenarios reales. Sin relleno — solo práctica.'
    },

    // =====================================================
    // Уведомления о настройках языка
    // =====================================================
    'language.changed': {
        ru: '✅ Язык изменён: Русский',
        en: '✅ Language changed: English',
        es: '✅ Idioma cambiado: Español'
    },

    // =====================================================
    // Дни (склонение для русского)
    // =====================================================
    'days.one': {
        ru: 'день',
        en: 'day',
        es: 'día'
    },

    'days.few': {
        ru: 'дня',
        en: 'days',
        es: 'días'
    },

    'days.many': {
        ru: 'дней',
        en: 'days',
        es: 'días'
    },

    // =====================================================
    // Оплата Stars
    // =====================================================
    'stars.invoice.title': {
        ru: '🌟 <b>Оплата Telegram Stars</b>',
        en: '🌟 <b>Telegram Stars Payment</b>',
        es: '🌟 <b>Pago con Telegram Stars</b>'
    },
    'stars.invoice.description': {
        ru: `Оплата через Stars — это очень просто! Это самый быстрый способ получить Premium прямо сейчас:

1. Просто выбери тариф ниже.
2. Откроется стандартное окно Telegram для подтверждения платежа.
3. Подтверди оплату, и доступ к Premium-функциям активируется <b>автоматически!</b>

🎯 <i>Если у тебя недостаточно звезд, Telegram предложит докупить их прямо в процессе оплаты.</i>`,
        en: `Paying with Stars is very simple! It's the fastest way to get Premium right now:

1. Just choose a plan below.
2. A standard Telegram window will open to confirm the payment.
3. Confirm the payment, and access to Premium features will be activated <b>automatically!</b>

🎯 <i>If you don't have enough stars, Telegram will offer to buy more during the payment process.</i>`,
        es: `¡Pagar con Stars es muy sencillo! Es la forma más rápida de obtener Premium ahora mismo:

1. Solo elige un plan a continuación.
2. Se abrirá una ventana estándar de Telegram para confirmar el pago.
3. Confirma el pago y el acceso a las funciones Premium se activará <b>¡automáticamente!</b>

🎯 <i>Si no tienes suficientes estrellas, Telegram te ofrecerá comprar más durante el proceso de pago.</i>`
    },
    'stars.invoice.back': {
        ru: '← Другие способы оплаты',
        en: '← Other payment methods',
        es: '← Otros métodos de pago'
    },

    'boostShop.payment.selectorTitle': {
        ru: 'Выбери способ оплаты',
        en: 'Choose Payment Method',
        es: 'Elige el método de pago'
    },
    'boostShop.payment.starsSubtitle': {
        ru: 'Мгновенно через Telegram Stars',
        en: 'Instant via Telegram Stars',
        es: 'Instantáneo vía Telegram Stars'
    },
    'boostShop.payment.tonSubtitle': {
        ru: 'Через Tonkeeper или Wallet',
        en: 'Via Tonkeeper or Wallet',
        es: 'Vía Tonkeeper o Wallet'
    },
    'boostShop.payment.cryptoSubtitle': {
        ru: 'BTC, USDT, ETH и другие',
        en: 'BTC, USDT, ETH and more',
        es: 'BTC, USDT, ETH y más'
    },
    'boostShop.payment.cardTitle': {
        ru: 'Банковская карта',
        en: 'Bank Card',
        es: 'Tarjeta bancaria'
    },
    'boostShop.payment.cardSubtitle': {
        ru: 'Visa, Mastercard, Stripe',
        en: 'Visa, Mastercard, Stripe',
        es: 'Visa, Mastercard, Stripe'
    },
};

// Функция перевода
export function t(
    key: string,
    lang: SupportedLanguage,
    params: Record<string, string | number> = {}
): string {
    const translation = translations[key]?.[lang] || translations[key]?.['ru'] || key;

    // Подстановка параметров
    return Object.entries(params).reduce(
        (str, [key, value]) => str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
        translation
    );
}

// Склонение слова "день" для русского
export function getDaysWord(count: number, lang: SupportedLanguage): string {
    if (lang !== 'ru') {
        return count === 1 ? t('days.one', lang) : t('days.few', lang);
    }

    const cases = [2, 0, 1, 1, 1, 2];
    const titles = [t('days.one', lang), t('days.few', lang), t('days.many', lang)];
    return titles[
        count % 100 > 4 && count % 100 < 20
            ? 2
            : cases[count % 10 < 5 ? count % 10 : 5]
    ];
}
// Форматирование Markdown в HTML для Telegram
export function formatMarkdown(text: string): string {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold: **text** -> <b>$1</b>
        .replace(/\*(.*?)\*/g, '<i>$1</i>');    // Italic: *text* -> <i>$1</i>
}
