// =====================================================
// Inline клавиатуры для Telegram-бота
// =====================================================

import { InlineKeyboardMarkup } from './types.ts';
import { t, SupportedLanguage } from './translations.ts';

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
// Главное меню (Modern 2025 - минимализм)
// =====================================================
export function getMainMenuKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: t('keyboard.openApp', lang),
          web_app: { url: MINI_APP_URL }
        }
      ],
      [
        { text: t('keyboard.profile', lang), callback_data: 'profile' },
        { text: t('keyboard.challengeFriend', lang), callback_data: 'duel_inline' }
      ]
    ]
  };
}

// =====================================================
// Компактное меню с помощью (для быстрых ответов)
// =====================================================
export function getQuickMenuKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: t('keyboard.openApp', lang),
          web_app: { url: MINI_APP_URL }
        }
      ]
    ]
  };
}

// =====================================================
// Меню дуэлей
// =====================================================
export function getDuelMenuKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  const labels = {
    ru: { create: '⚔️ Создать дуэль', my: '📜 Мои дуэли', rating: '🏆 Рейтинг', back: '« Назад' },
    en: { create: '⚔️ Create Duel', my: '📜 My Duels', rating: '🏆 Rating', back: '« Back' },
    es: { create: '⚔️ Crear Duelo', my: '📜 Mis Duelos', rating: '🏆 Rating', back: '« Atrás' }
  };
  const l = labels[lang];
  return {
    inline_keyboard: [
      [{ text: l.create, web_app: { url: `${DUELS_URL}?mode=create` } }],
      [
        { text: l.my, web_app: { url: `${DUELS_URL}?mode=list` } },
        { text: l.rating, web_app: { url: `${DUELS_URL}?mode=leaderboard` } }
      ],
      [{ text: l.back, callback_data: 'main_menu' }]
    ]
  };
}

// =====================================================
// Кнопка с deep link в дуэль
// =====================================================
export function getDuelDeepLinkKeyboard(duelId: string, lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  const labels = {
    ru: { open: '⚔️ Открыть дуэль', rematch: '🔄 Реванш', main: '« Главное меню' },
    en: { open: '⚔️ Open Duel', rematch: '🔄 Rematch', main: '« Main Menu' },
    es: { open: '⚔️ Abrir Duelo', rematch: '🔄 Revancha', main: '« Menú Principal' }
  };
  const l = labels[lang];
  return {
    inline_keyboard: [
      [
        {
          text: l.open,
          web_app: { url: `${DUELS_URL}?code=${duelId}` }
        }
      ],
      [
        { text: l.rematch, callback_data: 'duel_create' }
      ],
      [
        { text: l.main, callback_data: 'main_menu' }
      ]
    ]
  };
}

// =====================================================
// Меню настроек
// =====================================================
export function getSettingsKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  const labels = {
    ru: {
      notifyBot: '🔔 В боте',
      notifySite: '🌐 На сайте',
      langBot: '🌍 В боте',
      langSite: '🌍 На сайте',
      quiet: '🌙 Тихий режим',
      support: '🆘 Поддержка',
      back: '« Назад'
    },
    en: {
      notifyBot: '🔔 In Bot',
      notifySite: '🌐 On Site',
      langBot: '🌍 In Bot',
      langSite: '🌍 On Site',
      quiet: '🌙 Quiet Mode',
      support: '🆘 Support',
      back: '« Back'
    },
    es: {
      notifyBot: '🔔 En Bot',
      notifySite: '🌐 En Web',
      langBot: '🌍 En Bot',
      langSite: '🌍 En Web',
      quiet: '🌙 Modo Silencio',
      support: '🆘 Soporte',
      back: '« Atrás'
    }
  };
  const l = labels[lang];
  return {
    inline_keyboard: [
      [
        { text: l.notifyBot, callback_data: 'settings_notifications' },
        { text: l.notifySite, web_app: { url: NOTIFICATIONS_URL } }
      ],
      [
        { text: l.langBot, callback_data: 'settings_language' },
        { text: l.langSite, web_app: { url: LANGUAGE_URL } }
      ],
      [
        { text: l.quiet, callback_data: 'quiet_mode_menu' },
        { text: l.support, web_app: { url: SUPPORT_URL } }
      ],
      [
        { text: l.back, callback_data: 'main_menu' }
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
// =====================================================
// Кнопка "Открыть в приложении" (локализовано)
// =====================================================
export function getOpenAppKeyboard(lang: SupportedLanguage = 'ru', deeplink?: string): InlineKeyboardMarkup {
  const url = deeplink ? `${MINI_APP_URL}${deeplink.startsWith('/') ? '' : '/'}${deeplink}` : MINI_APP_URL;

  return {
    inline_keyboard: [
      [
        {
          text: t('keyboard.openApp', lang),
          web_app: { url }
        }
      ]
    ]
  };
}

// =====================================================
// Назад в главное меню
// =====================================================
// =====================================================
// Назад в главное меню (локализовано)
// =====================================================
export function getBackToMenuKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }
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
// Экспресс-тесты
// =====================================================
export function getExpressOptionsKeyboard(
  sessionCode: string,
  options: Array<{ label: string; index: number }>
): InlineKeyboardMarkup {
  return {
    inline_keyboard: options.map((opt) => ([
      {
        text: `${opt.label}`,
        callback_data: `express_answer_${sessionCode}_${opt.index}`
      }
    ]))
  };
}

export function getExpressSummaryKeyboard(sessionCode: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🔁 Пройти ещё', callback_data: `express_restart_${sessionCode}` },
        { text: '🚀 Открыть Skilyapp', web_app: { url: MINI_APP_URL } }
      ],
      [
        { text: '« Главное меню', callback_data: 'main_menu' }
      ]
    ]
  };
}

