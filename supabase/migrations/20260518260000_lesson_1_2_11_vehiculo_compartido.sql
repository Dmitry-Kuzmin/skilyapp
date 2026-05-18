-- Lección 1.2.11 — Vehículo de uso compartido
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4: DGT 16e521a0 (menores ≤135 cm en carsharing → SRI → pos 1 → idx 0)
-- Quiz Step 6: authored (¿dónde se coloca el V-26?)
-- Quiz Step 8: authored (station-based vs free-floating)
-- Quiz Step 10: authored (0 emisiones + uso compartido → distintivo combinado)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.11',
     'Vehículo de uso compartido',
     'Транспортное средство совместного использования',
     18, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Definición legal ────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Vehículo de uso compartido (R.G.C.)","text":"Vehículo destinado al alquiler sin conductor que se dedica a un uso concatenado e intensivo por un número indeterminado de usuarios dentro de una zona de servicios delimitada. Debe estar disponible, en cualquier momento, para ser utilizado mediante el empleo de aplicaciones móviles."},
      {"type":"list","style":"check","title":"Requisitos clave","items":[
        "Alquiler sin conductor (el usuario conduce por sí mismo)",
        "Uso concatenado e intensivo — múltiples usuarios seguidos",
        "Número indeterminado de usuarios",
        "Zona de servicios delimitada",
        "Disponible en cualquier momento vía aplicación móvil"
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"ТС совместного использования (R.G.C.)","text":"Транспортное средство, предназначенное для аренды без водителя, используемое последовательно и интенсивно неопределённым кругом пользователей в рамках обозначенной зоны обслуживания. Должно быть доступно в любое время через мобильное приложение."},
      {"type":"list","style":"check","title":"Ключевые требования","items":[
        "Аренда без водителя (пользователь управляет самостоятельно)",
        "Последовательное и интенсивное использование — несколько пользователей подряд",
        "Неопределённый круг пользователей",
        "Обозначенная зона обслуживания",
        "Доступность в любое время через мобильное приложение"
      ]}
    ]}'
  );

  -- ── Step 2 · Theory — Station-based vs Free-floating ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Modalidades de recogida del vehículo"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🅿️","title":"Station-based","description":"El usuario recoge y devuelve el vehículo en una base o estación específica predeterminada. Sistema con puntos fijos de aparcamiento."},
        {"icon":"📍","title":"Free-floating","description":"El usuario puede recoger y dejar el vehículo en cualquier punto dentro de la zona de utilización, estacionado libremente (sin base fija)."}
      ]},
      {"type":"callout","variant":"warning","text":"¡Ojo al examen! Free-floating = libre dentro de la zona (sin base fija). Station-based = base fija asignada. Ambos son vehículos de uso compartido; la diferencia es solo cómo se recogen y devuelven."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Способы получения транспортного средства"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🅿️","title":"Station-based (со станцией)","description":"Пользователь забирает и возвращает автомобиль в заранее определённой базе или станции. Система с фиксированными точками парковки."},
        {"icon":"📍","title":"Free-floating (свободный)","description":"Пользователь может забрать и оставить автомобиль в любом месте в зоне обслуживания, припарковав его свободно (без фиксированной базы)."}
      ]},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! Free-floating = свободно внутри зоны (без фиксированной базы). Station-based = фиксированная база. Оба — ТС совместного использования; разница лишь в способе получения и возврата."}
    ]}'
  );

  -- ── Step 3 · Theory — Distintivo V-26 ────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Distintivo V-26","text":"Los vehículos de uso compartido deberán llevar colocado el distintivo señal V-26 en el ángulo superior izquierdo del parabrisas delantero."},
      {"type":"callout","variant":"danger","text":"Posición exacta del V-26: ángulo SUPERIOR IZQUIERDO del parabrisas DELANTERO. No en la luna trasera, no en la derecha. Dato que aparece en el examen con frecuencia."},
      {"type":"callout","variant":"info","title":"Regla especial para vehículos 0 emisiones + uso compartido","text":"En los vehículos 0 emisiones que también sean de uso compartido, para no colocar dos etiquetas, llevarán el distintivo de vehículo de uso compartido (V-26) en el que figurará la categoría ambiental. Un solo distintivo con la doble función."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Отличительный знак V-26","text":"Транспортные средства совместного использования должны иметь знак V-26 в верхнем левом углу переднего лобового стекла."},
      {"type":"callout","variant":"danger","text":"Точное положение V-26: ВЕРХНИЙ ЛЕВЫЙ угол ПЕРЕДНЕГО лобового стекла. Не на заднем стекле, не на правой стороне. Этот факт часто проверяется на экзамене."},
      {"type":"callout","variant":"info","title":"Особое правило для ТС 0 emisiones + совместного использования","text":"На транспортных средствах с нулевыми выбросами, которые также являются ТС совместного использования, чтобы не размещать два знака, они несут знак ТС совместного использования (V-26), в котором указана экологическая категория. Один знак выполняет двойную функцию."}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 16e521a0 (menores ≤135 cm → SRI obligatorio) ─────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"En los vehículos de uso compartido o \"carsharing\", los menores de estatura igual o inferior a 135 centímetros, ¿están obligados a utilizar sistemas de retención infantil?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-003/16e521a0-36ab-40a2-aef5-157a3d0a905a_1769001927676_pro.webp","options":["Sí.","Sólo si el vehículo tiene.","No."],"correct":0,"explanation":"Sí, los menores de estatura igual o inferior a 135 cm están obligados a utilizar sistemas de retención infantil (SRI) también en vehículos de uso compartido. La normativa de SRI no hace excepciones por el tipo de vehículo: aplica a todos los turismos, incluidos los de carsharing."}',
    '{"text":"В транспортных средствах совместного использования (каршеринге), обязаны ли дети ростом 135 см и ниже использовать детские удерживающие устройства?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-05_test-003/16e521a0-36ab-40a2-aef5-157a3d0a905a_1769001927676_pro.webp","options":["Да.","Только если они есть в автомобиле.","Нет."],"correct":0,"explanation":"Да, дети ростом 135 см и ниже обязаны использовать детские удерживающие устройства (SRI) в том числе в ТС совместного использования. Нормы по SRI не делают исключений для типа транспортного средства: они распространяются на все легковые автомобили, включая каршеринг."}'
  );

  -- ── Step 5 · Theory — Obligaciones del usuario ────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Obligaciones del usuario de vehículo compartido"},
      {"type":"list","style":"check","items":[
        "Verificar el estado del vehículo antes de utilizarlo",
        "Colocar correctamente los SRI para menores de ≤135 cm o menores de 12 años",
        "Respetar el área de operación definida por el servicio",
        "Devolver el vehículo según la modalidad contratada (station-based o free-floating)",
        "No fumar dentro del vehículo compartido"
      ]},
      {"type":"list","style":"cross","title":"Prohibiciones específicas","items":[
        "Ceder el vehículo a terceros no registrados en la plataforma",
        "Salir de la zona de operación sin autorización",
        "Usar el vehículo para transporte remunerado de personas (eso sería VTC/taxi)"
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Обязанности пользователя ТС совместного использования"},
      {"type":"list","style":"check","items":[
        "Проверить состояние автомобиля перед использованием",
        "Правильно установить детские удерживающие устройства для детей ≤135 см или до 12 лет",
        "Соблюдать зону обслуживания, определённую сервисом",
        "Вернуть автомобиль в соответствии с выбранным форматом (station-based или free-floating)",
        "Не курить внутри автомобиля совместного использования"
      ]},
      {"type":"list","style":"cross","title":"Конкретные запреты","items":[
        "Передавать автомобиль третьим лицам, не зарегистрированным на платформе",
        "Выезжать за пределы зоны обслуживания без разрешения",
        "Использовать автомобиль для платной перевозки пассажиров (это было бы VTC/такси)"
      ]}
    ]}'
  );

  -- ── Step 6 · Quiz — authored (posición del V-26) ──────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'quiz',
    '{"text":"¿En qué lugar del vehículo de uso compartido debe colocarse el distintivo V-26?","options":["En el ángulo inferior derecho del parabrisas trasero.","En el ángulo superior izquierdo del parabrisas delantero.","En el lateral derecho, a la altura de la puerta del conductor."],"correct":1,"explanation":"El distintivo V-26 debe colocarse en el ángulo SUPERIOR IZQUIERDO del parabrisas DELANTERO. Esta posición está fijada por la normativa y es diferente de la de otros distintivos (como la etiqueta medioambiental, que va en el ángulo inferior derecho del parabrisas)."}',
    '{"text":"В каком месте на транспортном средстве совместного использования должен размещаться знак V-26?","options":["В правом нижнем углу заднего лобового стекла.","В верхнем левом углу переднего лобового стекла.","На правом боку, на уровне двери водителя."],"correct":1,"explanation":"Знак V-26 должен размещаться в ВЕРХНЕМ ЛЕВОМ углу ПЕРЕДНЕГО лобового стекла. Это положение закреплено нормативами и отличается от положения других знаков (например, экологическая наклейка размещается в правом нижнем углу лобового стекла)."}'
  );

  -- ── Step 7 · Theory — Diferencias con taxi y VTC ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"table","headers":["Característica","Uso compartido (carsharing)","Taxi / VTC"],"rows":[
        ["¿Quién conduce?","El propio usuario","Un conductor profesional"],
        ["¿Con conductor?","NO (alquiler sin conductor)","SÍ (con conductor)"],
        ["Número de usuarios","Indeterminado, uso concatenado","Cada servicio un cliente"],
        ["Precio","Tarifa app (por tiempo/km)","Tarifa por servicio"],
        ["Distintivo","V-26 en parabrisas","Licencia de taxi o VTC"]
      ],"caption":"El carsharing NO es taxi ni VTC — la diferencia es que el usuario conduce él mismo"}
    ]}',
    '{"blocks":[
      {"type":"table","headers":["Характеристика","Совместное исп. (каршеринг)","Такси / VTC"],"rows":[
        ["Кто управляет?","Сам пользователь","Профессиональный водитель"],
        ["С водителем?","НЕТ (аренда без водителя)","ДА (с водителем)"],
        ["Число пользователей","Неопределённое, последовательное","Каждая поездка — отдельный клиент"],
        ["Цена","Тариф в приложении (время/км)","Тариф за поездку"],
        ["Знак","V-26 на лобовом стекле","Лицензия такси или VTC"]
      ],"caption":"Каршеринг — это НЕ такси и НЕ VTC: разница в том, что пользователь управляет сам"}
    ]}'
  );

  -- ── Step 8 · Quiz — authored (station-based vs free-floating) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"En los vehículos de uso compartido, ¿qué significa la modalidad ''free-floating''?","options":["El vehículo debe recogerse y devolverse en una base o estación fija.","El usuario puede recoger y dejar el vehículo en cualquier punto dentro de la zona de utilización, sin base fija.","El vehículo circula sin necesidad de permiso de conducción."],"correct":1,"explanation":"Free-floating significa que el usuario puede recoger y dejar el vehículo en cualquier punto dentro de la zona de utilización, estacionado libremente, sin necesidad de ir a una base fija. La modalidad contraria es station-based, donde sí hay puntos de recogida y entrega predeterminados."}',
    '{"text":"В транспортных средствах совместного использования, что означает модальность «free-floating»?","options":["Автомобиль необходимо забрать и вернуть на фиксированную базу или станцию.","Пользователь может забрать и оставить автомобиль в любом месте в пределах зоны, без фиксированной базы.","Автомобиль может ездить без водительских прав."],"correct":1,"explanation":"Free-floating означает, что пользователь может забрать и оставить автомобиль в любом месте в пределах зоны обслуживания, припарковав его свободно, без необходимости ехать к фиксированной базе. Противоположный формат — station-based, где есть заранее определённые точки получения и возврата."}'
  );

END $$;
