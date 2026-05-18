DO $$ DECLARE
  mod_id uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id   uuid;
BEGIN

INSERT INTO course_lessons (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
VALUES (
  mod_id,
  '1.5.4',
  'Isletas, carriles especiales y vía de 3 carriles doble sentido',
  'Островки, специальные полосы и дорога с 3 полосами двустороннего движения',
  28, 40, false
)
RETURNING id INTO l_id;

-- Step 1: Heading isletas
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 1, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.4 Circulación en vías con isletas y refugios"}]}',
'{"blocks":[{"type":"heading","text":"1.5.4 Движение на дорогах с островками и направляющими"}]}');

-- Step 2: Regla isletas
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 2, 'theory',
'{"blocks":[{"type":"card-grid","cols":2,"cards":[{"icon":"↔️","title":"Doble sentido","description":"Siempre por la DERECHA de la isleta o refugio. Nunca por la izquierda."},{"icon":"➡️","title":"Un solo sentido","description":"Por la derecha O por la izquierda, indistintamente."}]}]}',
'{"blocks":[{"type":"card-grid","cols":2,"cards":[{"icon":"↔️","title":"Двустороннее движение","description":"Всегда объезжаем островок СПРАВА. Никогда слева."},{"icon":"➡️","title":"Одностороннее движение","description":"Можно объехать справа ИЛИ слева — без разницы."}]}]}');

-- Step 3: Quiz c8da4f77 — doble sentido isleta → derecha (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 3, 'quiz',
'{"text":"En una vía de doble sentido, ¿por qué lado de una isleta se circulará?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/c8da4f77-5d87-474d-b8ae-92d696bda434_1768752762526.webp","options":["Por su derecha.","Por su izquierda.","Por su derecha o por su izquierda, indistintamente."],"correct":0,"explanation":"En vías de doble sentido, la isleta o refugio siempre se pasa por la derecha, nunca por la izquierda, ya que el sentido contrario ocupa ese lado."}',
'{"text":"На дороге с двусторонним движением, с какой стороны островка безопасности следует двигаться?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/c8da4f77-5d87-474d-b8ae-92d696bda434_1768752762526.webp","options":["По правой стороне.","По левой стороне.","По правой или по левой стороне, без различия."],"correct":0,"explanation":"На дорогах с двусторонним движением островок всегда объезжают справа — никогда слева, так как левая сторона занята встречным направлением."}');

-- Step 4: Quiz b5a949ba — sentido único isleta → indistintamente (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 4, 'quiz',
'{"text":"En una calzada con un sentido de circulación, en el centro hay una isleta. ¿Por dónde se puede circular?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/b5a949ba-cd60-4fda-8b6a-b0066852c487.webp","options":["Por la derecha o por la izquierda, indistintamente.","Solamente por la parte derecha del refugio.","Solamente por la parte izquierda del refugio."],"correct":0,"explanation":"En vías de un solo sentido no hay tráfico en sentido contrario, por lo que la isleta o refugio puede pasarse por la derecha o por la izquierda indistintamente."}',
'{"text":"На проезжей части с односторонним движением в центре находится островок безопасности. С какой стороны его можно объехать?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/b5a949ba-cd60-4fda-8b6a-b0066852c487.webp","options":["И справа, и слева.","Только справа от островка.","Только слева от островка."],"correct":0,"explanation":"На дорогах с односторонним движением встречного транспорта нет, поэтому островок можно объехать как справа, так и слева — без разницы."}');

-- Step 5: Heading carriles especiales
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 5, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.5 Carriles especiales: no cuentan para el cómputo"}]}',
'{"blocks":[{"type":"heading","text":"1.5.5 Специальные полосы: не считаются при подсчёте"}]}');

-- Step 6: Explicación carriles reservados
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 6, 'theory',
'{"blocks":[{"type":"callout","variant":"warning","title":"¡Ojo al examen!","text":"Los carriles reservados a determinados vehículos o maniobras NO se cuentan como carriles normales:\n\n• Carril bus / carril taxi\n• Carril de aceleración\n• Carril de deceleración\n\nEjemplo: una vía con 2 carriles normales + 1 carril bus → tiene 2 carriles (no 3)."},{"type":"callout","variant":"info","title":"Acceso al carril bus","text":"Línea continua: PROHIBIDO para turismos.\nLínea discontinua: permitido para realizar alguna maniobra que no sea parar, estacionar, cambiar de sentido o adelantar."}]}',
'{"blocks":[{"type":"callout","variant":"warning","title":"Внимание на экзамене!","text":"Полосы, зарезервированные для определённых транспортных средств или манёвров, НЕ считаются обычными полосами:\n\n• Автобусная полоса / полоса для такси\n• Полоса разгона\n• Полоса торможения\n\nПример: дорога с 2 обычными полосами + 1 автобусной → имеет 2 полосы (не 3)."},{"type":"callout","variant":"info","title":"Въезд на автобусную полосу","text":"Сплошная линия: ЗАПРЕЩЕНО для легковых.\nПрерывистая линия: разрешено для выполнения манёвра (кроме остановки, стоянки, разворота и обгона)."}]}');

