-- Lección 1.2.14 — Prohibiciones de los conductores (cascos, teléfono, inhibidores)
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Quiz Step 3: DGT 88ebf8f4 (teléfono con mano → infracción grave -6 pts → idx 1)
-- Quiz Step 4: DGT 62aeca71 (teléfono detenido en semáforo → No → idx 1)
-- Quiz Step 6: DGT ac32fa86 (manos libres → Sí permitido → idx 1)
-- Quiz Step 8: DGT 847fa5c8 (auriculares motocicleta → No → idx 1)
-- Quiz Step 9: DGT 19161bf3 (moto teléfono entre cabeza y casco → No -3 pts → idx 0)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.14',
     'Prohibiciones de los conductores',
     'Запреты для водителей',
     21, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Cascos y auriculares prohibidos ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Prohibición de cascos y auriculares","text":"Queda prohibido conducir utilizando cascos o auriculares conectados a aparatos receptores o reproductores de sonido. La prohibición aplica a todos los conductores de cualquier vehículo: coches, motocicletas, bicicletas, etc."},
      {"type":"list","style":"check","title":"Excepciones permitidas","items":[
        "Audífonos de carácter médico (prótesis auditivas) — siempre permitidos",
        "Sistemas de comunicación integrados en el casco de moto homologados para manos libres"
      ]},
      {"type":"list","style":"cross","title":"Dispositivos prohibidos en conducción","items":[
        "Auriculares de música o reproductores MP3/MP4",
        "Cascos de música o audio consumer",
        "Cualquier auricular que reduzca la percepción del entorno sonoro"
      ]},
      {"type":"callout","variant":"warning","title":"Sanción","text":"Usar cascos o auriculares mientras se conduce: infracción grave — pérdida de 3 puntos del carné."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Запрет наушников и гарнитуры","text":"Запрещается управлять транспортным средством, используя наушники или гарнитуру, подключённую к аудиоприёмникам или плеерам. Запрет распространяется на всех водителей любых транспортных средств: автомобилей, мотоциклов, велосипедов и т.д."},
      {"type":"list","style":"check","title":"Разрешённые исключения","items":[
        "Слуховые аппараты медицинского характера (слуховые протезы) — всегда разрешены",
        "Системы связи, встроенные в шлем мотоциклиста и сертифицированные для режима hands-free"
      ]},
      {"type":"list","style":"cross","title":"Запрещённые устройства при вождении","items":[
        "Музыкальные наушники или плееры MP3/MP4",
        "Аудиошлемы потребительского класса",
        "Любые наушники, снижающие восприятие звуков окружающей среды"
      ]},
      {"type":"callout","variant":"warning","title":"Санкция","text":"Использование наушников или гарнитуры за рулём: серьёзное нарушение — лишение 3 баллов водительского удостоверения."}
    ]}'
  );

  -- ── Step 2 · Theory — Teléfono móvil: reglas ─────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Teléfono móvil al volante"},
      {"type":"callout","variant":"danger","title":"Prohibición general","text":"Está prohibido conducir sujetando el teléfono móvil con la mano, ya sea para hablar, escribir mensajes, consultar aplicaciones o cualquier otro uso. La prohibición aplica incluso cuando el vehículo está detenido: en semáforo en rojo, en stop, en un atasco."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"❌","title":"Prohibido","description":"Sujetar el teléfono con la mano mientras se conduce o está detenido en semáforo/stop/atasco."},
        {"icon":"✅","title":"Permitido","description":"Uso de manos libres: auricular con cable o bluetooth, altavoz del vehículo, siempre que no requiera manipular el dispositivo."}
      ]},
      {"type":"callout","variant":"danger","title":"Sanción teléfono con mano","text":"Infracción GRAVE: pérdida de 6 puntos del carné de conducir."},
      {"type":"callout","variant":"warning","text":"El uso del teléfono en semáforo en rojo está igualmente prohibido. ''Estoy parado'' no es excusa: el vehículo sigue estando en circulación."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Мобильный телефон за рулём"},
      {"type":"callout","variant":"danger","title":"Общий запрет","text":"Запрещается управлять автомобилем, держа мобильный телефон в руке — для разговора, написания сообщений, использования приложений или любых других целей. Запрет действует даже при остановке: на красный светофор, знак стоп, в пробке."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"❌","title":"Запрещено","description":"Держать телефон в руке во время вождения или стоя на светофоре/знаке стоп/в пробке."},
        {"icon":"✅","title":"Разрешено","description":"Режим hands-free: проводная гарнитура или bluetooth, динамик автомобиля — при условии, что устройство не нужно держать руками."}
      ]},
      {"type":"callout","variant":"danger","title":"Санкция: телефон в руке","text":"Серьёзное нарушение: лишение 6 баллов водительского удостоверения."},
      {"type":"callout","variant":"warning","text":"Использование телефона на красный светофор также запрещено. «Я стою» — не оправдание: транспортное средство всё ещё находится в процессе движения."}
    ]}'
  );

  -- ── Step 3 · Quiz — DGT 88ebf8f4 (teléfono con mano -6 pts) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{"text":"¿Está permitido conducir sujetando el teléfono móvil con la mano?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-002/88ebf8f4-2bbd-4a9d-a834-48692822c0a7.webp","options":["Sí, si solo escucha sin hablar.","No, es una infracción grave con pérdida de 6 puntos del carné.","Sí, si el vehículo circula a menos de 30 km/h."],"correct":1,"explanation":"No está permitido conducir sujetando el teléfono móvil con la mano. Es una infracción grave que conlleva la pérdida de 6 puntos del carné de conducir. La prohibición aplica independientemente de la velocidad o del uso que se le dé al teléfono."}',
    '{"text":"Разрешено ли управлять транспортным средством, держа мобильный телефон в руке?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-002/88ebf8f4-2bbd-4a9d-a834-48692822c0a7.webp","options":["Да, если только слушает, не разговаривая.","Нет, это серьёзное нарушение с лишением 6 баллов удостоверения.","Да, если скорость менее 30 км/ч."],"correct":1,"explanation":"Нельзя управлять транспортным средством, держа мобильный телефон в руке. Это серьёзное нарушение, влекущее лишение 6 баллов водительского удостоверения. Запрет действует вне зависимости от скорости и способа использования телефона."}'
  );

  -- ── Step 4 · Quiz — DGT 62aeca71 (teléfono en semáforo) ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Puede el conductor usar el teléfono móvil cuando está detenido ante un semáforo en rojo?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-007/62aeca71-ea67-4625-8eb4-7652eba47a51_1768679353512.webp","options":["Sí, porque el vehículo está completamente parado.","No, está prohibido aunque esté detenido ante un semáforo en rojo.","Sí, si la parada dura más de 30 segundos."],"correct":1,"explanation":"No, está prohibido aunque el vehículo esté detenido ante un semáforo en rojo, en un stop o en un atasco. El vehículo sigue estando ''en circulación'', por lo que la prohibición de usar el teléfono con la mano se mantiene en todo momento."}',
    '{"text":"Может ли водитель использовать мобильный телефон, стоя на красный светофор?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-007/62aeca71-ea67-4625-8eb4-7652eba47a51_1768679353512.webp","options":["Да, так как автомобиль полностью остановлен.","Нет, запрещено даже при остановке на красный светофор.","Да, если остановка длится более 30 секунд."],"correct":1,"explanation":"Нет, запрещено даже при остановке на красный светофор, знак стоп или в пробке. Транспортное средство всё ещё считается «участвующим в движении», поэтому запрет на использование телефона в руке действует постоянно."}'
  );

  -- ── Step 5 · Theory — Manos libres: cuándo está permitido ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Manos libres: uso permitido","text":"El uso del teléfono mediante manos libres (auricular, bluetooth, altavoz integrado en el vehículo) está permitido mientras se conduce, siempre que no requiera manipular el dispositivo con las manos."},
      {"type":"list","style":"check","title":"Manos libres correcto","items":[
        "Auricular con cable conectado antes de iniciar la marcha",
        "Dispositivo bluetooth emparejado previamente",
        "Altavoz del propio vehículo con control de voz",
        "El teléfono no es tocado durante la conducción"
      ]},
      {"type":"list","style":"cross","title":"Manos libres incorrecto","items":[
        "Coger el teléfono para aceptar una llamada entrante",
        "Marcar un número mientras se circula",
        "Leer o escribir mensajes aunque sea con un solo toque",
        "Colocar o ajustar el auricular mientras se conduce"
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"tip","title":"Hands-free: разрешённое использование","text":"Использование телефона в режиме hands-free (гарнитура, bluetooth, встроенный динамик автомобиля) разрешено во время вождения, при условии, что не требуется держать устройство руками."},
      {"type":"list","style":"check","title":"Правильное использование hands-free","items":[
        "Проводная гарнитура, подключённая до начала движения",
        "Предварительно сопряжённое bluetooth-устройство",
        "Динамик автомобиля с голосовым управлением",
        "Телефон не трогается во время вождения"
      ]},
      {"type":"list","style":"cross","title":"Неправильное использование hands-free","items":[
        "Брать телефон чтобы принять входящий вызов",
        "Набирать номер во время движения",
        "Читать или писать сообщения даже одним касанием",
        "Надевать или поправлять гарнитуру во время вождения"
      ]}
    ]}'
  );

  -- ── Step 6 · Quiz — DGT ac32fa86 (manos libres permitido) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'quiz',
    '{"text":"¿Está permitido conducir utilizando el teléfono con manos libres (auricular)?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/ac32fa86-7710-417b-b998-c217d8262541.webp","options":["No, cualquier uso del teléfono está prohibido durante la conducción.","Sí, el uso de manos libres está permitido siempre que no requiera manipular el teléfono.","Solo en vías urbanas a menos de 50 km/h."],"correct":1,"explanation":"Sí, el uso del teléfono mediante manos libres está permitido mientras se conduce. Lo que está prohibido es sujetar el teléfono con la mano. El manos libres (auricular, bluetooth, altavoz del vehículo) permite la comunicación sin retirar las manos del volante."}',
    '{"text":"Разрешено ли управлять транспортным средством, используя телефон в режиме hands-free (гарнитура)?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/ac32fa86-7710-417b-b998-c217d8262541.webp","options":["Нет, любое использование телефона запрещено во время вождения.","Да, использование hands-free разрешено, если не требуется держать телефон руками.","Только в городе со скоростью менее 50 км/ч."],"correct":1,"explanation":"Да, использование телефона в режиме hands-free разрешено во время вождения. Запрещено держать телефон в руке. Режим hands-free (гарнитура, bluetooth, динамик автомобиля) позволяет общаться, не убирая руки с руля."}'
  );

  -- ── Step 7 · Theory — Cascos y auriculares en motocicleta ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Motocicletas: prohibición especial de auriculares","text":"Los conductores de motocicletas, ciclomotores y vehículos similares NO pueden utilizar cascos o auriculares de audio durante la conducción. La prohibición incluye colocar el teléfono entre la cabeza y el casco."},
      {"type":"callout","variant":"danger","title":"Penalización","text":"Colocar el teléfono entre la cabeza y el casco para escuchar o hablar: infracción GRAVE con pérdida de 3 puntos del carné."},
      {"type":"list","style":"check","title":"Permitido en moto","items":[
        "Sistemas de comunicación integrados en el casco con certificación homologada",
        "Interfono entre piloto y pasajero integrado en el casco",
        "Audífonos médicos (prótesis auditivas)"
      ]},
      {"type":"callout","variant":"warning","text":"El motorista que coloca el teléfono entre la cabeza y el casco está vulnerando dos normas a la vez: la prohibición de auriculares (-3 puntos) y posiblemente la de teléfono con la mano (-6 puntos)."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Мотоциклы: специальный запрет наушников","text":"Водители мотоциклов, мопедов и аналогичных ТС НЕ могут использовать аудионаушники или гарнитуру во время езды. Запрет включает размещение телефона между головой и шлемом."},
      {"type":"callout","variant":"danger","title":"Наказание","text":"Размещение телефона между головой и шлемом для прослушивания или разговора: серьёзное нарушение — лишение 3 баллов удостоверения."},
      {"type":"list","style":"check","title":"Разрешено на мотоцикле","items":[
        "Системы связи, встроенные в шлем и имеющие сертификацию hands-free",
        "Интерком между водителем и пассажиром, встроенный в шлем",
        "Медицинские слуховые аппараты"
      ]},
      {"type":"callout","variant":"warning","text":"Мотоциклист, помещающий телефон между головой и шлемом, нарушает сразу два правила: запрет наушников (-3 балла) и, возможно, запрет на телефон в руке (-6 баллов)."}
    ]}'
  );

  -- ── Step 8 · Quiz — DGT 847fa5c8 (auriculares en motocicleta) ────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"¿Pueden los conductores de motocicletas utilizar auriculares o cascos de música durante la conducción?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/847fa5c8-2241-4c77-aac0-2361f0e598bd_1768812585522.webp","options":["Sí, siempre que no superen cierto nivel de volumen.","No, como norma general está prohibido.","Solo si el casco tiene auriculares incorporados de fábrica."],"correct":1,"explanation":"No, como norma general los conductores de motocicletas no pueden utilizar auriculares ni cascos de música durante la conducción. La excepción son los sistemas de comunicación integrados en el casco específicamente homologados para ello y los audífonos de carácter médico."}',
    '{"text":"Могут ли водители мотоциклов использовать наушники или аудиошлем во время езды?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/847fa5c8-2241-4c77-aac0-2361f0e598bd_1768812585522.webp","options":["Да, если громкость не превышает определённого уровня.","Нет, как правило это запрещено.","Только если шлем имеет встроенные наушники от производителя."],"correct":1,"explanation":"Нет, как правило водители мотоциклов не могут использовать наушники или аудиошлем во время езды. Исключением являются системы связи, встроенные в шлем и специально для этого сертифицированные, а также медицинские слуховые аппараты."}'
  );

  -- ── Step 9 · Quiz — DGT 19161bf3 (moto teléfono entre cabeza y casco) ────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"¿Puede un motorista colocar el teléfono entre la cabeza y el casco para hablar durante la conducción?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-004/19161bf3-f905-43c7-bf18-de9ab32cc077_1769546412584_pro.webp","options":["No, es una infracción grave con pérdida de 3 puntos del carné.","Sí, si no toca el teléfono con las manos mientras conduce.","Solo si el trayecto es corto y en zona urbana."],"correct":0,"explanation":"No, un motorista no puede colocar el teléfono entre la cabeza y el casco. Se considera una infracción grave con pérdida de 3 puntos del carné, equivalente al uso de auriculares prohibidos. Además, el teléfono afecta la correcta colocación del casco, poniendo en peligro la seguridad del motorista."}',
    '{"text":"Может ли мотоциклист разместить телефон между головой и шлемом для разговора во время езды?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-06_test-004/19161bf3-f905-43c7-bf18-de9ab32cc077_1769546412584_pro.webp","options":["Нет, это серьёзное нарушение — лишение 3 баллов удостоверения.","Да, если не касается телефона руками во время езды.","Только при коротких поездках в городе."],"correct":0,"explanation":"Нет, мотоциклист не может размещать телефон между головой и шлемом. Это считается серьёзным нарушением — лишением 3 баллов удостоверения, равнозначным использованию запрещённых наушников. Кроме того, телефон нарушает правильную посадку шлема, угрожая безопасности мотоциклиста."}'
  );

  -- ── Step 10 · Theory — Inhibidores de radar: prohibidos ──────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Inhibidores de radar: absolutamente prohibidos","text":"Está terminantemente prohibido instalar o usar en el vehículo inhibidores o perturbadores del funcionamiento de los sistemas de vigilancia del tráfico (radares de velocidad, cinemómetros, etc.). Son dispositivos que emiten señales para interferir con los radares de la DGT."},
      {"type":"callout","variant":"tip","title":"Avisadores de radar: permitidos con condiciones","text":"Los avisadores o detectores de radar (dispositivos que alertan al conductor de la proximidad de un radar sin perturbarlo) están PERMITIDOS, siempre que se ajusten a la normativa de telecomunicaciones y no emitan señales que interfieran con los equipos oficiales."},
      {"type":"table","headers":["Dispositivo","¿Permitido?","Función"],"rows":[
        ["Inhibidor de radar","❌ PROHIBIDO","Interfiere/bloquea el radar de la DGT"],
        ["Avisador de radar","✅ PERMITIDO","Avisa al conductor de la proximidad de un radar"],
        ["GPS con POIs de radar","✅ PERMITIDO","Indica por GPS dónde están los radares fijos"]
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Глушители радаров: абсолютно запрещены","text":"Категорически запрещается устанавливать или использовать в транспортном средстве глушители или помехообразователи систем контроля дорожного движения (радаров скорости, спидометров и т.д.). Это устройства, излучающие сигналы для создания помех радарам DGT."},
      {"type":"callout","variant":"tip","title":"Предупредители радаров: разрешены с условиями","text":"Оповещатели или детекторы радаров (устройства, предупреждающие водителя о приближении к радару, не создавая ему помех) РАЗРЕШЕНЫ, если соответствуют телекоммуникационному законодательству и не излучают сигналов, мешающих официальным приборам."},
      {"type":"table","headers":["Устройство","Разрешено?","Функция"],"rows":[
        ["Глушитель радара","❌ ЗАПРЕЩЕНО","Мешает/блокирует радар DGT"],
        ["Оповещатель радара","✅ РАЗРЕШЕНО","Предупреждает о приближении радара"],
        ["GPS с точками радаров","✅ РАЗРЕШЕНО","Указывает по GPS расположение стационарных радаров"]
      ]}
    ]}'
  );

  -- ── Step 11 · Theory — Resumen de sanciones ──────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Resumen de sanciones: dispositivos y teléfono"},
      {"type":"table","headers":["Infracción","Puntos","Tipo"],"rows":[
        ["Teléfono con la mano (coche/moto)","−6 puntos","Grave"],
        ["Cascos o auriculares al conducir","−3 puntos","Grave"],
        ["Moto: teléfono entre cabeza y casco","−3 puntos","Grave"],
        ["Inhibidor de radar","−6 puntos + multa","Muy grave"],
        ["TV/vídeo visible mientras conduce","−3 puntos","Grave"]
      ],"caption":"Todos implican además multa económica"},
      {"type":"callout","variant":"warning","text":"Mnemotécnico: MANO = 6 puntos (doble). CASCO/AURICULAR = 3 puntos (simple). Inhibidor = lo más grave."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сводка санкций: устройства и телефон"},
      {"type":"table","headers":["Нарушение","Баллы","Тип"],"rows":[
        ["Телефон в руке (авто/мото)","−6 баллов","Серьёзное"],
        ["Наушники/гарнитура за рулём","−3 балла","Серьёзное"],
        ["Мото: телефон между головой и шлемом","−3 балла","Серьёзное"],
        ["Глушитель радара","−6 баллов + штраф","Очень серьёзное"],
        ["ТВ/видео видно при езде","−3 балла","Серьёзное"]
      ],"caption":"Все случаи предполагают также денежный штраф"},
      {"type":"callout","variant":"warning","text":"Мнемоника: РУКА = 6 баллов (двойное). ШЛЕМ/НАУШНИКИ = 3 балла (одинарное). Глушитель = самое серьёзное."}
    ]}'
  );

  -- ── Step 12 · Quiz — authored (inhibidor vs avisador) ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"text":"¿Cuál de los siguientes dispositivos está PROHIBIDO instalar en un vehículo?","options":["Un GPS que muestra en el mapa la ubicación de los radares fijos.","Un avisador que emite un sonido al acercarse a un radar.","Un inhibidor que emite señales para interferir con los radares de la DGT."],"correct":2,"explanation":"Los inhibidores de radar (que interfieren con los equipos de vigilancia del tráfico) están absolutamente prohibidos. Los avisadores de radar (que solo alertan al conductor) y los GPS con puntos de interés de radares están permitidos, ya que no interfieren con el funcionamiento de los equipos oficiales."}',
    '{"text":"Какое из следующих устройств ЗАПРЕЩЕНО устанавливать в автомобиле?","options":["GPS, показывающий на карте расположение стационарных радаров.","Оповещатель, издающий звук при приближении к радару.","Глушитель, излучающий сигналы для создания помех радарам DGT."],"correct":2,"explanation":"Глушители радаров (создающие помехи системам контроля трафика) абсолютно запрещены. Оповещатели радаров (только предупреждающие водителя) и GPS с точками радаров разрешены, так как не мешают работе официальных приборов."}'
  );

END $$;
