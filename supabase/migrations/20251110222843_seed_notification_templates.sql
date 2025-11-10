-- =====================================================
-- Seed данных: Шаблоны уведомлений
-- =====================================================
-- 20 готовых шаблонов уведомлений для Telegram-бота
-- Категории: duel, progress, educational, motivation, daily, system

-- =====================================================
-- ДУЭЛИ (Duel Notifications)
-- =====================================================

-- Дуэль начата
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('duel', 'duel_start', 'Дуэль началась! ⚔️', 'Соперник {opponent_name} принял вызов. Время показать, кто лучше знает ПДД!', '⚔️', false, 4, 'К дуэли', '/duel/{duel_id}');

-- Дуэль завершена - победа
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('duel', 'duel_win', 'Победа! 🏆', 'Счёт: {your_score}:{opponent_score}. {personalized_comment}', '🏆', true, 5, 'Посмотреть результаты', '/duel/{duel_id}/results');

-- Дуэль завершена - поражение
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('duel', 'duel_lose', 'Почти получилось 💪', 'Счёт: {your_score}:{opponent_score}. Каждое поражение — это урок. Попробуешь ещё раз?', '💪', true, 4, 'Реванш', '/duel/create');

-- Дуэль завершена - ничья
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('duel', 'duel_draw', 'Ничья! 🤝', 'Счёт: {your_score}:{opponent_score}. Равные силы — нужен решающий раунд!', '🤝', false, 3, 'Реванш', '/duel/create');

-- Соперник ошибся
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('duel', 'opponent_mistake', 'Шанс вырваться вперёд! ⚡', 'Соперник ошибся. Самое время показать своё знание ПДД!', '⚡', false, 4, 'Продолжить дуэль', '/duel/{duel_id}');

-- =====================================================
-- ПРОГРЕСС (Progress Notifications)
-- =====================================================

-- Серия дней - milestone
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('progress', 'streak_milestone', 'Серия {streak_days} дней! 🔥', 'Ты занимаешься {streak_days} дней подряд — это впечатляет! Продолжай в том же духе.', '🔥', false, 3, 'Продолжить', '/learn', 48);

-- Уровень готовности повысился
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('progress', 'readiness_up', 'Готовность {readiness_level}% 📈', 'Твой уровень готовности к экзамену вырос до {readiness_level}%. Отличный прогресс!', '📈', true, 3, 'Проверить уровень', '/dashboard', 24);

-- Тема завершена
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('progress', 'topic_completed', 'Тема освоена! ✅', 'Тема "{topic_name}" пройдена. Ты на шаг ближе к экзамену!', '✅', false, 2, 'Следующая тема', '/learn');

-- Новый уровень
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('progress', 'level_up', 'Новый уровень! 🎯', 'Поздравляем! Ты достиг уровня {level}. Продолжай изучать ПДД!', '🎯', false, 3, 'Продолжить обучение', '/learn');

-- =====================================================
-- ОБРАЗОВАТЕЛЬНЫЕ (Educational Notifications)
-- =====================================================

-- Напоминание об ошибках
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('educational', 'common_mistakes', 'Повторим сложную тему? 📚', 'Ты часто ошибаешься в теме "{topic_name}". Короткое повторение поможет закрепить знания.', '📚', true, 2, 'Повторить', '/learn/topic/{topic_id}', 72);

-- Новая тема разблокирована
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink) VALUES
('educational', 'new_topic_unlocked', 'Новая тема доступна! 🆕', 'Разблокирована тема "{topic_name}". Готов проверить свои знания?', '🆕', false, 3, 'Начать изучение', '/learn/topic/{topic_id}');

-- Совет дня
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('educational', 'daily_tip', 'Совет дня 💡', '{tip_content}', '💡', false, 1, 'Узнать больше', '/learn', 24);

-- =====================================================
-- МОТИВАЦИОННЫЕ (Motivation Notifications)
-- =====================================================

-- Возвращение после 3 дней
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('motivation', 'comeback_3days', 'Прогресс ждёт! 🎯', 'Ты уже прошёл {progress_percent}% курса. Не останавливайся — вернись и продолжай обучение!', '🎯', true, 3, 'Продолжить', '/learn', 24);

-- Возвращение после 7 дней
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('motivation', 'comeback_7days', 'Мы скучали! 👋', 'Прошла уже неделя. Навыки нужно поддерживать — освежи память по ПДД!', '👋', true, 4, 'Вернуться к обучению', '/learn', 48);

-- Почти готов к экзамену
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('motivation', 'almost_ready', 'Ты почти готов! 🚀', 'Уровень готовности {readiness_level}%. Осталось совсем немного до полной подготовки к экзамену!', '🚀', true, 3, 'Завершить подготовку', '/exam-prep', 48);

-- Серия прервана
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('motivation', 'streak_broken', 'Серия прервана 💥', 'Твоя серия из {streak_was} дней прервалась. Но это не повод сдаваться — начни новую серию прямо сейчас!', '💥', false, 3, 'Восстановить серию', '/learn', 24);

-- =====================================================
-- ЕЖЕДНЕВНЫЕ (Daily Notifications)
-- =====================================================

-- Ежедневный бонус доступен
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('daily', 'daily_bonus', 'Ежедневный бонус! 🎁', 'Твой бонус за день {day_number} ждёт. Не забудь его забрать!', '🎁', false, 2, 'Забрать бонус', '/daily-bonus', 23);

-- Напоминание о ежедневной практике
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('daily', 'daily_practice', 'Время практики! 📝', 'Ежедневная практика — ключ к успеху. Пройди короткий тест сегодня!', '📝', false, 2, 'Начать тест', '/test/daily', 23);

-- =====================================================
-- СИСТЕМНЫЕ (System Notifications)
-- =====================================================

-- Новый челлендж
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('system', 'challenge_new', 'Новый челлендж! 🏅', '{challenge_description}. Награда: {reward_description}', '🏅', false, 3, 'Принять вызов', '/challenges/{challenge_id}', 24);

-- Обновление готовности к экзамену
INSERT INTO notification_templates (category, type, title_template, message_template, icon, ai_enhance, priority, cta_text, cta_deeplink, cooldown_hours) VALUES
('system', 'exam_readiness_update', 'Отчёт о готовности 📊', 'Уровень готовности: {readiness_level}%. {personalized_feedback}', '📊', true, 2, 'Посмотреть детали', '/exam-prep', 168);

-- =====================================================
-- Комментарии
-- =====================================================

COMMENT ON TABLE notification_templates IS 'Базовые шаблоны готовы. Можно добавлять новые через админ-панель.';

