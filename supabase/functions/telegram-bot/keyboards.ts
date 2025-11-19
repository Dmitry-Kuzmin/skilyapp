// =====================================================
// Inline клавиатуры для Telegram-бота
// =====================================================

import { InlineKeyboardMarkup } from './types.ts';

// URL Mini App / Web (обновлено на прод-домен)
const MINI_APP_URL = Deno.env.get('MINI_APP_URL') || 'https://skilyapp.com';
const DUELS_URL = `${MINI_APP_URL}/duels`;
const PROGRESS_URL = `${MINI_APP_URL}/progress`;
const LEARNING_URL = `${MINI_APP_URL}/learning-map`;
const SUPPORT_URL = Deno.env.get('SUPPORT_URL') || `${MINI_APP_URL}/support`;
const LANGUAGE_URL = `${MINI_APP_URL}/settings/language`;
const NOTIFICATIONS_URL = `${MINI_APP_URL}/settings/notifications`;

export type NotificationKeyboardState = {
  enabled: boolean;
  onlyImportant: boolean;
  categories: Record<'duel' | 'progress' | 'motivation' | 'educational', boolean>;
  quietModeActive: boolean;
  quietModeLabel?: string;
};

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
        { text: '🧠 Учебные советы', callback_data: 'tips_menu' },
        { text: '⚙️ Настройки', callback_data: 'settings' }
      ],
      [
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
        { text: '🌙 Тихий режим', callback_data: 'quiet_mode_menu' },
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
export function getNotificationSettingsKeyboard(state: NotificationKeyboardState): InlineKeyboardMarkup {
  const categoryButton = (key: keyof NotificationKeyboardState['categories'], label: string) => ({
    text: `${state.categories[key] ? '✅' : '⬜'} ${label}`,
    callback_data: `toggle_category_${key}`
  });

  return {
    inline_keyboard: [
      [
        { 
          text: state.enabled ? '🔔 Уведомления: ВКЛ' : '🔕 Уведомления: ВЫКЛ', 
          callback_data: 'toggle_notifications' 
        }
      ],
      [
        {
          text: state.onlyImportant ? '⭐ Только важное: ВКЛ' : '⭐ Только важное: ВЫКЛ',
          callback_data: 'toggle_only_important'
        }
      ],
      [
        categoryButton('duel', 'Дуэли'),
        categoryButton('progress', 'Прогресс')
      ],
      [
        categoryButton('motivation', 'Мотивация'),
        categoryButton('educational', 'Подсказки тем')
      ],
      [
        {
          text: state.quietModeActive
            ? `🌙 Тихий режим: ${state.quietModeLabel || 'активен'}`
            : '🌙 Включить тихий режим',
          callback_data: 'quiet_mode_menu'
        }
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

// =====================================================
// Меню тихого режима
// =====================================================
export function getQuietModeKeyboard(statusLabel?: string | null): InlineKeyboardMarkup {
  const label = statusLabel ? `Активен до ${statusLabel}` : 'Сейчас выключен';

  return {
    inline_keyboard: [
      [{ text: `🌙 Тихий режим — ${label}`, callback_data: 'quiet_mode_menu' }],
      [
        { text: '📵 12 часов', callback_data: 'quiet_mode_12h' },
        { text: '🛌 7 дней', callback_data: 'quiet_mode_7d' }
      ],
      [
        { text: '✅ Выключить', callback_data: 'quiet_mode_off' },
        { text: '⚙️ Настроить в приложении', web_app: { url: `${MINI_APP_URL}/settings/quiet-hours` } }
      ],
      [
        { text: '« Назад', callback_data: 'settings_notifications' }
      ]
    ]
  };
}

// =====================================================
// Темы для советов
// =====================================================
type TipTopic = {
  topic_slug: string;
  topic_title: string;
  topic_icon?: string | null;
};

export function getTipsTopicsKeyboard(topics: TipTopic[]): InlineKeyboardMarkup {
  const rows: { text: string; callback_data: string }[][] = [];

  for (let i = 0; i < topics.length; i += 2) {
    const row = [];
    const first = topics[i];
    if (first) {
      row.push({
        text: `${first.topic_icon || '🧠'} ${first.topic_title}`,
        callback_data: `tips_topic_${first.topic_slug}`
      });
    }
    const second = topics[i + 1];
    if (second) {
      row.push({
        text: `${second.topic_icon || '🧠'} ${second.topic_title}`,
        callback_data: `tips_topic_${second.topic_slug}`
      });
    }
    rows.push(row);
  }

  rows.push([{ text: '« Главное меню', callback_data: 'main_menu' }]);

  return { inline_keyboard: rows };
}

// =====================================================
// Клавиатура для конкретного совета
// =====================================================
export function getTipActionsKeyboard(
  topicSlug: string,
  tip: { id: string; cta_text?: string | null; cta_deeplink?: string | null }
): InlineKeyboardMarkup {
  const deeplink = tip.cta_deeplink
    ? (tip.cta_deeplink.startsWith('http')
        ? tip.cta_deeplink
        : `${MINI_APP_URL}${tip.cta_deeplink.startsWith('/') ? '' : '/'}${tip.cta_deeplink}`)
    : LEARNING_URL;

  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '🧠 Ещё совет', callback_data: `tips_next_${topicSlug}_${tip.id}` }
      ],
      [
        { text: '📚 Все темы', callback_data: 'tips_menu' }
      ]
    ]
  };

  if (deeplink) {
    keyboard.inline_keyboard.push([
      {
        text: tip.cta_text || '🚀 Открыть в приложении',
        web_app: { url: deeplink }
      }
    ]);
  }

  return keyboard;
}

