-- Lesson 1.6.1: Carril reservado en función de la velocidad señalizada
-- Module 1 UUID: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.6.1',
     'Carril reservado en función de la velocidad señalizada',
     'Полоса для медленных ТС по знаку минимальной скорости',
     30, 40, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory: definición ──────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[{"type":"heading","text":"Carril reservado en función de la velocidad señalizada"},{"type":"callout","variant":"info","title":"¿Qué es?","text":"En tramos de vías de fuera de poblado con fuertes subidas puede existir un carril reservado para vehículos que no alcancen la velocidad mínima señalizada. El uso de este carril es obligatorio para dichos vehículos."}]}',
    '{"blocks":[{"type":"heading","text":"Полоса, зарезервированная по знаку минимальной скорости"},{"type":"callout","variant":"info","title":"Что это?","text":"На участках загородных дорог с крутыми подъёмами может быть специальная полоса для ТС, которые не могут развить минимальную скорость по знаку. Для таких ТС использование этой полосы обязательно."}]}'
  );

  -- ── Step 2 · Theory: señales + obligación ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[{"type":"callout","variant":"info","title":"Señales","text":"Son señales de indicación (azules) que llevan dentro una señal circular de velocidad mínima. Obligan a circular, como mínimo, a la velocidad indicada en el carril sobre el que están situadas."},{"type":"callout","variant":"danger","title":"Obligación","text":"Si tu vehículo NO alcanza la velocidad mínima señalizada, debes circular por el carril reservado (el más lento, a la derecha). No puedes usar los carriles del medio ni de la izquierda."}]}',
    '{"blocks":[{"type":"callout","variant":"info","title":"Знаки","text":"Это информационные знаки (синие), внутри которых — круглый знак минимальной скорости. Они обязывают двигаться по данной полосе не менее указанной скорости."},{"type":"callout","variant":"danger","title":"Обязанность","text":"Если твоё ТС НЕ достигает минимальной скорости по знаку, ты обязан ехать по зарезервированной полосе (самой медленной, правой). Средние и левые полосы — недоступны."}]}'
  );

  -- ── Step 3 · Theory: carril derecha + línea gruesa ───────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[{"type":"callout","variant":"warning","title":"¡Ojo al examen!","text":"Si la vía está libre y no pretendes adelantar, debes circular por el carril de la DERECHA. En vía interurbana, la obligación es siempre circular por la derecha salvo adelantamiento."},{"type":"callout","variant":"info","title":"Línea divisoria","text":"La línea que delimita el carril reservado es más ancha (gruesa) de lo normal."}]}',
    '{"blocks":[{"type":"callout","variant":"warning","title":"Внимание на экзамен!","text":"Если дорога свободна и ты не собираешься обгонять, обязан ехать по ПРАВОЙ полосе. На загородной дороге всегда нужно держаться правой полосы, если не выполняется обгон."},{"type":"callout","variant":"info","title":"Разделительная линия","text":"Линия, отделяющая зарезервированную полосу, шире (толще) обычной."}]}'
  );

  -- ── Step 4 · Quiz: ¿Está permitido utilizar el carril con señal de vel. mín.? ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"question_id":"ac36a5e6-3ed7-4820-9e82-76b792b41572","explanation":"Solo pueden usar ese carril los vehículos que circulen a una velocidad igual o superior a la señalizada. Los que no alcancen esa velocidad deben usar el carril reservado (el más lento, a la derecha)."}',
    '{"question_id":"ac36a5e6-3ed7-4820-9e82-76b792b41572","explanation":"Эту полосу могут использовать только ТС, движущиеся со скоростью, равной или превышающей указанную знаком. Те, кто не достигает этой скорости, обязаны ехать по зарезервированной правой полосе."}'
  );

  -- ── Step 5 · Quiz: velocidad mínima en esta vía ──────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"question_id":"45989579-77c1-4013-b2a2-4575e6432244","explanation":"La señal circular azul con el número indica la velocidad mínima obligatoria. En la imagen el mínimo es 60 km/h: por debajo, el turismo debe usar el carril reservado."}',
    '{"question_id":"45989579-77c1-4013-b2a2-4575e6432244","explanation":"Круглый синий знак с цифрой указывает обязательную минимальную скорость. На картинке минимум — 60 км/ч: если легковой едет медленнее, он обязан перейти на зарезервированную полосу."}'
  );

  -- ── Step 6 · Theory: ejemplos — ejemplo 1 ───────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[{"type":"heading","text":"Ejemplos prácticos"},{"type":"callout","variant":"tip","title":"Ejemplo 1 — ¿adelanta correctamente el rojo?","text":"Azul: 65 km/h · Rojo: 90 km/h\n\n✅ SÍ. El rojo circula a más de 70 km/h (velocidad mínima señalizada), por lo que puede usar el carril del medio o el de la izquierda para adelantar. Una vez finalizado el adelantamiento, deberá volver al carril de la derecha salvo que vaya a realizar un nuevo adelantamiento."}]}',
    '{"blocks":[{"type":"heading","text":"Практические примеры"},{"type":"callout","variant":"tip","title":"Пример 1 — правильно ли обгоняет красный?","text":"Синий: 65 км/ч · Красный: 90 км/ч\n\n✅ ДА. Красный едет более 70 км/ч (минимальная скорость по знаку), поэтому может использовать среднюю или левую полосу для обгона. После завершения обгона обязан вернуться на правую полосу, если не планирует новый обгон."}]}'
  );

  -- ── Step 7 · Theory: ejemplo 2 ───────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[{"type":"callout","variant":"warning","title":"Ejemplo 2 — ¿circula correctamente el vehículo?","text":"Un vehículo circula a 90 km/h por el carril central. La vía es interurbana y está vacía.\n\n❌ NO. En vía interurbana debe circular por el carril de la derecha salvo que esté adelantando. Como la vía está vacía, circula incorrectamente."}]}',
    '{"blocks":[{"type":"callout","variant":"warning","title":"Пример 2 — правильно ли движется автомобиль?","text":"Автомобиль едет 90 км/ч по средней полосе. Дорога загородная и пустая.\n\n❌ НЕТ. На загородной дороге нужно ехать по правой полосе, если не выполняется обгон. Раз дорога пуста — водитель нарушает правило."}]}'
  );

  -- ── Step 8 · Theory: ejemplo 3 + regla clave ─────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{"blocks":[{"type":"callout","variant":"warning","title":"Ejemplo 3 — ¿adelanta correctamente el azul?","text":"Azul: 65 km/h · Rojo: 60 km/h\n\n❌ NO. El azul circula a 65 km/h, inferior a la velocidad mínima de 70 km/h señalizada. Por tanto, no puede utilizar el carril del medio ni el de la izquierda para adelantar."},{"type":"callout","variant":"danger","title":"Regla clave","text":"Para usar el carril del medio o de la izquierda debes alcanzar o superar la velocidad mínima señalizada. Si no la alcanzas → permanece en el carril derecho reservado."}]}',
    '{"blocks":[{"type":"callout","variant":"warning","title":"Пример 3 — правильно ли обгоняет синий?","text":"Синий: 65 км/ч · Красный: 60 км/ч\n\n❌ НЕТ. Синий едет 65 км/ч — это НИЖЕ минимальной скорости 70 км/ч по знаку. Значит, он не может использовать среднюю или левую полосу для обгона."},{"type":"callout","variant":"danger","title":"Ключевое правило","text":"Чтобы использовать среднюю или левую полосу, нужно достигать или превышать минимальную скорость по знаку. Если не достигаешь → оставайся на правой зарезервированной полосе."}]}'
  );

  -- ── Step 9 · Quiz: no puede alcanzar vel. mínima → ¿qué hacer? ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"question_id":"80c3636b-80ed-4bb9-8301-5e4e6ca18000","explanation":"Cuando no se puede alcanzar la velocidad mínima exigida y hay peligro de alcance, debes advertirlo circulando con las luces de emergencia encendidas."}',
    '{"question_id":"80c3636b-80ed-4bb9-8301-5e4e6ca18000","explanation":"Когда не удаётся развить минимально требуемую скорость и есть опасность столкновения сзади, нужно предупредить других, включив аварийную световую сигнализацию."}'
  );

  -- ── Step 10 · Quiz: vel. mínima autocaravana en autopista ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{"question_id":"21f58b38-2319-4df4-b4c0-af3bb2656c23","explanation":"En autopista, la velocidad mínima para autocaravanas de más de 3.000 kg de MMA es 60 km/h. Por debajo (sin causa justificada) se considera velocidad anormalmente reducida."}',
    '{"question_id":"21f58b38-2319-4df4-b4c0-af3bb2656c23","explanation":"На автомагистрали минимальная скорость для автокараванов с РМM свыше 3000 кг — 60 км/ч. Ниже этого значения (без уважительной причины) считается ненормально низкой скоростью."}'
  );

  -- ── Step 11 · Quiz: authored — 68 km/h < 70 min (Ejemplo 3) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"En una vía interurbana de tres carriles señalizados con velocidad mínima de 70 km/h, un vehículo circula a 68 km/h. ¿Puede usar el carril central para adelantar?","options":["Sí, porque supera los 60 km/h.","No, porque no alcanza la velocidad mínima de 70 km/h señalizada.","Sí, si el carril derecho está ocupado."],"correct":1,"explanation":"Para utilizar el carril central o el de la izquierda el vehículo debe circular a 70 km/h como mínimo. A 68 km/h no alcanza la velocidad señalizada y debe permanecer en el carril de la derecha."}',
    '{"text":"На загородной трёхполосной дороге со знаком минимальной скорости 70 км/ч автомобиль едет 68 км/ч. Может ли он использовать среднюю полосу для обгона?","options":["Да, потому что превышает 60 км/ч.","Нет, потому что не достигает минимальной скорости 70 км/ч по знаку.","Да, если правая полоса занята."],"correct":1,"explanation":"Для выезда на среднюю или левую полосу нужно ехать не менее 70 км/ч. При скорости 68 км/ч водитель не достигает минимума по знаку и обязан оставаться на правой полосе."}'
  );

  -- ── Step 12 · Quiz: authored — carril central sin adelantar (Ejemplo 2) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"Una vía interurbana de tres carriles está completamente libre. Un conductor circula a 90 km/h por el carril central sin adelantar a nadie. ¿Circula correctamente?","options":["Sí, porque supera la velocidad mínima señalizada.","No, porque en vía interurbana sin adelantar debe circular por el carril de la derecha.","Sí, porque puede elegir cualquier carril cuando no hay tráfico."],"correct":1,"explanation":"En vía interurbana la obligación es circular por el carril de la derecha salvo que se esté realizando un adelantamiento. Que la vía esté libre no exime de esta norma."}',
    '{"text":"Загородная трёхполосная дорога абсолютно свободна. Водитель едет 90 км/ч по средней полосе и никого не обгоняет. Правильно ли это?","options":["Да, потому что превышает минимальную скорость по знаку.","Нет, потому что на загородной дороге без обгона нужно ехать по правой полосе.","Да, при отсутствии трафика можно выбрать любую полосу."],"correct":1,"explanation":"На загородной дороге обязанность — двигаться по правой полосе, если не выполняется обгон. Свободная дорога не отменяет это правило."}'
  );

END $$;
