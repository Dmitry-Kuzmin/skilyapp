// =====================================================
// Inline клавиатуры для Telegram-бота
// =====================================================

import { InlineKeyboardMarkup } from './types.ts';

// URL Mini App / Web (обновлено на прод-домен)
const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';
const DUELS_URL = `${MINI_APP_URL}/duels`;
const PROGRESS_URL = `${MINI_APP_URL}/progress`;
const SUPPORT_URL = Deno.env.get('SUPPORT_URL') || `${MINI_APP_URL}/support`;
const LANGUAGE_URL = `${MINI_APP_URL}/settings/language`;
const QUIET_HOURS_URL = `${MINI_APP_URL}/settings/quiet-hours`;
const NOTIFICATIONS_URL = `${MINI_APP_URL}/settings/notifications`;

// =====================================================
// Главное меню
// =====================================================
export function getMainMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { 
          text: '🚀 Открыть Skilyapp', 
          web_app: { url: MINI_APP_URL } 
        }
      ],
      [
        { text: '📊 Моя статистика', callback_data: 'stats' },
        { text: '🔥 Серия дней', callback_data: 'streak' }
      ],
      [
        { text: '⚔️ Начать дуэль', callback_data: 'duel_create' },
        { text: '📚 Прогресс', callback_data: 'progress' }
      ],
      [
        { text: '⚙️ Настройки', callback_data: 'settings' },
        { text: '❓ Помощь', callback_data: 'help' }
      ]
    ]
  };
}

// =====================================================
// Меню дуэлей
// =====================================================
export function getDuelMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '⚔️ Создать дуэль', web_app: { url: `${DUELS_URL}?mode=create` } }
      ],
      [
        { text: '📜 Мои дуэли', web_app: { url: `${DUELS_URL}?mode=list` } },
        { text: '🏆 Рейтинг', web_app: { url: `${DUELS_URL}?mode=leaderboard` } }
      ],
      [
        { text: '« Назад', callback_data: 'main_menu' }
      ]
    ]
  };
}

// =====================================================
// Кнопка с deep link в дуэль
// =====================================================
export function getDuelDeepLinkKeyboard(duelId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { 
          text: '⚔️ Открыть дуэль', 
          web_app: { url: `${DUELS_URL}?code=${duelId}` } 
        }
      ],
      [
        { text: '🔄 Реванш', callback_data: 'duel_create' }
      ],
      [
        { text: '« Главное меню', callback_data: 'main_menu' }
      ]
    ]
  };
}

// =====================================================
// Меню настроек
// =====================================================
export function getSettingsKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🔔 В боте', callback_data: 'settings_notifications' },
        { text: '🌐 На сайте', web_app: { url: NOTIFICATIONS_URL } }
      ],
      [
        { text: '🌍 В боте', callback_data: 'settings_language' },
        { text: '🌍 На сайте', web_app: { url: LANGUAGE_URL } }
      ],
      [
        { text: '🌙 Тихие часы', callback_data: 'settings_quiet_hours' },
        { text: '🆘 Поддержка', web_app: { url: SUPPORT_URL } }
      ],
      [
        { text: '« Назад', callback_data: 'main_menu' }
      ]
    ]
  };
}

// =====================================================
// Настройки уведомлений
// =====================================================
export function getNotificationSettingsKeyboard(enabled: boolean): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { 
          text: enabled ? '🔔 Уведомления: ВКЛ' : '🔕 Уведомления: ВЫКЛ', 
          callback_data: 'toggle_notifications' 
        }
      ],
      [
        { text: '⚔️ Дуэли', callback_data: 'toggle_category_duel' },
        { text: '📈 Прогресс', callback_data: 'toggle_category_progress' }
      ],
      [
        { text: '💪 Мотивация', callback_data: 'toggle_category_motivation' },
        { text: '📚 Обучение', callback_data: 'toggle_category_educational' }
      ],
      [
        { text: '« Назад', callback_data: 'settings' }
      ]
    ]
  };
}

// =====================================================
// Выбор языка
// =====================================================
export function getLanguageKeyboard(currentLang: string): InlineKeyboardMarkup {
  const langs = [
    { code: 'ru', name: '🇷🇺 Русский', emoji: currentLang === 'ru' ? '✅' : '' },
    { code: 'es', name: '🇪🇸 Español', emoji: currentLang === 'es' ? '✅' : '' },
    { code: 'en', name: '🇬🇧 English', emoji: currentLang === 'en' ? '✅' : '' }
  ];

  return {
    inline_keyboard: [
      ...langs.map(lang => [{
        text: `${lang.emoji} ${lang.name}`.trim(),
        callback_data: `set_language_${lang.code}`
      }]),
      [
        { text: '« Назад', callback_data: 'settings' }
      ]
    ]
  };
}

// =====================================================
// Подтверждение действия
// =====================================================
export function getConfirmationKeyboard(actionData: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Да', callback_data: `confirm_${actionData}` },
        { text: '❌ Нет', callback_data: `cancel_${actionData}` }
      ]
    ]
  };
}

// =====================================================
// Кнопка "Открыть в приложении"
// =====================================================
export function getOpenAppKeyboard(deeplink?: string): InlineKeyboardMarkup {
  const url = deeplink ? `${MINI_APP_URL}${deeplink.startsWith('/') ? '' : '/'}${deeplink}` : MINI_APP_URL;
  
  return {
    inline_keyboard: [
      [
        { 
          text: '🚀 Открыть в приложении', 
          web_app: { url } 
        }
      ]
    ]
  };
}

// =====================================================
// Назад в главное меню
// =====================================================
export function getBackToMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '« Главное меню', callback_data: 'main_menu' }
      ]
    ]
  };
}

