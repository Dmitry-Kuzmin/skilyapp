-- Module 1 · Lessons 2 and 3
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12
-- Lesson 2: Vías públicas — tipos y zonas (code 1.3, order_index 4)
-- Lesson 3: Velocidad — límites generales  (code 1.4, order_index 5)

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l2_id   uuid;
  l3_id   uuid;
BEGIN

  -- ───────────────────────────────────────────────
  -- LESSON 2 · Vías públicas — tipos y zonas
  -- ───────────────────────────────────────────────
  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.3',
     'Vías públicas — tipos y zonas',
     'Дороги — виды и зоны',
     4, 30, false)
  RETURNING id INTO l2_id;

  -- Step 1 · Tipos de vía (card-grid + callout)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l2_id, 1, 'theory',
    '{
      "blocks":[
        {"type":"text","text":"Una vía es todo camino apto para la circulación. Las vías se clasifican según quién puede usarlas y cómo están gestionadas:"},
        {"type":"card-grid","cols":2,"cards":[
          {"icon":"🏙️","title":"Vía urbana","description":"Dentro de poblado. Velocidad máx. 20–50 km/h según el tipo de calle"},
          {"icon":"🛣️","title":"Vía interurbana","description":"Fuera de poblado. Incluye carreteras convencionales, autovías y autopistas"},
          {"icon":"🚗","title":"Autopista / Autovía","description":"Calzadas separadas, sin intersecciones a nivel, acceso controlado"},
          {"icon":"🔀","title":"Vía de servicio","description":"Paralela a autopista/autovía. Conecta con la vía principal en los accesos"}
        ]},
        {"type":"callout","variant":"info","title":"Diferencia autopista / autovía","text":"Autopista: de peaje y diseño más estricto. Autovía: libre, puede tener algunas limitaciones de diseño. Las normas de circulación son iguales para ambas."}
      ]
    }',
    '{
      "blocks":[
        {"type":"text","text":"Дорога — любой путь, пригодный для движения. Дороги классифицируются по тому, кто может их использовать и как они управляются:"},
        {"type":"card-grid","cols":2,"cards":[
          {"icon":"🏙️","title":"Городская дорога","description":"В пределах населённого пункта. Макс. скорость 20–50 км/ч в зависимости от типа улицы"},
          {"icon":"🛣️","title":"Загородная дорога","description":"За пределами населённого пункта: обычные дороги, скоростные шоссе, автомагистрали"},
          {"icon":"🚗","title":"Автомагистраль / Скоростное шоссе","description":"Разделённые полосы, без одноуровневых перекрёстков, контролируемый въезд"},
          {"icon":"🔀","title":"Вспомогательная дорога","description":"Параллельна автомагистрали. Соединяется с основной в пунктах въезда/выезда"}
        ]},
        {"type":"callout","variant":"info","title":"Автомагистраль vs скоростное шоссе","text":"Автомагистраль: платная, более строгие нормы проектирования. Скоростное шоссе: бесплатное. Правила движения для обоих одинаковы."}
      ]
    }'
  );

  -- Step 2 · Partes de la calzada (table)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l2_id, 2, 'theory',
    '{
      "blocks":[
        {"type":"heading","text":"Partes de la vía"},
        {"type":"table",
         "headers":["Zona","Descripción","¿Para quién?"],
         "rows":[
           ["Calzada","Parte pavimentada destinada a la circulación de vehículos","Vehículos"],
           ["Carril","Banda longitudinal de la calzada (marcada o no)","Un vehículo a la vez"],
           ["Arcén","Franja lateral junto a la calzada, no es carril","Peatones / emergencias"],
           ["Acera","Zona elevada junto a la calzada para peatones","Peatones"],
           ["Mediana","Franja central que separa calzadas opuestas","Separación, no circulación"],
           ["Berma","Franja entre arcén y la cuneta","Sin uso de circulación"]
         ],
         "caption":"Partes de la vía según el Reglamento General de Circulación"},
        {"type":"callout","variant":"warning","text":"El arcén NO es un carril. Solo se circula por él en emergencias o cuando la señal lo permita expresamente."}
      ]
    }',
    '{
      "blocks":[
        {"type":"heading","text":"Части дороги"},
        {"type":"table",
         "headers":["Зона","Описание","Для кого?"],
         "rows":[
           ["Проезжая часть","Асфальтированная часть для движения ТС","Транспорт"],
           ["Полоса","Продольная полоса проезжей части (размеченная или нет)","Одно ТС за раз"],
           ["Обочина","Боковая полоса рядом с проезжей частью, не полоса","Пешеходы / аварийные"],
           ["Тротуар","Возвышенная зона для пешеходов","Пешеходы"],
           ["Разделительная полоса","Центральная полоса, разделяющая встречные полосы","Разделение, не движение"],
           ["Бровка","Полоса между обочиной и кюветом","Нет движения"]
         ],
         "caption":"Части дороги согласно Общему регламенту дорожного движения Испании"},
        {"type":"callout","variant":"warning","text":"Обочина — НЕ полоса движения. По ней едут только в аварийных ситуациях или когда знак прямо это разрешает."}
      ]
    }'
  );

  -- Step 3 · Intersecciones y zonas especiales (list + callout)
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l2_id, 3, 'theory',
    '{
      "blocks":[
        {"type":"heading","text":"Zonas especiales que debes conocer"},
        {"type":"list","style":"arrow","items":[
          "Intersección — cruce entre dos o más vías. Prioridad: vehículo de la derecha (salvo señal)",
          "Glorieta — intersección circular con sentido único de circulación",
          "Paso a nivel — cruce de vía de tren con carretera",
          "Zona de estacionamiento regulado (ORA/SER) — pago o disco horario",
          "Zona 30 — velocidad máx. 30 km/h, prioridad peatón en calzada",
          "Zona de coexistencia — máx. 20 km/h, peatones tienen prioridad total"
        ]},
        {"type":"stats","stats":[
          {"value":"30","label":"km/h máx","note":"Zona 30"},
          {"value":"20","label":"km/h máx","note":"Zona coexistencia"},
          {"value":"10","label":"km/h máx","note":"Zona peatonal con vehíc."}
        ]},
        {"type":"callout","variant":"tip","title":"Regla de la glorieta","text":"Dentro de la glorieta tienes prioridad sobre quien quiere entrar. Señaliza siempre la salida con el intermitente derecho."}
      ]
    }',
    '{
      "blocks":[
        {"type":"heading","text":"Особые зоны, которые нужно знать"},
        {"type":"list","style":"arrow","items":[
          "Перекрёсток — пересечение двух и более дорог. Приоритет: ТС справа (если нет знака)",
          "Кольцо — кольцевой перекрёсток с односторонним движением",
          "Железнодорожный переезд — пересечение ж/д пути с дорогой",
          "Зона платной парковки (ORA/SER) — оплата или диск с временем",
          "Зона 30 — макс. 30 км/ч, приоритет пешеходам на проезжей части",
          "Зона совместного использования — макс. 20 км/ч, пешеходы имеют полный приоритет"
        ]},
        {"type":"stats","stats":[
          {"value":"30","label":"км/ч макс","note":"Зона 30"},
          {"value":"20","label":"км/ч макс","note":"Зона совмест."},
          {"value":"10","label":"км/ч макс","note":"Пешеходная с ТС"}
        ]},
        {"type":"callout","variant":"tip","title":"Правило кольца","text":"Внутри кольца у тебя приоритет над въезжающими. Всегда сигнализируй выезд правым поворотником."}
      ]
    }'
  );

  -- Step 4 · Quiz
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l2_id, 4, 'quiz',
    '{
      "text":"¿Se puede circular por el arcén cuando la calzada está despejada?",
      "correct":1,
      "options":[
        "Sí, siempre que se vaya despacio",
        "No, el arcén no es un carril de circulación",
        "Sí, si el vehículo es de emergencias",
        "Solo en autopista o autovía"
      ],
      "explanation":"El arcén no es un carril. Los vehículos solo pueden usarlo en situaciones de emergencia o cuando una señal lo autorice expresamente. Los peatones sí deben usarlo si no hay acera."
    }',
    '{
      "text":"Можно ли ехать по обочине, когда проезжая часть свободна?",
      "correct":1,
      "options":[
        "Да, если ехать медленно",
        "Нет, обочина — не полоса движения",
        "Да, для аварийных служб",
        "Только на автомагистрали"
      ],
      "explanation":"Обочина не является полосой движения. ТС может использовать её только в аварийных ситуациях или если знак прямо разрешает это. Пешеходы должны идти по обочине, если нет тротуара."
    }'
  );

  -- Step 5 · Quiz
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l2_id, 5, 'quiz',
    '{
      "text":"En una glorieta, ¿quién tiene prioridad de paso?",
      "correct":0,
      "options":[
        "Los vehículos que circulan dentro de la glorieta",
        "Los vehículos que quieren entrar en la glorieta",
        "El vehículo que llega primero",
        "El vehículo que viene por la derecha"
      ],
      "explanation":"Desde 2003, los vehículos que circulan dentro de la glorieta tienen prioridad sobre los que quieren entrar. Antes era al revés, ¡no confundas!"
    }',
    '{
      "text":"На кольцевом перекрёстке кто имеет приоритет?",
      "correct":0,
      "options":[
        "ТС, едущие внутри кольца",
        "ТС, въезжающие на кольцо",
        "ТС, приехавшее первым",
        "ТС справа"
      ],
      "explanation":"С 2003 года ТС внутри кольца имеют приоритет над въезжающими. Раньше было наоборот — не перепутай!"
    }'
  );

  -- ───────────────────────────────────────────────
  -- LESSON 3 · Velocidad — límites generales
  -- ───────────────────────────────────────────────
  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.4',
     'Velocidad — límites generales',
     'Скорость — общие ограничения',
     5, 40, false)
  RETURNING id INTO l3_id;

  -- Step 1 · Tabla de límites por tipo de vía
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l3_id, 1, 'theory',
    '{
      "blocks":[
        {"type":"text","text":"Los límites de velocidad genéricos (en ausencia de señal) dependen del tipo de vía y del vehículo. Estos son los del turismo estándar:"},
        {"type":"table",
         "headers":["Tipo de vía","Vel. máx.","Vel. mín."],
         "rows":[
           ["Autopista / Autovía","120 km/h","60 km/h"],
           ["Carretera convencional de un carril","90 km/h","—"],
           ["Carretera convencional de 2+ carriles","100 km/h","—"],
           ["Vía urbana genérica","50 km/h","—"],
           ["Calle de un carril o sin acera","30 km/h","—"],
           ["Zona 30","30 km/h","—"],
           ["Zona de coexistencia","20 km/h","—"]
         ],
         "caption":"Límites genéricos para turismos (categoría M1)"},
        {"type":"callout","variant":"warning","title":"¡Ojo!","text":"Estos son límites GENÉRICOS. Una señal puede reducirlos o aumentarlos (hasta 120 km/h en autopista con señal de 130 km/h en determinadas condiciones)."}
      ]
    }',
    '{
      "blocks":[
        {"type":"text","text":"Общие ограничения скорости (при отсутствии знака) зависят от типа дороги и ТС. Ниже — для стандартного легкового автомобиля:"},
        {"type":"table",
         "headers":["Тип дороги","Макс. скорость","Мин. скорость"],
         "rows":[
           ["Автомагистраль / Скоростное шоссе","120 км/ч","60 км/ч"],
           ["Обычная дорога, 1 полоса","90 км/ч","—"],
           ["Обычная дорога, 2+ полосы","100 км/ч","—"],
           ["Городская улица (общая)","50 км/ч","—"],
           ["Улица с 1 полосой или без тротуара","30 км/ч","—"],
           ["Зона 30","30 км/ч","—"],
           ["Зона совместного использования","20 км/ч","—"]
         ],
         "caption":"Общие ограничения для легковых автомобилей (категория M1)"},
        {"type":"callout","variant":"warning","title":"Внимание!","text":"Это ОБЩИЕ ограничения. Знак может их снизить или повысить (до 120 км/ч на автомагистрали, в определённых условиях до 130 км/ч)."}
      ]
    }'
  );

  -- Step 2 · Velocidad mínima + carril lento
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l3_id, 2, 'theory',
    '{
      "blocks":[
        {"type":"heading","text":"Velocidad mínima y carril lento"},
        {"type":"callout","variant":"info","text":"En autopista/autovía, la velocidad mínima es 60 km/h. Si no puedes mantenerla (avería, carga pesada) debes abandonar la vía en la próxima salida o usar el arcén de emergencia."},
        {"type":"list","style":"check","title":"¿Cuándo se puede ir más despacio?","items":[
          "Condiciones meteorológicas adversas (lluvia, niebla, nieve)",
          "Visibilidad reducida (noche, curvas cerradas)",
          "Densidad de tráfico alta que lo impide",
          "Orden de agente de circulación"
        ]},
        {"type":"callout","variant":"tip","title":"Carril lento en carreteras","text":"En carreteras de 2+ carriles en el mismo sentido, quien circule a menos del 60% de la velocidad máxima debe ceder el carril izquierdo y usar el derecho."}
      ]
    }',
    '{
      "blocks":[
        {"type":"heading","text":"Минимальная скорость и медленный ряд"},
        {"type":"callout","variant":"info","text":"На автомагистрали минимальная скорость — 60 км/ч. Если не можешь её держать (поломка, тяжёлый груз) — съезди на ближайшем выезде или используй аварийную полосу."},
        {"type":"list","style":"check","title":"Когда разрешено ехать медленнее?","items":[
          "Неблагоприятные погодные условия (дождь, туман, снег)",
          "Ограниченная видимость (ночь, крутые повороты)",
          "Высокая плотность трафика",
          "Требование сотрудника ДПС"
        ]},
        {"type":"callout","variant":"tip","title":"Медленный ряд на дорогах","text":"На дорогах с 2+ полосами в одном направлении кто едет менее 60% от максимума, должен держать правую полосу."}
      ]
    }'
  );

  -- Step 3 · Factores que afectan la velocidad segura
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l3_id, 3, 'theory',
    '{
      "blocks":[
        {"type":"heading","text":"Velocidad adecuada — no solo el límite"},
        {"type":"text","text":"El límite de velocidad es el máximo legal, pero no siempre es la velocidad adecuada. El conductor debe adaptar su velocidad a:"},
        {"type":"list","style":"arrow","items":[
          "Estado y características de la vía (curvas, pendientes, firme)",
          "Condiciones meteorológicas y visibilidad",
          "Densidad de tráfico y presencia de peatones",
          "Estado del vehículo y su carga",
          "Limitaciones propias del conductor (cansancio, medicación)"
        ]},
        {"type":"stats","stats":[
          {"value":"~15 m","label":"distancia reacción","note":"a 50 km/h (1 seg)"},
          {"value":"~28 m","label":"distancia frenada","note":"a 50 km/h (seco)"},
          {"value":"~43 m","label":"distancia total","note":"= reacción + frenada"}
        ]},
        {"type":"callout","variant":"danger","title":"Principio fundamental","text":"La velocidad siempre debe permitir detener el vehículo antes de cualquier obstáculo previsible. Si no puedes garantizarlo, vas demasiado rápido."}
      ]
    }',
    '{
      "blocks":[
        {"type":"heading","text":"Безопасная скорость — не только ограничение"},
        {"type":"text","text":"Ограничение скорости — это юридический максимум, но не всегда безопасная скорость. Водитель должен адаптировать её к:"},
        {"type":"list","style":"arrow","items":[
          "Состоянию и характеристикам дороги (повороты, уклоны, покрытие)",
          "Погодным условиям и видимости",
          "Плотности трафика и наличию пешеходов",
          "Состоянию ТС и его нагрузке",
          "Ограничениям самого водителя (усталость, лекарства)"
        ]},
        {"type":"stats","stats":[
          {"value":"~15 м","label":"путь реакции","note":"при 50 км/ч (1 сек)"},
          {"value":"~28 м","label":"тормозной путь","note":"при 50 км/ч (сухо)"},
          {"value":"~43 м","label":"полный путь","note":"= реакция + торможение"}
        ]},
        {"type":"callout","variant":"danger","title":"Основной принцип","text":"Скорость должна всегда позволять остановить ТС перед любым предвидимым препятствием. Если не можешь это гарантировать — едешь слишком быстро."}
      ]
    }'
  );

  -- Step 4 · Quiz
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l3_id, 4, 'quiz',
    '{
      "text":"¿Cuál es la velocidad máxima genérica para un turismo en una carretera convencional de dos carriles en el mismo sentido?",
      "correct":2,
      "options":[
        "90 km/h",
        "110 km/h",
        "100 km/h",
        "120 km/h"
      ],
      "explanation":"En carretera convencional con dos o más carriles en el mismo sentido, la velocidad máxima genérica para turismos es 100 km/h. En carretera de un solo carril por sentido, es 90 km/h."
    }',
    '{
      "text":"Какова общая максимальная скорость для легкового авто на обычной дороге с двумя полосами в одном направлении?",
      "correct":2,
      "options":[
        "90 км/ч",
        "110 км/ч",
        "100 км/ч",
        "120 км/ч"
      ],
      "explanation":"На обычной дороге с двумя и более полосами в одном направлении максимальная скорость для легковых — 100 км/ч. На дороге с одной полосой — 90 км/ч."
    }'
  );

  -- Step 5 · Quiz
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l3_id, 5, 'quiz',
    '{
      "text":"Un conductor lleva su coche bien mantenido, la vía está seca y hay buena visibilidad. En autopista, ¿puede superar los 120 km/h?",
      "correct":1,
      "options":[
        "Sí, si los demás coches van igual de rápido",
        "No, 120 km/h es el límite máximo en autopista para turismos",
        "Sí, si la señal lo indica",
        "Solo si adelanta a otro vehículo"
      ],
      "explanation":"La velocidad máxima en autopista o autovía para turismos es 120 km/h. Este es un límite absoluto que no puede superarse salvo en caso de señalización específica que lo permita en circunstancias especiales, lo cual es muy raro."
    }',
    '{
      "text":"Водитель хорошо обслуженного авто. Дорога сухая, видимость хорошая. На автомагистрали можно ли превысить 120 км/ч?",
      "correct":1,
      "options":[
        "Да, если все едут с такой же скоростью",
        "Нет, 120 км/ч — это максимум на автомагистрали для легковых",
        "Да, если есть соответствующий знак",
        "Только при обгоне"
      ],
      "explanation":"Максимальная скорость на автомагистрали для легковых — 120 км/ч. Это абсолютный лимит, превышение которого недопустимо, если нет специального знака (что очень редко)."
    }'
  );

END $$;
