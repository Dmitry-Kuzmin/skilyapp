-- Lección 1.2.10 — Tractocamión, conjuntos de vehículos y remolques
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4:  DGT 6bd3bfaf  (documento todos los remolques → tarjeta ITV → pos 3 → idx 2)
-- Quiz Step 5:  DGT 2dacea2f  (permiso turismo + remolque <750 kg → B → pos 3 → idx 2)
-- Quiz Step 8:  DGT 4d205488  (seguro remolque → solo si MMA >750 kg → pos 3 → idx 2)
-- Quiz Step 9:  DGT 1b78e9b8  (turismo remolque ligero autopista 90 km/h → pos 3 → idx 2)
-- Quiz Step 11: authored (diferencia tren de carretera vs vehículo articulado)
-- Quiz Step 12: authored (¿qué necesita el remolque pesado que el ligero no necesita?)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.10',
     'Tractocamión, conjuntos de vehículos y remolques',
     'Тягач, автопоезда и прицепы',
     17, 30, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Tractocamión y conjuntos ────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Tractocamión (R.G.C.)","text":"Automóvil concebido y construido para realizar, principalmente, el arrastre de un semirremolque."},
      {"type":"callout","variant":"info","title":"Tren de carretera (R.G.C.)","text":"Automóvil constituido por un vehículo de motor enganchado a un remolque."},
      {"type":"callout","variant":"info","title":"Vehículo articulado (R.G.C.)","text":"Automóvil constituido por un vehículo de motor acoplado a un semirremolque."},
      {"type":"callout","variant":"danger","text":"Clave del examen: remolque = eje trasero propio y engancha al vehículo tractor. Semirremolque = NO tiene eje delantero propio; su parte delantera descansa sobre el tractocamión. Esta diferencia define si es TREN o ARTICULADO."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Тягач — tractocamión (R.G.C.)","text":"Автомобиль, разработанный и построенный преимущественно для буксировки полуприцепа."},
      {"type":"callout","variant":"info","title":"Автопоезд — tren de carretera (R.G.C.)","text":"Автомобиль, состоящий из механического транспортного средства, сцепленного с прицепом."},
      {"type":"callout","variant":"info","title":"Сочленённое ТС — vehículo articulado (R.G.C.)","text":"Автомобиль, состоящий из механического транспортного средства, сцепленного с полуприцепом."},
      {"type":"callout","variant":"danger","text":"Ключ экзамена: прицеп = имеет собственную заднюю ось и цепляется к тягачу. Полуприцеп = НЕ имеет собственной передней оси; его передняя часть опирается на тягач. Это различие определяет, является ли конструкция АВТОПОЕЗДОМ или СОЧЛЕНЁННЫМ ТС."}
    ]}'
  );

  -- ── Step 2 · Theory — Remolque ligero vs pesado ───────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Remolque ligero (R.G.C.)","text":"Remolque con masa máxima autorizada (MMA) de hasta 750 kg."},
      {"type":"callout","variant":"info","title":"Remolque pesado (R.G.C.)","text":"Remolque con masa máxima autorizada (MMA) superior a 750 kg."},
      {"type":"stats","stats":[
        {"value":"750 kg","label":"frontera ligero/pesado","note":"MMA = Masa Máxima Autorizada"},
        {"value":"≤750 kg","label":"remolque ligero","note":"menos burocracia y trámites"},
        {"value":">750 kg","label":"remolque pesado","note":"ITV, permiso y seguro propio"}
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Лёгкий прицеп — remolque ligero (R.G.C.)","text":"Прицеп с максимально допустимой массой (MMA) до 750 кг включительно."},
      {"type":"callout","variant":"info","title":"Тяжёлый прицеп — remolque pesado (R.G.C.)","text":"Прицеп с максимально допустимой массой (MMA) более 750 кг."},
      {"type":"stats","stats":[
        {"value":"750 кг","label":"граница лёгкий/тяжёлый","note":"MMA = максимально допустимая масса"},
        {"value":"≤750 кг","label":"лёгкий прицеп","note":"меньше бюрократии и процедур"},
        {"value":">750 кг","label":"тяжёлый прицеп","note":"ITV, разрешение и собственная страховка"}
      ]}
    ]}'
  );

  -- ── Step 3 · Theory — Tabla comparativa ligero vs pesado ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"table","headers":["Requisito","Remolque ligero (≤750 kg)","Remolque pesado (>750 kg)"],"rows":[
        ["Ficha de inspección técnica","SÍ","SÍ"],
        ["ITV periódica","NO","SÍ"],
        ["Permiso de circulación","NO","SÍ"],
        ["Seguro obligatorio propio","NO (cubierto por tractor)","SÍ"],
        ["Permiso conducción","B (si tractor es B)","B+E o C+E según conjunto"]
      ],"caption":"Todos los remolques tienen ficha ITV — la diferencia está en si pasan ITV periódica y necesitan permiso"},
      {"type":"callout","variant":"warning","text":"¡Ojo! La ficha de inspección técnica la tienen TODOS los remolques (ligeros y pesados). Lo que NO tiene el remolque ligero es la ITV periódica ni permiso de circulación propio."}
    ]}',
    '{"blocks":[
      {"type":"table","headers":["Требование","Лёгкий прицеп (≤750 кг)","Тяжёлый прицеп (>750 кг)"],"rows":[
        ["Карточка техосмотра (ficha ITV)","ДА","ДА"],
        ["Периодический техосмотр (ITV)","НЕТ","ДА"],
        ["Разрешение на движение","НЕТ","ДА"],
        ["Собственная страховка","НЕТ (покрывается тягачом)","ДА"],
        ["Категория прав","B (если тягач B)","B+E или C+E, в зависимости"]
      ],"caption":"Карточка ITV есть у ВСЕХ прицепов — разница в том, проходят ли они периодический техосмотр и нужно ли им отдельное разрешение"},
      {"type":"callout","variant":"warning","text":"Важно! Карточка техосмотра (ficha ITV) есть у ВСЕХ прицепов (лёгких и тяжёлых). У лёгкого прицепа НЕТ ни периодического ITV, ни собственного разрешения на движение."}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 6bd3bfaf (documento todos los remolques) ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Qué documento tienen que llevar todos los remolques?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-001/6bd3bfaf-713e-42f9-a743-0165caf45d53_1768934966697_pro.webp","options":["El permiso de circulación, solamente.","La tarjeta ITV y el permiso de circulación.","La tarjeta ITV, solamente."],"correct":2,"explanation":"Todos los remolques, tanto ligeros como pesados, deben llevar la tarjeta ITV (ficha de inspección técnica). Sin embargo, el remolque ligero (MMA ≤750 kg) NO necesita permiso de circulación propio. El pesado sí necesita ambos documentos, pero la tarjeta ITV es el único documento exigido a todos los remolques sin excepción."}',
    '{"text":"Какой документ должны иметь все прицепы?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-001/6bd3bfaf-713e-42f9-a743-0165caf45d53_1768934966697_pro.webp","options":["Только разрешение на движение.","Карточку ITV и разрешение на движение.","Только карточку ITV."],"correct":2,"explanation":"Все прицепы — как лёгкие, так и тяжёлые — обязаны иметь карточку ITV (ficha de inspección técnica). При этом лёгкий прицеп (MMA ≤750 кг) НЕ нуждается в собственном разрешении на движение. Тяжёлый нуждается в обоих документах, но карточка ITV — единственный документ, обязательный для всех прицепов без исключения."}'
  );

  -- ── Step 5 · Quiz — DGT 2dacea2f (permiso turismo + remolque <750 kg) ─────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"Para conducir un turismo con un remolque de menos de 750 kg de MMA, ¿qué permiso, al menos, se necesita?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-003/2dacea2f-6c07-4a3d-adce-bb382f23ae60.webp","options":["El de la clase C1, al ser un remolque ligero.","El de la clase BE.","El de la clase B."],"correct":2,"explanation":"Para conducir un turismo con un remolque ligero (MMA inferior a 750 kg), basta con el permiso B. No se necesita el BE ni el C1. El permiso BE sería necesario si el remolque supera los 750 kg y el conjunto supera los 3.500 kg de MMA total."}',
    '{"text":"Для управления легковым автомобилем с прицепом менее 750 кг MMA, какая категория прав требуется как минимум?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-003/2dacea2f-6c07-4a3d-adce-bb382f23ae60.webp","options":["Категория C1, так как это лёгкий прицеп.","Категория BE.","Категория B."],"correct":2,"explanation":"Для управления легковым автомобилем с лёгким прицепом (MMA менее 750 кг) достаточно прав категории B. BE и C1 не нужны. Права BE потребуются, если прицеп превышает 750 кг и суммарная MMA состава превышает 3500 кг."}'
  );

  -- ── Step 6 · Theory — Velocidades con remolque ────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Velocidades máximas con remolque"},
      {"type":"table","headers":["Tipo de vía","Turismo + remolque ligero","Turismo + remolque pesado"],"rows":[
        ["Autopista / autovía","90 km/h","80 km/h"],
        ["Carretera convencional","80 km/h","80 km/h"],
        ["Vía urbana","50 km/h","50 km/h"]
      ],"caption":"El turismo sin remolque va a 120 km/h en autopista — con remolque baja a 90 km/h como máximo"},
      {"type":"callout","variant":"danger","text":"Importante: arrastrar un remolque SIEMPRE reduce la velocidad máxima. El turismo con remolque ligero pasa de 120 km/h a 90 km/h en autopista. Nunca puede superar esa velocidad para adelantar."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Максимальные скорости с прицепом"},
      {"type":"table","headers":["Тип дороги","Легковой + лёгкий прицеп","Легковой + тяжёлый прицеп"],"rows":[
        ["Автомагистраль / autovía","90 км/ч","80 км/ч"],
        ["Обычная дорога","80 км/ч","80 км/ч"],
        ["Городская дорога","50 км/ч","50 км/ч"]
      ],"caption":"Легковой без прицепа едет 120 км/ч на автомагистрали — с прицепом максимум 90 км/ч"},
      {"type":"callout","variant":"danger","text":"Важно: буксировка прицепа ВСЕГДА снижает максимальную скорость. Легковой с лёгким прицепом снижается с 120 до 90 км/ч на автомагистрали. Для обгона превышать эту скорость нельзя."}
    ]}'
  );

  -- ── Step 7 · Theory — Permisos para conjuntos ─────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"list","style":"arrow","title":"Permisos necesarios según el conjunto","items":[
        "B: turismo + remolque ≤750 kg MMA",
        "B+E: turismo + remolque >750 kg (si el conjunto supera 3.500 kg MMA total)",
        "C: camión >3.500 kg MMA sin remolque",
        "C+E: camión >3.500 kg + remolque >750 kg (tren de carretera)",
        "C+E: tractocamión + semirremolque (vehículo articulado)"
      ]},
      {"type":"callout","variant":"tip","title":"Truco: la E siempre significa ''más remolque''","text":"Cualquier permiso con +E significa que el conductor puede arrastrar remolques por encima del límite básico. B → solo ligero. B+E → pesado. C → camión solo. C+E → camión pesado con remolque o tractocamión."}
    ]}',
    '{"blocks":[
      {"type":"list","style":"arrow","title":"Необходимые права в зависимости от состава","items":[
        "B: легковой + прицеп ≤750 кг MMA",
        "B+E: легковой + прицеп >750 кг (если суммарная MMA состава >3500 кг)",
        "C: грузовик >3500 кг MMA без прицепа",
        "C+E: грузовик >3500 кг + прицеп >750 кг (автопоезд)",
        "C+E: тягач + полуприцеп (сочленённое ТС)"
      ]},
      {"type":"callout","variant":"tip","title":"Подсказка: «E» всегда означает «плюс прицеп»","text":"Любые права с +E означают, что водитель может буксировать прицепы сверх базового лимита. B → только лёгкий. B+E → тяжёлый. C → только грузовик. C+E → тяжёлый грузовик с прицепом или тягач."}
    ]}'
  );

  -- ── Step 8 · Quiz — DGT 4d205488 (seguro remolque solo si >750 kg) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"En su turismo lleva enganchado un remolque, ¿debe concertar el seguro obligatorio para el remolque?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-002/4d205488-01ba-4584-bd82-97a0706e3936_1768988471521_pro.webp","options":["No, sólo para el turismo.","Sí, cualquiera que sea la MMA del remolque.","Sí, pero sólo si la MMA del remolque supera los 750 kg."],"correct":2,"explanation":"El seguro obligatorio del remolque es necesario únicamente cuando su MMA supera los 750 kg (remolque pesado). El remolque ligero (MMA ≤750 kg) queda cubierto por el seguro del vehículo tractor y no necesita póliza propia. Este dato distingue remolque ligero (sin seguro propio) de remolque pesado (seguro propio obligatorio)."}',
    '{"text":"У вашего легкового автомобиля прицеплен прицеп — нужно ли оформлять обязательную страховку на прицеп?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-002/4d205488-01ba-4584-bd82-97a0706e3936_1768988471521_pro.webp","options":["Нет, только на легковой автомобиль.","Да, независимо от MMA прицепа.","Да, но только если MMA прицепа превышает 750 кг."],"correct":2,"explanation":"Обязательная страховка для прицепа нужна только в том случае, если его MMA превышает 750 кг (тяжёлый прицеп). Лёгкий прицеп (MMA ≤750 кг) покрывается страховкой тягача и не требует собственного полиса. Это отличает лёгкий прицеп (без собственной страховки) от тяжёлого (со своей обязательной страховкой)."}'
  );

  -- ── Step 9 · Quiz — DGT 1b78e9b8 (turismo remolque ligero autopista 90) ───
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"Un turismo que arrastra un remolque ligero, ¿a qué velocidad máxima puede circular por autopista o autovía?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/1b78e9b8-6cd0-4814-996c-65a1d29870c8.webp","options":["A 100 km/h.","A 80 km/h.","A 90 km/h."],"correct":2,"explanation":"Un turismo con remolque ligero tiene una velocidad máxima de 90 km/h en autopista o autovía, aunque el turismo sin remolque pueda circular a 120 km/h. El hecho de arrastrar un remolque, aunque sea ligero, reduce la velocidad máxima permitida en todo tipo de vías."}',
    '{"text":"Легковой автомобиль, буксирующий лёгкий прицеп, — с какой максимальной скоростью он может ехать по автомагистрали или autovía?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/1b78e9b8-6cd0-4814-996c-65a1d29870c8.webp","options":["100 км/ч.","80 км/ч.","90 км/ч."],"correct":2,"explanation":"Легковой автомобиль с лёгким прицепом имеет максимальную скорость 90 км/ч на автомагистрали, даже если без прицепа он может ехать 120 км/ч. Буксировка прицепа, даже лёгкого, снижает допустимую максимальную скорость на любом типе дороги."}'
  );

  -- ── Step 10 · Theory — Mnemónica 750 kg ──────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Mnemotecnia: ''750 = la frontera de todo''","text":"750 kg es el número que lo cambia todo en remolques. Por encima: ITV periódica, permiso de circulación, seguro propio y permiso B+E. Por debajo: solo ficha ITV y permiso B es suficiente."},
      {"type":"callout","variant":"tip","title":"Remolque vs semirremolque — imagen mental","text":"Remolque: tiene ruedas propias delante y detrás → puede desengancharse y quedarse solo. Semirremolque: sin ruedas delanteras propias → su parte frontal cae si lo desenganchas. El tractocamión soporta esa parte delantera."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Мнемоника: «750 — граница всего»","text":"750 кг — число, которое меняет всё для прицепов. Свыше: периодический ITV, разрешение на движение, собственная страховка и права B+E. До 750: только карточка ITV, достаточно прав категории B."},
      {"type":"callout","variant":"tip","title":"Прицеп vs полуприцеп — зрительный образ","text":"Прицеп: есть собственные колёса спереди и сзади → можно отцепить, он будет стоять сам. Полуприцеп: нет собственных передних колёс → если отцепить, передняя часть упадёт. Тягач удерживает эту переднюю часть."}
    ]}'
  );

  -- ── Step 11 · Quiz — authored (tren de carretera vs articulado) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"¿Cuál es la diferencia entre un tren de carretera y un vehículo articulado?","options":["El tren de carretera usa un semirremolque; el articulado usa un remolque.","El tren de carretera está formado por un vehículo motor y un remolque; el articulado, por un vehículo motor y un semirremolque.","Son sinónimos, ambos se forman con un tractocamión y un semirremolque."],"correct":1,"explanation":"El tren de carretera es la combinación de un vehículo motor + remolque (el remolque tiene eje propio y se engancha detrás). El vehículo articulado es la combinación de un vehículo motor (tractocamión) + semirremolque (sin eje delantero propio, apoya sobre el tractor). Son combinaciones distintas con nombres y normativas diferentes."}',
    '{"text":"В чём разница между автопоездом (tren de carretera) и сочленённым транспортным средством (vehículo articulado)?","options":["Автопоезд использует полуприцеп; сочленённое ТС использует прицеп.","Автопоезд — это тягач + прицеп; сочленённое ТС — тягач + полуприцеп.","Это синонимы, оба состоят из тягача и полуприцепа."],"correct":1,"explanation":"Автопоезд — это комбинация механического ТС + прицеп (прицеп имеет собственную ось и цепляется сзади). Сочленённое ТС — это комбинация тягача + полуприцеп (нет собственной передней оси, опирается на тягач). Это разные составы с разными названиями и нормами."}'
  );

  -- ── Step 12 · Quiz — authored (ligero vs pesado diferencias) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Qué requisitos tiene el remolque pesado (MMA > 750 kg) que NO tiene el remolque ligero?","options":["Ficha de inspección técnica y seguro obligatorio.","ITV periódica, permiso de circulación propio y seguro obligatorio propio.","Solo el permiso de circulación."],"correct":1,"explanation":"El remolque pesado (MMA >750 kg) necesita tres cosas que el ligero no necesita: ITV periódica, permiso de circulación propio y seguro obligatorio propio. El remolque ligero solo necesita la ficha ITV (que sí tienen todos los remolques) y queda cubierto por el seguro del vehículo tractor."}',
    '{"text":"Какие требования предъявляются к тяжёлому прицепу (MMA >750 кг), которых НЕТ у лёгкого прицепа?","options":["Карточка техосмотра и обязательная страховка.","Периодический ITV, собственное разрешение на движение и собственная обязательная страховка.","Только разрешение на движение."],"correct":1,"explanation":"Тяжёлый прицеп (MMA >750 кг) требует три вещи, которых не требует лёгкий: периодический техосмотр (ITV), собственное разрешение на движение и собственную обязательную страховку. Лёгкий прицеп требует только карточку ITV (которая есть у всех прицепов) и покрывается страховкой тягача."}'
  );

END $$;