// =====================================================
// FAQ / Guide
// =====================================================
export type GuideCategory = {
  category_slug: string;
  category_title: string;
  icon?: string | null;
};

export type GuideSection = {
  section_slug: string;
  section_title: string;
  icon?: string | null;
  cta_text?: string | null;
  cta_deeplink?: string | null;
};

export function getGuideCategoriesKeyboard(categories: GuideCategory[]): InlineKeyboardMarkup {
  const rows: { text: string; callback_data: string }[][] = [];

  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    const first = categories[i];
    if (first) {
      row.push({
        text: `${first.icon || 'ℹ️'} ${first.category_title}`,
        callback_data: `guide_category_${first.category_slug}`
      });
    }
    const second = categories[i + 1];
    if (second) {
      row.push({
        text: `${second.icon || 'ℹ️'} ${second.category_title}`,
        callback_data: `guide_category_${second.category_slug}`
      });
    }
    rows.push(row);
  }

  rows.push([{ text: '« Главное меню', callback_data: 'main_menu' }]);
  return { inline_keyboard: rows };
}

export function getGuideSectionsKeyboard(
  categorySlug: string,
  sections: GuideSection[]
): InlineKeyboardMarkup {
  const rows = sections.map((section) => ([
    {
      text: `${section.icon || '📘'} ${section.section_title}`,
      callback_data: `guide_section_${categorySlug}_${section.section_slug}`
    }
  ]));

  rows.push([
    { text: '« Категории', callback_data: 'guide_menu' }
  ]);

  return { inline_keyboard: rows };
}

export function getGuideDetailKeyboard(section: GuideSection, categorySlug: string): InlineKeyboardMarkup {
  const inline_keyboard: { text: string; callback_data?: string; web_app?: { url: string } }[][] = [];

  if (section.cta_deeplink) {
    const url = section.cta_deeplink.startsWith('http')
      ? section.cta_deeplink
      : `${MINI_APP_URL}${section.cta_deeplink.startsWith('/') ? '' : '/'}${section.cta_deeplink}`;
    inline_keyboard.push([
      { text: section.cta_text || '🚀 Открыть в приложении', web_app: { url } }
    ]);
  }

  inline_keyboard.push(
    [{ text: '« Назад', callback_data: `guide_category_${categorySlug}` }],
    [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
  );

  return { inline_keyboard };
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

// =====================================================
// Меню советов (локализовано)
// =====================================================
export function getTipsMenuKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  const labels = {
    ru: { base: '📜 ПДД База', signs: '🛑 Знаки', fines: '💸 Штрафы', tips: '💡 Советы' },
    en: { base: '📜 Theory', signs: '🛑 Signs', fines: '💸 Fines', tips: '💡 Tips' },
    es: { base: '📜 Teoría', signs: '🛑 Señales', fines: '💸 Multas', tips: '💡 Consejos' }
  };
  const l = labels[lang] || labels.ru;

  return {
    inline_keyboard: [
      [
        { text: l.base, callback_data: 'tips_topic_theory' },
        { text: l.signs, callback_data: 'tips_topic_signs' }
      ],
      [
        { text: l.fines, callback_data: 'tips_topic_fines' },
        { text: l.tips, callback_data: 'tips_topic_study' }
      ],
      [{ text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }]
    ]
  };
}
