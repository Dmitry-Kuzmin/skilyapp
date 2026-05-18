-- Rich block content for all 3 lessons of Module 1
-- Converts flat text to callout / table / list / card-grid blocks

-- ─────────────────────────────────────────────────────────────────────
-- LESSON 1.1 · Clasificación de los vehículos
-- ─────────────────────────────────────────────────────────────────────

-- Step 1: two-group overview + card-grid
UPDATE lesson_steps SET
  content_es = '{
    "blocks": [
      {"type":"text","text":"Los vehículos se dividen en dos grandes grupos según su propulsión:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⚙️","title":"Vehículos a motor","description":"Automóviles, motos, autobuses, camiones, tractocamiones, furgones y vehículos especiales"},
        {"icon":"🚲","title":"Sin motor","description":"Ciclos, ciclomotores, remolques, semirremolques, caravanas, tranvías y vehículos de tracción animal"}
      ]},
      {"type":"callout","variant":"warning","title":"¡Ojo al examen!","text":"Los ciclomotores tienen motor pero NO se clasifican como «vehículos a motor» según el Reglamento General de Vehículos."}
    ]
  }',
  content_ru = '{
    "blocks": [
      {"type":"text","text":"Транспортные средства делятся на две большие группы:"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"⚙️","title":"Механические ТС","description":"Легковые, мотоциклы, автобусы, грузовики, тягачи, фургоны и специальные ТС"},
        {"icon":"🚲","title":"Немеханические ТС","description":"Велосипеды, мопеды, прицепы, полуприцепы, трейлеры, трамваи и гужевой транспорт"}
      ]},
      {"type":"callout","variant":"warning","title":"Важно для экзамена!","text":"Мопеды имеют двигатель, но по Регламенту НЕ относятся к «механическим транспортным средствам»."}
    ]
  }'
WHERE id = 'f00cfd6d-ca3e-47f1-b5ce-1f474649cc6c';

-- Step 2: M/N/O categories → table
UPDATE lesson_steps SET
  content_es = '{
    "blocks": [
      {"type":"heading","text":"Categorías por uso (4+ ruedas)"},
      {"type":"table",
       "headers":["Cat.","Tipo","MMA / Plazas"],
       "rows":[
         ["M1","Pasajeros","≤ 8 plazas"],
         ["M2","Pasajeros","+ 8 plazas, ≤ 5 t"],
         ["M3","Pasajeros","+ 8 plazas, > 5 t"],
         ["N1","Mercancías","≤ 3,5 t"],
         ["N2","Mercancías","3,5 – 12 t"],
         ["N3","Mercancías","> 12 t"],
         ["O1","Remolque","≤ 750 kg"],
         ["O2","Remolque","750 kg – 3,5 t"],
         ["O3","Remolque","3,5 – 10 t"],
         ["O4","Remolque","> 10 t"]
       ],
       "caption":"Categorías M, N y O según el Reglamento General de Vehículos"},
      {"type":"callout","variant":"info","text":"MMA = Masa Máxima Autorizada. Es el peso máximo que puede alcanzar el vehículo cargado, incluyendo el propio vehículo."}
    ]
  }',
  content_ru = '{
    "blocks": [
      {"type":"heading","text":"Категории по назначению (4+ колеса)"},
      {"type":"table",
       "headers":["Кат.","Тип","ПРМ / Мест"],
       "rows":[
         ["M1","Пассажиры","≤ 8 мест"],
         ["M2","Пассажиры","+ 8 мест, ≤ 5 т"],
         ["M3","Пассажиры","+ 8 мест, > 5 т"],
         ["N1","Грузы","≤ 3,5 т"],
         ["N2","Грузы","3,5 – 12 т"],
         ["N3","Грузы","> 12 т"],
         ["O1","Прицеп","≤ 750 кг"],
         ["O2","Прицеп","750 кг – 3,5 т"],
         ["O3","Прицеп","3,5 – 10 т"],
         ["O4","Прицеп","> 10 т"]
       ],
       "caption":"Категории M, N и O согласно Регламенту ТС Испании"},
      {"type":"callout","variant":"info","text":"ПРМ = Разрешённая максимальная масса. Это максимальный вес ТС в полной нагрузке, включая сам автомобиль."}
    ]
  }'
WHERE id = '25eebe69-dbe8-4e03-a257-ca5fe89bf232';

