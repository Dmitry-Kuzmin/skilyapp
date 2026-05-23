-- SQL Migration: Add Lesson 1.6.8 - Carril reversible y uso del arcén
-- Module 1 UUID: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  -- Clean up existing lesson to ensure idempotency
  DELETE FROM lesson_steps WHERE lesson_id IN (SELECT id FROM course_lessons WHERE code = '1.6.8' AND module_id = mod_id);
  DELETE FROM course_lessons WHERE code = '1.6.8' AND module_id = mod_id;

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.6.8',
     'Carril reversible y uso del arcén',
     'Реверсивная полоса и движение по обочине',
     33, 40, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory: Реверсивная полоса (Carril reversible) ──────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril reversible: ¿cómo identificarlo y usarlo?"},
      {"type":"text","text":"El carril reversible sirve para adaptar la capacidad de la vía al flujo del tráfico, pudiendo cambiar el sentido de la circulación según las necesidades. Su uso está regulado por semáforos cuadrados situados sobre la calzada."},
      {"type":"callout","variant":"info","title":"Definición y marca vial","text":"Un carril reversible se reconoce fácilmente porque está delimitado por ambos lados con líneas longitudinales dobles discontinuas. Si circulas por él, estás obligado a llevar encendida la luz de cruce día y noche."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚦","title":"Semáforos de carril","description":"Una flecha verde apuntando hacia abajo indica que el carril está abierto en tu sentido. Un aspa roja indica que el carril está cerrado o prohibido. Una flecha oblicua amarilla indica que debes incorporarte al carril contiguo lo antes posible."},
        {"icon":"⚡","title":"Velocidad y maniobras","description":"Debes respetar la velocidad máxima genérica de la vía (ej. 50 km/h en vía urbana). Está terminantemente prohibido cruzar la doble línea discontinua de la izquierda para adelantar."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Реверсивная полоса: как её распознать и использовать?"},
      {"type":"text","text":"Реверсивная полоса позволяет менять направление движения на противоположное в зависимости от времени суток и плотности транспортного потока. Её режим работы регулируют специальные квадратные светофоры над дорогой."},
      {"type":"callout","variant":"info","title":"Определение и разметка","text":"Реверсивную полосу легко узнать: она выделена с двух сторон двойной прерывистой разметкой. При движении по такой полосе водитель обязан включать ближний свет фар и днем, и ночью."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚦","title":"Квадратные светофоры","description":"Зеленая стрелка вниз означает, что полоса открыта для нашего движения. Красный крест запрещает въезд. Желтая наклонная стрелка указывает, что полоса закрывается и нужно перестроиться вправо."},
        {"icon":"⚡","title":"Скорость и обгон","description":"Скоростной лимит соответствует общим ограничениям дороги (в городе — 50 км/ч). Обгон с пересечением левой двойной прерывистой линии категорически запрещен."}
      ]}
    ]}'
  );

  -- ── Step 2 · Quiz: Обгон на реверсивной полосе (DGT d22b030d-99ed-4828-bb40-80c4b5200e74)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'quiz',
    '{"question_id":"d22b030d-99ed-4828-bb40-80c4b5200e74","explanation":"Aunque el carril reversible esté abierto en tu sentido, no puedes cruzar la doble línea discontinua de la izquierda para adelantar, ya que la calzada contigua está destinada para el sentido contrario."}',
    '{"question_id":"d22b030d-99ed-4828-bb40-80c4b5200e74","explanation":"Даже если реверсивная полоса открыта для движения, пересекать двойную прерывистую разметку слева для совершения обгона запрещено, так как соседняя полоса предназначена для встречного потока."}'
  );

  -- ── Step 3 · Theory: Различия обочин (Arcén transitable vs no transitable) ─────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"El arcén: transitable y no transitable"},
      {"type":"text","text":"El arcén es la franja de terreno longitudinal que rodea la calzada de las carreteras. Sus normas de uso varían drásticamente según sus características físicas."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🛣️","title":"Arcén transitable","description":"Es pavimentado y lo bastante ancho como para que se pueda circular por él (más de 1,5 metros). En vías fuera de poblado está PROHIBIDO realizar paradas o estacionamientos en esta zona."},
        {"icon":"🌱","title":"Arcén no transitable","description":"Es estrecho, de tierra, con vegetación o con pendiente, por lo que no es apto para circular. Sin embargo, en él se permite parar y estacionar fuera de poblado siempre que no se invada la calzada con el vehículo."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Обочина: пригодная и непригодная для движения"},
      {"type":"text","text":"Обочина — это продольная полоса земли, прилегающая к проезжей части. Правила использования обочины зависят от её покрытия и размеров."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🛣️","title":"Проезжая обочина (Transitable)","description":"Заасфальтирована и имеет достаточную ширину (более 1,5 м) для движения медленных ТС. Вне населенных пунктов на такой обочине категорически ЗАПРЕЩЕНЫ остановка и стоянка."},
        {"icon":"🌱","title":"Непроезжая обочина (No transitable)","description":"Узкая, грунтовая или заросшая травой. Ехать по ней нельзя. Однако на ней разрешено останавливаться и ставить машину на стоянку вне города при условии, что кузов авто не занимает проезжую часть."}
      ]}
    ]}'
  );

  -- ── Step 4 · Quiz: Остановка на проезжей обочине (DGT c89d9aaa-2275-4ed1-9a4a-59beee7962e6)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"question_id":"c89d9aaa-2275-4ed1-9a4a-59beee7962e6","explanation":"En la parte transitable del arcén de una carretera interurbana está prohibida tanto la parada como el estacionamiento por motivos de seguridad, para no obstaculizar el paso de los vehículos obligados a circular por él."}',
    '{"question_id":"c89d9aaa-2275-4ed1-9a4a-59beee7962e6","explanation":"На пригодной для движения обочине загородной трассы запрещены как остановка, так и стоянка. Это сделано для безопасности медленных участников движения (велосипедов, мопедов и др.), которые обязаны ехать по ней."}'
  );

  -- ── Step 5 · Theory: ТС на обочине (Vehículos obligados a circular por el arcén) ─
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Vehículos obligados a circular por el arcén"},
      {"type":"text","text":"Si el arcén derecho es transitable y de suficiente ancho, están obligados a utilizarlo por motivos de seguridad una serie de conductores debido a su baja velocidad."},
      {"type":"callout","variant":"info","title":"¿Quiénes deben ir por el arcén?","text":"1. Ciclos (bicicletas).\n2. Vehículos en seguimiento de ciclistas.\n3. Ciclomotores.\n4. Vehículos para personas de movilidad reducida (sillas de ruedas con motor).\n5. Vehículos de tracción animal.\n6. Vehículos especiales con MMA hasta 3500 kg (ej. tractores pequeños)."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚲","title":"Circulación de bicicletas","description":"Las bicicletas pueden circular en paralelo (máximo filas de dos) sin invadir la calzada. Deberán colocarse en hilera de a uno en tramos sin visibilidad o cuando se formen aglomeraciones. En autovías no pueden salir del arcén."},
        {"icon":"🛵","title":"Circulación de ciclomotores","description":"Los ciclomotores pueden circular en columna de a dos excepcionalmente por el arcén, pero nunca en paralelo invadiendo la calzada."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Транспортные средства, обязанные ехать по обочине"},
      {"type":"text","text":"Если правая обочина заасфальтирована и достаточно широка, по ней из соображений безопасности обязаны двигаться водители малоскоростных транспортных средств."},
      {"type":"callout","variant":"info","title":"Кто обязан двигаться по обочине?","text":"1. Велосипеды и сопровождающие их ТС сопровождения.\n2. Мопеды.\n3. Инвалидные коляски с двигателем.\n4. Гужевой транспорт.\n5. Специальные ТС (например, тракторы) массой до 3500 кг."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚲","title":"Движение велосипедов","description":"Велосипедисты могут ехать параллельно максимум по двое. Они обязаны выстроиться в один ряд при плохой видимости или пробках. На скоростных дорогах (autovías) им запрещено съезжать на проезжую часть."},
        {"icon":"🛵","title":"Движение мопедов","description":"Мопеды в исключительных случаях могут ехать параллельно в два ряда по обочине, но им категорически запрещено выезжать на проезжую часть."}
      ]}
    ]}'
  );

  -- ── Step 6 · Quiz: Кто едет по обочине (DGT 1c528631-e5ae-49ee-9146-486bf178f419)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'quiz',
    '{"question_id":"1c528631-e5ae-49ee-9146-486bf178f419","explanation":"Los ciclos, ciclomotores y vehículos para personas de movilidad reducida están obligados a circular por el arcén derecho cuando sea transitable y suficiente para no entorpecer el tráfico rápido."}',
    '{"question_id":"1c528631-e5ae-49ee-9146-486bf178f419","explanation":"Велосипеды, мопеды и транспортные средства для людей с ограниченной подвижностью обязаны двигаться по правой обочине, если она пригодна для движения, чтобы не создавать помех скоростному потоку."}'
  );

  -- ── Step 7 · Quiz: Мопеды в два ряда (DGT 69b170cd-8a87-4870-a9d8-127453442080)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{"question_id":"69b170cd-8a87-4870-a9d8-127453442080","explanation":"De forma excepcional, los conductores de ciclomotores podrán circular en columna de a dos por el arcén derecho, siempre que éste sea transitable y suficiente, sin invadir nunca la calzada principal."}',
    '{"question_id":"69b170cd-8a87-4870-a9d8-127453442080","explanation":"В качестве исключения водителям мопедов разрешено двигаться в два ряда параллельно, но только в пределах правой обочины и при условии, что она достаточно широка и они не выезжают на основную проезжую часть."}'
  );

  -- ── Step 8 · Theory: Обгон на обочине (Adelantamiento por el arcén) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Adelantamiento entre vehículos del arcén"},
      {"type":"text","text":"Los vehículos que circulan por el arcén (por ejemplo, bicicletas, ciclomotores, vehículos especiales pequeños) sí pueden adelantarse entre ellos cuando sea necesario."},
      {"type":"callout","variant":"warning","title":"Límites de tiempo y distancia","text":"Para evitar situaciones de peligro al circular en paralelo, la maniobra de adelantamiento en el arcén no podrá superar:\n- Un tiempo de 15 segundos.\n- Una distancia de 200 metros en paralelo."},
      {"type":"callout","variant":"info","title":"Separación lateral","text":"Al realizar el adelantamiento, se debe mantener una separación lateral de seguridad suficiente que evite riesgos para el vehículo adelantado."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Обгон между транспортными средствами на обочине"},
      {"type":"text","text":"Транспортные средства, обязанные ехать по обочине (например, велосипеды, мопеды, легкие тракторы), имеют право обгонять друг друга."},
      {"type":"callout","variant":"warning","title":"Ограничения по времени и расстоянию","text":"Для предотвращения аварийных ситуаций из-за длительного движения параллельно, маневр обгона на обочине строго лимитирован:\n- Длительность параллельного хода не более 15 секунд.\n- Дистанция параллельного хода не более 200 метров."},
      {"type":"callout","variant":"info","title":"Боковой интервал","text":"При совершении обгона на обочине водитель обязан выдерживать безопасную боковую дистанцию до обгоняемого транспортного средства."}
    ]}'
  );

  -- ── Step 9 · Quiz: Обгон мопедом трактора (DGT f0ba00eb-26ca-4b17-bd74-45bfc2d1b116)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"question_id":"f0ba00eb-26ca-4b17-bd74-45bfc2d1b116","explanation":"El conductor de un ciclomotor puede adelantar a otro vehículo que vaya por el arcén (como un tractor) siempre que el recorrido en paralelo no sea superior a 200 metros o a 15 segundos."}',
    '{"question_id":"f0ba00eb-26ca-4b17-bd74-45bfc2d1b116","explanation":"Водитель мопеда может обогнать другое ТС, движущееся по обочине (например, трактор), только при условии, что их параллельное движение не продлится более 15 секунд или 200 метров."}'
  );

  -- ── Step 10 · Theory: Запрет объезда пробок по обочине ────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Prohibición de circular por el arcén en atascos"},
      {"type":"text","text":"Cuando nos encontramos ante un atasco o retención, los conductores de turismos, motocicletas u otros automóviles rápidos pueden sentir la tentación de utilizar el arcén derecho para avanzar más rápido o llegar antes a una salida."},
      {"type":"callout","variant":"danger","title":"Prohibido rotundamente","text":"Está totalmente prohibido utilizar el arcén para evitar un atasco o para aproximarse a una salida cercana. Debes esperar tu turno pacientemente en los carriles normales de la calzada."},
      {"type":"callout","variant":"info","title":"Motivo de seguridad","text":"El arcén debe estar despejado para permitir el paso de vehículos de emergencia (ambulancias, policía, bomberos) y para los usuarios que están obligados a circular por él (como ciclistas o vehículos averiados)."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Запрет объезда заторов по обочине"},
      {"type":"text","text":"При возникновении дорожного затора (пробки) у водителей легковых автомобилей или мотоциклов может возникнуть соблазн выехать на правую обочину, чтобы объехать пробку или быстрее добраться до съезда."},
      {"type":"callout","variant":"danger","title":"Категорически запрещено","text":"Использование обочины для объезда пробки или для съезда с дороги запрещено. Водители обязаны терпеливо двигаться по основным полосам движения проезжей части."},
      {"type":"callout","variant":"info","title":"Причина безопасности","text":"Обочина должна оставаться свободной для проезда автомобилей скорой помощи, полиции, пожарных, а также для движения велосипедов, мопедов и вынужденной остановки сломавшихся машин."}
    ]}'
  );

  -- ── Step 11 · Quiz: Съезд при заторе по обочине (DGT 39121580-0eb6-4c5b-8349-433ace109cb4)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"question_id":"39121580-0eb6-4c5b-8349-433ace109cb4","explanation":"Está prohibido que un turismo circule por el arcén para evitar una retención de tráfico o para adelantar camino de una salida cercana."}',
    '{"question_id":"39121580-0eb6-4c5b-8349-433ace109cb4","explanation":"Движение по обочине на легковом автомобиле с целью объезда пробки или съезда на ближайшую развязку полностью запрещено."}'
  );

  -- ── Step 12 · Quiz: Движение в заторе по обочине (DGT de961d6d-4a17-44db-9551-b02d03d78922)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"question_id":"de961d6d-4a17-44db-9551-b02d03d78922","explanation":"No se permite circular por el arcén en situaciones de aglomeración de tráfico bajo ningún concepto para vehículos no autorizados."}',
    '{"question_id":"de961d6d-4a17-44db-9551-b02d03d78922","explanation":"В случае затора обычным автомобилям запрещается выезжать на обочину и двигаться по ней ни при каких обстоятельствах."}'
  );

  -- ── Step 13 · Theory: Аномально низкая скорость (Velocidad anormalmente reducida) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 13, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Velocidad anormalmente reducida por avería"},
      {"type":"text","text":"Si debido a una avería o emergencia circulas a una velocidad anormalmente reducida (inferior a la velocidad mínima obligatoria de la vía), las reglas de circulación cambian según molestes o no al tráfico."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⚠️","title":"Dificultando la circulación (molestando)","description":"Si circulas muy despacio por avería perturbando o molestando el tráfico, estás OBLIGADO a circular por el arcén derecho si es transitable y suficiente para facilitar el paso."},
        {"icon":"🚗","title":"Sin dificultar la circulación (sin molestar)","description":"Si no perturbas la circulación (no hay tráfico a tu alrededor o no molestas), debes seguir circulando por el carril de la derecha de la calzada principal, sin invadir el arcén."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Аномально низкая скорость из-за поломки"},
      {"type":"text","text":"Если твой автомобиль сломался и ты едешь с аномально низкой скоростью (ниже установленного минимума), правила движения зависят от того, мешаешь ты другим или нет."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⚠️","title":"Если создаешь помехи (мешаешь)","description":"Если ты медленно катишься из-за поломки и задерживаешь поток машин сзади, ты ОБЯЗАН съехать на правую обочину (если она пригодна для движения), чтобы пропустить машины."},
        {"icon":"🚗","title":"Если НЕ создаешь помех (не мешаешь)","description":"Если дорога пуста или ты не создаешь заторов, ты обязан продолжать движение по крайней правой полосе проезжей части, не выезжая на обочину."}
      ]}
    ]}'
  );

  -- ── Step 14 · Quiz: Медленно и мешает (DGT f35070da-2e9f-454d-8d8d-1661786ae325)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 14, 'quiz',
    '{"question_id":"f35070da-2e9f-454d-8d8d-1661786ae325","explanation":"Si por avería circulas muy despacio dificultando el paso de otros vehículos, es obligatorio utilizar el arcén para despejar la calzada y evitar accidentes o alcances traseros."}',
    '{"question_id":"f35070da-2e9f-454d-8d8d-1661786ae325","explanation":"Если из-за неисправности автомобиль движется очень медленно и затрудняет проезд другим участникам, водитель обязан ехать по обочине, чтобы освободить проезжую часть и не провоцировать столкновения."}'
  );

  -- ── Step 15 · Quiz: Медленно и НЕ мешает (DGT 84ca80c4-e167-49ad-ae0a-b0ee019d5342)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 15, 'quiz',
    '{"question_id":"84ca80c4-e167-49ad-ae0a-b0ee019d5342","explanation":"Si circulas despacio pero sin interrumpir a ningún usuario de la vía, debes mantenerte en la calzada por la parte derecha y no debes utilizar el arcén, reservado para situaciones de peligro o vehículos obligados."}',
    '{"question_id":"84ca80c4-e167-49ad-ae0a-b0ee019d5342","explanation":"Если ты движешься медленно из-за поломки, но при этом никому не мешаешь (нет попутных машин), ехать нужно по проезжей части у правого края. Выезжать на обочину в такой ситуации запрещено."}'
  );

  -- ── Step 16 · Theory: Сплошная линия (Línea continua: rebasamiento y excepciones) ─
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 16, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Línea continua: rebasamiento de obstáculo y adelantamiento especial"},
      {"type":"text","text":"Como norma general, está prohibido adelantar y rebasar pisando una línea longitudinal continua. Sin embargo, existen excepciones muy importantes por razones de fluidez y seguridad."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚧","title":"Rebasamiento a vehículo detenido","description":"Si un vehículo está totalmente inmovilizado (detenido) en la calzada por avería u obstáculo, se le puede sobrepasar pisando la línea continua (incluso invadiendo el sentido contrario) tras comprobar que no hay peligro."},
        {"icon":"🚴","title":"Adelantamiento a ciclistas y lentos","description":"Está permitido adelantar a ciclistas, ciclomotores, peatones, animales y vehículos de tracción animal pisando la línea continua e invadiendo el sentido contrario, siempre que se haga con seguridad y dejando al menos 1,5 metros de separación lateral."}
      ]},
      {"type":"callout","variant":"danger","title":"¡Ojo al examen! El vehículo lento debe estar detenido","text":"Si se trata de un turismo, camión o moto averiado que avanza muy despacio pero SIGUE EN MOVIMIENTO, no puedes adelantarlo cruzando la línea continua. Debes esperar a que se detenga del todo o a que la línea sea discontinua."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сплошная линия: объезд препятствия и исключения для обгона"},
      {"type":"text","text":"По общему правилу пересекать сплошную линию разметки для обгона запрещено. Однако правила устанавливают важнейшие исключения ради безопасности и пропускной способности дорог."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚧","title":"Объезд полностью остановившегося авто","description":"Если транспортное средство сломалось и полностью стоит (detenido) на полосе, оно считается препятствием. Его разрешено объехать с пересечением сплошной линии (даже с выездом на встречную), убедившись в безопасности."},
        {"icon":"🚴","title":"Обгон велосипедистов и медленных участников","description":"Разрешается обгонять велосипедистов, мопеды, пешеходов и гужевые повозки через сплошную линию с выездом на встречную полосу, если маневр безопасен и боковой интервал составляет не менее 1,5 метров."}
      ]},
      {"type":"callout","variant":"danger","title":"Ловушка экзамена! ТС должно быть полностью неподвижно","text":"Если впереди медленно катится из-за неисправности обычный автомобиль или грузовик, его КАТЕГОРИЧЕСКИ запрещено обгонять через сплошную линию, пока он не остановится полностью."}
    ]}'
  );

  -- ── Step 17 · Quiz: Объезд стоящего авто (DGT de3b9cb2-7659-4192-93a4-78a2583cf7f1)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 17, 'quiz',
    '{"question_id":"de3b9cb2-7659-4192-93a4-78a2583cf7f1","explanation":"Cuando un vehículo se encuentra totalmente detenido e inmovilizado por avería en la calzada, se le considera obstáculo. Está permitido rebasarlo cruzando la línea continua, siempre que no haya peligro."}',
    '{"question_id":"de3b9cb2-7659-4192-93a4-78a2583cf7f1","explanation":"Если неисправный автомобиль полностью стоит (неподвижен) на проезжей части, он приравнивается к препятствию. Его разрешается объехать с пересечением сплошной линии разметки, соблюдая безопасность."}'
  );

  -- ── Step 18 · Quiz: Обгон велосипедистов через сплошную (DGT caa1eb7d-8916-406d-8996-dfa99ee5b9fe)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 18, 'quiz',
    '{"question_id":"caa1eb7d-8916-406d-8996-dfa99ee5b9fe","explanation":"Para adelantar a ciclistas, está permitido rebasar la línea longitudinal continua, ocupando el carril de sentido contrario, siempre que se pueda realizar la maniobra sin peligro y dejando una distancia lateral mínima de 1,5 metros."}',
    '{"question_id":"caa1eb7d-8916-406d-8996-dfa99ee5b9fe","explanation":"Для обгона велосипедистов разрешается пересекать сплошную линию разметки с выездом на встречную полосу, при условии безопасности маневра и соблюдения бокового интервала не менее 1,5 метров."}'
  );

  -- ── Step 19 · Theory: Поломка на автостраде (Emergencia en autopista/autovía) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 19, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Peligro: velocidad reducida en autopista o autovía"},
      {"type":"text","text":"Las autopistas y autovías son vías de muy alta velocidad (120 km/h) y circular despacio en ellas es extremadamente peligroso. La normativa en estas vías es sumamente estricta."},
      {"type":"callout","variant":"danger","title":"Regla de oro de autopistas","text":"Si debido a una avería o emergencia te ves obligado a circular por una autopista o autovía a una velocidad anormalmente reducida (menos de 60 km/h), tienes la OBLIGACIÓN absoluta de abandonar la vía en la primera salida disponible. No puedes intentar llegar a tu destino lejano a esa velocidad por el arcén."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Опасность: низкая скорость на автостраде"},
      {"type":"text","text":"Автомагистрали и автострады — это дороги с высокими скоростями (до 120 км/ч). Медленная езда на них смертельно опасна, поэтому правила здесь очень жесткие."},
      {"type":"callout","variant":"danger","title":"Золотое правило автострад","text":"Если из-за поломки ты вынужден ехать по автомагистрали (autopista) или автостраде (autovía) с аномально низкой скоростью (менее 60 км/ч), ты ОБЯЗАН покинуть её на первом же съезде. Продолжать движение по обочине до далекого пункта назначения запрещено."}
    ]}'
  );

  -- ── Step 20 · Quiz: Съезд с автомагистрали при поломке (DGT becd1a07-c1b3-429c-b8c3-852b34e2e529)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 20, 'quiz',
    '{"question_id":"becd1a07-c1b3-429c-b8c3-852b34e2e529","explanation":"Si por avería circulas a velocidad anormalmente reducida en una autopista o autovía, debes abandonarla obligatoriamente por la primera salida para evitar el riesgo de alcances a alta velocidad por detrás."}',
    '{"question_id":"becd1a07-c1b3-429c-b8c3-852b34e2e529","explanation":"Если из-за неисправности скорость на автомагистрали или автостраде упала ниже минимальной, водитель обязан съехать с неё на ближайшей развязке, чтобы предотвратить столкновения с быстрыми машинами."}'
  );

END $$;
