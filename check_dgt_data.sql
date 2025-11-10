-- Проверяем структуру данных DGT
SELECT 
  category,
  image_filename,
  explanation_es,
  LENGTH(explanation_es) as explanation_length
FROM dgt_questions 
WHERE category = 'B'
LIMIT 5;
