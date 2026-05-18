-- Lesson 1.2.4.1 VMP — расширение контента
-- Добавляем 2 новые теории (steps 3, 4) + 4 новых квиза (steps 7-10)
-- Существующие квизы сдвигаются с 3,4 → 5,6

DO $$
DECLARE
  l_id uuid := 'b09a47ea-598b-4ae3-9f08-a88401e9f605';
BEGIN

  -- Освобождаем позиции 3 и 4 для новых теорий
  UPDATE lesson_steps
  SET order_index = order_index + 2
  WHERE lesson_id = l_id AND order_index >= 3;

  -- ── Step 3 · Что НЕ является ВМП + Обязанности водителя ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "¿Qué NO es un VMP? — Exclusiones expresas de la ley",
          "text": "La normativa excluye expresamente varios tipos de vehículos de la categoría VMP aunque tengan motor eléctrico y ruedas. Conocer estas exclusiones es clave para el examen."
        },
        {
          "type": "list",
          "style": "cross",
          "items": [
            "Bicicletas EPAC (pedaleo eléctrico asistido hasta 25 km/h, ≤1000 W) — se consideran CICLOS, no VMP",
            "Ciclomotores de 2, 3 y 4 ruedas (L1e, L2e, L6e)",
            "Vehículos para personas con movilidad reducida",
            "Vehículos con velocidad máxima inferior a 6 km/h (juguetes)",
            "Vehículos de las Fuerzas Armadas",
            "Vehículos diseñados para circular exclusivamente fuera de vías públicas"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡La trampa de las EPAC en el examen!",
          "text": "La bicicleta eléctrica convencional (EPAC) NO es un VMP. Tiene motor que asiste al pedaleo hasta 25 km/h con ≤1000 W, pero es un CICLO. No necesita matrícula, permiso ni ITV. Muchos candidatos confunden EPAC con VMP en el examen DGT."
        },
        {
          "type": "heading",
          "text": "Obligaciones del conductor de VMP"
        },
        {
          "type": "list",
          "style": "check",
          "items": [
            "✅ Someterse a pruebas de alcoholemia (Tasa General) y de drogas, igual que cualquier conductor",
            "✅ Respetar todas las normas de circulación como el resto de conductores",
            "🚫 Prohibido usar manualmente el teléfono móvil mientras se conduce",
            "🚫 Prohibido usar auriculares o cascos conectados a reproductores de sonido",
            "📄 Obligatorio portar el certificado de características técnicas CE del vehículo"
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen! — El VMP y el alcohol",
          "text": "Conducir un VMP bajo los efectos del alcohol o las drogas tiene las mismas consecuencias legales que hacerlo con un turismo. El conductor de un patinete eléctrico es conductor a todos los efectos y está obligado a someterse a las pruebas de detección."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Что НЕ является ВМП — прямые исключения закона",
          "text": "Нормативы прямо исключают несколько видов транспорта из категории ВМП, даже если у них электромотор и колёса. Знать эти исключения важно для экзамена."
        },
        {
          "type": "list",
          "style": "cross",
          "items": [
            "Велосипеды EPAC (педальный электроассист до 25 км/ч, ≤1000 Вт) — считаются ВЕЛОСИПЕДАМИ, не ВМП",
            "Мопеды с 2, 3 и 4 колёсами (L1e, L2e, L6e)",
            "Транспортные средства для людей с ограниченной подвижностью",
            "ТС с максимальной скоростью менее 6 км/ч (игрушки)",
            "Военные транспортные средства",
            "ТС, предназначенные исключительно для езды вне дорог общего пользования"
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Ловушка с EPAC на экзамене!",
          "text": "Обычный электровелосипед (EPAC) — НЕ ВМП. У него мотор-ассистент при педалировании до 25 км/ч с мощностью ≤1000 Вт, но это ВЕЛОСИПЕД. Не нужны номер, права, техосмотр. Многие путают EPAC с ВМП на экзамене DGT."
        },
        {
          "type": "heading",
          "text": "Обязанности водителя ВМП"
        },
        {
          "type": "list",
          "style": "check",
          "items": [
            "✅ Обязан проходить алкотест (Общая норма) и тест на наркотики наравне с любым водителем",
            "✅ Обязан соблюдать все правила дорожного движения наравне с другими водителями",
            "🚫 Запрещено вручную пользоваться мобильным телефоном во время езды",
            "🚫 Запрещено использовать наушники, подключённые к аудиоустройствам",
            "📄 Обязан иметь при себе сертификат технических характеристик CE"
          ]
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Важно для экзамена! — ВМП и алкоголь",
          "text": "Управлять ВМП под алкоголем или наркотиками — те же правовые последствия, что и для водителя легкового авто. Водитель электросамоката является водителем во всех смыслах и обязан проходить проверки."
        }
      ]
    }'
  );

  -- ── Step 4 · Сиденье, типы ВМП, документация, экоэтикетка ───────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "¿Puede un VMP tener sillín?"
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Regla del sillín — dato frecuente en el examen",
          "text": "Los VMP solo pueden estar equipados con asiento o sillín SI disponen de un sistema de autoequilibrado. Sin autoequilibrado: sillín PROHIBIDO. Un patinete eléctrico estándar no tiene autoequilibrado → no puede tener sillín."
        },
        {
          "type": "heading",
          "text": "Dos tipos de VMP"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🛴",
              "title": "Transporte personal",
              "description": "1 plaza · Masa < 50 kg · Longitud ≤ 2.000 mm · Altura ≤ 1.400 mm · Anchura ≤ 750 mm"
            },
            {
              "icon": "📦",
              "title": "Transporte de mercancías",
              "description": "≥ 3 ruedas · Con plataforma de carga · Masa < 400 kg · NO puede transportar pasajeros"
            }
          ]
        },
        {
          "type": "heading",
          "text": "Certificado y distintivo ambiental"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "📄 Certificado de características técnicas CE — obligatorio para todos los VMP vendidos desde enero 2024",
            "🟢 Los VMP vendidos antes de 2024 pueden circular sin certificado hasta enero de 2027",
            "🌿 Los VMP llevan el distintivo ambiental de CERO EMISIONES (etiqueta verde)",
            "🔋 Están exentos del adhesivo de clasificación ambiental de la DGT (no llevan A, B, C, ECO)"
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Resumen de datos para el examen",
          "text": "1) Sillín: solo si hay autoequilibrado. 2) Documento obligatorio: certificado CE de características técnicas. 3) Luz de freno: obligatoria, NO puede sustituirse por catadióptrico. 4) Avisador acústico: obligatorio en TODOS los VMP sin excepción. 5) Distintivo ambiental: cero emisiones (verde)."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Может ли ВМП иметь сиденье?"
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Правило сиденья — частый вопрос на экзамене",
          "text": "ВМП может иметь сиденье или седло ТОЛЬКО при наличии системы самобалансировки. Без самобалансировки — сиденье ЗАПРЕЩЕНО. Стандартный электросамокат не имеет самобалансировки → сиденья быть не должно."
        },
        {
          "type": "heading",
          "text": "Два типа ВМП"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🛴",
              "title": "Личный транспорт",
              "description": "1 место · Масса < 50 кг · Длина ≤ 2000 мм · Высота ≤ 1400 мм · Ширина ≤ 750 мм"
            },
            {
              "icon": "📦",
              "title": "Перевозка грузов",
              "description": "≥ 3 колёс · Грузовая платформа · Масса < 400 кг · Пассажиров перевозить НЕЛЬЗЯ"
            }
          ]
        },
        {
          "type": "heading",
          "text": "Сертификат и экологическая маркировка"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "📄 Сертификат технических характеристик CE — обязателен для всех ВМП, проданных с января 2024",
            "🟢 ВМП, проданные до 2024 года, могут ездить без сертификата до января 2027",
            "🌿 ВМП несут знак НУЛЕВЫХ ВЫБРОСОВ (зелёная наклейка)",
            "🔋 Освобождены от наклейки экоклассификации DGT (не A, B, C, ECO)"
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Сводка данных для экзамена",
          "text": "1) Сиденье: только при самобалансировке. 2) Обязательный документ: сертификат CE. 3) Стоп-сигнал: обязателен, НЕЛЬЗЯ заменить катафотом. 4) Звуковой сигнал: обязателен для ВСЕХ ВМП без исключений. 5) Экологический знак: нулевые выбросы (зелёный)."
        }
      ]
    }'
  );

  -- ── Steps 7-10 · Новые квизы из БД DGT ──────────────────────────────────

  -- Step 7 · Quiz — 2 frenos independientes (DGT 319cebfc)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{
      "text": "Los vehículos de movilidad personal (VMP), ¿deben disponer de un sistema de frenado que permita desacelerar el vehículo hasta su total detención?",
      "options": [
        "No; el sistema de frenado es un elemento opcional en los VMP.",
        "No; solo es obligatorio para los VMP para transporte de mercancías.",
        "Sí; todos los VMP deberán disponer de dos frenos independientes."
      ],
      "correct": 2,
      "explanation": "Todos los VMP, sin excepción, deben disponer de DOS frenos independientes capaces de desacelerar el vehículo hasta su total detención. No es un elemento opcional. En los VMP de transporte de mercancías, además, cada eje debe tener un actuador independiente."
    }',
    '{
      "text": "Должны ли ВМП иметь тормозную систему, позволяющую полностью остановить транспортное средство?",
      "options": [
        "Нет; тормозная система является опциональным элементом ВМП.",
        "Нет; обязательно только для ВМП, предназначенных для перевозки грузов.",
        "Да; все ВМП должны иметь два независимых тормоза."
      ],
      "correct": 2,
      "explanation": "Все ВМП без исключения обязаны иметь ДВА независимых тормоза, способных остановить ТС полностью. Это не опция. На ВМП для перевозки грузов, кроме того, каждая ось должна иметь отдельный тормозной привод."
    }'
  );

  -- Step 8 · Quiz — sillín solo con autoequilibrado (DGT 438e677f)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{
      "text": "¿Puede el vehículo de movilidad personal tener sillín?",
      "options": [
        "No porque ya no se consideraría vehículo de movilidad personal.",
        "Sí.",
        "Sí, si está dotado de sistema de autoequilibrado."
      ],
      "correct": 2,
      "explanation": "Los VMP pueden tener sillín o asiento ÚNICAMENTE si están dotados de un sistema de autoequilibrado. Sin autoequilibrado, el sillín está prohibido. Un patinete eléctrico convencional no tiene autoequilibrado, por lo que no puede tener sillín."
    }',
    '{
      "text": "Может ли средство индивидуальной мобильности (ВМП) иметь сиденье?",
      "options": [
        "Нет, тогда оно перестало бы считаться ВМП.",
        "Да.",
        "Да, если оно оснащено системой самобалансировки."
      ],
      "correct": 2,
      "explanation": "ВМП может иметь сиденье или седло ТОЛЬКО при наличии системы самобалансировки. Без самобалансировки сиденье запрещено. У обычного электросамоката нет самобалансировки — значит, сиденья у него быть не должно."
    }'
  );

  -- Step 9 · Quiz — luz NO puede sustituirse por catadióptrico (DGT 94e6ca16)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{
      "text": "En un vehículo de movilidad personal, ¿puede sustituirse alguna luz por un catadióptrico?",
      "options": [
        "Sí, la delantera.",
        "Sí, la trasera.",
        "No, ninguna."
      ],
      "correct": 2,
      "explanation": "En los VMP ninguna luz puede ser sustituida por un catadióptrico. Las luces delantera, trasera y de freno son obligatorias e independientes de los catadióptricos. Los catadióptricos también son obligatorios, pero son un elemento adicional, no un sustituto de la iluminación."
    }',
    '{
      "text": "Можно ли в ВМП заменить какой-либо фонарь катафотом (световозвращателем)?",
      "options": [
        "Да, передний.",
        "Да, задний.",
        "Нет, ни один."
      ],
      "correct": 2,
      "explanation": "В ВМП ни один фонарь не может быть заменён катафотом. Передний, задний и стоп-сигнал обязательны и независимы от катафотов. Катафоты тоже обязательны, но это дополнительный элемент, а не замена освещению."
    }'
  );

  -- Step 10 · Quiz — certificado CE (DGT 410c0f3a)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{
      "text": "¿Qué documento debe llevar obligatoriamente un vehículo de movilidad personal para poder circular por las vías públicas?",
      "options": [
        "Un certificado de características técnicas para VMP.",
        "Una tarjeta de inspección técnica de vehículos.",
        "Un certificado de circulación."
      ],
      "correct": 0,
      "explanation": "Los VMP deben portar obligatoriamente el certificado de características técnicas conforme a la normativa europea CE. Este documento acredita que el vehículo cumple con los requisitos técnicos del Manual de Características publicado en el BOE. Los VMP vendidos desde enero de 2024 están obligados a disponer de este certificado."
    }',
    '{
      "text": "Какой документ обязан иметь при себе ВМП для движения по дорогам общего пользования?",
      "options": [
        "Сертификат технических характеристик для ВМП.",
        "Карточку технического осмотра транспортного средства.",
        "Свидетельство о регистрации."
      ],
      "correct": 0,
      "explanation": "ВМП обязан иметь сертификат технических характеристик согласно европейскому стандарту CE. Этот документ подтверждает соответствие ТС техническим требованиям Руководства по характеристикам, опубликованного в BOE. Для ВМП, продаваемых с января 2024 года, наличие сертификата обязательно."
    }'
  );

END $$;
