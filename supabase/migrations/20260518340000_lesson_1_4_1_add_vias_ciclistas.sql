-- Lección 1.4.1 — Añadir pasos 13-15: vías ciclistas y senda ciclable
-- Lesson id: 6d8647b2-5d23-4d0b-861a-247444649800
-- Quiz Step 14: DGT 817c341c (peatones en acera bici → No → idx 1)
-- Quiz Step 15: DGT 10e201af (cruzar carril bici → ceder paso → idx 0)

DO $$
DECLARE
  l_id uuid := '6d8647b2-5d23-4d0b-861a-247444649800';
BEGIN

  -- ── Step 13 · Theory — Vías ciclistas: todos los tipos ────────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 13, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Vías ciclistas y sendas"},
      {"type":"table","headers":["Tipo","Usuarios","Segregada de tráfico","Trazado"],"rows":[
        ["Vía ciclista (genérico)","Solo ciclos","Sí","Variable"],
        ["Pista bici","Solo ciclos","Sí (tráfico motorizado)","Independiente de carreteras"],
        ["Carril bici","Solo ciclos","No (adosada a calzada)","Junto a la calzada (1 o 2 sentidos)"],
        ["Carril bici protegido","Solo ciclos","Sí (elementos físicos)","Junto a calzada pero separado físicamente"],
        ["Acera bici","Solo ciclos","— (sobre acera)","Señalizada sobre la acera"],
        ["Senda ciclable","Peatones + ciclos","Sí (tráfico motorizado)","Parques, jardines, bosques"],
        ["Vía / calzada de servicio","Peatones + ciclos","Sí (tráfico motorizado)","Parques, jardines, bosques"]
      ]},
      {"type":"callout","variant":"warning","title":"¡Trampa de examen!","text":"SENDA CICLABLE = VÍA DE SERVICIO. Tienen la misma definición: vía para peatones Y ciclos, segregada del tráfico motorizado, por espacios abiertos/parques/jardines/bosques. La diferencia es solo el nombre."},
      {"type":"callout","variant":"danger","title":"Acera bici ≠ acera","text":"La acera bici es una vía ciclista señalizada SOBRE la acera. Aunque está físicamente en la acera, es zona reservada para ciclos. Los peatones NO pueden circular por ella."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Велосипедные дорожки и тропы"},
      {"type":"table","headers":["Тип","Пользователи","Отделена от транспорта","Трассировка"],"rows":[
        ["Велодорожка (общее)","Только велосипеды","Да","Разная"],
        ["Велотрек (Pista bici)","Только велосипеды","Да (от моторного транспорта)","Независимая от дорог"],
        ["Велополоса (Carril bici)","Только велосипеды","Нет (вдоль проезжей части)","Рядом с дорогой (1 или 2 направления)"],
        ["Защищённая велополоса","Только велосипеды","Да (физические элементы)","Рядом с дорогой, физически отделена"],
        ["Велотротуар (Acera bici)","Только велосипеды","— (на тротуаре)","Обозначена на тротуаре"],
        ["Велопешеходная тропа","Пешеходы + велосипеды","Да (от моторного транспорта)","Парки, сады, леса"],
        ["Сервисная дорога","Пешеходы + велосипеды","Да (от моторного транспорта)","Парки, сады, леса"]
      ]},
      {"type":"callout","variant":"warning","title":"Ловушка на экзамене!","text":"ВЕЛОПЕШЕХОДНАЯ ТРОПА = СЕРВИСНАЯ ДОРОГА. Одинаковое определение: дорога для пешеходов И велосипедистов, отделённая от моторного транспорта, в открытых пространствах/парках/садах/лесах. Разница — только в названии."},
      {"type":"callout","variant":"danger","title":"Велотротуар ≠ тротуар","text":"Велотротуар — это велодорожка, обозначенная НА тротуаре. Хотя физически она на тротуаре, это зона, зарезервированная для велосипедов. Пешеходы НЕ могут по ней ездить."}
    ]}'
  );

  -- ── Step 14 · Quiz — DGT 817c341c (peatones en acera bici) ────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 14, 'quiz',
    '{"text":"¿Pueden los peatones circular por una vía ciclista que se encuentra debidamente señalizada sobre la acera?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-03_test-009/817c341c-c6be-47b3-a57b-99fcd87d2080.webp","options":["Sí, ya que la acera es una zona peatonal.","No; es una vía reservada para conductores de ciclos.","Solo para cruzarla, incluso en lugares no señalizados."],"correct":1,"explanation":"No, los peatones no pueden circular por una vía ciclista señalizada sobre la acera (acera bici). Aunque esté físicamente sobre la acera, la acera bici es una vía reservada exclusivamente para conductores de ciclos. Los peatones deben circular por la parte de la acera no habilitada como vía ciclista."}',
    '{"text":"Могут ли пешеходы двигаться по велодорожке, которая должным образом обозначена на тротуаре?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-03_test-009/817c341c-c6be-47b3-a57b-99fcd87d2080.webp","options":["Да, так как тротуар является пешеходной зоной.","Нет; это путь, зарезервированный для водителей велосипедов.","Только для её пересечения, даже в необозначенных местах."],"correct":1,"explanation":"Нет, пешеходы не могут ехать по велодорожке, обозначенной на тротуаре (acera bici). Хотя физически она находится на тротуаре, велотротуар — это зона, зарезервированная исключительно для велосипедистов. Пешеходы должны идти по той части тротуара, которая не обозначена как велодорожка."}'
  );

  -- ── Step 15 · Quiz — DGT 10e201af (cruzar carril bici → ceder paso) ───────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 15, 'quiz',
    '{"text":"Para incorporarse a la vía principal, un turismo tiene que atravesar un carril bici debidamente señalizado; ¿deberá ceder el paso a los ciclistas que circulan por el mismo?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/10e201af-c114-4392-8e51-744feb0ce3f8.webp","options":["Sí; los ciclistas tienen prioridad de paso.","No; el turismo tiene prioridad de paso.","Solo cuando los ciclistas circulen en grupo."],"correct":0,"explanation":"Sí, el turismo debe ceder el paso a los ciclistas que circulan por el carril bici cuando lo tiene que atravesar para incorporarse a la vía principal. Los ciclistas tienen prioridad de paso cuando circulan por un carril bici debidamente señalizado."}',
    '{"text":"Чтобы выехать на главную дорогу, легковой автомобиль должен пересечь велосипедную полосу, обозначенную соответствующими знаками. Должен ли он уступить дорогу велосипедистам, движущимся по ней?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-016/10e201af-c114-4392-8e51-744feb0ce3f8.webp","options":["Да, велосипедисты имеют преимущество.","Нет, легковой автомобиль имеет преимущество.","Только когда велосипедисты едут группой."],"correct":0,"explanation":"Да, легковой автомобиль обязан уступить дорогу велосипедистам, движущимся по велополосе, когда ему необходимо пересечь её для выезда на главную дорогу. Велосипедисты имеют приоритет проезда на должным образом обозначенных велополосах."}'
  );

END $$;
