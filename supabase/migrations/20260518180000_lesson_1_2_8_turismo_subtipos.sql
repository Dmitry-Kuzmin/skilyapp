-- Lección 1.2.8 — Turismo y sus subtipos
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4:  DGT 04ac71e4 (altura máxima turismo 4m)
-- Quiz Step 5:  DGT 05c55a86 (mixto adaptable 100 km/h autopista)
-- Quiz Step 9:  DGT 1e511325 (vehículo de uso compartido)
-- Quiz Step 10: authored (plazas máximas turismo)
-- Quiz Step 12: authored (derivado de turismo)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.8',
     'Turismo y sus subtipos',
     'Легковой автомобиль и его подтипы',
     13, 30, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Definición de turismo ──────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Turismo (R.G.C., art. 2)","text":"Automóvil destinado al transporte de personas, con hasta 9 plazas (incluido el conductor) y construido principalmente para ese fin."},
      {"type":"stats","stats":[
        {"value":"9","label":"plazas máx.","note":"incluido el conductor"},
        {"value":"4 m","label":"altura máx.","note":"incluida la carga, norma general"},
        {"value":"2,55 m","label":"anchura máx.","note":"norma general para turismos"}
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Turismo (R.G.C., ст. 2)","text":"Автомобиль, предназначенный для перевозки людей, с максимальным числом мест до 9 (включая водителя), построенный преимущественно для этой цели."},
      {"type":"stats","stats":[
        {"value":"9","label":"мест макс.","note":"включая водителя"},
        {"value":"4 м","label":"высота макс.","note":"включая груз, общее правило"},
        {"value":"2,55 м","label":"ширина макс.","note":"общее правило для легковых"}
      ]}
    ]}'
  );

  -- ── Step 2 · Theory — Mixto adaptable y derivado de turismo ──────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Variantes derivadas del turismo"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚐","title":"Vehículo mixto adaptable","description":"Turismo adaptado para transportar tanto personas como carga. Velocidad máxima en autopista: 100 km/h (no 120 km/h como el turismo)."},
        {"icon":"📦","title":"Derivado de turismo","description":"Vehículo construido sobre chasis de turismo destinado principalmente al transporte de mercancías. Suprime plazas traseras para ampliar la zona de carga."}
      ]},
      {"type":"callout","variant":"danger","text":"El vehículo mixto adaptable circula a 100 km/h en autopista, no a 120 km/h. Esta diferencia aparece frecuentemente en el examen."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Варианты, производные от легкового автомобиля"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚐","title":"Грузопассажирский (mixto adaptable)","description":"Легковой автомобиль, адаптированный для перевозки как людей, так и грузов. Максимальная скорость на автомагистрали: 100 км/ч (не 120 км/ч)."},
        {"icon":"📦","title":"Производный от легкового (derivado de turismo)","description":"Автомобиль на шасси легкового, предназначенный для перевозки грузов. Задние сиденья убраны для расширения грузового отсека."}
      ]},
      {"type":"callout","variant":"danger","text":"Грузопассажирский автомобиль едет на автомагистрали со скоростью 100 км/ч, а не 120 км/ч. Это отличие часто проверяется на экзамене."}
    ]}'
  );

  -- ── Step 3 · Theory — Autocaravana, pick-up, todoterreno ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🏕️","title":"Autocaravana","description":"Automóvil concebido para transporte y también como vivienda. Incluye zona habitable con cama, cocina, etc. Puede ser conducida con permiso B si su MMA no supera 3.500 kg."},
        {"icon":"🛻","title":"Pick-up","description":"Vehículo con cabina cerrada y plataforma posterior abierta para carga. Híbrido entre turismo y furgoneta. Uso mixto: personas + mercancías."},
        {"icon":"🏔️","title":"Todoterreno","description":"Vehículo con tracción a las 4 ruedas y alta capacidad para circular fuera de carretera. Apto para caminos, barro y terrenos irregulares."},
        {"icon":"🚗","title":"Autoturismo","description":"Término antiguo equivalente a ''turismo''. Ya no se usa en el reglamento moderno pero puede aparecer en preguntas de examen de años anteriores."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🏕️","title":"Автодом (autocaravana)","description":"Автомобиль, предназначенный для транспортировки и проживания. Оснащён жилым отсеком: кровать, кухня и т.д. Можно водить с правами категории B, если MMA ≤ 3500 кг."},
        {"icon":"🛻","title":"Пикап (pick-up)","description":"Автомобиль с закрытой кабиной и открытой грузовой платформой. Гибрид между легковым и фургоном. Смешанное использование: люди + грузы."},
        {"icon":"🏔️","title":"Внедорожник (todoterreno)","description":"Автомобиль с полным приводом и высокой проходимостью для движения вне дорог. Подходит для грунтовых дорог, грязи и пересечённой местности."},
        {"icon":"🚗","title":"Автотуризм (autoturismo)","description":"Устаревший термин, эквивалентный ''turismo''. В современном регламенте не используется, но может встречаться в вопросах экзамена прошлых лет."}
      ]}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 04ac71e4 (altura máxima turismo) ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Cuál es la altura máxima permitida, incluida la carga, para que pueda circular un turismo como norma general?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-001/04ac71e4-d436-4abc-99f7-f4437c224e1c_1768816954224.webp","options":["4 metros.","3 metros.","4,20 metros."],"correct":0,"explanation":"La altura máxima permitida para un turismo, incluida la carga, es de 4 metros como norma general. Superar esta altura puede comprometer la seguridad al pasar bajo puentes o en aparcamientos con altura limitada."}',
    '{"text":"Какова максимально допустимая высота легкового автомобиля, включая груз, для движения в качестве общего правила?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-001/04ac71e4-d436-4abc-99f7-f4437c224e1c_1768816954224.webp","options":["4 метра.","3 метра.","4,20 метра."],"correct":0,"explanation":"Максимально допустимая высота легкового автомобиля, включая груз, составляет 4 метра как общее правило. Превышение этой высоты может создать угрозу безопасности при проезде под мостами или в парковках с ограниченной высотой."}'
  );

  -- ── Step 5 · Quiz — DGT 05c55a86 (mixto adaptable 100 km/h) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"La velocidad máxima para un vehículo mixto adaptable en autopista es...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-007/05c55a86-c6f1-4f26-849c-750929c9761d_1768678511713.webp","options":["120 km/h.","100 km/h.","90 km/h."],"correct":1,"explanation":"El vehículo mixto adaptable tiene una velocidad máxima de 100 km/h en autopista, no de 120 km/h como el turismo puro. Al estar concebido también para carga, se le aplican restricciones similares a los vehículos de mercancías."}',
    '{"text":"Максимальная скорость для грузопассажирского автомобиля на автомагистрали составляет...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-007/05c55a86-c6f1-4f26-849c-750929c9761d_1768678511713.webp","options":["120 км/ч.","100 км/ч.","90 км/ч."],"correct":1,"explanation":"Максимальная скорость грузопассажирского автомобиля на автомагистрали составляет 100 км/ч, а не 120 км/ч как у обычного легкового. Поскольку он предназначен также для перевозки грузов, к нему применяются ограничения, аналогичные грузовым транспортным средствам."}'
  );

  -- ── Step 6 · Theory — Vehículo de uso compartido ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Vehículo de uso compartido (carsharing)"},
      {"type":"callout","variant":"info","title":"Definición legal","text":"Turismo destinado al alquiler sin conductor, de forma intensiva, a un número indeterminado de usuarios, mediante el pago de una tarifa."},
      {"type":"list","style":"check","title":"Requisitos para ostentar el distintivo VUC","items":[
        "Alquilado sin conductor (el usuario conduce él mismo)",
        "Uso intensivo por número indeterminado de usuarios",
        "Sistema de acceso y reserva automatizado (app o tarjeta)",
        "Cumple con la normativa específica de carsharing"
      ]},
      {"type":"callout","variant":"warning","text":"¡Ojo al examen! El vehículo de uso compartido NO puede alquilarse con conductor. El requisito clave es que sea ''sin conductor'' y para un número indeterminado de usuarios."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Автомобиль совместного использования (каршеринг)"},
      {"type":"callout","variant":"info","title":"Юридическое определение","text":"Легковой автомобиль, предназначенный для аренды без водителя, интенсивно, неограниченным числом пользователей, за плату по тарифу."},
      {"type":"list","style":"check","title":"Требования для знака VUC","items":[
        "Сдаётся без водителя (пользователь управляет сам)",
        "Интенсивное использование неопределённым кругом лиц",
        "Автоматизированная система доступа и бронирования (приложение или карта)",
        "Соответствует специальным нормам каршеринга"
      ]},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! Автомобиль совместного использования НЕ сдаётся с водителем. Ключевое требование — это ''без водителя'' и для неопределённого числа пользователей."}
    ]}'
  );

  -- ── Step 7 · Theory — Tabla comparativa subtipos ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"table","headers":["Subtipo","Característica clave","Límite velocidad autopista"],"rows":[
        ["Turismo","Hasta 9 plazas, uso personal","120 km/h"],
        ["Mixto adaptable","Personas + carga, doble función","100 km/h"],
        ["Derivado de turismo","Chasis turismo, sólo carga","100 km/h"],
        ["Autocaravana","Turismo + vivienda habitable","90 km/h"],
        ["Pick-up","Cabina + plataforma abierta","90 km/h"],
        ["Todoterreno","4x4, todo terreno","120 km/h"]
      ],"caption":"Velocidades máximas en autopista según subtipo"},
      {"type":"callout","variant":"tip","text":"Truco: si el vehículo lleva carga o transforma el turismo → 100 km/h o menos. El turismo puro y el todoterreno son los únicos que llegan a 120 km/h."}
    ]}',
    '{"blocks":[
      {"type":"table","headers":["Подтип","Ключевая характеристика","Макс. скорость на автомагистрали"],"rows":[
        ["Turismo","До 9 мест, личное использование","120 км/ч"],
        ["Mixto adaptable","Люди + груз, двойное назначение","100 км/ч"],
        ["Derivado de turismo","Шасси легкового, только груз","100 км/ч"],
        ["Autocaravana","Легковой + жилой отсек","90 км/ч"],
        ["Pick-up","Кабина + открытая платформа","90 км/ч"],
        ["Todoterreno","4x4, вседорожник","120 км/ч"]
      ],"caption":"Максимальные скорости на автомагистрали по подтипам"},
      {"type":"callout","variant":"tip","text":"Подсказка: если автомобиль везёт груз или переделан из легкового → 100 км/ч и ниже. Чистый легковой и внедорожник — единственные, кто едет 120 км/ч."}
    ]}'
  );

  -- ── Step 8 · Theory — Autoturismo y términos equivalentes ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"warning","title":"Autoturismo","text":"Término histórico equivalente a ''turismo''. Aparecía en la legislación anterior y puede encontrarse en preguntas de examen antiguas. Hoy el término correcto es simplemente ''turismo''."},
      {"type":"callout","variant":"danger","text":"El examen puede usar el término ''autoturismo'' como sinónimo de ''turismo''. Si ves autoturismo en una pregunta, trátalo exactamente igual que turismo: hasta 9 plazas, permiso B, 120 km/h en autopista."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"warning","title":"Autoturismo","text":"Исторический термин, эквивалентный ''turismo'' (легковому автомобилю). Встречался в старом законодательстве и может попасться в устаревших экзаменационных вопросах. Сегодня правильный термин — просто ''turismo''."},
      {"type":"callout","variant":"danger","text":"На экзамене может использоваться термин ''autoturismo'' как синоним ''turismo''. Если встретите ''autoturismo'' в вопросе — трактуйте его точно так же, как легковой: до 9 мест, права категории B, 120 км/ч на автомагистрали."}
    ]}'
  );

  -- ── Step 9 · Quiz — DGT 1e511325 (vehículo de uso compartido) ────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"¿Qué requisitos, entre otros, debe cumplir un turismo para estar clasificado como ''vehículo de uso compartido'' y poder llevar el distintivo de la imagen?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/1e511325-5430-4b58-83ed-36654963a0d6.webp","options":["Se debe alquilar sin conductor, de forma intensiva a un número indeterminado de usuarios.","Se debe poder alquilar con conductor a través de aplicaciones móviles.","Se debe poder alquilar con conductor los días laborables y sin conductor los festivos."],"correct":0,"explanation":"Para ser ''vehículo de uso compartido'' el turismo debe alquilarse SIN conductor, de forma intensiva y a un número indeterminado de usuarios. El alquiler con conductor (VTC, taxi) es una categoría completamente distinta."}',
    '{"text":"Каким требованиям, среди прочих, должен соответствовать легковой автомобиль, чтобы классифицироваться как «автомобиль совместного использования» и иметь право на этот знак?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/1e511325-5430-4b58-83ed-36654963a0d6.webp","options":["Он должен сдаваться в аренду без водителя, для интенсивного использования неопределённым кругом лиц.","Он должен быть доступен для аренды с водителем через мобильные приложения.","Он должен быть доступен для аренды с водителем в рабочие дни и без водителя в праздничные дни."],"correct":0,"explanation":"Чтобы быть ''автомобилем совместного использования'', легковой автомобиль должен сдаваться БЕЗ водителя, интенсивно и неопределённому числу пользователей. Аренда с водителем (VTC, такси) — это совершенно другая категория."}'
  );

  -- ── Step 10 · Quiz — authored (plazas máximas turismo) ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{"text":"Un vehículo automóvil destinado al transporte de personas, ¿cuántas plazas como máximo puede tener para ser clasificado como ''turismo''?","options":["5 plazas, incluido el conductor.","9 plazas, incluido el conductor.","7 plazas, incluido el conductor."],"correct":1,"explanation":"El turismo puede tener hasta 9 plazas incluyendo al conductor. Si el vehículo supera ese número de plazas, ya no es un turismo sino un autobús o microbús. Este límite de 9 plazas es uno de los datos más preguntados en el examen sobre clasificación de vehículos."}',
    '{"text":"Автомобиль, предназначенный для перевозки людей, сколько мест максимум он может иметь, чтобы классифицироваться как ''turismo'' (легковой)?","options":["5 мест, включая водителя.","9 мест, включая водителя.","7 мест, включая водителя."],"correct":1,"explanation":"Легковой автомобиль может иметь до 9 мест включая водителя. Если мест больше — это уже не легковой, а автобус или микроавтобус. Ограничение в 9 мест — один из наиболее часто проверяемых фактов на экзамене по классификации транспортных средств."}'
  );

  -- ── Step 11 · Theory — Resumen mnemónico ─────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Mnemotecnia: ''9-4-MDA''","text":"9 plazas máx → Turismo. 4 metros máx de altura. M = Mixto adaptable (100 km/h en autopista). D = Derivado (chasis turismo, sólo carga). A = Autocaravana (vida a bordo). Repite: 9-4-MDA hasta que salga solo."},
      {"type":"callout","variant":"info","title":"Repaso rápido — ¿qué permiso necesito?","text":"Todos los subtipos del turismo (mixto adaptable, derivado, autocaravana ≤3.500 kg, pick-up, todoterreno) se conducen con permiso B siempre que la MMA no supere 3.500 kg. A partir de 3.500 kg se necesita el C."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Мнемоника: «9-4-МДА»","text":"9 мест макс → Легковой. 4 метра макс высоты. М = Mixto adaptable (100 км/ч на автомагистрали). Д = Derivado (шасси легкового, только груз). А = Autocaravana (жизнь на борту). Повторяй: 9-4-МДА, пока не выучишь."},
      {"type":"callout","variant":"info","title":"Быстрый повтор — какие права нужны?","text":"Все подтипы легкового (mixto adaptable, derivado, autocaravana ≤3500 кг, pick-up, todoterreno) водятся с правами категории B при условии, что MMA не превышает 3500 кг. Свыше 3500 кг — нужна категория C."}
    ]}'
  );

  -- ── Step 12 · Quiz — authored (derivado de turismo) ──────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Qué es un ''derivado de turismo''?","options":["Un turismo con más de 9 plazas adaptado para grupos grandes.","Un vehículo construido sobre chasis de turismo destinado principalmente al transporte de mercancías.","Un turismo equipado con zona habitable para vivir durante el viaje."],"correct":1,"explanation":"El derivado de turismo es un vehículo que usa el chasis de un turismo pero está adaptado para transportar carga, eliminando las plazas traseras. No debe confundirse con la autocaravana (zona habitable) ni con el vehículo mixto adaptable (personas + carga simultáneamente)."}',
    '{"text":"Что такое «derivado de turismo» (производный от легкового)?","options":["Легковой автомобиль более чем с 9 местами, адаптированный для больших групп.","Автомобиль, построенный на шасси легкового и предназначенный преимущественно для перевозки грузов.","Легковой автомобиль, оснащённый жилым отсеком для проживания во время поездки."],"correct":1,"explanation":"Derivado de turismo — это автомобиль, использующий шасси легкового, но адаптированный для перевозки грузов с удалением задних сидений. Не путать с автодомом (жилой отсек) и грузопассажирским автомобилем (одновременно люди + груз)."}'
  );

END $$;
