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

// Словарь анимированных эмодзи
export const E = {
    star: '<tg-emoji emoji-id="6005661956931850799">⭐️</tg-emoji>',
    battery: '<tg-emoji emoji-id="4904626998745237074">🔋</tg-emoji>',
    check: '<tg-emoji emoji-id="5123163417326126159">✅</tg-emoji>',
    dislike: '<tg-emoji emoji-id="5121063440311386962">👎</tg-emoji>',
    click: '<tg-emoji emoji-id="4918408122868958076">🖱️</tg-emoji>',
    foot: '<tg-emoji emoji-id="4918465056955434053">🦶</tg-emoji>',
    helicopter: '<tg-emoji emoji-id="4916090902113420509">🚁</tg-emoji>',
    neutral: '<tg-emoji emoji-id="5105344272324887540">😐</tg-emoji>',
    lock: '<tg-emoji emoji-id="4904500559203009298">🔒</tg-emoji>',
    sparkles: '<tg-emoji emoji-id="4911241630633165627">✨</tg-emoji>',
    new: '<tg-emoji emoji-id="4918438965029110683">🆕</tg-emoji>',
    bell: '<tg-emoji emoji-id="4915820259044230152">🔔</tg-emoji>',
    bellOff: '<tg-emoji emoji-id="4918087434840834979">🔕</tg-emoji>',
    link: '<tg-emoji emoji-id="4916086774649848789">🔗</tg-emoji>',
    block: '<tg-emoji emoji-id="4918014360267260850">⛔️</tg-emoji>',
    diamond: '<tg-emoji emoji-id="5462902520215002477">💎</tg-emoji>',
    rocket: '<tg-emoji emoji-id="5188481279963715781">🚀</tg-emoji>',
    stats: '<tg-emoji emoji-id="5190806721286657692">📊</tg-emoji>',
    exchange: '<tg-emoji emoji-id="5312441427764989435">💱</tg-emoji>',
    calendar: '<tg-emoji emoji-id="5274055917766202507">🗓</tg-emoji>',
    tag: '<tg-emoji emoji-id="5240228673738527951">🏷</tg-emoji>',
    money: '<tg-emoji emoji-id="5287231198098117669">💰</tg-emoji>',
    card: '<tg-emoji emoji-id="5445353829304387411">💳</tg-emoji>',
    coin: '<tg-emoji emoji-id="5379773896352355687">🪙</tg-emoji>',
    hundred: '<tg-emoji emoji-id="5307495098613773492">💯</tg-emoji>',
    tired: '<tg-emoji emoji-id="5307866755018798904">😫</tg-emoji>',
    facepalm: '<tg-emoji emoji-id="5307819226910700816">🤦‍♂️</tg-emoji>',
    shocked: '<tg-emoji emoji-id="5251397349644706382">🫢</tg-emoji>',
    invisible: '<tg-emoji emoji-id="5246885387716011812">🫥</tg-emoji>',
    welcome: '👋',
};

