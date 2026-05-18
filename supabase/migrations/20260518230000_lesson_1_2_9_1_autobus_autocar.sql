-- Lección 1.2.9.1 — Autobús / autocar (pequeña y gran capacidad)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quizzes: authored (definición y umbrales de capacidad)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.9.1',
     'Autobús / autocar — pequeña y gran capacidad',
     'Автобус / автокар — малая и большая вместимость',
     16, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Definiciones legales ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Autobús o autocar (R.G.C.)","text":"Vehículo automóvil de más de 9 plazas incluida la del conductor, destinado al transporte de personas y sus equipajes."},
      {"type":"callout","variant":"info","title":"Autobús de pequeña capacidad (R.G.C.)","text":"Automóvil concebido y construido para el transporte de personas con capacidad comprendida entre 10 y 17 plazas, ambas inclusive, incluido el conductor."},
      {"type":"callout","variant":"info","title":"Autobús de gran capacidad (R.G.C.)","text":"Automóvil rígido concebido y construido para el transporte de personas con capacidad igual o superior a 18 plazas, incluido el conductor."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Автобус / автокар (R.G.C.)","text":"Автомобиль, имеющий более 9 мест включая место водителя, предназначенный для перевозки пассажиров и их багажа."},
      {"type":"callout","variant":"info","title":"Автобус малой вместимости (R.G.C.)","text":"Автомобиль, разработанный и построенный для перевозки людей с числом мест от 10 до 17 включительно, включая место водителя."},
      {"type":"callout","variant":"info","title":"Автобус большой вместимости (R.G.C.)","text":"Жёсткий автомобиль, разработанный и построенный для перевозки людей с числом мест 18 и более, включая место водителя."}
    ]}'
  );

  -- ── Step 2 · Theory — Tabla comparativa ──────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"table","headers":["Tipo","Plazas (incl. conductor)","Permiso","Ejemplo"],"rows":[
        ["Turismo / furgón","Hasta 9","B","Coche, furgoneta"],
        ["Autobús pequeña capacidad","10 a 17","D1","Minibús, microbús"],
        ["Autobús gran capacidad","18 o más (rígido)","D","Autobús urbano, autocar"]
      ],"caption":"El límite 9/10 plazas es el umbral entre vehículo de turismo/carga y autobús"},
      {"type":"stats","stats":[
        {"value":"10","label":"plazas mín.","note":"para ser considerado autobús (incl. conductor)"},
        {"value":"17","label":"plazas máx.","note":"para ser autobús de pequeña capacidad"},
        {"value":"18","label":"plazas mín.","note":"para ser autobús de gran capacidad"}
      ]}
    ]}',
    '{"blocks":[
      {"type":"table","headers":["Тип","Мест (вкл. водителя)","Права","Пример"],"rows":[
        ["Turismo / furgón","До 9","B","Легковой, фургон"],
        ["Автобус малой вместимости","10–17","D1","Минибус, микроавтобус"],
        ["Автобус большой вместимости","18 и более (жёсткий)","D","Городской автобус, автокар"]
      ],"caption":"Граница 9/10 мест — порог между легковым/грузовым и автобусом"},
      {"type":"stats","stats":[
        {"value":"10","label":"мест мин.","note":"чтобы считаться автобусом (вкл. водителя)"},
        {"value":"17","label":"мест макс.","note":"для автобуса малой вместимости"},
        {"value":"18","label":"мест мин.","note":"для автобуса большой вместимости"}
      ]}
    ]}'
  );

  -- ── Step 3 · Theory — Velocidades y normas ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Velocidades máximas del autobús"},
      {"type":"table","headers":["Tipo de vía","Autobús <3.500 kg","Autobús >3.500 kg"],"rows":[
        ["Autopista / autovía","100 km/h","100 km/h"],
        ["Carretera convencional","90 km/h","90 km/h"],
        ["Vía urbana","50 km/h","50 km/h"]
      ],"caption":"Los autobuses van a 100 km/h en autopista — más rápido que los camiones (90 km/h)"},
      {"type":"callout","variant":"danger","text":"¡Ojo al examen! El autobús circula a 100 km/h en autopista, no a 90 km/h como los camiones y furgones. Este dato se confunde frecuentemente. Autobús = 100 km/h. Camión = 90 km/h."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Максимальные скорости автобуса"},
      {"type":"table","headers":["Тип дороги","Автобус <3500 кг","Автобус >3500 кг"],"rows":[
        ["Автомагистраль / autovía","100 км/ч","100 км/ч"],
        ["Обычная дорога","90 км/ч","90 км/ч"],
        ["Городская дорога","50 км/ч","50 км/ч"]
      ],"caption":"Автобусы едут 100 км/ч на автомагистрали — быстрее грузовиков (90 км/ч)"},
      {"type":"callout","variant":"danger","text":"Внимание на экзамене! Автобус едет 100 км/ч на автомагистрали, а не 90 км/ч как грузовики и фургоны. Это часто путают. Автобус = 100 км/ч. Грузовик = 90 км/ч."}
    ]}'
  );

  -- ── Step 4 · Quiz — authored (¿cuántas plazas mínimas para ser autobús?) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Cuántas plazas mínimas, incluida la del conductor, debe tener un vehículo automóvil para ser clasificado como autobús o autocar?","options":["Más de 8 plazas.","Más de 9 plazas.","Más de 12 plazas."],"correct":1,"explanation":"Un vehículo se clasifica como autobús o autocar cuando tiene MÁS de 9 plazas, incluida la del conductor. Esto significa que el mínimo es 10 plazas. Un vehículo con exactamente 9 plazas es turismo, furgoneta o camión, no autobús."}',
    '{"text":"Сколько минимум мест, включая место водителя, должен иметь автомобиль, чтобы классифицироваться как автобус или автокар?","options":["Более 8 мест.","Более 9 мест.","Более 12 мест."],"correct":1,"explanation":"Транспортное средство классифицируется как автобус или автокар при наличии БОЛЕЕ 9 мест, включая место водителя. Это означает, что минимум — 10 мест. Автомобиль ровно с 9 местами является легковым, фургоном или грузовиком, но не автобусом."}'
  );

  -- ── Step 5 · Quiz — authored (rango plazas pequeña capacidad) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"¿Cuál es el rango de plazas de un autobús o autocar de pequeña capacidad?","options":["Entre 8 y 15 plazas, incluido el conductor.","Entre 10 y 17 plazas, ambas inclusive, incluido el conductor.","Entre 12 y 20 plazas, incluido el conductor."],"correct":1,"explanation":"El autobús de pequeña capacidad tiene entre 10 y 17 plazas, ambas inclusive, incluido el conductor. El límite inferior (10) lo distingue del turismo/furgoneta (máx. 9 plazas). El límite superior (17) lo distingue del autobús de gran capacidad (18 plazas o más)."}',
    '{"text":"Каков диапазон мест у автобуса или автокара малой вместимости?","options":["От 8 до 15 мест, включая водителя.","От 10 до 17 мест включительно, включая водителя.","От 12 до 20 мест, включая водителя."],"correct":1,"explanation":"Автобус малой вместимости имеет от 10 до 17 мест включительно, включая место водителя. Нижняя граница (10) отличает его от легкового/фургона (макс. 9 мест). Верхняя граница (17) отличает его от автобуса большой вместимости (18 мест и более)."}'
  );

  -- ── Step 6 · Theory — Gran capacidad y autobús articulado ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"warning","title":"¡Ojo! Gran capacidad = automóvil RÍGIDO","text":"La definición legal especifica que el autobús de gran capacidad es un automóvil RÍGIDO. Esto excluye a los autobuses articulados (''de acordeón''), que aunque tienen más de 18 plazas, tienen una categoría propia distinta."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚌","title":"Pequeña capacidad (D1)","description":"10 a 17 plazas (conductor incluido). Permiso D1. Ejemplos: microbús escolar, furgón de 9 pasajeros ampliado, minibús turístico."},
        {"icon":"🚍","title":"Gran capacidad (D)","description":"18 o más plazas, vehículo rígido (conductor incluido). Permiso D completo. Ejemplos: autobús urbano, autocar de línea, bus turístico."}
      ]},
      {"type":"callout","variant":"tip","text":"Regla de oro: 9 → turismo/furgón. 10-17 → autobús pequeño (D1). 18+ rígido → autobús grande (D). Más de eso → categoría especial."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"warning","title":"Важно! Большая вместимость = ЖЁСТКИЙ автомобиль","text":"Юридическое определение указывает, что автобус большой вместимости — это ЖЁСТКИЙ автомобиль. Это исключает сочленённые автобусы («гармошки»), которые, несмотря на более 18 мест, относятся к отдельной категории."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚌","title":"Малая вместимость (D1)","description":"10–17 мест (включая водителя). Права D1. Примеры: школьный микроавтобус, расширенный минибус, туристический микроавтобус."},
        {"icon":"🚍","title":"Большая вместимость (D)","description":"18 и более мест, жёсткое ТС (включая водителя). Полные права D. Примеры: городской автобус, рейсовый автокар, туристический автобус."}
      ]},
      {"type":"callout","variant":"tip","text":"Золотое правило: 9 → легковой/фургон. 10–17 → малый автобус (D1). 18+ жёсткий → большой автобус (D). Больше — особая категория."}
    ]}'
  );

  -- ── Step 7 · Quiz — authored (¿cuándo es gran capacidad?) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{"text":"¿A partir de cuántas plazas (incluido el conductor) un automóvil rígido se clasifica como autobús de gran capacidad?","options":["A partir de 15 plazas.","A partir de 17 plazas.","A partir de 18 plazas."],"correct":2,"explanation":"El autobús de gran capacidad tiene capacidad igual o superior a 18 plazas, incluido el conductor. No se debe confundir con el de pequeña capacidad, que va de 10 a 17 plazas. El umbral exacto de 18 es uno de los datos que aparecen con frecuencia en preguntas sobre clasificación de vehículos."}',
    '{"text":"С какого числа мест (включая водителя) жёсткий автомобиль классифицируется как автобус большой вместимости?","options":["С 15 мест.","С 17 мест.","С 18 мест."],"correct":2,"explanation":"Автобус большой вместимости имеет 18 и более мест, включая место водителя. Не следует путать с автобусом малой вместимости — от 10 до 17 мест. Точный порог в 18 мест часто проверяется в вопросах по классификации транспортных средств."}'
  );

  -- ── Step 8 · Quiz — authored (velocidad autobús autopista) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"¿Cuál es la velocidad máxima permitida para un autobús en autopista?","options":["90 km/h, igual que un camión.","100 km/h.","120 km/h, igual que un turismo."],"correct":1,"explanation":"El autobús circula a un máximo de 100 km/h en autopista, que es diferente tanto del turismo (120 km/h) como del camión (90 km/h). Este dato es una de las preguntas de velocidad más frecuentes: autobús = 100 km/h en autopista, siempre."}',
    '{"text":"Какова максимально допустимая скорость автобуса на автомагистрали?","options":["90 км/ч, как грузовик.","100 км/ч.","120 км/ч, как легковой автомобиль."],"correct":1,"explanation":"Автобус едет максимум 100 км/ч на автомагистрали — это отличается и от легкового (120 км/ч), и от грузовика (90 км/ч). Этот факт — один из наиболее частых вопросов на скоростные режимы: автобус = 100 км/ч на автомагистрали, всегда."}'
  );

  -- ── Step 9 · Theory — Permiso D y conducción profesional ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Permisos de conducción para autobuses"},
      {"type":"list","style":"arrow","items":[
        "Permiso D1: autobuses de 10 a 16 plazas (además del conductor), máx. 8 m de longitud",
        "Permiso D: autobuses de más de 8 plazas además del conductor, sin límite de longitud",
        "Permiso D1+E: D1 con remolque de más de 750 kg",
        "Permiso D+E: D con remolque de más de 750 kg (autocar articulado)"
      ]},
      {"type":"callout","variant":"tip","title":"Truco final — La escalera del transporte","text":"B (9 plazas, mercancías ≤3.500 kg) → C (mercancías >3.500 kg) → D1 (bus pequeño) → D (bus grande). Subir de B implica más plazas o más toneladas."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Категории прав для управления автобусами"},
      {"type":"list","style":"arrow","items":[
        "Права D1: автобусы 10–16 мест (кроме водителя), макс. длина 8 м",
        "Права D: автобусы более 8 мест кроме водителя, без ограничения длины",
        "Права D1+E: D1 с прицепом свыше 750 кг",
        "Права D+E: D с прицепом свыше 750 кг (сочленённый автокар)"
      ]},
      {"type":"callout","variant":"tip","title":"Итоговая подсказка — Лестница транспорта","text":"B (9 мест, грузы ≤3500 кг) → C (грузы >3500 кг) → D1 (малый автобус) → D (большой автобус). Подняться выше B — значит больше мест или больше тонн."}
    ]}'
  );

  -- ── Step 10 · Quiz — authored (diferencia D vs D1) ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{"text":"¿Qué tipo de autobús puede conducir alguien que sólo tiene el permiso D1?","options":["Cualquier autobús, sin restricción de capacidad.","Autobuses de entre 10 y 17 plazas (incluido el conductor) y hasta 8 metros de longitud.","Solo autobuses urbanos con más de 18 plazas."],"correct":1,"explanation":"El permiso D1 habilita para conducir autobuses de pequeña capacidad: entre 10 y 16 plazas además del conductor (lo que corresponde a 11-17 plazas en total con conductor) y con una longitud máxima de 8 metros. Para conducir autobuses de gran capacidad (18+ plazas) se necesita el permiso D completo."}',
    '{"text":"Какой тип автобуса может водить человек, у которого есть только права D1?","options":["Любой автобус, без ограничений по вместимости.","Автобусы от 10 до 17 мест (включая водителя) длиной до 8 метров.","Только городские автобусы с 18 и более местами."],"correct":1,"explanation":"Права D1 позволяют управлять автобусами малой вместимости: от 10 до 16 мест кроме водителя (то есть 11–17 мест всего с водителем) и длиной не более 8 метров. Для управления автобусами большой вместимости (18+ мест) требуются полные права D."}'
  );

END $$;
