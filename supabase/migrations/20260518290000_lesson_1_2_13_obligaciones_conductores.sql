-- Lección 1.2.13 — Obligaciones de los conductores
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 8: DGT dbe4b070 (repostar → parar motor+eléctricos+teléfonos → idx 2)
-- Quiz Step 9: DGT 1e38af62 (aparatos apagar al cargar combustible → motor+luces+eléctricos+teléfonos → idx 1)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.13',
     'Obligaciones de los conductores',
     'Обязанности водителей',
     20, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Principio general: diligencia y plena capacidad ────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Obligación fundamental del conductor","text":"Todo conductor debe actuar con la diligencia y precaución necesarias para evitar todo daño, propio o ajeno, cuidando de no poner en peligro, ni al propio conductor, ni a los demás ocupantes del vehículo ni al resto de los usuarios de la vía."},
      {"type":"callout","variant":"danger","title":"Prohibición de conducción negligente o temeraria","text":"Queda prohibida la conducción negligente: aquella que supone un riesgo grave para la seguridad vial. También la conducción temeraria: la que manifiesta un desprecio absoluto hacia la seguridad de los demás usuarios."},
      {"type":"list","style":"check","title":"Conducción correcta implica","items":[
        "Mantener plena capacidad física y psíquica en todo momento",
        "No conducir bajo efecto de alcohol, drogas o medicamentos que afecten a la conducción",
        "Adaptar la velocidad a las condiciones de la vía",
        "Mantener la distancia de seguridad"
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Основная обязанность водителя","text":"Каждый водитель обязан действовать с необходимой осмотрительностью и предусмотрительностью, чтобы избежать любого ущерба — себе или другим, заботясь о том, чтобы не подвергать опасности ни себя, ни пассажиров, ни других участников дорожного движения."},
      {"type":"callout","variant":"danger","title":"Запрет небрежного и безрассудного вождения","text":"Запрещается небрежное вождение — создающее серьёзный риск для безопасности дорожного движения. Также безрассудное вождение — демонстрирующее абсолютное пренебрежение к безопасности других участников движения."},
      {"type":"list","style":"check","title":"Правильное вождение подразумевает","items":[
        "Поддерживать полную физическую и психическую дееспособность",
        "Не управлять ТС в состоянии алкогольного, наркотического или медикаментозного опьянения",
        "Адаптировать скорость к условиям дороги",
        "Соблюдать дистанцию безопасности"
      ]}
    ]}'
  );

  -- ── Step 2 · Theory — Condiciones técnicas del conductor ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Condiciones físicas mínimas del conductor"},
      {"type":"list","style":"check","items":[
        "Visión horizontal: ángulo mínimo de 180°",
        "Libertad de movimientos: el conductor debe poder realizar todas las maniobras sin restricción",
        "Postura correcta: sentado en el asiento del conductor con cinturón abrochado",
        "Matrícula legible: el vehículo debe tener la matrícula en perfecto estado, limpia y visible"
      ]},
      {"type":"callout","variant":"warning","text":"Un conductor con el brazo en cabestrillo, que no puede mover el volante con libertad, incumple la obligación de tener libertad de movimientos. Debe abstenerse de conducir hasta su recuperación."},
      {"type":"callout","variant":"info","text":"La matrícula ilegible (sucia, doblada, oculta parcialmente) supone una infracción. El conductor es responsable del estado visible de la matrícula de su vehículo."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Минимальные физические требования к водителю"},
      {"type":"list","style":"check","items":[
        "Горизонтальный угол зрения: минимум 180°",
        "Свобода движений: водитель должен выполнять все манёвры без ограничений",
        "Правильная посадка: сидеть на водительском сиденье с пристёгнутым ремнём",
        "Читаемый номерной знак: знак должен быть в отличном состоянии, чистым и видимым"
      ]},
      {"type":"callout","variant":"warning","text":"Водитель с рукой на перевязи, который не может свободно вращать руль, нарушает требование о свободе движений. Необходимо воздержаться от вождения до выздоровления."},
      {"type":"callout","variant":"info","text":"Нечитаемый номерной знак (грязный, погнутый, частично закрытый) является нарушением. Водитель несёт ответственность за видимое состояние номерного знака своего транспортного средства."}
    ]}'
  );

  -- ── Step 3 · Theory — Dispositivos incompatibles con la conducción ───────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Dispositivos incompatibles con la conducción"},
      {"type":"list","style":"cross","title":"Prohibido usar mientras se conduce","items":[
        "Televisores (TV) cuya imagen sea visible por el conductor",
        "Reproductores de DVD/vídeo con imagen visible desde el asiento del conductor",
        "Dispositivos de internet que requieran manipulación durante la marcha",
        "Pantallas que distraigan la atención del conductor de la vía"
      ]},
      {"type":"list","style":"check","title":"Dispositivos permitidos","items":[
        "GPS / sistemas de navegación: permitidos si son autónomos y no requieren manipulación mientras el vehículo está en marcha",
        "Radio y sistemas de audio: permitidos (no requieren manipulación visual constante)",
        "Asistentes de voz: permitidos si se operan sin manipulación manual"
      ]},
      {"type":"callout","variant":"warning","text":"El GPS no puede ser manipulado mientras el vehículo circula. Solo puede reprogramarse cuando el vehículo esté completamente detenido."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Устройства, несовместимые с вождением"},
      {"type":"list","style":"cross","title":"Запрещено использовать во время вождения","items":[
        "Телевизоры (ТВ), изображение которых видно водителю",
        "Проигрыватели DVD/видео с изображением, видимым с водительского сиденья",
        "Устройства интернета, требующие управления во время движения",
        "Экраны, отвлекающие внимание водителя от дороги"
      ]},
      {"type":"list","style":"check","title":"Разрешённые устройства","items":[
        "GPS / навигационные системы: разрешены, если автономны и не требуют управления во время движения",
        "Радио и аудиосистемы: разрешены (не требуют постоянного зрительного управления)",
        "Голосовые ассистенты: разрешены, если работают без ручного управления"
      ]},
      {"type":"callout","variant":"warning","text":"GPS нельзя перепрограммировать во время движения. Перепрограммирование разрешено только при полной остановке транспортного средства."}
    ]}'
  );

  -- ── Step 4 · Quiz — authored (dispositivos GPS) ───────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Está permitido utilizar un sistema GPS o navegador mientras se conduce?","options":["No, está completamente prohibido cualquier dispositivo electrónico.","Sí, siempre que sea autónomo y no requiera manipulación mientras el vehículo circula.","Sí, pero solo en autopistas y autovías."],"correct":1,"explanation":"El GPS está permitido siempre que sea autónomo y no requiera manipulación mientras el vehículo está en marcha. Solo puede reprogramarse con el vehículo detenido. Lo que está prohibido son los dispositivos de internet o vídeo que requieran intervención visual o manual del conductor durante la circulación."}',
    '{"text":"Разрешено ли использовать GPS-навигатор во время вождения?","options":["Нет, любые электронные устройства полностью запрещены.","Да, при условии, что он автономен и не требует управления во время движения.","Да, но только на автострадах."],"correct":1,"explanation":"GPS разрешён, если он автономен и не требует управления во время движения. Перепрограммирование разрешено только при остановке. Под запретом — устройства интернета или видео, требующие зрительного или ручного вмешательства водителя во время движения."}'
  );

  -- ── Step 5 · Quiz — authored (visión y libertad de movimientos) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"¿Cuál es el ángulo mínimo de visión horizontal que debe tener un conductor?","options":["90°","180°","360°"],"correct":1,"explanation":"El conductor debe tener una visión horizontal mínima de 180°. Esta condición es necesaria para percibir correctamente la vía, los demás vehículos y los peatones en el campo lateral de visión. Si un conductor no cumple este requisito, debe abstenerse de conducir."}',
    '{"text":"Каков минимальный горизонтальный угол зрения у водителя?","options":["90°","180°","360°"],"correct":1,"explanation":"Водитель должен иметь минимальный горизонтальный угол зрения 180°. Это условие необходимо для правильного восприятия дороги, других транспортных средств и пешеходов в боковом поле зрения. Если водитель не соответствует этому требованию, он обязан воздержаться от вождения."}'
  );

  -- ── Step 6 · Theory — Colocación de pasajeros y carga ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Colocación correcta de pasajeros y carga"},
      {"type":"list","style":"check","items":[
        "Los pasajeros deben estar correctamente sentados y con el cinturón de seguridad abrochado",
        "Los menores deben ir en los sistemas de retención homologados según su talla/peso",
        "La carga debe estar bien sujeta y distribuida: no debe sobresalir lateralmente",
        "Los objetos no deben obstaculizar la visibilidad del conductor ni su libertad de movimientos",
        "El conductor debe mantener el control permanente del vehículo en todo momento"
      ]},
      {"type":"callout","variant":"danger","text":"Está prohibido transportar personas en lugares del vehículo no habilitados para ello (maletero, zona de carga, techo). Es una infracción muy grave."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Правильное размещение пассажиров и груза"},
      {"type":"list","style":"check","items":[
        "Пассажиры должны правильно сидеть с пристёгнутым ремнём безопасности",
        "Дети должны находиться в сертифицированных удерживающих системах по росту/весу",
        "Груз должен быть надёжно закреплён и распределён: не должен выступать сбоку",
        "Предметы не должны ограничивать видимость водителя или свободу движений",
        "Водитель должен постоянно контролировать транспортное средство"
      ]},
      {"type":"callout","variant":"danger","text":"Запрещается перевозить людей в местах, не предназначенных для этого (багажник, грузовой отсек, крыша). Это грубое нарушение."}
    ]}'
  );

  -- ── Step 7 · Theory — Repostar: procedimiento correcto ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Procedimiento obligatorio antes de repostar","text":"Antes de cargar combustible, el conductor está obligado a: apagar el motor, desconectar el contacto, apagar las luces, apagar la radio y cualquier aparato eléctrico, y apagar el teléfono móvil. Todo ello para evitar chispas o llamas que puedan inflamar los vapores de combustible."},
      {"type":"list","style":"check","title":"Pasos al repostar","items":[
        "1. Apagar el motor y desconectar el contacto",
        "2. Apagar todas las luces del vehículo",
        "3. Apagar la radio y aparatos eléctricos",
        "4. Apagar el teléfono móvil",
        "5. No fumar en ningún momento durante el repostaje"
      ]},
      {"type":"callout","variant":"warning","text":"¡Dato de examen! La normativa exige apagar TODOS estos sistemas: motor + contacto + luces + radio/eléctricos + teléfono. Un solo fallo puede generar una chispa. No vale con apagar solo el motor."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Обязательная процедура перед заправкой","text":"Перед заправкой водитель обязан: заглушить двигатель, выключить зажигание, выключить фары, выключить радио и все электроприборы, выключить мобильный телефон. Всё это делается во избежание искр или огня, способных воспламенить пары топлива."},
      {"type":"list","style":"check","title":"Шаги при заправке","items":[
        "1. Заглушить двигатель и выключить зажигание",
        "2. Выключить все фары автомобиля",
        "3. Выключить радио и электроприборы",
        "4. Выключить мобильный телефон",
        "5. Не курить в течение всей заправки"
      ]},
      {"type":"callout","variant":"warning","text":"Важно для экзамена! Нормы требуют выключить ВСЕ системы: двигатель + зажигание + фары + радио/электроприборы + телефон. Одна искра может всё воспламенить. Недостаточно выключить только двигатель."}
    ]}'
  );

  -- ── Step 8 · Quiz — DGT dbe4b070 (antes de repostar) ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"Antes de repostar combustible es necesario...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/dbe4b070-7adc-4b27-bcff-842dcba1843e.webp","options":["Conectar el motor para mantener la presión del combustible.","Cerrar todas las ventanillas para evitar que entren vapores.","Parar el motor, desconectar todos los sistemas eléctricos y apagar los teléfonos móviles."],"correct":2,"explanation":"Antes de repostar es obligatorio parar el motor, desconectar todos los sistemas eléctricos y apagar los teléfonos móviles. Estos aparatos pueden generar chispas o llamas que inflamarían los vapores del combustible durante el repostaje."}',
    '{"text":"Перед заправкой топливом необходимо...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/dbe4b070-7adc-4b27-bcff-842dcba1843e.webp","options":["Запустить двигатель для поддержания давления топлива.","Закрыть все окна, чтобы пары не попали внутрь.","Заглушить двигатель, отключить все электросистемы и выключить мобильные телефоны."],"correct":2,"explanation":"Перед заправкой обязательно нужно заглушить двигатель, отключить все электросистемы и выключить мобильные телефоны. Эти устройства могут давать искры или огонь, которые воспламенят пары топлива во время заправки."}'
  );

  -- ── Step 9 · Quiz — DGT 1e38af62 (qué aparatos apagar al repostar) ───────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"¿Qué aparatos debe apagar antes de cargar combustible?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/1e38af62-7bf1-4043-9627-5c35f1494158.webp","options":["Solo el motor.","El motor, las luces, los aparatos eléctricos y los teléfonos móviles.","Solo los aparatos que funcionen con electricidad de 220V."],"correct":1,"explanation":"Antes de cargar combustible hay que apagar el motor, las luces, los aparatos eléctricos y los teléfonos móviles. Todos estos dispositivos pueden generar chispas que incendiarían los vapores del combustible."}',
    '{"text":"Какие приборы нужно выключить перед заправкой?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/1e38af62-7bf1-4043-9627-5c35f1494158.webp","options":["Только двигатель.","Двигатель, фары, электроприборы и мобильные телефоны.","Только приборы, работающие от сети 220В."],"correct":1,"explanation":"Перед заправкой необходимо выключить двигатель, фары, электроприборы и мобильные телефоны. Все эти устройства могут давать искры, которые воспламенят пары топлива."}'
  );

  -- ── Step 10 · Theory — Precaución con usuarios vulnerables ──────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Precaución especial con usuarios vulnerables","text":"Los conductores deben extremar la precaución cuando circulen en proximidad de ciertos grupos de usuarios que, por sus características, son más vulnerables: niños, ancianos, personas con discapacidad, ciclistas y peatones."},
      {"type":"list","style":"check","title":"Obligaciones específicas","items":[
        "Reducir la velocidad al acercarse a grupos de peatones o escolares",
        "Ceder siempre el paso al peatón en pasos habilitados",
        "Mantener distancia lateral de 1,5 m al adelantar a ciclistas",
        "Prestar especial atención a los niños en zonas escolares y residenciales"
      ]},
      {"type":"callout","variant":"info","title":"Colaboración en pruebas reglamentarias","text":"Todo conductor está obligado a colaborar con los agentes de la autoridad en la realización de pruebas de detección de alcohol, drogas, gases contaminantes y ruidos. Negarse es una infracción muy grave."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Особая осторожность с уязвимыми участниками","text":"Водители должны быть особенно осторожны вблизи групп участников, которые в силу своих особенностей более уязвимы: дети, пожилые люди, инвалиды, велосипедисты и пешеходы."},
      {"type":"list","style":"check","title":"Конкретные обязательства","items":[
        "Снижать скорость при приближении к группам пешеходов или детей",
        "Всегда уступать дорогу пешеходам на обозначенных переходах",
        "Соблюдать боковой интервал 1,5 м при обгоне велосипедистов",
        "Уделять особое внимание детям в школьных и жилых зонах"
      ]},
      {"type":"callout","variant":"info","title":"Сотрудничество при проведении контрольных проверок","text":"Каждый водитель обязан сотрудничать с сотрудниками власти при проведении проверок на алкоголь, наркотики, загрязняющие газы и шум. Отказ является грубым нарушением."}
    ]}'
  );

  -- ── Step 11 · Quiz — authored (usuarios vulnerables) ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"¿A qué distancia lateral mínima debe separarse el conductor al adelantar a un ciclista?","options":["0,5 metros","1 metro","1,5 metros"],"correct":2,"explanation":"Al adelantar a un ciclista, el conductor debe mantener una separación lateral mínima de 1,5 metros. Esta distancia es obligatoria para garantizar la seguridad del ciclista ante la corriente de aire generada por el adelantamiento y los posibles movimientos del ciclista."}',
    '{"text":"На каком минимальном боковом расстоянии должен держаться водитель при обгоне велосипедиста?","options":["0,5 метра","1 метр","1,5 метра"],"correct":2,"explanation":"При обгоне велосипедиста водитель обязан соблюдать минимальный боковой интервал 1,5 метра. Это расстояние обязательно для обеспечения безопасности велосипедиста от воздушного потока при обгоне и возможных движений велосипедиста."}'
  );

  -- ── Step 12 · Quiz — authored (negarse a pruebas alcohol) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Está obligado el conductor a someterse a las pruebas de detección de alcohol y drogas que realicen los agentes?","options":["Solo si ha cometido una infracción previa.","Sí, negarse es una infracción muy grave.","Solo si el agente sospecha que ha bebido."],"correct":1,"explanation":"Sí, todo conductor está obligado a colaborar en las pruebas de detección de alcohol, drogas, ruidos y gases que realicen los agentes de la autoridad. Negarse a someterse a dichas pruebas constituye una infracción muy grave."}',
    '{"text":"Обязан ли водитель проходить проверку на алкоголь и наркотики, проводимую сотрудниками?","options":["Только если ранее совершил нарушение.","Да, отказ является грубым нарушением.","Только если сотрудник подозревает, что водитель выпил."],"correct":1,"explanation":"Да, каждый водитель обязан сотрудничать при проведении проверок на алкоголь, наркотики, шум и газы, которые проводят сотрудники власти. Отказ от прохождения таких проверок является грубым нарушением."}'
  );

END $$;
