-- Lección 1.2.12 — Normas generales de comportamiento, civismo y educación
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4:  DGT 7c7779b0  (crear obstáculo → señalizarlo → pos 2 → idx 1)
-- Quiz Step 5:  DGT d06c6df2  (arrojar objetos incendio → No → pos 1 → idx 0)
-- Quiz Step 8:  DGT 44b1cf99  (colilla → No, incendio/peligro → pos 1 → idx 0)
-- Quiz Step 9:  DGT 9e2ae360  (prohibido arrojar → deterioren vía → pos 2 → idx 1)
-- Quiz Step 11: DGT 286ee2a8  (arrojar objetos entorpezcan → No prohibido → pos 2 → idx 1)
-- Quiz Step 12: authored (lavar vehículo en vía)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.12',
     'Normas generales de comportamiento en la vía',
     'Общие нормы поведения на дороге',
     19, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Obligación ante obstáculos ──────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Obligación legal ante obstáculos en la vía","text":"Los usuarios que creen algún obstáculo o peligro sobre la vía deberán retirarlo lo antes posible, adoptando entre tanto las medidas necesarias para que pueda ser advertido por los demás y para que no dificulte la circulación."},
      {"type":"list","style":"check","title":"Medidas obligatorias si creas un obstáculo","items":[
        "Retirar el obstáculo lo antes posible",
        "Señalizarlo mientras no se haya retirado para que sea visible por otros usuarios",
        "Adoptar medidas para que no dificulte la circulación",
        "Si no puede retirarlo solo: llamar a los servicios de emergencia"
      ]},
      {"type":"callout","variant":"danger","text":"NO puedes limitarte a avisar a los servicios de emergencia y marcharte. La obligación es tuya: señalizar y retirar. Los servicios de emergencia son un apoyo, no un sustituto de tu responsabilidad."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Законодательная обязанность при создании препятствия","text":"Участники дорожного движения, создавшие какое-либо препятствие или опасность на дороге, обязаны устранить его как можно скорее, принимая до тех пор необходимые меры, чтобы оно было замечено другими и не затрудняло движение."},
      {"type":"list","style":"check","title":"Обязательные меры при создании препятствия","items":[
        "Устранить препятствие как можно скорее",
        "Обозначить его до момента устранения, чтобы другие участники его заметили",
        "Принять меры, чтобы оно не затрудняло движение",
        "Если не можешь убрать самостоятельно — вызвать аварийные службы"
      ]},
      {"type":"callout","variant":"danger","text":"Нельзя просто вызвать аварийные службы и уехать. Обязанность — твоя: обозначить и убрать. Аварийные службы — помощь, а не замена твоей ответственности."}
    ]}'
  );

  -- ── Step 2 · Theory — Prohibición general: tres categorías ───────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Está prohibido arrojar, depositar o abandonar sobre la vía objetos que puedan:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🔥","title":"1. Producir incendios o contaminación","description":"Colillas, cristal, aceite, gasolina, gasoil, productos de limpieza, etc."},
        {"icon":"⚠️","title":"2. Poner en peligro la seguridad","description":"Tirar cáscaras, colillas u objetos por la ventana. Lavar el vehículo en la vía. Dejar basura en mitad de la calle."},
        {"icon":"🛠️","title":"3. Deteriorar la vía","description":"Abandonar basura o productos nocivos que destruyan la propia vía. Verter productos corrosivos que alteren las condiciones de circulación."},
        {"icon":"🚫","title":"Regla general","description":"Prohibido en toda la vía pública y sus inmediaciones. No importa si es zona urbana o interurbana."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Запрещено выбрасывать, складывать или бросать на дорогу предметы, которые могут:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🔥","title":"1. Вызвать пожар или загрязнение","description":"Окурки, стекло, масло, бензин, дизельное топливо, чистящие средства и т.д."},
        {"icon":"⚠️","title":"2. Создать угрозу безопасности","description":"Выбрасывать кожуру, окурки или предметы через окно. Мыть автомобиль на дороге. Оставлять мусор посреди улицы."},
        {"icon":"🛠️","title":"3. Повредить дорожное покрытие","description":"Бросать мусор или вредные продукты, разрушающие дорожное покрытие. Выливать коррозионные вещества, нарушающие условия безопасного движения."},
        {"icon":"🚫","title":"Общее правило","description":"Запрещено на всех дорогах общего пользования и вблизи них. Неважно, городская это дорога или загородная."}
      ]}
    ]}'
  );

  -- ── Step 3 · Theory — Ejemplos concretos de lo prohibido ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"list","style":"cross","title":"Ejemplos prohibidos expresamente","items":[
        "Tirar colillas encendidas o apagadas por la ventanilla",
        "Arrojar cáscaras de fruta, envases o cualquier objeto desde el vehículo",
        "Lavar el vehículo en la vía pública",
        "Dejar basura o residuos en la calzada o en sus márgenes",
        "Verter aceite usado, gasoil o gasolina sobre el asfalto",
        "Abandonar productos corrosivos que deterioren el pavimento",
        "Depositar mercancía en la calzada durante carga/descarga sin señalización"
      ]},
      {"type":"callout","variant":"tip","text":"Regla práctica: si el objeto sale de tu vehículo o de tu actividad y puede QUEMAR, PELIGRAR o DETERIORAR la vía → está prohibido. No hay excepciones por urgencia, por velocidad o por tipo de vía."}
    ]}',
    '{"blocks":[
      {"type":"list","style":"cross","title":"Прямо запрещённые примеры","items":[
        "Выбрасывать окурки (горящие или потушенные) через окно",
        "Бросать из автомобиля кожуру от фруктов, упаковки или любые предметы",
        "Мыть автомобиль на дороге общего пользования",
        "Оставлять мусор или отходы на проезжей части или обочине",
        "Сливать отработанное масло, дизтопливо или бензин на асфальт",
        "Бросать коррозионные вещества, повреждающие дорожное покрытие",
        "Оставлять товар на проезжей части при погрузке/разгрузке без обозначения"
      ]},
      {"type":"callout","variant":"tip","text":"Практическое правило: если предмет вышел из твоего автомобиля или из твоей деятельности и может ПОДЖЕЧЬ, СОЗДАТЬ ОПАСНОСТЬ или ПОВРЕДИТЬ дорогу → запрещено. Исключений нет — ни для срочных случаев, ни для скорости, ни для типа дороги."}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 7c7779b0 (crear obstáculo → señalizarlo) ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Qué deben hacer quienes creen un obstáculo o peligro sobre la vía hasta que lo hagan desaparecer?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-014/7c7779b0-bd0d-46ba-843c-cfbfcf363fc9_1768871337104_pro.webp","options":["Nada, serán los servicios de emergencia los que tomen medidas.","Señalizarlo para que sea advertido por los demás usuarios.","Atravesar el vehículo en la calzada para evitar la circulación."],"correct":1,"explanation":"Quienes creen un obstáculo o peligro en la vía deben señalizarlo para que sea advertido por los demás usuarios, mientras lo retiran. No basta con llamar a los servicios de emergencia y marcharse: la obligación de señalizar y retirar es del usuario que creó el obstáculo."}',
    '{"text":"Что должны делать те, кто создал препятствие или опасность на дороге, до его устранения?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-014/7c7779b0-bd0d-46ba-843c-cfbfcf363fc9_1768871337104_pro.webp","options":["Ничего, меры примут экстренные службы.","Обозначить его, чтобы другие участники движения могли его заметить.","Перегородить автомобилем проезжую часть, чтобы заблокировать движение."],"correct":1,"explanation":"Тот, кто создал препятствие или опасность на дороге, обязан обозначить его, пока убирает. Недостаточно вызвать аварийные службы и уехать: обязанность обозначить и убрать лежит на том, кто создал препятствие."}'
  );

  -- ── Step 5 · Quiz — DGT d06c6df2 (arrojar objetos que causen incendio) ────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"¿Está permitido arrojar a la vía o en sus inmediaciones, objetos que puedan provocar un incendio?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/d06c6df2-964e-48bd-892d-ffd4d330bb6f.webp","options":["No.","No se pueden arrojar a la vía, pero sí en sus inmediaciones.","Sí."],"correct":0,"explanation":"No está permitido arrojar a la vía NI en sus inmediaciones objetos que puedan provocar un incendio. La prohibición se extiende tanto a la calzada como a los márgenes y zonas adyacentes. Una colilla encendida lanzada al arcén puede provocar un incendio forestal."}',
    '{"text":"Разрешено ли выбрасывать на дорогу или в непосредственной близости от неё предметы, способные вызвать пожар?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/d06c6df2-964e-48bd-892d-ffd4d330bb6f.webp","options":["Нет.","На дорогу нельзя, но в непосредственной близости — можно.","Да."],"correct":0,"explanation":"Запрещено выбрасывать на дорогу И в непосредственной близости от неё предметы, способные вызвать пожар. Запрет распространяется как на проезжую часть, так и на обочины и прилегающие зоны. Горящий окурок, брошенный на обочину, может стать причиной лесного пожара."}'
  );

  -- ── Step 6 · Theory — Lavar vehículo y productos corrosivos ──────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Está expresamente prohibido","text":"Lavar el vehículo en la vía pública. El agua jabonosa, los productos de limpieza y los líquidos que se generan pueden contaminar la calzada, los desagües y el medio ambiente próximo."},
      {"type":"callout","variant":"danger","title":"Productos corrosivos","text":"Abandonar o verter productos corrosivos en la vía está expresamente prohibido. Pueden deteriorar el asfalto, dañar neumáticos de otros vehículos y modificar las condiciones de adherencia de la calzada, creando un riesgo grave para todos los usuarios."},
      {"type":"callout","variant":"warning","text":"¡Ojo al examen! Lavar el vehículo en la vía es un ejemplo concreto de lo que NO se puede hacer. Aunque no ensucie visiblemente, contamina el agua y deteriora la superficie de la calzada."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Прямо запрещено","text":"Мыть автомобиль на дороге общего пользования. Мыльная вода, чистящие средства и образующиеся жидкости могут загрязнять проезжую часть, водостоки и окружающую среду."},
      {"type":"callout","variant":"danger","title":"Коррозионные вещества","text":"Бросать или выливать коррозионные вещества на дорогу прямо запрещено. Они могут разрушить асфальт, повредить шины других автомобилей и изменить сцепление дорожного покрытия, создавая серьёзную угрозу для всех участников движения."},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! Мойка автомобиля на дороге — конкретный пример того, что нельзя делать. Даже если видимого загрязнения нет, вода загрязняет окружающую среду и разрушает дорожное покрытие."}
    ]}'
  );

  -- ── Step 7 · Theory — Resumen de las tres prohibiciones ──────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"table","headers":["Categoría prohibida","Ejemplos del reglamento","Consecuencia potencial"],"rows":[
        ["Incendio o contaminación","Colillas, aceite, gasolina, cristal","Incendio forestal, contaminación suelo/agua"],
        ["Peligro o entorpecimiento","Cáscaras, basura, lavar vehículo","Accidente, obstáculo, caída de motos"],
        ["Deterioro de la vía","Productos corrosivos, residuos nocivos","Daño al asfalto, pérdida de adherencia"]
      ],"caption":"Las tres categorías de objetos prohibidos en la vía — art. 18 R.G.C."},
      {"type":"callout","variant":"tip","title":"Mnemotecnia: ''I-P-D''","text":"I = Incendio/contaminación (colillas, aceite). P = Peligro (cáscaras, basura). D = Deterioro (corrosivos). Todo objeto que pueda I, P o D está PROHIBIDO en la vía y sus inmediaciones."}
    ]}',
    '{"blocks":[
      {"type":"table","headers":["Запрещённая категория","Примеры из регламента","Возможные последствия"],"rows":[
        ["Пожар или загрязнение","Окурки, масло, бензин, стекло","Лесной пожар, загрязнение почвы/воды"],
        ["Угроза безопасности","Кожура, мусор, мойка авто","Авария, препятствие, падение мотоциклистов"],
        ["Повреждение дороги","Коррозионные вещества, вредные отходы","Разрушение асфальта, потеря сцепления"]
      ],"caption":"Три категории запрещённых предметов на дороге — ст. 18 R.G.C."},
      {"type":"callout","variant":"tip","title":"Мнемоника: «П-О-Р»","text":"П = Пожар/загрязнение (окурки, масло). О = Опасность (кожура, мусор). Р = Разрушение (коррозия). Любой предмет, способный вызвать П, О или Р — ЗАПРЕЩЁН на дороге и вблизи неё."}
    ]}'
  );

  -- ── Step 8 · Quiz — DGT 44b1cf99 (colilla → No, incendio/peligro) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"¿Durante la conducción, está permitido arrojar la colilla de un cigarro a la vía o en sus inmediaciones?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-017/44b1cf99-6bcc-4316-afc1-7fa186770bbe_1768819486461_pro.webp","options":["No, porque puede provocar un incendio o poner en peligro a otros usuarios.","Solo si se circula por una vía urbana.","Sí."],"correct":0,"explanation":"No está permitido arrojar colillas, ni encendidas ni apagadas. La colilla puede provocar un incendio (especialmente en zonas con vegetación seca) y también puede impactar a otros usuarios de la vía (motoristas, ciclistas). La prohibición se aplica tanto a la calzada como a sus inmediaciones."}',
    '{"text":"Во время езды разрешено ли выбрасывать окурок на дорогу или вблизи неё?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-017/44b1cf99-6bcc-4316-afc1-7fa186770bbe_1768819486461_pro.webp","options":["Нет, так как это может вызвать пожар или создать угрозу для других участников движения.","Только при движении по городской дороге.","Да."],"correct":0,"explanation":"Выбрасывать окурки запрещено — ни горящие, ни потушенные. Окурок может вызвать пожар (особенно в зонах с сухой растительностью), а также ударить других участников дороги (мотоциклистов, велосипедистов). Запрет распространяется как на проезжую часть, так и на прилегающую территорию."}'
  );

  -- ── Step 9 · Quiz — DGT 9e2ae360 (prohibido arrojar → deterioren vía) ─────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"Está prohibido arrojar a la vía objetos...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/9e2ae360-5905-40e7-b08c-055794610159.webp","options":["únicamente si pueden entorpecer la libre circulación.","que puedan deteriorar la vía o sus instalaciones.","solamente si pueden deteriorar la vía."],"correct":1,"explanation":"Está prohibido arrojar objetos que puedan deteriorar la vía O sus instalaciones (señales, barreras, luminarias, etc.). La prohibición no se limita solo a objetos que impidan la circulación: también abarca todos los que puedan dañar la infraestructura viaria. Las opciones 1 y 3 son incompletas porque solo mencionan una de las tres categorías prohibidas."}',
    '{"text":"Запрещено выбрасывать на дорогу предметы...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/9e2ae360-5905-40e7-b08c-055794610159.webp","options":["только если они могут затруднить свободное движение.","которые могут повредить дорогу или её сооружения.","только если они могут повредить дорогу."],"correct":1,"explanation":"Запрещено выбрасывать предметы, способные повредить дорогу ИЛИ её сооружения (знаки, барьеры, фонари и т.д.). Запрет не ограничивается только предметами, мешающими движению: он охватывает все, что может нанести ущерб дорожной инфраструктуре. Варианты 1 и 3 неполные, так как упоминают лишь одну из трёх запрещённых категорий."}'
  );

  -- ── Step 10 · Theory — Civismo: más allá de los objetos ──────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"heading","text":"El civismo en la vía pública — principio general"},
      {"type":"callout","variant":"info","text":"Las normas de civismo en la vía no se limitan a no tirar basura. Incluyen también: no producir ruidos innecesarios, no entorpecer la circulación de forma injustificada, respetar a los demás usuarios vulnerables (peatones, ciclistas) y mantener el espacio público en condiciones seguras para todos."},
      {"type":"callout","variant":"tip","title":"Recuerda: la vía pública es de todos","text":"Cada acción que pone en riesgo a otros usuarios (arrojar objetos, obstaculizar, contaminar) es una infracción del R.G.C. y puede acarrear multa. El principio es simple: lo que entra a tu vehículo debe salir solo en un lugar adecuado."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Гражданственность на дороге — общий принцип"},
      {"type":"callout","variant":"info","text":"Нормы гражданского поведения на дороге не ограничиваются запретом мусорить. Они также включают: не создавать лишний шум, не затруднять движение без оснований, уважать уязвимых участников дорожного движения (пешеходы, велосипедисты) и поддерживать общественное пространство в безопасных условиях для всех."},
      {"type":"callout","variant":"tip","title":"Помни: дорога принадлежит всем","text":"Каждое действие, создающее риск для других участников (выбрасывание предметов, создание препятствий, загрязнение) является нарушением R.G.C. и может повлечь штраф. Принцип прост: то, что оказалось в твоём автомобиле, должно выбрасываться только в подходящем месте."}
    ]}'
  );

  -- ── Step 11 · Quiz — DGT 286ee2a8 (arrojar objetos que entorpezcan) ────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"¿Se pueden arrojar o dejar sobre la vía objetos que puedan entorpecer la libre circulación, la parada o el estacionamiento?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/286ee2a8-f250-4aca-b764-d89fe42a0115.webp","options":["Sí.","No, está prohibido.","Solo si no se deteriora la vía o sus instalaciones."],"correct":1,"explanation":"No, está absolutamente prohibido arrojar o dejar objetos que entorpezcan la circulación, la parada o el estacionamiento. Esta prohibición es independiente de si el objeto daña la vía: el simple hecho de que dificulte la circulación ya lo convierte en infracción."}',
    '{"text":"Можно ли выбрасывать или оставлять на дороге предметы, способные затруднить свободное движение, остановку или стоянку?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/286ee2a8-f250-4aca-b764-d89fe42a0115.webp","options":["Да.","Нет, это запрещено.","Только если это не повредит дорогу или её сооружения."],"correct":1,"explanation":"Нет, абсолютно запрещено выбрасывать или оставлять предметы, затрудняющие движение, остановку или стоянку. Этот запрет действует независимо от того, повреждает ли предмет дорогу: уже сам факт, что он затрудняет движение, является нарушением."}'
  );

  -- ── Step 12 · Quiz — authored (lavar vehículo en vía) ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Está permitido lavar el vehículo en la vía pública?","options":["Sí, siempre que se use agua sin detergente.","No, está expresamente prohibido por el R.G.C.","Sí, solo en zonas habilitadas como aparcamientos públicos."],"correct":1,"explanation":"Lavar el vehículo en la vía pública está expresamente prohibido por el R.G.C. Los productos de limpieza y el agua jabonosa contaminan la calzada, los desagües y el suelo. Además, la superficie mojada puede crear riesgo de deslizamiento para otros vehículos, especialmente motocicletas."}',
    '{"text":"Разрешено ли мыть автомобиль на дороге общего пользования?","options":["Да, при условии использования воды без моющих средств.","Нет, это прямо запрещено R.G.C.","Да, только в специально оборудованных местах, например на публичных парковках."],"correct":1,"explanation":"Мойка автомобиля на дороге общего пользования прямо запрещена R.G.C. Чистящие средства и мыльная вода загрязняют проезжую часть, водостоки и почву. Кроме того, влажная поверхность может создать риск скольжения для других транспортных средств, особенно мотоциклов."}'
  );

END $$;
