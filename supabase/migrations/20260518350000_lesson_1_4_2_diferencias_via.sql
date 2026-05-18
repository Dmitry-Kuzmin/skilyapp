-- Lección 1.4.2 — Diferencias entre autopista, autovía y carretera convencional
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.4.2',
     'Diferencias entre autopista, autovía y carretera convencional',
     'Различия между автострадой, скоростной и обычной дорогой',
     25, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Carretera convencional: qué encontrarás ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Carretera convencional — lo que puedes encontrar","text":"La carretera convencional es el tipo de vía más variada. En ella puedes encontrar situaciones que NUNCA se dan en autopistas o autovías."},
      {"type":"list","style":"check","title":"Presente en carretera convencional","items":[
        "Peatones circulando por arcén o calzada",
        "Ciclistas y ciclos en la calzada o arcén",
        "Ciclomotores",
        "Animales y vehículos de tracción animal",
        "Vehículos de movilidad personal (VMP) y de movilidad reducida",
        "Los dos sentidos separados únicamente por una línea continua",
        "Posible un solo carril por sentido de circulación",
        "Cruces e intersecciones a nivel",
        "Pasos de peatones, semáforos",
        "Curvas cerradas y difíciles",
        "Cambios de rasante de reducida visibilidad"
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Обычная дорога — что можно встретить","text":"Обычная дорога — самый разнообразный тип дороги. На ней можно встретить ситуации, которые НИКОГДА не бывают на автостраде или скоростной дороге."},
      {"type":"list","style":"check","title":"Есть на обычной дороге","items":[
        "Пешеходы на обочине или проезжей части",
        "Велосипедисты на проезжей части или обочине",
        "Мопеды",
        "Животные и транспортные средства с животной тягой",
        "СИМ (самокаты и т.д.) и ТС для инвалидов",
        "Два направления, разделённых только сплошной линией",
        "Возможна одна полоса в каждом направлении",
        "Одноуровневые перекрёстки и пересечения",
        "Пешеходные переходы, светофоры",
        "Крутые и сложные повороты",
        "Переломы продольного профиля с ограниченной видимостью"
      ]}
    ]}'
  );

  -- ── Step 2 · Theory — Autopista/autovía: garantías y exclusiones ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Autopistas y autovías — garantías de seguridad","text":"Las autopistas y autovías están diseñadas para circulación segura a alta velocidad. Tienen prohibiciones y características que las hacen más predecibles."},
      {"type":"list","style":"cross","title":"NUNCA en autopista ni autovía","items":[
        "Peatones, animales, vehículos de tracción animal",
        "Ciclomotores, VMP, vehículos de movilidad reducida",
        "Ciclos/bicicletas en la calzada (en autovía solo arcén y >14 años)",
        "Intersecciones a nivel ni cruces al mismo nivel",
        "Un solo carril por sentido — siempre 2 o más",
        "Los sentidos separados solo por una línea — SIEMPRE hay mediana",
        "Semáforos ni pasos de peatones convencionales",
        "Curvas cerradas ni difíciles"
      ]},
      {"type":"callout","variant":"warning","text":"Mnemotécnico: en autopista/autovía SIEMPRE hay mediana (nunca solo línea) y SIEMPRE hay 2+ carriles por sentido. Si ves una sola calzada o una sola línea separando sentidos → es carretera convencional."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Автострады и скоростные дороги — гарантии безопасности","text":"Автострады и скоростные дороги разработаны для безопасного высокоскоростного движения. Они имеют ограничения и характеристики, делающие их более предсказуемыми."},
      {"type":"list","style":"cross","title":"НИКОГДА на автостраде или скоростной дороге","items":[
        "Пешеходы, животные, ТС с животной тягой",
        "Мопеды, СИМ, ТС для инвалидов",
        "Велосипеды на проезжей части (на скоростной только обочина и >14 лет)",
        "Одноуровневые пересечения или переезды",
        "Одна полоса в каждом направлении — всегда 2 и более",
        "Направления, разделённые только линией — ВСЕГДА разделительная полоса",
        "Светофоры и обычные пешеходные переходы",
        "Крутые или сложные повороты"
      ]},
      {"type":"callout","variant":"warning","text":"Мнемоника: на автостраде/скоростной ВСЕГДА есть разделительная полоса (никогда просто линия) и ВСЕГДА 2+ полосы в каждом направлении. Видишь одну проезжую часть или одну линию, разделяющую направления → это обычная дорога."}
    ]}'
  );

  -- ── Step 3 · Theory — Tabla comparativa completa ──────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Tabla comparativa: los tres tipos"},
      {"type":"table","headers":["Elemento","C. Convencional","Autopista","Autovía"],"rows":[
        ["Separación sentidos","Línea (posible)","Mediana (siempre)","Mediana (siempre)"],
        ["Mínimo carriles/sentido","1","2","2"],
        ["Intersecciones a nivel","✅ Sí","❌ No","❌ No"],
        ["Semáforos","✅ Sí","❌ No","❌ No"],
        ["Peatones en calzada","✅ Posible","❌ No","❌ No"],
        ["Ciclistas","✅ Sí (calzada)","❌ No","⚠️ Solo arcén >14 años"],
        ["Ciclomotores","✅ Sí","❌ No","❌ No"],
        ["Animales","✅ Posible","❌ No","❌ No"],
        ["Curvas cerradas","✅ Posible","❌ No","❌ No"],
        ["Acceso colindantes","✅ Libre","❌ Nulo","⚠️ Limitado"]
      ]}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сравнительная таблица: три типа дорог"},
      {"type":"table","headers":["Элемент","Обычная дорога","Автострада","Скоростная дорога"],"rows":[
        ["Разделение направлений","Линия (возможно)","Полоса (всегда)","Полоса (всегда)"],
        ["Мин. полос в направлении","1","2","2"],
        ["Одноуровн. пересечения","✅ Да","❌ Нет","❌ Нет"],
        ["Светофоры","✅ Да","❌ Нет","❌ Нет"],
        ["Пешеходы на дороге","✅ Возможно","❌ Нет","❌ Нет"],
        ["Велосипедисты","✅ Да (проезжая)","❌ Нет","⚠️ Только обочина >14 лет"],
        ["Мопеды","✅ Да","❌ Нет","❌ Нет"],
        ["Животные","✅ Возможно","❌ Нет","❌ Нет"],
        ["Крутые повороты","✅ Возможно","❌ Нет","❌ Нет"],
        ["Доступ с прилегающих","✅ Свободный","❌ Нулевой","⚠️ Ограниченный"]
      ]}
    ]}'
  );

  -- ── Step 4 · Quiz — authored (¿qué puedes encontrar en C. Convencional?) ──
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"¿Cuál de las siguientes situaciones SOLO puede ocurrir en una carretera convencional y NUNCA en autopista o autovía?","options":["Un carril de aceleración para incorporarse a la vía.","Una mediana separando los dos sentidos de circulación.","Los dos sentidos de circulación separados únicamente por una línea continua."],"correct":2,"explanation":"En carretera convencional los dos sentidos pueden estar separados solo por una línea continua. En autopista y autovía SIEMPRE hay una mediana física separando los sentidos. Los carriles de aceleración y las medianas son propios de autopista y autovía."}',
    '{"text":"Какая из следующих ситуаций может произойти ТОЛЬКО на обычной дороге и НИКОГДА на автостраде или скоростной дороге?","options":["Полоса разгона для выезда на дорогу.","Разделительная полоса, разделяющая два направления.","Два направления движения, разделённых только сплошной линией."],"correct":2,"explanation":"На обычной дороге два направления могут разделяться только сплошной линией. На автостраде и скоростной дороге ВСЕГДА есть физическая разделительная полоса между направлениями. Полосы разгона и разделительные полосы характерны для автострад и скоростных дорог."}'
  );

  -- ── Step 5 · Quiz — authored (semáforo en autopista) ──────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"En una autopista, ¿es posible encontrar un semáforo o un paso de peatones a nivel?","options":["Sí, en los tramos que transcurren por zona urbana.","Sí, solo en los nudos de enlace con otras carreteras.","No, en autopistas y autovías no hay intersecciones, semáforos ni pasos de peatones convencionales."],"correct":2,"explanation":"No, en autopistas y autovías no puede haber semáforos ni pasos de peatones convencionales, ya que no existen cruces a nivel. Tampoco hay intersecciones. Esto se debe a que estas vías están diseñadas para la circulación fluida sin interrupciones. Los accesos y salidas se hacen por carriles de aceleración y deceleración."}',
    '{"text":"Можно ли встретить светофор или пешеходный переход на автостраде?","options":["Да, на участках, проходящих через населённые пункты.","Да, только на узлах слияния с другими дорогами.","Нет, на автостраде и скоростной дороге нет пересечений, светофоров и обычных пешеходных переходов."],"correct":2,"explanation":"Нет, на автостраде и скоростной дороге не может быть светофоров или обычных пешеходных переходов, так как нет одноуровневых пересечений. Пересечений тоже нет. Это связано с тем, что эти дороги рассчитаны на непрерывное свободное движение. Въезды и выезды осуществляются через полосы разгона и торможения."}'
  );

  -- ── Step 6 · Theory — Clasificación de vehículos ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Clasificación de vehículos: con motor y sin motor"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🔧","title":"CON MOTOR — pueden circular por autopista/autovía","description":"Turismo · Motocicleta · Motocicleta con sidecar · Vehículo de 3 ruedas · Cuadriciclo de motor (quad) · Autobús · Camión · Tractocamión. CONDICIÓN: capaces de superar 60 km/h en llano."},
        {"icon":"🚲","title":"SIN MOTOR — PROHIBIDOS en autopista/autovía","description":"Ciclo (bicicleta) · Ciclomotor · Ciclomotor de 2, 3 y 4 ruedas · Vehículo de tracción animal · Remolque · Semirremolque · Caravana · Vehículo para personas de movilidad reducida · Tranvía."}
      ]},
      {"type":"callout","variant":"tip","title":"Excepción bicicleta en autovía","text":"Los conductores de bicicletas de más de 14 años pueden circular por los ARCENES de las autovías (no autopistas), salvo que se prohíba con señalización."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Классификация ТС: с мотором и без"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"🔧","title":"С МОТОРОМ — могут ехать по автостраде/скор. дороге","description":"Легковой авт. · Мотоцикл · Мотоцикл с коляской · ТС на 3 колёсах · Квадроцикл (quad) · Автобус · Грузовик · Тягач. УСЛОВИЕ: способны превышать 60 км/ч на ровной дороге."},
        {"icon":"🚲","title":"БЕЗ МОТОРА — ЗАПРЕЩЕНЫ на автостраде/скор. дороге","description":"Велосипед · Мопед · Мопед на 2, 3 и 4 колёсах · ТС с животной тягой · Прицеп · Полуприцеп · Жилой прицеп · ТС для инвалидов · Трамвай."}
      ]},
      {"type":"callout","variant":"tip","title":"Исключение для велосипеда на скоростной дороге","text":"Велосипедисты старше 14 лет могут ехать по ОБОЧИНАМ скоростных дорог (не автострад), если только нет запрещающих знаков."}
    ]}'
  );

  -- ── Step 7 · Quiz — authored (cuál vehículo puede usar autopista) ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'quiz',
    '{"text":"¿Cuál de los siguientes vehículos puede circular por una autopista?","options":["Un ciclomotor de 4 ruedas capaz de alcanzar 60 km/h.","Una motocicleta capaz de desarrollar 80 km/h en llano.","Un vehículo de movilidad personal (patinete eléctrico)."],"correct":1,"explanation":"Una motocicleta capaz de desarrollar 80 km/h en llano puede circular por autopista, ya que es un automóvil que supera los 60 km/h requeridos. El ciclomotor está prohibido en autopista independientemente de su velocidad. El VMP (patinete) también está prohibido."}',
    '{"text":"Какое из следующих транспортных средств может ехать по автостраде?","options":["Мопед на 4 колёсах, способный достигать 60 км/ч.","Мотоцикл, способный развивать 80 км/ч на ровной дороге.","Средство индивидуальной мобильности (электросамокат)."],"correct":1,"explanation":"Мотоцикл, способный развивать 80 км/ч на ровной дороге, может ехать по автостраде, так как является автомобилем, превышающим необходимые 60 км/ч. Мопед запрещён на автостраде независимо от его скорости. СИМ (самокат) также запрещён."}'
  );

  -- ── Step 8 · Quiz — authored (bicicleta arcén autovía) ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"Un ciclista de 20 años quiere circular por el arcén de una autovía. ¿Puede hacerlo?","options":["No, las bicicletas están completamente prohibidas en autovías.","Sí, siempre que no haya señalización que lo prohíba.","Solo si la autovía transcurre por zona urbana."],"correct":1,"explanation":"Sí puede, porque los conductores de bicicletas de más de 14 años pueden circular por los arcenes de las autovías (no de las autopistas), salvo que por razones de seguridad vial se prohíba mediante señalización. Con 20 años supera el límite de 14 años."}',
    '{"text":"20-летний велосипедист хочет ехать по обочине скоростной дороги (autovía). Может ли он это сделать?","options":["Нет, велосипеды полностью запрещены на скоростных дорогах.","Да, если только нет запрещающих знаков.","Только если скоростная дорога проходит через населённый пункт."],"correct":1,"explanation":"Да, может, потому что велосипедисты старше 14 лет могут ехать по обочинам скоростных дорог (но не автострад), если только по соображениям безопасности это не запрещено знаками. 20 лет — выше 14-летнего ограничения."}'
  );

END $$;