-- Step 7: Quiz 49f0315e — turismo carril bus continua → No (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 7, 'quiz',
'{"text":"¿Puede circular un turismo por un carril BUS señalizado con línea longitudinal continua?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-007/49f0315e-3575-4493-addf-2629506ccc9c_1768678251322.webp","options":["No.","Sí, cuando el carril está en vía urbana.","Sí, para girar a la derecha."],"correct":0,"explanation":"El carril bus delimitado por línea continua está totalmente prohibido para los turismos. Solo cuando la línea es discontinua se permite entrar brevemente para realizar una maniobra."}',
'{"text":"Разрешено ли легковому автомобилю двигаться по полосе BUS, отделенной сплошной линией разметки?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-007/49f0315e-3575-4493-addf-2629506ccc9c_1768678251322.webp","options":["Нет.","Да, если полоса находится на городской дороге.","Да, для поворота направо."],"correct":0,"explanation":"Автобусная полоса, отделённая сплошной линией, полностью запрещена для легковых автомобилей. Только при прерывистой линии допускается кратковременный въезд для манёвра."}');

-- Step 8: Quiz 75dc57d4 — turismo carril bus discontinua → Sí para maniobras (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 8, 'quiz',
'{"text":"¿Está permitido que un turismo utilice un tramo de carril reservado para autobuses, delimitado por línea discontinua?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-001/75dc57d4-85fc-4d9a-bd70-94297e507add.webp","options":["Sí, para realizar alguna maniobra que no sea parar, estacionar, cambiar el sentido o adelantar.","Sí, pero sólo para cambiar de dirección a la derecha.","No, siempre está prohibido."],"correct":0,"explanation":"La línea discontinua permite al turismo entrar brevemente al carril bus, pero únicamente para realizar una maniobra. Está prohibido parar, estacionar, cambiar de sentido o adelantar en él."}',
'{"text":"Разрешено ли легковому автомобилю использовать участок полосы для автобусов, отделенный прерывистой линией?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-001/75dc57d4-85fc-4d9a-bd70-94297e507add.webp","options":["Да, для выполнения любого маневра, кроме остановки, стоянки, разворота или обгона.","Да, но только для поворота направо.","Нет, это всегда запрещено."],"correct":0,"explanation":"Прерывистая линия разрешает легковому автомобилю кратковременный въезд на автобусную полосу только для манёвра. Остановка, стоянка, разворот и обгон на ней запрещены."}');

-- Step 9: Quiz e1f8805c — carril bus para adelantar → No (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 9, 'quiz',
'{"text":"¿Puede utilizar el carril bus para adelantar a otro vehículo?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-008/e1f8805c-87f6-4982-9850-fe9c7e60b855_1768733090468.webp","options":["No, está prohibido.","Sólo si la línea blanca que lo delimita es discontinua.","Sí, si no circula ningún autobús por el carril."],"correct":0,"explanation":"Adelantar en el carril bus está siempre prohibido, incluso cuando la línea que lo delimita es discontinua. La línea discontinua solo permite entrar para una maniobra, no para adelantar."}',
'{"text":"Разрешено ли вам использовать автобусную полосу для обгона другого транспортного средства?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-008/e1f8805c-87f6-4982-9850-fe9c7e60b855_1768733090468.webp","options":["Нет, это запрещено.","Только если белая линия, обозначающая ее, прерывистая.","Да, если по полосе не движется ни один автобус."],"correct":0,"explanation":"Обгон на автобусной полосе запрещён всегда — даже если линия прерывистая. Прерывистая линия допускает лишь кратковременный въезд для манёвра, но не для обгона."}');

-- Step 10: Heading 3 carriles doble sentido
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 10, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.6 Calzada de doble sentido con 3 carriles"}]}',
'{"blocks":[{"type":"heading","text":"1.5.6 Двусторонняя дорога с 3 полосами"}]}');

