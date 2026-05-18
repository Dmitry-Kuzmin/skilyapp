-- Seed: first 3 lessons of Module 1 (Definiciones y uso de las vías)

DO $$
DECLARE
  mod1_id UUID;
  l1 UUID; l2 UUID; l3 UUID;
BEGIN
  SELECT id INTO mod1_id FROM course_modules WHERE number = 1;

  -- ── Lesson 1.1 ── Clasificación de los vehículos ─────────────────────────
  INSERT INTO course_lessons (module_id, code, title_es, title_ru, order_index, xp_reward)
  VALUES (mod1_id, '1.1', 'Clasificación de los vehículos', 'Классификация ТС', 1, 10)
  RETURNING id INTO l1;

  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES

  (l1, 1, 'theory', '{
    "text": "Los vehículos se dividen en dos grandes grupos:\n\n**Vehículos a motor:**\n• Automóviles: turismo, moto, autobús, camión, tractocamión, furgón...\n• Vehículos especiales: agrícolas, obras y servicios\n\n**Sin motor:**\n• Ciclo, ciclomotor, remolque, semirremolque, caravana, tranvía, vehículos minusválidos, vehículo de tracción animal"
  }', '{
    "text": "Транспортные средства делятся на две большие группы:\n\n**С двигателем:**\n• Автомобили: легковой, мото, автобус, грузовик, фура, фургон...\n• Спецтехника: сельскохозяйственная, строительная\n\n**Без двигателя:**\n• Велосипед, мопед, прицеп, полуприцеп, каравана, трамвай, транспорт для маломобильных, гужевой транспорт"
  }'),

  (l1, 2, 'theory', '{
    "text": "**Categorías oficiales DGT (por peso y plazas):**\n\n🚗 **M — Pasajeros** (4+ ruedas)\n• M1: máx. 8 plazas\n• M2: más de 8 plazas, MMA ≤ 5t\n• M3: más de 8 plazas, MMA > 5t\n\n🚚 **N — Mercancías** (4+ ruedas)\n• N1: MMA hasta 3,5t\n• N2: MMA 3,5–12t\n• N3: MMA más de 12t\n\n🚛 **O — Remolques**\n• O1: hasta 750 kg\n• O2: 750 kg–3,5t\n• O3: 3,5–10t\n• O4: más de 10t"
  }', '{
    "text": "**Официальные категории DGT (по массе и местам):**\n\n🚗 **M — Пассажиры** (4+ колёс)\n• M1: максимум 8 мест\n• M2: более 8 мест, снаряжённая масса ≤ 5т\n• M3: более 8 мест, снаряжённая масса > 5т\n\n🚚 **N — Грузы** (4+ колёс)\n• N1: до 3,5т\n• N2: 3,5–12т\n• N3: более 12т\n\n🚛 **O — Прицепы**\n• O1: до 750 кг\n• O2: 750 кг–3,5т\n• O3: 3,5–10т\n• O4: более 10т"
  }'),

  (l1, 3, 'theory', '{
    "text": "**Categorías L — Vehículos ligeros:**\n\n🛵 **L1e** Ciclomotores (< 50 cc, < 45 km/h)\n🛵 **L1eA** Ciclos de motor\n🛵 **L1eB** Ciclomotores eléctricos\n🛺 **L2e** Vehículos de 3 ruedas\n🏍️ **L3e** Motocicletas\n🏍️ **L4e** Motocicletas con sidecar\n🚗 **L5e** Vehículo de 3 ruedas simétricas\n🚗 **L6e** Cuadriciclos ligeros\n🚗 **L7e** Cuadriciclos pesados"
  }', '{
    "text": "**Категории L — лёгкие ТС:**\n\n🛵 **L1e** Мопеды (< 50 куб.см, < 45 км/ч)\n🛵 **L1eA** Моторизованные велосипеды\n🛵 **L1eB** Электромопеды\n🛺 **L2e** 3-колёсные ТС\n🏍️ **L3e** Мотоциклы\n🏍️ **L4e** Мотоциклы с коляской\n🚗 **L5e** 3-колёсные симметричные ТС\n🚗 **L6e** Лёгкие квадрициклы\n🚗 **L7e** Тяжёлые квадрициклы"
  }'),

  (l1, 4, 'quiz', '{
    "text": "¿Cuántas plazas puede tener como máximo un vehículo de categoría M1?",
    "options": ["4 plazas", "8 plazas", "12 plazas", "Sin límite de plazas"],
    "correct": 1,
    "explanation": "La categoría M1 incluye vehículos a motor con 4 o más ruedas para transporte de personas, con un máximo de 8 plazas (además del conductor)."
  }', '{
    "text": "Сколько максимально мест может иметь ТС категории M1?",
    "options": ["4 места", "8 мест", "12 мест", "Без ограничений"],
    "correct": 1,
    "explanation": "Категория M1 включает моторные ТС с 4+ колёсами для перевозки людей, максимум 8 пассажирских мест (не считая водителя)."
  }'),

  (l1, 5, 'quiz', '{
    "text": "Un furgón de 5 toneladas de MMA, ¿en qué categoría se clasifica?",
    "options": ["N1", "N2", "N3", "M2"],
    "correct": 1,
    "explanation": "N2 agrupa vehículos de mercancías con MMA superior a 3,5t y hasta 12t. 5 toneladas entra en este rango."
  }', '{
    "text": "Фургон с разрешённой максимальной массой 5 тонн — какая у него категория?",
    "options": ["N1", "N2", "N3", "M2"],
    "correct": 1,
    "explanation": "N2 — грузовые ТС с разрешённой максимальной массой более 3,5т и до 12т. 5 тонн попадает в этот диапазон."
  }');

  -- ── Lesson 1.2.1 ── Definición de vehículo ───────────────────────────────
  INSERT INTO course_lessons (module_id, code, title_es, title_ru, order_index, xp_reward)
  VALUES (mod1_id, '1.2.1', 'Definición de vehículo', 'Определение транспортного средства', 2, 10)
  RETURNING id INTO l2;

  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES

  (l2, 1, 'theory', '{
    "text": "**VEHÍCULO**\n\nTodo aparato apto para circular por las vías o terrenos públicos o privados, de uso común.\n\n**Vehículo a motor:** Vehículo provisto de motor para su propulsión.\n\n⚠️ **NO son vehículos a motor:**\n• Ciclos de motor\n• Ciclomotores\n• Tranvías\n• Bicicletas con pedaleo asistido\n• Vehículos de movilidad personal (VMP)\n• Vehículos de movilidad reducida"
  }', '{
    "text": "**ТРАНСПОРТНОЕ СРЕДСТВО (ТС)**\n\nЛюбое устройство, пригодное для движения по общественным или частным дорогам и территориям общего пользования.\n\n**ТС с двигателем:** Транспортное средство, оснащённое двигателем для движения.\n\n⚠️ **НЕ являются моторными ТС:**\n• Моторизованные велосипеды\n• Мопеды\n• Трамваи\n• Велосипеды с педальной помощью\n• Средства персональной мобильности (VMP)\n• Транспорт для маломобильных"
  }'),

  (l2, 2, 'quiz', '{
    "text": "¿Cuál de estos vehículos NO se considera «vehículo a motor» según el Reglamento General de Vehículos?",
    "options": ["Turismo", "Ciclomotor", "Camión", "Autobús"],
    "correct": 1,
    "explanation": "El ciclomotor está expresamente excluido de la definición de vehículo a motor según el Reglamento General de Vehículos, aunque tenga motor."
  }', '{
    "text": "Какое из этих ТС НЕ считается «моторным» согласно Общему регламенту о транспортных средствах?",
    "options": ["Легковой автомобиль", "Мопед", "Грузовик", "Автобус"],
    "correct": 1,
    "explanation": "Мопед прямо исключён из определения моторного ТС согласно Общему регламенту, несмотря на наличие двигателя."
  }');

  -- ── Lesson 1.2.1.2 ── Conductor y peatón ────────────────────────────────
  INSERT INTO course_lessons (module_id, code, title_es, title_ru, order_index, xp_reward)
  VALUES (mod1_id, '1.2.1.2', 'Conductor y peatón', 'Водитель и пешеход', 3, 10)
  RETURNING id INTO l3;

  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES

  (l3, 1, 'theory', '{
    "text": "**CONDUCTOR**\n\nPersona que maneja el mecanismo de dirección o va al mando de un vehículo, o a cuyo cargo está uno o varios animales.\n\n✅ **Se consideran conductores:**\n• Quien arrastra una motocicleta\n• El pastor que guía animales por la vía\n• Quien va montado en una bicicleta\n\n⚠️ **En autoescuela:** el **profesor** es el conductor (tiene pedales adicionales), NO el alumno."
  }', '{
    "text": "**ВОДИТЕЛЬ**\n\nЛицо, управляющее механизмом управления транспортного средства или командующее им, либо ответственное за одно или несколько животных.\n\n✅ **Считаются водителями:**\n• Кто ведёт мотоцикл рядом\n• Пастух, управляющий животными на дороге\n• Кто едет на велосипеде\n\n⚠️ **В автошколе:** водителем считается **инструктор** (у него дополнительные педали), а НЕ ученик."
  }'),

  (l3, 2, 'theory', '{
    "text": "**PEATÓN**\n\nPersona que circula a pie por las vías.\n\n✅ **También se consideran peatones:**\n• Quien arrastra (no monta) una bicicleta o ciclomotor\n• Quien empuja un carrito de bebé\n• Personas en silla de ruedas no motorizada\n\n---\n\n❓ **¿Conductor o peatón?**\n\n🚲 Montado en bicicleta → **CONDUCTOR**\n🚲 Empujando bicicleta → **PEATÓN**\n\n🛵 Montado en ciclomotor → **CONDUCTOR**\n🛵 Empujando ciclomotor → **PEATÓN**"
  }', '{
    "text": "**ПЕШЕХОД**\n\nЧеловек, передвигающийся пешком по дороге.\n\n✅ **Также считаются пешеходами:**\n• Кто ведёт (не едет) велосипед или мопед\n• Кто везёт детскую коляску\n• Люди в немоторизованной инвалидной коляске\n\n---\n\n❓ **Водитель или пешеход?**\n\n🚲 Едет на велосипеде → **ВОДИТЕЛЬ**\n🚲 Ведёт велосипед → **ПЕШЕХОД**\n\n🛵 Едет на мопеде → **ВОДИТЕЛЬ**\n🛵 Ведёт мопед → **ПЕШЕХОД**"
  }'),

  (l3, 3, 'quiz', '{
    "text": "Vas empujando tu moto porque se ha quedado sin gasolina. ¿Cómo se te considera?",
    "options": ["Conductor, porque la moto es tuya", "Peatón, porque vas a pie", "Conductor, porque vas sobre la calzada", "Peatón solo si estás en la acera"],
    "correct": 1,
    "explanation": "Cuando se arrastra una motocicleta, se considera conductor. Pero en este caso EMPUJAS la moto (no la montas ni la arrastras con ella encendida), así que eres peatón."
  }', '{
    "text": "Ты толкаешь свой мотоцикл, потому что кончился бензин. Кем тебя считают?",
    "options": ["Водителем, так как мотоцикл твой", "Пешеходом, так как идёшь пешком", "Водителем, так как идёшь по проезжей части", "Пешеходом только на тротуаре"],
    "correct": 1,
    "explanation": "Когда тянешь (ведёшь рядом) мотоцикл — считаешься водителем. Но когда ТОЛКАЕШЬ мотоцикл без движения — ты пешеход."
  }'),

  (l3, 4, 'quiz', '{
    "text": "En un vehículo de autoescuela, ¿quién es el conductor?",
    "options": ["El alumno, porque gira el volante", "El profesor, porque tiene los pedales adicionales", "Ambos son conductores", "El propietario del vehículo"],
    "correct": 1,
    "explanation": "En los vehículos de autoescuela, se considera conductor al profesor que va a cargo de los pedales adicionales, no al alumno."
  }', '{
    "text": "В учебном автомобиле автошколы — кто является водителем?",
    "options": ["Ученик, потому что крутит руль", "Инструктор, у которого дополнительные педали", "Оба являются водителями", "Владелец транспортного средства"],
    "correct": 1,
    "explanation": "В автомобилях автошколы водителем считается инструктор, у которого дополнительные педали управления, а не ученик."
  }');

END $$;
