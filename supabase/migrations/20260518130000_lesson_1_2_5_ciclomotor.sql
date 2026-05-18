-- Module 1 · Lesson 1.2.5 — Ciclomotor y motocicleta (sections 1.2.5–1.2.7)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 3: DGT e03cae0d (ciclomotor ≤50 cc)
-- Quiz Step 4: DGT 802ec3f9 (motocicleta >50 cc O >45 km/h)
-- Quiz Step 5: DGT a69fa121 (motocicleta = automóvil → Sí)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.5',
     'Ciclomotor y motocicleta',
     'Мопед и мотоцикл',
     8, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Tabla comparativa ciclomotor vs motocicleta ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "La distinción clave del examen",
          "text": "Ciclomotor y motocicleta parecen similares, pero la ley los trata de forma muy diferente: uno es vehículo SIN MOTOR legalmente y el otro es un automóvil. Esta distinción aparece con frecuencia en las preguntas DGT."
        },
        {
          "type": "table",
          "headers": ["", "Ciclomotor", "Motocicleta"],
          "rows": [
            ["Cilindrada", "≤ 50 cc", "> 50 cc"],
            ["Velocidad máx.", "≤ 45 km/h", "> 45 km/h"],
            ["Matrícula", "Amarilla", "Blanca"],
            ["Categoría legal", "Sin motor (L1e-L2e)", "Automóvil (L3e-L5e)"],
            ["Ruedas", "2, 3 o 4 ruedas", "2 ruedas (o con sidecar)"]
          ],
          "caption": "El ciclomotor debe cumplir AMBAS condiciones (≤50 cc Y ≤45 km/h). La motocicleta supera AL MENOS UNA."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "¡Ojo al examen!",
          "text": "El ciclomotor está considerado como vehículo SIN MOTOR aunque tiene motor. La motocicleta SÍ es un automóvil. Esta clasificación legal es la trampa más frecuente en el examen DGT."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "callout",
          "variant": "info",
          "title": "Ключевое различие на экзамене",
          "text": "Мопед и мотоцикл кажутся похожими, но закон относится к ним совершенно по-разному: один считается ТС БЕЗ МОТОРА юридически, другой — автомобилем. Это различие часто встречается в вопросах DGT."
        },
        {
          "type": "table",
          "headers": ["", "Мопед", "Мотоцикл"],
          "rows": [
            ["Объём двигателя", "≤ 50 куб.см", "> 50 куб.см"],
            ["Макс. скорость", "≤ 45 км/ч", "> 45 км/ч"],
            ["Номерной знак", "Жёлтый", "Белый"],
            ["Юридический статус", "Немоторное ТС (L1e-L2e)", "Автомобиль (L3e-L5e)"],
            ["Колёса", "2, 3 или 4", "2 (или с коляской)"]
          ],
          "caption": "Мопед должен соответствовать ОБОИМ условиям (≤50 куб.см И ≤45 км/ч). Мотоцикл превышает ХОТЯ БЫ ОДНО."
        },
        {
          "type": "callout",
          "variant": "warning",
          "title": "Важно для экзамена!",
          "text": "Мопед считается ТС БЕЗ МОТОРА, хотя двигатель у него есть. Мотоцикл — это автомобиль. Эта юридическая классификация — самая частая ловушка на экзамене DGT."
        }
      ]
    }'
  );

  -- ── Step 2 · Tipos de ciclomotores y motocicletas ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Tipos de ciclomotores"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "🛵 Ciclomotor (L1e) — 2 ruedas, ≤50 cc, ≤45 km/h, matrícula amarilla",
            "🚗 Cuadriciclo ligero (L6e) — 4 ruedas como ciclomotor: tara < 350 kg, ≤50 cc, ≤45 km/h",
            "⚡ Ciclo de motor — pedaleo asistido, ≤25 km/h, ≤1000 W (requiere matrícula amarilla)"
          ]
        },
        {
          "type": "heading",
          "text": "Tipos de motocicletas"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "🏍️ Motocicleta 2 ruedas (L3e) — >50 cc O >45 km/h, matrícula blanca, automóvil",
            "🏍️ Motocicleta con sidecar (L4e) — 2 ruedas + habitáculo lateral",
            "🏍️ Triciclo de motor (L5e) — 3 ruedas simétricas"
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Truco de memoria — la matrícula lo dice todo",
          "text": "🟡 Matrícula AMARILLA = ciclomotor (sin motor legalmente, ≤50 cc, ≤45 km/h). Matrícula BLANCA = motocicleta (automóvil, >50 cc O >45 km/h). En el examen: amarillo = sin motor."
        }
      ]
    }',
    '{
      "blocks": [
        {
          "type": "heading",
          "text": "Виды мопедов"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "🛵 Мопед (L1e) — 2 колеса, ≤50 куб.см, ≤45 км/ч, жёлтый номер",
            "🚗 Лёгкий квадрицикл (L6e) — 4 колеса как мопед: снар. масса < 350 кг, ≤50 куб.см, ≤45 км/ч",
            "⚡ Моторизованный велосипед — педальный с мотором, ≤25 км/ч, ≤1000 Вт (нужен жёлтый номер)"
          ]
        },
        {
          "type": "heading",
          "text": "Виды мотоциклов"
        },
        {
          "type": "list",
          "style": "arrow",
          "items": [
            "🏍️ Мотоцикл с 2 колёсами (L3e) — >50 куб.см ИЛИ >45 км/ч, белый номер, автомобиль",
            "🏍️ Мотоцикл с коляской (L4e) — 2 колеса + боковой кузов",
            "🏍️ Трицикл с мотором (L5e) — 3 симметричных колеса"
          ]
        },
        {
          "type": "callout",
          "variant": "tip",
          "title": "Мнемоника — номерной знак говорит всё",
          "text": "🟡 ЖЁЛТЫЙ знак = мопед (юридически без мотора, ≤50 куб.см, ≤45 км/ч). БЕЛЫЙ знак = мотоцикл (автомобиль, >50 куб.см ИЛИ >45 км/ч). На экзамене: жёлтый = немоторное ТС."
        }
      ]
    }'
  );

  -- ── Step 3 · Quiz — ciclomotor ≤50 cc (DGT e03cae0d) ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{
      "text": "Un ciclomotor es un vehículo de dos o más ruedas con una velocidad máxima no superior a 45 kilómetros por hora y un motor de combustión interna de cilindrada...",
      "options": ["superior a 50 centímetros cúbicos.", "no superior a 50 centímetros cúbicos.", "superior a 50 e inferior a 125 centímetros cúbicos."],
      "correct": 1,
      "explanation": "El ciclomotor debe cumplir AMBAS condiciones: velocidad máxima ≤45 km/h Y cilindrada ≤50 cc. Si el vehículo supera cualquiera de estos dos límites, pasa a ser motocicleta. Recuerda: el ciclomotor es legalmente un vehículo SIN MOTOR aunque tenga motor."
    }',
    '{
      "text": "Мопед — это ТС с 2+ колёсами, максимальная скорость которого не превышает 45 км/ч, и двигателем внутреннего сгорания с объёмом цилиндра...",
      "options": ["более 50 куб.см.", "не более 50 куб.см.", "более 50 и менее 125 куб.см."],
      "correct": 1,
      "explanation": "Мопед должен соответствовать ОБОИМ условиям: максимальная скорость ≤45 км/ч И объём ≤50 куб.см. Если ТС превышает хотя бы один из этих лимитов — это уже мотоцикл. Помни: мопед юридически считается ТС БЕЗ МОТОРА, несмотря на наличие двигателя."
    }'
  );

  -- ── Step 4 · Quiz — motocicleta >50 cc O >45 km/h (DGT 802ec3f9) ────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{
      "text": "Se define como motocicleta al automóvil...",
      "options": ["de dos o tres ruedas con una cilindrada inferior a 50 centímetros cúbicos.", "de dos ruedas con un motor de cilindrada superior a 50 centímetros cúbicos, y/o con una velocidad máxima superior a 45 km/h.", "con una cilindrada superior a 125 centímetros cúbicos."],
      "correct": 1,
      "explanation": "La motocicleta es un automóvil de 2 ruedas con cilindrada >50 cc Y/O velocidad máxima >45 km/h. Basta con superar UNO de los dos límites para ser motocicleta. Se clasifica como automóvil (vehículo de motor), a diferencia del ciclomotor que es vehículo sin motor."
    }',
    '{
      "text": "Мотоциклом называют автомобиль...",
      "options": ["с 2-3 колёсами и объёмом двигателя менее 50 куб.см.", "с 2 колёсами и двигателем более 50 куб.см и/или максимальной скоростью более 45 км/ч.", "с объёмом двигателя более 125 куб.см."],
      "correct": 1,
      "explanation": "Мотоцикл — автомобиль с 2 колёсами, у которого объём >50 куб.см И/ИЛИ максимальная скорость >45 км/ч. Достаточно превысить ОДИН из двух лимитов. В отличие от мопеда, мотоцикл — это автомобиль (моторное ТС)."
    }'
  );

  -- ── Step 5 · Quiz — motocicleta es automóvil (DGT a69fa121) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{
      "text": "¿Una motocicleta, se considera un automóvil?",
      "options": ["Sí.", "Sí, si es de más de 125cc.", "Sí, porque es un vehículo que se mueve por sí mismo."],
      "correct": 0,
      "explanation": "Sí, la motocicleta está clasificada como automóvil según el Reglamento General de Vehículos (L3e, L4e, L5e). Esta clasificación no depende de la cilindrada. En cambio, el ciclomotor (L1e, L2e) es vehículo SIN MOTOR aunque tenga motor."
    }',
    '{
      "text": "Считается ли мотоцикл автомобилем?",
      "options": ["Да.", "Да, если объём более 125 куб.см.", "Да, потому что это самоходное ТС."],
      "correct": 0,
      "explanation": "Да, мотоцикл классифицируется как автомобиль согласно Регламенту (L3e, L4e, L5e). Это не зависит от объёма двигателя. А вот мопед (L1e, L2e) считается ТС БЕЗ мотора, хотя двигатель у него есть."
    }'
  );

END $$;
