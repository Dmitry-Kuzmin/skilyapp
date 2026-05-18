-- Lesson 1.2.5 Ciclomotor — расширение контента
-- Добавляем 2 новые теории (steps 3, 4) + 4 новых квиза (steps 8-11)
-- Существующие квизы сдвигаются с 3,4,5 → 5,6,7

DO $$
DECLARE
  l_id uuid := 'ae530387-fde0-4d99-bf08-b9958d060c1d';
BEGIN

  -- Освобождаем позиции 3 и 4 для новых теорий
  UPDATE lesson_steps
  SET order_index = order_index + 2
  WHERE lesson_id = l_id AND order_index >= 3;

  -- ── Step 3 · Circulación — arcén obligatorio, velocidad, prohibiciones ────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{
      "blocks": [
        {
          "type": "stats",
          "stats": [
            {"value": "45", "label": "km/h máx", "note": "límite absoluto por construcción"},
            {"value": "2", "label": "en columna", "note": "en arcén transitable y suficiente"},
            {"value": "0", "label": "autovías", "note": "prohibidas para ciclomotores"}
          ]
        },
        {
          "type": "heading",
          "text": "¿Por dónde debe circular el ciclomotor?"
        },
        {
          "type": "table",
          "headers": ["Tipo de vía", "Obligación"],
          "rows": [
            ["Carretera convencional CON arcén transitable y suficiente", "🟡 ARCÉN DERECHO (obligatorio)"],
            ["Carretera convencional SIN arcén transitable", "Carril derecho, lo imprescindible"],
            ["Vía urbana", "Borde derecho de la calzada"],
            ["Autovía / Autopista", "❌ PROHIBIDO"],
            ["Carretera reservada / VAO", "❌ PROHIBIDO"]
          ],
          "caption": "Si el arcén es transitable y suficiente → el ciclomotor DEBE ir por el arcén, nunca por la calzada."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Trampa clásica del examen! — El arcén es obligatorio",
          "text": "Cuando hay arcén transitable y suficiente, el ciclomotor DEBE circular por él. Elegir borde derecho de la calzada cuando hay arcén es INCORRECTO. Esta distinción aparece en múltiples preguntas DGT y es la trampa más frecuente del tema."
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Columna de a dos — excepción al arcén",
          "text": "Los ciclomotores pueden circular en columna de a dos por el arcén, pero solo de forma EXCEPCIONAL y únicamente si el arcén es transitable y tiene dimensiones suficientes para garantizar la seguridad. Si el arcén es estrecho → fila india."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "stats",
          "stats": [
            {"value": "45", "label": "км/ч макс", "note": "абсолютный конструктивный лимит"},
            {"value": "2", "label": "в колонне", "note": "на проходимой достаточной обочине"},
            {"value": "0", "label": "автомагистралей", "note": "мопедам всегда запрещено"}
          ]
        },
        {
          "type": "heading",
          "text": "По какой части дороги едет мопед?"
        },
        {
          "type": "table",
          "headers": ["Тип дороги", "Требование"],
          "rows": [
            ["Обычная дорога С проходимой достаточной обочиной", "🟡 ОБОЧИНА (обязательно)"],
            ["Обычная дорога БЕЗ проходимой обочины", "Правая полоса, занимая необходимое место"],
            ["Городская дорога", "Правый край проезжей части"],
            ["Автострада / Автомагистраль", "❌ ЗАПРЕЩЕНО"],
            ["Резервная полоса / VAO", "❌ ЗАПРЕЩЕНО"]
          ],
          "caption": "Если обочина проходима и достаточна → мопед ОБЯЗАН ехать по обочине, не по проезжей части."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Классическая ловушка экзамена! — Обочина обязательна",
          "text": "При наличии проходимой и достаточной обочины мопед ОБЯЗАН ехать по ней. Выбрать правый край проезжей части при наличии обочины — НЕВЕРНО. Это различие встречается во многих вопросах DGT и является самой частой ловушкой темы."
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Колонна по двое — исключение для обочины",
          "text": "Мопеды могут ехать по обочине в колонне по двое, но только ИСКЛЮЧИТЕЛЬНО и только если обочина проходима и достаточна по размерам для безопасности. На узкой обочине → по одному."
        }
      ]
    }'
  );

  -- ── Step 4 · Equipamiento obligatorio y permiso AM ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'theory',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Permiso AM — para conducir ciclomotores",
          "text": "El permiso de la clase AM autoriza a conducir ciclomotores (L1e, L2e) y cuadriciclos ligeros (L6e). La edad mínima para obtenerlo es de 15 años. A diferencia del VMP, el ciclomotor SÍ requiere permiso de conducción."
        },
        {
          "type": "heading",
          "text": "Equipamiento obligatorio del ciclomotor"
        },
        {
          "type": "list",
          "style": "check",
          "items": [
            "🪖 Casco homologado — obligatorio para conductor Y para el pasajero (si lo lleva)",
            "🔆 Matrícula amarilla — característica identificativa del ciclomotor",
            "📋 ITV — debe pasar la Inspección Técnica de Vehículos periódicamente",
            "🛡️ Seguro obligatorio de responsabilidad civil",
            "💡 Luces delantera y trasera en funcionamiento"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Diferencia clave VMP vs Ciclomotor — el casco!",
          "text": "VMP (patinete eléctrico): el casco NO es obligatorio por ley nacional (puede exigirse por ordenanza municipal). Ciclomotor: el casco homologado es SIEMPRE obligatorio tanto para el conductor como para el pasajero. Esta diferencia aparece en el examen DGT."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Velocidad máxima — regla absoluta",
          "text": "El ciclomotor tiene una velocidad máxima de 45 km/h LIMITADA POR CONSTRUCCIÓN. No puede superarse en ninguna circunstancia: ni en adelantamientos, ni en descensos, ni con viento a favor. Si lo supera, deja de ser ciclomotor técnicamente. Esta regla distingue al ciclomotor de la motocicleta."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Права AM — для управления мопедом",
          "text": "Категория AM позволяет управлять мопедами (L1e, L2e) и лёгкими квадрициклами (L6e). Минимальный возраст получения — 15 лет. В отличие от ВМП, для мопеда права водителя ОБЯЗАТЕЛЬНЫ."
        },
        {
          "type": "heading",
          "text": "Обязательное оборудование мопеда"
        },
        {
          "type": "list",
          "style": "check",
          "items": [
            "🪖 Омологированный шлем — обязателен для водителя И пассажира (если есть)",
            "🔆 Жёлтый номерной знак — характерная черта мопеда",
            "📋 Технический осмотр (ITV) — периодический, обязательный",
            "🛡️ Обязательное страхование гражданской ответственности",
            "💡 Передний и задний фонари в рабочем состоянии"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Ключевое различие ВМП vs Мопед — шлем!",
          "text": "ВМП (электросамокат): шлем НЕ обязателен по общенациональному закону (может требоваться по муниципальному постановлению). Мопед: шлем ВСЕГДА обязателен — для водителя и для пассажира. Это различие встречается на экзамене DGT."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Максимальная скорость — абсолютное правило",
          "text": "Мопед имеет максимальную скорость 45 км/ч, ОГРАНИЧЕННУЮ ПО КОНСТРУКЦИИ. Её нельзя превысить ни при каких условиях: ни при обгоне, ни при спуске, ни при попутном ветре. Если превышает — технически это уже не мопед. Это правило отличает мопед от мотоцикла."
        }
      ]
    }'
  );

  -- ── Steps 8-11 · Новые квизы DGT ─────────────────────────────────────────

  -- Step 8 · Quiz — velocidad máxima 45 km/h (DGT 624b97a2)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{
      "text": "¿Cuál es la velocidad máxima a la que puede circular un ciclomotor?",
      "options": [
        "70 km/h.",
        "45 km/h, pudiendo superarla en 20 km/h para adelantar.",
        "45 km/h."
      ],
      "correct": 2,
      "explanation": "Los ciclomotores tienen una velocidad máxima de 45 km/h limitada por construcción. Este límite es absoluto: no puede superarse en ninguna circunstancia, ni siquiera para adelantar. La opción 45 km/h más 20 para adelantar es una trampa frecuente. Los cuadriciclos pesados (L7e) sí pueden alcanzar 70 km/h, pero no los ciclomotores."
    }',
    '{
      "text": "С какой максимальной скоростью разрешено движение мопеду?",
      "options": [
        "70 км/ч.",
        "45 км/ч, с возможностью превышения на 20 км/ч для обгона.",
        "45 км/ч."
      ],
      "correct": 2,
      "explanation": "Мопеды имеют максимальную скорость 45 км/ч, ограниченную по конструкции. Этот лимит абсолютный: его нельзя превысить ни при каких условиях, даже для обгона. Вариант 45 + 20 для обгона — частая ловушка. Тяжёлые квадрициклы (L7e) могут развивать 70 км/ч, но не мопеды."
    }'
  );

  -- Step 9 · Quiz — autovía prohibida (DGT 140fd0f6)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{
      "text": "¿Por una autovía, puede circular un ciclomotor?",
      "options": [
        "No.",
        "Depende de la velocidad a la que circule.",
        "Sí, por el arcén."
      ],
      "correct": 0,
      "explanation": "Los ciclomotores tienen PROHIBIDO circular por autovías sin ninguna excepción. Su velocidad máxima de 45 km/h es incompatible con la velocidad mínima exigida en autovías (60 km/h). Ni por el arcén ni en ninguna otra condición está permitida su circulación por autovías o autopistas."
    }',
    '{
      "text": "Разрешено ли мопеду двигаться по автомагистрали?",
      "options": [
        "Нет.",
        "Это зависит от скорости, с которой он движется.",
        "Да, по обочине."
      ],
      "correct": 0,
      "explanation": "Мопедам ЗАПРЕЩЕНО ехать по автомагистралям без каких-либо исключений. Максимальная скорость мопеда 45 км/ч несовместима с минимально допустимой скоростью на автомагистралях (60 км/ч). Ни по обочине, ни при каких условиях мопед на автомагистраль въезжать не может."
    }'
  );

  -- Step 10 · Quiz — columna de a dos (DGT 69b170cd)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{
      "text": "¿Los ciclomotores pueden circular por el arcén en columna de a dos?",
      "options": [
        "Sí, de forma excepcional cuando el arcén sea transitable y suficiente.",
        "Sí, siempre.",
        "No, nunca."
      ],
      "correct": 0,
      "explanation": "Los ciclomotores pueden circular en columna de a dos por el arcén, pero solo de forma EXCEPCIONAL y siempre que el arcén sea transitable y tenga dimensiones suficientes para la seguridad. No es la regla general: si el arcén es estrecho, deben circular en fila india."
    }',
    '{
      "text": "Разрешено ли мопедам двигаться по обочине в колонне по двое?",
      "options": [
        "Да, в исключительных случаях, когда обочина проходима и достаточно широка.",
        "Да, всегда.",
        "Нет, никогда."
      ],
      "correct": 0,
      "explanation": "Мопеды могут ехать по обочине в колонне по двое, но только ИСКЛЮЧИТЕЛЬНО и при условии, что обочина проходима и достаточна по размерам для безопасности. Это не общее правило: на узкой обочине нужно ехать по одному."
    }'
  );

  -- Step 11 · Quiz — sin arcén → carril derecho (DGT 81d9ea33)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{
      "text": "En una vía interurbana sin arcén, ¿por dónde debe circular un ciclomotor?",
      "options": [
        "Por el centro del carril derecho.",
        "Por el carril izquierdo, ocupando la parte imprescindible de la calzada.",
        "Por el carril derecho, ocupando la parte imprescindible de la calzada."
      ],
      "correct": 2,
      "explanation": "Cuando no existe arcén transitable, el ciclomotor debe circular por el carril derecho ocupando únicamente la parte imprescindible de la calzada. Siempre por la derecha, nunca por el izquierdo, y lo más cerca posible del borde para no obstaculizar el tráfico."
    }',
    '{
      "text": "По какой части проезжей части должен двигаться мопед на загородной дороге без обочины?",
      "options": [
        "По центру правой полосы.",
        "По левой полосе, занимая необходимую часть проезжей части.",
        "По правой полосе, занимая необходимую часть проезжей части."
      ],
      "correct": 2,
      "explanation": "При отсутствии проходимой обочины мопед должен ехать по правой полосе, занимая только необходимую часть проезжей части. Всегда по правой стороне, никогда по левой, как можно ближе к краю, чтобы не мешать другим участникам движения."
    }'
  );

END $$;
