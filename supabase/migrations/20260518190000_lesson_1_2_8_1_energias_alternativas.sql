-- Lección 1.2.8.1 — Vehículos con energías alternativas (EV, BEV, REEV, PHEV, HEV, FCV, HICEV)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4:  DGT 0758afbf (¿emiten gases los eléctricos? → No, correcto pos 2 → idx 1)
-- Quiz Step 5:  DGT 499b7bc2 (categoría 0 emisiones = BEV → correcto pos 1 → idx 0)
-- Quiz Step 8:  DGT 3dd7c8ca (BEV + PHEV ≥40 km → 0 emisiones → correcto pos 1 → idx 0)
-- Quiz Step 9:  DGT c8cd39f6 (categorías 0/ECO/C/B/A, sin etiqueta para A → correcto pos 3 → idx 2)
-- Quiz Step 11: authored (¿puede PHEV circular solo en eléctrico?)
-- Quiz Step 12: authored (¿qué diferencia BEV de REEV?)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.8.1',
     'Vehículos con energías alternativas',
     'Транспортные средства на альтернативных источниках энергии',
     14, 35, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Vehículo eléctrico y BEV ───────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Vehículo eléctrico (EV)","text":"Vehículo propulsado al menos por uno o más motores eléctricos. Es el término genérico que engloba todas las variantes eléctricas."},
      {"type":"callout","variant":"info","title":"Vehículo eléctrico de baterías (BEV)","text":"Vehículo eléctrico que utiliza como sistemas de almacenamiento de energía exclusivamente baterías recargables desde una fuente eléctrica exterior. Puede incluir frenado regenerativo que recarga las baterías durante las retenciones y frenadas."},
      {"type":"stats","stats":[
        {"value":"0","label":"emisiones directas","note":"no emite gases contaminantes ni CO2 durante la conducción"},
        {"value":"ECO / 0","label":"etiqueta DGT","note":"BEV puro → etiqueta 0 emisiones"},
        {"value":"100%","label":"energía eléctrica","note":"sin motor de combustión de apoyo"}
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Электромобиль (EV)","text":"Транспортное средство, приводимое в движение одним или несколькими электрическими двигателями. Это общий термин, охватывающий все электрические варианты."},
      {"type":"callout","variant":"info","title":"Электромобиль на аккумуляторных батареях (BEV)","text":"Электромобиль, использующий исключительно перезаряжаемые аккумуляторные батареи от внешнего источника электроэнергии. Может включать рекуперативное торможение, заряжающее батареи при торможении и остановках."},
      {"type":"stats","stats":[
        {"value":"0","label":"прямые выбросы","note":"не выбрасывает загрязняющих газов и CO2 при езде"},
        {"value":"ECO / 0","label":"наклейка DGT","note":"чистый BEV → наклейка 0 emisiones"},
        {"value":"100%","label":"электрическая энергия","note":"без вспомогательного ДВС"}
      ]}
    ]}'
  );

  -- ── Step 2 · Theory — REEV, FCV, FCHV ────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Variantes eléctricas avanzadas"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🔋","title":"REEV — Autonomía extendida","description":"BEV que además incorpora un motor de combustión interna como generador de apoyo para recargar las baterías cuando se agotan. No propulsa las ruedas directamente."},
        {"icon":"⚗️","title":"FCV — Célula de combustible","description":"Usa exclusivamente energía eléctrica procedente de una pila de combustible de hidrógeno embarcado. El hidrógeno reacciona con el oxígeno y produce electricidad sin emisiones (sólo agua)."},
        {"icon":"⚡","title":"FCHV — Híbrido de célula de combustible","description":"FCV que además equipa baterías eléctricas recargables como sistema de almacenamiento secundario, combinando pila de hidrógeno y baterías."},
        {"icon":"🌿","title":"HICEV — Combustión de hidrógeno","description":"Propulsado por motores de combustión interna de hidrógeno (no por celda de combustible). Quema hidrógeno en lugar de gasolina o diésel."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Продвинутые электрические варианты"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🔋","title":"REEV — расширенный запас хода","description":"BEV с дополнительным ДВС в роли генератора-помощника для подзарядки аккумуляторов, когда те разряжаются. ДВС не приводит колёса напрямую."},
        {"icon":"⚗️","title":"FCV — топливный элемент","description":"Использует исключительно электроэнергию от водородного топливного элемента. Водород реагирует с кислородом, вырабатывая электричество без вредных выбросов (только вода)."},
        {"icon":"⚡","title":"FCHV — гибрид на топливном элементе","description":"FCV, дополнительно оснащённый перезаряжаемыми аккумуляторными батареями как вторичным накопителем энергии. Сочетает водородную ячейку и аккумуляторы."},
        {"icon":"🌿","title":"HICEV — сжигание водорода","description":"Приводится ДВС, работающим на водороде (не топливным элементом). Сжигает водород вместо бензина или дизельного топлива."}
      ]}
    ]}'
  );

  -- ── Step 3 · Theory — HV, HEV, PHEV ──────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Vehículos híbridos"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⚙️","title":"HV — Vehículo híbrido","description":"Equipado con un sistema de propulsión que contiene al menos dos categorías diferentes de convertidores de energía y dos categorías diferentes de sistemas de almacenamiento. Término genérico."},
        {"icon":"🔀","title":"HEV — Eléctrico híbrido","description":"Propulsado por una combinación de motores de combustión interna y eléctricos. Las baterías se recargan por el propio motor y el frenado regenerativo, pero NO se puede enchufar."},
        {"icon":"🔌","title":"PHEV — Híbrido enchufable","description":"HEV con baterías que además pueden recargarse desde una fuente eléctrica exterior. A voluntad puede circular propulsado solo por su motor eléctrico (sin usar el motor de combustión)."}
      ]},
      {"type":"callout","variant":"danger","text":"El PHEV puede circular SOLO en modo eléctrico. El HEV no puede enchufarse. Esta diferencia es clave en el examen."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Гибридные транспортные средства"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⚙️","title":"HV — гибрид (общий термин)","description":"Оснащён системой привода с минимум двумя типами преобразователей энергии и двумя типами накопителей. Общий термин."},
        {"icon":"🔀","title":"HEV — электрогибрид","description":"Приводится комбинацией ДВС и электромотора. Аккумуляторы заряжаются от самого двигателя и рекуперативного торможения, НО от розетки зарядить НЕЛЬЗЯ."},
        {"icon":"🔌","title":"PHEV — подключаемый гибрид","description":"HEV с аккумуляторами, которые также можно заряжать от внешнего источника. По желанию может ехать исключительно на электромоторе (без ДВС)."}
      ]},
      {"type":"callout","variant":"danger","text":"PHEV может ехать ТОЛЬКО на электричестве. HEV нельзя заряжать от розетки. Это ключевое отличие для экзамена."}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 0758afbf (¿emiten gases los eléctricos?) ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Emiten los vehículos con motor eléctrico gases contaminantes durante su funcionamiento?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-003/0758afbf-1810-4d19-8d72-bbb37ea05517.webp","options":["Sí, y además las baterías que usan son residuos muy contaminantes al final de su vida útil.","No; no emiten a la atmósfera ni gases contaminantes ni de efecto invernadero.","No, pero consumen mayor cantidad de energía en las deceleraciones y frenadas."],"correct":1,"explanation":"Los vehículos eléctricos NO emiten gases contaminantes ni gases de efecto invernadero durante su funcionamiento. La energía proviene de baterías, no de combustión. El frenado regenerativo, al contrario, recupera energía durante las deceleraciones en lugar de consumirla."}',
    '{"text":"Выделяют ли автомобили с электрическим двигателем загрязняющие газы в процессе работы?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-003/0758afbf-1810-4d19-8d72-bbb37ea05517.webp","options":["Да, и кроме того, используемые ими батареи являются сильно загрязняющими отходами в конце срока службы.","Нет; они не выбрасывают в атмосферу ни загрязняющие газы, ни парниковые газы.","Нет, но они потребляют больше энергии при замедлении и торможении."],"correct":1,"explanation":"Электромобили НЕ выбрасывают загрязняющих или парниковых газов в процессе езды. Энергия поступает от аккумуляторов, а не от сжигания топлива. Рекуперативное торможение, напротив, возвращает энергию при замедлении, а не расходует её."}'
  );

  -- ── Step 5 · Quiz — DGT 499b7bc2 (categoría 0 emisiones = BEV) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"En función de su nivel de emisiones y combustible empleado, se clasifican en la categoría 0 emisiones...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-003/499b7bc2-183d-48f0-89d3-70dce9ba1735_1772981815180_pro.webp","options":["los vehículos eléctricos de batería.","los vehículos con motor de combustión interna.","los vehículos propulsados por gas licuado del petróleo (GLP)."],"correct":0,"explanation":"Los vehículos eléctricos de batería (BEV) son los que se clasifican en la categoría 0 emisiones, la más alta de la escala DGT. También entran en esta categoría los vehículos de hidrógeno (FCV) y los PHEV con autonomía eléctrica mínima de 40 km. Los vehículos de combustión interna y GLP tienen categorías inferiores (C, B o sin etiqueta)."}',
    '{"text":"В зависимости от уровня выбросов и используемого топлива, в категорию 0 emisiones классифицируются...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-003/499b7bc2-183d-48f0-89d3-70dce9ba1735_1772981815180_pro.webp","options":["электромобили на аккумуляторных батареях.","автомобили с двигателем внутреннего сгорания.","автомобили, работающие на сжиженном нефтяном газе (GLP)."],"correct":0,"explanation":"Электромобили на аккумуляторных батареях (BEV) классифицируются в категорию 0 emisiones — наивысшую по шкале DGT. В эту же категорию входят автомобили на водороде (FCV) и PHEV с электрическим запасом хода не менее 40 км. Автомобили с ДВС и GLP имеют более низкие категории (C, B или без наклейки)."}'
  );

  -- ── Step 6 · Theory — Tabla: tipos de vehículo y etiqueta DGT ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Etiquetas medioambientales DGT"},
      {"type":"table","headers":["Categoría","Tipo de vehículo","Ventajas"],"rows":[
        ["0 emisiones","BEV, FCV, FCHV, PHEV (≥40 km eléctrico)","Acceso sin restricciones en Madrid, Barcelona y otras ciudades"],
        ["ECO","HEV, PHEV (<40 km), GNC, GLP","Acceso restringido con ventajas; puede circular en episodios de contaminación"],
        ["C","Gasolina Euro 6, diésel Euro 6","Sin beneficios especiales"],
        ["B","Gasolina Euro 4/5, diésel Euro 5","Sin beneficios especiales"],
        ["A","Gasolina anterior a Euro 4, diésel anterior a Euro 5","Sin etiqueta — no puede circular en restricciones"]
      ],"caption":"Etiquetas medioambientales DGT (Resolución DGT 2016 y posteriores)"}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Экологические наклейки DGT"},
      {"type":"table","headers":["Категория","Тип транспортного средства","Преимущества"],"rows":[
        ["0 emisiones","BEV, FCV, FCHV, PHEV (≥40 км электро)","Доступ без ограничений в Мадриде, Барселоне и других городах"],
        ["ECO","HEV, PHEV (<40 км), GNC, GLP","Ограниченный доступ с льготами; может ездить в дни загрязнения"],
        ["C","Бензин Euro 6, дизель Euro 6","Без особых преимуществ"],
        ["B","Бензин Euro 4/5, дизель Euro 5","Без особых преимуществ"],
        ["A","Бензин до Euro 4, дизель до Euro 5","Без наклейки — запрещён при введении ограничений"]
      ],"caption":"Экологические наклейки DGT (Резолюция DGT 2016 и последующие)"}
    ]}'
  );

  -- ── Step 7 · Theory — Resumen de acrónimos ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"table","headers":["Sigla","Nombre","Fuente de energía","Puede enchufarse"],"rows":[
        ["BEV","Eléctrico de baterías","Solo batería exterior","Sí"],
        ["REEV","Autonomía extendida","Batería + motor combustión (generador)","Sí"],
        ["FCV","Célula de combustible","Hidrógeno (pila)","No"],
        ["FCHV","Híbrido de célula de combustible","Hidrógeno + baterías","No/Sí"],
        ["HEV","Eléctrico híbrido","Combustión + eléctrico (regenerativo)","No"],
        ["PHEV","Híbrido enchufable","Combustión + eléctrico (exterior)","Sí"],
        ["HICEV","Combustión de hidrógeno","Combustión de H₂","No"]
      ],"caption":"Tabla resumen de acrónimos de vehículos alternativos"},
      {"type":"callout","variant":"tip","title":"Mnemotecnia: ''B-R-F-H-P''","text":"B = solo Batería (BEV). R = Rango extendido (REEV). F = celda de combustible con Hidrógeno (FCV). H = Híbrido sin enchufe (HEV). P = Plug-in enchufable (PHEV). Si lleva P → puede enchufarse."}
    ]}',
    '{"blocks":[
      {"type":"table","headers":["Аббр.","Название","Источник энергии","Заряжается от сети"],"rows":[
        ["BEV","Аккумуляторный электромобиль","Только внешняя батарея","Да"],
        ["REEV","Электромобиль с расширенным запасом хода","Батарея + ДВС (генератор)","Да"],
        ["FCV","Топливный элемент","Водород (ячейка)","Нет"],
        ["FCHV","Гибрид на топливном элементе","Водород + батареи","Нет/Да"],
        ["HEV","Электрогибрид","ДВС + электро (рекуперация)","Нет"],
        ["PHEV","Подключаемый гибрид","ДВС + электро (внешняя)","Да"],
        ["HICEV","ДВС на водороде","Сжигание H₂","Нет"]
      ],"caption":"Сводная таблица аббревиатур альтернативных ТС"},
      {"type":"callout","variant":"tip","title":"Мнемоника: «B-R-F-H-P»","text":"B = только Батарея (BEV). R = Расширенный запас (REEV). F = топливный элемент (Водород) (FCV). H = Гибрид без розетки (HEV). P = Plug-in, от розетки (PHEV). Если есть P → можно заряжать от сети."}
    ]}'
  );

  -- ── Step 8 · Quiz — DGT 3dd7c8ca (BEV + PHEV ≥40 km = 0 emisiones) ──────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"¿En qué clase clasificarías a un coche eléctrico de batería y un híbrido enchufable con una autonomía mínima de 40 km?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-003/3dd7c8ca-6ae3-4a5b-8a55-43d182f5b45a.webp","options":["0 emisiones.","ECO.","En la clase A."],"correct":0,"explanation":"Tanto el BEV (coche eléctrico de batería puro) como el PHEV con autonomía eléctrica mínima de 40 km se clasifican en la categoría 0 emisiones, la más favorable. El PHEV con menos de 40 km de autonomía eléctrica entraría en la categoría ECO, no en 0 emisiones."}',
    '{"text":"К какому классу вы бы отнесли аккумуляторный электромобиль и подключаемый гибрид с минимальным электрическим запасом хода 40 км?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-003/3dd7c8ca-6ae3-4a5b-8a55-43d182f5b45a.webp","options":["0 emisiones (0 выбросов).","ECO (Эко).","К классу A."],"correct":0,"explanation":"Как BEV (чистый аккумуляторный электромобиль), так и PHEV с электрическим запасом хода не менее 40 км относятся к категории 0 emisiones — наиболее льготной. PHEV с запасом хода менее 40 км попадает в категорию ECO, а не 0 emisiones."}'
  );

  -- ── Step 9 · Quiz — DGT c8cd39f6 (categorías DGT) ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"¿En qué categorías se clasifican los vehículos en función de su límite de emisiones y combustible empleado?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-002/c8cd39f6-cdfa-4917-82b4-682722738a0a.webp","options":["0 emisiones, ECO, D, C y B, no existiendo distintivo para los de categoría B.","SIN, ECO, C, B, y A, no existiendo distintivo para los de categoría SIN.","0 emisiones, ECO, C, B y A, no existiendo distintivo para los de categoría A."],"correct":2,"explanation":"Las categorías DGT son: 0 emisiones (más verde), ECO, C, B y A. Los vehículos de categoría A son los más contaminantes y NO tienen etiqueta, a diferencia de los demás. Recuerda: la escala es 0 → ECO → C → B → A (sin etiqueta)."}',
    '{"text":"На какие категории подразделяются транспортные средства в зависимости от уровня выбросов и используемого топлива?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-10_test-002/c8cd39f6-cdfa-4917-82b4-682722738a0a.webp","options":["0 emisiones, ECO, D, C и B, при этом для категории B наклейка не предусмотрена.","SIN, ECO, C, B и A, при этом для категории SIN наклейка не предусмотрена.","0 emisiones, ECO, C, B и A, при этом для категории A наклейка не предусмотрена."],"correct":2,"explanation":"Категории DGT: 0 emisiones (наиболее экологичная), ECO, C, B и A. Транспортные средства категории A являются наиболее загрязняющими и НЕ имеют наклейки, в отличие от остальных. Запомни шкалу: 0 → ECO → C → B → A (без наклейки)."}'
  );

  -- ── Step 10 · Theory — Ventajas prácticas y carga ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Ventajas prácticas del vehículo eléctrico"},
      {"type":"list","style":"check","title":"Beneficios del BEV y vehículos 0 emisiones","items":[
        "Etiqueta 0 emisiones: acceso libre en zonas de bajas emisiones (ZBE)",
        "Frenado regenerativo: recupera energía cinética durante las frenadas",
        "Menor coste de mantenimiento: sin aceite motor, menos piezas mecánicas",
        "Posible aparcamiento gratuito o reducido en municipios adheridos",
        "Exento de restricciones de circulación en episodios de alta contaminación"
      ]},
      {"type":"callout","variant":"warning","title":"¡Ojo al examen!","text":"El frenado regenerativo NO consume energía — la recupera. Una pregunta frecuente intenta confundir este concepto: ''los eléctricos consumen más energía en las frenadas'' es FALSO."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Практические преимущества электромобиля"},
      {"type":"list","style":"check","title":"Преимущества BEV и ТС 0 emisiones","items":[
        "Наклейка 0 emisiones: свободный доступ в зоны с низкими выбросами (ZBE)",
        "Рекуперативное торможение: возвращает кинетическую энергию при торможении",
        "Меньшие расходы на техобслуживание: нет моторного масла, меньше механических деталей",
        "Возможна бесплатная или льготная парковка в участвующих муниципалитетах",
        "Освобождён от ограничений на движение в дни высокого загрязнения"
      ]},
      {"type":"callout","variant":"warning","title":"Внимание на экзамене!","text":"Рекуперативное торможение НЕ потребляет энергию — оно её восстанавливает. Частый вопрос-ловушка: «электромобили потребляют больше энергии при торможении» — это НЕВЕРНО."}
    ]}'
  );

  -- ── Step 11 · Quiz — authored (¿puede PHEV circular solo en eléctrico?) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"Un vehículo eléctrico híbrido enchufable (PHEV), ¿puede circular propulsado únicamente por su motor eléctrico?","options":["Sí, a voluntad puede ser propulsado solo por su motor eléctrico.","No, siempre requiere el apoyo del motor de combustión interna.","Solo en vías urbanas, nunca en carretera ni autopista."],"correct":0,"explanation":"El PHEV puede circular propulsado exclusivamente por su motor eléctrico, a voluntad del conductor. Esta es la diferencia clave respecto al HEV (que no puede enchufarse ni circular solo en eléctrico). El PHEV combina lo mejor de ambos mundos: autonomía eléctrica pura y la seguridad del motor de combustión para trayectos largos."}',
    '{"text":"Может ли подключаемый гибридный электромобиль (PHEV) ехать исключительно на электромоторе?","options":["Да, по желанию водителя он может работать только на электромоторе.","Нет, ему всегда нужна поддержка двигателя внутреннего сгорания.","Только в городе, не на шоссе и автомагистрали."],"correct":0,"explanation":"PHEV может ехать исключительно на электромоторе — по желанию водителя. В этом ключевое отличие от HEV (который нельзя заряжать от розетки и нельзя ехать только на электричестве). PHEV сочетает лучшее из двух миров: чисто электрическая автономия и надёжность ДВС для дальних поездок."}'
  );

  -- ── Step 12 · Quiz — authored (BEV vs REEV) ──────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Qué diferencia a un vehículo eléctrico de baterías (BEV) de un vehículo eléctrico de autonomía extendida (REEV)?","options":["El BEV usa solo baterías recargables; el REEV añade un motor de combustión interna que actúa como generador para recargar las baterías.","El BEV usa hidrógeno como combustible; el REEV usa baterías solamente.","Son sinónimos: ambos son vehículos eléctricos de batería sin motor de combustión."],"correct":0,"explanation":"El BEV se alimenta exclusivamente de baterías recargadas desde el exterior. El REEV es también eléctrico de baterías pero incorpora un motor de combustión que NO propulsa las ruedas directamente sino que funciona como generador para recargar las baterías cuando se agotan, extendiendo así la autonomía."}',
    '{"text":"Чем отличается аккумуляторный электромобиль (BEV) от электромобиля с расширенным запасом хода (REEV)?","options":["BEV использует только перезаряжаемые аккумуляторы; REEV добавляет ДВС, работающий как генератор для подзарядки батарей.","BEV использует водород в качестве топлива; REEV использует только аккумуляторы.","Это синонимы: оба являются аккумуляторными электромобилями без ДВС."],"correct":0,"explanation":"BEV питается исключительно от аккумуляторов, заряжаемых от внешнего источника. REEV также является аккумуляторным электромобилем, но имеет ДВС, который НЕ приводит колёса напрямую, а работает как генератор для подзарядки батарей при их разрядке, тем самым увеличивая запас хода."}'
  );

END $$;
