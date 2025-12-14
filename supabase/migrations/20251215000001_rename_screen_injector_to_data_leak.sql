-- Обновление названия буста screen_injector на Data Leak
-- Обновляем название в boost_definitions
UPDATE public.boost_definitions
SET 
  name_ru = 'Data Leak',
  name_es = 'Data Leak',
  description_ru = 'Утечка данных. Физическое перекрытие обзора - экран заливается маслом, которое нужно стереть.',
  description_es = 'Fuga de datos. Bloqueo físico de la vista: la pantalla se llena de aceite que hay que limpiar.',
  icon = '🛢️'
WHERE type = 'screen_injector';

