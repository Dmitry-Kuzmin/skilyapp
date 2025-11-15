import { Language } from "@/contexts/LanguageContext";

export const helpCenterTranslations: Record<Language, Record<string, string>> = {
  ru: {
    // Header
    "help.search": "Поиск...",
    "help.home": "Главная",
    "help.documentation": "Документация Sdadim",
    "help.subtitle": "Всё, что нужно знать для подготовки к экзамену DGT",
    "help.onThisPage": "На этой странице",
    "help.wasHelpful": "Была ли эта страница полезной?",
    "help.yes": "Да",
    "help.no": "Нет",
    
    // Sections
    "help.section.welcome": "Добро пожаловать",
    "help.section.welcome.desc": "Начните работу с Sdadim",
    "help.section.duelEconomy": "Дуэли, ставки и страховка",
    "help.section.duelEconomy.desc": "Как работает современная экономика дуэлей",
    "help.section.appUsage": "Использование приложения",
    "help.section.appUsage.desc": "Как использовать все функции приложения",
    "help.section.notifications": "Уведомления и напоминания",
    "help.section.notifications.desc": "Telegram уведомления и напоминания",
    "help.section.rewards": "Система наград",
    "help.section.rewards.desc": "Достижения, бонусы и реферальная программа",
    "help.section.experience": "Система опыта (XP)",
    "help.section.experience.desc": "Как зарабатывать и использовать опыт",
    "help.section.coins": "Система монет",
    "help.section.coins.desc": "Внутриигровая валюта и её использование",
    "help.section.premium": "Premium подписка",
    "help.section.premium.desc": "Преимущества Premium и как получить",
    "help.section.duelPass": "Duel Pass",
    "help.section.duelPass.desc": "Система уровней и наград Duel Pass",
    "help.section.cosmetics": "Косметика",
    "help.section.cosmetics.desc": "Скины, бейджи и стикеры для персонализации",
    "help.section.shop": "Магазин",
    "help.section.shop.desc": "Покупка бустов, монет и Premium",
    "help.section.spainLicense": "Права в Испании",
    "help.section.spainLicense.desc": "Всё о получении водительских прав в Испании",
    "help.section.faq": "FAQ",
    "help.section.faq.desc": "Часто задаваемые вопросы",
    
    // Welcome section content
    "help.content.welcome.intro.title": "Что такое Sdadim?",
    "help.content.welcome.intro.content": `Sdadim — это интерактивное приложение для подготовки к экзамену на получение водительских прав в Испании (DGT). Мы помогаем вам эффективно изучать правила дорожного движения, дорожные знаки и сдавать экзамены с удовольствием.

Приложение включает:
• Тысячи вопросов из официальной базы DGT
• Интерактивные игры для запоминания
• Систему достижений и наград
• Ежедневные бонусы
• Реферальную программу
• Искусственный интеллект для объяснения сложных тем`,
    "help.content.welcome.gettingStarted.title": "Начало работы",
    "help.content.welcome.gettingStarted.content": `Чтобы начать использовать Sdadim:

1. Зарегистрируйтесь через Telegram или веб-браузер
2. Изучите главную страницу и доступные разделы
3. Начните с прохождения тестов или изучения материалов
4. Заходите каждый день за ежедневными бонусами
5. Отслеживайте свой прогресс в разделе достижений`,
    
    // Duel Economy section content
    "help.content.duelEconomy.currencies.title": "💰 Роли валют в дуэлях",
    "help.content.duelEconomy.currencies.content": `В дуэлях используется три сущности, каждая со своей ролью:

**🪙 Монеты** — единственная валюта риска
• Участвуют в ставках и формируют банк
• Можно потерять при проигрыше
• Можно выиграть при победе (полный банк без комиссии)
• Используются для покупки страховки и бустов

**⭐ Season Points (SP)** — сезонный прогресс
• Всегда начисляются в плюс, никогда не списываются
• Ускоряют прогресс Duel Pass
• Зависят от суммы ставки (чем выше риск, тем больше SP)
• Есть дневной лимит: максимум 3500 SP за дуэли в сутки

**✨ XP** — общий опыт и уровни
• Влияет на ранги и разблокировку контента
• Всегда начисляется в плюс
• Не зависит от ставок`,
    "help.content.duelEconomy.bets.title": "🎯 Как работают ставки",
    "help.content.duelEconomy.bets.content": `**Требования для ставок:**
• Минимальный уровень: 3
• Минимальное количество завершённых тестов: 30

**Параметры ставок:**
• Диапазон: 50–600 монет
• Шаг: 10 монет
• Максимальная ставка зависит от ранга игрока

**Процесс ставки:**
1. Хост создаёт дуэль и выбирает сумму ставки
2. Оба игрока блокируют монеты в банке
3. Банк = ставка × 2 (монеты обоих игроков)
4. Победитель забирает **весь банк** (без комиссии!)
5. Проигравший теряет свою ставку

**Дуэль без ставки:**
• Монеты не участвуют
• Победитель получает 0 SP (без ставки нет SP бонуса)
• Оба игрока получают минимальный XP`,
    "help.content.duelEconomy.rewards.title": "🏆 Таблица наград",
    "help.content.duelEconomy.rewards.content": `**ПОБЕДА СО СТАВКОЙ:**

| Ставка | Банк | Монеты | SP | XP |
| 100 монет | 200 | +200 | 20-30 SP | +40 XP |
| 300 монет | 600 | +600 | 40-50 SP | +40 XP |
| 600 монет | 1200 | +1200 | 70-80 SP | +40 XP |

**ПОБЕДА БЕЗ СТАВКИ:**
• Монеты: 0
• SP: 0 (без ставки нет SP бонуса)
• XP: +30 XP

**ПОРАЖЕНИЕ:**
• Монеты: -ставка (или возврат 60% со страховкой)
• SP: 0 (или 5 SP только при ставке ≥ 100 монет)
• XP: +15 XP

**НИЧЬЯ:**
• Монеты: возврат ставок
• SP: 15 SP (только при ставке)
• XP: +25 XP

**БОНУСНЫЕ МОНЕТЫ:**
• Серия 3+ побед подряд: +15 монет
• Победа над игроком с большим XP (underdog): +10 монет`,
    "help.content.duelEconomy.insurance.title": "🛡️ Страховка дуэли",
    "help.content.duelEconomy.insurance.content": `**Что такое страховка?**
Страховка — это защита от потери ставки при поражении.

**Стоимость:**
• Около 15% от суммы ставки
• Точный коэффициент зависит от вашей серии побед и статуса
• Минимум: 5% от ставки
• Максимум: 35% от ставки

**Покрытие:**
• При поражении: возврат 60% ставки
• При ничьей: возврат 100% ставки и премии
• При победе: премия не возвращается (это расход)

**Ограничения:**
• Максимум 5 страхованных дуэлей в сутки
• Блокируется при совпадении IP/устройств (защита от абуза)
• Доступна только при ставке ≥ 50 монет

**Пример:**
Ставка: 100 монет
Страховка: 15 монет (15%)
При поражении: возврат 60 монет (60% от ставки)
Итого потеря: 40 монет вместо 100`,
    "help.content.duelEconomy.spSystem.title": "⭐ Система Season Points (SP)",
    "help.content.duelEconomy.spSystem.content": `**Как начисляются SP:**

| Результат | Ставка | SP |
| Победа | 100 монет | 20-30 SP |
| Победа | 300 монет | 40-50 SP |
| Победа | 600 монет | 70-80 SP |
| Победа | Без ставки | 0 SP |
| Поражение | ≥ 100 монет | 5 SP |
| Поражение | < 100 монет | 0 SP |
| Ничья | Со ставкой | 15 SP |
| Ничья | Без ставки | 0 SP |

**Множитель риска:**
Чем выше ставка, тем больше SP:
• 100 монет → множитель 1.25 → 20-30 SP
• 300 монет → множитель 2.25 → 40-50 SP
• 600 монет → множитель 4.0 → 70-80 SP

**Дневной лимит:**
• Максимум 3500 SP за дуэли в сутки
• Защита от фарма и злоупотреблений
• После достижения лимита SP не начисляются

**Premium бонус:**
• Premium пользователи получают +20% SP
• Применяется ко всем начислениям`,
    "help.content.duelEconomy.bonuses.title": "🎁 Бонусные монеты",
    "help.content.duelEconomy.bonuses.content": `**Серия побед:**
• 3+ победы подряд → +15 монет
• Начисляется автоматически при каждой победе в серии
• Не зависит от суммы ставки

**Underdog бонус:**
• Победа над игроком с XP больше вашего на 500+ → +10 монет
• Начисляется автоматически
• Стимулирует соревнование с более опытными игроками

**Примеры:**
• Выиграл 3-ю дуэль подряд со ставкой 200 монет:
  - Банк: 400 монет
  - Серия: +15 монет
  - Итого: 415 монет

• Победил игрока с XP 5000 (у вас 4000):
  - Банк: 300 монет
  - Underdog: +10 монет
  - Итого: 310 монет`,
    "help.content.duelEconomy.season.title": "🌱 Связь с сезоном",
    "help.content.duelEconomy.season.content": `**Duel Pass:**
• SP ускоряют прогресс Duel Pass
• Чем выше ставка, тем быстрее прокачка
• Premium пользователи получают +20% SP

**Сезонные челленджи:**
• "Выиграй 5 дуэлей со ставками" — награда в SP
• "Используй страховку 3 раза" — специальные награды
• "Собери серию из 10 побед" — эксклюзивные награды

**Лидерборды:**
• Чистый выигрыш монет (прибыль за все дуэли)
• Серия побед (текущая и лучшая)
• Успешные страховые дуэли (количество и экономия)
• Рейтинг по SP за сезон

**Анти-абуз система:**
• Лимит дуэлей между одними и теми же игроками (5 в день)
• Проверка IP и устройств
• Анализ подозрительных паттернов
• Автоматические флаги для модерации`,
    "help.content.duelEconomy.examples.title": "📊 Примеры расчётов",
    "help.content.duelEconomy.examples.content": `**Пример 1: Победа со ставкой 300 монет**

Хост ставит: 300 монет
Соперник ставит: 300 монет
Банк: 600 монет

Результат: Вы победили!

Награды:
• Монеты: +600 монет (весь банк, без комиссии)
• SP: +45 SP (за ставку 300 монет)
• XP: +40 XP
• Бонусы: +15 монет (если серия 3+)

Итого: 615 монет, 45 SP, 40 XP

---

**Пример 2: Поражение со страховкой**

Ставка: 200 монет
Страховка: 30 монет (15%)
Банк: 400 монет

Результат: Вы проиграли

Потери:
• Ставка: -200 монет
• Страховка: -30 монет
• Возврат: +120 монет (60% от ставки)

Итого потеря: 110 монет (вместо 200)
SP: 5 SP (ставка ≥ 100)
XP: +15 XP

---

**Пример 3: Ничья со ставкой**

Ставка: 150 монет
Банк: 300 монет

Результат: Ничья

Возврат:
• Ставка: +150 монет
• Страховка (если была): +премия

Награды:
• Монеты: 0 (возврат ставки)
• SP: +15 SP
• XP: +25 XP`,
    
    // App Usage section content
    "help.content.appUsage.tests.title": "Прохождение тестов",
    "help.content.appUsage.tests.content": `В приложении доступно несколько типов тестов:

• Обычные тесты — выберите тему и количество вопросов (10, 20, 30)
• Экзаменационные тесты — полный экзамен на 30 вопросов с таймером
• Последовательные тесты — тесты по порядку из базы DGT
• Банк вызовов — сложные вопросы, которые вызывают затруднения

Во время прохождения теста:
• Выберите правильный ответ из предложенных вариантов
• Используйте кнопку перевода для просмотра вопроса на русском
• Добавляйте вопросы в закладки для повторения
• Используйте AI-объяснение для понимания сложных тем
• Отмечайте проблемные вопросы для улучшения качества`,
    "help.content.appUsage.games.title": "Игры",
    "help.content.appUsage.games.content": `Игры помогают изучать материал в увлекательной форме:

• Гонка — быстро отвечайте на вопросы, зарабатывайте очки
• Угадай знак — определяйте дорожные знаки по изображениям
• Соответствие — сопоставляйте термины и их значения
• Дуэль — соревнуйтесь с друзьями в реальном времени с системой ставок и страховки
• Четыре варианта — классический формат вопросов
• Дорожная гонка — проходите маршруты, отвечая на вопросы
• Флэш-карты — запоминайте термины и определения

Каждая игра начисляет очки опыта и монеты за правильные ответы. В дуэлях монеты выступают ставкой: победитель забирает банк и получает дополнительный сезонный прогресс (SP).`,
    "help.content.appUsage.learning.title": "Обучение",
    "help.content.appUsage.learning.content": `Раздел обучения включает:

• Карту обучения — визуальное представление всех тем
• Детальные материалы по каждой теме
• Объяснения правил дорожного движения
• Словарь терминов на испанском и русском языках
• Дорожные знаки с описаниями

Изучайте материалы в удобном для вас темпе и закрепляйте знания через тесты и игры.`,
    "help.content.appUsage.ai.title": "Искусственный интеллект",
    "help.content.appUsage.ai.content": `AI-помощник Lumi доступен в тестах и играх:

• Объясняет правильные и неправильные ответы
• Помогает понять сложные правила
• Отвечает на вопросы о ПДД
• Предоставляет контекст и примеры

Используйте AI-объяснение для глубокого понимания материала.`,
    
    // Notifications section content
    "help.content.notifications.overview.title": "Система уведомлений",
    "help.content.notifications.overview.content": `Sdadim поддерживает уведомления через Telegram бота, чтобы вы не пропускали важные события и мотивировали себя к регулярным занятиям.

Уведомления можно подключить через кнопку колокольчика в WalletWidget.`,
    "help.content.notifications.types.title": "Типы уведомлений",
    "help.content.notifications.types.content": `Вы будете получать уведомления о:

• Ежедневных целях — напоминания о необходимости пройти тест или игру
• Предупреждения о потере streak — если вы рискуете потерять серию ежедневных бонусов
• Приглашениях на дуэли — когда друзья бросают вам вызов
• Новых наградах Duel Pass — когда вы достигаете нового уровня
• Возвращении после долгого отсутствия — мотивационные сообщения

Все уведомления можно настроить или отключить в любой момент.`,
    "help.content.notifications.setup.title": "Как подключить уведомления",
    "help.content.notifications.setup.content": `Чтобы подключить Telegram уведомления:

1. Нажмите на иконку колокольчика в WalletWidget (верхняя панель)
2. В открывшемся окне нажмите "Подключить Telegram бота"
3. Следуйте инструкциям для подключения бота
4. Выберите типы уведомлений, которые хотите получать

После подключения вы будете получать уведомления прямо в Telegram!`,
    "help.content.notifications.management.title": "Управление уведомлениями",
    "help.content.notifications.management.content": `Управлять уведомлениями можно через:

• Настройки приложения — включение/отключение типов уведомлений
• Telegram бот — настройки частоты и типов уведомлений
• Профиль пользователя — общие настройки уведомлений

Вы можете отключить уведомления в любой момент без потери других функций приложения.`,
    
    // Rewards section content
    "help.content.rewards.overview.title": "Обзор системы наград",
    "help.content.rewards.overview.content": `В Sdadim существует система достижений, которая мотивирует вас к регулярным занятиям. За выполнение различных действий вы получаете достижения и награды.`,
    "help.content.rewards.achievements.title": "Достижения",
    "help.content.rewards.achievements.content": `Достижения разделены на категории:

• Новичок — базовые достижения для начала
• Мастер — продвинутые достижения
• Серия — за регулярные занятия
• Точность — за правильные ответы
• Игры — за участие в играх
• Обучение — за изучение материалов

Примеры достижений:
• Новичок — завершить первый урок (30 XP)
• Фотомодель — добавить фото в профиль (20 XP)
• Воин выходного дня — пройти тест в субботу и воскресенье (50 XP)
• Энтузиаст — заниматься 3 дня подряд (40 XP)
• Стратег — завершить все дополнительные тесты (120 XP)
• Гений ПДД — набрать 100% правильных ответов в экзаменационном тесте (500 XP)
• Мастер ПДД — набрать 4000 очков опыта (бейдж)`,
    "help.content.rewards.dailyBonus.title": "Ежедневный бонус",
    "help.content.rewards.dailyBonus.content": `Заходите каждый день и получайте награды! Система ежедневных бонусов работает по принципу серий:

• День 1-6: Малые награды (XP и монеты)
• День 7: Недельный герой — особые награды
• День 14: Две недели подряд — увеличенные награды
• День 21: Три недели — еще больше наград
• День 30: Месяц подряд — значительные награды
• День 60: Два месяца — премиальные награды
• День 90: Железная воля — максимальные награды и бейдж

Если пропустите день, серия сбрасывается. Но вы можете восстановить её за 10 монет.`,
    "help.content.rewards.referral.title": "Реферальная программа",
    "help.content.rewards.referral.content": `Приглашайте друзей и получайте награды:

• При регистрации друга по вашей реферальной ссылке вы оба получаете бонусы
• За каждого приглашенного друга вы получаете монеты
• Чем больше друзей вы пригласите, тем больше наград

Делитесь своей реферальной ссылкой и помогайте друзьям готовиться к экзамену!`,
    
    // Experience section content
    "help.content.experience.overview.title": "Что такое опыт?",
    "help.content.experience.overview.content": `Опыт (XP) — это очки, которые вы зарабатываете за различные действия в приложении. Чем больше опыта вы накапливаете, тем выше ваш уровень и ранг.`,
    "help.content.experience.earning.title": "Как заработать опыт",
    "help.content.experience.earning.content": `Опыт начисляется за:

• Правильные ответы в тестах — от 10 до 50 XP в зависимости от сложности
• Прохождение игр — от 20 до 100 XP за игру
• Получение достижений — от 20 до 500 XP
• Ежедневные бонусы — от 5 до 200 XP в зависимости от дня серии
• Завершение уроков — от 30 до 150 XP
• Участие в дуэлях — от 15 до 75 XP в зависимости от результата

Чем сложнее действие, тем больше опыта вы получаете.`,
    "help.content.experience.ranks.title": "Ранги и уровни",
    "help.content.experience.ranks.content": `По мере накопления опыта вы повышаете свой ранг:

• Ученик (0-500 XP)
• Начинающий (500-1000 XP)
• Опытный (1000-2000 XP)
• Продвинутый (2000-4000 XP)
• Эксперт (4000-8000 XP)
• Мастер (8000+ XP)

Каждый новый ранг открывает новые возможности и награды.`,
    "help.content.experience.benefits.title": "Преимущества опыта",
    "help.content.experience.benefits.content": `Накопление опыта дает вам:

• Доступ к новым разделам и функциям
• Специальные бейджи и значки
• Приоритет в рейтингах
• Эксклюзивные достижения
• Возможность участвовать в специальных событиях

Регулярно занимайтесь, чтобы максимизировать свой опыт!`,
    
    // Coins section content
    "help.content.coins.overview.title": "Что такое монеты?",
    "help.content.coins.overview.content": `Монеты — это внутриигровая валюта, которую вы можете использовать для различных целей в приложении. 

Ваш баланс монет отображается в WalletWidget в верхней панели навигации. По клику на виджет открывается магазин, где вы можете просмотреть историю транзакций и совершить покупки.`,
    "help.content.coins.earning.title": "Как заработать монеты",
    "help.content.coins.earning.content": `Монеты начисляются за:

• Прохождение тестов — от 10 до 50 монет в зависимости от результата
• Победу в дуэли со ставкой — вы забираете банк соперника (монеты перераспределяются)
• Дуэль без ставки — монеты не начисляются, зато выдаются Season Points
• Ежедневные бонусы — от 5 до 100 монет в зависимости от дня серии
• Реферальную программу — за каждого приглашенного друга
• Duel Pass награды — за достижение уровней
• Специальные достижения — разовые награды
• Premium бонусы — +50% монет за все действия (только для Premium пользователей)

Активное участие в играх, тестах и успешные дуэли со ставками — лучший способ поддерживать баланс монет.`,
    "help.content.coins.spending.title": "На что потратить монеты",
    "help.content.coins.spending.content": `Монеты можно использовать для:

• Ставок в дуэлях (минимум 50 монет) — именно монеты формируют банк
• Покупки страховки дуэли (~15% от ставки) — возвращает до 60% монет при поражении
• Покупки бустов в магазине — различные цены в зависимости от типа буста
• Восстановления серии ежедневных бонусов — 10 монет
• Покупки монетных пакетов — пополнение баланса через Stripe (в разработке)

Все транзакции сохраняются в истории монет, которую можно просмотреть в магазине.`,
    "help.content.coins.history.title": "История транзакций",
    "help.content.coins.history.content": `В магазине доступна подробная история всех операций с монетами:

• Фильтры по категориям: Все, Доходы, Расходы, Покупки, Награды
• Детальная информация о каждой транзакции:
  - Тип операции (тест, дуэль, ежедневный бонус, покупка буста, Duel Pass награда и т.д.)
  - Дата и время
  - Сумма (положительная для доходов, отрицательная для расходов)
  - Иконка для быстрой идентификации

История помогает отслеживать все ваши финансовые операции в приложении.`,
    "help.content.coins.tips.title": "Советы по монетам",
    "help.content.coins.tips.content": `Чтобы максимизировать количество монет:

• Участвуйте в дуэлях регулярно
• Проходите тесты каждый день
• Заходите каждый день за ежедневными бонусами
• Приглашайте друзей через реферальную программу
• Выполняйте достижения, которые дают монеты
• Получайте награды Duel Pass
• Рассмотрите Premium подписку для удвоенных наград
• Не тратьте монеты без необходимости

Планируйте свои расходы заранее!`,
    
    // Premium section content
    "help.content.premium.overview.title": "Что такое Premium?",
    "help.content.premium.overview.content": `Premium — это подписка, которая открывает все возможности приложения без ограничений и даёт дополнительные преимущества.

Premium статус отображается золотым бейджем в WalletWidget и на главной странице.`,
    "help.content.premium.benefits.title": "Преимущества Premium",
    "help.content.premium.benefits.content": `С Premium подпиской вы получаете:

• Безлимитный доступ ко всем тестам и играм — никаких ограничений на количество попыток
• Удвоенные награды — +50% монет за все действия (тесты, игры, дуэли)
• Duel Pass Premium — эксклюзивные награды на каждом уровне Duel Pass
• +20% Season Points (SP) — дополнительный прогресс в Duel Pass за дуэли
• Без рекламы — чистый интерфейс без отвлекающих элементов
• Мгновенные подсказки — быстрый доступ к объяснениям и подсказкам
• Приоритетная поддержка — быстрые ответы на ваши вопросы
• **Premium Forever** — автоматическое открытие Duel Pass Premium для всех будущих сезонов

Premium окупается за неделю активного использования!`,
    "help.content.premium.plans.title": "Тарифные планы",
    "help.content.premium.plans.content": `Доступны три варианта подписки:

• **Premium Forever** — €59.99 (единоразово) 🔥
  - Пожизненный доступ ко всем Premium функциям
  - Автоматическое открытие Duel Pass Premium для всех сезонов
  - Максимальная экономия для долгосрочного использования
  - Идеально для тех, кто готовится к экзамену (обычно 3-4 месяца)
  - Защита от передачи аккаунта (привязка к устройству)

• Месячная подписка — €9.99/месяц
  - Полный доступ ко всем функциям
  - Автоматическое продление
  - Можно отменить в любой момент

• Годовая подписка — €59.99/год (экономия 50%)
  - Все преимущества месячной подписки
  - Максимальная экономия для годовой подписки
  - Оптимальный выбор для активных пользователей

Все планы включают 3-дневный пробный период для новых пользователей.`,
    "help.content.premium.trial.title": "Пробный период",
    "help.content.premium.trial.content": `Новые пользователи автоматически получают 3-дневный пробный период Premium:

• Полный доступ ко всем Premium функциям
• Никаких платежей в течение пробного периода
• Автоматическая отмена, если не продлите подписку
• Можно отменить в любой момент

Используйте пробный период, чтобы оценить все преимущества Premium!`,
    "help.content.premium.purchase.title": "Как получить Premium",
    "help.content.premium.purchase.content": `Получить Premium можно несколькими способами:

1. Через главную страницу — нажмите кнопку "Получить Premium" в hero-секции
2. Через магазин — откройте магазин (WalletWidget) → вкладка "Premium"
3. Через страницу игр — кнопка Premium в hero-секции
4. Через upsell баннеры — появляются при достижении лимитов

После нажатия на кнопку вы будете перенаправлены на безопасную страницу оплаты Stripe.`,
    "help.content.premium.management.title": "Управление подпиской",
    "help.content.premium.management.content": `Управлять Premium подпиской можно через:

• Профиль пользователя — просмотр статуса и даты окончания
• Настройки — информация о подписке
• Stripe кабинет — управление платежами и отмена подписки

**Важно:**
• Подписка автоматически продлевается, но вы можете отменить её в любой момент
• **Premium Forever** — единоразовая покупка, не требует продления
• Premium Forever автоматически открывает Duel Pass Premium для всех сезонов
• При Premium Forever вы видите индикатор "Premium Forever активен" в Duel Pass

**Защита аккаунта:**
• Premium Forever привязан к вашему Telegram аккаунту
• До 2 устройств могут использовать аккаунт без верификации
• Только 1 активная сессия одновременно (другой вход закрывает предыдущую)
• Watermark в тестах показывает ваше имя (защита от передачи аккаунта)`,
  },
  en: {
    // Header
    "help.search": "Search...",
    "help.home": "Home",
    "help.documentation": "Sdadim Documentation",
    "help.subtitle": "Everything you need to know for DGT exam preparation",
    "help.onThisPage": "On this page",
    "help.wasHelpful": "Was this page helpful?",
    "help.yes": "Yes",
    "help.no": "No",
    
    // Sections
    "help.section.welcome": "Welcome",
    "help.section.welcome.desc": "Get started with Sdadim",
    "help.section.duelEconomy": "Duels, Bets and Insurance",
    "help.section.duelEconomy.desc": "How the modern duel economy works",
    "help.section.appUsage": "Using the App",
    "help.section.appUsage.desc": "How to use all app features",
    "help.section.notifications": "Notifications and Reminders",
    "help.section.notifications.desc": "Telegram notifications and reminders",
    "help.section.rewards": "Reward System",
    "help.section.rewards.desc": "Achievements, bonuses and referral program",
    "help.section.experience": "Experience System (XP)",
    "help.section.experience.desc": "How to earn and use experience",
    "help.section.coins": "Coins System",
    "help.section.coins.desc": "In-game currency and its usage",
    "help.section.premium": "Premium Subscription",
    "help.section.premium.desc": "Premium benefits and how to get it",
    "help.section.duelPass": "Duel Pass",
    "help.section.duelPass.desc": "Duel Pass level and reward system",
    "help.section.cosmetics": "Cosmetics",
    "help.section.cosmetics.desc": "Skins, badges and stickers for personalization",
    "help.section.shop": "Shop",
    "help.section.shop.desc": "Buying boosts, coins and Premium",
    "help.section.spainLicense": "Driving License in Spain",
    "help.section.spainLicense.desc": "Everything about getting a driving license in Spain",
    "help.section.faq": "FAQ",
    "help.section.faq.desc": "Frequently asked questions",
    
    // Welcome section content
    "help.content.welcome.intro.title": "What is Sdadim?",
    "help.content.welcome.intro.content": `Sdadim is an interactive application for preparing for the driving license exam in Spain (DGT). We help you effectively study traffic rules, road signs and pass exams with pleasure.

The app includes:
• Thousands of questions from the official DGT database
• Interactive games for memorization
• Achievement and reward system
• Daily bonuses
• Referral program
• Artificial intelligence for explaining complex topics`,
    "help.content.welcome.gettingStarted.title": "Getting Started",
    "help.content.welcome.gettingStarted.content": `To start using Sdadim:

1. Register via Telegram or web browser
2. Explore the main page and available sections
3. Start with taking tests or studying materials
4. Visit every day for daily bonuses
5. Track your progress in the achievements section`,
    
    // Duel Economy section content
    "help.content.duelEconomy.currencies.title": "💰 Currency Roles in Duels",
    "help.content.duelEconomy.currencies.content": `Duels use three entities, each with its own role:

**🪙 Coins** — the only risk currency
• Participate in bets and form the bank
• Can be lost when losing
• Can be won when winning (full bank without commission)
• Used to buy insurance and boosts

**⭐ Season Points (SP)** — seasonal progress
• Always credited, never debited
• Accelerate Duel Pass progress
• Depend on bet amount (higher risk = more SP)
• Daily limit: maximum 3500 SP from duels per day

**✨ XP** — general experience and levels
• Affects ranks and content unlocking
• Always credited
• Does not depend on bets`,
    "help.content.duelEconomy.bets.title": "🎯 How Bets Work",
    "help.content.duelEconomy.bets.content": `**Bet Requirements:**
• Minimum level: 3
• Minimum completed tests: 30

**Bet Parameters:**
• Range: 50–600 coins
• Step: 10 coins
• Maximum bet depends on player rank

**Betting Process:**
1. Host creates a duel and selects bet amount
2. Both players lock coins in the bank
3. Bank = bet × 2 (coins from both players)
4. Winner takes **entire bank** (no commission!)
5. Loser loses their bet

**Duel Without Bet:**
• Coins do not participate
• Winner gets 0 SP (no bet = no SP bonus)
• Both players get minimum XP`,
    "help.content.duelEconomy.rewards.title": "🏆 Rewards Table",
    "help.content.duelEconomy.rewards.content": `**WIN WITH BET:**

| Bet | Bank | Coins | SP | XP |
| 100 coins | 200 | +200 | 20-30 SP | +40 XP |
| 300 coins | 600 | +600 | 40-50 SP | +40 XP |
| 600 coins | 1200 | +1200 | 70-80 SP | +40 XP |

**WIN WITHOUT BET:**
• Coins: 0
• SP: 0 (no bet = no SP bonus)
• XP: +30 XP

**DEFEAT:**
• Coins: -bet (or 60% refund with insurance)
• SP: 0 (or 5 SP only with bet ≥ 100 coins)
• XP: +15 XP

**DRAW:**
• Coins: bet refund
• SP: 15 SP (only with bet)
• XP: +25 XP

**BONUS COINS:**
• 3+ win streak: +15 coins
• Win against player with higher XP (underdog): +10 coins`,
    "help.content.duelEconomy.insurance.title": "🛡️ Duel Insurance",
    "help.content.duelEconomy.insurance.content": `**What is insurance?**
Insurance is protection against losing your bet when defeated.

**Cost:**
• Approximately 15% of bet amount
• Exact coefficient depends on your win streak and status
• Minimum: 5% of bet
• Maximum: 35% of bet

**Coverage:**
• On defeat: 60% bet refund
• On draw: 100% bet refund plus premium
• On win: premium is not refunded (it's an expense)

**Limitations:**
• Maximum 5 insured duels per day
• Blocked on IP/device match (abuse protection)
• Only available with bet ≥ 50 coins

**Example:**
Bet: 100 coins
Insurance: 15 coins (15%)
On defeat: 60 coins refund (60% of bet)
Total loss: 40 coins instead of 100`,
    "help.content.duelEconomy.spSystem.title": "⭐ Season Points (SP) System",
    "help.content.duelEconomy.spSystem.content": `**How SP are awarded:**

| Result | Bet | SP |
| Win | 100 coins | 20-30 SP |
| Win | 300 coins | 40-50 SP |
| Win | 600 coins | 70-80 SP |
| Win | No bet | 0 SP |
| Defeat | ≥ 100 coins | 5 SP |
| Defeat | < 100 coins | 0 SP |
| Draw | With bet | 15 SP |
| Draw | No bet | 0 SP |

**Risk Multiplier:**
Higher bet = more SP:
• 100 coins → multiplier 1.25 → 20-30 SP
• 300 coins → multiplier 2.25 → 40-50 SP
• 600 coins → multiplier 4.0 → 70-80 SP

**Daily Limit:**
• Maximum 3500 SP from duels per day
• Protection against farming and abuse
• After reaching limit, SP are not awarded

**Premium Bonus:**
• Premium users get +20% SP
• Applied to all awards`,
    "help.content.duelEconomy.bonuses.title": "🎁 Bonus Coins",
    "help.content.duelEconomy.bonuses.content": `**Win Streak:**
• 3+ consecutive wins → +15 coins
• Awarded automatically with each win in streak
• Does not depend on bet amount

**Underdog Bonus:**
• Win against player with 500+ more XP than you → +10 coins
• Awarded automatically
• Encourages competition with more experienced players

**Examples:**
• Won 3rd duel in a row with 200 coin bet:
  - Bank: 400 coins
  - Streak: +15 coins
  - Total: 415 coins

• Defeated player with 5000 XP (you have 4000):
  - Bank: 300 coins
  - Underdog: +10 coins
  - Total: 310 coins`,
    "help.content.duelEconomy.season.title": "🌱 Connection with Season",
    "help.content.duelEconomy.season.content": `**Duel Pass:**
• SP accelerate Duel Pass progress
• Higher bet = faster leveling
• Premium users get +20% SP

**Seasonal Challenges:**
• "Win 5 duels with bets" — SP reward
• "Use insurance 3 times" — special rewards
• "Build 10 win streak" — exclusive rewards

**Leaderboards:**
• Net coin winnings (profit from all duels)
• Win streak (current and best)
• Successful insured duels (count and savings)
• SP ranking for the season

**Anti-abuse System:**
• Limit on duels between same players (5 per day)
• IP and device checking
• Suspicious pattern analysis
• Automatic flags for moderation`,
    "help.content.duelEconomy.examples.title": "📊 Calculation Examples",
    "help.content.duelEconomy.examples.content": `**Example 1: Win with 300 coin bet**

Host bets: 300 coins
Opponent bets: 300 coins
Bank: 600 coins

Result: You won!

Rewards:
• Coins: +600 coins (entire bank, no commission)
• SP: +45 SP (for 300 coin bet)
• XP: +40 XP
• Bonuses: +15 coins (if streak 3+)

Total: 615 coins, 45 SP, 40 XP

---

**Example 2: Defeat with Insurance**

Bet: 200 coins
Insurance: 30 coins (15%)
Bank: 400 coins

Result: You lost

Losses:
• Bet: -200 coins
• Insurance: -30 coins
• Refund: +120 coins (60% of bet)

Total loss: 110 coins (instead of 200)
SP: 5 SP (bet ≥ 100)
XP: +15 XP

---

**Example 3: Draw with Bet**

Bet: 150 coins
Bank: 300 coins

Result: Draw

Refund:
• Bet: +150 coins
• Insurance (if had): +premium

Rewards:
• Coins: 0 (bet refund)
• SP: +15 SP
• XP: +25 XP`,
    
    // App Usage section content
    "help.content.appUsage.tests.title": "Taking Tests",
    "help.content.appUsage.tests.content": `The app offers several types of tests:

• Regular tests — choose topic and number of questions (10, 20, 30)
• Exam tests — full 30-question exam with timer
• Sequential tests — tests in order from DGT database
• Challenge bank — difficult questions that cause problems

During the test:
• Select the correct answer from the options
• Use the translate button to view the question in Russian
• Add questions to bookmarks for review
• Use AI explanation to understand complex topics
• Mark problematic questions to improve quality`,
    "help.content.appUsage.games.title": "Games",
    "help.content.appUsage.games.content": `Games help you learn material in an engaging way:

• Race — answer questions quickly, earn points
• Guess the Sign — identify road signs from images
• Match — match terms with their meanings
• Duel — compete with friends in real-time with betting and insurance system
• Four Options — classic question format
• Road Race — complete routes by answering questions
• Flash Cards — memorize terms and definitions

Each game awards experience points and coins for correct answers. In duels, coins serve as bets: the winner takes the bank and gets additional seasonal progress (SP).`,
    "help.content.appUsage.learning.title": "Learning",
    "help.content.appUsage.learning.content": `The learning section includes:

• Learning map — visual representation of all topics
• Detailed materials for each topic
• Traffic rules explanations
• Dictionary of terms in Spanish and Russian
• Road signs with descriptions

Study materials at your own pace and reinforce knowledge through tests and games.`,
    "help.content.appUsage.ai.title": "Artificial Intelligence",
    "help.content.appUsage.ai.content": `AI assistant Lumi is available in tests and games:

• Explains correct and incorrect answers
• Helps understand complex rules
• Answers questions about traffic rules
• Provides context and examples

Use AI explanation for deep understanding of the material.`,
    
    // Notifications section content
    "help.content.notifications.overview.title": "Notification System",
    "help.content.notifications.overview.content": `Sdadim supports notifications via Telegram bot so you don't miss important events and stay motivated for regular practice.

Notifications can be connected via the bell button in WalletWidget.`,
    "help.content.notifications.types.title": "Notification Types",
    "help.content.notifications.types.content": `You will receive notifications about:

• Daily goals — reminders to take a test or play a game
• Streak loss warnings — if you risk losing your daily bonus streak
• Duel invitations — when friends challenge you
• New Duel Pass rewards — when you reach a new level
• Return after long absence — motivational messages

All notifications can be configured or disabled at any time.`,
    "help.content.notifications.setup.title": "How to Connect Notifications",
    "help.content.notifications.setup.content": `To connect Telegram notifications:

1. Click the bell icon in WalletWidget (top panel)
2. In the opened window, click "Connect Telegram Bot"
3. Follow the instructions to connect the bot
4. Select the types of notifications you want to receive

After connecting, you will receive notifications directly in Telegram!`,
    "help.content.notifications.management.title": "Managing Notifications",
    "help.content.notifications.management.content": `You can manage notifications through:

• App settings — enable/disable notification types
• Telegram bot — frequency and notification type settings
• User profile — general notification settings

You can disable notifications at any time without losing other app features.`,
    
    // Rewards section content
    "help.content.rewards.overview.title": "Reward System Overview",
    "help.content.rewards.overview.content": `Sdadim has an achievement system that motivates you to practice regularly. For completing various actions, you receive achievements and rewards.`,
    "help.content.rewards.achievements.title": "Achievements",
    "help.content.rewards.achievements.content": `Achievements are divided into categories:

• Beginner — basic achievements to start
• Master — advanced achievements
• Streak — for regular practice
• Accuracy — for correct answers
• Games — for participating in games
• Learning — for studying materials

Achievement examples:
• Beginner — complete first lesson (30 XP)
• Photo Model — add photo to profile (20 XP)
• Weekend Warrior — take test on Saturday and Sunday (50 XP)
• Enthusiast — practice 3 days in a row (40 XP)
• Strategist — complete all additional tests (120 XP)
• Traffic Rules Genius — score 100% correct answers in exam test (500 XP)
• Traffic Rules Master — earn 4000 experience points (badge)`,
    "help.content.rewards.dailyBonus.title": "Daily Bonus",
    "help.content.rewards.dailyBonus.content": `Visit every day and receive rewards! The daily bonus system works on a streak principle:

• Day 1-6: Small rewards (XP and coins)
• Day 7: Weekly Hero — special rewards
• Day 14: Two Weeks Straight — increased rewards
• Day 21: Three Weeks — even more rewards
• Day 30: One Month Straight — significant rewards
• Day 60: Two Months — premium rewards
• Day 90: Iron Will — maximum rewards and badge

If you miss a day, the streak resets. But you can restore it for 10 coins.`,
    "help.content.rewards.referral.title": "Referral Program",
    "help.content.rewards.referral.content": `Invite friends and receive rewards:

• When a friend registers using your referral link, you both receive bonuses
• For each invited friend, you receive coins
• The more friends you invite, the more rewards

Share your referral link and help friends prepare for the exam!`,
    
    // Experience section content
    "help.content.experience.overview.title": "What is Experience?",
    "help.content.experience.overview.content": `Experience (XP) are points you earn for various actions in the app. The more experience you accumulate, the higher your level and rank.`,
    "help.content.experience.earning.title": "How to Earn Experience",
    "help.content.experience.earning.content": `Experience is awarded for:

• Correct answers in tests — from 10 to 50 XP depending on difficulty
• Completing games — from 20 to 100 XP per game
• Getting achievements — from 20 to 500 XP
• Daily bonuses — from 5 to 200 XP depending on streak day
• Completing lessons — from 30 to 150 XP
• Participating in duels — from 15 to 75 XP depending on result

The more difficult the action, the more experience you get.`,
    "help.content.experience.ranks.title": "Ranks and Levels",
    "help.content.experience.ranks.content": `As you accumulate experience, you increase your rank:

• Student (0-500 XP)
• Beginner (500-1000 XP)
• Experienced (1000-2000 XP)
• Advanced (2000-4000 XP)
• Expert (4000-8000 XP)
• Master (8000+ XP)

Each new rank unlocks new opportunities and rewards.`,
    "help.content.experience.benefits.title": "Experience Benefits",
    "help.content.experience.benefits.content": `Accumulating experience gives you:

• Access to new sections and features
• Special badges and icons
• Priority in rankings
• Exclusive achievements
• Ability to participate in special events

Practice regularly to maximize your experience!`,
    
    // Coins section content
    "help.content.coins.overview.title": "What are Coins?",
    "help.content.coins.overview.content": `Coins are in-game currency that you can use for various purposes in the app. 

Your coin balance is displayed in WalletWidget in the top navigation panel. Clicking on the widget opens the shop where you can view transaction history and make purchases.`,
    "help.content.coins.earning.title": "How to Earn Coins",
    "help.content.coins.earning.content": `Coins are awarded for:

• Taking tests — from 10 to 50 coins depending on result
• Winning a duel with bet — you take the opponent's bank (coins are redistributed)
• Duel without bet — coins are not awarded, but Season Points are given
• Daily bonuses — from 5 to 100 coins depending on streak day
• Referral program — for each invited friend
• Duel Pass rewards — for reaching levels
• Special achievements — one-time rewards
• Premium bonuses — +50% coins for all actions (Premium users only)

Active participation in games, tests and successful duels with bets is the best way to maintain coin balance.`,
    "help.content.coins.spending.title": "What to Spend Coins On",
    "help.content.coins.spending.content": `Coins can be used for:

• Duel bets (minimum 50 coins) — coins form the bank
• Buying duel insurance (~15% of bet) — returns up to 60% coins on defeat
• Buying boosts in shop — various prices depending on boost type
• Restoring daily bonus streak — 10 coins
• Buying coin packs — balance top-up via Stripe (in development)

All transactions are saved in coin history, which can be viewed in the shop.`,
    "help.content.coins.history.title": "Transaction History",
    "help.content.coins.history.content": `The shop has detailed history of all coin operations:

• Filters by categories: All, Income, Expenses, Purchases, Rewards
• Detailed information about each transaction:
  - Operation type (test, duel, daily bonus, boost purchase, Duel Pass reward, etc.)
  - Date and time
  - Amount (positive for income, negative for expenses)
  - Icon for quick identification

History helps track all your financial operations in the app.`,
    "help.content.coins.tips.title": "Coin Tips",
    "help.content.coins.tips.content": `To maximize coins:

• Participate in duels regularly
• Take tests every day
• Visit every day for daily bonuses
• Invite friends through referral program
• Complete achievements that give coins
• Get Duel Pass rewards
• Consider Premium subscription for doubled rewards
• Don't spend coins unnecessarily

Plan your expenses in advance!`,
    
    // Premium section content
    "help.content.premium.overview.title": "What is Premium?",
    "help.content.premium.overview.content": `Premium is a subscription that unlocks all app features without restrictions and provides additional benefits.

Premium status is displayed with a golden badge in WalletWidget and on the main page.`,
    "help.content.premium.benefits.title": "Premium Benefits",
    "help.content.premium.benefits.content": `With Premium subscription you get:

• Unlimited access to all tests and games — no limits on number of attempts
• Doubled rewards — +50% coins for all actions (tests, games, duels)
• Duel Pass Premium — exclusive rewards at every Duel Pass level
• +20% Season Points (SP) — additional progress in Duel Pass for duels
• Ad-free — clean interface without distracting elements
• Instant hints — quick access to explanations and hints
• Priority support — fast responses to your questions
• **Premium Forever** — automatic unlock of Duel Pass Premium for all future seasons

Premium pays for itself in a week of active use!`,
    "help.content.premium.plans.title": "Subscription Plans",
    "help.content.premium.plans.content": `Three subscription options are available:

• **Premium Forever** — €59.99 (one-time) 🔥
  - Lifetime access to all Premium features
  - Automatic unlock of Duel Pass Premium for all seasons
  - Maximum savings for long-term use
  - Perfect for those preparing for the exam (usually 3-4 months)
  - Account transfer protection (device binding)

• Monthly subscription — €9.99/month
  - Full access to all features
  - Automatic renewal
  - Can be cancelled at any time

• Annual subscription — €59.99/year (50% savings)
  - All benefits of monthly subscription
  - Maximum savings for annual subscription
  - Optimal choice for active users

All plans include a 3-day trial period for new users.`,
    "help.content.premium.trial.title": "Trial Period",
    "help.content.premium.trial.content": `New users automatically receive a 3-day Premium trial:

• Full access to all Premium features
• No payments during trial period
• Automatic cancellation if you don't renew subscription
• Can be cancelled at any time

Use the trial period to evaluate all Premium benefits!`,
    "help.content.premium.purchase.title": "How to Get Premium",
    "help.content.premium.purchase.content": `You can get Premium in several ways:

1. Via main page — click "Get Premium" button in hero section
2. Via shop — open shop (WalletWidget) → "Premium" tab
3. Via games page — Premium button in hero section
4. Via upsell banners — appear when limits are reached

After clicking the button, you will be redirected to a secure Stripe payment page.`,
    "help.content.premium.management.title": "Subscription Management",
    "help.content.premium.management.content": `You can manage Premium subscription through:

• User profile — view status and expiration date
• Settings — subscription information
• Stripe dashboard — payment management and subscription cancellation

**Important:**
• Subscription automatically renews, but you can cancel it at any time
• **Premium Forever** — one-time purchase, no renewal required
• Premium Forever automatically unlocks Duel Pass Premium for all seasons
• With Premium Forever you see "Premium Forever active" indicator in Duel Pass

**Account Protection:**
• Premium Forever is tied to your Telegram account
• Up to 2 devices can use the account without verification
• Only 1 active session at a time (another login closes the previous one)
• Watermark in tests shows your name (account transfer protection)`,
  },
  es: {
    // Header
    "help.search": "Buscar...",
    "help.home": "Inicio",
    "help.documentation": "Documentación de Sdadim",
    "help.subtitle": "Todo lo que necesitas saber para preparar el examen DGT",
    "help.onThisPage": "En esta página",
    "help.wasHelpful": "¿Fue útil esta página?",
    "help.yes": "Sí",
    "help.no": "No",
    
    // Sections
    "help.section.welcome": "Bienvenido",
    "help.section.welcome.desc": "Comienza con Sdadim",
    "help.section.duelEconomy": "Duelos, Apuestas y Seguro",
    "help.section.duelEconomy.desc": "Cómo funciona la economía moderna de duelos",
    "help.section.appUsage": "Uso de la Aplicación",
    "help.section.appUsage.desc": "Cómo usar todas las funciones de la aplicación",
    "help.section.notifications": "Notificaciones y Recordatorios",
    "help.section.notifications.desc": "Notificaciones y recordatorios de Telegram",
    "help.section.rewards": "Sistema de Recompensas",
    "help.section.rewards.desc": "Logros, bonificaciones y programa de referidos",
    "help.section.experience": "Sistema de Experiencia (XP)",
    "help.section.experience.desc": "Cómo ganar y usar experiencia",
    "help.section.coins": "Sistema de Monedas",
    "help.section.coins.desc": "Moneda del juego y su uso",
    "help.section.premium": "Suscripción Premium",
    "help.section.premium.desc": "Beneficios Premium y cómo obtenerlo",
    "help.section.duelPass": "Duel Pass",
    "help.section.duelPass.desc": "Sistema de niveles y recompensas Duel Pass",
    "help.section.cosmetics": "Cosméticos",
    "help.section.cosmetics.desc": "Skins, insignias y pegatinas para personalización",
    "help.section.shop": "Tienda",
    "help.section.shop.desc": "Comprar potenciadores, monedas y Premium",
    "help.section.spainLicense": "Carnet de Conducir en España",
    "help.section.spainLicense.desc": "Todo sobre obtener el carnet de conducir en España",
    "help.section.faq": "Preguntas Frecuentes",
    "help.section.faq.desc": "Preguntas frecuentes",
    
    // Welcome section content
    "help.content.welcome.intro.title": "¿Qué es Sdadim?",
    "help.content.welcome.intro.content": `Sdadim es una aplicación interactiva para preparar el examen de conducir en España (DGT). Te ayudamos a estudiar eficazmente las normas de tráfico, las señales de tráfico y aprobar los exámenes con placer.

La aplicación incluye:
• Miles de preguntas de la base de datos oficial de DGT
• Juegos interactivos para memorizar
• Sistema de logros y recompensas
• Bonos diarios
• Programa de referidos
• Inteligencia artificial para explicar temas complejos`,
    "help.content.welcome.gettingStarted.title": "Primeros Pasos",
    "help.content.welcome.gettingStarted.content": `Para empezar a usar Sdadim:

1. Regístrate a través de Telegram o navegador web
2. Explora la página principal y las secciones disponibles
3. Comienza con hacer pruebas o estudiar materiales
4. Visita cada día para obtener bonos diarios
5. Rastrea tu progreso en la sección de logros`,
    
    // Duel Economy section content
    "help.content.duelEconomy.currencies.title": "💰 Roles de Monedas en Duelos",
    "help.content.duelEconomy.currencies.content": `En los duelos se utilizan tres entidades, cada una con su propio rol:

**🪙 Monedas** — la única moneda de riesgo
• Participan en apuestas y forman el banco
• Se pueden perder al perder
• Se pueden ganar al ganar (banco completo sin comisión)
• Se usan para comprar seguro y potenciadores

**⭐ Season Points (SP)** — progreso estacional
• Siempre se acreditan, nunca se debitan
• Aceleran el progreso de Duel Pass
• Dependen del monto de la apuesta (mayor riesgo = más SP)
• Límite diario: máximo 3500 SP de duelos por día

**✨ XP** — experiencia general y niveles
• Afecta los rangos y el desbloqueo de contenido
• Siempre se acredita
• No depende de las apuestas`,
    "help.content.duelEconomy.bets.title": "🎯 Cómo Funcionan las Apuestas",
    "help.content.duelEconomy.bets.content": `**Requisitos para Apuestas:**
• Nivel mínimo: 3
• Cantidad mínima de pruebas completadas: 30

**Parámetros de Apuestas:**
• Rango: 50–600 monedas
• Paso: 10 monedas
• Apuesta máxima depende del rango del jugador

**Proceso de Apuesta:**
1. El anfitrión crea un duelo y selecciona el monto de la apuesta
2. Ambos jugadores bloquean monedas en el banco
3. Banco = apuesta × 2 (monedas de ambos jugadores)
4. El ganador toma **todo el banco** (¡sin comisión!)
5. El perdedor pierde su apuesta

**Duelo Sin Apuesta:**
• Las monedas no participan
• El ganador obtiene 0 SP (sin apuesta no hay bono SP)
• Ambos jugadores obtienen XP mínimo`,
    "help.content.duelEconomy.rewards.title": "🏆 Tabla de Recompensas",
    "help.content.duelEconomy.rewards.content": `**VICTORIA CON APUESTA:**

| Apuesta | Banco | Monedas | SP | XP |
| 100 monedas | 200 | +200 | 20-30 SP | +40 XP |
| 300 monedas | 600 | +600 | 40-50 SP | +40 XP |
| 600 monedas | 1200 | +1200 | 70-80 SP | +40 XP |

**VICTORIA SIN APUESTA:**
• Monedas: 0
• SP: 0 (sin apuesta no hay bono SP)
• XP: +30 XP

**DERROTA:**
• Monedas: -apuesta (o reembolso del 60% con seguro)
• SP: 0 (o 5 SP solo con apuesta ≥ 100 monedas)
• XP: +15 XP

**EMPATE:**
• Monedas: reembolso de apuesta
• SP: 15 SP (solo con apuesta)
• XP: +25 XP

**MONEDAS BONUS:**
• Racha de 3+ victorias: +15 monedas
• Victoria sobre jugador con más XP (bajo perfil): +10 monedas`,
    "help.content.duelEconomy.insurance.title": "🛡️ Seguro de Duelo",
    "help.content.duelEconomy.insurance.content": `**¿Qué es el seguro?**
El seguro es protección contra perder tu apuesta al ser derrotado.

**Costo:**
• Aproximadamente 15% del monto de la apuesta
• El coeficiente exacto depende de tu racha de victorias y estado
• Mínimo: 5% de la apuesta
• Máximo: 35% de la apuesta

**Cobertura:**
• En derrota: reembolso del 60% de la apuesta
• En empate: reembolso del 100% de la apuesta más prima
• En victoria: la prima no se reembolsa (es un gasto)

**Limitaciones:**
• Máximo 5 duelos asegurados por día
• Bloqueado en coincidencia de IP/dispositivos (protección contra abuso)
• Solo disponible con apuesta ≥ 50 monedas

**Ejemplo:**
Apuesta: 100 monedas
Seguro: 15 monedas (15%)
En derrota: reembolso de 60 monedas (60% de la apuesta)
Pérdida total: 40 monedas en lugar de 100`,
    "help.content.duelEconomy.spSystem.title": "⭐ Sistema de Season Points (SP)",
    "help.content.duelEconomy.spSystem.content": `**Cómo se otorgan los SP:**

| Resultado | Apuesta | SP |
| Victoria | 100 monedas | 20-30 SP |
| Victoria | 300 monedas | 40-50 SP |
| Victoria | 600 monedas | 70-80 SP |
| Victoria | Sin apuesta | 0 SP |
| Derrota | ≥ 100 monedas | 5 SP |
| Derrota | < 100 monedas | 0 SP |
| Empate | Con apuesta | 15 SP |
| Empate | Sin apuesta | 0 SP |

**Multiplicador de Riesgo:**
Mayor apuesta = más SP:
• 100 monedas → multiplicador 1.25 → 20-30 SP
• 300 monedas → multiplicador 2.25 → 40-50 SP
• 600 monedas → multiplicador 4.0 → 70-80 SP

**Límite Diario:**
• Máximo 3500 SP de duelos por día
• Protección contra farming y abuso
• Después de alcanzar el límite, los SP no se otorgan

**Bono Premium:**
• Los usuarios Premium obtienen +20% SP
• Se aplica a todos los premios`,
    "help.content.duelEconomy.bonuses.title": "🎁 Monedas Bonus",
    "help.content.duelEconomy.bonuses.content": `**Racha de Victorias:**
• 3+ victorias consecutivas → +15 monedas
• Se otorga automáticamente con cada victoria en la racha
• No depende del monto de la apuesta

**Bono Bajo Perfil:**
• Victoria sobre jugador con 500+ más XP que tú → +10 monedas
• Se otorga automáticamente
• Fomenta la competencia con jugadores más experimentados

**Ejemplos:**
• Ganaste el 3er duelo consecutivo con apuesta de 200 monedas:
  - Banco: 400 monedas
  - Racha: +15 monedas
  - Total: 415 monedas

• Derrotaste a jugador con 5000 XP (tú tienes 4000):
  - Banco: 300 monedas
  - Bajo perfil: +10 monedas
  - Total: 310 monedas`,
    "help.content.duelEconomy.season.title": "🌱 Conexión con la Temporada",
    "help.content.duelEconomy.season.content": `**Duel Pass:**
• Los SP aceleran el progreso de Duel Pass
• Mayor apuesta = nivelación más rápida
• Los usuarios Premium obtienen +20% SP

**Desafíos Estacionales:**
• "Gana 5 duelos con apuestas" — recompensa en SP
• "Usa seguro 3 veces" — recompensas especiales
• "Construye racha de 10 victorias" — recompensas exclusivas

**Tablas de Clasificación:**
• Ganancias netas de monedas (beneficio de todos los duelos)
• Racha de victorias (actual y mejor)
• Duelos asegurados exitosos (cantidad y ahorro)
• Clasificación por SP de la temporada

**Sistema Anti-Abuso:**
• Límite de duelos entre los mismos jugadores (5 por día)
• Verificación de IP y dispositivos
• Análisis de patrones sospechosos
• Marcadores automáticos para moderación`,
    "help.content.duelEconomy.examples.title": "📊 Ejemplos de Cálculos",
    "help.content.duelEconomy.examples.content": `**Ejemplo 1: Victoria con apuesta de 300 monedas**

Anfitrión apuesta: 300 monedas
Oponente apuesta: 300 monedas
Banco: 600 monedas

Resultado: ¡Ganaste!

Recompensas:
• Monedas: +600 monedas (banco completo, sin comisión)
• SP: +45 SP (por apuesta de 300 monedas)
• XP: +40 XP
• Bonos: +15 monedas (si racha 3+)

Total: 615 monedas, 45 SP, 40 XP

---

**Ejemplo 2: Derrota con Seguro**

Apuesta: 200 monedas
Seguro: 30 monedas (15%)
Banco: 400 monedas

Resultado: Perdiste

Pérdidas:
• Apuesta: -200 monedas
• Seguro: -30 monedas
• Reembolso: +120 monedas (60% de la apuesta)

Pérdida total: 110 monedas (en lugar de 200)
SP: 5 SP (apuesta ≥ 100)
XP: +15 XP

---

**Ejemplo 3: Empate con Apuesta**

Apuesta: 150 monedas
Banco: 300 monedas

Resultado: Empate

Reembolso:
• Apuesta: +150 monedas
• Seguro (si tenía): +prima

Recompensas:
• Monedas: 0 (reembolso de apuesta)
• SP: +15 SP
• XP: +25 XP`,
    
    // App Usage section content
    "help.content.appUsage.tests.title": "Realizar Pruebas",
    "help.content.appUsage.tests.content": `La aplicación ofrece varios tipos de pruebas:

• Pruebas regulares — elige tema y cantidad de preguntas (10, 20, 30)
• Pruebas de examen — examen completo de 30 preguntas con temporizador
• Pruebas secuenciales — pruebas en orden de la base de datos DGT
• Banco de desafíos — preguntas difíciles que causan problemas

Durante la prueba:
• Selecciona la respuesta correcta de las opciones
• Usa el botón de traducción para ver la pregunta en ruso
• Añade preguntas a marcadores para revisión
• Usa la explicación de IA para entender temas complejos
• Marca preguntas problemáticas para mejorar la calidad`,
    "help.content.appUsage.games.title": "Juegos",
    "help.content.appUsage.games.content": `Los juegos te ayudan a aprender material de forma entretenida:

• Carrera — responde preguntas rápidamente, gana puntos
• Adivina el Signo — identifica señales de tráfico de imágenes
• Coincidencia — relaciona términos con sus significados
• Duelo — compite con amigos en tiempo real con sistema de apuestas y seguro
• Cuatro Opciones — formato clásico de preguntas
• Carrera de Carretera — completa rutas respondiendo preguntas
• Tarjetas Flash — memoriza términos y definiciones

Cada juego otorga puntos de experiencia y monedas por respuestas correctas. En duelos, las monedas sirven como apuestas: el ganador toma el banco y obtiene progreso estacional adicional (SP).`,
    "help.content.appUsage.learning.title": "Aprendizaje",
    "help.content.appUsage.learning.content": `La sección de aprendizaje incluye:

• Mapa de aprendizaje — representación visual de todos los temas
• Materiales detallados para cada tema
• Explicaciones de normas de tráfico
• Diccionario de términos en español y ruso
• Señales de tráfico con descripciones

Estudia materiales a tu propio ritmo y refuerza conocimientos a través de pruebas y juegos.`,
    "help.content.appUsage.ai.title": "Inteligencia Artificial",
    "help.content.appUsage.ai.content": `El asistente de IA Lumi está disponible en pruebas y juegos:

• Explica respuestas correctas e incorrectas
• Ayuda a entender reglas complejas
• Responde preguntas sobre normas de tráfico
• Proporciona contexto y ejemplos

Usa la explicación de IA para entender profundamente el material.`,
    
    // Notifications section content
    "help.content.notifications.overview.title": "Sistema de Notificaciones",
    "help.content.notifications.overview.content": `Sdadim admite notificaciones a través del bot de Telegram para que no te pierdas eventos importantes y te motives para practicar regularmente.

Las notificaciones se pueden conectar a través del botón de campana en WalletWidget.`,
    "help.content.notifications.types.title": "Tipos de Notificaciones",
    "help.content.notifications.types.content": `Recibirás notificaciones sobre:

• Objetivos diarios — recordatorios para hacer una prueba o jugar
• Advertencias de pérdida de racha — si arriesgas perder tu racha de bonos diarios
• Invitaciones a duelos — cuando amigos te desafían
• Nuevas recompensas de Duel Pass — cuando alcanzas un nuevo nivel
• Regreso después de larga ausencia — mensajes motivacionales

Todas las notificaciones se pueden configurar o desactivar en cualquier momento.`,
    "help.content.notifications.setup.title": "Cómo Conectar Notificaciones",
    "help.content.notifications.setup.content": `Para conectar notificaciones de Telegram:

1. Haz clic en el icono de campana en WalletWidget (panel superior)
2. En la ventana abierta, haz clic en "Conectar Bot de Telegram"
3. Sigue las instrucciones para conectar el bot
4. Selecciona los tipos de notificaciones que deseas recibir

¡Después de conectar, recibirás notificaciones directamente en Telegram!`,
    "help.content.notifications.management.title": "Gestionar Notificaciones",
    "help.content.notifications.management.content": `Puedes gestionar notificaciones a través de:

• Configuración de la aplicación — activar/desactivar tipos de notificaciones
• Bot de Telegram — configuración de frecuencia y tipos de notificaciones
• Perfil de usuario — configuración general de notificaciones

Puedes desactivar notificaciones en cualquier momento sin perder otras funciones de la aplicación.`,
    
    // Rewards section content
    "help.content.rewards.overview.title": "Resumen del Sistema de Recompensas",
    "help.content.rewards.overview.content": `Sdadim tiene un sistema de logros que te motiva a practicar regularmente. Por completar varias acciones, recibes logros y recompensas.`,
    "help.content.rewards.achievements.title": "Logros",
    "help.content.rewards.achievements.content": `Los logros se dividen en categorías:

• Principiante — logros básicos para empezar
• Maestro — logros avanzados
• Racha — por práctica regular
• Precisión — por respuestas correctas
• Juegos — por participar en juegos
• Aprendizaje — por estudiar materiales

Ejemplos de logros:
• Principiante — completar primera lección (30 XP)
• Modelo Fotográfico — añadir foto al perfil (20 XP)
• Guerrero de Fin de Semana — hacer prueba el sábado y domingo (50 XP)
• Entusiasta — practicar 3 días seguidos (40 XP)
• Estratega — completar todas las pruebas adicionales (120 XP)
• Genio de Normas de Tráfico — obtener 100% respuestas correctas en prueba de examen (500 XP)
• Maestro de Normas de Tráfico — ganar 4000 puntos de experiencia (insignia)`,
    "help.content.rewards.dailyBonus.title": "Bono Diario",
    "help.content.rewards.dailyBonus.content": `¡Visita cada día y recibe recompensas! El sistema de bonos diarios funciona con principio de racha:

• Día 1-6: Recompensas pequeñas (XP y monedas)
• Día 7: Héroe Semanal — recompensas especiales
• Día 14: Dos Semanas Seguidas — recompensas aumentadas
• Día 21: Tres Semanas — aún más recompensas
• Día 30: Un Mes Seguido — recompensas significativas
• Día 60: Dos Meses — recompensas premium
• Día 90: Voluntad de Hierro — recompensas máximas e insignia

Si pierdes un día, la racha se reinicia. Pero puedes restaurarla por 10 monedas.`,
    "help.content.rewards.referral.title": "Programa de Referidos",
    "help.content.rewards.referral.content": `Invita amigos y recibe recompensas:

• Cuando un amigo se registra usando tu enlace de referido, ambos reciben bonos
• Por cada amigo invitado, recibes monedas
• Cuantos más amigos invites, más recompensas

¡Comparte tu enlace de referido y ayuda a amigos a prepararse para el examen!`,
    
    // Experience section content
    "help.content.experience.overview.title": "¿Qué es la Experiencia?",
    "help.content.experience.overview.content": `La Experiencia (XP) son puntos que ganas por varias acciones en la aplicación. Cuanta más experiencia acumules, mayor será tu nivel y rango.`,
    "help.content.experience.earning.title": "Cómo Ganar Experiencia",
    "help.content.experience.earning.content": `La experiencia se otorga por:

• Respuestas correctas en pruebas — de 10 a 50 XP según dificultad
• Completar juegos — de 20 a 100 XP por juego
• Obtener logros — de 20 a 500 XP
• Bonos diarios — de 5 a 200 XP según día de racha
• Completar lecciones — de 30 a 150 XP
• Participar en duelos — de 15 a 75 XP según resultado

Cuanto más difícil la acción, más experiencia obtienes.`,
    "help.content.experience.ranks.title": "Rangos y Niveles",
    "help.content.experience.ranks.content": `A medida que acumulas experiencia, aumentas tu rango:

• Estudiante (0-500 XP)
• Principiante (500-1000 XP)
• Experimentado (1000-2000 XP)
• Avanzado (2000-4000 XP)
• Experto (4000-8000 XP)
• Maestro (8000+ XP)

Cada nuevo rango desbloquea nuevas oportunidades y recompensas.`,
    "help.content.experience.benefits.title": "Beneficios de la Experiencia",
    "help.content.experience.benefits.content": `Acumular experiencia te da:

• Acceso a nuevas secciones y funciones
• Insignias e iconos especiales
• Prioridad en clasificaciones
• Logros exclusivos
• Capacidad de participar en eventos especiales

¡Practica regularmente para maximizar tu experiencia!`,
    
    // Coins section content
    "help.content.coins.overview.title": "¿Qué son las Monedas?",
    "help.content.coins.overview.content": `Las monedas son moneda del juego que puedes usar para varios propósitos en la aplicación. 

Tu balance de monedas se muestra en WalletWidget en el panel de navegación superior. Al hacer clic en el widget se abre la tienda donde puedes ver el historial de transacciones y hacer compras.`,
    "help.content.coins.earning.title": "Cómo Ganar Monedas",
    "help.content.coins.earning.content": `Las monedas se otorgan por:

• Hacer pruebas — de 10 a 50 monedas según resultado
• Ganar duelo con apuesta — tomas el banco del oponente (monedas redistribuidas)
• Duelo sin apuesta — no se otorgan monedas, pero se dan Season Points
• Bonos diarios — de 5 a 100 monedas según día de racha
• Programa de referidos — por cada amigo invitado
• Recompensas de Duel Pass — por alcanzar niveles
• Logros especiales — recompensas únicas
• Bonos Premium — +50% monedas por todas las acciones (solo usuarios Premium)

La participación activa en juegos, pruebas y duelos exitosos con apuestas es la mejor forma de mantener el balance de monedas.`,
    "help.content.coins.spending.title": "En Qué Gastar Monedas",
    "help.content.coins.spending.content": `Las monedas se pueden usar para:

• Apuestas en duelos (mínimo 50 monedas) — las monedas forman el banco
• Comprar seguro de duelo (~15% de apuesta) — devuelve hasta 60% monedas en derrota
• Comprar potenciadores en tienda — varios precios según tipo de potenciador
• Restaurar racha de bono diario — 10 monedas
• Comprar paquetes de monedas — recarga de balance vía Stripe (en desarrollo)

Todas las transacciones se guardan en historial de monedas, que se puede ver en la tienda.`,
    "help.content.coins.history.title": "Historial de Transacciones",
    "help.content.coins.history.content": `La tienda tiene historial detallado de todas las operaciones con monedas:

• Filtros por categorías: Todas, Ingresos, Gastos, Compras, Recompensas
• Información detallada sobre cada transacción:
  - Tipo de operación (prueba, duelo, bono diario, compra de potenciador, recompensa Duel Pass, etc.)
  - Fecha y hora
  - Cantidad (positiva para ingresos, negativa para gastos)
  - Icono para identificación rápida

El historial ayuda a rastrear todas tus operaciones financieras en la aplicación.`,
    "help.content.coins.tips.title": "Consejos sobre Monedas",
    "help.content.coins.tips.content": `Para maximizar monedas:

• Participa en duelos regularmente
• Haz pruebas cada día
• Visita cada día para bonos diarios
• Invita amigos a través del programa de referidos
• Completa logros que dan monedas
• Obtén recompensas de Duel Pass
• Considera suscripción Premium para recompensas duplicadas
• No gastes monedas innecesariamente

¡Planifica tus gastos con anticipación!`,
    
    // Premium section content
    "help.content.premium.overview.title": "¿Qué es Premium?",
    "help.content.premium.overview.content": `Premium es una suscripción que desbloquea todas las funciones de la aplicación sin restricciones y proporciona beneficios adicionales.

El estado Premium se muestra con una insignia dorada en WalletWidget y en la página principal.`,
    "help.content.premium.benefits.title": "Beneficios Premium",
    "help.content.premium.benefits.content": `Con la suscripción Premium obtienes:

• Acceso ilimitado a todas las pruebas y juegos — sin límites en número de intentos
• Recompensas duplicadas — +50% monedas por todas las acciones (pruebas, juegos, duelos)
• Duel Pass Premium — recompensas exclusivas en cada nivel de Duel Pass
• +20% Season Points (SP) — progreso adicional en Duel Pass por duelos
• Sin anuncios — interfaz limpia sin elementos distractores
• Pistas instantáneas — acceso rápido a explicaciones y pistas
• Soporte prioritario — respuestas rápidas a tus preguntas
• **Premium Forever** — desbloqueo automático de Duel Pass Premium para todas las temporadas futuras

¡Premium se paga solo en una semana de uso activo!`,
    "help.content.premium.plans.title": "Planes de Suscripción",
    "help.content.premium.plans.content": `Tres opciones de suscripción disponibles:

• **Premium Forever** — €59.99 (única vez) 🔥
  - Acceso de por vida a todas las funciones Premium
  - Desbloqueo automático de Duel Pass Premium para todas las temporadas
  - Ahorro máximo para uso a largo plazo
  - Perfecto para quienes se preparan para el examen (generalmente 3-4 meses)
  - Protección contra transferencia de cuenta (vinculación de dispositivo)

• Suscripción mensual — €9.99/mes
  - Acceso completo a todas las funciones
  - Renovación automática
  - Se puede cancelar en cualquier momento

• Suscripción anual — €59.99/año (50% de ahorro)
  - Todos los beneficios de la suscripción mensual
  - Ahorro máximo para suscripción anual
  - Opción óptima para usuarios activos

Todos los planes incluyen un período de prueba de 3 días para nuevos usuarios.`,
    "help.content.premium.trial.title": "Período de Prueba",
    "help.content.premium.trial.content": `Los nuevos usuarios reciben automáticamente una prueba Premium de 3 días:

• Acceso completo a todas las funciones Premium
• Sin pagos durante el período de prueba
• Cancelación automática si no renuevas la suscripción
• Se puede cancelar en cualquier momento

¡Usa el período de prueba para evaluar todos los beneficios Premium!`,
    "help.content.premium.purchase.title": "Cómo Obtener Premium",
    "help.content.premium.purchase.content": `Puedes obtener Premium de varias formas:

1. A través de la página principal — haz clic en el botón "Obtener Premium" en la sección hero
2. A través de la tienda — abre la tienda (WalletWidget) → pestaña "Premium"
3. A través de la página de juegos — botón Premium en la sección hero
4. A través de banners upsell — aparecen al alcanzar límites

Después de hacer clic en el botón, serás redirigido a una página de pago segura de Stripe.`,
    "help.content.premium.management.title": "Gestión de Suscripción",
    "help.content.premium.management.content": `Puedes gestionar la suscripción Premium a través de:

• Perfil de usuario — ver estado y fecha de expiración
• Configuración — información de suscripción
• Panel de Stripe — gestión de pagos y cancelación de suscripción

**Importante:**
• La suscripción se renueva automáticamente, pero puedes cancelarla en cualquier momento
• **Premium Forever** — compra única, no requiere renovación
• Premium Forever desbloquea automáticamente Duel Pass Premium para todas las temporadas
• Con Premium Forever ves el indicador "Premium Forever activo" en Duel Pass

**Protección de Cuenta:**
• Premium Forever está vinculado a tu cuenta de Telegram
• Hasta 2 dispositivos pueden usar la cuenta sin verificación
• Solo 1 sesión activa a la vez (otro inicio cierra la anterior)
• La marca de agua en las pruebas muestra tu nombre (protección contra transferencia de cuenta)`,
  },
};

