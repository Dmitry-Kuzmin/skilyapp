-- Rewrite lesson 1.6.1: better Russian, richer content
-- Lesson UUID: 2aa1a8d6-630c-4056-b913-a2efd1dfb140

DO $$
DECLARE
  l_id uuid := '2aa1a8d6-630c-4056-b913-a2efd1dfb140';
BEGIN

  DELETE FROM lesson_steps WHERE lesson_id = l_id;

  -- ── Step 1 · Theory: контекст + определение ───────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Carril reservado en función de la velocidad señalizada"},
      {"type":"text","text":"Imagina una carretera interurbana con una fuerte subida. Camiones cargados, autocaravanas, tractores arrastrando remolques — físicamente no pueden mantener la misma velocidad que los turismos en esa pendiente. Para que estos vehículos lentos no bloqueen todo el tráfico, se crea un carril exclusivo para ellos, con una señal de velocidad mínima que indica quién debe usarlo."},
      {"type":"callout","variant":"info","title":"¿Cuándo aparece este carril?","text":"Solo en vías interurbanas (fuera de poblado) con fuertes subidas. El carril reservado siempre está a la derecha. La señal sobre él indica la velocidad mínima obligatoria para ese carril."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Полоса для тихоходов на крутом подъёме"},
      {"type":"text","text":"Представь загородное шоссе с крутым подъёмом. Гружёные фуры, автокараваны, трактора с прицепами — в горку они физически не могут держать ту же скорость, что легковые. Чтобы такие «тихоходы» не тормозили весь поток, для них создают отдельную медленную полосу — со знаком минимальной скорости над ней, который чётко указывает, кто обязан по ней ехать."},
      {"type":"callout","variant":"info","title":"Когда появляется эта полоса?","text":"Только на загородных дорогах (вне населённого пункта) с крутыми подъёмами. Медленная полоса всегда находится справа. Знак над ней указывает минимальную обязательную скорость для этой полосы."}
    ]}'
  );

  -- ── Step 2 · Theory: как выглядит знак + кто обязан ──────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"¿Cómo es la señal?","text":"Es una señal de indicación (rectángulo azul) con una señal circular de velocidad mínima dentro (círculo azul con número blanco). El número es el umbral: si puedes alcanzarlo o superarlo, puedes circular por ese carril. Si no puedes alcanzarlo → debes ir al carril reservado."},
      {"type":"callout","variant":"danger","title":"Obligación para vehículos lentos","text":"Si tu vehículo NO puede alcanzar la velocidad mínima señalizada, DEBES usar el carril reservado (el de la derecha). Ocupar los carriles centrales o el de la izquierda sin alcanzar el mínimo es una infracción."},
      {"type":"callout","variant":"info","title":"Detalle visual del carril","text":"La línea que separa el carril reservado del resto es más ancha (gruesa) de lo normal. Es el marcador específico de este tipo de carril — diferente a la línea discontinua habitual."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Как выглядит знак?","text":"Информационный знак (синий прямоугольник) с вписанным знаком минимальной скорости (синий круг с белой цифрой). Цифра — это порог: развиваешь такую скорость или больше → можешь ехать по этой полосе. Не можешь → обязан перейти на медленную полосу."},
      {"type":"callout","variant":"danger","title":"Обязанность для тихоходов","text":"Если твоя машина НЕ может разогнаться до указанного минимума — обязан занять медленную полосу (правую). Ехать по средней или левой полосе без достижения минимума — это нарушение ПДД."},
      {"type":"callout","variant":"info","title":"Визуальный признак полосы","text":"Линия разметки, отделяющая медленную полосу от остальных, толще обычной. Это специальный маркер именно такого типа полосы — не спутаешь с обычной прерывистой разметкой."}
    ]}'
  );

  -- ── Step 3 · Theory: кто куда + правило правой полосы ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"heading","text":"¿Quién puede usar qué carril?"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"✅","title":"Velocidad ≥ mínimo señalizado","description":"Puede circular por el carril central o el izquierdo. Para adelantar, puede usar esos carriles. Al terminar el adelantamiento, debe volver a la derecha."},
        {"icon":"❌","title":"Velocidad < mínimo señalizado","description":"Obligado a usar el carril reservado (derecha). No puede adelantar por los carriles centrales ni por el izquierdo. Si intenta hacerlo, comete infracción."}
      ]},
      {"type":"callout","variant":"warning","title":"¡Ojo al examen! Vía vacía = derecha igualmente","text":"Aunque puedas superar la velocidad mínima, si no estás adelantando debes circular por el carril de la DERECHA. En vía interurbana siempre hay que ir a la derecha salvo adelantamiento. Que la vía esté vacía no cambia esta obligación."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Кто по какой полосе?"},
      {"type":"card-grid","cols":2,"cards":[
        {"icon":"✅","title":"Скорость ≥ минимума по знаку","description":"Можно ехать по средней или левой полосе. Для обгона разрешено использовать эти полосы. После завершения обгона — вернуться на правую."},
        {"icon":"❌","title":"Скорость < минимума по знаку","description":"Обязан ехать по медленной полосе (правой). Выезжать на среднюю или левую для обгона — запрещено. Попытка обгона в такой ситуации — нарушение."}
      ]},
      {"type":"callout","variant":"warning","title":"Ловушка экзамена: дорога пустая — всё равно правая","text":"Даже если ты можешь ехать быстрее минимума — на загородной дороге без обгона обязан держаться ПРАВОЙ полосы. Свободная дорога этого правила не отменяет. Наличие медленной полосы рядом тоже ничего не меняет."}
    ]}'
  );

  -- ── Step 4 · Quiz: использование полосы со знаком мин. скорости ──────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"question_id":"ac36a5e6-3ed7-4820-9e82-76b792b41572","explanation":"Solo pueden circular por ese carril los vehículos que alcancen o superen la velocidad mínima señalizada. Los que no la alcanzan deben usar el carril reservado de la derecha — ese es justamente el carril para vehículos lentos."}',
    '{"question_id":"ac36a5e6-3ed7-4820-9e82-76b792b41572","explanation":"По этой полосе могут ехать только те, кто развивает скорость, равную или выше указанной знаком. Кто не достигает минимума — обязан перейти на медленную полосу (правую). Именно для таких ТС она и создана."}'
  );

  -- ── Step 5 · Quiz: какая мин. скорость на этой дороге ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"question_id":"45989579-77c1-4013-b2a2-4575e6432244","explanation":"El círculo azul con número blanco es la señal de velocidad mínima obligatoria. En la imagen marca 60 km/h: un turismo que no llegue a esa velocidad debe ceder el carril y pasar al carril reservado para vehículos lentos."}',
    '{"question_id":"45989579-77c1-4013-b2a2-4575e6432244","explanation":"Синий круг с белой цифрой — знак минимальной скорости. На картинке — 60 км/ч. Легковой, который не может разогнаться до этой скорости, обязан освободить полосу и перейти на медленную (правую)."}'
  );

  -- ── Step 6 · Theory: примеры с экзамена — пример 1 ─────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Ejemplos típicos del examen"},
      {"type":"callout","variant":"tip","title":"Ejemplo 1 — ¿El rojo adelanta correctamente al azul?","text":"Azul: 65 km/h · Rojo: 90 km/h · Velocidad mínima señalizada: 70 km/h\n\n✅ SÍ, adelanta correctamente.\n\nEl rojo circula a 90 km/h, que supera el mínimo de 70 km/h. Por tanto, puede usar el carril del medio o el de la izquierda para adelantar al azul. Una vez finalizado el adelantamiento, deberá volver al carril de la derecha, salvo que vaya a realizar un nuevo adelantamiento inmediatamente."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Типичные примеры с экзамена"},
      {"type":"callout","variant":"tip","title":"Пример 1 — Красный правильно обгоняет синего?","text":"Синий: 65 км/ч · Красный: 90 км/ч · Минимальная скорость по знаку: 70 км/ч\n\n✅ ДА, обгон правильный.\n\nКрасный едет 90 км/ч — это выше минимума 70 км/ч. Значит, он вправе выехать на среднюю или левую полосу для обгона синего. После завершения обгона обязан вернуться на правую полосу, если не планирует сразу новый обгон."}
    ]}'
  );

  -- ── Step 7 · Theory: примеры 2 и 3 ──────────────────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"warning","title":"Ejemplo 2 — ¿Circula bien a 90 km/h por el carril central?","text":"Vía interurbana vacía, tres carriles, señal de 70 km/h mínimo. El vehículo circula a 90 km/h por el carril central sin adelantar a nadie.\n\n❌ NO, circula incorrectamente.\n\nSí, supera el mínimo de 70 km/h. Pero en vía interurbana, sin estar adelantando, la obligación es circular siempre por el carril de la DERECHA. Que la vía esté vacía no cambia esta norma. Podría usar la central solo si estuviera adelantando."},
      {"type":"callout","variant":"danger","title":"Ejemplo 3 — El azul (65 km/h) adelanta al rojo (60 km/h). ¿Correcto?","text":"Velocidad mínima señalizada: 70 km/h\n\n❌ NO, adelanta incorrectamente.\n\nEl azul va a 65 km/h — por debajo del mínimo de 70 km/h. Da igual que el rojo vaya más despacio: el azul no alcanza la velocidad mínima señalizada y por tanto NO puede salir al carril central ni al izquierdo. Debe permanecer en el carril reservado de la derecha."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"warning","title":"Пример 2 — Правильно ехать 90 км/ч по средней полосе?","text":"Загородная пустая дорога, 3 полосы, знак минимум 70 км/ч. Машина едет 90 км/ч по средней полосе и никого не обгоняет.\n\n❌ НЕТ, едет неправильно.\n\nДа, 90 км/ч > 70 км/ч минимума. Но на загородной дороге без обгона — обязан ехать по ПРАВОЙ полосе. Пустая дорога этого правила не отменяет. Средняя полоса разрешена только во время обгона, а не просто так."},
      {"type":"callout","variant":"danger","title":"Пример 3 — Синий (65 км/ч) обгоняет красного (60 км/ч). Правильно?","text":"Минимальная скорость по знаку: 70 км/ч\n\n❌ НЕТ, обгон неправильный.\n\nСиний едет 65 км/ч — это ниже минимума 70 км/ч. Неважно, что красный едет ещё медленнее — это не аргумент. Синий не достигает минимальной скорости по знаку, а значит не имеет права выезжать на среднюю или левую полосу. Должен оставаться на медленной полосе (правой)."}
    ]}'
  );

  -- ── Step 8 · Quiz: нет мин. скорости → аварийка ─────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"question_id":"80c3636b-80ed-4bb9-8301-5e4e6ca18000","explanation":"Cuando no puedes alcanzar la velocidad mínima y existe peligro de alcance, debes advertir a los demás conductores circulando con las luces de emergencia encendidas. Ni los destellos de largo-corto alcance ni el uso repetido del freno son la señal correcta según el Reglamento."}',
    '{"question_id":"80c3636b-80ed-4bb9-8301-5e4e6ca18000","explanation":"Если не можешь развить минимальную скорость и есть риск столкновения сзади — включи аварийную световую сигнализацию. Мигание дальним/ближним светом или многократное нажатие на тормоз по Правилам не являются правильным способом предупреждения."}'
  );

  -- ── Step 9 · Quiz: мин. скорость автокаравана на автопиcте ───────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"question_id":"21f58b38-2319-4df4-b4c0-af3bb2656c23","explanation":"En autopista, la velocidad mínima para vehículos de más de 3.000 kg de MMA (como esta autocaravana) es 60 km/h. Circular por debajo sin causa justificada se considera velocidad anormalmente reducida, que crea riesgo de alcance."}',
    '{"question_id":"21f58b38-2319-4df4-b4c0-af3bb2656c23","explanation":"На автомагистрали минимальная скорость для ТС с РМM свыше 3000 кг (таких как этот автокараван) — 60 км/ч. Движение медленнее без уважительной причины считается ненормально низкой скоростью и создаёт угрозу столкновения сзади."}'
  );

  -- ── Step 10 · Quiz: authored — 68 км/ч < 70 мин ──────────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 10, 'quiz',
    '{"text":"En una vía interurbana con tres carriles y señal de velocidad mínima de 70 km/h, un vehículo circula a 68 km/h. ¿Puede salir al carril central para adelantar a un vehículo más lento?","options":["Sí, porque solo le faltan 2 km/h para el mínimo.","No, porque no alcanza la velocidad mínima de 70 km/h señalizada.","Sí, si el vehículo de delante va a menos de 60 km/h."],"correct":1,"explanation":"No hay excepciones por ''casi llegar'' al mínimo. Para poder usar el carril central o el izquierdo, el vehículo debe alcanzar o superar exactamente la velocidad señalizada (70 km/h). A 68 km/h no cumple el requisito y debe permanecer en el carril derecho reservado."}',
    '{"text":"На загородной трёхполосной дороге со знаком минимальной скорости 70 км/ч автомобиль едет 68 км/ч. Может ли он выехать на среднюю полосу, чтобы обогнать более медленный автомобиль?","options":["Да, ведь ему не хватает всего 2 км/ч до минимума.","Нет, потому что он не достигает минимума 70 км/ч по знаку.","Да, если впереди едущий движется менее 60 км/ч."],"correct":1,"explanation":"Никаких исключений за «почти достиг» не существует. Чтобы выехать на среднюю или левую полосу, нужно точно достигать указанной скорости (70 км/ч) или превышать её. При 68 км/ч условие не выполнено — водитель обязан оставаться на медленной правой полосе."}'
  );

  -- ── Step 11 · Quiz: authored — средняя полоса без обгона ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'quiz',
    '{"text":"En una vía interurbana de tres carriles con señal de velocidad mínima de 70 km/h, la carretera está completamente libre. Un conductor que circula a 85 km/h decide ir por el carril central. ¿Es correcto?","options":["Sí, porque supera la velocidad mínima señalizada.","No, porque en vía interurbana sin adelantar debe circular por el carril de la derecha.","Sí, si no hay ningún vehículo en la vía."],"correct":1,"explanation":"Superar la velocidad mínima no es un permiso para circular por cualquier carril. La norma general de la vía interurbana obliga a circular por la derecha siempre que no se esté adelantando, independientemente de si hay tráfico o no. El carril central solo se usa para adelantar."}',
    '{"text":"На загородной трёхполосной дороге со знаком минимальной скорости 70 км/ч трасса абсолютно свободна. Водитель едет 85 км/ч и решает двигаться по средней полосе. Правильно ли это?","options":["Да, потому что он превышает минимальную скорость по знаку.","Нет, потому что на загородной дороге без обгона надо ехать по правой полосе.","Да, раз других машин на дороге нет."],"correct":1,"explanation":"Превышение минимальной скорости не даёт права занимать любую полосу по желанию. На загородной дороге общее правило — всегда держаться правой полосы, если не выполняется обгон. Средняя полоса предназначена только для обгона, а не для постоянного движения."}'
  );

END $$;
