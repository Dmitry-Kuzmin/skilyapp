-- SQL Migration: Add Lesson 1.6.5 - Carril VAO, adicional y en sentido contrario al habitual
-- Module 1 UUID: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  -- Clean up existing lesson to ensure idempotency
  DELETE FROM lesson_steps WHERE lesson_id IN (SELECT id FROM course_lessons WHERE code = '1.6.5' AND module_id = mod_id);
  DELETE FROM course_lessons WHERE code = '1.6.5' AND module_id = mod_id;

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.6.5',
     'Carril VAO, adicional y en sentido contrario al habitual',
     'Полосы VAO, дополнительные и временные встречные полосы',
     32, 40, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory: Полоса VAO (Carril VAO) ────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril VAO: fomento del transporte compartido"},
      {"type":"text","text":"El carril VAO (Vehículos de Alta Ocupación) está diseñado para fomentar el uso compartido del coche, reducir la congestión de tráfico y disminuir la contaminación en los accesos a las grandes ciudades. Por este motivo, se limita la entrada a esta vía especial en función del tipo de vehículo y del número de ocupantes."},
      {"type":"callout","variant":"info","title":"Definición oficial","text":"Se entiende por vehículo VAO (Vehículo de Alta Ocupación) a los automóviles destinados exclusivamente al transporte de personas, cuya masa máxima autorizada (MMA) no exceda de 3500 kg, y que estén ocupados por el número mínimo de personas que se determine."},
      {"type":"callout","variant":"danger","title":"Vehículos prohibidos siempre","text":"Tienen totalmente prohibido utilizar el carril VAO los turismos con remolque (incluso remolques ligeros), los ciclomotores, los ciclos y los peatones."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Полоса VAO: поддержка совместных поездок"},
      {"type":"text","text":"Выделенная полоса VAO (Vehículos de Alta Ocupación — ТС высокой наполняемости) создана для того, чтобы стимулировать водителей объединяться, уменьшать заторы на въездах в крупные города и снижать уровень загрязнения воздуха. Допуск на эту полосу строго ограничен типом автомобиля и количеством человек в нем."},
      {"type":"callout","variant":"info","title":"Официальное определение","text":"Транспортным средством высокой наполняемости (VAO) признается легковой автомобиль, предназначенный исключительно для перевозки людей, с разрешенной максимальной массой (MMA) не более 3500 кг, в котором находится установленное минимальное число пассажиров."},
      {"type":"callout","variant":"danger","title":"Кому въезд запрещен всегда","text":"На полосу VAO категорически запрещено въезжать легковым автомобилям с прицепом (даже легким), мопедам, велосипедам и пешеходам."}
    ]}'
  );

  -- ── Step 2 · Theory: Допуск на VAO (Quién entra en el carril VAO) ────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"¿Quién puede entrar en el carril VAO?"},
      {"type":"text","text":"El acceso al carril VAO depende del número de ocupantes y de ciertas exenciones ecológicas o funcionales."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"👥","title":"Con ocupación mínima obligatoria","description":"Turismos sin remolque, motocicletas y vehículos mixtos adaptables. Deben cumplir con el número mínimo de ocupantes fijado por el panel variable (habitualmente 2 o más personas)."},
        {"icon":"⚡","title":"Sin ocupación mínima (incluso solo conductor)","description":"Autobuses de cualquier MMA, vehículos prioritarios en servicio de urgencia, vehículos con la señal V-15 de minusvalía y turismos/motos con la etiqueta ambiental Cero Emisiones de la DGT."}
      ]},
      {"type":"callout","variant":"warning","title":"¡Ojo al examen! Distintivos Eco, C y B","text":"Los turismos con distintivo Eco, C o B sólo podrán entrar en el carril VAO cuando esté expresamente autorizado mediante los paneles de mensaje variable sobre la calzada."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Кому разрешен въезд на полосу VAO?"},
      {"type":"text","text":"Допуск на полосу VAO зависит от количества человек в салоне, а также от экологического класса или статуса ТС."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"👥","title":"С минимальным числом пассажиров","description":"Легковые авто без прицепа, мотоциклы и грузопассажирские ТС (mixtos). Они обязаны соблюдать минимальный лимит пассажиров, указанный на световом табло (обычно 2 или более человек)."},
        {"icon":"⚡","title":"Без учета пассажиров (можно только водитель)","description":"Автобусы (любой массы), спецслужбы на вызове, ТС со знаком инвалида V-15, а также легковые авто и мотоциклы с экологической наклейкой Cero Emisiones (электромобили)."}
      ]},
      {"type":"callout","variant":"warning","title":"Ловушка экзамена! Наклейки Eco, C и B","text":"Автомобили с экологическими наклейками Eco, C или B могут выезжать на полосу VAO только тогда, когда это прямо разрешено на электронных табло над дорогой."}
    ]}'
  );

  -- ── Step 3 · Quiz: Легковой с прицепом на VAO (DGT 2782342e-bde9-422b-8d02-bddce08b7916)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{"question_id":"2782342e-bde9-422b-8d02-bddce08b7916","explanation":"Está prohibido que circule por el carril VAO cualquier vehículo con remolque, con independencia de su masa o del número de ocupantes del vehículo."}',
    '{"question_id":"2782342e-bde9-422b-8d02-bddce08b7916","explanation":"Движение по полосе VAO для любых транспортных средств с прицепом (даже легким) полностью запрещено, независимо от количества пассажиров в салоне."}'
  );

  -- ── Step 4 · Quiz: Один водитель на VAO (DGT 988174cc-0116-4f71-9d1f-7ab52aea8517)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"question_id":"988174cc-0116-4f71-9d1f-7ab52aea8517","explanation":"Como norma general, para ir por el carril VAO se exige una ocupación mínima. No obstante, se permite circular con sólo el conductor a los turismos con la etiqueta Cero Emisiones o que ostenten la señal V-15 de movilidad reducida."}',
    '{"question_id":"988174cc-0116-4f71-9d1f-7ab52aea8517","explanation":"По общему правилу для проезда по полосе VAO нужно несколько человек. Однако ехать только с водителем разрешается легковым автомобилям с наклейкой Cero Emisiones (электромобили) или со знаком инвалидности V-15."}'
  );

  -- ── Step 5 · Theory: Дополнительная полоса (Carril adicional) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril adicional circunstancial"},
      {"type":"text","text":"En carreteras de doble sentido con un carril para cada sentido y arcenes transitables, las autoridades de tráfico pueden habilitar una tercera banda de circulación (carril adicional) en momentos de gran congestión, utilizando conos para redistribuir el espacio de la calzada principal y los arcenes."},
      {"type":"callout","variant":"info","title":"Definición oficial","text":"El carril adicional circunstancial es aquel que se añade temporalmente a una calzada mediante una hilera de conos, obligando a los vehículos a utilizar los arcenes para circular y repartiendo la calzada en tres carriles."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"💡","title":"Uso de alumbrado obligatorio","description":"Todos los vehículos que circulen por cualquier carril de esa vía (tanto el adicional como los normales) deben llevar encendida la luz de cruce o corto alcance, tanto de día como de noche."},
        {"icon":"⚠️","title":"Límites de velocidad obligatorios","description":"Para todos los vehículos en todos los carriles, la velocidad máxima se fija en 80 km/h y la velocidad mínima en 60 km/h (o inferior si está específicamente señalizado)."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Дополнительная временная полоса"},
      {"type":"text","text":"На дорогах с двусторонним движением (где всего по одной полосе в каждую сторону и есть пригодные для езды обочины) дорожные службы в периоды заторов могут организовать третью временную полосу движения (carril adicional), используя конусы для переразметки дороги с задействованием обочин."},
      {"type":"callout","variant":"info","title":"Официальное определение","text":"Дополнительная временная полоса — это полоса, временно создаваемая на проезжей части с помощью конусов, при которой транспортные средства задействуют обочину для движения, а проезжая часть делится на три полосы."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"💡","title":"Обязательное освещение","description":"Водители всех транспортных средств на этой дороге (как на дополнительной, так и на обычных полосах) обязаны включать ближний свет фар и днем, и ночью."},
        {"icon":"⚠️","title":"Жесткие ограничения скорости","description":"Для всех ТС на всех полосах движения устанавливается максимальный скоростной лимит 80 км/ч, а минимальный — 60 км/ч (или ниже, если требуют знаки)."}
      ]}
    ]}'
  );

  -- ── Step 6 · Quiz: Освещение на доп. полосе (DGT 34601dfd-4dc3-47c2-97d9-8cc12b14e703)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'quiz',
    '{"question_id":"34601dfd-4dc3-47c2-97d9-8cc12b14e703","explanation":"Todos los vehículos que circulan por una calzada donde se ha habilitado un carril adicional circunstancial están obligados a llevar encendida la luz de corto alcance o de cruce, tanto de día como de noche, para mejorar la visibilidad."}',
    '{"question_id":"34601dfd-4dc3-47c2-97d9-8cc12b14e703","explanation":"Все транспортные средства, движущиеся по дороге с организованной дополнительной временной полосой, обязаны включать ближний свет фар как днем, так и ночью для повышения безопасности."}'
  );

  -- ── Step 7 · Quiz: Скорость на доп. полосе (DGT 01888b3c-e1fd-48b0-9816-511950b52803)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{"question_id":"01888b3c-e1fd-48b0-9816-511950b52803","explanation":"La velocidad obligatoria en un carril adicional circunstancial para todos los vehículos está limitada a un máximo de 80 km/h y a un mínimo de 60 km/h (salvo señalización contraria)."}',
    '{"question_id":"01888b3c-e1fd-48b0-9816-511950b52803","explanation":"Скоростной режим на дороге с дополнительной полосой строго регламентирован для всех участников: максимальная скорость 80 км/ч, минимальная — 60 км/ч (если знаки не требуют ехать еще медленнее)."}'
  );

  -- ── Step 8 · Theory: Встречная полоса (Carril en sentido contrario) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril en sentido contrario al habitual"},
      {"type":"text","text":"En autovías o autopistas, se puede habilitar uno de los carriles de la calzada opuesta para que circulen vehículos en nuestro sentido de marcha, cruzando la mediana por un paso abierto. Se delimita del resto de carriles en sentido contrario con una hilera de conos."},
      {"type":"callout","variant":"info","title":"¿Por qué se crea este carril?","text":"Existen dos motivos principales para habilitar este carril:\n1. Por fluidez: para aliviar atascos en momentos de gran volumen de tráfico.\n2. Por obras: cuando una de las calzadas está cortada por mantenimiento o reparación."},
      {"type":"callout","variant":"danger","title":"¡Ojo al examen! ¿Quién puede entrar? (Diferencia clave)","text":"- Si se abre por FLUIDEZ (tráfico): SOLO pueden entrar turismos sin remolque y motocicletas. Está prohibido para el resto (camiones, vehículos mixtos, turismos con remolque, etc.).\n- Si se abre por OBRAS: pueden circular TODOS los vehículos autorizados a ir por la vía (incluidos camiones, mixtos y remolques), salvo prohibición expresa por señalización."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚗","title":"Reglas en el carril en sentido contrario","description":"Velocidad obligatoria entre 60 y 80 km/h. Luz de cruce obligatoria encendida día y noche. Prohibido desplazarse lateralmente cruzando los conos."},
        {"icon":"🚘","title":"Reglas en el carril contiguo (normal)","description":"Si circulas por el carril normal que está pegado a los conos (carril contiguo), también estás obligado a llevar encendido el cruce día y noche, y limitar tu velocidad entre 60 y 80 km/h. Si hay más carriles normales a la derecha, estos circulan a velocidad genérica de la vía."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Временная встречная полоса (Sentido contrario)"},
      {"type":"text","text":"На автомагистралях одну из полос противоположной проезжей части могут перенаправить для движения в попутном нам направлении (через разрыв в разделительной полосе). Этот временный коридор отделяется от встречных машин конусами."},
      {"type":"callout","variant":"info","title":"Зачем создается эта полоса?","text":"Существует две причины для организации такого движения:\n1. Для разгрузки трафика (por fluidez) — в пиковые периоды загородных поездок.\n2. Из-за ремонтных работ (por obras) — если наша проезжая часть перекрыта."},
      {"type":"callout","variant":"danger","title":"Ловушка экзамена! Кто имеет право въезда (Важнейшее отличие)","text":"- Если открыта для РАЗГРУЗКИ (fluidez): ехать могут ТОЛЬКО легковые авто без прицепа и мотоциклы. Всем остальным (грузовикам, mixed vehicles, машинам с прицепом) въезд запрещен.\n- Если открыта из-за РЕМОНТА (obras): ехать могут ВСЕ транспортные средства, которым разрешено движение по данной дороге (включая грузовики и машины с прицепом), если нет запрещающих знаков."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚗","title":"Правила на встречной полосе","description":"Скорость строго от 60 до 80 км/ч. Ближний свет фар включен днем и ночью. Пересекать линию конусов и выезжать из полосы запрещено."},
        {"icon":"🚘","title":"Правила на смежной полосе (обычной)","description":"Если ты едешь по обычной полосе, прилегающей к конусам (смежная полоса), ты также обязан ехать со скоростью 60-80 км/ч и со включенным ближним светом фар! Остальные полосы правее едут с обычной скоростью трассы."}
      ]}
    ]}'
  );

  -- ── Step 9 · Quiz: Кто может ехать при fluidez (DGT e1e73c22-1b01-44c6-8821-b178102a672d)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"question_id":"e1e73c22-1b01-44c6-8821-b178102a672d","explanation":"Cuando un carril en sentido contrario al habitual se habilita por razones de fluidez de la circulación, únicamente se autoriza el paso a las motocicletas y a los turismos que no arrastren remolque."}',
    '{"question_id":"e1e73c22-1b01-44c6-8821-b178102a672d","explanation":"Если полоса встречного направления открывается для улучшения пропускной способности (борьба с пробками), по ней разрешено двигаться исключительно мотоциклам и легковым автомобилям без прицепа."}'
  );

  -- ── Step 10 · Quiz: Кто может ехать при obras (DGT d9ac4d30-e76c-4c08-8bb9-13af8d791fca)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{"question_id":"d9ac4d30-e76c-4c08-8bb9-13af8d791fca","explanation":"Si el carril en sentido contrario al habitual se abre por obras en la calzada, todos los vehículos autorizados a circular por dicha vía pueden utilizarlo (incluyendo vehículos mixtos, camiones, etc.), a menos que haya una prohibición expresa."}',
    '{"question_id":"d9ac4d30-e76c-4c08-8bb9-13af8d791fca","explanation":"Если временная встречная полоса открыта из-за дорожных работ (ремонта), по ней могут ехать абсолютно все ТС, имеющие допуск на данную дорогу (включая грузопассажирские mixto, грузовики и т.д.), если нет знаков запрета."}'
  );

  -- ── Step 11 · Quiz: Освещение на смежной полосе (DGT c477b5e6-2f63-4e4d-a35e-390e1f6e0c43)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"question_id":"c477b5e6-2f63-4e4d-a35e-390e1f6e0c43","explanation":"Tanto los conductores que circulan por el carril habilitado en sentido contrario al habitual como los que lo hacen por el carril contiguo normal deben llevar encendida la luz de cruce o corto alcance para aumentar la seguridad vial."}',
    '{"question_id":"c477b5e6-2f63-4e4d-a35e-390e1f6e0c43","explanation":"Водители как на временной встречной полосе, так и на смежной с ней обычной полосе (отделенной конусами) обязаны включать ближний свет фар даже в дневное время суток для обеспечения безопасности."}'
  );

END $$;