-- Step 3: L categories → list + callout
UPDATE lesson_steps SET
  content_es = '{
    "blocks": [
      {"type":"heading","text":"Categorías L — Vehículos de 2 y 3 ruedas"},
      {"type":"list","style":"arrow","items":[
        "L1e · Ciclomotores (≤ 50 cc · ≤ 45 km/h)",
        "L2e · Ciclomotores de 3 ruedas",
        "L3e · Motocicletas (sin sidecar)",
        "L4e · Motocicletas con sidecar",
        "L5e · Triciclos de motor",
        "L6e · Cuadriciclos ligeros (≤ 45 km/h)",
        "L7e · Cuadriciclos pesados (> 45 km/h)"
      ]},
      {"type":"stats","stats":[
        {"value":"45","label":"km/h máx","note":"L1e y L6e"},
        {"value":"50 cc","label":"cilindrada máx","note":"ciclomotores L1e"}
      ]},
      {"type":"callout","variant":"tip","title":"Truco de memoria","text":"Categorías L = vehículos Ligeros de 1-3 ruedas. M/N/O = vehículos de 4+ ruedas. ¡No los confundas en el examen!"}
    ]
  }',
  content_ru = '{
    "blocks": [
      {"type":"heading","text":"Категории L — Лёгкие транспортные средства"},
      {"type":"list","style":"arrow","items":[
        "L1e · Мопеды (≤ 50 куб.см · ≤ 45 км/ч)",
        "L2e · Трёхколёсные мопеды",
        "L3e · Мотоциклы (без коляски)",
        "L4e · Мотоциклы с коляской",
        "L5e · Трициклы с мотором",
        "L6e · Лёгкие квадрициклы (≤ 45 км/ч)",
        "L7e · Тяжёлые квадрициклы (> 45 км/ч)"
      ]},
      {"type":"stats","stats":[
        {"value":"45","label":"км/ч макс","note":"L1e и L6e"},
        {"value":"50 куб","label":"объём макс","note":"мопеды L1e"}
      ]},
      {"type":"callout","variant":"tip","title":"Запомни","text":"Категории L = лёгкие ТС с 1-3 колёсами. M/N/O = 4+ колёса. Не путай на экзамене!"}
    ]
  }'
WHERE id = '3c896539-aaf7-4c2f-845e-69446249dcc8';


-- ─────────────────────────────────────────────────────────────────────
-- LESSON 1.2.1 · Definición de vehículo
-- ─────────────────────────────────────────────────────────────────────

-- Step 1: definition + exclusions
UPDATE lesson_steps SET
  content_es = '{
    "blocks": [
      {"type":"callout","variant":"info","title":"Definición legal","text":"Vehículo: todo aparato apto para circular por las vías o terrenos de uso común, ya sean públicos o privados."},
      {"type":"heading","text":"¿Qué es un vehículo a motor?"},
      {"type":"text","text":"Vehículo provisto de motor para su propulsión. Parece obvio, ¿verdad? Pero la ley excluye expresamente varios tipos:"},
      {"type":"list","style":"cross","title":"NO son vehículos a motor","items":[
        "Ciclomotores (L1e, L2e)",
        "Ciclos con asistencia eléctrica al pedaleo",
        "Tranvías",
        "Vehículos de movilidad personal (patinetes, etc.)",
        "Vehículos de movilidad reducida"
      ]},
      {"type":"callout","variant":"warning","title":"Pregunta clásica de examen","text":"«¿Es el ciclomotor un vehículo a motor?» → NO. Tiene motor, pero la ley lo excluye expresamente de esa categoría."}
    ]
  }',
  content_ru = '{
    "blocks": [
      {"type":"callout","variant":"info","title":"Юридическое определение","text":"Транспортное средство: любой аппарат, пригодный для движения по дорогам или территориям общего пользования — как публичным, так и частным."},
      {"type":"heading","text":"Что такое механическое ТС?"},
      {"type":"text","text":"ТС, оснащённое двигателем для передвижения. Казалось бы, всё просто — но закон прямо исключает некоторые виды:"},
      {"type":"list","style":"cross","title":"НЕ являются механическими ТС","items":[
        "Мопеды (L1e, L2e)",
        "Велосипеды с электроассистом",
        "Трамваи",
        "Средства индивидуальной мобильности (самокаты и т.д.)",
        "Транспортные средства для инвалидов"
      ]},
      {"type":"callout","variant":"warning","title":"Классический вопрос экзамена","text":"«Является ли мопед механическим ТС?» → НЕТ. У него есть двигатель, но закон прямо исключает его из этой категории."}
    ]
  }'
WHERE id = 'd82a9fa6-ea77-44b3-a740-d2d0480eda93';


