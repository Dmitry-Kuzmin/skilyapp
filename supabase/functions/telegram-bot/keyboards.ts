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
// Главное меню
// =====================================================
export function getMainMenuKeyboard(
  lang: SupportedLanguage = 'ru',
  activeSeasonName: string | null = null,
  courseLabel: string | null = null
): InlineKeyboardMarkup {
  const rows = [
    // Row 1: Главная кнопка — запуск приложения
    [{
      text: t('keyboard.openApp', lang),
      web_app: { url: MINI_APP_URL },
      icon_custom_emoji_id: '5188481279963715781'
    }],
    // Row 2: Профиль + Дуэли
    [
      { text: t('keyboard.profile', lang),  callback_data: 'profile',      icon_custom_emoji_id: '5105344272324887540' },
      { text: t('keyboard.duels', lang),    callback_data: 'duels_menu',   icon_custom_emoji_id: '5116175844837950263' }
    ],
    // Row 3: Обучение + Премиум
    [
      { text: t('keyboard.learning', lang), callback_data: 'learning_menu', icon_custom_emoji_id: '5307495098613773492' },
      { text: t('keyboard.premium', lang),  callback_data: 'premium_menu',  icon_custom_emoji_id: '5462902520215002477' }
    ],
    // Row 4: Курс DGT — текст динамический (показывает ближайший поток + мест)
    [{ text: courseLabel || (lang === 'es' ? '▶️ Curso Teórico DGT' : lang === 'en' ? '▶️ DGT Theory Course' : '▶️ Курс теории DGT'), callback_data: 'course_start', icon_custom_emoji_id: '5264919878082509254' }],
    // Row 5: Помощь
    [{ text: t('keyboard.help', lang), callback_data: 'help_menu', icon_custom_emoji_id: '5116368680279606270' }]
  ];

  // Row 5 (если активен сезон)
  if (activeSeasonName) {
    rows.push([{ text: activeSeasonName, callback_data: 'season_dashboard', icon_custom_emoji_id: '6005661956931850799' }]);
  }

  return { inline_keyboard: rows };
}

// =====================================================
// Профиль — подменю
// =====================================================
export function getProfileKeyboard(lang: SupportedLanguage = 'ru', isPartner = false): InlineKeyboardMarkup {
  const rows: any[] = [
    [{ text: t('keyboard.statistics', lang), web_app: { url: `${MINI_APP_URL}/dashboard` }, icon_custom_emoji_id: '5190806721286657692' }],
    [{ text: t('keyboard.achievements', lang), web_app: { url: `${MINI_APP_URL}/achievements` }, icon_custom_emoji_id: '5267500801240092311' }],
    [{ text: t('keyboard.settings', lang), callback_data: 'settings', icon_custom_emoji_id: '4918408122868958076' }],
  ];

  if (isPartner) {
    rows.push([{ text: t('keyboard.partnerCabinet', lang), web_app: { url: `${MINI_APP_URL}/partner/dashboard` }, icon_custom_emoji_id: '5116175844837950263' }]);
  }

  rows.push([{ text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }]);

  return { inline_keyboard: rows };
}

// =====================================================
// Обучение — подменю
// =====================================================
export function getLearningKeyboard(lang: SupportedLanguage = 'ru', examUnlocked = false): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: t('keyboard.randomTest', lang), callback_data: 'test_size_menu', icon_custom_emoji_id: '5123163417326126159' }],
      [{
        text: examUnlocked ? t('keyboard.examOpen', lang) : t('keyboard.examLocked', lang),
        callback_data: examUnlocked ? 'exam_open' : 'exam_locked',
        icon_custom_emoji_id: examUnlocked ? '5104960787579929462' : '4904500559203009298'
      }],
      [{ text: t('keyboard.aiAssistant', lang), web_app: { url: `${MINI_APP_URL}/ai` }, icon_custom_emoji_id: '5188481279963715781' }],
      [{ text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }]
    ]
  };
}

