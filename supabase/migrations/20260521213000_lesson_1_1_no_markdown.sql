-- Migration: Lesson 1.1 - No markdown in text fields (plain text only)
-- Path: supabase/migrations/20260521213000_lesson_1_1_no_markdown.sql

DO $$
DECLARE
  l1_id UUID := '23827d2b-8efb-409f-9759-1b6004589f23';
BEGIN

  -- ── Step 1 · Theory: Vehículo — классификация ─────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 1, 'theory',
    '{"blocks": [
      {"type": "heading", "text": "1. El Vehículo"},
      {"type": "callout", "variant": "info", "title": "Definición legal", "text": "Vehículo: todo aparato apto para circular por las vías o terrenos de uso común, ya sean públicos o privados."},
      {"type": "card-grid", "cols": 2, "cards": [
        {"icon": "🚗", "title": "Vehículos a motor", "description": "Tienen motor para su propulsión. Incluye automóviles, motos, camiones, autobuses y vehículos especiales."},
        {"icon": "🚲", "title": "Vehículos sin motor", "description": "No son vehículos a motor según la ley. ¡Incluye algunos que SÍ tienen motor, como los ciclomotores!"}
      ]},
      {"type": "list", "style": "cross", "title": "NO son vehículos a motor (aunque tengan motor)", "items": [
        "Ciclomotores (motor ≤ 50 cc, velocidad ≤ 45 km/h)",
        "Vehículos de Movilidad Personal (VMP) — patinetes eléctricos",
        "Bicicletas de pedaleo asistido (EPAC)",
        "Tranvías",
        "Vehículos para personas de movilidad reducida"
      ]},
      {"type": "callout", "variant": "warning", "title": "¡Ojo al examen!", "text": "Si te preguntan: «¿Es un ciclomotor un vehículo a motor?» — la respuesta es NO. Es la trampa más habitual de la DGT en este tema."}
    ]}',
    '{"blocks": [
      {"type": "heading", "text": "1. Транспортное средство (Vehículo)"},
      {"type": "callout", "variant": "info", "title": "Юридическое определение", "text": "Транспортное средство: любое устройство, пригодное для движения по дорогам или территориям общего пользования — как публичным, так и частным."},
      {"type": "card-grid", "cols": 2, "cards": [
        {"icon": "🚗", "title": "Механические ТС (Vehículos a motor)", "description": "Имеют двигатель для передвижения. Легковые, мотоциклы, грузовики, автобусы, спецтехника."},
        {"icon": "🚲", "title": "Немеханические ТС", "description": "Не входят в категорию механических по закону. Сюда относятся и некоторые ТС с двигателем — например, мопеды!"}
      ]},
      {"type": "list", "style": "cross", "title": "НЕ являются механическими ТС (даже с двигателем)", "items": [
        "Мопеды (двигатель ≤ 50 куб.см, скорость ≤ 45 км/ч)",
        "Средства индивидуальной мобильности (VMP) — электросамокаты",
        "Велосипеды с электроприводом (EPAC)",
        "Трамваи",
        "Транспортные средства для лиц с ограниченной подвижностью"
      ]},
      {"type": "callout", "variant": "warning", "title": "Ловушка экзамена!", "text": "Если спросят: «Является ли мопед механическим транспортным средством?» — правильный ответ НЕТ. Самая частая уловка DGT по этой теме."}
    ]}'
  );

  -- ── Step 2 · Quiz: ¿Es el ciclomotor un vehículo a motor? ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 2, 'quiz',
    '{"question_id": "dcc37662-f0f8-42a6-adf8-deb583fcb627", "explanation": "Aunque los ciclomotores tienen un motor (hasta 50 cc), están expresamente excluidos de la definición legal de vehículo a motor. El reglamento los clasifica como vehículos sin motor por su baja potencia y velocidad."}',
    '{"question_id": "dcc37662-f0f8-42a6-adf8-deb583fcb627", "explanation": "Хотя мопеды оснащены двигателем (до 50 куб.см), закон прямо исключает их из категории механических ТС. Из-за малой мощности и ограниченной скорости регламент относит их к немеханическим транспортным средствам."}'
  );

  -- ── Step 3 · Theory: Conductor — кто является водителем ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 3, 'theory',
    '{"blocks": [
      {"type": "heading", "text": "2. El Conductor"},
      {"type": "callout", "variant": "info", "title": "Definición legal", "text": "Conductor: persona que maneja el mecanismo de dirección o va al mando de un vehículo, o a cuyo cargo está uno o varios animales."},
      {"type": "list", "style": "check", "title": "Se consideran conductores", "items": [
        "Jinetes y personas que guían animales de tiro por la vía (mayores de 18 años)",
        "En autoescuela: el PROFESOR (que tiene los mandos adicionales), no el alumno",
        "Quien arrastra una motocicleta caminando a su lado"
      ]},
      {"type": "table",
       "headers": ["Situación", "Rol legal", "Por dónde circula"],
       "rows": [
         ["Montado en bici o ciclomotor", "Conductor", "Por la calzada"],
         ["Empujando bici o ciclomotor a pie", "Peatón", "Por la DERECHA (sentido de la marcha)"],
         ["Arrastrando motocicleta a pie", "Conductor", "Por la DERECHA"]
       ],
       "caption": "Empujar un ciclomotor o bicicleta te convierte en peatón — pero debes circular por la derecha, igual que el tráfico."},
      {"type": "callout", "variant": "danger", "title": "¡Sale en el examen!", "text": "La diferencia entre empujar y arrastrar: empujar una bici = peatón. Arrastrar (conducir a pie) una moto = conductor. Y en ambos casos se circula POR LA DERECHA."}
    ]}',
    '{"blocks": [
      {"type": "heading", "text": "2. Водитель (Conductor)"},
      {"type": "callout", "variant": "info", "title": "Юридическое определение", "text": "Водитель: лицо, управляющее механизмом руления транспортного средства, находящееся у руля, либо ответственное за одно или несколько животных."},
      {"type": "list", "style": "check", "title": "Считаются водителями", "items": [
        "Всадники и погонщики животных на дороге (от 18 лет)",
        "В автошколе: ИНСТРУКТОР (с дублирующими педалями), но не ученик",
        "Лицо, ведущее мотоцикл рядом с собой пешком"
      ]},
      {"type": "table",
       "headers": ["Ситуация", "Юридическая роль", "Сторона движения"],
       "rows": [
         ["Едете верхом на велосипеде/мопеде", "Водитель", "По проезжей части"],
         ["Толкаете велосипед/мопед пешком", "Пешеход", "По ПРАВОЙ стороне (попутно)"],
         ["Ведёте мотоцикл пешком рядом", "Водитель", "По ПРАВОЙ стороне"]
       ],
       "caption": "Когда вы катите велосипед или мопед — вы пешеход, но двигаетесь по правой стороне, как транспорт."},
      {"type": "callout", "variant": "danger", "title": "Часто встречается на экзамене!", "text": "Разница между «толкать» и «вести рядом»: толкать велосипед = пешеход. Вести мотоцикл рядом = водитель. В обоих случаях нужно двигаться ПО ПРАВОЙ стороне."}
    ]}'
  );

  -- ── Step 4 · Quiz: ¿Quién es conductor en autoescuela? ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 4, 'quiz',
    '{"text": "En un vehículo de autoescuela, durante las prácticas de conducción en vías públicas, ¿quién se considera conductor?",
      "options": [
        "El alumno que maneja el volante.",
        "El profesor que controla los mandos adicionales.",
        "Ambos son considerados conductores conjuntamente."
      ],
      "correct": 1,
      "explanation": "En los vehículos de autoescuela el conductor es siempre el profesor: es quien está a cargo de los mandos adicionales y el responsable legal de las infracciones cometidas."}',
    '{"text": "В учебном автомобиле во время практических занятий на дорогах общего пользования — кто считается водителем?",
      "options": [
        "Ученик, который управляет рулевым колесом.",
        "Инструктор, контролирующий дублирующие педали.",
        "Оба считаются водителями совместно."
      ],
      "correct": 1,
      "explanation": "В учебном автомобиле водителем всегда считается инструктор: он отвечает за дублирующие педали и несет юридическую ответственность за совершенные нарушения."}'
  );

  -- ── Step 5 · Quiz: empujar ciclomotor — ¿por qué lado? ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 5, 'quiz',
    '{"question_id": "fd433a7b-1050-477a-aecc-0205e4ac9918", "explanation": "Aunque empujar un ciclomotor convierte al usuario en peatón, la norma específica que debe circular por la derecha (sentido de la marcha), no por la izquierda como los peatones normales. Esto es para no interferir con la seguridad vial."}',
    '{"question_id": "fd433a7b-1050-477a-aecc-0205e4ac9918", "explanation": "Хотя человек, толкающий мопед, юридически является пешеходом, правило обязывает его двигаться по правой стороне (по ходу движения), а не по левой, как обычных пешеходов. Это сделано для безопасности на дороге."}'
  );

  -- ── Step 6 · Theory: Titular — владелец и ответственность ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 6, 'theory',
    '{"blocks": [
      {"type": "heading", "text": "3. Titular del Vehículo y Responsabilidad"},
      {"type": "card-grid", "cols": 2, "cards": [
        {"icon": "📋", "title": "Titular (Propietario)", "description": "Persona a cuyo nombre está inscrito el vehículo en el Registro de Tráfico de la DGT."},
        {"icon": "🪪", "title": "Conductor habitual", "description": "Conductor que, con consentimiento del propietario, usa el vehículo de forma continuada y está inscrito en el Registro."}
      ]},
      {"type": "list", "style": "check", "title": "Responsabilidades del Titular", "items": [
        "Mantener el vehículo en condiciones de seguridad (ITV en vigor)",
        "Tener contratado el Seguro Obligatorio vigente",
        "Identificar al conductor responsable cuando la DGT lo requiera (por ejemplo, en infracciones de radar)"
      ]},
      {"type": "callout", "variant": "info", "title": "¿Quién paga la multa?", "text": "Infracciones de circulación (velocidad, semáforo, alcohol) → responsabilidad del CONDUCTOR. Infracciones de documentación o estado del vehículo (ITV caducada, sin seguro) → responsabilidad del TITULAR."},
      {"type": "callout", "variant": "danger", "title": "¡Infracción muy grave!", "text": "Si el titular no identifica al conductor cuando la DGT lo exige, comete una infracción MUY GRAVE. La multa duplica o triplica el importe de la infracción original."}
    ]}',
    '{"blocks": [
      {"type": "heading", "text": "3. Собственник ТС и Ответственность"},
      {"type": "card-grid", "cols": 2, "cards": [
        {"icon": "📋", "title": "Собственник (Titular)", "description": "Лицо, на чьё имя транспортное средство зарегистрировано в Реестре DGT."},
        {"icon": "🪪", "title": "Основной водитель", "description": "Водитель, который с согласия собственника систематически использует ТС и внесён в соответствующий Реестр."}
      ]},
      {"type": "list", "style": "check", "title": "Обязанности собственника (Titular)", "items": [
        "Поддерживать ТС в технически исправном состоянии (действующий техосмотр ITV)",
        "Иметь действующий полис обязательного страхования",
        "Назвать DGT имя водителя-нарушителя при запросе (например, при фиксации нарушения радаром)"
      ]},
      {"type": "callout", "variant": "info", "title": "Кто платит штраф?", "text": "Нарушения правил движения (скорость, светофор, алкоголь) → ответственность ВОДИТЕЛЯ. Нарушения по документам или состоянию ТС (просроченный ITV, нет страховки) → ответственность СОБСТВЕННИКА."},
      {"type": "callout", "variant": "danger", "title": "Очень серьезное нарушение!", "text": "Если собственник отказывается назвать водителя по требованию DGT — это ОЧЕНЬ СЕРЬЁЗНОЕ нарушение. Штраф в 2-3 раза превышает сумму первоначального нарушения!"}
    ]}'
  );

  -- ── Step 7 · Quiz: ¿Quién es responsable de las infracciones de circulación? ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 7, 'quiz',
    '{"question_id": "692e7d31-cf89-4f41-8935-52bdeaf4f17a", "explanation": "Las infracciones cometidas al volante (exceso de velocidad, saltarse un semáforo, etc.) son responsabilidad exclusiva del conductor en ese momento, no del propietario del vehículo."}',
    '{"question_id": "692e7d31-cf89-4f41-8935-52bdeaf4f17a", "explanation": "Нарушения, совершённые за рулём (превышение скорости, проезд на красный и т.д.), — исключительная ответственность водителя на момент нарушения, а не владельца автомобиля."}'
  );

  -- ── Step 8 · Quiz: ¿Quién responde por el estado y documentación? ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l1_id, 8, 'quiz',
    '{"question_id": "77291bbf-6d02-44bd-b895-1ea6d3afe0e3", "explanation": "Las infracciones relacionadas con la documentación (ITV, seguro) y el mantenimiento del vehículo son responsabilidad del titular, ya que es él quien tiene la obligación legal de mantenerlas al día."}',
    '{"question_id": "77291bbf-6d02-44bd-b895-1ea6d3afe0e3", "explanation": "Нарушения, связанные с документами (техосмотр ITV, страховка) и техническим состоянием ТС, — ответственность собственника (titular). Именно он обязан по закону поддерживать всё это в порядке."}'
  );

END $$;