// Словарь переводов
const translations: Record<string, Record<SupportedLanguage, string>> = {
    // =====================================================
    // /start - Приветствие
    // =====================================================
    'start.welcome.new': {
        ru: `<b>Привет, {name}!</b> ${E.welcome}\n\nЯ — твой штурман в мире ПДД.\n\n${E.helicopter} <b>Skily</b> — это не скучные тесты, а гонки, дуэли и прокачка.\n\n<i>Тебя ждут 2000+ вопросов, AI-помощник и дуэли с друзьями.</i>\n\nГотов сдать на права играючи?`,
        en: `<b>Hi, {name}!</b> ${E.welcome}\n\nI'm your navigator in the world of traffic rules.\n\n${E.helicopter} <b>Skily</b> — not boring tests, but races, duels and leveling up.\n\n<i>2000+ questions, AI assistant and duels with friends await you.</i>\n\nReady to get your license while having fun?`,
        es: `<b>¡Hola, {name}!</b> ${E.welcome}\n\nSoy tu navegador en el mundo de las normas de tráfico.\n\n${E.helicopter} <b>Skily</b> — no son tests aburridos, sino carreras, duelos y mejoras.\n\n<i>Te esperan más de 2000 preguntas, asistente IA y duelos con amigos.</i>\n\n¿Listo para sacarte el carnet jugando?`
    },

    'start.welcome.returning': {
        ru: `<b>С возвращением, {name}!</b> ${E.welcome}\n\n{streakEmoji} Серия: <b>{streak} дней</b>\n🎯 Готовность: <b>{readiness}%</b>\n\n{motivation}`,
        en: `<b>Welcome back, {name}!</b> ${E.welcome}\n\n{streakEmoji} Streak: <b>{streak} days</b>\n🎯 Readiness: <b>{readiness}%</b>\n\n{motivation}`,
        es: `<b>¡Bienvenido de nuevo, {name}!</b> ${E.welcome}\n\n{streakEmoji} Racha: <b>{streak} días</b>\n🎯 Preparación: <b>{readiness}%</b>\n\n{motivation}`
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
        ru: `${E.stats} <b>Твоя статистика</b>`,
        en: `${E.stats} <b>Your Statistics</b>`,
        es: `${E.stats} <b>Tus Estadísticas</b>`
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
        ru: `${E.stats} У тебя пока нет статистики. Начни обучение в приложении!`,
        en: `${E.stats} No statistics yet. Start learning in the app!`,
        es: `${E.stats} Aún no tienes estadísticas. ¡Empieza a aprender en la app!`
    },

    // =====================================================
    // /duel - Дуэли
    // =====================================================
    'duel.title': {
        ru: `⚔️ <b>Дуэли на Skilyapp</b>`,
        en: `⚔️ <b>Duels on Skilyapp</b>`,
        es: `⚔️ <b>Duelos en Skilyapp</b>`
    },

    'duel.description': {
        ru: `Создавай дуэль, кидай код другу и сражайся прямо в приложении.\nВсе дуэли, рейтинги и реванши теперь на <a href="{url}/duels">skilyapp.com/duels</a>.\n\nВыбери действие ниже или жми "Создать дуэль", чтобы открыть веб-приложение. ${E.rocket}`,
        en: `Create a duel, share the code with a friend and battle in the app.\nAll duels, ratings and rematches are at <a href="{url}/duels">skilyapp.com/duels</a>.\n\nChoose an action below or tap "Create duel" to open the web app. ${E.rocket}`,
        es: `Crea un duelo, comparte el código con un amigo y lucha en la app.\nTodos los duelos, rankings y revanchas en <a href="{url}/duels">skilyapp.com/duels</a>.\n\nElige una acción o toca "Crear duelo" para abrir la app. ${E.rocket}`
    },

    'duel.invite': {
        ru: `⚔️ <b>Вызов на дуэль!</b>\n\nЧтобы бросить вызов, напиши в любом чате:\n\n<code>@skilyapp_bot дуэль</code>\n\nЯ создам красивую карточку с приглашением! 🎴\n\nПосле выбора — твой друг откроет приложение и примет вызов.`,
        en: `⚔️ <b>Duel Challenge!</b>\n\nTo challenge someone, write in any chat:\n\n<code>@skilyapp_bot duel</code>\n\nI'll create a beautiful invite card! 🎴\n\nAfter selection — your friend will open the app and accept the challenge.`,
        es: `⚔️ <b>¡Reto a duelo!</b>\n\nPara retar a alguien, escribe en cualquier chat:\n\n<code>@skilyapp_bot duelo</code>\n\n¡Crearé una tarjeta de invitación bonita! 🎴\n\nПосле выбора — твой друг откроет приложение и примет вызов.`
    },

    // =====================================================
    // /help - Помощь
    // =====================================================
    'help.title': {
        ru: `${E.neutral} <b>Помощь</b>`,
        en: `${E.neutral} <b>Help</b>`,
        es: `${E.neutral} <b>Ayuda</b>`
    },

    'help.commands': {
        ru: `<b>Доступные команды:</b>\n/start — Главное меню\n/stats — Твоя статистика\n/duel — Начать дуэль\n/streak — Серия дней\n/settings — Настройки\n/help — Эта справка`,
        en: `<b>Available commands:</b>\n/start — Main menu\n/stats — Your statistics\n/duel — Start a duel\n/streak — Day streak\n/settings — Settings\n/help — This help`,
        es: `<b>Comandos disponibles:</b>\n/start — Menú principal\n/stats — Tus estadísticas\n/duel — Iniciar un duelo\n/streak — Racha de días\n/settings — Configuración\n/help — Esta ayuda`
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
        ru: `${E.sparkles} <b>Настройки</b>`,
        en: `${E.sparkles} <b>Settings</b>`,
        es: `${E.sparkles} <b>Configuración</b>`
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
        ru: `У тебя пока нет активной серии.\n\nНачни заниматься каждый день, чтобы:\n• Получать бонусы\n• Улучшать результаты\n• Быстрее подготовиться к экзамену\n\nНачни прямо сейчас! ${E.battery}`,
        en: `You don't have an active streak yet.\n\nStart practicing every day to:\n• Earn bonuses\n• Improve results\n• Prepare faster for the exam\n\nStart now! ${E.battery}`,
        es: `Aún no tienes una racha activa.\n\nEmpieza a practicar cada día para:\n• Ganar bonos\n• Mejorar resultados\n• Prepararte más rápido para el examen\n\n¡Empieza ahora! ${E.battery}`
    },

    'streak.current': {
        ru: '🔥 <b>Серия: {days} {daysWord}</b>',
        en: '🔥 <b>Streak: {days} days</b>',
        es: '🔥 <b>Racha: {days} días</b>'
    },

    'streak.todayActive': {
        ru: `${E.check} Сегодня ты уже позанимался`,
        en: `${E.check} You already practiced today`,
        es: `${E.check} Ya practicaste hoy`
    },

    'streak.todayInactive': {
        ru: '⏰ Не забудь позаниматься сегодня!',
        en: '⏰ Don\'t forget to practice today!',
        es: '⏰ ¡No olvides practicar hoy!'
    },

    'streak.motivation.30': {
        ru: `Невероятно! ${E.hundred}`,
        en: `Incredible! ${E.hundred}`,
        es: `¡Increíble! ${E.hundred}`
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
        ru: `${E.welcome} <b>Твой профиль</b>`,
        en: `${E.welcome} <b>Your Profile</b>`,
        es: `${E.welcome} <b>Tu Perfil</b>`
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
        ru: `${E.check} Точность`,
        en: `${E.check} Accuracy`,
        es: `${E.check} Precisión`
    },

    'profile.detailedStats': {
        ru: `${E.stats} Детальная статистика`,
        en: `${E.stats} Detailed Statistics`,
        es: `${E.stats} Estadísticas Detalladas`
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
        ru: `${E.welcome} Профиль`,
        en: `${E.welcome} Profile`,
        es: `${E.welcome} Perfil`
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
        ru: `${E.bell} Уведомления`,
        en: `${E.bell} Notifications`,
        es: `${E.bell} Notificaciones`
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
        es: 'Elige un tema y te daré un consejo rápido que ayuda en los tests и в escenarios reales. Sin relleno — solo práctica.'
    },

    // =====================================================
    // Уведомления о настройках языка
    // =====================================================
    'language.changed': {
        ru: `${E.check} Язык изменён: Русский`,
        en: `${E.check} Language changed: English`,
        es: `${E.check} Idioma cambiado: Español`
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
        ru: `${E.star} <b>Оплата Telegram Stars</b>`,
        en: `${E.star} <b>Telegram Stars Payment</b>`,
        es: `${E.star} <b>Pago con Telegram Stars</b>`
    },
    'stars.invoice.description': {
        ru: `Оплата через Stars — это очень просто! Это самый быстрый способ получить Premium прямо сейчас:\n\n1. Просто выбери тариф ниже.\n2. Откроется стандартное окно Telegram для подтверждения платежа.\n3. Подтверди оплату, и доступ к Premium-функциям активируется <b>автоматически!</b>\n\n${E.click} <i>Если у тебя недостаточно звезд, Telegram предложит докупить их прямо в процессе оплаты.</i>`,
        en: `Paying with Stars is very simple! It's the fastest way to get Premium right now:\n\n1. Just choose a plan below.\n2. A standard Telegram window will open to confirm the payment.\n3. Confirm the payment, and access to Premium features will be activated <b>automatically!</b>\n\n${E.click} <i>If you don't have enough stars, Telegram will offer to buy more during the payment process.</i>`,
        es: `¡Pagar con Stars es muy sencillo! Es la forma más rápida de obtener Premium ahora mismo:\n\n1. Solo elige un plan a continuación.\n2. Se abrirá una ventana estándar de Telegram para confirmar el pago.\n3. Confirma el pago и el acceso a las funciones Premium se activará <b>¡automáticamente!</b>\n\n${E.click} <i>Si no tienes suficientes estrellas, Telegram te ofrecerá comprar más durante el proceso de pago.</i>`
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
        .replace(/\\*\\*(.*?)\\*\\*/g, '<b>$1</b>') // Bold: **text** -> <b>$1</b>
        .replace(/\\*(.*?)\\*/g, '<i>$1</i>');    // Italic: *text* -> <i>$1</i>
}