-- Step 11: Tabla uso de cada carril
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 11, 'theory',
'{"blocks":[{"type":"callout","variant":"danger","title":"Vía muy peligrosa — casi desaparecida","text":"La calzada bidireccional con 3 carriles es extremadamente peligrosa porque podemos encontrarnos un vehículo de frente en el carril central."},{"type":"table","headers":["Carril","Uso permitido"],"rows":[["Derecho (1.º)","Circular + cambio de sentido"],["Central (2.º)","Adelantar + girar a la izquierda"],["Izquierdo (3.º)","❌ NUNCA en nuestro sentido"]],"caption":"El carril izquierdo pertenece al sentido contrario"}]}',
'{"blocks":[{"type":"callout","variant":"danger","title":"Очень опасная дорога — практически исчезла","text":"Двусторонняя дорога с 3 полосами крайне опасна: по средней полосе может ехать встречный автомобиль."},{"type":"table","headers":["Полоса","Разрешённое использование"],"rows":[["Правая (1-я)","Движение + разворот"],["Центральная (2-я)","Обгон + поворот налево"],["Левая (3-я)","❌ НИКОГДА в нашем направлении"]],"caption":"Левая полоса принадлежит встречному направлению"}]}');

-- Step 12: Quiz 2f7906d0 — carril central → adelantar+girar izq (idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 12, 'quiz',
'{"text":"En una carretera de tres carriles de circulación y doble sentido, ¿para qué se utiliza el carril central?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/2f7906d0-24ca-4300-82db-86561cfcfc42.webp","options":["Como un carril de sentido contrario a la circulación.","Para realizar adelantamientos y giros a la izquierda.","Para la circulación en cualquier sentido."],"correct":1,"explanation":"En una calzada bidireccional de 3 carriles, el carril central se utiliza para adelantar y para girar a la izquierda. El carril derecho es para la circulación normal y cambios de sentido."}',
'{"text":"Для чего используется средняя полоса на дороге с тремя полосами и двусторонним движением?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/2f7906d0-24ca-4300-82db-86561cfcfc42.webp","options":["Как полоса для встречного движения.","Для выполнения обгона и поворотов налево.","Для движения в любом направлении."],"correct":1,"explanation":"На двусторонней дороге с 3 полосами средняя полоса используется для обгона и поворота налево. Правая — для обычного движения и разворотов."}');

-- Step 13: Quiz 649ef0fe — carril izquierdo → No (idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 13, 'quiz',
'{"text":"En calzadas con doble sentido de circulación y tres carriles separados por marcas longitudinales discontinuas, ¿se podrá circular por el situado más a la izquierda?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/649ef0fe-5474-45cf-9591-ea49f922b0b6_1768960538272_pro.webp","options":["Sí, cuando no se aproxime otro vehículo.","No.","Sólo para girar a la izquierda."],"correct":1,"explanation":"El carril izquierdo en una calzada bidireccional de 3 carriles es para el sentido contrario. Nunca se puede usar en nuestro sentido, sea cual sea la situación."}',
'{"text":"На дорогах с двусторонним движением и тремя полосами, разделенными прерывистыми линиями разметки, разрешено ли движение по крайней левой полосе?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-004/649ef0fe-5474-45cf-9591-ea49f922b0b6_1768960538272_pro.webp","options":["Да, если не приближается другое транспортное средство.","Нет.","Только для поворота налево."],"correct":1,"explanation":"Крайняя левая полоса на двусторонней дороге с 3 полосами предназначена для встречного направления. Использовать её в своём направлении запрещено при любых обстоятельствах."}');

-- Step 14: Quiz 973abe11 — girar izquierda → carril central (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 14, 'quiz',
'{"text":"¿Dónde debe colocarse para cambiar de dirección a la izquierda en esta vía de doble sentido y tres carriles?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-013/973abe11-8211-44b1-803f-35a98614c36b_1773871287027_pro.webp","options":["En el carril central, siempre que esté libre.","Ceñido al borde izquierdo de la calzada.","Junto al borde derecho de la calzada."],"correct":0,"explanation":"Para girar a la izquierda en una calzada bidireccional de 3 carriles hay que situarse en el carril central (siempre que esté libre). El carril izquierdo está reservado al sentido contrario."}',
'{"text":"Где вы должны расположиться для поворота налево на этой дороге с двусторонним движением и тремя полосами?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-013/973abe11-8211-44b1-803f-35a98614c36b_1773871287027_pro.webp","options":["На центральной полосе, если она свободна.","Прижавшись к левому краю проезжей части.","У правого края проезжей части."],"correct":0,"explanation":"Для поворота налево на двусторонней дороге с 3 полосами нужно занять центральную полосу (если она свободна). Левая полоса зарезервирована для встречного направления."}');

END $$;
