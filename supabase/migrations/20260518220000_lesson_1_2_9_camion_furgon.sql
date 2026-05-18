-- Lección 1.2.9 — Camión y furgón/furgoneta
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 4:  DGT 6a22a3d5  (furgoneta máx 9 plazas → pos 1 → idx 0)
-- Quiz Step 5:  DGT 277b5ebc  (camión <3500 kg autovía 90 km/h → pos 1 → idx 0)
-- Quiz Step 8:  DGT 93a0ee3d  (furgoneta ITV bienal hasta 6 años → pos 1 → idx 0)
-- Quiz Step 9:  DGT 7f70f72a  (siniestralidad furgones 15-16h → pos 3 → idx 2)
-- Quiz Step 11: authored (diferencia camión vs furgón)
-- Quiz Step 12: DGT 794431be  (camión 3500 kg carretera 80 km/h → pos 2 → idx 1)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.9',
     'Camión y furgón/furgoneta',
     'Грузовик и фургон/фургонетта',
     15, 30, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Definiciones legales ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Camión (R.G.C.)","text":"Automóvil con cuatro ruedas o más, concebido y construido para el transporte de mercancías. Como máximo tendrá 9 plazas, incluyendo al conductor. La cabina NO está integrada en la carrocería."},
      {"type":"callout","variant":"info","title":"Furgón / Furgoneta (R.G.C.)","text":"Automóvil con cuatro ruedas o más, concebido y construido para el transporte de mercancías. Como máximo tendrá 9 plazas, incluyendo al conductor. La cabina SÍ está integrada en la carrocería."},
      {"type":"callout","variant":"danger","text":"La única diferencia entre camión y furgón es la carrocería: en el camión la cabina NO está integrada (chasis + caja separados); en el furgón la cabina SÍ está integrada. Ambos transportan mercancías y tienen máx. 9 plazas."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Грузовик — camión (R.G.C.)","text":"Автомобиль с четырьмя колёсами и более, разработанный и построенный для перевозки грузов. Максимум 9 мест, включая водителя. Кабина НЕ является частью кузова."},
      {"type":"callout","variant":"info","title":"Фургон / фургонетта — furgón / furgoneta (R.G.C.)","text":"Автомобиль с четырьмя колёсами и более, разработанный и построенный для перевозки грузов. Максимум 9 мест, включая водителя. Кабина ЯВЛЯЕТСЯ частью кузова."},
      {"type":"callout","variant":"danger","text":"Единственное отличие грузовика от фургона — кузов: у грузовика кабина НЕ интегрирована (рама + кузов отдельно); у фургона кабина интегрирована. Оба перевозят грузы и имеют макс. 9 мест."}
    ]}'
  );

  -- ── Step 2 · Theory — Comparativa visual ──────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚛","title":"Camión","description":"Cabina separada del compartimento de carga. Chasis visible entre cabina y caja. El conductor queda adelantado respecto a la carga. Ejemplos: camiones de plataforma, cisternas, frigoríficos."},
        {"icon":"🚐","title":"Furgón / Furgoneta","description":"Cabina y zona de carga forman una sola carrocería continua. Sin chasis visible entre ambas partes. Más compacto. Ejemplos: furgoneta de reparto, ambulancias de carga, vans."}
      ]},
      {"type":"table","headers":["Característica","Camión","Furgón/Furgoneta"],"rows":[
        ["Cabina","NO integrada en carrocería","SÍ integrada en carrocería"],
        ["Uso","Transporte de mercancías","Transporte de mercancías"],
        ["Plazas máx.","9 (incl. conductor)","9 (incl. conductor)"],
        ["Permiso mín.","B (≤3.500 kg MMA) / C (>3.500 kg)","B (≤3.500 kg MMA) / C (>3.500 kg)"]
      ]}
    ]}',
    '{"blocks":[
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚛","title":"Camión (грузовик)","description":"Кабина отделена от грузового отсека. Рама видна между кабиной и кузовом. Водитель располагается впереди груза. Примеры: платформы, цистерны, рефрижераторы."},
        {"icon":"🚐","title":"Фургон / фургонетта","description":"Кабина и грузовой отсек образуют единый непрерывный кузов. Рама между ними не видна. Более компактный. Примеры: грузовые микроавтобусы, скорая помощь (грузовая), вэны."}
      ]},
      {"type":"table","headers":["Характеристика","Camión","Furgón/Furgoneta"],"rows":[
        ["Кабина","НЕ интегрирована в кузов","ДА, интегрирована в кузов"],
        ["Назначение","Перевозка грузов","Перевозка грузов"],
        ["Макс. мест","9 (вкл. водителя)","9 (вкл. водителя)"],
        ["Мин. права","B (≤3500 кг MMA) / C (>3500 кг)","B (≤3500 кг MMA) / C (>3500 кг)"]
      ]}
    ]}'
  );

  -- ── Step 3 · Theory — Velocidades según MMA ───────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Velocidades máximas según MMA del camión/furgón"},
      {"type":"table","headers":["Tipo de vía","MMA ≤ 3.500 kg","MMA > 3.500 kg"],"rows":[
        ["Autopista / autovía","90 km/h","90 km/h"],
        ["Carretera convencional","90 km/h","80 km/h"],
        ["Vía urbana","50 km/h","50 km/h"]
      ],"caption":"Límites generales — pueden reducirse por señal o tipo de carga"},
      {"type":"callout","variant":"warning","text":"¡Ojo al examen! Un camión de 3.500 kg en autopista circula a 90 km/h — igual que uno de 3.000 kg. Pero en carretera convencional el de >3.500 kg baja a 80 km/h. La frontera está en los 3.500 kg."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Максимальные скорости в зависимости от MMA грузовика/фургона"},
      {"type":"table","headers":["Тип дороги","MMA ≤ 3500 кг","MMA > 3500 кг"],"rows":[
        ["Автомагистраль / autovía","90 км/ч","90 км/ч"],
        ["Обычная дорога","90 км/ч","80 км/ч"],
        ["Городская дорога","50 км/ч","50 км/ч"]
      ],"caption":"Общие ограничения — могут снижаться знаком или типом груза"},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! Грузовик 3500 кг на автомагистрали едет 90 км/ч — так же, как и на 3000 кг. Но на обычной дороге при MMA >3500 кг — уже 80 км/ч. Граница — 3500 кг."}
    ]}'
  );

  -- ── Step 4 · Quiz — DGT 6a22a3d5 (furgoneta máx 9 plazas) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Cuál es el número máximo de plazas autorizadas, incluida la del conductor, que puede tener una furgoneta para poder circular?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/6a22a3d5-7a3f-459b-a960-6c70ef3151dd_1768668634765.webp","options":["9 plazas.","3 plazas.","5 plazas."],"correct":0,"explanation":"La furgoneta puede tener un máximo de 9 plazas, incluyendo al conductor. Este límite es idéntico al del camión. Si supera las 9 plazas, el vehículo ya no se clasifica como furgoneta sino como autobús o microbus."}',
    '{"text":"Каково максимально разрешённое число мест, включая водителя, у фургона для движения по дорогам?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/6a22a3d5-7a3f-459b-a960-6c70ef3151dd_1768668634765.webp","options":["9 мест.","3 места.","5 мест."],"correct":0,"explanation":"Фургон может иметь максимум 9 мест, включая водителя. Этот предел одинаков с грузовиком. Если мест больше 9 — транспортное средство классифицируется уже не как фургон, а как автобус или микроавтобус."}'
  );

  -- ── Step 5 · Quiz — DGT 277b5ebc (camión <3500 kg autovía 90 km/h) ────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"Un camión de menos de 3.500 kg de MMA, ¿a qué velocidad máxima puede circular por autovía?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-014/277b5ebc-7703-4d23-b77e-e66abfa04d77_1768757977164.webp","options":["A 90 km/h.","A 120 km/h.","A 100 km/h."],"correct":0,"explanation":"Los camiones y furgones, independientemente de que su MMA sea inferior a 3.500 kg, tienen una velocidad máxima de 90 km/h en autovía. A diferencia de los turismos (120 km/h), los vehículos de carga siempre están limitados a 90 km/h en autopista y autovía."}',
    '{"text":"Грузовик с MMA менее 3500 кг — с какой максимальной скоростью он может ехать по autovía?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-014/277b5ebc-7703-4d23-b77e-e66abfa04d77_1768757977164.webp","options":["90 км/ч.","120 км/ч.","100 км/ч."],"correct":0,"explanation":"Грузовики и фургоны, независимо от того, что их MMA менее 3500 кг, имеют максимальную скорость 90 км/ч на autovía. В отличие от легковых автомобилей (120 км/ч), грузовые транспортные средства всегда ограничены 90 км/ч на автомагистралях и autovías."}'
  );

  -- ── Step 6 · Theory — ITV y seguridad en furgones ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"ITV — Inspección técnica de vehículos"},
      {"type":"table","headers":["Vehículo","Antigüedad","Periodicidad ITV"],"rows":[
        ["Furgoneta ≤3.500 kg","0 a 6 años","Cada 2 años (bienal)"],
        ["Furgoneta ≤3.500 kg","6 a 10 años","Cada año (anual)"],
        ["Furgoneta ≤3.500 kg","Más de 10 años","Cada 6 meses"],
        ["Camión >3.500 kg","Todos","Anual desde primer año"]
      ],"caption":"Periodicidad ITV para vehículos de mercancías"},
      {"type":"callout","variant":"danger","text":"Los furgones sufren más siniestralidad de 15:00 a 16:00 h. Esta franja horaria está vinculada al regreso de repartos y la fatiga de media tarde. Aparece con frecuencia en el examen."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"ITV — Технический осмотр"},
      {"type":"table","headers":["Транспортное средство","Возраст","Периодичность ITV"],"rows":[
        ["Фургон ≤3500 кг","0–6 лет","Каждые 2 года"],
        ["Фургон ≤3500 кг","6–10 лет","Ежегодно"],
        ["Фургон ≤3500 кг","Старше 10 лет","Каждые 6 месяцев"],
        ["Грузовик >3500 кг","Любой","Ежегодно с первого года"]
      ],"caption":"Периодичность ITV для грузовых транспортных средств"},
      {"type":"callout","variant":"danger","text":"Фургоны чаще всего попадают в аварии с 15:00 до 16:00. Этот временной промежуток связан с возвращением с доставок и усталостью во второй половине дня. Часто проверяется на экзамене."}
    ]}'
  );

  -- ── Step 7 · Theory — Seguridad específica de furgones ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Riesgos específicos de la conducción de furgones"},
      {"type":"list","style":"arrow","items":[
        "Centro de gravedad más alto que en turismo → mayor riesgo de vuelco en curvas rápidas",
        "Zona de carga sin visibilidad directa → obligatorio espejo retrovisor en ambos lados",
        "Carga puede desplazarse en frenazo brusco → sujeción obligatoria de la mercancía",
        "Mayor longitud y anchura → mayor radio de giro necesario",
        "Punto ciego mayor en maniobras marcha atrás → precaución en maniobras"
      ]},
      {"type":"callout","variant":"tip","text":"Truco: ''Furgón = Fijación''. Siempre que conduzcas un furgón piensa en FIJACIÓN de la carga. La carga suelta es la causa más común de accidentes con estos vehículos."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Специфические риски при вождении фургона"},
      {"type":"list","style":"arrow","items":[
        "Центр тяжести выше, чем у легкового → повышенный риск опрокидывания в быстрых поворотах",
        "Зона погрузки без прямой видимости → обязательны зеркала заднего вида с обеих сторон",
        "Груз может сдвинуться при резком торможении → обязательная фиксация товара",
        "Бо́льшая длина и ширина → больший радиус поворота",
        "Большая слепая зона при манёврах задним ходом → осторожность при манёврах"
      ]},
      {"type":"callout","variant":"tip","text":"Подсказка: «Фургон = Фиксация». Садясь за руль фургона, всегда думай о ФИКСАЦИИ груза. Незакреплённый груз — самая частая причина аварий с этими транспортными средствами."}
    ]}'
  );

  -- ── Step 8 · Quiz — DGT 93a0ee3d (furgoneta ITV bienal hasta 6 años) ──────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"Una furgoneta de MMA inferior a 3,5 toneladas y una antigüedad de 5 años, ¿con qué frecuencia debe pasar la inspección técnica periódica?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-003/93a0ee3d-744f-4770-a420-e04d409a08f2.webp","options":["Bienal, hasta los 6 años de antigüedad.","Anual, hasta los 5 años de antigüedad.","Bienal, hasta los 10 años de antigüedad."],"correct":0,"explanation":"Una furgoneta de MMA inferior a 3.500 kg con 5 años de antigüedad debe pasar la ITV cada 2 años (periodicidad bienal). Esta periodicidad bienal se aplica hasta los 6 años de antigüedad; a partir de los 6 años pasa a ser anual."}',
    '{"text":"Фургон с MMA менее 3,5 тонны и сроком эксплуатации 5 лет — с какой периодичностью должен проходить технический осмотр?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-003/93a0ee3d-744f-4770-a420-e04d409a08f2.webp","options":["Раз в два года, до 6 лет эксплуатации.","Ежегодно, до 5 лет эксплуатации.","Раз в два года, до 10 лет эксплуатации."],"correct":0,"explanation":"Фургон с MMA менее 3500 кг возрастом 5 лет должен проходить ITV каждые 2 года. Эта двухлетняя периодичность применяется до 6 лет эксплуатации; начиная с 6 лет — ежегодно."}'
  );

  -- ── Step 9 · Quiz — DGT 7f70f72a (siniestralidad furgones 15-16h) ─────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"¿En qué momento del día sufren más siniestralidad los furgones?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-03_test-008/7f70f72a-6f39-427a-a538-0f959b5303c4.webp","options":["Festivos.","A las 7:00 horas o al anochecer.","De 15:00 a 16:00 horas."],"correct":2,"explanation":"Los furgones registran su mayor siniestralidad entre las 15:00 y las 16:00 horas. Esta franja coincide con el pico de reparto en jornada partida, cuando el conductor acumula varias horas de conducción y carga/descarga, aumentando la fatiga y disminuyendo la atención."}',
    '{"text":"В какое время суток фургоны чаще всего попадают в аварии?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-03_test-008/7f70f72a-6f39-427a-a538-0f959b5303c4.webp","options":["В праздничные дни.","В 7:00 утра или в сумерках.","С 15:00 до 16:00."],"correct":2,"explanation":"Фургоны чаще всего попадают в аварии с 15:00 до 16:00. Этот период совпадает с пиком доставок в разделённой рабочей смене, когда водитель уже набрал несколько часов езды и погрузки-разгрузки, нарастает усталость и снижается внимательность."}'
  );

  -- ── Step 10 · Theory — Mnemónica y resumen ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Mnemotecnia: ''CARGA-I vs CARGA-S''","text":"CAMIÓN = CARGA con cabina Independiente (separada). FURGÓN = CARGA con cabina Solidaria (integrada). Si la cabina está Separada → Camión. Si está Soldada → Furgón."},
      {"type":"callout","variant":"info","text":"Ambos: 4 ruedas o más, mercancías, máx. 9 plazas. Lo único que cambia es si la cabina está integrada o no en la carrocería. En el examen siempre aparece esta diferencia."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Мнемоника: «ГРУЗ-О vs ГРУЗ-И»","text":"CAMIÓN = ГРУЗ с Отдельной кабиной. FURGÓN = ГРУЗ с Интегрированной кабиной. Кабина Отдельно → Грузовик. Кабина Интегрирована → Фургон."},
      {"type":"callout","variant":"info","text":"Оба: 4 колеса и более, перевозка грузов, макс. 9 мест. Единственное отличие — интегрирована кабина в кузов или нет. На экзамене это отличие проверяется обязательно."}
    ]}'
  );

  -- ── Step 11 · Quiz — authored (camión vs furgón diferencia clave) ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"¿Qué característica distingue a un camión de un furgón o furgoneta?","options":["El camión transporta personas; el furgón transporta mercancías.","En el camión la cabina no está integrada en la carrocería; en el furgón sí lo está.","El camión puede tener más de 9 plazas; el furgón no puede superar las 5."],"correct":1,"explanation":"La única diferencia definitoria entre camión y furgón es la carrocería: en el camión la cabina NO está integrada (queda separada de la caja de carga), mientras que en el furgón la cabina SÍ está integrada en la carrocería. Ambos transportan mercancías y tienen como máximo 9 plazas incluyendo al conductor."}',
    '{"text":"Какая характеристика отличает грузовик (camión) от фургона?","options":["Грузовик перевозит людей; фургон перевозит грузы.","У грузовика кабина не интегрирована в кузов; у фургона интегрирована.","Грузовик может иметь более 9 мест; фургон не может превышать 5 мест."],"correct":1,"explanation":"Единственное определяющее отличие грузовика от фургона — кузов: у грузовика кабина НЕ интегрирована (отделена от грузового кузова), тогда как у фургона кабина интегрирована. Оба перевозят грузы и имеют максимум 9 мест включая водителя."}'
  );

  -- ── Step 12 · Quiz — DGT 794431be (camión 3500 kg carretera 80 km/h) ──────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Cuál es la velocidad máxima permitida en esta vía para un camión de 3.500 kg de MMA?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/794431be-294b-4cdf-8734-d46deb3f4536_1768667552537.webp","options":["90 kilómetros por hora.","80 kilómetros por hora.","70 kilómetros por hora."],"correct":1,"explanation":"En una carretera convencional, un camión de 3.500 kg de MMA (que supera el umbral de 3.500 kg) tiene una velocidad máxima de 80 km/h. Nótese que en autopista/autovía el mismo camión podría circular a 90 km/h; es en carretera convencional donde se aplica el límite de 80 km/h para camiones de más de 3.500 kg."}',
    '{"text":"Какова максимально допустимая скорость на этой дороге для грузовика с MMA 3500 кг?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/794431be-294b-4cdf-8734-d46deb3f4536_1768667552537.webp","options":["90 км/ч.","80 км/ч.","70 км/ч."],"correct":1,"explanation":"На обычной дороге грузовик с MMA 3500 кг (превышающий порог 3500 кг) имеет максимальную скорость 80 км/ч. Обратите внимание: на автомагистрали тот же грузовик может ехать 90 км/ч — ограничение 80 км/ч применяется именно на обычных дорогах для грузовиков свыше 3500 кг."}'
  );

END $$;
