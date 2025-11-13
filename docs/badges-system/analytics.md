# Аналитика наградной системы

## 1. Kpi и целевые показатели
- **Retention:** D1, D7, D30; динамика по неделям и в разрезе когорт регистрации.
- **MAU/WAU/DAU:** отслеживаем тренд и сезонность, связываем с датами релизов геймификации.
- **Средние действия на пользователя:** завершённые уроки, решённые тесты, просмотренные видео.
- **Геймификация:** доля пользователей с ≥1 бейджем, среднее количество бейджей, распределение по категориям и редкости.
- **Время до награды:** медианное и 75-й перцентиль от регистрации/активации функции до первого бейджа.
- **LTV-прокси:** сравниваем ARPU/конверсии в подписку (если есть) между пользователями с/без бейджей.

## 2. События трекинга
| Событие | Обязательные параметры | Доп. параметры |
| --- | --- | --- |
| `lesson_completed` | `user_id`, `lesson_id`, `course_id`, `duration` | `score`, `device`, `app_version` |
| `test_passed` | `user_id`, `test_id`, `score`, `attempt` | `category`, `time_spent` |
| `badge_progress` | `user_id`, `badge_id`, `progress_value`, `progress_percent` | `trigger_id`, `context` |
| `badge_unlocked` | `user_id`, `badge_id`, `points_awarded` | `rarity`, `season_id`, `unlock_time_from_signup` |
| `streak_broken` | `user_id`, `streak_length` | `last_activity_type`, `timezone` |
| `seasonal_event_joined` | `user_id`, `season_id` | `entry_point`, `campaign_id` |
| `notification_sent` | `user_id`, `notification_type`, `channel` | `badge_id`, `campaign_id` |
| `notification_interaction` | `user_id`, `notification_type`, `action` | `cta`, `channel`, `latency` |

## 3. Витрины данных
- **Pre-launch period:** срез минимум за 4 недели до релиза, фиксируем базовые значения KPI.
- **Post-launch period:** 6–8 недель после релиза, обновление ежедневно.
- **Experiment buckets:** если включается A/B, добавляем поле `experiment_group` и строим сравнительный отчёт.
- **Cohort tables:** cohorts по `signup_week` + прогресс по бейджам, retention, ARPU.

## 4. Дашборды
- **Главный:** retention, MAU/DAU, средние действия, сравнение до/после, фильтры `platform`, `locale`, `experiment_group`.
- **Гейминговый:** heatmap прогресса по бейджам, top-5 популярных, среднее время до unlock.
- **Уведомления:** open-rate, click-rate, conversion-to-action по типам уведомлений.
- **Стрим антихолда:** отслеживание пользователей, у которых streak в опасности, для ручных кампаний.

## 5. Отчётность и алерты
- **Еженедельный отчёт:** авто-генерация PDF/слэк-дайджеста с ключевыми метриками и изменениями.
- **Алерты:** триггеры при падении retention >10% WoW или резком снижении выдачи бейджей.
- **QA-метрики:** мониторинг корректности событий (например, доля `badge_unlocked` без предшествующего `badge_progress`).

## 6. Процесс сбора метрик
1. Настроить трекинг событий в клике/SDK.
2. Прописать схемы в аналитической БД (BigQuery/Snowflake).
3. Организовать ETL в BI-слой (Looker/Metabase/Superset).
4. Провести валидацию на тестовой группе пользователей.
5. Стартовать мониторинг и baseline отчёты до релиза.
6. После запуска пересчитать KPI и сравнить с базовым периодом.

