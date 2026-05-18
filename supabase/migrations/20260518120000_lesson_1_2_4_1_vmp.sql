-- Module 1 · Lesson 1.2.4.1 — VMP (Vehículo de Movilidad Personal)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 3: DGT 89b1ddb4 (aceras → No)
-- Quiz Step 4: DGT 3af7111f (interurbanas → carril segregado)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.4.1',
     'VMP — Vehículo de Movilidad Personal',
     'ВМП — средство индивидуальной мобильности',
     7, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Definición y circulación permitida/prohibida ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Definición — VMP",
          "text": "Vehículo de una o más ruedas con una única plaza, conducido por persona mayor de 15 años y propulsado exclusivamente por motores eléctricos. Velocidad máxima por diseño: entre 6 y 25 km/h. Solo puede tener sillín si dispone de sistema de autoequilibrado."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "✅",
              "title": "Puede circular por...",
              "description": "Carril bici · Calzada urbana (borde derecho) · Zona de estancia y juego"
            },
            {
              "icon": "🚫",
              "title": "Prohibido circular por...",
              "description": "Aceras · Zonas peatonales · Túneles urbanos · Travesías · Vías interurbanas"
            }
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "Las vías interurbanas están SIEMPRE prohibidas para los VMP, incluso si la travesía discurre dentro de un núcleo urbano. Excepción: si existe un carril expresamente segregado del tráfico motorizado."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Определение — ВМП",
          "text": "ТС с 1+ колёсами, 1 посадочным местом, водитель от 15 лет, только электромотор. Максимальная скорость по конструкции: 6-25 км/ч. Сиденье допускается только при наличии системы самобалансировки."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "✅",
              "title": "Разрешено ехать по...",
              "description": "Велодорожкам · Проезжей части города (правый край) · Зонам отдыха и игр"
            },
            {
              "icon": "🚫",
              "title": "Запрещено ехать по...",
              "description": "Тротуарам · Пешеходным зонам · Городским тоннелям · Travesías · Межгородским дорогам"
            }
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Важно для экзамена!",
          "text": "Межгородские дороги ВСЕГДА запрещены для ВМП, даже если travesía проходит через населённый пункт. Исключение: при наличии специально выделенной полосы, отделённой от моторного трафика."
        }
      ]
    }'
  );

  -- ── Step 2 · Equipamiento obligatorio y datos clave ──────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Equipamiento obligatorio"
        },
        {
          "type": "list",
          "style": "check",
          "items": [
            "💡 Luz delantera (blanca) y trasera (roja)",
            "🛑 Luz de freno obligatoria — NO puede sustituirse por catadióptrico",
            "🔆 Catadióptrico delantero (blanco), laterales y trasero (rojo)",
            "🔔 Avisador acústico — obligatorio en TODOS los VMP sin excepción",
            "🌙 De noche: prenda reflectante para el conductor"
          ]
        },
        {
          "type": "stats",
          "stats": [
            {"value": "6-25", "label": "km/h", "note": "velocidad máxima por diseño"},
            {"value": "15", "label": "años mín.", "note": "edad mínima del conductor"},
            {"value": "1", "label": "plaza", "note": "solo conductor, sin pasajeros"}
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Tres trampas del examen",
          "text": "1) El casco NO es obligatorio como norma general (puede serlo por ordenanza municipal). 2) La luz de freno NO puede sustituirse por catadióptrico. 3) Los conductores de VMP están sujetos a pruebas de alcoholemia y drogas igual que todos los conductores."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Обязательное оборудование"
        },
        {
          "type": "list",
          "style": "check",
          "items": [
            "💡 Фара спереди (белая) и сзади (красная)",
            "🛑 Стоп-сигнал обязателен — НЕЛЬЗЯ заменить катафотом",
            "🔆 Катафот спереди (белый), с боков и сзади (красный)",
            "🔔 Звуковой сигнал — обязателен для ВСЕХ ВМП без исключения",
            "🌙 Ночью: светоотражающий жилет для водителя"
          ]
        },
        {
          "type": "stats",
          "stats": [
            {"value": "6-25", "label": "км/ч", "note": "максимальная скорость по конструкции"},
            {"value": "15", "label": "лет мин.", "note": "минимальный возраст водителя"},
            {"value": "1", "label": "место", "note": "только водитель, без пассажиров"}
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Три ловушки на экзамене",
          "text": "1) Шлем НЕ обязателен как общая норма (может быть обязателен по муниципальному постановлению). 2) Стоп-сигнал НЕЛЬЗЯ заменить катафотом. 3) Водители ВМП обязаны проходить тест на алкоголь и наркотики наравне с другими водителями."
        }
      ]
    }'
  );

  -- ── Step 3 · Quiz — aceras prohibidas (DGT 89b1ddb4) ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{
      "text": "Como norma general, ¿está permitida la circulación de vehículos de movilidad personal por las aceras?",
      "options": ["Sí.", "No.", "Sólo si por construcción no alcanzan una velocidad superior a 25 km/h."],
      "correct": 1,
      "explanation": "La circulación de VMP por las aceras está PROHIBIDA con carácter general. Los VMP circulan por el carril bici, y si no existe, por la calzada pegados al borde derecho. Las aceras y zonas peatonales siempre están vetadas a los VMP."
    }',
    '{
      "text": "Как правило, разрешено ли ВМП передвигаться по тротуарам?",
      "options": ["Да.", "Нет.", "Только если конструктивно не превышают 25 км/ч."],
      "correct": 1,
      "explanation": "Езда ВМП по тротуарам ЗАПРЕЩЕНА в общем порядке. ВМП едут по велодорожке, а при её отсутствии — по правому краю проезжей части. Тротуары и пешеходные зоны всегда закрыты для ВМП."
    }'
  );

  -- ── Step 4 · Quiz — vías interurbanas → carril segregado (DGT 3af7111f) ─
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{
      "text": "Un vehículo de movilidad personal, ¿puede circular por vías interurbanas?",
      "options": ["Sí, siempre que tengan arcén suficiente.", "Sí, si existe un carril segregado del tráfico motorizado.", "No, solo pueden circular por vías urbanas y travesías."],
      "correct": 1,
      "explanation": "Como norma general los VMP tienen prohibido circular por vías interurbanas. La excepción: pueden hacerlo si existe un carril específicamente segregado del tráfico motorizado. Las travesías también están prohibidas para los VMP."
    }',
    '{
      "text": "Может ли ВМП ехать по межгородским дорогам?",
      "options": ["Да, если есть достаточная обочина.", "Да, если есть выделенная полоса, отделённая от моторного трафика.", "Нет, только по городским дорогам и travesías."],
      "correct": 1,
      "explanation": "Как правило, ВМП запрещено ехать по межгородским дорогам. Исключение: при наличии специально выделенной полосы, отделённой от моторного трафика. По travesías также запрещено."
    }'
  );

END $$;
