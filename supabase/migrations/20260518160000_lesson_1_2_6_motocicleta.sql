-- Module 1 · Lesson 1.2.6 — Motocicleta
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- order_index: 11 (after 1.2.5 Ciclomotor at 10)
-- Quiz Step  4: DGT 399ff264 (motocicleta = cilindrada >50 cc)
-- Quiz Step  5: DGT 1e29a53c (permiso B >3 años → 125cc solo territorio nacional)
-- Quiz Step  7: DGT 3dee49a5 (ITV motocicletas >5 años = cada 2 años)
-- Quiz Step 10: DGT 187e7aac (permiso A + sidecar = Sí)
-- Quiz Step 11: authored (¿pueden las motos circular por autopistas?)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.6',
     'Motocicleta',
     'Мотоцикл',
     11, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Definición y características ─────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Qué es una motocicleta?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Definición legal",
          "text": "Motocicleta: vehículo de dos ruedas, con o sin sidecar, propulsado por motor. Para ser motocicleta (y no ciclomotor), debe tener cilindrada superior a 50 cc (si es motor de combustión) o estar diseñado para superar los 45 km/h."
        },
        {
          "type": "stats",
          "stats": [
            {"value": ">50 cc", "label": "cilindrada mínima", "note": "para motor de combustión interna"},
            {"value": ">45 km/h", "label": "o velocidad diseño", "note": "alternativa al criterio de cilindrada"},
            {"value": "2 ruedas", "label": "configuración base", "note": "puede añadir sidecar (rueda lateral)"}
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Что такое мотоцикл?"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Определение из закона",
          "text": "Мотоцикл — двухколёсное транспортное средство, с коляской или без, с двигателем. Чтобы считаться мотоциклом (а не мопедом), должен иметь объём двигателя более 50 куб. см (для ДВС) или быть рассчитан на скорость свыше 45 км/ч."
        },
        {
          "type": "stats",
          "stats": [
            {"value": ">50 куб.см", "label": "мин. объём двигателя", "note": "для двигателя внутреннего сгорания"},
            {"value": ">45 км/ч", "label": "или скорость по конструкции", "note": "альтернатива критерию объёма"},
            {"value": "2 колеса", "label": "базовая конфигурация", "note": "может добавляться коляска (боковое колесо)"}
          ]
        }
      ]
    }'
  );

  -- ── Step 2 · Tipos y permisos ──────────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Tipos de motocicleta y permisos"
        },
        {
          "type": "table",
          "headers": ["Tipo", "Características", "Permiso"],
          "rows": [
            ["Motocicleta ligera", "≤125 cc, ≤11 kW, relación pot/masa ≤0,1 kW/kg", "A1 (desde 16 años)"],
            ["Motocicleta A2", "≤35 kW, relación pot/masa ≤0,2 kW/kg", "A2 (desde 18 años)"],
            ["Motocicleta A", "Cualquier cilindrada y potencia", "A (desde 20 o 24 años)"],
            ["Con sidecar", "Motocicleta con rueda lateral", "A (igual que sin sidecar)"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen! — Permiso B y los 125 cc",
          "text": "El titular del permiso B con más de 3 años de antigüedad puede conducir una motocicleta de 125 cc, pero SOLO por el territorio nacional español. En otros países europeos no está autorizado sin el permiso A1."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Типы мотоциклов и права"
        },
        {
          "type": "table",
          "headers": ["Тип", "Характеристики", "Права"],
          "rows": [
            ["Лёгкий мотоцикл", "≤125 куб.см, ≤11 кВт, мощность/масса ≤0,1 кВт/кг", "A1 (с 16 лет)"],
            ["Мотоцикл A2", "≤35 кВт, мощность/масса ≤0,2 кВт/кг", "A2 (с 18 лет)"],
            ["Мотоцикл A", "Любой объём и мощность", "A (с 20 или 24 лет)"],
            ["С коляской", "Мотоцикл с боковым колесом", "A (как без коляски)"]
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена — Права B и 125 кубов",
          "text": "Владелец прав категории B со стажем более 3 лет может управлять мотоциклом 125 куб.см, но ТОЛЬКО на территории Испании. В других европейских странах это не разрешено без прав A1."
        }
      ]
    }'
  );

  -- ── Step 3 · Casco obligatorio ────────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Casco: siempre obligatorio"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "El casco es SIEMPRE obligatorio para el conductor y el pasajero de una motocicleta, en cualquier tipo de vía, urbana o interurbana. A diferencia del ciclista, el motorista no tiene ninguna exención por rampas ascendentes ni por ninguna otra causa."
        },
        {
          "type": "list",
          "style": "check",
          "title": "Equipamiento obligatorio del motorista",
          "items": [
            "Casco de protección homologado — siempre, en toda vía",
            "Guantes de protección homologados",
            "Calzado que cubra el tobillo",
            "Ropa de protección (recomendada aunque no obligatoria legalmente en todos los casos)",
            "Chaleco reflectante al bajarse del vehículo en vía interurbana"
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Шлем: всегда обязателен"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Шлем ВСЕГДА обязателен для водителя и пассажира мотоцикла на любой дороге — городской или загородной. В отличие от велосипедиста, мотоциклист не имеет никаких исключений: ни на подъёмах, ни по другим причинам."
        },
        {
          "type": "list",
          "style": "check",
          "title": "Обязательная экипировка мотоциклиста",
          "items": [
            "Сертифицированный защитный шлем — всегда, на любой дороге",
            "Сертифицированные защитные перчатки",
            "Обувь, закрывающая лодыжку",
            "Защитная одежда (рекомендуется, не всегда обязательна по закону)",
            "Светоотражающий жилет при выходе из ТС на загородной дороге"
          ]
        }
      ]
    }'
  );

  -- ── Step 4 · Quiz — DGT 399ff264 (motocicleta = cilindrada >50 cc) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{
      "text": "Un vehículo de dos ruedas provisto de un motor de combustión interna podrá ser catalogado como motocicleta siempre que...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/399ff264-ee6c-4ea1-b143-5b62c4734ae2.webp",
      "options": [
        "su cilindrada sea superior a 50 centímetros cúbicos.",
        "pueda alcanzar una velocidad máxima superior a 40 km/h.",
        "disponga de al menos dos plazas, incluida la del conductor."
      ],
      "correct": 0,
      "explanation": "Un vehículo de dos ruedas con motor de combustión interna es motocicleta cuando su cilindrada supera los 50 cc. Los ciclomotores tienen ≤50 cc. El criterio de velocidad es >45 km/h por construcción (no 40), y la cantidad de plazas no determina la categoría."
    }',
    '{
      "text": "Двухколёсное транспортное средство с двигателем внутреннего сгорания классифицируется как мотоцикл при условии, что...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/399ff264-ee6c-4ea1-b143-5b62c4734ae2.webp",
      "options": [
        "объём его двигателя превышает 50 кубических сантиметров.",
        "оно может развивать максимальную скорость более 40 км/ч.",
        "оно имеет как минимум два места, включая место водителя."
      ],
      "correct": 0,
      "explanation": "Двухколёсное ТС с ДВС является мотоциклом, если объём двигателя превышает 50 куб.см. У мопедов (ciclomotor) ≤50 куб.см. Критерий скорости — >45 км/ч по конструкции (не 40), а количество мест не определяет категорию."
    }'
  );

  -- ── Step 5 · Quiz — DGT 1e29a53c (permiso B >3 años → 125cc nacional) ─────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{
      "text": "¿Puede el titular de un permiso de conducción de clase B con una antigüedad mayor a 3 años conducir una motocicleta de 125 cc?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-004/1e29a53c-2255-40a8-845f-bab8f8ea91ec.webp",
      "options": [
        "Sí, pero solo por el territorio nacional.",
        "No, es necesario obtener el permiso de la clase A.",
        "No, es necesario obtener el permiso de la clase A1."
      ],
      "correct": 0,
      "explanation": "El permiso B con más de 3 años de antigüedad sí permite conducir una moto de 125 cc, pero únicamente dentro del territorio español. Para conducirla en otros países europeos se necesita el permiso A1. No es necesario obtener el permiso A completo."
    }',
    '{
      "text": "Может ли владелец прав категории B со стажем более 3 лет управлять мотоциклом объёмом 125 куб.см?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-004/1e29a53c-2255-40a8-845f-bab8f8ea91ec.webp",
      "options": [
        "Да, но только на территории Испании.",
        "Нет, необходимо получить права категории A.",
        "Нет, необходимо получить права категории A1."
      ],
      "correct": 0,
      "explanation": "Права B со стажем более 3 лет разрешают управление мотоциклом 125 куб.см, но только на территории Испании. Для езды в других европейских странах нужны права A1. Получать полные права A не требуется."
    }'
  );

  -- ── Step 6 · ITV — inspección técnica ────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "ITV — Inspección Técnica de Vehículos"
        },
        {
          "type": "table",
          "headers": ["Antigüedad moto", "Frecuencia ITV"],
          "rows": [
            ["0 — 3 años", "Exenta (vehículo nuevo)"],
            ["3 — 5 años", "Primera ITV obligatoria al 4.° año"],
            ["Más de 5 años", "Cada 2 años"],
            ["Más de 10 años", "Cada año (en algunas CC.AA.)"]
          ],
          "caption": "Las fechas exactas dependen de la comunidad autónoma, pero el examen pregunta por el intervalo general."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "Las motocicletas con más de 5 años de antigüedad deben pasar la ITV cada DOS años. No cada año, no cada cinco."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "ITV — Технический осмотр"
        },
        {
          "type": "table",
          "headers": ["Возраст мотоцикла", "Периодичность ITV"],
          "rows": [
            ["0 — 3 года", "Освобождён (новый ТС)"],
            ["3 — 5 лет", "Первый ITV на 4-м году"],
            ["Более 5 лет", "Каждые 2 года"],
            ["Более 10 лет", "Каждый год (в некоторых регионах)"]
          ],
          "caption": "Точные сроки зависят от автономного сообщества, но на экзамене спрашивают общий интервал."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Мотоциклы старше 5 лет проходят ITV каждые ДВА года. Не каждый год, не каждые пять."
        }
      ]
    }'
  );

  -- ── Step 7 · Quiz — DGT 3dee49a5 (ITV >5 años = cada 2 años) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{
      "text": "Las motocicletas con más de cinco años de antigüedad deben pasar la inspección técnica periódica (ITV)...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-004/3dee49a5-bfa4-4546-967d-f6014e3ce668.webp",
      "options": [
        "cada año.",
        "cada dos años.",
        "cada cinco años."
      ],
      "correct": 1,
      "explanation": "Las motocicletas con más de 5 años de antigüedad pasan la ITV cada dos años. No cada año (que sería demasiado frecuente y se aplica en algunos casos a vehículos más antiguos o en ciertas comunidades autónomas) ni cada cinco años."
    }',
    '{
      "text": "Мотоциклы старше пяти лет должны проходить периодический технический осмотр (ITV)...",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-004/3dee49a5-bfa4-4546-967d-f6014e3ce668.webp",
      "options": [
        "каждый год.",
        "каждые два года.",
        "каждые пять лет."
      ],
      "correct": 1,
      "explanation": "Мотоциклы старше 5 лет проходят ITV каждые два года. Не каждый год (это слишком часто, применяется в отдельных случаях или регионах) и не каждые пять лет."
    }'
  );

  -- ── Step 8 · Circulación — vías y normas específicas ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Circulación de motocicletas — normas clave"
        },
        {
          "type": "list",
          "style": "check",
          "title": "Las motocicletas PUEDEN",
          "items": [
            "Circular por autopistas y autovías (con el permiso correspondiente)",
            "Usar carril VAO si el conductor va solo (dependiendo de señalización)",
            "Circular en paralelo en determinadas condiciones",
            "Llevar sidecar (rueda lateral) con permiso A"
          ]
        },
        {
          "type": "list",
          "style": "cross",
          "title": "Las motocicletas NO PUEDEN",
          "items": [
            "Arrastrar un remolque o semirremolque (prohibido para motos)",
            "Llevar pasajero menor de edad sin las condiciones reglamentarias",
            "Usar el teléfono móvil durante la conducción",
            "Circular con luces de carretera en zonas urbanas"
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Движение мотоциклов — ключевые правила"
        },
        {
          "type": "list",
          "style": "check",
          "title": "Мотоциклы МОГУТ",
          "items": [
            "Ехать по autopistas и autovías (с соответствующими правами)",
            "Использовать полосу VAO, если водитель один (зависит от знаков)",
            "Ехать параллельно в определённых условиях",
            "Иметь коляску (боковое колесо) с правами категории A"
          ]
        },
        {
          "type": "list",
          "style": "cross",
          "title": "Мотоциклам ЗАПРЕЩЕНО",
          "items": [
            "Буксировать прицеп или полуприцеп (мотоциклам запрещено)",
            "Перевозить несовершеннолетнего пассажира без соблюдения требований",
            "Использовать мобильный телефон во время езды",
            "Ехать с дальним светом в городских зонах"
          ]
        }
      ]
    }'
  );

  -- ── Step 9 · Luz de cruce durante el día ─────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Alumbrado obligatorio de día"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sale en el examen!",
          "text": "Las motocicletas están obligadas a llevar encendida la luz de cruce (corto alcance) durante el día. Esta obligación existe incluso en condiciones de buena visibilidad y en vías urbanas bien iluminadas. Es diferente a los turismos, que solo lo necesitan en condiciones especiales."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "Si la moto tiene luz de posición diurna (DRL) homologada, puede sustituir a la luz de cruce de día. Pero si solo tiene luces convencionales, la de cruce debe ir siempre encendida."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Обязательное освещение днём"
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Выходит на экзамене!",
          "text": "Мотоциклы ОБЯЗАНЫ ехать с включённым ближним светом ДНЁМ. Это требование действует даже при хорошей видимости и на освещённых городских дорогах. Отличие от автомобилей, которым ближний свет нужен только в особых условиях."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Внимание!",
          "text": "Если на мотоцикле есть сертифицированные дневные ходовые огни (DRL), они могут заменять ближний свет днём. Но при обычных фарах ближний свет должен быть включён постоянно."
        }
      ]
    }'
  );

  -- ── Step 10 · Quiz — DGT 187e7aac (permiso A + sidecar) ──────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{
      "text": "El titular de un permiso A, ¿puede conducir motocicletas con sidecar?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-001/187e7aac-3fef-463f-9c60-bb7314d70e33_1768939429520_pro.webp",
      "options": [
        "Sí.",
        "No.",
        "Sí, si la motocicleta supera los 125 cm³."
      ],
      "correct": 0,
      "explanation": "El permiso A autoriza a conducir cualquier tipo de motocicleta, incluyendo las que tienen sidecar. No existe restricción de cilindrada para el permiso A. La opción que pone condición de >125 cc es incorrecta, pues el A no tiene ese límite."
    }',
    '{
      "text": "Может ли владелец прав категории A управлять мотоциклами с боковым прицепом (коляской)?",
      "image_url": "https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-001/187e7aac-3fef-463f-9c60-bb7314d70e33_1768939429520_pro.webp",
      "options": [
        "Да.",
        "Нет.",
        "Да, если объём двигателя мотоцикла превышает 125 куб.см."
      ],
      "correct": 0,
      "explanation": "Права категории A разрешают управлять любым мотоциклом, включая оснащённые коляской. Ограничений по объёму двигателя для категории A нет. Вариант с условием >125 куб.см неверен — у категории A такого предела нет."
    }'
  );

  -- ── Step 11 · Quiz — authored (¿pueden las motos circular por autopistas?) ─
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{
      "text": "¿Pueden las motocicletas circular por las autopistas y autovías?",
      "options": [
        "No, está prohibido para todos los vehículos de dos ruedas.",
        "Sí, siempre que el conductor disponga del permiso de conducción correspondiente.",
        "Solo si la cilindrada es superior a 250 cc."
      ],
      "correct": 1,
      "explanation": "Las motocicletas SÍ pueden circular por autopistas y autovías con el permiso correspondiente. Esta es una diferencia fundamental con los ciclomotores, que tienen completamente prohibida la circulación por estas vías. No existe restricción de cilindrada para acceder a autopistas."
    }',
    '{
      "text": "Могут ли мотоциклы ездить по autopistas и autovías?",
      "options": [
        "Нет, двухколёсным транспортным средствам это запрещено.",
        "Да, при наличии соответствующего водительского удостоверения.",
        "Только если объём двигателя превышает 250 куб.см."
      ],
      "correct": 1,
      "explanation": "Мотоциклы МОГУТ ездить по autopistas и autovías при наличии соответствующих прав. Это принципиальное отличие от мопедов (ciclomotor), которым такие дороги полностью запрещены. Ограничений по объёму двигателя для въезда на автомагистрали нет."
    }'
  );

  -- ── Step 12 · Resumen ─────────────────────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Resumen: la motocicleta"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🏍️",
              "title": "Definición",
              "description": ">50 cc (combustión) o diseñada para >45 km/h. 2 ruedas, puede tener sidecar."
            },
            {
              "icon": "📋",
              "title": "Permisos",
              "description": "A1 (125cc/11kW), A2 (≤35kW), A (cualquiera). B >3 años: 125cc solo en España."
            },
            {
              "icon": "🔦",
              "title": "Luz de cruce de día",
              "description": "Obligatoria siempre durante el día, incluso en zonas urbanas."
            },
            {
              "icon": "🔧",
              "title": "ITV",
              "description": "Primera al 4.° año. Más de 5 años → cada 2 años."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Clave: diferencia con ciclomotor",
          "text": "Ciclomotor: ≤50 cc y ≤45 km/h, prohibido en autopistas. Motocicleta: >50 cc o >45 km/h, puede circular por autopistas con el permiso A."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Итог: мотоцикл"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🏍️",
              "title": "Определение",
              "description": ">50 куб.см (ДВС) или конструктивно >45 км/ч. 2 колеса, может быть с коляской."
            },
            {
              "icon": "📋",
              "title": "Права",
              "description": "A1 (125куб/11кВт), A2 (≤35кВт), A (любой). B >3 лет: 125куб только в Испании."
            },
            {
              "icon": "🔦",
              "title": "Ближний свет днём",
              "description": "Обязателен всегда в светлое время, включая городские зоны."
            },
            {
              "icon": "🔧",
              "title": "ITV",
              "description": "Первый на 4-м году. Старше 5 лет → каждые 2 года."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Ключевое отличие от мопеда",
          "text": "Мопед: ≤50 куб.см и ≤45 км/ч, запрещён на автомагистралях. Мотоцикл: >50 куб.см или >45 км/ч, может ехать по автомагистралям с правами A."
        }
      ]
    }'
  );

END $$;
