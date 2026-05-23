-- Migration: Update Lesson 1.1 to "¿Quién es quién en la carretera?" and cleanup redundant lessons
-- Path: supabase/migrations/20260521212000_update_lesson_1_1.sql

DO $$
DECLARE
  l1_id UUID := '23827d2b-8efb-409f-9759-1b6004589f23';
BEGIN

  -- 1. Update Lesson 1.1 metadata
  UPDATE course_lessons
  SET title_es = '¿Quién es quién en la carretera? (Análisis detallado)',
      title_ru = 'Кто есть кто на дороге? (Углубленный разбор)',
      xp_reward = 40
  WHERE id = l1_id;

  -- 2. Remove all steps of reorganized lessons
  DELETE FROM lesson_steps 
  WHERE lesson_id IN (
    l1_id,
    '40f90e08-d239-4ed0-973e-41369b5d7962', -- old 1.2.1
    '0a89f637-39c7-4fae-96be-1b1aecd4b42a', -- old 1.2.1.2
    'ae35e3d4-0fbb-440d-bca6-6ed511174cd2'  -- old 1.2.15
  );

  -- 3. Delete redundant lessons
  DELETE FROM course_lessons 
  WHERE id IN (
    '40f90e08-d239-4ed0-973e-41369b5d7962',
    '0a89f637-39c7-4fae-96be-1b1aecd4b42a',
    'ae35e3d4-0fbb-440d-bca6-6ed511174cd2'
  );

  -- 4. Reorder remaining lessons to avoid index gaps if necessary
  -- Let's check: lesson 1.1 (order_index=1), old 1.2.1 was 2, 1.2.1.2 was 3, 1.3 was 4, 1.4 was 5.
  -- After deletion of 2 and 3, we have 1, 4, 5. Let's shift indexes from 4 onwards by -2.
  UPDATE course_lessons
  SET order_index = order_index - 2
  WHERE module_id = 'bef4ce90-5902-49d1-a082-173faeefda12' AND order_index >= 4;

  -- 5. Insert new steps for Lesson 1.1

  -- Step 1: Theory - Definition of vehicle & motor vehicle exclusions
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "1. El Vehículo"
        },
        {
          "type": "text",
          "text": "El Reglamento General de Vehículos define **Vehículo** como cualquier aparato apto para circular por las vías o terrenos de uso común (públicos o privados)."
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Vehículos a motor vs. Vehículos sin motor",
          "text": "El gran error en el examen es pensar que cualquier aparato con motor es legalmente un «vehículo a motor». La ley clasifica los vehículos no por la presencia física de un motor, sino por su definición jurídica."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚗",
              "title": "Vehículos a motor",
              "description": "Tienen motor para su propulsión. Incluye automóviles (turismos, motocicletas, camiones, autobuses) y vehículos especiales (tractores agrícolas, maquinaria de obras)."
            },
            {
              "icon": "🚲",
              "title": "Vehículos SIN motor (Jurídicamente)",
              "description": "Aquellos que no entran en la categoría de vehículos a motor. ¡Incluye vehículos que SÍ tienen motor pero están excluidos expresamente por la ley!"
            }
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Lista obligatoria para el examen!",
          "text": "Los siguientes vehículos **NO se consideran vehículos a motor**, a pesar de tener propulsión propia:\n1. **Ciclomotores** (motores ≤ 50 cc, velocidad ≤ 45 km/h).\n2. **Vehículos de Movilidad Personal (VMP)** como patinetes eléctricos (velocidad entre 6 y 25 km/h).\n3. **Bicicletas de pedaleo asistido (EPAC)**.\n4. **Tranvías**.\n5. **Vehículos para personas de movilidad reducida**."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "Si te preguntan: «¿Es un ciclomotor un vehículo a motor?», la respuesta es **NO**. Es la trampa más habitual de la DGT."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "1. Транспортное средство (Vehículo)"
        },
        {
          "type": "text",
          "text": "Общий регламент о транспортных средствах определяет **Vehículo** как любое устройство, пригодное для движения по дорогам или территориям общего пользования (как общественным, так и частным)."
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Механические ТС против Немеханических",
          "text": "Главная ошибка на экзамене — думать, что любое устройство с двигателем юридически считается «механическим ТС» (vehículo a motor). Закон классифицирует транспорт не по наличию мотора, а по его юридическому статусу."
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "🚗",
              "title": "Механические ТС (Vehículos a motor)",
              "description": "Имеют двигатель для передвижения. Сюда относятся автомобили (легковые, мотоциклы, грузовики, автобусы) и спецтехника (сельскохозяйственные тракторы, дорожные машины)."
            },
            {
              "icon": "🚲",
              "title": "Немеханические ТС (Vehículos sin motor)",
              "description": "Все устройства, не входящие в категорию механических. Сюда относятся ТС, которые физически ИМЕЮТ мотор, но закон прямо исключает их из этой категории!"
            }
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Критически важно для экзамена!",
          "text": "Следующие ТС **НЕ считаются механическими (vehículos a motor)**, несмотря на наличие двигателя:\n1. **Мопеды (Ciclomotores)** (двигатель ≤ 50 куб.см, скорость ≤ 45 км/ч).\n2. **Средства индивидуальной мобильности (VMP)**, такие как электросамокаты (скорость от 6 до 25 км/ч).\n3. **Велосипеды с электроприводом (EPAC)**.\n4. **Трамваи (Tranvías)**.\n5. **Транспортные средства для лиц с ограниченной подвижностью** (инвалидные коляски с мотором)."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена!",
          "text": "Если вас спросят: «Является ли мопед механическим транспортным средством?», правильный ответ — **НЕТ**. Это самая частая уловка DGT."
        }
      ]
    }'
  );

  -- Step 2: Quiz - Ciclomotor motor classification
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 2, 'quiz',
    '{"question_id": "dcc37662-f0f8-42a6-adf8-deb583fcb627", "explanation": "Aunque los ciclomotores tienen un motor (hasta 50 cc), por ley están expresamente excluidos de la definición de vehículos a motor debido a su velocidad y potencia reducidas."}',
    '{"question_id": "dcc37662-f0f8-42a6-adf8-deb583fcb627", "explanation": "Хотя мопеды оснащены двигателем (объемом до 50 куб.см), закон прямо исключает их из определения механических транспортных средств из-за их ограниченной скорости и мощности."}'
  );

  -- Step 3: Theory - Conductor definitions and special categories
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 3, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "2. El Conductor"
        },
        {
          "type": "text",
          "text": "Legalmente, **Conductor** es la persona que maneja el mecanismo de dirección o va al mando de un vehículo. Sin embargo, existen tres casos especiales con reglas muy específicas para el examen:"
        },
        {
          "type": "list",
          "style": "arrow",
          "title": "Casos especiales de conductor",
          "items": [
            "**Conductores de animales**: La persona que guía cabezas de ganado o un animal de montura se considera conductor. Debe ser mayor de 18 años y capaz de controlarlos.",
            "**Aprendizaje de conducción (Autoescuela)**: En las clases prácticas de conducir, el conductor oficial es el **profesor** (que va a cargo de los mandos adicionales/pedales), NO el alumno.",
            "**Peatón vs. Conductor**: Si vas montado en bicicleta o ciclomotor, eres conductor. Pero si te bajas y lo empujas a pie, pasas a ser peatón."
          ]
        },
        {
          "type": "table",
          "headers": [
            "Situación",
            "Rol legal",
            "Norma de circulación"
          ],
          "rows": [
            [
              "Montado en bici o ciclomotor",
              "Conductor",
              "Por la calzada o arcén"
            ],
            [
              "Empujando bici o ciclomotor a pie",
              "Peatón",
              "Obligatorio por la DERECHA (sentido de la marcha)"
            ],
            [
              "Arrastrando motocicleta a pie",
              "Conductor",
              "Obligatorio por la DERECHA"
            ]
          ],
          "caption": "Diferencia crítica: empujar un ciclomotor o bicicleta te convierte en peatón, pero debes circular por la derecha, no por la izquierda."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "Si empujas un ciclomotor a pie por una carretera convencional, no debes ir por la izquierda como el resto de peatones, sino **por tu derecha** para no interferir con la seguridad."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "2. Определение Водителя (Conductor)"
        },
        {
          "type": "text",
          "text": "Юридически **Водитель** — это лицо, управляющее механизмом руления или находящееся у руля ТС. Однако на экзамене DGT часто спрашивают три особые категории лиц:"
        },
        {
          "type": "list",
          "style": "arrow",
          "title": "Особые категории водителей",
          "items": [
            "**Погонщики животных**: Лицо, под чьим надзором находится скот или верховое животное (всадник), официально считается водителем. Он должен быть старше 18 лет и способным контролировать животных.",
            "**Ученики и учителя автошкол**: При обучении вождению водителем считается **инструктор** (отвечающий за дублирующие педали), а НЕ ученик. Ученик не несет ответственности за нарушения.",
            "**Пешеходы-водители**: Если вы едете на велосипеде или мопеде — вы водитель. Если вы спешились и катите его пешком — вы пешеход, но с особыми правилами движения."
          ]
        },
        {
          "type": "table",
          "headers": [
            "Ситуация",
            "Юридическая роль",
            "Правило движения"
          ],
          "rows": [
            [
              "Езда верхом на велосипеде / мопеде",
              "Водитель",
              "По проезжей части / обочине"
            ],
            [
              "Толкание велосипеда / мопеда пешком",
              "Пешеход",
              "Обязательно по ПРАВОЙ стороне (по ходу движения)"
            ],
            [
              "Качение мотоцикла пешком",
              "Водитель",
              "Обязательно по ПРАВОЙ стороне"
            ]
          ],
          "caption": "Критическое различие: катить мопед или велосипед пешком делает вас пешеходом, но вы обязаны двигаться по правой стороне, а не по левой."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Ловушка экзамена!",
          "text": "Обычный пешеход за городом идет по левой стороне дороги (навстречу потоку). Но пешеход, толкающий велосипед или мопед, обязан двигаться **по правой стороне** (попутно потоку)!"
        }
      ]
    }'
  );

  -- Step 4: Quiz - Autoescuela conductor
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 4, 'quiz',
    '{
      "text": "En un vehículo de autoescuela, durante el aprendizaje de la conducción en vías públicas, ¿quién se considera conductor?",
      "options": [
        "El alumno que maneja el volante.",
        "El profesor que va a cargo de los mandos adicionales.",
        "Ambos conjuntamente."
      ],
      "correct": 1,
      "explanation": "El Reglamento General de Circulación determina que el conductor es la persona a cargo de los mandos adicionales (el profesor de formación vial), siendo el responsable de la seguridad y de las infracciones cometidas."
    }',
    '{
      "text": "Кто считается водителем учебного автомобиля во время практического вождения на дорогах общего пользования?",
      "options": [
        "Ученик, который управляет рулевым колесом.",
        "Инструктор, который контролирует дублирующие педали.",
        "Оба совместно."
      ],
      "correct": 1,
      "explanation": "Общий регламент дорожного движения определяет, что водителем считается лицо, контролирующее дублирующие педали управления (инструктор автошколы). Он несет ответственность за безопасность и совершенные нарушения."
    }'
  );

  -- Step 5: Quiz - Ciclomotor empujar
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 5, 'quiz',
    '{"question_id": "fd433a7b-1050-477a-aecc-0205e4ac9918", "explanation": "Las personas que empujen un ciclomotor o bicicleta por el arcén están obligadas a circular por la derecha en el sentido de la marcha, para evitar conflictos de seguridad con otros usuarios."}',
    '{"question_id": "fd433a7b-1050-477a-aecc-0205e4ac9918", "explanation": "Лицы, толкающие мопед или велосипед по обочине, обязаны двигаться по правой стороне по ходу движения, чтобы избежать опасных ситуаций с другими участниками движения."}'
  );

  -- Step 6: Theory - Titular vs Conductor & Responsibility
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 6, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "3. Titular del vehículo y Responsabilidad"
        },
        {
          "type": "text",
          "text": "Es vital distinguir entre la persona que tiene el vehículo registrado a su nombre y la persona que realmente está conduciendo:"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "👤",
              "title": "Titular (Propietario)",
              "description": "Persona a cuyo nombre está inscrito el vehículo en el Registro de Tráfico (DGT)."
            },
            {
              "icon": "🪪",
              "title": "Conductor habitual",
              "description": "Conductor que, con el consentimiento del propietario, utiliza el vehículo de manera continuada y está inscrito en el Registro."
            }
          ]
        },
        {
          "type": "list",
          "style": "check",
          "title": "Responsabilidades del Titular",
          "items": [
            "Mantener el vehículo en perfectas condiciones de seguridad (ITV pasada).",
            "Tener contratado el Seguro Obligatorio (SOA) en vigor.",
            "**Identificar al conductor**: En caso de infracción captada por radar (por ejemplo, exceso de velocidad), el titular tiene la obligación de identificar al conductor responsable ante la DGT."
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "¡Sanción muy grave!",
          "text": "Si el propietario del vehículo no identifica al conductor real cuando sea requerido, cometerá una infracción muy grave, lo que supone una multa económica que duplica o triplica el importe de la infracción original."
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Distribución de las multas",
          "text": "• Las infracciones de **circulación** (velocidad, semáforos, alcohol) son responsabilidad exclusiva del **conductor**.\n• Las infracciones de **documentación o estado del vehículo** (ITV caducada, falta de seguro) son responsabilidad del **titular**."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "3. Владелец ТС и Распределение ответственности"
        },
        {
          "type": "text",
          "text": "На дорогах важно различать того, на кого машина зарегистрирована, и того, кто находится за рулем в данный момент:"
        },
        {
          "type": "card-grid",
          "cols": 2,
          "cards": [
            {
              "icon": "👤",
              "title": "Собственник (Titular)",
              "description": "Лицо, на чье имя транспортное средство зарегистрировано в Реестре дорожной полиции (DGT)."
            },
            {
              "icon": "🪪",
              "title": "Основной водитель (Conductor habitual)",
              "description": "Лицо, которое с согласия собственника управляет машиной чаще всего и внесено в соответствующий Реестр."
            }
          ]
        },
        {
          "type": "list",
          "style": "check",
          "title": "Обязанности собственника (Titular)",
          "items": [
            "Поддержание автомобиля в безопасном состоянии (пройденный техосмотр ITV).",
            "Наличие действующей обязательной страховки (Seguro Obligatorio).",
            "**Идентификация водителя**: Если нарушение зафиксировано автоматически (например, радаром скорости), владелец обязан сообщить данные водителя, совершившего нарушение."
          ]
        },
        {
          "type": "callout",
          "variant": "danger",
          "title": "Очень серьезное нарушение!",
          "text": "Отказ владельца идентифицировать водителя по запросу дорожной полиции классифицируется как **очень серьезное нарушение** (infracción muy grave). Штраф за это в 2-3 раза превышает сумму первоначального штрафа!"
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Кто платит штраф?",
          "text": "• Нарушения **правил движения** (скорость, проезд на красный, алкоголь) — отвечает **водитель**.\n• Нарушения **правил эксплуатации и документов** (просроченный ITV, отсутствие страховки) — отвечает **собственник (titular)**."
        }
      ]
    }'
  );

  -- Step 7: Quiz - Responsibility during driving
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 7, 'quiz',
    '{"question_id": "692e7d31-cf89-4f41-8935-52bdeaf4f17a", "explanation": "El conductor del vehículo en el momento de la infracción es el único responsable de los hechos relacionados con la conducción (como exceso de velocidad o no respetar las señales)."}',
    '{"question_id": "692e7d31-cf89-4f41-8935-52bdeaf4f17a", "explanation": "Водитель транспортного средства в момент совершения нарушения несет единоличную ответственность за действия, связанные с вождением (такие как превышение скорости или игнорирование знаков)."}'
  );

  -- Step 8: Quiz - ITV / documentation responsibility
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 8, 'quiz',
    '{"question_id": "77291bbf-6d02-44bd-b895-1ea6d3afe0e3", "explanation": "Las infracciones relativas a la documentación (como no pasar la ITV) y el mantenimiento del vehículo corresponden legalmente al titular del vehículo, no al conductor."}',
    '{"question_id": "77291bbf-6d02-44bd-b895-1ea6d3afe0e3", "explanation": "Нарушения, связанные с документами (например, отсутствие техосмотра ITV) и техническим состоянием транспортного средства, юридически лежат на собственнике (titular), а не на водителе."}'
  );

END $$;
