-- 📊 СТАТИСТИКА ВОПРОСОВ ПО ИСПАНИИ (ИСПРАВЛЕННАЯ)

-- 1. Общее количество вопросов для Испании
SELECT 
  count(*) as "Всего вопросов (Испания)", 
  count(*) filter (where topic_id is null) as "Без темы"
FROM questions_new 
WHERE country = 'spain';

-- 2. Детальная разбивка по темам
-- ВНИМАНИЕ: Если поле названия темы называется 'title', а не 'name' (или наоборот), поправь здесь.
-- Чаще всего в topics есть поля: id, title (или name), order_index.
-- Сейчас проверим через title, так как name не найден.

SELECT 
  t.title as "Тема", 
  count(q.id) as "Кол-во вопросов"
FROM questions_new q
LEFT JOIN topics t ON q.topic_id = t.id
WHERE q.country = 'spain'
GROUP BY t.title
ORDER BY count(q.id) DESC;
