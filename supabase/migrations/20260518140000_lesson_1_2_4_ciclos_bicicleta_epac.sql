-- Module 1 · Lesson 1.2.4 — Ciclos (Bicicleta y EPAC)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step  4: DGT 80259446 (definición de ciclo)
-- Quiz Step  5: DGT af943e30 (autovía sí, autopista no)
-- Quiz Step  8: DGT bffba579 (columna de a dos)
-- Quiz Step  9: DGT b67106f0 (descenso prolongado puede usar calzada)
-- Quiz Step 11: DGT 4922406a (exención casco — solo rampa ascendente)
-- Quiz Step 13: DGT c2cec183 (alumbrado nocturno obligatorio)
-- Quiz Step 15: DGT 270d8c31 (pasajero menor de 7 años, asiento homologado)
-- Quiz Step 17: DGT 358b17e2 (tasa máxima alcohol 0,25 mg/l)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  -- Desplazar Ciclomotor y motocicleta (order_index 8 → 9)
  UPDATE course_lessons
  SET order_index = 9
  WHERE module_id = mod_id AND order_index = 8;

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.4',
     'Ciclos — Bicicleta y EPAC',
     'Велосипед и EPAC',
     8, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Definición de ciclo + tabla comparativa ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Qué es un ciclo?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Definición legal",
          "text": "Ciclo: vehículo de dos ruedas como mínimo, accionado exclusivamente por el esfuerzo muscular de las personas que lo ocupan, en particular mediante pedales o manivelas. (RGC, art. 2)"
        },
        {
          "type": "table",
          "headers": ["Tipo", "Tracción", "Motor", "Matrícula", "Permiso"],
          "rows": [
            ["Bicicleta", "Solo pedales", "No", "No", "No"],
            ["EPAC", "Pedales + eléctrico", "Sí (≤250 W)", "No", "No"],
            ["Ciclomotor", "Motor principal", "Sí (>250 W o >45 km/h)", "Sí", "AM/A1"]
          ],
          "caption": "Ciclo = sin motor. EPAC = asistido eléctrico ≤250 W. Ciclomotor = motor principal."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Что такое цикл?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Определение из закона",
          "text": "Цикл — транспортное средство с как минимум двумя колёсами, приводимое исключительно мышечной силой водителя, в частности с помощью педалей или рукояток. (RGC, ст. 2)"
        },
        {
          "type": "table",
          "headers": ["Тип", "Тяга", "Мотор", "Рег. знак", "Права"],
          "rows": [
            ["Велосипед", "Только педали", "Нет", "Нет", "Нет"],
            ["EPAC", "Педали + электро", "Да (≤250 Вт)", "Нет", "Нет"],
            ["Мопед", "Основной мотор", "Да (>250 Вт или >45 км/ч)", "Да", "AM/A1"]
          ],
          "caption": "Цикл = без мотора. EPAC = электроассист ≤250 Вт. Мопед = основной мотор."
        }
      ]
    }'
  );

  -- ── Step 2 · EPAC — qué es y límites técnicos ─────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "EPAC — Bicicleta de Pedaleo Asistido"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Definición EPAC",
          "text": "La EPAC es una bicicleta con motor eléctrico auxiliar de potencia máxima nominal continua de 250 W. La asistencia se reduce progresivamente y se corta cuando el vehículo alcanza los 25 km/h, o antes si el ciclista deja de pedalear."
        },
        {
          "type": "stats",
          "stats": [
            {"value": "250 W", "label": "potencia máx.", "note": "motor eléctrico auxiliar"},
            {"value": "25 km/h", "label": "vel. asistida máx.", "note": "asistencia se corta al superarla"},
            {"value": "0", "label": "permisos necesarios", "note": "se conduce igual que una bicicleta"}
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "Si el motor supera 250 W o asiste por encima de 25 km/h → ya no es EPAC, sino VMP o ciclomotor. Necesitará matriculación y permiso de conducción."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "EPAC — Велосипед с электропомощью"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Определение EPAC",
          "text": "EPAC — велосипед с вспомогательным электродвигателем максимальной непрерывной номинальной мощностью 250 Вт. Помощь постепенно снижается и отключается при достижении 25 км/ч или когда водитель перестаёт крутить педали."
        },
        {
          "type": "stats",
          "stats": [
            {"value": "250 Вт", "label": "макс. мощность", "note": "вспомогательный электромотор"},
            {"value": "25 км/ч", "label": "макс. скорость ассиста", "note": "помощь отключается при превышении"},
            {"value": "0", "label": "прав не требуется", "note": "управляется как обычный велосипед"}
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Внимание!",
          "text": "Если мотор превышает 250 Вт или ассистирует свыше 25 км/ч — это уже не EPAC, а VMP или мопед. Потребуется регистрация и водительское удостоверение."
        }
      ]
    }'
  );

  -- ── Step 3 · Dónde puede circular el ciclista ─────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Dónde puede circular el ciclista?"
        },
        {
          "type": "table",
          "headers": ["Vía", "¿Permitido?", "Condición"],
          "rows": [
            ["Carril bici", "✅ Sí", "Preferencia sobre vehículos a motor"],
            ["Arcén de carretera", "✅ Sí", "Obligatorio si existe y es transitable"],
            ["Calzada urbana", "✅ Sí", "Borde derecho, si no hay arcén ni carril bici"],
            ["Arcén de autovía", "✅ Sí (>14 años)", "Salvo señal prohibitoria"],
            ["Arcén de autopista", "🚫 No", "Siempre prohibido para ciclistas"],
            ["Acera o zona peatonal", "🚫 No", "Salvo señal que lo permita expresamente"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "AUTOVÍA → ciclistas mayores de 14 años pueden circular por el arcén (salvo señal prohibitoria). AUTOPISTA → siempre prohibido para ciclistas, sin ninguna excepción."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Где велосипедист может ехать?"
        },
        {
          "type": "table",
          "headers": ["Дорога", "Разрешено?", "Условие"],
          "rows": [
            ["Велодорожка", "✅ Да", "Приоритет перед моторным транспортом"],
            ["Обочина дороги", "✅ Да", "Обязательна, если есть и проездна"],
            ["Проезжая часть города", "✅ Да", "Правый край, если нет обочины/велодорожки"],
            ["Обочина autovía", "✅ Да (>14 лет)", "Если не запрещено знаком"],
            ["Обочина autopista", "🚫 Нет", "Велосипедистам запрещено всегда"],
            ["Тротуар / пешеходная зона", "🚫 Нет", "Только если есть специальный знак"]
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "AUTOVÍA → велосипедисты старше 14 лет могут ехать по обочине (если нет запрещающего знака). AUTOPISTA → велосипедистам запрещено всегда, без исключений."
        }
      ]
    }'
  );

  -- ── Step 4 · Quiz — DGT 80259446 (definición de ciclo) ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{
      "text": "Ciclo es el vehículo de…",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-001/80259446-6515-4d3b-80a7-553fa9f43909.webp",
      "options": [
        "Dos ruedas accionado con un motor.",
        "Dos ruedas por lo menos, accionado por su conductor mediante pedales o manivelas.",
        "Dos a más ruedas accionado con un motor o con pedales."
      ],
      "correct": 1,
      "explanation": "El ciclo se define en el RGC como el vehículo de al menos dos ruedas accionado exclusivamente por el esfuerzo muscular mediante pedales o manivelas. La presencia de motor excluye al vehículo de esta categoría: pasaría a ser VMP, ciclomotor u otro tipo."
    }',
    '{
      "text": "Цикл — это транспортное средство с…",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-001/80259446-6515-4d3b-80a7-553fa9f43909.webp",
      "options": [
        "Двумя колёсами, приводимое двигателем.",
        "Как минимум двумя колёсами, приводимое водителем с помощью педалей или рукояток.",
        "Двумя и более колёсами, приводимое двигателем или педалями."
      ],
      "correct": 1,
      "explanation": "Цикл определён в RGC как транспортное средство с как минимум двумя колёсами, приводимое исключительно мышечной силой через педали или рукоятки. Наличие мотора выводит ТС из этой категории — оно становится VMP, мопедом или другим типом."
    }'
  );

  -- ── Step 5 · Quiz — DGT af943e30 (autovía sí, autopista no) ──────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{
      "text": "Los conductores de bicicletas mayores de 14 años, ¿pueden circular por los arcenes de las autovías?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/af943e30-b19f-45dd-aff8-90f370df93c1_1768668006399.webp",
      "options": [
        "No, está prohibido por razones de seguridad vial.",
        "Sí, salvo que por razones de seguridad vial se prohíba mediante señales.",
        "Sí, tanto por los arcenes de las autovías como por los de las autopistas."
      ],
      "correct": 1,
      "explanation": "Los ciclistas mayores de 14 años pueden circular por los arcenes de las autovías salvo señal prohibitoria. Lo que sí está siempre prohibido para los ciclistas es circular por los arcenes de las autopistas de peaje."
    }',
    '{
      "text": "Могут ли велосипедисты старше 14 лет двигаться по обочине скоростных дорог (autovía)?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/af943e30-b19f-45dd-aff8-90f370df93c1_1768668006399.webp",
      "options": [
        "Нет, это запрещено по соображениям безопасности дорожного движения.",
        "Да, если это не запрещено знаком по соображениям безопасности.",
        "Да, как по обочинам autovía, так и autopista."
      ],
      "correct": 1,
      "explanation": "Велосипедисты старше 14 лет могут ехать по обочине autovía, если это не запрещено знаком. Ехать по обочинам платных автомагистралей (autopista) велосипедистам запрещено всегда."
    }'
  );

  -- ── Step 6 · Calzada excepciones + prohibiciones generales ───────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Cuándo el ciclista puede usar la calzada"
        },
        {
          "type": "callout",
          "variant": "info",
          "text": "El ciclista circula normalmente por el arcén. Puede usar la calzada cuando no exista arcén transitable, o cuando por razones de seguridad sea necesario — por ejemplo, en descensos prolongados con curvas."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "En un descenso prolongado con curvas, el ciclista PUEDE ocupar la parte de la calzada que necesite por razones de seguridad. No está obligado a mantenerse en el arcén en esa situación."
        },
        {
          "type": "list",
          "style": "cross",
          "title": "Prohibido siempre para ciclistas",
          "items": [
            "Circular por autopistas (ni por la calzada ni por el arcén)",
            "Circular de noche sin alumbrado encendido",
            "Usar el teléfono móvil durante la conducción",
            "Llevar auriculares en ambos oídos",
            "Transportar objetos que dificulten la visibilidad o el control"
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Когда велосипедист может ехать по проезжей части"
        },
        {
          "type": "callout",
          "variant": "info",
          "text": "Велосипедист обычно едет по обочине. Он может использовать проезжую часть, если нет проездной обочины, или по соображениям безопасности — например, на затяжных спусках с поворотами."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "На затяжном спуске с поворотами велосипедист МОЖЕТ занимать необходимую ему часть проезжей части из соображений безопасности. Оставаться на обочине в такой ситуации он не обязан."
        },
        {
          "type": "list",
          "style": "cross",
          "title": "Велосипедистам всегда запрещено",
          "items": [
            "Ехать по autopista (ни по дороге, ни по обочине)",
            "Ехать ночью без включённого освещения",
            "Пользоваться мобильным телефоном во время езды",
            "Использовать наушники в обоих ушах",
            "Перевозить предметы, мешающие видимости или управлению"
          ]
        }
      ]
    }'
  );

  -- ── Step 7 · Circulación en grupo — columna de a dos ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿A uno o a dos? Circulación en grupo"
        },
        {
          "type": "callout",
          "variant": "info",
          "text": "Los ciclistas circulan normalmente en fila de a uno. En tramos con suficiente visibilidad y sin formar aglomeración, pueden circular en columna de a dos, pegándose lo máximo posible al borde derecho de la calzada."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Trampa del examen!",
          "text": "La columna de a dos está PERMITIDA en buenas condiciones de visibilidad. Sin embargo, al aproximarse a una curva, cima de colina, o ante cualquier riesgo → obligatorio reducir a fila de a uno."
        },
        {
          "type": "list",
          "style": "arrow",
          "title": "Reglas de circulación en grupo",
          "items": [
            "Máximo 2 ciclistas en paralelo, siempre pegados al borde derecho de la calzada",
            "Fila de a uno obligatoria si hay congestión o visibilidad reducida",
            "Marchas ciclistas organizadas requieren autorización previa de la autoridad"
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "По одному или по двое? Движение в группе"
        },
        {
          "type": "callout",
          "variant": "info",
          "text": "Велосипедисты обычно едут в один ряд. На участках с достаточной видимостью и без образования пробок разрешено ехать по двое, прижимаясь к правому краю проезжей части."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Ловушка экзамена!",
          "text": "Движение по двое РАЗРЕШЕНО при хорошей видимости. Но при приближении к повороту, вершине холма или при любой опасности → обязательно перестроиться в один ряд."
        },
        {
          "type": "list",
          "style": "arrow",
          "title": "Правила движения в группе",
          "items": [
            "Максимум 2 велосипедиста в ряд, всегда у правого края проезжей части",
            "В один ряд обязательно при пробках или плохой видимости",
            "Организованные велопробеги требуют предварительного разрешения властей"
          ]
        }
      ]
    }'
  );

  -- ── Step 8 · Quiz — DGT bffba579 (columna de a dos) ──────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{
      "text": "En tramos con suficiente visibilidad y sin formar aglomeración, ¿podrán los ciclistas circular en columna de a dos, pegándose a la derecha?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-010/bffba579-9ff5-44b0-8513-6e93bc68a41b_1768740599966.webp",
      "options": [
        "Sí.",
        "No, siempre circularan por el arcén.",
        "No, siempre circularan en fila de a uno."
      ],
      "correct": 0,
      "explanation": "En tramos con buena visibilidad y sin generar congestión, los ciclistas pueden circular en columna de a dos pegados al borde derecho. No están obligados a ir siempre en fila de a uno ni a mantenerse exclusivamente en el arcén."
    }',
    '{
      "text": "На участках с достаточной видимостью и без образования пробок, могут ли велосипедисты двигаться по двое, прижимаясь к правой стороне?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-010/bffba579-9ff5-44b0-8513-6e93bc68a41b_1768740599966.webp",
      "options": [
        "Да.",
        "Нет, они всегда должны ехать по обочине.",
        "Нет, они всегда должны ехать в один ряд."
      ],
      "correct": 0,
      "explanation": "На участках с хорошей видимостью и без образования пробок велосипедисты могут ехать по двое, прижавшись к правому краю. Они не обязаны всегда ехать в один ряд или только по обочине."
    }'
  );

  -- ── Step 9 · Quiz — DGT b67106f0 (descenso prolongado → calzada) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{
      "text": "En un descenso prolongado con curvas y cuando razones de seguridad lo permitan, ¿podrán circular los ciclistas por la parte derecha de la calzada que necesiten?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/b67106f0-b1f8-4c78-ba96-6397bd253d25_1768753703232.webp",
      "options": [
        "No, siempre utilizarán el arcén.",
        "Podrán utilizar toda la calzada.",
        "Sí."
      ],
      "correct": 2,
      "explanation": "En descensos prolongados con curvas, el ciclista puede ocupar la parte de la calzada que necesite por razones de seguridad. No se le obliga a mantenerse en el arcén cuando las circunstancias lo justifican. Eso sí: no puede ocupar toda la calzada, sino solo la parte necesaria."
    }',
    '{
      "text": "На затяжном спуске с поворотами, когда это позволяют соображения безопасности, могут ли велосипедисты ехать по необходимой им части проезжей части?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/b67106f0-b1f8-4c78-ba96-6397bd253d25_1768753703232.webp",
      "options": [
        "Нет, они всегда должны использовать обочину.",
        "Они могут использовать всю проезжую часть.",
        "Да."
      ],
      "correct": 2,
      "explanation": "На затяжном спуске с поворотами велосипедист может занимать необходимую ему часть проезжей части из соображений безопасности. Оставаться на обочине в таких условиях он не обязан. Но занимать всю проезжую часть нельзя — только необходимую её часть."
    }'
  );

  -- ── Step 10 · Casco — obligatorio e exenciones ───────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Casco: obligatorio e exenciones"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "El casco es OBLIGATORIO para ciclistas: (1) siempre en vías interurbanas, independientemente de la edad; (2) siempre para menores de 16 años en cualquier tipo de vía."
        },
        {
          "type": "table",
          "headers": ["Situación", "¿Casco obligatorio?"],
          "rows": [
            ["Vía interurbana (cualquier edad)", "✅ Sí, siempre"],
            ["Vía urbana, ciclista ≥16 años", "No obligatorio (muy recomendado)"],
            ["Vía urbana, ciclista <16 años", "✅ Sí, siempre"],
            ["Rampa ascendente prolongada", "No (exención legal)"],
            ["Descenso prolongado", "✅ Sí, siempre"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen! — La trampa del casco",
          "text": "La exención aplica SOLO en rampas ASCENDENTES prolongadas, por el esfuerzo físico de subir pedaleando. En los descensos, aunque sean prolongados, el casco sigue siendo obligatorio. Esta distinción aparece siempre en el examen."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Шлем: когда обязателен"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Шлем ОБЯЗАТЕЛЕН для велосипедистов: (1) всегда на загородных дорогах, независимо от возраста; (2) всегда для лиц до 16 лет на любой дороге."
        },
        {
          "type": "table",
          "headers": ["Ситуация", "Шлем обязателен?"],
          "rows": [
            ["Загородная дорога (любой возраст)", "✅ Да, всегда"],
            ["Городская дорога, велосипедист ≥16 лет", "Не обязателен (очень рекомендуется)"],
            ["Городская дорога, велосипедист <16 лет", "✅ Да, всегда"],
            ["Затяжной подъём", "Нет (законное освобождение)"],
            ["Затяжной спуск", "✅ Да, всегда"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена — шлем",
          "text": "Освобождение от шлема действует ТОЛЬКО на затяжных ПОДЪЁМАХ — из-за физической нагрузки при езде в гору. На спусках, даже затяжных, шлем по-прежнему обязателен. Это различие всегда появляется на экзамене."
        }
      ]
    }'
  );

  -- ── Step 11 · Quiz — DGT 4922406a (exención casco — rampa ascendente) ─────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{
      "text": "Los ciclistas están exentos de llevar casco cuando circulen...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-002/4922406a-d2cd-42a9-bfef-44b2458a6213_1768867266372_pro.webp",
      "options": [
        "por vías interurbanas.",
        "por rampas ascendentes prolongadas.",
        "por rampas ascendentes y descendentes prolongadas."
      ],
      "correct": 1,
      "explanation": "La exención del casco aplica únicamente en rampas ASCENDENTES prolongadas, por el esfuerzo físico que supone el pedaleo en subida. En vías interurbanas el casco es siempre obligatorio. En descensos prolongados también es obligatorio. La opción con ascendentes Y descendentes es incorrecta."
    }',
    '{
      "text": "Велосипедисты освобождаются от обязанности носить шлем при движении...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-002/4922406a-d2cd-42a9-bfef-44b2458a6213_1768867266372_pro.webp",
      "options": [
        "по загородным дорогам.",
        "на затяжных подъёмах.",
        "на затяжных подъёмах и спусках."
      ],
      "correct": 1,
      "explanation": "Освобождение от шлема действует только на затяжных ПОДЪЁМАХ — из-за физической нагрузки при езде в гору. На загородных дорогах шлем обязателен всегда. На затяжных спусках тоже обязателен. Вариант с подъёмами И спусками — неверный."
    }'
  );

  -- ── Step 12 · Alumbrado y equipamiento obligatorio ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Equipamiento obligatorio del ciclista"
        },
        {
          "type": "list",
          "style": "check",
          "title": "Obligatorio en toda bicicleta",
          "items": [
            "Luz delantera (blanca o amarilla) — de noche y en condiciones de baja visibilidad",
            "Luz trasera (roja) — de noche y en condiciones de baja visibilidad",
            "Dispositivo reflectante trasero homologado",
            "Timbre o bocina de aviso acústico",
            "Frenos en buen estado de funcionamiento"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "Los ciclistas están OBLIGADOS a llevar encendido el alumbrado durante la noche, en túneles y en condiciones de visibilidad reducida. No es alternativo al uso de ropa reflectante: ambos son complementarios y exigibles a la vez."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "El uso de auriculares en ambos oídos y el teléfono móvil están prohibidos en bicicleta, igual que en cualquier vehículo a motor. Un auricular en un solo oído puede estar permitido."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Обязательное оборудование велосипедиста"
        },
        {
          "type": "list",
          "style": "check",
          "title": "Обязательно на каждом велосипеде",
          "items": [
            "Передний фонарь (белый или жёлтый) — ночью и при плохой видимости",
            "Задний фонарь (красный) — ночью и при плохой видимости",
            "Сертифицированный задний световозвращатель",
            "Звонок или звуковой сигнал",
            "Тормоза в исправном состоянии"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Велосипедисты ОБЯЗАНЫ включать освещение ночью, в туннелях и при плохой видимости. Это не заменяется светоотражающей одеждой: оба требования дополняют друг друга и обязательны одновременно."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Внимание!",
          "text": "Использование наушников в обоих ушах и мобильного телефона на велосипеде запрещено, как и на любом моторном транспортном средстве. Один наушник в одном ухе может быть разрешён."
        }
      ]
    }'
  );

  -- ── Step 13 · Quiz — DGT c2cec183 (alumbrado nocturno obligatorio) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 13, 'quiz',
    '{
      "text": "¿Están obligados los ciclistas a encender el alumbrado cuando circulen de noche?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-04_test-002/c2cec183-ab0e-4988-af24-224cf4997beb_1768852808659_pro.webp",
      "options": [
        "Sí.",
        "No, si llevan puestas prendas reflectantes.",
        "Solo cuando circulen por vías interurbanas."
      ],
      "correct": 0,
      "explanation": "Los ciclistas están obligados a llevar encendido el alumbrado de noche y en condiciones de baja visibilidad, independientemente de si llevan ropa reflectante. El alumbrado es obligatorio en cualquier tipo de vía, no solo en interurbanas."
    }',
    '{
      "text": "Обязаны ли велосипедисты включать освещение при движении в тёмное время суток?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-04_test-002/c2cec183-ab0e-4988-af24-224cf4997beb_1768852808659_pro.webp",
      "options": [
        "Да.",
        "Нет, если на них надета светоотражающая одежда.",
        "Только при движении по загородным дорогам."
      ],
      "correct": 0,
      "explanation": "Велосипедисты обязаны включать освещение ночью и при плохой видимости, независимо от наличия светоотражающей одежды. Освещение обязательно на любом типе дороги, не только на загородных."
    }'
  );

  -- ── Step 14 · Pasajeros — reglas y límites ───────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 14, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Se puede llevar pasajero en bicicleta?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Regla legal — pasajero en bicicleta",
          "text": "El conductor de bicicleta puede transportar a un menor de hasta 7 años en un asiento adicional homologado, siempre que el conductor sea mayor de 18 años. El menor transportado debe llevar casco."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen! — Tres datos clave",
          "text": "1) Edad máxima del pasajero: 7 años (no 6, no 8). 2) Asiento obligatoriamente HOMOLOGADO. 3) Conductor debe ser MAYOR DE 18 AÑOS. Los tres datos salen en el examen."
        },
        {
          "type": "list",
          "style": "cross",
          "title": "Prohibido en bicicleta",
          "items": [
            "Transportar pasajeros adultos (salvo bicicletas tándem o diseñadas para ello)",
            "Llevar menores de más de 7 años o sin asiento homologado",
            "Transportar cargas que dificulten la conducción o la visibilidad",
            "Circular sin tener al menos una mano en el manillar"
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Можно ли перевозить пассажира на велосипеде?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Правовая норма — пассажир на велосипеде",
          "text": "Водитель велосипеда может перевозить ребёнка до 7 лет в дополнительном сертифицированном сиденье, при условии что сам водитель старше 18 лет. Перевозимый ребёнок должен быть в шлеме."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена — три ключевых факта",
          "text": "1) Максимальный возраст пассажира: 7 лет (не 6, не 8). 2) Сиденье обязательно СЕРТИФИЦИРОВАННОЕ. 3) Водитель должен быть СТАРШЕ 18 ЛЕТ. Все три факта встречаются на экзамене."
        },
        {
          "type": "list",
          "style": "cross",
          "title": "На велосипеде запрещено",
          "items": [
            "Перевозить взрослых пассажиров (кроме тандемов или специально предназначенных велосипедов)",
            "Перевозить детей старше 7 лет или без сертифицированного сиденья",
            "Перевозить грузы, мешающие управлению или видимости",
            "Ехать, держа руль менее чем одной рукой"
          ]
        }
      ]
    }'
  );

  -- ── Step 15 · Quiz — DGT 270d8c31 (pasajero menor de 7 años) ────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 15, 'quiz',
    '{
      "text": "¿Puede el conductor de una bicicleta transportar un pasajero?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-004/270d8c31-afd1-42f7-acae-f48ef519cf6a_1769472165054_pro.webp",
      "options": [
        "No, está prohibido.",
        "Sí, sentado entre el conductor y el manillar.",
        "Sí, a un menor de hasta siete años siempre que lo haga en un asiento adicional homologado."
      ],
      "correct": 2,
      "explanation": "El conductor de bicicleta puede transportar a un menor de hasta 7 años, pero únicamente en un asiento adicional homologado. Ir sentado entre el conductor y el manillar está prohibido porque impediría la conducción segura. El conductor debe ser mayor de 18 años."
    }',
    '{
      "text": "Может ли водитель велосипеда перевозить пассажира?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-004/270d8c31-afd1-42f7-acae-f48ef519cf6a_1769472165054_pro.webp",
      "options": [
        "Нет, это запрещено.",
        "Да, сидя между водителем и рулём.",
        "Да, ребёнка до 7 лет при условии использования дополнительного сертифицированного сиденья."
      ],
      "correct": 2,
      "explanation": "Водитель велосипеда может перевозить ребёнка до 7 лет, но только в дополнительном сертифицированном сиденье. Сидеть между водителем и рулём запрещено — это мешает безопасному управлению. Водитель должен быть старше 18 лет."
    }'
  );

  -- ── Step 16 · Alcohol y controles para ciclistas ──────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 16, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Alcohol: los ciclistas también se controlan"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "Los conductores de bicicletas SÍ pueden ser sometidos a pruebas de alcoholemia. No están exentos. La tasa máxima para mayores de edad es de 0,25 mg/l en aire espirado — igual que para conductores de vehículos a motor."
        },
        {
          "type": "stats",
          "stats": [
            {"value": "0,25", "label": "mg/l aire", "note": "tasa máxima para ciclista adulto (≥18 años)"},
            {"value": "0,15", "label": "mg/l aire", "note": "tasa para noveles y menores de 18 años"},
            {"value": "0,50", "label": "g/l sangre", "note": "equivalente para adulto (0,25 en aire)"}
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen! — Trampa frecuente",
          "text": "Una opción habitual en el examen afirma que los ciclistas NO están obligados a someterse al control de alcoholemia. Es FALSO: sí están obligados, en las mismas condiciones que cualquier otro conductor."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Алкоголь: велосипедистов тоже проверяют"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Водители велосипедов МОГУТ быть подвергнуты проверке на алкоголь. Они не освобождены. Максимальная норма для совершеннолетних — 0,25 мг/л выдыхаемого воздуха — такая же, как для водителей моторных ТС."
        },
        {
          "type": "stats",
          "stats": [
            {"value": "0,25", "label": "мг/л воздуха", "note": "максимум для взрослого велосипедиста (≥18 лет)"},
            {"value": "0,15", "label": "мг/л воздуха", "note": "максимум для новичков и до 18 лет"},
            {"value": "0,50", "label": "г/л крови", "note": "эквивалент для взрослых (0,25 в воздухе)"}
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена",
          "text": "Один из вариантов ответа утверждает, что велосипедисты НЕ обязаны проходить проверку на алкоголь. Это ЛОЖЬ: они обязаны, в тех же условиях, что и любой другой водитель."
        }
      ]
    }'
  );

  -- ── Step 17 · Quiz — DGT 358b17e2 (tasa máxima alcohol bicicleta) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 17, 'quiz',
    '{
      "text": "¿Cuál es la tasa máxima de alcohol permitida para el conductor mayor de edad de una bicicleta?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-07_test-024/358b17e2-993c-4eed-83e2-5bf32fd71848.webp",
      "options": [
        "0,15 miligramos por litro de aire espirado.",
        "0,25 miligramos por litro de aire espirado.",
        "Los conductores de bicicletas no están obligados a someterse a las pruebas de alcoholemia."
      ],
      "correct": 1,
      "explanation": "La tasa máxima para un ciclista adulto es de 0,25 mg/l en aire espirado, igual que para cualquier conductor de vehículo a motor. El 0,15 es el límite para conductores noveles y menores de 18 años. Los ciclistas SÍ están obligados a las pruebas de alcoholemia — la opción 3 es falsa."
    }',
    '{
      "text": "Какова максимально допустимая норма алкоголя для совершеннолетнего водителя велосипеда?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-07_test-024/358b17e2-993c-4eed-83e2-5bf32fd71848.webp",
      "options": [
        "0,15 миллиграмма на литр выдыхаемого воздуха.",
        "0,25 миллиграмма на литр выдыхаемого воздуха.",
        "Водители велосипедов не обязаны проходить проверку на алкоголь."
      ],
      "correct": 1,
      "explanation": "Максимальная норма алкоголя для взрослого велосипедиста — 0,25 мг/л выдыхаемого воздуха, как и для любого водителя. 0,15 — лимит для новичков и до 18 лет. Велосипедисты ОБЯЗАНЫ проходить проверку на алкоголь — вариант 3 ложный."
    }'
  );

  -- ── Step 18 · Resumen y mnemónica ─────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 18, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Resumen: el ciclista y la EPAC"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚴",
              "title": "Ciclo / Bicicleta",
              "description": "Solo pedales. Sin motor. Sin matrícula. Sin permiso. Mínimo 2 ruedas."
            },
            {
              "icon": "⚡",
              "title": "EPAC",
              "description": "Pedales + motor ≤250 W. Asistencia corta a 25 km/h. Sin matrícula. Sin permiso."
            },
            {
              "icon": "🪖",
              "title": "Casco",
              "description": "Obligatorio en interurbanas y <16 años. Exención solo en rampas ASCENDENTES prolongadas."
            },
            {
              "icon": "💡",
              "title": "Luces + Alcohol",
              "description": "Luces obligatorias de noche. Alcohol 0,25 mg/l (adultos). Los ciclistas sí se controlan."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Mnemónica: CAPAZ",
          "text": "C — Casco en Carretera (interurbana) y <16 años siempre. A — Autovía sí (arcén, >14 años), Autopista no nunca. P — Pasajero: <7 años, asiento homologado, conductor >18 años. A — Alcohol: 0,25 mg/l, igual que coches, y sí se controla. Z — ¿a dos en fila? Sí, con buena Visibilidad, pegados a la derecha."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Итог: велосипед и EPAC"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚴",
              "title": "Цикл / Велосипед",
              "description": "Только педали. Без мотора. Без номера. Без прав. Минимум 2 колеса."
            },
            {
              "icon": "⚡",
              "title": "EPAC",
              "description": "Педали + мотор ≤250 Вт. Ассист отключается при 25 км/ч. Без номера. Без прав."
            },
            {
              "icon": "🪖",
              "title": "Шлем",
              "description": "Обязателен на загородных дорогах и до 16 лет. Освобождение только на затяжных ПОДЪЁМАХ."
            },
            {
              "icon": "💡",
              "title": "Фары + Алкоголь",
              "description": "Фары обязательны ночью. Алкоголь: 0,25 мг/л (взрослые). Велосипедистов тоже проверяют."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Мнемоника: ШАДПА",
          "text": "Ш — Шлем на загородных дорогах и до 16 лет всегда. А — Autovía да (обочина, >14 лет), Autopista нет никогда. Д — Двое в ряд: разрешено при хорошей видимости, у правого края. П — Пассажир: до 7 лет, сертиф. сиденье, водитель >18 лет. А — Алкоголь: 0,25 мг/л, как у водителей авто, проверяют тоже."
        }
      ]
    }'
  );

END $$;
