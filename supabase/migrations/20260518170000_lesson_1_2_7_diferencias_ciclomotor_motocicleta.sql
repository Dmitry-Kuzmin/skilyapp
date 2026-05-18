-- Module 1 · Lesson 1.2.7 — Diferencia entre ciclomotor y motocicleta
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- order_index: 12
-- Quiz Step 3: DGT 624b97a2 (velocidad máxima ciclomotor = 45 km/h)
-- Quiz Step 4: DGT 9699d346 (ciclomotor prohibido autopistas y autovías)
-- Quiz Step 7: authored (¿cuándo es moto y no ciclomotor?)
-- Quiz Step 9: authored (¿puede circular el ciclomotor por autovía?)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.7',
     'Diferencia entre ciclomotor y motocicleta',
     'Отличие мопеда от мотоцикла',
     12, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Tabla comparativa completa ───────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Ciclomotor vs Motocicleta: comparativa"
        },
        {
          "type": "table",
          "headers": ["Característica", "Ciclomotor", "Motocicleta"],
          "rows": [
            ["Cilindrada (combustión)", "≤50 cc", ">50 cc"],
            ["Velocidad máx. por construcción", "≤45 km/h", ">45 km/h (o >50 cc)"],
            ["Velocidad máx. en vía", "45 km/h", "Según límite de la vía"],
            ["Autopistas y autovías", "🚫 Prohibido", "✅ Permitido"],
            ["Permiso mínimo", "AM (desde 15 años)", "A1 (desde 16 años)"],
            ["Matrícula", "Sí", "Sí"],
            ["ITV obligatoria", "Sí", "Sí"]
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Мопед vs Мотоцикл: сравнение"
        },
        {
          "type": "table",
          "headers": ["Характеристика", "Мопед (Ciclomotor)", "Мотоцикл"],
          "rows": [
            ["Объём двигателя (ДВС)", "≤50 куб.см", ">50 куб.см"],
            ["Макс. скорость по конструкции", "≤45 км/ч", ">45 км/ч (или >50 куб.см)"],
            ["Максим. скорость на дороге", "45 км/ч", "По лимиту дороги"],
            ["Autopistas и autovías", "🚫 Запрещено", "✅ Разрешено"],
            ["Мин. права", "AM (с 15 лет)", "A1 (с 16 лет)"],
            ["Номерной знак", "Да", "Да"],
            ["ITV обязателен", "Да", "Да"]
          ]
        }
      ]
    }'
  );

  -- ── Step 2 · La clave — motor + velocidad ─────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "La regla para distinguirlos"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "Un vehículo de dos ruedas con motor es CICLOMOTOR si: (1) motor de combustión ≤50 cc Y velocidad máx. por construcción ≤45 km/h. Es MOTOCICLETA si: (1) motor de combustión >50 cc, O (2) diseñado para superar 45 km/h. Cualquiera de las dos condiciones es suficiente para ser moto."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🛵",
              "title": "Ciclomotor",
              "description": "Motor ≤50 cc Y vel. máx. ≤45 km/h. AMBAS condiciones. Permiso AM desde 15 años."
            },
            {
              "icon": "🏍️",
              "title": "Motocicleta",
              "description": "Motor >50 cc O diseñado para >45 km/h. UNA sola condición basta. Permiso A1/A2/A."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen! — Trampa habitual",
          "text": "Un vehículo que tiene motor de 49 cc pero puede superar los 45 km/h es MOTOCICLETA (no ciclomotor), porque cumple el segundo criterio. El examen pone esta trampa a menudo."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Правило различия"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Двухколёсное ТС с мотором — МОПЕД, если: (1) ДВС ≤50 куб.см И макс. скорость по конструкции ≤45 км/ч. Это МОТОЦИКЛ, если: (1) ДВС >50 куб.см, ИЛИ (2) рассчитан на >45 км/ч. Достаточно одного из условий."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🛵",
              "title": "Мопед (Ciclomotor)",
              "description": "Мотор ≤50 куб.см И макс. скорость ≤45 км/ч. ОБА условия. Права AM с 15 лет."
            },
            {
              "icon": "🏍️",
              "title": "Мотоцикл",
              "description": "Мотор >50 куб.см ИЛИ конструктивно >45 км/ч. ОДНОГО условия достаточно. Права A1/A2/A."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена",
          "text": "ТС с мотором 49 куб.см, но способное превысить 45 км/ч — это МОТОЦИКЛ (не мопед), так как выполняется второй критерий. Экзамен часто использует эту ловушку."
        }
      ]
    }'
  );

  -- ── Step 3 · Quiz — DGT 624b97a2 (velocidad máxima ciclomotor = 45 km/h) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{
      "text": "¿Cuál es la velocidad máxima a la que puede circular un ciclomotor?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-006/624b97a2-c081-4e94-ace7-472527bb0f79.webp",
      "options": [
        "70 km/h.",
        "45 km/h, pudiendo superarla en 20 km/h para adelantar.",
        "45 km/h."
      ],
      "correct": 2,
      "explanation": "La velocidad máxima de un ciclomotor es de 45 km/h, tanto por construcción como en circulación. No puede superar esta velocidad para adelantar ni por ninguna otra razón. La respuesta de 70 km/h correspondería a otro tipo de vehículo."
    }',
    '{
      "text": "С какой максимальной скоростью разрешено движение мопеду?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-006/624b97a2-c081-4e94-ace7-472527bb0f79.webp",
      "options": [
        "70 км/ч.",
        "45 км/ч, с возможностью превышения на 20 км/ч для обгона.",
        "45 км/ч."
      ],
      "correct": 2,
      "explanation": "Максимальная скорость мопеда — 45 км/ч, как по конструкции, так и при движении. Превышать эту скорость для обгона или по другим причинам нельзя. Ответ 70 км/ч относится к другому типу ТС."
    }'
  );

  -- ── Step 4 · Quiz — DGT 9699d346 (ciclomotor prohibido autopistas/autovías) ─
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{
      "text": "¿Por qué tipo de vías tienen prohibida la circulación los ciclomotores?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/9699d346-7951-4695-a057-e7eba3819886_1768752741888.webp",
      "options": [
        "Por todas las vías situadas fuera de poblado.",
        "Por las autopistas y autovías.",
        "Por las carreteras convencionales sin arcén."
      ],
      "correct": 1,
      "explanation": "Los ciclomotores tienen prohibida la circulación por autopistas y autovías. Pueden circular por carreteras convencionales (con o sin arcén) y por vías dentro y fuera de poblado, siempre que no sean autopistas ni autovías."
    }',
    '{
      "text": "На каких типах дорог запрещено движение мопедов?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/9699d346-7951-4695-a057-e7eba3819886_1768752741888.webp",
      "options": [
        "По всем дорогам за пределами населённых пунктов.",
        "По автомагистралям и скоростным дорогам.",
        "По обычным дорогам без обочины."
      ],
      "correct": 1,
      "explanation": "Мопедам запрещено ехать по autopistas и autovías. По обычным дорогам (с обочиной или без) и по дорогам в населённых пунктах и за их пределами — разрешено, при условии что это не автомагистраль и не скоростная дорога."
    }'
  );

  -- ── Step 5 · Permisos comparados ─────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Permisos: ciclomotor vs motocicleta"
        },
        {
          "type": "table",
          "headers": ["Permiso", "Vehículos que autoriza", "Edad mínima"],
          "rows": [
            ["AM", "Ciclomotores (≤50 cc, ≤45 km/h)", "15 años"],
            ["A1", "Motos ligeras (≤125 cc, ≤11 kW) + ciclomotores", "16 años"],
            ["A2", "Motos de potencia media (≤35 kW) + todo lo de A1", "18 años"],
            ["A", "Cualquier motocicleta + todo lo anterior", "20 años (si tiene A2 >2 años) o 24"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "El permiso AM es el mínimo para ciclomotores y se obtiene desde los 15 años. El A1 incluye motos de 125 cc y también autoriza ciclomotores. Un titular de A1 puede conducir ciclomotores sin necesitar el AM."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Права: мопед vs мотоцикл"
        },
        {
          "type": "table",
          "headers": ["Права", "Разрешённые ТС", "Мин. возраст"],
          "rows": [
            ["AM", "Мопеды (≤50 куб.см, ≤45 км/ч)", "15 лет"],
            ["A1", "Лёгкие мотоциклы (≤125 куб., ≤11 кВт) + мопеды", "16 лет"],
            ["A2", "Средние мотоциклы (≤35 кВт) + всё из A1", "18 лет"],
            ["A", "Любой мотоцикл + всё предыдущее", "20 лет (если есть A2 >2 лет) или 24"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Права AM — минимальные для мопедов, с 15 лет. Права A1 включают мотоциклы 125 куб.см и также разрешают управление мопедами. Владелец A1 может ездить на мопеде без прав AM."
        }
      ]
    }'
  );

  -- ── Step 6 · Casco y señalización comparados ─────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Casco y equipamiento: diferencias clave"
        },
        {
          "type": "table",
          "headers": ["Equipo", "Ciclomotor", "Motocicleta"],
          "rows": [
            ["Casco", "Obligatorio en toda vía (urbana e interurbana)", "Obligatorio en toda vía (sin excepciones)"],
            ["Luz de cruce de día", "No obligatoria de día (solo de noche)", "Obligatoria siempre, también de día"],
            ["Guantes homologados", "No obligatorio", "Obligatorio"],
            ["Seguro obligatorio", "Sí", "Sí"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen! — Diferencia en el casco",
          "text": "Tanto el ciclomotor como la moto exigen casco en toda vía. La diferencia está en la luz de cruce: el motorista DEBE llevarla encendida durante el día; el conductor de ciclomotor solo está obligado de noche o con visibilidad reducida."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Шлем и экипировка: ключевые отличия"
        },
        {
          "type": "table",
          "headers": ["Оснащение", "Мопед (Ciclomotor)", "Мотоцикл"],
          "rows": [
            ["Шлем", "Обязателен на любой дороге (город и загород)", "Обязателен на любой дороге (без исключений)"],
            ["Ближний свет днём", "Не обязателен днём (только ночью)", "Обязателен всегда, в том числе днём"],
            ["Сертиф. перчатки", "Не обязательны", "Обязательны"],
            ["Обязат. страхование", "Да", "Да"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена — шлем",
          "text": "И мопед, и мотоцикл требуют шлем на любой дороге. Разница — в ближнем свете: мотоциклист ОБЯЗАН ехать с ближним светом ДНЁМ; водитель мопеда обязан только ночью или при плохой видимости."
        }
      ]
    }'
  );

  -- ── Step 7 · Quiz — authored (¿cuándo es moto y no ciclomotor?) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{
      "text": "¿En qué condición un vehículo de dos ruedas con motor de combustión interna es considerado motocicleta y no ciclomotor?",
      "options": [
        "Cuando supera los 100 km/h de velocidad máxima.",
        "Cuando su cilindrada es superior a 50 cc.",
        "Cuando tiene sillín y manillar."
      ],
      "correct": 1,
      "explanation": "Un vehículo de dos ruedas con motor de combustión es motocicleta cuando su cilindrada supera los 50 cc. También lo sería si está diseñado para superar los 45 km/h, aunque tuviera ≤50 cc. Ni la velocidad de 100 km/h ni el tener sillín y manillar son criterios de clasificación."
    }',
    '{
      "text": "При каком условии двухколёсное ТС с двигателем внутреннего сгорания является мотоциклом, а не мопедом?",
      "options": [
        "Когда оно развивает более 100 км/ч.",
        "Когда объём двигателя превышает 50 куб.см.",
        "Когда у него есть сиденье и руль."
      ],
      "correct": 1,
      "explanation": "Двухколёсное ТС с ДВС является мотоциклом, если объём двигателя превышает 50 куб.см. Мотоциклом также считается ТС, рассчитанное на >45 км/ч, даже при ≤50 куб.см. Ни скорость 100 км/ч, ни наличие сиденья и руля не являются критериями классификации."
    }'
  );

  -- ── Step 8 · Circulación en vías — resumen tabular ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Dónde puede circular cada uno?"
        },
        {
          "type": "table",
          "headers": ["Vía", "Ciclomotor", "Motocicleta"],
          "rows": [
            ["Autopista / autovía", "🚫 Prohibido", "✅ Sí (con permiso)"],
            ["Carretera convencional", "✅ Sí", "✅ Sí"],
            ["Vía urbana", "✅ Sí", "✅ Sí"],
            ["Arcén de autovía", "🚫 Prohibido", "⚠️ Solo en caso de avería"],
            ["Carril VAO", "✅ Sí (si dos ocupantes)", "✅ Sí (si dos ocupantes)"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡La diferencia clave!",
          "text": "La diferencia más importante en circulación: los ciclomotores NO pueden circular por autopistas ni autovías en ningún caso. Las motocicletas sí pueden, con el permiso correspondiente."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Где может ездить каждый?"
        },
        {
          "type": "table",
          "headers": ["Дорога", "Мопед", "Мотоцикл"],
          "rows": [
            ["Autopista / autovía", "🚫 Запрещено", "✅ Да (с правами)"],
            ["Обычная дорога", "✅ Да", "✅ Да"],
            ["Городская дорога", "✅ Да", "✅ Да"],
            ["Обочина autovía", "🚫 Запрещено", "⚠️ Только при поломке"],
            ["Полоса VAO", "✅ Да (2 пассажира)", "✅ Да (2 пассажира)"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Ключевое различие!",
          "text": "Главное отличие в движении: мопеды НЕ могут ехать по autopistas и autovías ни при каких условиях. Мотоциклы — могут, при наличии соответствующих прав."
        }
      ]
    }'
  );

  -- ── Step 9 · Quiz — authored (¿puede circular ciclomotor por autovía?) ─────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{
      "text": "¿Puede circular un ciclomotor por una autovía?",
      "options": [
        "Sí, por el arcén.",
        "Sí, si el conductor tiene permiso AM.",
        "No, está prohibido."
      ],
      "correct": 2,
      "explanation": "Los ciclomotores tienen PROHIBIDA la circulación por autopistas y autovías, independientemente del permiso que tenga el conductor y aunque solo sea por el arcén. Esta es una diferencia fundamental con las motocicletas, que sí pueden circular por estas vías con el permiso A."
    }',
    '{
      "text": "Может ли мопед ехать по скоростной дороге (autovía)?",
      "options": [
        "Да, по обочине.",
        "Да, если у водителя есть права AM.",
        "Нет, это запрещено."
      ],
      "correct": 2,
      "explanation": "Мопедам ЗАПРЕЩЕНО движение по autopistas и autovías, независимо от наличия прав AM у водителя и даже по обочине. Это принципиальное отличие от мотоциклов, которые могут ездить по этим дорогам с соответствующими правами."
    }'
  );

  -- ── Step 10 · Resumen y mnemónica ─────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Resumen: ciclomotor vs motocicleta"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🛵",
              "title": "Ciclomotor",
              "description": "≤50 cc Y ≤45 km/h. Permiso AM desde 15 años. Prohibido en autopistas. Vel. máx. 45 km/h."
            },
            {
              "icon": "🏍️",
              "title": "Motocicleta",
              "description": ">50 cc O >45 km/h. Permiso A1/A2/A. Puede circular en autopistas. Luz de cruce de día."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Mnemónica: 50-45",
          "text": "CICLOMOTOR: los DOS números pequeños — ≤50 cc Y ≤45 km/h (ambos). MOTO: basta con superar UNO de los dos: >50 cc O >45 km/h."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Итог: мопед vs мотоцикл"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🛵",
              "title": "Мопед (Ciclomotor)",
              "description": "≤50 куб.см И ≤45 км/ч. Права AM с 15 лет. Запрещён на автомагистралях. Макс. 45 км/ч."
            },
            {
              "icon": "🏍️",
              "title": "Мотоцикл",
              "description": ">50 куб.см ИЛИ >45 км/ч. Права A1/A2/A. Может ездить по автомагистралям. Ближний свет днём."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Мнемоника: 50-45",
          "text": "МОПЕД: ОБА маленьких числа — ≤50 куб.см И ≤45 км/ч (оба условия). МОТОЦИКЛ: достаточно превысить ОДНО из двух: >50 куб.см ИЛИ >45 км/ч."
        }
      ]
    }'
  );

END $$;
