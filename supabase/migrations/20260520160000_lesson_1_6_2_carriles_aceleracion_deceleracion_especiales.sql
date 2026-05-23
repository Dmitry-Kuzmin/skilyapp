-- SQL Migration: Add Lesson 1.6.2 - Carriles de aceleración, deceleración y especiales
-- Module 1 UUID: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  -- Clean up existing lesson to ensure idempotency
  DELETE FROM lesson_steps WHERE lesson_id IN (SELECT id FROM course_lessons WHERE code = '1.6.2' AND module_id = mod_id);
  DELETE FROM course_lessons WHERE code = '1.6.2' AND module_id = mod_id;

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.6.2',
     'Carriles de aceleración, deceleración y especiales',
     'Полосы разгона, торможения и специальные полосы',
     31, 40, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory: Полоса разгона (Carril de aceleración) ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril de aceleración: ¿cómo incorporarse con seguridad?"},
      {"type":"text","text":"Imagina que sales a una autovía desde un carril lateral. Los vehículos en la calzada principal circulan a 120 km/h. Tu objetivo es incorporarte al flujo de tráfico sin obligar a nadie a frenar de golpe. Para conseguirlo de forma segura, se utiliza el carril de aceleración."},
      {"type":"callout","variant":"info","title":"Definición oficial","text":"El carril de aceleración es aquel destinado a facilitar la incorporación de los vehículos a la corriente de circulation de la vía a la que pretenden acceder, permitiendo adaptar su velocidad a la de los vehículos que ya circulan por ella."},
      {"type":"callout","variant":"warning","title":"¡Ojo al examen! El lugar de parada","text":"Si tienes que ceder el paso y detenerte porque hay mucho tráfico, DEBES hacerlo obligatoriamente al principio del carril de aceleración, no al final. Si te detienes al final, te quedarás sin espacio para acelerar y te verás obligado a incorporarte desde parado a una vía rápida, lo cual es sumamente peligroso."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🛑","title":"Lugar de detención","description":"Si no puedes incorporarte inmediatamente, detente obligatoriamente al principio del carril de aceleración, nunca al final."},
        {"icon":"⚡","title":"Prioridad y velocidad","description":"Debes ceder el paso a los vehículos de la vía principal y acelerar progresivamente para adaptar tu velocidad a la de ellos."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Полоса разгона: как безопасно выехать на трассу"},
      {"type":"text","text":"Представь, что ты выезжаешь на скоростное шоссе с бокового съезда. Машины на главной дороге летят со скоростью 120 км/ч. Твоя задача — встроиться в поток, не заставив никого резко тормозить. Для этого и существует полоса разгона (carril de aceleración)."},
      {"type":"callout","variant":"info","title":"Официальное определение","text":"Полоса разгона предназначена для облегчения выезда автомобилей на дорогу, позволяя водителю набрать скорость, соответствующую скорости основного потока, и безопасно встроиться в него."},
      {"type":"callout","variant":"warning","title":"Ловушка экзамена! Место остановки","text":"Если тебе приходится уступать дорогу и останавливаться из-за плотного потока, ты ОБЯЗАН сделать это в самом начале полосы разгона, а не в конце. Если остановиться в конце, у тебя не останется места впереди, чтобы разогнаться. Тебе придется трогаться с места сразу в скоростной поток, что смертельно опасно."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🛑","title":"Место остановки","description":"Если не можешь выехать сразу, останавливайся строго в начале полосы разгона, а не в конце."},
        {"icon":"⚡","title":"Приоритет и скорость","description":"Ты обязан уступить дорогу машинам на трассе и разогнаться, чтобы сравнять скорость с основным потоком."}
      ]}
    ]}'
  );

  -- ── Step 2 · Theory: Правила маневра и содействие ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Reglas de la maniobra e incorporación"},
      {"type":"text","text":"La maniobra de incorporación requiere la colaboración de ambas partes, aunque la ley establece claramente las prioridades."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚗","title":"Conductor en carril de aceleración","description":"Debe mirar por los retrovisores, señalizar con el intermitente y acelerar progresivamente. Tiene la obligación absoluta de ceder el paso a los vehículos de la vía principal."},
        {"icon":"🚚","title":"Vehículos de la vía principal","description":"Tienen prioridad de paso. Sin embargo, están obligados a facilitar la incorporación en la medida de lo posible (por ejemplo, cambiándose al carril izquierdo o levantando el pie del acelerador), siempre que sea seguro."}
      ]},
      {"type":"callout","variant":"danger","title":"¿Es adelantamiento circular más rápido por la derecha?","text":"En un carril de aceleración, circular más rápido que los vehículos de la calzada principal NO se considera adelantamiento por la derecha. Es una maniobra legítima para alcanzar la velocidad de incorporación."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Правила маневра и помощь при выезде"},
      {"type":"text","text":"Маневр выезда на дорогу требует сотрудничества обоих водителей, хотя правила четко распределяют приоритеты."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🚗","title":"Водитель на полосе разгона","description":"Обязан контролировать ситуацию по зеркалам, включить указатель поворота и плавно разгоняться. Он имеет безусловную обязанность уступить дорогу машинам на главной трассе."},
        {"icon":"🚚","title":"Водители на главной дороге","description":"Имеют приоритет движения. Однако они обязаны способствовать безопасному выезду (например, перестроиться левее или сбросить газ), когда это возможно и безопасно."}
      ]},
      {"type":"callout","variant":"danger","title":"Считается ли обгоном движение быстрее потока справа?","text":"Находясь на полосе разгона, ехать быстрее машин на основной дороге НЕ считается запрещенным обгоном справа. Это разрешенное правилами опережение для безопасного встраивания в поток."}
    ]}'
  );

  -- ── Step 3 · Quiz: В чем убедиться (DGT 8885b600-03e4-4313-b2e9-9fef85c473b8)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'quiz',
    '{"question_id":"8885b600-03e4-4313-b2e9-9fef85c473b8","explanation":"Antes de iniciar la fase de aceleración, el conductor debe cerciorarse de que hay espacio suficiente y que puede realizar la maniobra sin peligro para los demás usuarios de la vía principal."}',
    '{"question_id":"8885b600-03e4-4313-b2e9-9fef85c473b8","explanation":"Перед началом разгона водитель должен убедиться по зеркалам заднего вида, что на главной дороге есть достаточно места и он сможет выехать, не создавая опасности или помех другим участникам движения."}'
  );

  -- ── Step 4 · Quiz: Место остановки (DGT 4d3f3305-d743-42d0-9833-b5cab8c59f32)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"question_id":"4d3f3305-d743-42d0-9833-b5cab8c59f32","explanation":"Si el tráfico en la vía principal no permite la incorporación, el vehículo debe detenerse al principio del carril de aceleración. Esto permite que mantenga libre toda la longitud del carril para acelerar de nuevo cuando haya un hueco libre."}',
    '{"question_id":"4d3f3305-d743-42d0-9833-b5cab8c59f32","explanation":"Если поток на главной дороге плотный и выехать сразу нельзя, нужно остановиться строго в начале полосы разгона. Так перед вами останется вся длина полосы, чтобы набрать скорость и безопасно встроиться, когда появится свободный просвет."}'
  );

  -- ── Step 5 · Quiz: Обязанность содействия (DGT cb02b84c-d67f-420d-adf2-ecd7a0ab0767)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"question_id":"cb02b84c-d67f-420d-adf2-ecd7a0ab0767","explanation":"Aunque el conductor de la vía principal tiene la prioridad legal, está obligado por el reglamento a facilitar la maniobra de incorporación del otro vehículo siempre que sea posible y seguro."}',
    '{"question_id":"cb02b84c-d67f-420d-adf2-ecd7a0ab0767","explanation":"Несмотря на то, что у едущего по трассе водителя есть приоритет, правила обязывают его содействовать и помогать выезжающим машинам (например, сместившись на левую полосу), если это безопасно."}'
  );

  -- ── Step 6 · Theory: Полоса торможения (Carril de deceleración) ───────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril de deceleración: salir de la vía con seguridad"},
      {"type":"text","text":"Para abandonar una autopista o autovía, nunca debes empezar a frenar en los carriles normales, ya que los vehículos que van detrás circulan muy rápido y podrías causar un alcance. Para salir y reducir la velocidad de forma segura, se utiliza el carril de deceleración."},
      {"type":"callout","variant":"info","title":"Definición oficial","text":"El carril de deceleración es aquel destinado a facilitar la salida de los vehículos de una vía rápida, permitiendo reducir la velocidad de forma progresiva fuera de la calzada principal."},
      {"type":"callout","variant":"warning","title":"¡Ojo al examen! Entrar lo antes posible","text":"Debes entrar en el carril de deceleración en su inicio mismo, es decir, lo antes posible. Está prohibido circular frenando por la calzada principal para luego meterse al carril de salida en el último momento. Toda la frenada debe hacerse dentro del carril de deceleración."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⏱️","title":"Momento de entrada","description":"Entra en el carril de deceleración lo antes posible, justo al inicio de la línea discontinua."},
        {"icon":"🛑","title":"Frenado y Seguridad","description":"Frena únicamente dentro del carril para no entorpecer el tráfico y evitar alcances con los vehículos de detrás."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Полоса торможения: безопасный съезд с трассы"},
      {"type":"text","text":"Чтобы съехать со скоростной автострады, ни в коем случае нельзя тормозить на основной полосе — едущие сзади машины движутся слишком быстро, и это может вызвать аварию. Для съезда и безопасного сброса скорости создается полоса торможения (carril de deceleración)."},
      {"type":"callout","variant":"info","title":"Официальное определение","text":"Полоса торможения предназначена для облегчения съезда транспортных средств со скоростной дороги, позволяя плавно снижать скорость за пределами основных полос движения потока."},
      {"type":"callout","variant":"warning","title":"Ловушка экзамена! Въезжать как можно раньше","text":"Ты обязан перестроиться на полосу торможения в самом её начале (как можно раньше). Запрещено ехать по трассе, притормаживая, и сворачивать на съезд в последний момент. Весь процесс торможения должен происходить исключительно на самой полосе съезда."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⏱️","title":"Момент въезда","description":"Перестраивайся на полосу торможения как можно раньше, прямо в самом начале прерывистой линии."},
        {"icon":"🛑","title":"Торможение и безопасность","description":"Тормози только после съезда на полосу, чтобы не мешать потоку и избежать удара сзади."}
      ]}
    ]}'
  );

  -- ── Step 7 · Theory: Полоса переплетения (Carril de trenzado) ───────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril de trenzado: dos funciones en una sola vía"},
      {"type":"text","text":"A veces, un acceso y una salida de la autopista están muy juntos. En estas zonas, para ahorrar espacio y mejorar la fluidez, se construye una única calzada lateral, donde se juntan el carril de aceleración de la entrada y el carril de deceleración de la salida consecutiva. Esto se denomina carril de trenzado."},
      {"type":"callout","variant":"info","title":"Definición oficial","text":"Un carril de trenzado es un carril especial de circulación que sirve simultáneamente como carril de aceleración (incorporación) y de deceleración (salida) en tramos de vías donde confluyen entradas y salidas muy próximas."},
      {"type":"callout","variant":"danger","title":"Reglas de prioridad en trenzado","text":"En esta zona no hay un derecho de paso prioritario preestablecido. Se aplican las normas generales de cambio de carril: el conductor que realiza la maniobra de cambio de carril debe ceder el paso a los vehículos que ya circulan por ese carril. Ambos conductores deben cooperar activamente."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🟢","title":"El vehículo que entra","description":"Acelera buscando un hueco en la vía principal. Debe ceder el paso a los coches que circulan por la calzada principal y estar atento a los que quieren salir."},
        {"icon":"🔵","title":"El vehículo que sale","description":"Busca entrar al carril de trenzado para frenar y tomar la salida. Debe ceder el paso a los que ya están en dicho carril realizando su aceleración."}
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Полоса переплетения: две функции на одном участке"},
      {"type":"text","text":"Иногда въезд на автостраду и съезд с неё находятся очень близко друг к другу. На таких участках строится одна общая полоса, объединяющая полосу разгона для въезжающих и полосу торможения для съезжающих машин. Эта гибридная полоса называется полосой переплетения (carril de trenzado)."},
      {"type":"callout","variant":"info","title":"Официальное определение","text":"Полоса переплетения — это специальная полоса движения, которая одновременно служит полосой разгона (для въезда) и полосой торможения (для съезда) на участках дорог с близко расположенными съездами и въездами."},
      {"type":"callout","variant":"danger","title":"Правила приоритета при переплетении","text":"На полосах переплетения нет особого приоритета. Действуют общие правила перестроения: тот водитель, который совершает маневр перестроения (меняет полосу), обязан уступить дорогу. При этом оба водителя обязаны активно сотрудничать для безопасного разъезда."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🟢","title":"Въезжающий автомобиль","description":"Разгоняется на полосе, высматривая окно в основном потоке. Обязан уступить дорогу машинам на главной дороге и контролировать съезжающих."},
        {"icon":"🔵","title":"Съезжающий автомобиль","description":"Перестраивается на полосу переплетения для последующего съезда. Обязан уступить дорогу тем, кто уже движется по этой полосе и разгоняется."}
      ]}
    ]}'
  );

  -- ── Step 8 · Quiz: Момент въезда на полосу торможения (DGT 2deb085a-94fb-4528-9025-dc771b7b39b9)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"question_id":"2deb085a-94fb-4528-9025-dc771b7b39b9","explanation":"Para abandonar la vía con seguridad y no obligar a frenar a los vehículos que circulan detrás, el conductor debe situarse con antelación en el carril derecho y entrar en el carril de deceleración lo antes posible, justo al inicio del mismo."}',
    '{"question_id":"2deb085a-94fb-4528-9025-dc771b7b39b9","explanation":"Чтобы покинуть дорогу безопасно и не заставлять тормозить едущие сзади автомобили, водитель обязан заранее перестроиться в крайний правый ряд и въехать на полосу торможения как можно раньше, прямо в самом её начале."}'
  );

  -- ── Step 9 · Quiz: Приоритет в trenzado (Authored) ──────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"En un carril de trenzado, ¿qué normas de prioridad se aplican entre un vehículo que se incorpora y otro que sale de la vía?","options":["El vehículo que sale de la vía siempre tiene prioridad absoluta sobre el que entra.","Se aplican las normas generales de cambio de carril, debiendo ceder el paso el vehículo que realiza la maniobra de cambio de carril.","El vehículo que se incorpora por la derecha siempre tiene prioridad de paso."],"correct":1,"explanation":"En los carriles de trenzado no existe una prioridad predefinida especial. Se aplican las reglas comunes de cambio de carril: el conductor que realiza la maniobra de cambiar de carril (ya sea para entrar o salir) debe ceder el paso a los vehículos que ya circulan por el carril al que pretende acceder. Además, ambos conductores deben colaborar para facilitar la maniobra."}',
    '{"text":"Какие правила приоритета действуют на полосе переплетения (carril de trenzado) между въезжающим и съезжающим автомобилями?","options":["Автомобиль, съезжающий с трассы, всегда имеет абсолютный приоритет над въезжающим.","Применяются общие правила перестроения: дорогу должен уступить тот водитель, который совершает маневр перестроения.","Въезжающий справа автомобиль всегда имеет приоритет движения."],"correct":1,"explanation":"На полосах переплетения нет особого приоритета. Действуют общие правила перестроения: тот водитель, который меняет полосу (перестраивается), обязан уступить дорогу тем, кто уже движется по этой полосе. При этом правила обязывают обоих водителей способствовать безопасному разъезду."}'
  );

  -- ── Step 10 · Theory: Полоса автобус-такси (Carril bus-taxi) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril bus - carril taxi: ¿cómo se utilizan?"},
      {"type":"text","text":"Los carriles reservados para el transporte público sirven para agilizar el movimiento de autobuses y taxis. Circular por ellos con un coche normal está prohibido, pero existen reglas específicas según el tipo de línea que los delimite."},
      {"type":"callout","variant":"info","title":"Definición oficial","text":"El carril bus es un carril reservado exclusivamente para la circulación de autobuses. Si en el pavimento figura también escrita la palabra taxi, está autorizada además la circulación de taxis."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⛔","title":"Línea longitudinal continua","description":"Si la línea que separa el carril bus es continua, está totalmente prohibido circular por él, así como atravesarlo para cualquier maniobra (giros, estacionamiento, etc.)."},
        {"icon":"✅","title":"Línea longitudinal discontinua","description":"Si la línea es discontinua, los conductores de otros vehículos pueden entrar en él únicamente para realizar maniobras que no sean parar, estacionar, cambiar de sentido o adelantar (por ejemplo, para girar a la derecha o entrar a un parking), cediendo siempre el paso a los autobuses y taxis."}
      ]},
      {"type":"callout","variant":"danger","title":"El autobús circulando más rápido","text":"Cuando un autobús circula por su carril bus más rápido que el tráfico de los carriles normales, esto NO se considera adelantamiento. Es simplemente avance por carril reservado."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Полоса автобус-такси: правила использования"},
      {"type":"text","text":"Выделенные полосы для общественного транспорта созданы для ускорения движения автобусов и такси. Обычным легковым автомобилям ездить по ним запрещено, но правила допускают заезд в зависимости от типа разметки."},
      {"type":"callout","variant":"info","title":"Официальное определение","text":"Полоса bus — это полоса, зарезервированная исключительно для движения автобусов. Если на дорожном покрытии также написано слово taxi, по ней разрешено двигаться и автомобилям такси."},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⛔","title":"Сплошная линия разметки","description":"Если полоса автобуса отделена сплошной линией, заезд на неё обычным автомобилям категорически запрещен для любых целей (даже для поворотов)."},
        {"icon":"✅","title":"Прерывистая линия разметки","description":"Если линия прерывистая, обычные машины могут заехать на полосу исключительно для выполнения маневров (например, поворот направо или въезд в паркинг). При этом запрещено: останавливаться, стоять, обгонять или разворачиваться. Обязательно нужно уступить дорогу автобусам и такси!"}
      ]},
      {"type":"callout","variant":"danger","title":"Опережение автобуса по своей полосе","text":"Когда автобус движется по выделенной полосе быстрее, чем поток по соседним обычным полосам, это НЕ считается обгоном. Это просто движение по выделенной полосе."}
    ]}'
  );

  -- ── Step 11 · Theory: Полоса ожидания (Carril de espera) ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril de espera: girar a la izquierda sin peligro"},
      {"type":"text","text":"Realizar un giro a la izquierda en una carretera de doble sentido es una de las maniobras más peligrosas. Si te detienes en el carril normal esperando a que pase el tráfico en sentido contrario, bloqueas el paso y te arriesgas a que te golpeen por detrás. Para solucionar esto se diseñan los carriles de espera."},
      {"type":"callout","variant":"info","title":"Definición oficial","text":"El carril de espera es un carril delimitado y acondicionado en la zona central de una vía de doble sentido para que los vehículos que pretendan realizar un giro a la izquierda puedan detenerse y esperar de forma segura sin obstaculizar la marcha de los vehículos que circulan detrás."},
      {"type":"callout","variant":"warning","title":"¡Ojo al examen! Funcionamiento del carril","text":"Al entrar al carril de espera, debes detenerte en la zona marcada (que suele tener una flecha de giro a la izquierda y a veces la palabra STOP en el suelo) y ceder el paso a los vehículos que circulan en sentido contrario. Una vez libre la vía, realizas el giro."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Полоса ожидания: безопасный поворот налево"},
      {"type":"text","text":"Поворот налево на загородной дороге с двусторонним движением — один из самых опасных маневров. Если остановиться прямо на полосе движения, пропуская встречный транспорт, ты заблокируешь проезд и рискуешь получить удар сзади. Для решения этой проблемы создаются полосы ожидания (carril de espera)."},
      {"type":"callout","variant":"info","title":"Официальное определение","text":"Полоса ожидания — это выделенная полоса в центральной части дороги с двусторонним движением, созданная для того, чтобы водители, желающие повернуть налево, могли безопасно остановиться и подождать встречный транспорт, не мешая тем, кто едет сзади."},
      {"type":"callout","variant":"warning","title":"Ловушка экзамена! Как это работает","text":"Въехав на полосу ожидания, ты обязан остановиться внутри неё (где обычно нанесена разметка STOP и стрелка поворота) и уступить дорогу встречным автомобилям. Как только встречная полоса освободится — можно совершать поворот."}
    ]}'
  );

  -- ── Step 12 · Quiz: Заезд на полосу BUS при сплошной (DGT 49f0315e-3575-4493-addf-2629506ccc9c)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 12, 'quiz',
    '{"question_id":"49f0315e-3575-4493-addf-2629506ccc9c","explanation":"Cuando un carril bus está delimitado por una línea longitudinal continua, ningún vehículo no autorizado (incluidos los turismos) puede circular por él, cruzar la línea ni realizar maniobras utilizando dicho carril."}',
    '{"question_id":"49f0315e-3575-4493-addf-2629506ccc9c","explanation":"Если полоса для автобусов отделена сплошной линией, обычным легковым автомобилям категорически запрещено заезжать на нее, пересекать линию или использовать эту полосу для каких-либо маневров (включая повороты)."}'
  );

  -- ── Step 13 · Quiz: Опережение автобуса не обгон (DGT 7e979992-f2f9-41ac-8b1c-078cff2179f6)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 13, 'quiz',
    '{"question_id":"7e979992-f2f9-41ac-8b1c-078cff2179f6","explanation":"El hecho de que los vehículos que circulan por carriles reservados para determinados vehículos (como el carril bus) lo hagan más rápidamente que los de los carriles normales, o viceversa, no se considera adelantamiento."}',
    '{"question_id":"7e979992-f2f9-41ac-8b1c-078cff2179f6","explanation":"Если транспортные средства, движущиеся по полосам, специально зарезервированным для них (например, автобус по полосе BUS), едут быстрее машин на обычных полосах движения, это не считается обгоном по правилам дорожного движения."}'
  );

  -- ── Step 14 · Quiz: Функция полосы ожидания (Authored) ──────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 14, 'quiz',
    '{"text":"¿Cuál es la función principal de un carril de espera?","options":["Permitir que los vehículos lentos se aparten de la calzada para dejar pasar al tráfico rápido.","Permitir que los vehículos esperen detenidos de forma segura para realizar un giro a la izquierda sin obstaculizar la marcha de los que circulan detrás.","Servir como zona de parada de emergencia en carreteras de doble sentido sin arcén."],"correct":1,"explanation":"El carril de espera está diseñado específicamente en vías de doble sentido para que los vehículos que desean realizar un giro a la izquierda puedan apartarse hacia el centro y detenerse de forma segura dentro de este espacio protegido. Así, esperan que el sentido contrario quede libre sin bloquear el carril de circulación por el que venían y evitando el riesgo de colisión por alcance."}',
    '{"text":"Какова основная функция полосы ожидания (carril de espera)?","options":["Позволить тихоходным транспортным средствам съехать с дороги, чтобы пропустить быстрый поток.","Позволить транспортным средствам безопасно остановиться для поворота налево, не создавая помех движущимся сзади автомобилям.","Служить зоной аварийной остановки на дорогах с двусторонним движением без обочины."],"correct":1,"explanation":"Полоса ожидания создается на дорогах с двусторонним движением как защищенный карман по центру. Водитель, желающий повернуть налево, заезжает на эту полосу и ждет возможности пропустить встречные машины. При этом он не перекрывает основную полосу, по которой ехал, защищая себя от удара сзади."}'
  );

END $$;
