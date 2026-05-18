-- Lección 1.2.12 — Añadir pasos 13-15: señalización + resaltos
-- Lesson id: 000aa0c0-0564-4cb5-9d5a-617322507b18
-- Quiz Step 15: DGT aeb575cf (resaltos pasos peatones → no son obstáculos → idx 0)

DO $$
DECLARE
  l_id uuid := '000aa0c0-0564-4cb5-9d5a-617322507b18';
BEGIN

  -- ── Step 13 · Theory — Prohibición de modificar señalización ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 13, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Prohibición absoluta de alterar señales","text":"Está terminantemente prohibido alterar, dañar o modificar la señalización de tráfico, así como colocar en la vía objetos o dispositivos que puedan confundirse con señales oficiales o inducir a error a los conductores."},
      {"type":"list","style":"cross","title":"Conductas prohibidas","items":[
        "Retirar, girar o tapar señales de tráfico",
        "Pintar, rayar o deteriorar marcas viales",
        "Colocar señales, banderas o anuncios que puedan confundirse con señalización oficial",
        "Instalar dispositivos que alteren la visibilidad de las señales"
      ]},
      {"type":"callout","variant":"info","text":"Quien encuentre un obstáculo o peligro en la vía está obligado a señalizarlo y a comunicarlo a la autoridad de tráfico. La obligación de señalizar y retirar obstáculos recae en quien los ha colocado o provocado."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Абсолютный запрет изменения знаков","text":"Категорически запрещается изменять, повреждать или убирать дорожные знаки, а также устанавливать на дороге предметы или устройства, которые можно спутать с официальными знаками или ввести водителей в заблуждение."},
      {"type":"list","style":"cross","title":"Запрещённые действия","items":[
        "Снимать, поворачивать или закрывать дорожные знаки",
        "Закрашивать, царапать или повреждать дорожную разметку",
        "Устанавливать знаки, флаги или рекламу, которые можно спутать с официальной сигнализацией",
        "Монтировать устройства, ухудшающие видимость знаков"
      ]},
      {"type":"callout","variant":"info","text":"Тот, кто обнаружил препятствие или опасность на дороге, обязан обозначить их и сообщить в службу дорожного движения. Обязанность обозначить и убрать препятствие лежит на том, кто его создал."}
    ]}'
  );

  -- ── Step 14 · Theory — Resaltos en pasos de peatones ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 14, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Resaltos en pasos de peatones","text":"Los resaltos (bandas elevadas) colocados en los pasos para peatones NO se consideran obstáculos para la circulación, siempre que garanticen la seguridad vial. Son elementos de moderación de velocidad legalmente autorizados."},
      {"type":"list","style":"check","title":"Características de los resaltos legales","items":[
        "Forman parte de la señalización y moderación del tráfico",
        "No constituyen obstáculo ni peligro si cumplen la normativa",
        "Deben estar correctamente señalizados y pintados",
        "El conductor debe reducir velocidad antes de pasar sobre ellos"
      ]},
      {"type":"callout","variant":"warning","text":"¡Atención al examen! La pregunta típica es: ¿son obstáculos los resaltos en pasos de peatones? Respuesta: NO, siempre que garanticen la seguridad vial."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Лежачие полицейские на пешеходных переходах","text":"Лежачие полицейские (поднятые полосы) на пешеходных переходах НЕ считаются препятствиями для движения, при условии обеспечения безопасности дорожного движения. Это законно установленные элементы для снижения скорости."},
      {"type":"list","style":"check","title":"Характеристики законных лежачих полицейских","items":[
        "Являются частью системы организации и успокоения трафика",
        "Не являются препятствием или опасностью при соответствии нормам",
        "Должны быть правильно обозначены и окрашены",
        "Водитель обязан снизить скорость перед проездом"
      ]},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! Типичный вопрос: являются ли лежачие полицейские на пешеходных переходах препятствиями? Ответ: НЕТ, при условии обеспечения безопасности дорожного движения."}
    ]}'
  );

  -- ── Step 15 · Quiz — DGT aeb575cf (resaltos pasos peatones) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 15, 'quiz',
    '{"text":"¿Los resaltos en los pasos para peatones se consideran obstáculos para la circulación?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/aeb575cf-2a41-4c5e-abde-d62a40766a16.webp","options":["No, siempre que garanticen la seguridad vial.","Sí, porque pueden dañar el vehículo.","Solo si superan los 10 cm de altura."],"correct":0,"explanation":"No, los resaltos en los pasos para peatones no se consideran obstáculos para la circulación siempre que garanticen la seguridad vial. Son elementos legales de moderación de velocidad que forman parte de la señalización y gestión del tráfico."}',
    '{"text":"Считаются ли лежачие полицейские на пешеходных переходах препятствиями для движения?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/aeb575cf-2a41-4c5e-abde-d62a40766a16.webp","options":["Нет, при условии обеспечения безопасности дорожного движения.","Да, так как они могут повредить автомобиль.","Только если высота превышает 10 см."],"correct":0,"explanation":"Нет, лежачие полицейские на пешеходных переходах не считаются препятствиями для движения при условии обеспечения безопасности дорожного движения. Это законные элементы для снижения скорости, являющиеся частью организации трафика."}'
  );

END $$;
