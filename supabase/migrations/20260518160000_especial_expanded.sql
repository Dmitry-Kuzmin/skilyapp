-- Lesson 1.2.2 Automóvil y vehículo especial — расширение контента
-- Добавляем 2 новые теории (steps 3, 4) + 3 новых квиза (steps 7-9)
-- Существующие квизы сдвигаются с 3,4 → 5,6

DO $$
DECLARE
  l_id uuid := 'f358263a-e646-4e5a-980f-d5036f9db8c7';
BEGIN

  -- Освобождаем позиции 3 и 4 для новых теорий
  UPDATE lesson_steps
  SET order_index = order_index + 2
  WHERE lesson_id = l_id AND order_index >= 3;

  -- ── Step 3 · Circulación de vehículos especiales — arcén y señalización ───
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Regla del arcén para tractores y vehículos especiales",
          "text": "En carretera convencional con arcén transitable y suficiente, los vehículos especiales de hasta 3.500 kg de MMA están OBLIGADOS a circular por el arcén derecho. Los que superan 3.500 kg no tienen esa obligación y circulan por la calzada."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚜",
              "title": "Tractor ≤ 3.500 kg MMA",
              "description": "🟡 Arcén derecho OBLIGATORIO si es transitable y suficiente"
            },
            {
              "icon": "🚛",
              "title": "Tractor > 3.500 kg MMA",
              "description": "Calzada, borde derecho. No está obligado al arcén."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Trampa del examen! — El tractor de 2.500 o 3.000 kg",
          "text": "Las preguntas DGT muestran tractores de 2.500 o 3.000 kg y preguntan si circulan correctamente por la calzada. Al tener MMA ≤ 3.500 kg, DEBEN usar el arcén cuando sea transitable. Circular por la calzada existiendo arcén transitable es INCORRECTO."
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Señal V-2 — Luz destellante ámbar",
          "text": "Los vehículos especiales que circulan por carretera deben llevar una luz destellante de color ámbar (V-2) visible desde todas las direcciones, normalmente en la parte superior del vehículo. Avisa a otros conductores de la presencia de un vehículo lento y voluminoso. El examen la describe como señal luminosa de color amarillo auto visible desde todas las direcciones."
        },
        {
          "type": "list",
          "style": "cross",
          "items": [
            "❌ Autopistas y autovías — siempre prohibidas (salvo autorización especial)",
            "❌ Vías urbanas de alta densidad sin permiso municipal"
          ]
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Правило обочины для тракторов и спецтехники",
          "text": "На обычной дороге с проходимой и достаточной обочиной спецтехника с ПРМ до 3500 кг ОБЯЗАНА ехать по правой обочине. Свыше 3500 кг такой обязанности нет — можно по проезжей части."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚜",
              "title": "Трактор ≤ 3500 кг ПРМ",
              "description": "🟡 Правая обочина ОБЯЗАТЕЛЬНА если проходима и достаточна"
            },
            {
              "icon": "🚛",
              "title": "Трактор > 3500 кг ПРМ",
              "description": "Проезжая часть, правый край. Обочина не обязательна."
            }
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Ловушка экзамена! — Трактор 2500 или 3000 кг",
          "text": "Вопросы DGT показывают тракторы 2500 или 3000 кг и спрашивают, правильно ли они едут по проезжей части. При ПРМ ≤ 3500 кг они ОБЯЗАНЫ использовать обочину, если она проходима. Ехать по проезжей части при наличии проходимой обочины — НЕВЕРНО."
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Сигнал V-2 — Мигающий жёлтый фонарь",
          "text": "Спецтехника на дороге должна иметь мигающий янтарный фонарь (V-2), видимый со всех направлений — обычно на крыше. Предупреждает других водителей о присутствии медленного крупного ТС. На экзамене описывается как жёлтый световой сигнал, видимый со всех сторон."
        },
        {
          "type": "list",
          "style": "cross",
          "items": [
            "❌ Автострады и автомагистрали — всегда запрещены (кроме специального разрешения)",
            "❌ Плотные городские трассы без разрешения муниципалитета"
          ]
        }
      ]
    }'
  );

  -- ── Step 4 · Cuadro completo de velocidades + tren turístico ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Velocidades máximas de vehículos especiales — tabla completa"
        },
        {
          "type": "table",
          "headers": ["Caso", "Vel. máxima", "Por qué"],
          "rows": [
            ["Vehículo especial (caso general)", "40 km/h", "Límite genérico del Reglamento"],
            ["Con remolque", "25 km/h", "Menor estabilidad al arrastrar carga"],
            ["Sin luz de freno", "25 km/h", "Peligro para tráfico de detrás"],
            ["Motocultor", "25 km/h", "Vehículo de 1 eje, muy lento"],
            ["Si construcción supera 60 km/h", "70 km/h", "Cuadriciclos pesados (L7e)"]
          ],
          "caption": "Tres casos reducen la velocidad a 25 km/h: remolque + sin luz freno + motocultor."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Tren turístico — dos datos que siempre aparecen en el examen",
          "text": "1) Su velocidad máxima por construcción es de 25 km/h. 2) NO tiene instalados cinturones de seguridad. Ambos datos son el comodín favorito de las preguntas DGT sobre el tren turístico. No confundir: el límite de 25 km/h es por construcción, no por la vía."
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Regla de memoria — los tres casos de 25 km/h",
          "text": "El acrónimo RMS ayuda: R = con Remolque, M = Motocultor, S = Sin luz de freno. Si el vehículo especial cumple alguna de estas tres condiciones → máximo 25 km/h. Sin ninguna de ellas → 40 km/h. Si supera 60 km/h por diseño → 70 km/h."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Максимальные скорости спецтехники — полная таблица"
        },
        {
          "type": "table",
          "headers": ["Случай", "Макс. скорость", "Причина"],
          "rows": [
            ["Спецтехника (общий случай)", "40 км/ч", "Общий лимит Регламента"],
            ["С прицепом", "25 км/ч", "Меньшая устойчивость при буксировке"],
            ["Без стоп-сигнала", "25 км/ч", "Опасность для едущих сзади"],
            ["Мотокультиватор", "25 км/ч", "Однооcное ТС, очень медленное"],
            ["Если конструктивно >60 км/ч", "70 км/ч", "Тяжёлые квадрициклы (L7e)"]
          ],
          "caption": "Три случая снижают скорость до 25 км/ч: прицеп + нет стоп-сигнала + мотокультиватор."
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Туристический поезд — два факта, всегда выходящих на экзамене",
          "text": "1) Максимальная скорость по конструкции — 25 км/ч. 2) Ремни безопасности НЕ установлены. Оба факта — любимый вопрос DGT про туристический поезд. Важно: лимит 25 км/ч — конструктивный, а не дорожный."
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Мнемоника — три случая с 25 км/ч",
          "text": "Аббревиатура ПСМ: П = с Прицепом, С = без Стоп-сигнала, М = Мотокультиватор. Если спецтехника отвечает любому из этих трёх условий → максимум 25 км/ч. Без условий → 40 км/ч. Если конструктивно >60 км/ч → 70 км/ч."
        }
      ]
    }'
  );

  -- ── Steps 7-9 · Новые квизы ───────────────────────────────────────────────

  -- Step 7 · Quiz — velocidad general 40 km/h (DGT eba098dd)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{
      "text": "La velocidad máxima, con carácter general, para un vehículo especial es de...",
      "options": [
        "45 kilómetros por hora.",
        "40 kilómetros por hora.",
        "60 kilómetros por hora."
      ],
      "correct": 1,
      "explanation": "La velocidad máxima genérica para los vehículos especiales es de 40 km/h. Este límite se reduce a 25 km/h si arrastran un remolque, si carecen de luz de freno o si son motocultores. Si el vehículo especial está diseñado para superar 60 km/h en llano, puede circular hasta 70 km/h."
    }',
    '{
      "text": "Какова максимальная скорость, в общем случае, для специального транспортного средства?",
      "options": [
        "45 километров в час.",
        "40 километров в час.",
        "60 километров в час."
      ],
      "correct": 1,
      "explanation": "Общий лимит скорости для спецтехники — 40 км/ч. Снижается до 25 км/ч при буксировке прицепа, отсутствии стоп-сигнала или если это мотокультиватор. Если конструкция позволяет превышать 60 км/ч — можно до 70 км/ч."
    }'
  );

  -- Step 8 · Quiz — sin señalización frenado → 25 km/h (DGT 5a71685e)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{
      "text": "Un vehículo especial que carece de señalización de frenado, no debe rebasar la velocidad máxima de...",
      "options": [
        "70 km/h.",
        "40 km/h.",
        "25 km/h."
      ],
      "correct": 2,
      "explanation": "Cuando un vehículo especial carece de luz de freno (señalización de frenado), su velocidad máxima se reduce a 25 km/h. Sin esta señal, los conductores que circulan detrás no pueden anticipar la frenada y el riesgo de colisión es muy elevado. Es uno de los tres casos que reducen el límite de 40 a 25 km/h."
    }',
    '{
      "text": "Специальное транспортное средство, не имеющее сигнализации торможения, не должно превышать максимальную скорость...",
      "options": [
        "70 км/ч.",
        "40 км/ч.",
        "25 км/ч."
      ],
      "correct": 2,
      "explanation": "Если у спецтехники нет стоп-сигнала, максимальная скорость снижается до 25 км/ч. Без этого сигнала водители сзади не могут предугадать торможение, риск столкновения очень высок. Это один из трёх случаев снижения лимита с 40 до 25 км/ч."
    }'
  );

  -- Step 9 · Quiz — tren turístico SIN cinturones
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{
      "text": "El tren turístico, ¿tiene instalados cinturones de seguridad?",
      "options": [
        "Sí, en todos los asientos.",
        "Sí, solo en los asientos delanteros.",
        "No, no tiene instalados cinturones de seguridad."
      ],
      "correct": 2,
      "explanation": "El tren turístico es un vehículo especial que NO tiene instalados cinturones de seguridad. Además, su velocidad máxima por construcción es de 25 km/h. Estos dos datos son los que más aparecen en las preguntas DGT sobre el tren turístico y ambos debes recordar juntos."
    }',
    '{
      "text": "Оснащён ли туристический поезд ремнями безопасности?",
      "options": [
        "Да, на всех сиденьях.",
        "Да, только на передних сиденьях.",
        "Нет, ремни безопасности не установлены."
      ],
      "correct": 2,
      "explanation": "Туристический поезд — спецтехника, у которой ремни безопасности НЕ установлены. Кроме того, его максимальная конструктивная скорость — 25 км/ч. Эти два факта чаще всего встречаются в вопросах DGT про туристический поезд — запомни оба вместе."
    }'
  );

END $$;
