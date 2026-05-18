-- Lección 1.4.1 — Tipos de vías (urbana, travesía, autopista, autovía, convencional)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4: DGT 16154964 (travesía velocidad → 50 km/h → idx 0)
-- Quiz Step 5: authored (diferencia autopista vs autovía)
-- Quiz Step 8: DGT 140fd0f6 (ciclomotor autovía → No → idx 0)
-- Quiz Step 9: DGT 182635a0 (autostop en autopista peaje → No → idx 0)
-- Quiz Step 11: authored (vehículos que pueden circular por autopista/autovía)
-- Quiz Step 12: DGT 1cbb0c93 (turismo autovía máx → 120 km/h → idx 1)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.4.1',
     'Tipos de vías',
     'Типы дорог',
     24, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Vías urbanas: vía urbana y travesía ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Vías urbanas (dentro de poblado)"},
      {"type":"callout","variant":"info","title":"Vía urbana","text":"Todas las vías que transcurren DENTRO DE POBLADO, excepto las travesías. En vía urbana la velocidad máxima genérica es 50 km/h (30 km/h en vías con un solo carril por sentido)."},
      {"type":"callout","variant":"info","title":"Travesía","text":"Tramo de CARRETERA (interurbana) que discurre por poblado. Es carretera que pasa por dentro de un pueblo o ciudad. Importante: NO tendrán la consideración de travesías aquellos tramos que dispongan de una alternativa viaria o variante a la cual se tiene acceso."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🏙️","title":"Vía urbana","description":"Vía propia del poblado. Velocidad máxima: 50 km/h. Competencia municipal."},
        {"icon":"🛣️","title":"Travesía","description":"Carretera que atraviesa un poblado. Misma numeración que la carretera. Si hay variante, deja de ser travesía."}
      ]},
      {"type":"callout","variant":"warning","text":"Clave examen: la travesía ES carretera (interurbana) que pasa por poblado. No confundir con vía urbana, que es la vía propia del municipio."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Городские дороги (внутри населённого пункта)"},
      {"type":"callout","variant":"info","title":"Городская дорога (Vía urbana)","text":"Все дороги, проходящие ВНУТРИ населённого пункта, кроме траверс. Максимальная общая скорость — 50 км/ч (30 км/ч на дорогах с одной полосой в каждом направлении)."},
      {"type":"callout","variant":"info","title":"Траверса (Travesía)","text":"Участок ДОРОГИ (загородной), проходящий через населённый пункт. Это дорога, пролегающая через деревню или город. Важно: участки, имеющие альтернативный объезд или вариант, к которому есть доступ, НЕ считаются траверсами."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🏙️","title":"Городская дорога","description":"Собственная дорога населённого пункта. Макс. скорость: 50 км/ч. Муниципальная юрисдикция."},
        {"icon":"🛣️","title":"Траверса","description":"Дорога, проходящая через населённый пункт. Имеет ту же нумерацию, что и дорога. При наличии объезда перестаёт быть траверсой."}
      ]},
      {"type":"callout","variant":"warning","text":"Ключ для экзамена: траверса — это ЗАГОРОДНАЯ дорога, проходящая через населённый пункт. Не путать с городской дорогой, которая является собственной дорогой муниципалитета."}
    ]}'
  );

  -- ── Step 2 · Theory — Autopista: definición y características ────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Autopista","text":"Carretera especialmente proyectada, construida y señalizada para la EXCLUSIVA circulación de automóviles."},
      {"type":"list","style":"check","title":"Características de la autopista (a, b, c)","items":[
        "a) NO tiene acceso a ella las propiedades colindantes (acceso NULO)",
        "b) NO cruza a nivel ninguna senda, vía, línea de ferrocarril o tranvía, ni es cruzada a nivel por ninguna vía de comunicación",
        "c) Consta de DISTINTAS CALZADAS para cada sentido, separadas por mediana o franja de terreno no destinada a la circulación"
      ]},
      {"type":"callout","variant":"danger","title":"Autopista = acceso NULO a colindantes","text":"La diferencia clave con la autovía: en la autopista las propiedades colindantes NO tienen acceso. En la autovía el acceso es LIMITADO (no nulo)."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Автострада (Autopista)","text":"Дорога, специально спроектированная, построенная и обозначенная для ИСКЛЮЧИТЕЛЬНОГО движения автомобилей."},
      {"type":"list","style":"check","title":"Характеристики автострады (a, b, c)","items":[
        "a) Прилегающие объекты НЕ имеют доступа к ней (доступ НУЛЕВОЙ)",
        "b) НЕ пересекается в одном уровне ни с какой дорогой, тропой, железнодорожной или трамвайной линией",
        "c) Имеет ОТДЕЛЬНЫЕ ПРОЕЗЖИЕ ЧАСТИ для каждого направления, разделённые разделительной полосой или полосой земли, не предназначенной для движения"
      ]},
      {"type":"callout","variant":"danger","title":"Автострада = НУЛЕВОЙ доступ с прилегающих территорий","text":"Ключевое отличие от скоростной дороги: на автостраде прилегающие объекты НЕ имеют доступа. На скоростной дороге доступ ОГРАНИЧЕННЫЙ (не нулевой)."}
    ]}'
  );

  -- ── Step 3 · Theory — Autovía vs Autopista: diferencias clave ────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Autovía","text":"Carretera especialmente proyectada, construida y señalizada para la exclusiva circulación de automóviles, con características similares a la autopista pero con dos diferencias clave:"},
      {"type":"list","style":"arrow","title":"Diferencias autovía vs autopista","items":[
        "ACCESO: Autopista = acceso NULO de colindantes. Autovía = acceso LIMITADO de colindantes",
        "CICLISTAS: Autopista = prohibido totalmente. Autovía = los ciclistas de MÁS de 14 años pueden circular EXCEPCIONALMENTE por los arcenes (salvo señalización prohibitoria)"
      ]},
      {"type":"table","headers":["Característica","Autopista","Autovía"],"rows":[
        ["Acceso colindantes","❌ Ninguno","⚠️ Limitado"],
        ["Calzadas separadas","✅ Sí","✅ Sí"],
        ["Cruces a nivel","❌ Ninguno","❌ Ninguno"],
        ["Ciclistas >14 años","❌ Prohibido","⚠️ Arcén (excepcional)"],
        ["Señalización","Fondo azul","Fondo azul"]
      ]},
      {"type":"callout","variant":"info","title":"Vía para automóviles","text":"Vía reservada exclusivamente a la circulación de automóviles, con UNA SOLA CALZADA y con limitación total de accesos a las propiedades colindantes. Menos común que autopista o autovía."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Скоростная дорога (Autovía)","text":"Дорога, специально спроектированная, построенная и обозначенная для исключительного движения автомобилей, с характеристиками, аналогичными автостраде, но с двумя ключевыми отличиями:"},
      {"type":"list","style":"arrow","title":"Отличия скоростной дороги от автострады","items":[
        "ДОСТУП: Автострада = доступ НУЛЕВОЙ. Скоростная дорога = доступ ОГРАНИЧЕННЫЙ",
        "ВЕЛОСИПЕДИСТЫ: Автострада = полностью запрещено. Скоростная дорога = велосипедисты СТАРШЕ 14 лет могут ИСКЛЮЧИТЕЛЬНО ехать по обочинам (если нет запрещающих знаков)"
      ]},
      {"type":"table","headers":["Характеристика","Автострада","Скоростная дорога"],"rows":[
        ["Доступ с прилегающих","❌ Никакого","⚠️ Ограниченный"],
        ["Разделённые полосы","✅ Да","✅ Да"],
        ["Пересечения в уровне","❌ Никаких","❌ Никаких"],
        ["Велосипедисты >14 лет","❌ Запрещено","⚠️ Обочина (исключит.)"],
        ["Знаки","Синий фон","Синий фон"]
      ]},
      {"type":"callout","variant":"info","title":"Дорога для автомобилей (Vía para automóviles)","text":"Дорога, зарезервированная исключительно для движения автомобилей, с ОДНОЙ ПРОЕЗЖЕЙ ЧАСТЬЮ и полным ограничением доступа с прилегающих территорий. Встречается реже, чем автострада или скоростная дорога."}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 16154964 (travesía velocidad 50 km/h) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"En una travesía sin señales de velocidad, ¿cuál es la velocidad máxima permitida?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/16154964-f7dc-47ef-bd63-8c702ad1ed03_1768753720443.webp","options":["50 km/h.","60 km/h.","40 km/h."],"correct":0,"explanation":"En una travesía sin señales de velocidad la velocidad máxima permitida es 50 km/h, igual que en el resto de vías urbanas. La travesía es un tramo de carretera que discurre por poblado, por lo que se aplican los límites urbanos."}',
    '{"text":"Какова максимальная разрешённая скорость в траверсе при отсутствии знаков ограничения скорости?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/16154964-f7dc-47ef-bd63-8c702ad1ed03_1768753720443.webp","options":["50 км/ч.","60 км/ч.","40 км/ч."],"correct":0,"explanation":"В траверсе при отсутствии знаков ограничения скорости максимально разрешённая скорость — 50 км/ч, как и на остальных городских дорогах. Траверса — участок загородной дороги, проходящий через населённый пункт, поэтому применяются городские ограничения скорости."}'
  );

  -- ── Step 5 · Quiz — authored (autopista vs autovía acceso) ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"¿Cuál es la principal diferencia entre una autopista y una autovía respecto al acceso de las propiedades colindantes?","options":["En la autopista el acceso está limitado; en la autovía está prohibido totalmente.","En la autopista no hay ningún acceso de colindantes; en la autovía el acceso está limitado.","No hay ninguna diferencia entre autopista y autovía en este aspecto."],"correct":1,"explanation":"La diferencia clave en cuanto al acceso: en la AUTOPISTA las propiedades colindantes NO tienen acceso (acceso nulo). En la AUTOVÍA el acceso es LIMITADO. Además, los ciclistas mayores de 14 años pueden circular excepcionalmente por los arcenes de la autovía, pero no de la autopista."}',
    '{"text":"В чём основное различие между автострадой (autopista) и скоростной дорогой (autovía) в отношении доступа с прилегающих территорий?","options":["На автостраде доступ ограниченный; на скоростной дороге полностью запрещён.","На автостраде доступ с прилегающих отсутствует; на скоростной дороге доступ ограниченный.","Никакого различия между автострадой и скоростной дорогой в этом отношении нет."],"correct":1,"explanation":"Ключевое отличие по доступу: у АВТОСТРАДЫ прилегающие объекты НЕ имеют доступа (нулевой). У СКОРОСТНОЙ ДОРОГИ доступ ОГРАНИЧЕННЫЙ. Кроме того, велосипедисты старше 14 лет могут исключительно ехать по обочинам скоростной дороги, но не автострады."}'
  );

  -- ── Step 6 · Theory — Carretera convencional ──────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Carretera convencional","text":"Carretera que NO reúne las características propias de las autopistas, autovías y vías para automóviles. Es el tipo de carretera más común fuera de poblado. Puede tener uno o varios carriles por sentido, cruces a nivel, y acceso directo desde propiedades colindantes."},
      {"type":"heading","text":"Resumen: tipos de vías interurbanas"},
      {"type":"table","headers":["Tipo","Calzadas","Acceso colindantes","Cruces a nivel","Ciclistas"],"rows":[
        ["Autopista","2 (separadas)","❌ Ninguno","❌ Ninguno","❌ Prohibido"],
        ["Autovía","2 (separadas)","⚠️ Limitado","❌ Ninguno","⚠️ Arcén >14 años"],
        ["Vía p/ automóviles","1 sola","❌ Ninguno","❌ Ninguno","❌ Prohibido"],
        ["Carretera convencional","1 o varias","✅ Sí","✅ Sí","✅ Permitido"]
      ]},
      {"type":"callout","variant":"warning","text":"Dato clave: la carretera convencional es la única vía interurbana donde los ciclistas tienen pleno derecho de circulación (como en cualquier vía). En autopista: prohibido. En autovía: solo arcén y >14 años."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Обычная дорога (Carretera convencional)","text":"Дорога, НЕ имеющая характеристик автострады, скоростной дороги и дороги для автомобилей. Наиболее распространённый тип загородной дороги. Может иметь одну или несколько полос в каждом направлении, одноуровневые пересечения и прямой доступ с прилегающих территорий."},
      {"type":"heading","text":"Сводка: типы загородных дорог"},
      {"type":"table","headers":["Тип","Проезжие части","Доступ с прилегающих","Пересечения в уровне","Велосипедисты"],"rows":[
        ["Автострада","2 (разделённые)","❌ Никакого","❌ Никаких","❌ Запрещено"],
        ["Скоростная дорога","2 (разделённые)","⚠️ Ограниченный","❌ Никаких","⚠️ Обочина >14 лет"],
        ["Дорога для авто","1 одна","❌ Никакого","❌ Никаких","❌ Запрещено"],
        ["Обычная дорога","1 или несколько","✅ Да","✅ Да","✅ Разрешено"]
      ]},
      {"type":"callout","variant":"warning","text":"Ключевой факт: обычная дорога — единственная загородная, где велосипедисты имеют полное право на движение. На автостраде — запрещено. На скоростной — только обочина и >14 лет."}
    ]}'
  );

  -- ── Step 7 · Theory — Vehículos prohibidos y permitidos en autopista/autovía
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"heading","text":"¿Quién puede circular por autopista y autovía?"},
      {"type":"list","style":"check","title":"PUEDEN circular","items":[
        "Automóviles capaces de desarrollar en llano una velocidad de 60 km/h",
        "Vehículos especiales que superen masas y dimensiones establecidas: si su autorización especial lo indica",
        "Vehículos especiales que NO superen masas y dimensiones: si pueden superar 60 km/h en llano"
      ]},
      {"type":"list","style":"cross","title":"PROHIBIDO circular","items":[
        "Vehículos de tracción animal",
        "Ciclos (bicicletas) — salvo excepción en autovía",
        "Ciclomotores",
        "Ciclos de motor",
        "Vehículos para personas de movilidad reducida (VMR)",
        "Peatones",
        "Animales",
        "Vehículos de movilidad personal (VMP: patinetes, etc.)"
      ]},
      {"type":"callout","variant":"tip","title":"Excepción importante — solo autovía","text":"Los conductores de bicicletas de MÁS de 14 años pueden circular por los ARCENES de las autovías, salvo que por razones de seguridad vial se prohíba mediante señalización. Esta excepción NO aplica a las autopistas."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Кто может ехать по автостраде и скоростной дороге?"},
      {"type":"list","style":"check","title":"МОГУТ ехать","items":[
        "Автомобили, способные развивать скорость 60 км/ч на ровной дороге",
        "Специальные ТС, превышающие установленные массы и размеры: при наличии соответствующего специального разрешения",
        "Специальные ТС, НЕ превышающие массы и размеры: если могут превысить 60 км/ч на ровной дороге"
      ]},
      {"type":"list","style":"cross","title":"ЗАПРЕЩЕНО ехать","items":[
        "Транспортные средства с животной тягой",
        "Велосипеды — кроме исключения на скоростной дороге",
        "Мопеды",
        "Мотовелосипеды",
        "Транспортные средства для людей с ограниченными возможностями",
        "Пешеходы",
        "Животные",
        "Средства индивидуальной мобильности (самокаты и т.д.)"
      ]},
      {"type":"callout","variant":"tip","title":"Важное исключение — только скоростная дорога","text":"Велосипедисты СТАРШЕ 14 лет могут ехать по ОБОЧИНАМ скоростных дорог (autovías), если только безопасность не требует запрета по знакам. Это исключение НЕ распространяется на автострады."}
    ]}'
  );

  -- ── Step 8 · Quiz — DGT 140fd0f6 (ciclomotor en autovía → No) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"¿Por una autovía, puede circular un ciclomotor?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-017/140fd0f6-0e06-4ace-ba0c-b217e3ac807e_1768819694226_pro.webp","options":["No.","Depende de la velocidad a la que circule.","Sí, por el arcén."],"correct":0,"explanation":"No, los ciclomotores tienen prohibida la circulación por autopistas y autovías. La excepción del arcén de autovía solo aplica a las bicicletas conducidas por mayores de 14 años, no a los ciclomotores. Los ciclomotores deben circular por carreteras convencionales."}',
    '{"text":"Разрешено ли мопеду двигаться по скоростной дороге (autovía)?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-017/140fd0f6-0e06-4ace-ba0c-b217e3ac807e_1768819694226_pro.webp","options":["Нет.","Это зависит от скорости, с которой он движется.","Да, по обочине."],"correct":0,"explanation":"Нет, мопедам запрещено движение по автострадам и скоростным дорогам. Исключение для обочины скоростной дороги применяется только к велосипедам под управлением лиц старше 14 лет, но не к мопедам. Мопеды должны ездить по обычным дорогам."}'
  );

  -- ── Step 9 · Quiz — DGT 182635a0 (autostop en autopista peaje) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"En la explanada de peaje de una autopista, ¿está permitido recoger a una persona que hace autostop?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-013/182635a0-148c-4e70-9345-89121830e09c_1768756167832.webp","options":["No.","Solo si no existe riesgo para otros usuarios de la vía.","Sí."],"correct":0,"explanation":"No está permitido recoger a personas que hacen autostop en las explanadas de peaje de una autopista. Los peatones tienen prohibido el acceso a autopistas y autovías, por lo que tampoco se puede parar para recogerlos en ningún punto de estas vías."}',
    '{"text":"Разрешено ли подбирать человека, занимающегося автостопом, на площадке пункта оплаты на автомагистрали?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-013/182635a0-148c-4e70-9345-89121830e09c_1768756167832.webp","options":["Нет.","Только если это не представляет опасности для других участников дорожного движения.","Да."],"correct":0,"explanation":"Подбирать автостопщиков на площадках пунктов оплаты автомагистрали запрещено. Пешеходам запрещён доступ на автострады и скоростные дороги, поэтому также нельзя останавливаться, чтобы подобрать кого-либо в любой точке этих дорог."}'
  );

  -- ── Step 10 · Theory — Resumen tipos urbanos + tabla completa ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Resumen: todos los tipos de vías"},
      {"type":"table","headers":["Tipo","Dentro/Fuera","Vel. máx. turismo","Peculiaridad"],"rows":[
        ["Vía urbana","Dentro","50 km/h (30 en 1 carril)","Competencia municipal"],
        ["Travesía","Dentro (carretera)","50 km/h","Carretera que pasa por poblado"],
        ["Autopista","Fuera","120 km/h","2 calzadas, acceso nulo, pago posible"],
        ["Autovía","Fuera","120 km/h","2 calzadas, acceso limitado, gratuita"],
        ["Vía p/ automóviles","Fuera","120 km/h","1 calzada, acceso nulo"],
        ["Carretera convencional","Fuera","90 km/h","Cruces a nivel, acceso libre"]
      ]},
      {"type":"callout","variant":"warning","text":"Diferencia autopista vs autovía: la autopista puede ser de pago (peaje). La autovía generalmente es gratuita. Pero la diferencia LEGAL es el acceso de colindantes: nulo (autopista) vs limitado (autovía)."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сводка: все типы дорог"},
      {"type":"table","headers":["Тип","В/Вне нас. пункта","Макс. скорость авто","Особенность"],"rows":[
        ["Городская дорога","Внутри","50 км/ч (30 в 1 полосе)","Муниципальная юрисдикция"],
        ["Траверса","Внутри (дорога)","50 км/ч","Загородная дорога через город"],
        ["Автострада","Вне","120 км/ч","2 части, нулевой доступ, возможна плата"],
        ["Скоростная дорога","Вне","120 км/ч","2 части, ограниченный доступ, бесплатная"],
        ["Дорога для авто","Вне","120 км/ч","1 часть, нулевой доступ"],
        ["Обычная дорога","Вне","90 км/ч","Одноуровневые пересечения, свободный доступ"]
      ]},
      {"type":"callout","variant":"warning","text":"Отличие автострады от скоростной: автострада может быть платной (tollway). Скоростная дорога — как правило, бесплатная. Но юридическое различие — доступ с прилегающих: нулевой (автострада) vs ограниченный (скоростная дорога)."}
    ]}'
  );

  -- ── Step 11 · Quiz — authored (vel. mínima para usar autopista/autovía) ───
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"¿Qué velocidad mínima en llano debe poder alcanzar un automóvil para poder circular por autopistas y autovías?","options":["50 km/h","60 km/h","80 km/h"],"correct":1,"explanation":"Para poder circular por autopistas y autovías, los automóviles deben ser capaces de desarrollar en llano una velocidad de 60 km/h. Los vehículos que no alcancen esa velocidad mínima tienen prohibida la circulación por estas vías."}',
    '{"text":"Какую минимальную скорость на ровной дороге должен развивать автомобиль, чтобы иметь право ехать по автостраде или скоростной дороге?","options":["50 км/ч","60 км/ч","80 км/ч"],"correct":1,"explanation":"Для движения по автострадам и скоростным дорогам автомобили должны быть способны развивать на ровной дороге скорость 60 км/ч. Транспортные средства, не достигающие этой минимальной скорости, не имеют права ехать по этим дорогам."}'
  );

  -- ── Step 12 · Quiz — DGT 1cbb0c93 (turismo autovía 120 km/h) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"Un turismo por una autovía, ¿a qué velocidad máxima puede circular?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/1cbb0c93-ea8f-400a-bd44-46c7310d3441.webp","options":["140 km/h.","120 km/h.","100 km/h."],"correct":1,"explanation":"Un turismo puede circular por autovía a una velocidad máxima de 120 km/h. Este es el límite genérico para turismos tanto en autopista como en autovía. Otros vehículos (camiones, autobuses, vehículos con remolque) tienen límites inferiores."}',
    '{"text":"С какой максимальной скоростью может двигаться легковой автомобиль по скоростной дороге (autovía)?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/1cbb0c93-ea8f-400a-bd44-46c7310d3441.webp","options":["140 км/ч.","120 км/ч.","100 км/ч."],"correct":1,"explanation":"Легковой автомобиль может двигаться по скоростной дороге с максимальной скоростью 120 км/ч. Это общий лимит для легковых автомобилей как на автостраде, так и на скоростной дороге. Для других ТС (грузовиков, автобусов, ТС с прицепом) лимиты ниже."}'
  );

END $$;
