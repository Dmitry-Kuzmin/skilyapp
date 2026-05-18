-- Lección 1.4.3 — Circulación en autopista o autovía dentro de poblado
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4: DGT 1575be20 (autopista zona urbana → 80 km/h → idx 2)
-- Quiz Step 5: DGT 0d25f708 (carril izquierdo sin adelantar → No → idx 1)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.4.3',
     'Autopista y autovía dentro de poblado',
     'Автострада и скоростная дорога в населённом пункте',
     26, 20, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Velocidad 80 km/h dentro de poblado ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Autopista/autovía dentro de poblado: 80 km/h","text":"Cuando una autopista o autovía transcurre dentro de un núcleo urbano (zona urbana), la velocidad máxima queda limitada a 80 km/h. Este límite se aplica aunque no exista señal específica que lo indique."},
      {"type":"table","headers":["Tipo de vía","Fuera de poblado","Dentro de poblado"],"rows":[
        ["Autopista / Autovía","120 km/h","80 km/h"],
        ["Carretera convencional","90 km/h","50 km/h (vía urbana)"]
      ]},
      {"type":"callout","variant":"warning","text":"Dato clave de examen: aunque la autopista tenga un límite genérico de 120 km/h, cuando pasa por zona urbana ese límite baja a 80 km/h. No a 50 ni a 100 — siempre 80."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Автострада/скоростная дорога в населённом пункте: 80 км/ч","text":"Когда автострада или скоростная дорога проходит через городскую зону, максимальная скорость ограничивается 80 км/ч. Этот лимит применяется, даже если нет специального знака."},
      {"type":"table","headers":["Тип дороги","Вне населённого пункта","В населённом пункте"],"rows":[
        ["Автострада / Скоростная дорога","120 км/ч","80 км/ч"],
        ["Обычная дорога","90 км/ч","50 км/ч (городская дорога)"]
      ]},
      {"type":"callout","variant":"warning","text":"Ключевой факт для экзамена: хотя общий лимит для автострады — 120 км/ч, при прохождении через городскую зону он снижается до 80 км/ч. Не до 50 и не до 100 — всегда 80."}
    ]}'
  );

  -- ── Step 2 · Theory — Normas de circulación por carril ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Norma de carril: igual que fuera de poblado","text":"Aunque la autopista o autovía discurra dentro de poblado, se siguen aplicando las mismas reglas de circulación por carril que fuera de él. El conductor NO puede circular por el carril que más convenga a su destino."},
      {"type":"list","style":"check","title":"Reglas de carril en autopista/autovía (también dentro de poblado)","items":[
        "Circular siempre por el CARRIL DE LA DERECHA como norma general",
        "Los carriles de la izquierda se utilizan SOLO para adelantar",
        "Tras adelantar, incorporarse de nuevo al carril de la derecha",
        "El carril de la derecha es obligatorio aunque el vehículo vaya a girar a la izquierda (no hay giros a izquierda en autopista/autovía)"
      ]},
      {"type":"callout","variant":"danger","text":"Un error común: en vía urbana normal puedes circular por el carril que más convenga a tu destino. En autopista/autovía (aunque sea dentro de poblado), eso está PROHIBIDO. Siempre carril derecho salvo que adelantes."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Правило полосы: то же, что и вне населённого пункта","text":"Даже когда автострада или скоростная дорога проходит через населённый пункт, продолжают действовать те же правила движения по полосам. Водитель НЕ может ехать по полосе, удобной для его маршрута."},
      {"type":"list","style":"check","title":"Правила полос на автостраде/скор. дороге (в т.ч. в населённом пункте)","items":[
        "Как правило, всегда ехать по ПРАВОЙ ПОЛОСЕ",
        "Левые полосы используются ТОЛЬКО для обгона",
        "После обгона возвращаться на правую полосу",
        "Правая полоса обязательна, даже если водитель поворачивает налево (поворотов налево на автостраде/скор. дороге нет)"
      ]},
      {"type":"callout","variant":"danger","text":"Распространённая ошибка: на обычной городской дороге можно ехать по полосе, удобной для маршрута. На автостраде/скоростной дороге (даже внутри населённого пункта) это ЗАПРЕЩЕНО. Всегда правая полоса, кроме обгона."}
    ]}'
  );

  -- ── Step 3 · Theory — Resumen: autopista dentro de poblado ───────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Resumen: autopista/autovía dentro de poblado"},
      {"type":"list","style":"check","title":"Qué CAMBIA al entrar en zona urbana","items":[
        "Velocidad máxima: de 120 km/h → 80 km/h"
      ]},
      {"type":"list","style":"cross","title":"Qué NO CAMBIA (sigue igual que fuera)","items":[
        "Obligación de circular por el carril de la derecha",
        "Los demás carriles son solo para adelantar",
        "Prohibición de peatones, ciclistas, ciclomotores, etc.",
        "No hay intersecciones a nivel ni semáforos",
        "Sigue habiendo mediana separando los sentidos"
      ]},
      {"type":"callout","variant":"warning","text":"¡Atención al examen! La autopista dentro de poblado SIGUE siendo autopista. Sus reglas de carril y sus prohibiciones de usuarios NO cambian. Solo cambia el límite de velocidad: 80 km/h."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сводка: автострада/скор. дорога в населённом пункте"},
      {"type":"list","style":"check","title":"Что МЕНЯЕТСЯ при въезде в городскую зону","items":[
        "Максимальная скорость: с 120 км/ч → 80 км/ч"
      ]},
      {"type":"list","style":"cross","title":"Что НЕ МЕНЯЕТСЯ (остаётся как вне города)","items":[
        "Обязанность ехать по правой полосе",
        "Остальные полосы только для обгона",
        "Запрет для пешеходов, велосипедистов, мопедов и т.д.",
        "Нет одноуровневых пересечений и светофоров",
        "По-прежнему есть разделительная полоса между направлениями"
      ]},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! Автострада в населённом пункте ОСТАЁТСЯ автострадой. Правила полос и запреты для пользователей НЕ меняются. Меняется только скоростной лимит: 80 км/ч."}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 1575be20 (autopista zona urbana → 80 km/h) ────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"En una autopista que transcurre por zona urbana, ¿a qué velocidad máxima puede circular un turismo si no existe señalización?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-001/1575be20-d4ee-4047-85a1-1c2fceadac2a.webp","options":["A 100 km/h.","A 120 km/h.","A 80 km/h."],"correct":2,"explanation":"En una autopista que transcurre por zona urbana la velocidad máxima permitida para un turismo es de 80 km/h, aunque no exista señalización específica. Aunque el límite genérico de autopista es 120 km/h, al pasar por zona urbana ese límite queda reducido a 80 km/h."}',
    '{"text":"С какой максимальной скоростью может двигаться легковой автомобиль по автомагистрали, проходящей через населённый пункт, если нет знаков?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-001/1575be20-d4ee-4047-85a1-1c2fceadac2a.webp","options":["100 км/ч.","120 км/ч.","80 км/ч."],"correct":2,"explanation":"На автостраде, проходящей через населённый пункт, максимально разрешённая скорость для легкового автомобиля — 80 км/ч, даже если нет специальных знаков. Хотя общий лимит для автострады — 120 км/ч, при прохождении через городскую зону он снижается до 80 км/ч."}'
  );

  -- ── Step 5 · Quiz — DGT 0d25f708 (carril izquierdo sin adelantar) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"En esta autopista, el vehículo que circula por el carril izquierdo y no está adelantando, ¿circula correctamente?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-008/0d25f708-9bd9-4cc3-8be2-5521b5564839_1768735553737.webp","options":["Sí, porque no impide el paso a otros vehículos.","No, porque debe circular por el carril de la derecha.","Sí, porque puede utilizar cualquier carril."],"correct":1,"explanation":"No circula correctamente. En autopista y autovía la norma general es circular por el carril de la derecha. Los carriles de la izquierda solo se utilizan para adelantar. Una vez completado el adelantamiento, el conductor debe incorporarse de nuevo al carril de la derecha. Esta regla aplica tanto fuera como dentro de poblado."}',
    '{"text":"На этой автомагистрали, транспортное средство, движущееся по левой полосе и не выполняющее обгон, движется правильно?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-008/0d25f708-9bd9-4cc3-8be2-5521b5564839_1768735553737.webp","options":["Да, потому что это не мешает проезду других транспортных средств.","Нет, потому что он должен двигаться по правой полосе.","Да, потому что он может использовать любую полосу."],"correct":1,"explanation":"Нет, движется неправильно. На автостраде и скоростной дороге общее правило — ехать по правой полосе. Левые полосы используются только для обгона. После завершения обгона водитель должен вернуться на правую полосу. Это правило действует как вне, так и внутри населённого пункта."}'
  );

  -- ── Step 6 · Quiz — authored (80 km/h dentro vs fuera regla) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'quiz',
    '{"text":"Una autopista entra en zona urbana. ¿Qué regla del carril se aplica al conductor?","options":["Puede circular por el carril que más convenga a su destino, como en cualquier vía urbana.","Debe seguir circulando por el carril de la derecha, igual que fuera del poblado.","Solo debe usar el carril derecho si circula más lento que el resto del tráfico."],"correct":1,"explanation":"En autopista/autovía dentro de poblado se sigue aplicando la misma regla de carril que fuera de poblado: el conductor debe circular por el carril de la derecha. La regla de la vía urbana (circular por el carril más conveniente para el destino) NO se aplica en autopistas ni autovías, aunque discurran por zona urbana."}',
    '{"text":"Автострада входит в городскую зону. Какое правило полосы применяется к водителю?","options":["Можно ехать по полосе, удобной для маршрута, как на любой городской дороге.","Нужно продолжать ехать по правой полосе, как и вне населённого пункта.","По правой полосе только если едешь медленнее остального трафика."],"correct":1,"explanation":"На автостраде/скоростной дороге внутри населённого пункта продолжает действовать то же правило полосы, что и вне города: водитель должен ехать по правой полосе. Правило городской дороги (ехать по удобной для маршрута полосе) НЕ применяется на автострадах и скоростных дорогах, даже если они проходят через городскую зону."}'
  );

END $$;