-- ─────────────────────────────────────────────────────────────────────
-- LESSON 1.2.1.2 · Conductor y peatón
-- ─────────────────────────────────────────────────────────────────────

-- Step 1: Conductor definition
UPDATE lesson_steps SET
  content_es = '{
    "blocks": [
      {"type":"callout","variant":"info","title":"Definición — Conductor","text":"Persona que maneja el mecanismo de dirección o va al mando de un vehículo, o a cuyo cargo está uno o varios animales."},
      {"type":"list","style":"check","title":"Se consideran conductores","items":[
        "Quien arrastra una motocicleta (aunque vaya a pie)",
        "El pastor que guía su rebaño por la vía",
        "Quien va montado en una bicicleta",
        "El jinete sobre su caballo"
      ]},
      {"type":"callout","variant":"warning","title":"Autoescuela — regla especial","text":"En prácticas de conducción, el PROFESOR es el conductor (tiene los pedales de control). El alumno NO es conductor aunque gire el volante."}
    ]
  }',
  content_ru = '{
    "blocks": [
      {"type":"callout","variant":"info","title":"Определение — Водитель","text":"Лицо, управляющее механизмом руления или командующее транспортным средством, либо ответственное за одно или несколько животных."},
      {"type":"list","style":"check","title":"Считаются водителями","items":[
        "Кто тащит мотоцикл (даже идя пешком)",
        "Пастух, ведущий стадо по дороге",
        "Кто едет на велосипеде",
        "Всадник на лошади"
      ]},
      {"type":"callout","variant":"warning","title":"Автошкола — особое правило","text":"На практических занятиях ИНСТРУКТОР является водителем (у него педали управления). Ученик НЕ является водителем, даже если крутит руль."}
    ]
  }'
WHERE id = '5b7e83d7-7e69-4ab8-b220-8346e68a8b9f';

-- Step 2: Peatón + comparison table
UPDATE lesson_steps SET
  content_es = '{
    "blocks": [
      {"type":"callout","variant":"info","title":"Definición — Peatón","text":"Persona que circula a pie por las vías. También se incluye a quien utiliza un vehículo de movilidad personal no motorizado."},
      {"type":"list","style":"check","title":"También son peatones","items":[
        "Quien empuja (sin montar) una bicicleta o ciclomotor",
        "Quien empuja un carrito de bebé o silla de ruedas",
        "Personas con silla de ruedas no motorizada",
        "Quien patina o usa un monopatín no motorizado"
      ]},
      {"type":"heading","text":"¿Conductor o peatón? — La clave del examen"},
      {"type":"table",
       "headers":["Situación","Rol"],
       "rows":[
         ["🚲 Montado en bicicleta","✅ Conductor"],
         ["🚲 Empujando la bicicleta","🚶 Peatón"],
         ["🛵 Montado en ciclomotor","✅ Conductor"],
         ["🛵 Empujando el ciclomotor","🚶 Peatón"],
         ["🏍️ Arrastrando la moto (encendida o no)","✅ Conductor"],
         ["🐴 Jinete sobre un caballo","✅ Conductor"]
       ],
       "caption":"La clave: si vas ENCIMA o a cargo → conductor. Si lo empujas sin montar → peatón."}
    ]
  }',
  content_ru = '{
    "blocks": [
      {"type":"callout","variant":"info","title":"Определение — Пешеход","text":"Лицо, передвигающееся пешком по дороге. Сюда также относятся пользователи немоторизованных средств передвижения."},
      {"type":"list","style":"check","title":"Также являются пешеходами","items":[
        "Кто толкает (не едет) велосипед или мопед",
        "Кто катит детскую коляску или инвалидную кресло",
        "Лица на немоторизованных колясках",
        "Кто едет на роликах или немоторизованном самокате"
      ]},
      {"type":"heading","text":"Водитель или пешеход? — Ключ к экзамену"},
      {"type":"table",
       "headers":["Ситуация","Роль"],
       "rows":[
         ["🚲 Едет на велосипеде","✅ Водитель"],
         ["🚲 Толкает велосипед","🚶 Пешеход"],
         ["🛵 Едет на мопеде","✅ Водитель"],
         ["🛵 Толкает мопед","🚶 Пешеход"],
         ["🏍️ Тащит мотоцикл (включён или нет)","✅ Водитель"],
         ["🐴 Всадник на лошади","✅ Водитель"]
       ],
       "caption":"Ключ: едешь ВЕРХОМ или управляешь → водитель. Толкаешь без езды → пешеход."}
    ]
  }'
WHERE id = '368bbf69-54ea-467e-bd30-2900f0472fad';
