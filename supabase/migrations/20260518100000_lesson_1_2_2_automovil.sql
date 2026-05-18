-- Module 1 · Lesson 1.2.2 — Automóvil y vehículo especial
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 3 uses real DGT question 52f54312 (tractor con remolque → 25 km/h)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.2',
     'Automóvil y vehículo especial',
     'Автомобиль и спецтехника',
     6, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Automóvil — definición y tipos ──────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Definición — Automóvil",
          "text": "Vehículo de motor que sirve para transportar personas, cosas o ambas, o para la tracción de otros vehículos. Los vehículos especiales NO se consideran automóviles."
        },
        {
          "type": "text",
          "text": "Los vehículos a motor se dividen en dos familias con reglas distintas:"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚗",
              "title": "Automóviles",
              "description": "Turismo · Motocicleta · Autobús · Camión · Tractocamión · Furgón / Furgoneta · Vehículo mixto · Derivado de turismo · Autocaravana"
            },
            {
              "icon": "🚜",
              "title": "Vehículos especiales",
              "description": "Tractor agrícola · Motocultor · Tren turístico · Tractor de obras · Máquina de obras · Quad / ATV — NO son automóviles"
            }
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "El tractor agrícola, el motocultor y la maquinaria de obras son vehículos ESPECIALES — no automóviles. Esta distinción aparece con frecuencia en las preguntas DGT."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Определение — Автомобиль",
          "text": "Моторное ТС для перевозки людей, грузов или того и другого, либо для буксировки других ТС. Спецтехника автомобилями НЕ является."
        },
        {
          "type": "text",
          "text": "Все моторные ТС делятся на два семейства с разными правилами:"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚗",
              "title": "Автомобили",
              "description": "Легковой · Мотоцикл · Автобус · Грузовик · Тягач · Фургон · Смешанное ТС · Производное от легкового · Автокемпер"
            },
            {
              "icon": "🚜",
              "title": "Спецтехника",
              "description": "С/х трактор · Мотокультиватор · Туристический поезд · Строительный трактор · Строительная машина · Квадроцикл — НЕ автомобили"
            }
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Важно для экзамена!",
          "text": "С/х трактор, мотокультиватор и строительные машины — это СПЕЦТЕХНИКА, а не автомобили. Этот вопрос часто встречается на экзамене DGT."
        }
      ]
    }'
  );

  -- ── Step 2 · Vehículo especial — tipos y velocidades ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Definición — Vehículo especial",
          "text": "Vehículo autopropulsado o remolcado, construido para obras, servicios o trabajos agrícolas. Puede superar los límites legales de masa y dimensiones."
        },
        {
          "type": "heading",
          "text": "Tipos principales"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "🌾 Tractor agrícola — 2+ ejes, arrastra / empuja / lleva aperos y maquinaria",
            "🔧 Motocultor — 1 eje, conducido a pie mediante manceras",
            "🚂 Tren turístico — vehículo tractor + remolques para transporte de turistas",
            "🏗️ Tractor de obras — arrastra útiles, máquinas o vehículos de obra",
            "🚧 Máquina de obras automotriz o remolcada",
            "🏎️ Quad / ATV — 4+ ruedas, uso fuera de carretera, manillar"
          ]
        },
        {
          "type": "stats",
          "stats": [
            {"value": "40", "label": "km/h máx", "note": "vehículo especial (general)"},
            {"value": "25", "label": "km/h máx", "note": "con remolque · sin luz freno · motocultor"},
            {"value": "70", "label": "km/h máx", "note": "si construcción supera 60 km/h"}
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Tren turístico — dos datos del examen",
          "text": "1) Velocidad máxima por construcción: 25 km/h. 2) No tiene instalados cinturones de seguridad. Ambos datos aparecen en preguntas reales DGT."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Определение — Спецтехника",
          "text": "Самоходное или буксируемое ТС для строительных, сельскохозяйственных или сервисных работ. Может превышать установленные ограничения по массе и габаритам."
        },
        {
          "type": "heading",
          "text": "Основные типы"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "🌾 С/х трактор — 2+ оси, тянет / толкает / несёт навесное оборудование",
            "🔧 Мотокультиватор — 1 ось, управляется пешком через рукоятки",
            "🚂 Туристический поезд — тягач + прицепы для туристов",
            "🏗️ Строительный трактор — тянет инструменты, машины или строительные ТС",
            "🚧 Строительная машина (самоходная или прицепная)",
            "🏎️ Квадроцикл / ATV — 4+ колеса, внедорожный, руль-манипулятор"
          ]
        },
        {
          "type": "stats",
          "stats": [
            {"value": "40", "label": "км/ч макс", "note": "спецтехника (общий лимит)"},
            {"value": "25", "label": "км/ч макс", "note": "с прицепом · без стоп-сигнала · мотокультиватор"},
            {"value": "70", "label": "км/ч макс", "note": "если конструктивно >60 км/ч"}
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Туристический поезд — два экзаменационных факта",
          "text": "1) Максимальная скорость по конструкции: 25 км/ч. 2) Ремни безопасности НЕ установлены. Оба факта встречаются в реальных вопросах DGT."
        }
      ]
    }'
  );

  -- ── Step 3 · Quiz — tractor con remolque → 25 km/h (DGT id 52f54312) ────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{
      "text": "Un tractor que arrastra un remolque, ¿qué velocidad máxima no debe rebasar fuera de poblado?",
      "options": ["25 km/h", "40 km/h", "70 km/h"],
      "correct": 0,
      "explanation": "Los vehículos especiales tienen una velocidad máxima genérica de 40 km/h. Este límite se reduce a 25 km/h en tres casos: si arrastran un remolque, si carecen de luz de freno, o si son motocultores. Al llevar remolque, impera la restricción de 25 km/h."
    }',
    '{
      "text": "Трактор, буксирующий прицеп — какую максимальную скорость он не должен превышать за пределами населённого пункта?",
      "options": ["25 км/ч", "40 км/ч", "70 км/ч"],
      "correct": 0,
      "explanation": "Спецтехника имеет общий лимит 40 км/ч. Он снижается до 25 км/ч в трёх случаях: при буксировке прицепа, при отсутствии стоп-сигнала, или если это мотокультиватор. При буксировке прицепа действует ограничение 25 км/ч."
    }'
  );

  -- ── Step 4 · Quiz — ¿cuál NO es automóvil? ──────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{
      "text": "¿Cuál de los siguientes vehículos NO es un automóvil según el Reglamento General de Vehículos?",
      "options": ["Turismo", "Furgón", "Tractor agrícola", "Tractocamión"],
      "correct": 2,
      "explanation": "El tractor agrícola es un vehículo especial, no un automóvil. Los vehículos especiales se construyen para obras, servicios o agricultura y no se incluyen en la categoría de automóviles, aunque tengan motor."
    }',
    '{
      "text": "Какое из перечисленных ТС НЕ является автомобилем согласно Общему регламенту о транспортных средствах?",
      "options": ["Легковой автомобиль", "Фургон", "С/х трактор", "Тягач"],
      "correct": 2,
      "explanation": "С/х трактор является спецтехникой, а не автомобилем. Спецтехника создаётся для строительных, сельскохозяйственных или сервисных работ и не входит в категорию автомобилей, несмотря на наличие двигателя."
    }'
  );

END $$;
