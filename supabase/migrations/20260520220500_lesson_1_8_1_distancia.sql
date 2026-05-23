-- SQL Migration: Add Lesson 1.8.1 - Distancia de seguridad entre vehículos
-- Module 1 UUID: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  -- Clean up existing lesson to ensure idempotency
  DELETE FROM lesson_steps WHERE lesson_id IN (SELECT id FROM course_lessons WHERE code = '1.8.1' AND module_id = mod_id);
  DELETE FROM course_lessons WHERE code = '1.8.1' AND module_id = mod_id;

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.8.1',
     'Distancia de seguridad entre vehículos',
     'Безопасная дистанция между транспортными средствами',
     34, 40, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory: Безопасная дистанция и дистанция обгона ──────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Dos conceptos clave de distancia"},
      {"type":"text","text":"Mantener una separación adecuada con el vehículo precedente es vital para evitar colisiones por alcance, que representan la mayoría de los accidentes de tráfico. Existen dos conceptos diferentes que debes diferenciar:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🛡️","title":"Distancia de seguridad (Frenado)","description":"Es el espacio mínimo que te permite detener tu vehículo sin colisionar con el que va delante en caso de que frene de manera brusca. Es obligatoria SIEMPRE y para TODOS los vehículos."},
        {"icon":"🚗","title":"Distancia de adelantamiento","description":"Es el espacio extra que permite al vehículo que viene detrás adelantarte con seguridad, teniendo espacio suficiente para volver a su carril al finalizar la maniobra."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Два ключевых понятия дистанции"},
      {"type":"text","text":"Соблюдение безопасной дистанции до идущего впереди автомобиля жизненно важно для предотвращения столкновений сзади, которые составляют большинство дорожных аварий. Различают два разных понятия:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🛡️","title":"Безопасная дистанция (Торможение)","description":"Это минимальное расстояние, позволяющее затормозить и остановиться в случае резкого торможения впереди идущей машины. Она обязательна ВСЕГДА и для ВСЕХ водителей."},
        {"icon":"🚗","title":"Дистанция для обгона нас","description":"Это дополнительный интервал, позволяющий идущему сзади автомобилю безопасно обогнать вас и вернуться в правую полосу перед вашим капотом."}
      ]}
    ]}'
  );

  -- ── Step 2 · Quiz: Уменьшение безопасной дистанции при обгоне (DGT f6697efc-f6cf-4a92-9971-9578790833ca)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'quiz',
    '{"question_id":"f6697efc-f6cf-4a92-9971-9578790833ca","explanation":"Bajo ninguna circunstancia está permitido reducir la distancia de seguridad de frenado para adelantar. La distancia de frenado es innegociable por razones de seguridad."}',
    '{"question_id":"f6697efc-f6cf-4a92-9971-9578790833ca","explanation":"Ни при каких обстоятельствах не разрешается сокращать безопасную дистанцию для торможения ради совершения обгона. Дистанция торможения должна соблюдаться всегда из соображений безопасности."}'
  );

  -- ── Step 3 · Theory: Расчет дистанции в метрах и правило 50 метров ────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"¿Cuántos metros hay que dejar de distancia?"},
      {"type":"text","text":"La distancia de seguridad genérica para turismos y motocicletas no está establecida en un número fijo de metros. Se debe calcular dinámicamente según la velocidad, la visibilidad (lluvia, niebla) y el estado de la calzada (hielo, nieve)."},
      {"type":"callout","variant":"warning","title":"Regla especial: 50 metros obligatorios fuera de poblado","text":"Están obligados a mantener siempre una distancia mínima de 50 metros con el vehículo precedente (salvo que pretendan adelantar) los siguientes vehículos:\n1. Vehículos con MMA superior a 3500 kg (ej. camiones pesados).\n2. Vehículos y conjuntos de vehículos de más de 10 metros de longitud (ej. turismos con caravana)."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сколько метров дистанции нужно оставлять?"},
      {"type":"text","text":"Общая безопасная дистанция для легковых машин и мотоциклов не задается фиксированным числом. Она рассчитывается динамически исходя из вашей скорости, видимости (дождь, туман) и состояния покрытия (лед, снег)."},
      {"type":"callout","variant":"warning","title":"Специальное правило: 50 метров вне города","text":"Обязаны всегда держать дистанцию не менее 50 метров до впереди идущего ТС (если только не собираются идти на обгон) следующие категории:\n1. ТС с разрешенной максимальной массой (MMA) более 3500 кг (тяжелые грузовики).\n2. ТС и составы транспортных средств (автопоезда) длиной более 10 метров (например, легковой автомобиль с прицепом-дачей)."}
    ]}'
  );

  -- ── Step 4 · Quiz: 50 метров для ТС длиной более 10 метров (DGT 28a7c2b4-c748-4ade-9a1d-d839c9d8d798)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"question_id":"28a7c2b4-c748-4ade-9a1d-d839c9d8d798","explanation":"Los conjuntos de vehículos de más de 10 metros de longitud total están obligados a guardar una separación mínima de 50 metros con el de delante fuera de poblado, para permitir que otros los adelanten por tramos."}',
    '{"question_id":"28a7c2b4-c748-4ade-9a1d-d839c9d8d798","explanation":"Составы транспортных средств (например, машина с прицепом) общей длиной более 10 метров обязаны вне населенных пунктов держать дистанцию до передней машины не менее 50 метров, чтобы облегчить их поэтапный обгон другими водителями."}'
  );

  -- ── Step 5 · Theory: Когда НЕ нужно оставлять место для обгона нас ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Excepciones: ¿cuándo no hace falta dejar espacio de adelantamiento?"},
      {"type":"text","text":"Como regla general, debemos mantener una distancia que permita a otros adelantarnos. Sin embargo, existen 5 casos en los que solo estamos obligados a mantener la distancia de seguridad para no chocar (no es necesario dejar espacio para que nos adelanten):"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🏙️","title":"1. Dentro de poblado","description":"En las vías urbanas el adelantamiento se realiza de forma constante usando varios carriles, por lo que no es exigible esta separación."},
        {"icon":"🚫","title":"2. Donde esté prohibido adelantar","description":"Si por señales o marcas viales nadie puede adelantar, carece de sentido reservar espacio para esta maniobra."},
        {"icon":"🛣️","title":"3. Vías con más de un carril","description":"En autopistas, autovías o calzadas con más de un carril para tu mismo sentido, los adelantamientos se hacen sin necesidad de volver inmediatamente a la derecha."},
        {"icon":"🐌","title":"4. Tráfico saturado / retención","description":"Cuando hay congestión o atasco, los vehículos circulan pegados por necesidad y no hay espacio material para adelantar."},
        {"icon":"🏹","title":"5. Intención de adelantar","description":"Cuando tú mismo vas a iniciar un adelantamiento al vehículo de delante, puedes aproximarte respetando la distancia de seguridad básica."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Исключения: когда не нужно оставлять место для обгона нас?"},
      {"type":"text","text":"По общему правилу мы должны держать дистанцию, позволяющую другим обгонять нас. Однако существуют 5 ситуаций, когда требуется соблюдать только дистанцию безопасности для предотвращения столкновения (место для обгона оставлять не нужно):"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🏙️","title":"1. В населенном пункте","description":"В городе обгоны и опережения происходят постоянно по разным полосам, поэтому резервировать место перед собой не требуется."},
        {"icon":"🚫","title":"2. Там, где обгон запрещен","description":"Если знаки или разметка запрещают обгон на данном участке, нет смысла оставлять место для обгоняющих."},
        {"icon":"🛣️","title":"3. Дороги с 2+ полосами попутно","description":"На автомагистралях и дорогах с несколькими полосами в одну сторону обгон происходит без необходимости сразу же возвращаться в правую полосу."},
        {"icon":"🐌","title":"4. Дорожный затор (пробка)","description":"При плотном движении все едут плотным потоком и свободного места для перестроения обгоняющих физически нет."},
        {"icon":"🏹","title":"5. Намерение совершить обгон","description":"Если вы сами готовитесь обогнать едущую впереди машину, вам разрешено приблизиться к ней на расстояние минимальной безопасной дистанции."}
      ]}
    ]}'
  );

  -- ── Step 6 · Quiz: Дистанция в городе (DGT 8c80a2b5-4264-4cf3-bafa-30c7fe75cb82) ─
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'quiz',
    '{"question_id":"8c80a2b5-4264-4cf3-bafa-30c7fe75cb82","explanation":"En las vías urbanas (dentro de poblado) no existe obligación de dejar espacio para que te adelanten; basta con mantener la distancia de seguridad que evite una colisión en caso de frenado brusco."}',
    '{"question_id":"8c80a2b5-4264-4cf3-bafa-30c7fe75cb82","explanation":"В черте города (на городских улицах) нет требования оставлять место для обгона вас другими машинами. Достаточно соблюдать базовую безопасную дистанцию, гарантирующую остановку при резком торможении лидера."}'
  );

  -- ── Step 7 · Quiz: На каких дорогах оставлять дистанцию обгона (DGT 687b2282-574d-4290-bbf5-308fbcb1f8c7)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{"question_id":"687b2282-574d-4290-bbf5-308fbcb1f8c7","explanation":"Solo es obligatorio dejar espacio para facilitar que otros te adelanten en las carreteras fuera de poblado que cuenten con un único carril para cada sentido de circulación."}',
    '{"question_id":"687b2282-574d-4290-bbf5-308fbcb1f8c7","explanation":"Оставлять свободное место для облегчения обгона вас другими автомобилями обязательно только на загородных дорогах, имеющих по одной полосе движения в каждом направлении."}'
  );

  -- ── Step 8 · Theory: Дистанция в тоннелях (Distancia en túneles) ──────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Normas estrictas dentro de túneles y pasos inferiores"},
      {"type":"text","text":"Los túneles son zonas cerradas y de visibilidad reducida donde una colisión por alcance puede provocar incendios o atrapamientos graves. Por ello, la Ley impone distancias fijas y muy amplias:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚗","title":"Vehículos hasta 3500 kg de MMA","description":"Turismos, motocicletas, furgonetas pequeñas y ciclomotores deben mantener una distancia de seguridad mínima de 100 metros o un intervalo de 4 segundos."},
        {"icon":"🚛","title":"Vehículos de más de 3500 kg de MMA","description":"Camiones pesados y autobuses deben guardar obligatoriamente una separación mínima de 150 metros o un intervalo de 6 segundos."}
      ]},
      {"type":"callout","variant":"info","title":"Excepción por adelantamiento","text":"Estas distancias fijas (100 m / 150 m) solo son exigibles si NO pretendes adelantar. Si vas a adelantar y está permitido en el túnel (para lo cual debe haber más de un carril en tu sentido), puedes reducir la separación respetando la distancia básica de seguridad."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Строгие правила в тоннелях и подземных переходах"},
      {"type":"text","text":"Туннели — это закрытые пространства с ограниченной видимостью, где столкновения сзади крайне опасны и могут вызвать пожары. Поэтому закон требует соблюдения четких и больших дистанций:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚗","title":"ТС массой (MMA) до 3500 кг","description":"Легковые авто, мотоциклы, мопеды и небольшие фургоны обязаны держать дистанцию до передней машины не менее 100 метров или временной интервал в 4 секунды."},
        {"icon":"🚛","title":"ТС массой (MMA) более 3500 кг","description":"Тяжелые грузовики и большие автобусы обязаны держать дистанцию не менее 150 метров или временной интервал в 6 секунд."}
      ]},
      {"type":"callout","variant":"info","title":"Исключение для обгона","text":"Эти фиксированные дистанции (100 м / 150 м) обязательны только тогда, когда вы НЕ планируете обгон. Если обгон в тоннеле разрешен (для этого должно быть более одной полосы в вашем направлении) и вы собираетесь обогнать ТС, можно приблизиться на расстояние базовой дистанции безопасности."}
    ]}'
  );

  -- ── Step 9 · Quiz: Легковой автомобиль в тоннеле (DGT c120e470-ff55-4ae1-9dbe-c3308b4e5604) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"question_id":"c120e470-ff55-4ae1-9dbe-c3308b4e5604","explanation":"El conductor de un turismo que circula por un túnel sin intención de adelantar debe mantener una distancia de seguridad mínima con el vehículo de delante de 100 metros o 4 segundos."}',
    '{"question_id":"c120e470-ff55-4ae1-9dbe-c3308b4e5604","explanation":"Водитель легкового автомобиля (turismo) при движении в тоннеле без намерения совершить обгон обязан соблюдать минимальную дистанцию до впереди идущего ТС не менее 100 метров или временной интервал в 4 секунды."}'
  );

  -- ── Step 10 · Quiz: Легкий грузовик (до 3500 кг) в тоннеле (DGT 80433452-c75a-4599-9e62-d8e35b5c7452)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{"question_id":"80433452-c75a-4599-9e62-d8e35b5c7452","explanation":"Al tener una MMA inferior a 3.500 kg, el camión se rige por la misma norma que los turismos en los túneles: debe mantener al menos 100 metros o un intervalo de 4 segundos de distancia."}',
    '{"question_id":"80433452-c75a-4599-9e62-d8e35b5c7452","explanation":"Поскольку разрешенная масса грузовика менее 3500 кг, для него в тоннеле действуют те же правила, что и для легковых авто: необходимо соблюдать дистанцию не менее 100 метров (а не 150 м, которые требуются для грузовиков свыше 3.5 тонн). Это классическая ловушка экзамена!"}'
  );

END $$;
