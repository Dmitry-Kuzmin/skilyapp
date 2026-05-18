-- Lección 1.3.1 — Partes de la vía (plataforma, calzada, arcén, glorieta…)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 3: DGT b3477e87 (moto en arcén → No, calzada → idx 0)
-- Quiz Step 7: DGT 91432fc2 (apartadero → apartar emergencia → idx 2)
-- Quiz Step 8: DGT 119f82bf (peatones glorieta sin paso → rodearla → idx 0)
-- Quiz Step 10: DGT 09992d19 (cambio de rasante poca visibilidad → dejar libre mitad calzada → idx 2)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.3.1',
     'Partes de la vía',
     'Элементы дороги',
     23, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Estructura básica: plataforma, calzada, carriles ───
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Estructura básica de la vía"},
      {"type":"callout","variant":"info","title":"Plataforma","text":"Zona de la carretera dedicada al uso de vehículos. Está formada por la CALZADA y los ARCENES. Es el concepto más amplio que engloba la zona donde circulan los vehículos."},
      {"type":"callout","variant":"info","title":"Calzada","text":"Parte de la carretera dedicada a la circulación de vehículos. Se compone de un cierto número de carriles. Ojo: la calzada NO incluye los arcenes."},
      {"type":"callout","variant":"info","title":"Carril","text":"Banda longitudinal en que puede estar subdividida la calzada, delimitada o no por marcas viales longitudinales. Debe tener una anchura suficiente para permitir la circulación de una fila de automóviles que no sean motocicletas."},
      {"type":"callout","variant":"warning","text":"Mnemotécnico: PLATAFORMA = CALZADA + ARCENES. La calzada es solo la zona de carriles; los arcenes son parte de la plataforma pero no de la calzada."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Основная структура дороги"},
      {"type":"callout","variant":"info","title":"Платформа (Plataforma)","text":"Зона дороги, предназначенная для использования транспортными средствами. Состоит из ПРОЕЗЖЕЙ ЧАСТИ и ОБОЧИН. Это наиболее широкое понятие, охватывающее зону движения транспорта."},
      {"type":"callout","variant":"info","title":"Проезжая часть (Calzada)","text":"Часть дороги, предназначенная для движения транспортных средств. Состоит из определённого числа полос. Важно: проезжая часть НЕ включает обочины."},
      {"type":"callout","variant":"info","title":"Полоса движения (Carril)","text":"Продольная полоса, на которые может делиться проезжая часть, обозначенная или не обозначенная продольной разметкой. Должна иметь достаточную ширину для движения ряда автомобилей (кроме мотоциклов)."},
      {"type":"callout","variant":"warning","text":"Мнемоника: ПЛАТФОРМА = ПРОЕЗЖАЯ ЧАСТЬ + ОБОЧИНЫ. Проезжая часть — только зона полос движения; обочины входят в платформу, но не в проезжую часть."}
    ]}'
  );

  -- ── Step 2 · Theory — Arcén, Berma, Cuneta, Mediana ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Márgenes y franjas laterales"},
      {"type":"callout","variant":"info","title":"Arcén","text":"Franja longitudinal AFIRMADA contigua a la calzada, NO destinada al uso de vehículos automóviles, más que en circunstancias excepcionales. Los peatones, ciclistas y ciertas categorías de vehículos pueden usarlo; los automóviles y motos, solo en situaciones especiales."},
      {"type":"callout","variant":"info","title":"Berma","text":"Franja longitudinal (afirmada o no) comprendida entre el borde exterior del arcén y la cuneta o arista interior del talud. Sirve para instalar barreras semirrígidas de seguridad o estructuras de señales verticales."},
      {"type":"callout","variant":"info","title":"Cuneta","text":"Zanja construida en el terreno para canalizar y recibir las aguas de lluvia que caen sobre la calzada. No es zona de circulación."},
      {"type":"callout","variant":"info","title":"Mediana","text":"Franja longitudinal situada ENTRE DOS CALZADAS, no destinada a la circulación de vehículos. Separa sentidos contrarios en autopistas y autovías."},
      {"type":"table","headers":["Elemento","Afirmado","Uso vehículos","Función principal"],"rows":[
        ["Arcén","Sí","Excepcional","Margen transitable junto a calzada"],
        ["Berma","Sí/No","No","Soporte de barreras y señales"],
        ["Cuneta","No","No","Drenaje de aguas pluviales"],
        ["Mediana","Sí/No","No","Separación de calzadas opuestas"]
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Боковые полосы и обочины"},
      {"type":"callout","variant":"info","title":"Обочина (Arcén)","text":"Продольная УКРЕПЛЁННАЯ полоса, прилегающая к проезжей части, НЕ предназначенная для движения автомобилей, кроме исключительных случаев. Пешеходы, велосипедисты и ряд ТС могут её использовать; автомобили и мотоциклы — только в особых ситуациях."},
      {"type":"callout","variant":"info","title":"Берма (Berma)","text":"Продольная полоса (укреплённая или нет) между внешним краем обочины и кюветом или внутренним краем откоса. Служит для установки полужёстких барьеров безопасности или конструкций дорожных знаков."},
      {"type":"callout","variant":"info","title":"Кювет (Cuneta)","text":"Канава, прорытая вдоль дороги для сбора и отвода дождевых вод с проезжей части. Не является зоной движения."},
      {"type":"callout","variant":"info","title":"Разделительная полоса (Mediana)","text":"Продольная полоса, расположенная МЕЖДУ ДВУМЯ ПРОЕЗЖИМИ ЧАСТЯМИ, не предназначенная для движения. Разделяет встречные направления на автострадах и скоростных дорогах."},
      {"type":"table","headers":["Элемент","Укреплённый","Движение ТС","Основная функция"],"rows":[
        ["Обочина","Да","Исключительно","Проходимый край у проезжей части"],
        ["Берма","Да/Нет","Нет","Опора для барьеров и знаков"],
        ["Кювет","Нет","Нет","Дренаж дождевых вод"],
        ["Разделительная полоса","Да/Нет","Нет","Разделение встречных проезжих частей"]
      ]}
    ]}'
  );

  -- ── Step 3 · Quiz — DGT b3477e87 (moto en arcén) ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{"text":"Como norma general, una motocicleta, ¿puede circular por el arcén?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/b3477e87-0248-413c-8abb-eee3e78354f5.webp","options":["No, debe circular por la calzada.","Sí, pero no puede hacerlo en paralelo con otros vehículos.","Solo si su cilindrada es igual o inferior a 125 cc."],"correct":0,"explanation":"No, como norma general una motocicleta no puede circular por el arcén. El arcén no está destinado al uso de vehículos automóviles (incluidas motos) salvo en circunstancias excepcionales. Las motocicletas deben circular por la calzada, igual que los demás vehículos a motor."}',
    '{"text":"Как правило, может ли мотоцикл двигаться по обочине?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/b3477e87-0248-413c-8abb-eee3e78354f5.webp","options":["Нет, он должен двигаться по проезжей части.","Да, но не двигаясь параллельно с другими транспортными средствами.","Только если объем двигателя равен или менее 125 куб. см."],"correct":0,"explanation":"Нет, как правило мотоцикл не может двигаться по обочине. Обочина не предназначена для движения автотранспорта (включая мотоциклы), кроме исключительных случаев. Мотоциклы должны двигаться по проезжей части, как и другие моторные транспортные средства."}'
  );

  -- ── Step 4 · Quiz — authored (plataforma vs calzada) ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Qué elementos forman la plataforma de una carretera?","options":["Solo la calzada.","La calzada y los arcenes.","La calzada, los arcenes y las aceras."],"correct":1,"explanation":"La plataforma es la zona de la carretera dedicada al uso de vehículos, y está formada por la calzada y los arcenes. Las aceras son zona peatonal y no forman parte de la plataforma."}',
    '{"text":"Из каких элементов состоит платформа дороги?","options":["Только из проезжей части.","Из проезжей части и обочин.","Из проезжей части, обочин и тротуаров."],"correct":1,"explanation":"Платформа — это зона дороги, предназначенная для использования транспортными средствами, и состоит из проезжей части и обочин. Тротуары — пешеходная зона и не входят в платформу."}'
  );

  -- ── Step 5 · Theory — Zonas peatonales: acera, refugio, isleta ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Zonas peatonales e isletas"},
      {"type":"callout","variant":"info","title":"Acera","text":"Zona longitudinal de la carretera, elevada o no, destinada al tránsito de peatones."},
      {"type":"callout","variant":"info","title":"Zona peatonal","text":"Parte de la vía, elevada o delimitada de otra forma, reservada a la circulación de peatones. INCLUYE la acera, el andén y el paseo."},
      {"type":"callout","variant":"info","title":"Refugio","text":"Plataforma o espacio destinado a proteger a los peatones mientras cruzan una vía. Se ubica en medio de una calle ancha o en la intersección de dos vías."},
      {"type":"callout","variant":"info","title":"Isleta","text":"Estructura en la vía pública para mejorar la seguridad y fluidez del tránsito. Es una pequeña extensión de terreno, elevada o señalizada, en el centro de una calle o carretera. Sus funciones: separación de carriles, refugio para peatones, mejorar visibilidad, reducción de velocidades."},
      {"type":"callout","variant":"warning","text":"Diferencia clave: el REFUGIO está en mitad de la calzada para que los peatones paren al cruzar. La ISLETA también puede estar en mitad de la calzada pero su función principal es organizar el tráfico (no solo proteger peatones)."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Пешеходные зоны и островки"},
      {"type":"callout","variant":"info","title":"Тротуар (Acera)","text":"Продольная зона дороги, приподнятая или нет, предназначенная для пешеходного движения."},
      {"type":"callout","variant":"info","title":"Пешеходная зона (Zona peatonal)","text":"Часть дороги, приподнятая или иным образом выделенная, зарезервированная для движения пешеходов. ВКЛЮЧАЕТ тротуар, перрон и бульвар."},
      {"type":"callout","variant":"info","title":"Убежище (Refugio)","text":"Платформа или пространство для защиты пешеходов при переходе через дорогу. Располагается посередине широкой улицы или на пересечении двух дорог."},
      {"type":"callout","variant":"info","title":"Островок (Isleta)","text":"Конструкция на проезжей части для повышения безопасности и плавности движения. Небольшой участок земли, приподнятый или обозначенный, в центре улицы или дороги. Функции: разделение полос, убежище для пешеходов, улучшение видимости, снижение скорости."},
      {"type":"callout","variant":"warning","text":"Ключевое отличие: УБЕЖИЩЕ находится посередине проезжей части для того, чтобы пешеходы могли остановиться при переходе. ОСТРОВОК тоже может быть посередине, но его основная функция — организация движения (не только защита пешеходов)."}
    ]}'
  );

  -- ── Step 6 · Theory — Glorieta y Apartadero ──────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Glorieta","text":"Tipo especial de intersección caracterizado porque los tramos que confluyen se comunican a través de un anillo en el que se establece una circulación ROTATORIA alrededor de una isleta central. Todos los vehículos circulan en el mismo sentido alrededor de la isleta."},
      {"type":"callout","variant":"danger","title":"¡Ojo! Glorieta partida ≠ Glorieta","text":"Las glorietas PARTIDAS (en las que dos tramos, generalmente opuestos, se conectan directamente a través de la isleta central, y el tráfico pasa de uno a otro sin rodearla) NO son glorietas propiamente dichas."},
      {"type":"callout","variant":"info","title":"Apartadero","text":"Ensanchamiento de la calzada que sirve para facilitar la circulación de otros vehículos, proporcionando un espacio donde los automóviles pueden apartarse sin interrumpir el flujo de tráfico. Se usa típicamente en carreteras estrechas de montaña o zonas rurales para que dos vehículos puedan cruzarse."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Кольцевая развязка (Glorieta)","text":"Особый тип пересечения, в котором съезжающиеся дороги соединяются через кольцо с КРУГОВЫМ движением вокруг центрального островка. Все транспортные средства движутся в одном направлении вокруг островка."},
      {"type":"callout","variant":"danger","title":"Внимание! Разорванная кольцевая ≠ Кольцевая","text":"РАЗОРВАННЫЕ кольцевые развязки (в которых два участка, как правило противоположные, соединяются непосредственно через центральный островок, и транспорт переезжает с одного на другой, не объезжая) НЕ являются кольцевыми развязками в полном смысле."},
      {"type":"callout","variant":"info","title":"Карман (Apartadero)","text":"Уширение проезжей части для облегчения движения других транспортных средств: предоставляет место, где автомобили могут съехать в сторону, не прерывая транспортный поток. Обычно используется на узких горных дорогах или в сельской местности, чтобы два ТС могли разъехаться."}
    ]}'
  );

  -- ── Step 7 · Quiz — DGT 91432fc2 (apartadero) ────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{"text":"¿Para qué sirve el apartadero indicado por la señal?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-03_test-002/91432fc2-cdc0-4be9-a30d-9066fe647982_1769460467604_pro.webp","options":["Para poder descongestionar la vía en caso de circulación saturada.","Para realizar una parada, con el fin de no entorpecer el paso a los demás.","Para poder apartar el vehículo en caso de emergencia."],"correct":2,"explanation":"El apartadero es un ensanchamiento de la calzada que sirve para que los automóviles puedan apartarse de la calzada sin interrumpir el flujo de tráfico, especialmente en caso de avería o emergencia en carreteras estrechas. Permite que otros vehículos puedan continuar circulando."}',
    '{"text":"Для чего служит карман, обозначенный знаком?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-03_test-002/91432fc2-cdc0-4be9-a30d-9066fe647982_1769460467604_pro.webp","options":["Чтобы разгрузить дорогу в случае плотного движения.","Для выполнения остановки, чтобы не мешать проезду остальных.","Чтобы убрать транспортное средство в случае экстренной ситуации."],"correct":2,"explanation":"Карман — это уширение проезжей части, позволяющее автомобилям съехать с дороги, не прерывая транспортный поток, особенно в случае поломки или экстренной ситуации на узких дорогах. Это позволяет другим ТС продолжать движение."}'
  );

  -- ── Step 8 · Quiz — DGT 119f82bf (peatones glorieta sin paso) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"Los peatones que quieran atravesar una glorieta en la que no exista paso para peatones, están obligados a...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/119f82bf-49a5-4f9b-9866-5ea1db095bc2.webp","options":["rodearla.","cruzarla por el camino más recto posible.","caminar por el borde interior de la isleta central."],"correct":0,"explanation":"Los peatones que quieran atravesar una glorieta en la que no exista paso habilitado para peatones están obligados a rodearla. No pueden cruzar directamente por el anillo de circulación ni por la isleta central, ya que sería peligroso e ilegal."}',
    '{"text":"Пешеходы, желающие пересечь кольцевую развязку, на которой нет пешеходного перехода, обязаны...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/119f82bf-49a5-4f9b-9866-5ea1db095bc2.webp","options":["обойти её по периметру.","пересечь её по кратчайшему пути.","идти по внутреннему краю центрального островка."],"correct":0,"explanation":"Пешеходы, желающие пересечь кольцевую развязку без обозначенного перехода, обязаны обойти её по периметру. Нельзя напрямую пересекать кольцо движения или центральный островок — это опасно и незаконно."}'
  );

  -- ── Step 9 · Theory — Intersección, paso a nivel, curva, cambio rasante ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Intersecciones y accidentes del terreno"},
      {"type":"callout","variant":"info","title":"Intersección","text":"Nudo de la red viaria en el que todos los cruces de trayectorias posibles de los vehículos se realizan A NIVEL (en el mismo plano). Incluye cruces en T, en X, en Y, y las glorietas."},
      {"type":"callout","variant":"info","title":"Paso a nivel","text":"Cruce a la MISMA ALTURA entre una vía y una línea de ferrocarril con plataforma independiente. Es el punto donde una carretera y un ferrocarril se cruzan al mismo nivel (no hay puente ni túnel)."},
      {"type":"callout","variant":"info","title":"Curva","text":"Sección de la vía que cambia de dirección, creando un giro en el trayecto del vehículo. Exige reducir la velocidad y aumentar la precaución."},
      {"type":"callout","variant":"info","title":"Cambio de rasante","text":"Punto en una vía donde la pendiente del terreno cambia, creando una elevación o una depresión en la carretera. En los cambios de rasante con poca visibilidad se debe dejar libre la mitad de la calzada del sentido contrario."},
      {"type":"callout","variant":"warning","text":"Diferencia entre paso a nivel e intersección: en la intersección se cruzan dos CARRETERAS. En el paso a nivel se cruzan una CARRETERA y una VÍA FERROVIARIA."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Пересечения и рельефные элементы дороги"},
      {"type":"callout","variant":"info","title":"Перекрёсток (Intersección)","text":"Узел дорожной сети, где все возможные пересечения траекторий транспортных средств происходят В ОДНОМ УРОВНЕ. Включает Т-образные, крестообразные, У-образные перекрёстки и кольцевые развязки."},
      {"type":"callout","variant":"info","title":"Железнодорожный переезд (Paso a nivel)","text":"Пересечение НА ОДНОМ УРОВНЕ между дорогой и железнодорожной линией с независимой платформой. Место, где дорога и железная дорога пересекаются в одной плоскости (без моста или тоннеля)."},
      {"type":"callout","variant":"info","title":"Поворот (Curva)","text":"Участок дороги, меняющий направление и создающий изгиб на пути транспортного средства. Требует снижения скорости и повышенной осторожности."},
      {"type":"callout","variant":"info","title":"Перелом продольного профиля (Cambio de rasante)","text":"Точка на дороге, где меняется уклон местности, создавая подъём или спуск. На переломах с ограниченной видимостью необходимо оставлять свободной половину проезжей части встречного направления."},
      {"type":"callout","variant":"warning","text":"Разница между ж/д переездом и перекрёстком: на перекрёстке пересекаются два ШОССЕ. На ж/д переезде пересекаются ШОССЕ и ЖЕЛЕЗНОДОРОЖНАЯ ЛИНИЯ."}
    ]}'
  );

  -- ── Step 10 · Quiz — DGT 09992d19 (cambio de rasante) ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{"text":"¿Por dónde se debe circular en un cambio de rasante de reducida visibilidad?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/09992d19-bf5f-4598-a1dd-e3d1f86cf6e1.webp","options":["Por donde más convenga a mi destino.","Por la izquierda, aunque se invada parte del centro de la calzada.","Dejando completamente libre la mitad de la calzada que corresponda a los que puedan circular en sentido contrario."],"correct":2,"explanation":"En un cambio de rasante con reducida visibilidad se debe circular dejando completamente libre la mitad de la calzada correspondiente al sentido contrario. La falta de visibilidad implica que puede venir un vehículo en dirección opuesta que no podemos ver, por lo que hay que darle espacio suficiente."}',
    '{"text":"По какой полосе следует двигаться на переломе продольного профиля с ограниченной видимостью?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/09992d19-bf5f-4598-a1dd-e3d1f86cf6e1.webp","options":["Там, где удобнее для моего маршрута.","По левой стороне, даже если занимается часть центра проезжей части.","Оставляя полностью свободной половину проезжей части, предназначенную для встречного движения."],"correct":2,"explanation":"На переломе продольного профиля с ограниченной видимостью необходимо двигаться, полностью оставляя свободной половину проезжей части встречного направления. Ограниченная видимость означает, что навстречу может ехать транспортное средство, которое мы не видим, поэтому нужно оставить ему достаточно места."}'
  );

  -- ── Step 11 · Theory — Tabla resumen todos los elementos ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Resumen: todos los elementos de la vía"},
      {"type":"table","headers":["Elemento","¿Para vehículos?","¿Para peatones?","Clave"],"rows":[
        ["Plataforma","✅ (calzada+arcenes)","No directamente","Calzada + arcenes"],
        ["Calzada","✅ Sí","No","Zona de carriles"],
        ["Carril","✅ Sí","No","Banda longitudinal de la calzada"],
        ["Arcén","⚠️ Excepcional","Peatones sí","Franja afirmada junto calzada"],
        ["Berma","❌ No","No","Soporte barreras/señales"],
        ["Cuneta","❌ No","No","Drenaje pluvial"],
        ["Mediana","❌ No","No","Entre dos calzadas"],
        ["Acera","❌ No","✅ Sí","Zona peatonal longitudinal"],
        ["Refugio","❌ No","✅ Sí","Protege al cruzar la calzada"],
        ["Isleta","⚠️ Rodear","⚠️ Rodear/parar","Organiza tráfico"],
        ["Glorieta","✅ Rodando","Rodear si no hay paso","Intersección rotatoria"],
        ["Apartadero","✅ Emergencia","No","Ensanchamiento para apartar"],
        ["Intersección","✅ Sí","Con cuidado","Cruce a nivel"],
        ["Paso a nivel","✅ Sí","Con precaución","Cruce carretera + ferrocarril"]
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сводка: все элементы дороги"},
      {"type":"table","headers":["Элемент","Для ТС?","Для пешеходов?","Ключ"],"rows":[
        ["Платформа","✅ (часть+обочины)","Не напрямую","Проезжая часть + обочины"],
        ["Проезжая часть","✅ Да","Нет","Зона полос движения"],
        ["Полоса движения","✅ Да","Нет","Продольная полоса проезжей части"],
        ["Обочина","⚠️ Исключительно","Пешеходы — да","Укреплённая полоса у проезжей части"],
        ["Берма","❌ Нет","Нет","Опора барьеров/знаков"],
        ["Кювет","❌ Нет","Нет","Дренаж дождевых вод"],
        ["Разделительная полоса","❌ Нет","Нет","Между двумя проезжими частями"],
        ["Тротуар","❌ Нет","✅ Да","Пешеходная продольная зона"],
        ["Убежище","❌ Нет","✅ Да","Защита при переходе"],
        ["Островок","⚠️ Объезжать","⚠️ Объезжать/стоять","Организует движение"],
        ["Кольцевая развязка","✅ По кольцу","Обходить если нет перехода","Круговое пересечение"],
        ["Карман","✅ Экстренно","Нет","Уширение для съезда"],
        ["Перекрёсток","✅ Да","Осторожно","Пересечение в одном уровне"],
        ["Ж/д переезд","✅ Да","С осторожностью","Пересечение дороги и ж/д"]
      ]}
    ]}'
  );

  -- ── Step 12 · Quiz — authored (zona peatonal qué incluye) ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Cuál de los siguientes elementos forma parte de la zona peatonal según el Reglamento General de Circulación?","options":["La mediana y el carril reversible.","La acera, el andén y el paseo.","El arcén y la berma."],"correct":1,"explanation":"La zona peatonal incluye la acera, el andén y el paseo. Es la parte de la vía reservada a la circulación de peatones, elevada o delimitada de otra forma. El arcén y la berma no son zona peatonal; la mediana tampoco."}',
    '{"text":"Какой из следующих элементов входит в пешеходную зону согласно Общим правилам дорожного движения?","options":["Разделительная полоса и реверсивная полоса.","Тротуар, перрон и бульвар.","Обочина и берма."],"correct":1,"explanation":"Пешеходная зона включает тротуар, перрон и бульвар. Это часть дороги, зарезервированная для пешеходного движения, приподнятая или иным образом выделенная. Обочина и берма не являются пешеходной зоной; разделительная полоса тоже нет."}'
  );

END $$;
