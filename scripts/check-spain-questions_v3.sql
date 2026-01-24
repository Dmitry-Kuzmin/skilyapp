-- 📊 СТАТИСТИКА ВОПРОСОВ ПО ИСПАНИИ (ВЕРСИЯ 3)

-- 1. Общее количество вопросов для Испании
SELECT 
  count(*) as "Всего вопросов (Испания)", 
  count(*) filter (where topic_id is null) as "Без темы"
FROM questions_new 
WHERE country = 'spain';

-- 2. Детальная разбивка по темам
-- Используем поле title_ru для названия темы
SELECT 
  t.title_ru as "Тема", 
  count(q.id) as "Кол-во вопросов"
FROM questions_new q
LEFT JOIN topics t ON q.topic_id = t.id
WHERE q.country = 'spain'
GROUP BY t.title_ru
ORDER BY count(q.id) DESC;
