-- Reorder Module 1 + Rename 1.2.2 + Rename 1.2.5 + Lesson 1.2.3 — Vehículo especial
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Reorder: shift order>=7 by +2, then fix 1.2.4/1.2.4.1 swap, 1.2.5 final pos
-- Rename: 1.2.2 → "Automóvil", 1.2.5 → "Ciclomotor"
-- Quiz Step  4: DGT eba098dd (velocidad máxima vehículo especial = 40 km/h)
-- Quiz Step  5: DGT 5a71685e (sin señalización frenado → 25 km/h)
-- Quiz Step  7: DGT dbef6f64 (señal V-2 al entrar a autopista)
-- Quiz Step  9: authored (permiso B para tractor ≤3500 kg MMA)
-- Quiz Step 11: authored (vías prohibidas para vehículos especiales)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  -- ── Reordering ────────────────────────────────────────────────────────────
  -- Shift order_index >= 7 por +2 para hacer hueco
  UPDATE course_lessons SET order_index = order_index + 2 WHERE module_id = mod_id AND order_index >= 7;
  -- Estado: 1.2.4.1=9, 1.2.4=10, 1.2.5=11 · posiciones 7,8 libres

  -- 1.2.4 (Ciclos) debe ir antes que 1.2.4.1 (VMP) → mover de 10 a 8
  UPDATE course_lessons SET order_index = 8 WHERE module_id = mod_id AND code = '1.2.4';
  -- Estado: 1.2.4=8, 1.2.4.1=9, 1.2.5=11 · posiciones 7,10 libres

  -- 1.2.5 debe quedar en 10
  UPDATE course_lessons SET order_index = 10 WHERE module_id = mod_id AND code = '1.2.5';
  -- Estado: 1.2.4=8, 1.2.4.1=9, 1.2.5=10 · posición 7 libre para 1.2.3

  -- ── Renombrar lecciones existentes ────────────────────────────────────────
  UPDATE course_lessons
    SET title_es = 'Automóvil', title_ru = 'Автомобиль'
  WHERE module_id = mod_id AND code = '1.2.2';

  UPDATE course_lessons
    SET title_es = 'Ciclomotor', title_ru = 'Мопед (Ciclomotor)'
  WHERE module_id = mod_id AND code = '1.2.5';

  -- ── Crear lección 1.2.3 — Vehículo especial ───────────────────────────────
  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.3',
     'Vehículo especial',
     'Специальное транспортное средство',
     7, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Definición y tipos ───────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Qué es un vehículo especial?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Definición legal",
          "text": "Vehículo especial: aquel que, por sus características técnicas o por la actividad para la que fue concebido, está autorizado a superar los límites de masa, dimensiones o velocidad establecidos para los vehículos de su categoría. No están diseñados para el transporte de personas o mercancías como fin principal, sino para realizar trabajos."
        },
        {
          "type": "list",
          "style": "arrow",
          "title": "Tipos principales",
          "items": [
            "Agrícolas: tractores, cosechadoras, remolques agrícolas",
            "Obras y construcción: excavadoras, grúas automotrices, niveladoras",
            "Conservación de vías: barredoras, quitanieves, fresadoras de asfalto",
            "Servicios municipales: camiones de basura, cisternas de riego"
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Что такое специальное транспортное средство?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Определение из закона",
          "text": "Специальное транспортное средство — то, которое по своим техническим характеристикам или назначению имеет право превышать ограничения по массе, габаритам или скорости, установленные для ТС его категории. Не предназначено для перевозки людей или грузов как основной цели — только для выполнения работ."
        },
        {
          "type": "list",
          "style": "arrow",
          "title": "Основные типы",
          "items": [
            "Сельскохозяйственные: тракторы, комбайны, прицепы",
            "Строительные: экскаваторы, самоходные краны, грейдеры",
            "Обслуживание дорог: подметальные машины, снегоуборщики, асфальтоукладчики",
            "Муниципальные службы: мусоровозы, поливальные машины"
          ]
        }
      ]
    }'
  );

  -- ── Step 2 · Velocidades máximas ──────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Velocidades máximas de los vehículos especiales"
        },
        {
          "type": "stats",
          "stats": [
            {"value": "40 km/h", "label": "velocidad máxima general", "note": "límite genérico para todo vehículo especial"},
            {"value": "25 km/h", "label": "sin señalización frenado", "note": "si carece de señal de frenado visible"},
            {"value": "30 km/h", "label": "conjunto de vehículos", "note": "tractor agrícola con remolque fuera de poblado"}
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "La velocidad máxima general para un vehículo especial es 40 km/h. Pero si NO dispone de señalización de frenado, el límite baja a 25 km/h. Esta distinción aparece siempre en el examen."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Максимальные скорости специальных ТС"
        },
        {
          "type": "stats",
          "stats": [
            {"value": "40 км/ч", "label": "общий максимум", "note": "общий лимит для всех специальных ТС"},
            {"value": "25 км/ч", "label": "без сигнала торможения", "note": "если нет видимого сигнала торможения"},
            {"value": "30 км/ч", "label": "состав ТС", "note": "сельскохоз. трактор с прицепом вне нас. пунктов"}
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Общий максимум для специального ТС — 40 км/ч. Но если нет сигнализации торможения, лимит снижается до 25 км/ч. Это различие всегда встречается на экзамене."
        }
      ]
    }'
  );

  -- ── Step 3 · Señales especiales V-1 y V-2 ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Señales luminosas V-1 y V-2"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "V-1 — Luz giratoria naranja",
          "text": "Señal V-1: luz giratoria o intermitente de color amarillo-anaranjado visible desde todas las direcciones. Se activa cuando el vehículo especial circula por la vía, para advertir a otros conductores de su presencia y características excepcionales."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "V-2 — Luz giratoria amarilla en autopista",
          "text": "Señal V-2: luz giratoria o intermitente amarilla. Los vehículos especiales de reparación de vías que accedan a autopistas deben encenderla desde el momento de entrar a la autopista, no solo cuando lleguen a la zona de obras."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Световые сигналы V-1 и V-2"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "V-1 — Оранжевый вращающийся маяк",
          "text": "Сигнал V-1: вращающийся или мигающий маяк жёлто-оранжевого цвета, видимый со всех сторон. Включается, когда специальное ТС движется по дороге — чтобы предупреждать других водителей о его присутствии и особых характеристиках."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "V-2 — Жёлтый маяк на автомагистрали",
          "text": "Сигнал V-2: жёлтый вращающийся или мигающий маяк. Специальные ТС для ремонта дорог, въезжающие на автомагистраль, обязаны включить его с момента въезда на автомагистраль, а не только когда доберутся до зоны работ."
        }
      ]
    }'
  );

  -- ── Step 4 · Quiz — DGT eba098dd (velocidad máxima 40 km/h) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{
      "text": "La velocidad máxima, con carácter general, para un vehículo especial es de...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-011/eba098dd-6b2c-4d0b-8292-88cfb20469c3_1768749297343.webp",
      "options": [
        "45 kilómetros por hora.",
        "40 kilómetros por hora.",
        "60 kilómetros por hora."
      ],
      "correct": 1,
      "explanation": "La velocidad máxima general para los vehículos especiales es de 40 km/h, no 45 ni 60. Este límite puede reducirse aún más a 25 km/h si el vehículo carece de señalización de frenado visible."
    }',
    '{
      "text": "Какова максимальная скорость, в общем случае, для специального транспортного средства?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-011/eba098dd-6b2c-4d0b-8292-88cfb20469c3_1768749297343.webp",
      "options": [
        "45 километров в час.",
        "40 километров в час.",
        "60 километров в час."
      ],
      "correct": 1,
      "explanation": "Общий максимум для специальных ТС — 40 км/ч, не 45 и не 60. Этот лимит может снизиться до 25 км/ч, если у ТС нет видимой сигнализации торможения."
    }'
  );

  -- ── Step 5 · Quiz — DGT 5a71685e (sin señalización frenado → 25 km/h) ────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{
      "text": "Un vehículo especial que carece de señalización de frenado, no debe rebasar la velocidad máxima de...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-013/5a71685e-1c39-4349-94a6-33e0bb912ddc_1768755334745.webp",
      "options": [
        "70 km/h.",
        "40 km/h.",
        "25 km/h."
      ],
      "correct": 2,
      "explanation": "Cuando un vehículo especial carece de señalización de frenado visible (luces de freno), su velocidad máxima se reduce a 25 km/h. La respuesta 40 km/h es el límite general, pero se aplica cuando SÍ hay señalización de frenado."
    }',
    '{
      "text": "Специальное транспортное средство, не имеющее сигнализации торможения, не должно превышать максимальную скорость...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-013/5a71685e-1c39-4349-94a6-33e0bb912ddc_1768755334745.webp",
      "options": [
        "70 км/ч.",
        "40 км/ч.",
        "25 км/ч."
      ],
      "correct": 2,
      "explanation": "Если у специального ТС нет видимой сигнализации торможения (стоп-сигналов), максимальная скорость снижается до 25 км/ч. Ответ 40 км/ч — это общий лимит, который применяется только при наличии сигнализации торможения."
    }'
  );

  -- ── Step 6 · Circulación — dónde pueden y no pueden ──────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Dónde pueden circular los vehículos especiales?"
        },
        {
          "type": "table",
          "headers": ["Vía", "¿Permitido?", "Condición"],
          "rows": [
            ["Carretera convencional", "✅ Sí", "Con señal V-1 si supera dimensiones normales"],
            ["Autopista / autovía", "⚠️ Solo excepción", "Para acceder a zona de obras con señal V-2"],
            ["Vía urbana", "✅ Sí", "Con precaución, respetando velocidad 40 km/h"],
            ["Arcén de carretera", "✅ Sí", "Tractor agrícola ≤2.500 kg MMA puede circular por arcén"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "Los vehículos especiales tienen PROHIBIDA la circulación general por autopistas y autovías. Solo pueden acceder de forma excepcional para ir a una zona de obras, y en ese caso deben encender la señal V-2 desde que entran a la vía."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Где могут ездить специальные ТС?"
        },
        {
          "type": "table",
          "headers": ["Дорога", "Разрешено?", "Условие"],
          "rows": [
            ["Обычная дорога", "✅ Да", "С сигналом V-1 при превышении стандартных габаритов"],
            ["Autopista / autovía", "⚠️ Только исключение", "Для въезда в зону работ с сигналом V-2"],
            ["Городская дорога", "✅ Да", "Осторожно, не более 40 км/ч"],
            ["Обочина дороги", "✅ Да", "Сельскохоз. трактор ≤2500 кг ММА может ехать по обочине"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Специальным ТС ЗАПРЕЩЕНО ездить по autopistas и autovías в общем порядке. Только как исключение — для въезда в зону дорожных работ. В этом случае сигнал V-2 должен быть включён с момента въезда на дорогу."
        }
      ]
    }'
  );

  -- ── Step 7 · Quiz — DGT dbef6f64 (señal V-2 en autopista) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{
      "text": "Un vehículo especial de reparación de las vías va circulando por autopista para acceder a una zona de obras en la vía, ¿debe encender la señal luminosa V-2?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-002/dbef6f64-5410-457f-9cf1-09ed2af00ddf_1768867334696_pro.webp",
      "options": [
        "No debe encenderse hasta llegar a la zona de obras.",
        "Cuando entre a la autopista.",
        "Solo debe encenderse entre la puesta y la salida del sol."
      ],
      "correct": 1,
      "explanation": "La señal V-2 debe encenderse desde el momento en que el vehículo especial entra a la autopista, no solo cuando llega a la zona de obras. Tampoco se limita a la noche: debe activarse siempre que circule por autopista de camino a una zona de obras."
    }',
    '{
      "text": "Специальный автомобиль для ремонта дорог следует по автомагистрали к месту проведения работ. Должен ли он включить световой сигнал V-2?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-002/dbef6f64-5410-457f-9cf1-09ed2af00ddf_1768867334696_pro.webp",
      "options": [
        "Его не следует включать до прибытия в зону работ.",
        "При въезде на автомагистраль.",
        "Его следует включать только в период от заката до рассвета."
      ],
      "correct": 1,
      "explanation": "Сигнал V-2 должен быть включён с момента въезда специального ТС на автомагистраль, а не только у зоны работ. Он также не ограничен ночным временем — включается всегда, когда ТС едет по автомагистрали к зоне работ."
    }'
  );

  -- ── Step 8 · Documentación y permisos ────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Documentación y permisos de conducción"
        },
        {
          "type": "callout",
          "variant": "info",
          "text": "Los vehículos especiales requieren matrícula y seguro obligatorio igual que los demás vehículos. El permiso de conducción depende del tipo y la masa del vehículo."
        },
        {
          "type": "table",
          "headers": ["Vehículo", "Permiso necesario"],
          "rows": [
            ["Tractor agrícola ≤3.500 kg MMA", "Clase B"],
            ["Tractor agrícola >3.500 kg MMA", "Clase C"],
            ["Maquinaria de obras (autopropulsada)", "Clase B o C según masa"],
            ["Vehículo especial con escolta", "Permiso específico de transportes especiales"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "El permiso B autoriza a conducir tractores agrícolas de hasta 3.500 kg de MMA. Para tractores que superen ese peso es necesario el permiso C."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Документы и водительские права"
        },
        {
          "type": "callout",
          "variant": "info",
          "text": "Специальные ТС требуют регистрационных номеров и обязательного страхования, как и обычные ТС. Водительское удостоверение зависит от типа и массы транспортного средства."
        },
        {
          "type": "table",
          "headers": ["Транспортное средство", "Нужные права"],
          "rows": [
            ["Сельскохоз. трактор ≤3500 кг ММА", "Категория B"],
            ["Сельскохоз. трактор >3500 кг ММА", "Категория C"],
            ["Строительная техника (самоходная)", "Кат. B или C в зависимости от массы"],
            ["Спецтехника с сопровождением", "Специальное разрешение на негабарит"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Внимание!",
          "text": "Права категории B позволяют управлять сельскохозяйственными тракторами с ММА до 3500 кг. Для тракторов с большей массой нужна категория C."
        }
      ]
    }'
  );

  -- ── Step 9 · Quiz — authored (permiso B para tractor ≤3500 kg) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{
      "text": "Para conducir un tractor agrícola cuya masa máxima autorizada (MMA) no supere los 3.500 kilogramos, ¿qué permiso de conducción se requiere?",
      "options": [
        "Permiso de la clase C.",
        "Permiso de la clase B.",
        "Permiso especial de maquinaria agrícola."
      ],
      "correct": 1,
      "explanation": "El permiso de clase B es suficiente para conducir tractores agrícolas con MMA de hasta 3.500 kg. Para tractores que superen ese peso máximo autorizado se necesita el permiso de clase C. No existe un permiso especial de maquinaria agrícola como tal en el sistema español."
    }',
    '{
      "text": "Какие водительские права нужны для управления сельскохозяйственным трактором с максимальной авторизованной массой (ММА) не более 3500 кг?",
      "options": [
        "Права категории C.",
        "Права категории B.",
        "Специальное разрешение на сельскохозяйственную технику."
      ],
      "correct": 1,
      "explanation": "Для управления сельскохозяйственным трактором с ММА до 3500 кг достаточно прав категории B. Для тракторов с большей авторизованной массой нужна категория C. Специального разрешения на сельскохозяйственную технику в испанской системе не существует."
    }'
  );

  -- ── Step 10 · Equipamiento obligatorio ───────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Equipamiento obligatorio"
        },
        {
          "type": "list",
          "style": "check",
          "title": "Todo vehículo especial debe llevar",
          "items": [
            "Señal V-1 (luz giratoria naranja) si sus dimensiones superan las normales",
            "Dispositivos de señalización delantera y trasera (luces)",
            "Señales de posición laterales si la anchura supera 2,10 metros",
            "Señal V-2 si circula por autopista en dirección a zona de obras",
            "Matrícula visible y seguro obligatorio en vigor"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "Un conjunto de vehículos no agrícolas (p. ej. grúa con plataforma) que circule debe llevar, entre otros, señalización de posición lateral. Esta señalización no es opcional cuando se superan los 2,10 m de anchura."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Обязательное оснащение"
        },
        {
          "type": "list",
          "style": "check",
          "title": "Каждое специальное ТС должно иметь",
          "items": [
            "Сигнал V-1 (оранжевый вращающийся маяк), если габариты превышают стандартные",
            "Передние и задние световые приборы",
            "Боковые огни, если ширина превышает 2,10 метра",
            "Сигнал V-2 при движении по автомагистрали к зоне работ",
            "Видимый номерной знак и действующий полис обязательного страхования"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Нетранспортные сочленённые ТС (например, кран с платформой) при движении должны иметь боковые огни. Это не опционально при ширине свыше 2,10 м."
        }
      ]
    }'
  );

  -- ── Step 11 · Quiz — authored (vías prohibidas para vehículos especiales) ─
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{
      "text": "¿Por qué tipo de vías tienen prohibida la circulación los vehículos especiales con carácter general?",
      "options": [
        "Por carreteras convencionales sin arcén.",
        "Por autopistas y autovías.",
        "Por vías urbanas de más de dos carriles."
      ],
      "correct": 1,
      "explanation": "Los vehículos especiales tienen prohibida, con carácter general, la circulación por autopistas y autovías. Solo pueden acceder de forma excepcional cuando se dirigen a una zona de obras, debiendo activar la señal V-2 al entrar. Las carreteras convencionales y las vías urbanas sí les están permitidas."
    }',
    '{
      "text": "На каких типах дорог специальным ТС запрещено движение в общем порядке?",
      "options": [
        "По обычным дорогам без обочины.",
        "По автомагистралям и скоростным дорогам.",
        "По городским дорогам с более чем двумя полосами."
      ],
      "correct": 1,
      "explanation": "Специальным ТС запрещено движение по автомагистралям и скоростным дорогам в общем порядке. Только как исключение — при движении к зоне дорожных работ, с включённым сигналом V-2 с момента въезда. Обычные дороги и городские улицы для них разрешены."
    }'
  );

  -- ── Step 12 · Resumen ─────────────────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Resumen: vehículo especial"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚜",
              "title": "Definición",
              "description": "Diseñado para trabajos, no transporte. Puede superar límites de masa, dimensiones o velocidad."
            },
            {
              "icon": "🚦",
              "title": "Velocidad",
              "description": "40 km/h general. 25 km/h si no tiene señalización de frenado."
            },
            {
              "icon": "🔶",
              "title": "Señales V-1 / V-2",
              "description": "V-1: en carretera (luz naranja giratoria). V-2: en autopista hacia zona de obras, desde la entrada."
            },
            {
              "icon": "🚫",
              "title": "Autopistas",
              "description": "Prohibidas en general. Solo como excepción para zona de obras, con V-2 activa."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Mnemónica: 40-25-V2",
          "text": "40 km/h general. 25 km/h sin frenos visibles. V-2 encendida al entrar a autopista (no al llegar a obras)."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Итог: специальное ТС"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚜",
              "title": "Определение",
              "description": "Предназначено для работ, не перевозки. Может превышать стандарты по массе, габаритам или скорости."
            },
            {
              "icon": "🚦",
              "title": "Скорость",
              "description": "40 км/ч в общем случае. 25 км/ч без сигнализации торможения."
            },
            {
              "icon": "🔶",
              "title": "Сигналы V-1 / V-2",
              "description": "V-1: на дороге (оранж. маяк). V-2: на автомагистрали к зоне работ, с момента въезда."
            },
            {
              "icon": "🚫",
              "title": "Автомагистрали",
              "description": "Запрещены в общем порядке. Только как исключение для зоны работ, с включённым V-2."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Мнемоника: 40-25-V2",
          "text": "40 км/ч общий лимит. 25 км/ч без стоп-сигнала. V-2 включается при въезде на автомагистраль (не при прибытии к работам)."
        }
      ]
    }'
  );

END $$;