// =====================================================
// Выбор размера теста
// =====================================================
export function getTestSizeKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  const q = lang === 'ru' ? 'вопросов' : lang === 'es' ? 'preguntas' : 'questions';
  return {
    inline_keyboard: [
      [
        { text: `10 ${q}`, callback_data: 'test_10' },
        { text: `20 ${q}`, callback_data: 'test_20' },
        { text: `30 ${q}`, callback_data: 'test_30' }
      ],
      [{ text: t('keyboard.backToLearning', lang), callback_data: 'learning_menu' }]
    ]
  };
}

// =====================================================
// Дуэли — подменю
// =====================================================
export function getDuelsMenuKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: t('keyboard.challengeFriend', lang), callback_data: 'duel_inline', icon_custom_emoji_id: '5116175844837950263' }],
      [{ text: t('keyboard.randomBattle', lang), web_app: { url: `${MINI_APP_URL}/duels` }, icon_custom_emoji_id: '5118744200921219799' }],
      [
        { text: t('keyboard.duelPass', lang), web_app: { url: `${MINI_APP_URL}/duel-pass` }, icon_custom_emoji_id: '5118744200921219799' },
        { text: t('keyboard.leaderboard', lang), web_app: { url: `${MINI_APP_URL}/leaderboard` }, icon_custom_emoji_id: '5267500801240092311' }
      ],
      [{ text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }]
    ]
  };
}

// =====================================================
// Премиум — подменю
// =====================================================
export function getPremiumKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: 'Telegram Stars', callback_data: 'pay_stars', icon_custom_emoji_id: '5267500801240092311' }],
      [{ text: 'TON', web_app: { url: `${MINI_APP_URL}/dashboard?modal=boost-shop&initialTab=premium` }, icon_custom_emoji_id: '5379773896352355687' }],
      [{ text: lang === 'ru' ? 'Банковская карта' : lang === 'es' ? 'Tarjeta bancaria' : 'Bank Card', web_app: { url: `${MINI_APP_URL}/dashboard?modal=boost-shop&initialTab=premium` }, icon_custom_emoji_id: '5472250091332993630' }],
      [{ text: 'Crypto USDT', web_app: { url: `${MINI_APP_URL}/dashboard?modal=boost-shop&initialTab=premium` }, icon_custom_emoji_id: '5312441427764989435' }],
      [{ text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }]
    ]
  };
}

// =====================================================
// Stars — тарифы (мгновенно, без запросов к API)
// Цены захардкожены — при изменении обновить здесь
// =====================================================
const STARS_PRICES: Record<string, { stars: number; labelRu: string; labelEn: string; labelEs: string }> = {
  monthly:   { stars: 660,  labelRu: '1 мес',   labelEn: '1 mo',    labelEs: '1 mes'   },
  quarterly: { stars: 1650, labelRu: '3 мес',   labelEn: '3 mo',    labelEs: '3 meses' },
  biannual:  { stars: 2650, labelRu: '6 мес',   labelEn: '6 mo',    labelEs: '6 meses' },
  yearly:    { stars: 3990, labelRu: '1 год',   labelEn: '1 year',  labelEs: '1 año'   },
};

export function getStarsTiersKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  const label = (key: string) => {
    const p = STARS_PRICES[key];
    const name = lang === 'en' ? p.labelEn : lang === 'es' ? p.labelEs : p.labelRu;
    return `${name} · ${p.stars} ⭐`;
  };
  return {
    inline_keyboard: [
      [
        { text: label('monthly'),   callback_data: 'stars_monthly',   style: 'primary' },
        { text: label('quarterly'), callback_data: 'stars_quarterly', style: 'primary' },
      ],
      [
        { text: label('biannual'),  callback_data: 'stars_biannual',  style: 'primary' },
        { text: label('yearly'),    callback_data: 'stars_yearly',    style: 'success' },
      ],
      [{ text: t('keyboard.backToMenu', lang), callback_data: 'premium_menu' }]
    ]
  };
}

// =====================================================
// Помощь — подменю
// =====================================================
export function getHelpKeyboard(lang: SupportedLanguage = 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: t('keyboard.documentation', lang), web_app: { url: `${MINI_APP_URL}/help` }, icon_custom_emoji_id: '5134469678214677470' }],
      [{ text: t('keyboard.supportChat', lang), callback_data: 'support_chat', icon_custom_emoji_id: '5134472688986756318' }],
      [{ text: t('keyboard.backToMenu', lang), callback_data: 'main_menu' }]
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
