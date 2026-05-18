DO $$ DECLARE
  mod_id uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id   uuid;
BEGIN

INSERT INTO course_lessons (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
VALUES (
  mod_id,
  '1.5.1',
  'Circulación por carriles: fuera y dentro de poblado',
  'Движение по полосам: вне и внутри населённых пунктов',
  27, 40, false
)
RETURNING id INTO l_id;

-- Step 1: Heading fuera de poblado
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 1, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.1 Circulación fuera de poblado"}]}',
'{"blocks":[{"type":"heading","text":"1.5.1 Движение вне населённого пункта"}]}');

-- Step 2: Norma general carril derecho
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 2, 'theory',
'{"blocks":[{"type":"callout","variant":"info","title":"Norma general","text":"En autopistas, autovías, vías para automóviles y carreteras convencionales debemos circular por el carril de la DERECHA.\n\nLos demás carriles se pueden utilizar para adelantar, para tomar una salida o en situación de atasco."}]}',
'{"blocks":[{"type":"callout","variant":"info","title":"Общее правило","text":"На автострадах, скоростных дорогах и обычных шоссе мы должны двигаться по ПРАВОЙ полосе.\n\nОстальные полосы можно использовать для обгона, съезда на развязке или при пробке."}]}');

-- Step 3: Vehículos pesados / conjuntos largos
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 3, 'theory',
'{"blocks":[{"type":"callout","variant":"warning","title":"¡Ojo al examen!","text":"Los vehículos de más de 3.500 kg y los conjuntos de vehículos de más de 7 metros sólo pueden utilizar el carril derecho y el inmediato (1.º y 2.º por la derecha).\n\nEl resto de carriles les está prohibido."}]}',
'{"blocks":[{"type":"callout","variant":"warning","title":"Внимание на экзамене!","text":"Транспортные средства массой более 3 500 кг и автопоезда длиной более 7 метров могут использовать только правую и ближайшую к ней полосу (1-ю и 2-ю считая справа).\n\nОстальные полосы для них запрещены."}]}');

-- Step 4: Quiz 2e4486db — turismo con remolque, tercer carril (correct idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 4, 'quiz',
'{"text":"Un turismo con remolque, ¿cuándo puede utilizar el tercer carril circulando fuera de poblado si tiene tres carriles para el mismo sentido?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-006/2e4486db-2215-4283-aee6-c07297f4b267.webp","options":["Al realizar una maniobra de adelantamiento.","Cuando el conjunto mide menos de 7 metros.","En situación de tráfico intenso."],"correct":1,"explanation":"Los conjuntos de más de 7 metros están limitados al carril derecho y el inmediato. Un turismo con remolque que mida menos de 7 metros no entra en esa restricción y puede usar el tercer carril."}',
'{"text":"В каком случае легковой автомобиль с прицепом может использовать третью полосу вне населённого пункта, если в одном направлении имеется три полосы?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-006/2e4486db-2215-4283-aee6-c07297f4b267.webp","options":["При намерении совершить обгон.","Если длина автопоезда составляет менее 7 метров.","При интенсивном движении."],"correct":1,"explanation":"Автопоезда длиной более 7 метров ограничены правой и соседней полосой. Легковой автомобиль с прицепом длиной менее 7 метров под это ограничение не подпадает и может использовать третью полосу."}');

-- Step 5: Heading dentro de poblado
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 5, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.1 Circulación dentro de poblado"}]}',
'{"blocks":[{"type":"heading","text":"1.5.1 Движение внутри населённого пункта"}]}');

-- Step 6: Con líneas + >1 carril → carril más conveniente
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 6, 'theory',
'{"blocks":[{"type":"callout","variant":"info","title":"Con líneas separadoras y más de un carril por sentido","text":"Circularemos por el carril que más convenga a nuestro destino.\n\nPodemos abandonarlo para prepararnos a cambiar de dirección, adelantar, parar o estacionar."}]}',
'{"blocks":[{"type":"callout","variant":"info","title":"При наличии разметки и нескольких полос в одном направлении","text":"Движемся по полосе, наиболее удобной для нашего маршрута.\n\nПокинуть её можно для подготовки к смене направления, обгону, остановке или парковке."}]}');

-- Step 7: Quiz 9f1fd15b — varios carriles urbano (correct idx 2)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 7, 'quiz',
'{"text":"En vía urbana con varios carriles para cada sentido, ¿por cuál de ellos circulará como norma general?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/9f1fd15b-cfd5-420f-b524-0259ee088540.webp","options":["Por el que más convenga a su destino, estén o no delimitados los carriles.","Por el carril de la derecha, siempre.","Por el que más convenga a su destino, cuando los carriles estén delimitados por marcas longitudinales."],"correct":2,"explanation":"La regla del carril más conveniente al destino sólo aplica dentro de poblado cuando los carriles están delimitados por marcas longitudinales. Sin marcas, hay que ir por el borde derecho."}',
'{"text":"По какой полосе, как правило, следует двигаться на городской дороге с несколькими полосами для каждого направления?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-003/9f1fd15b-cfd5-420f-b524-0259ee088540.webp","options":["По той, которая лучше всего подходит для пункта назначения, независимо от наличия разметки.","Всегда по правой полосе.","По той, которая лучше всего подходит для пункта назначения, при условии, что полосы обозначены продольной разметкой."],"correct":2,"explanation":"Правило «наиболее удобной полосы» в населённом пункте действует только при наличии продольной разметки. Без разметки нужно двигаться у правого края проезжей части."}');

-- Step 8: Quiz c213d7a1 — tres carriles, cuál usar (correct idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 8, 'quiz',
'{"text":"Esta vía urbana tiene tres carriles en cada sentido, ¿por cuál debe circular?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-015/c213d7a1-b7df-4218-bead-e309dcbb6aad_1768811328942.webp","options":["Por el carril derecho y por los otros sólo para adelantar.","Por el carril más adecuado para ir a mi destino.","Depende de la velocidad de mi vehículo."],"correct":1,"explanation":"En vía urbana con varios carriles por sentido delimitados por marcas, podemos elegir el carril más adecuado para llegar a nuestro destino."}',
'{"text":"На этой городской дороге три полосы движения в каждом направлении. По какой из них вы должны двигаться?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-015/c213d7a1-b7df-4218-bead-e309dcbb6aad_1768811328942.webp","options":["По правой полосе, а по другим — только для обгона.","По полосе, наиболее подходящей для движения к моему пункту назначения.","Это зависит от скорости моего транспортного средства."],"correct":1,"explanation":"На городской дороге с несколькими размеченными полосами в каждом направлении выбираем полосу, наиболее удобную для нашего маршрута."}');

-- Step 9: Quiz c50679d6 — ¿puede abandonar el carril más conveniente? (correct idx 2)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 9, 'quiz',
'{"text":"En una vía urbana, cuando utilice el carril que más convenga a su destino, ¿puede abandonar dicho carril?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-008/c50679d6-064d-4e69-b9a2-817ee9b3131a_1768734006552.webp","options":["Sí, pero sólo para cambiar de dirección.","No, en ningún caso.","Sí, para prepararse a cambiar de dirección, adelantar, parar o estacionar."],"correct":2,"explanation":"El carril elegido puede abandonarse para prepararse a cambiar de dirección, adelantar, parar o estacionar. No está prohibido cambiarse de carril."}',
'{"text":"В населённом пункте, если вы используете полосу, которая наиболее удобна для вашего направления, можно ли покидать эту полосу?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-008/c50679d6-064d-4e69-b9a2-817ee9b3131a_1768734006552.webp","options":["Да, но только для смены направления движения.","Нет, ни в коем случае.","Да, чтобы подготовиться к смене направления движения, опережению, остановке или парковке."],"correct":2,"explanation":"Выбранную полосу можно покинуть для подготовки к смене направления, обгону, остановке или парковке. Смена полосы не запрещена."}');

-- Step 10: Sin líneas o 1 carril → borde derecho (dentro de poblado)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 10, 'theory',
'{"blocks":[{"type":"callout","variant":"info","title":"Sin líneas separadoras o un solo carril por sentido","text":"Deberemos circular lo más cerca posible del borde derecho de la calzada."}]}',
'{"blocks":[{"type":"callout","variant":"info","title":"Без разметки или одна полоса в каждом направлении","text":"Необходимо двигаться как можно ближе к правому краю проезжей части."}]}');

-- Step 11: Quiz caacb2e2 — 1 carril/sentido urbano → borde derecho (correct idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 11, 'quiz',
'{"text":"En una vía urbana con un carril en cada sentido, deberá circular...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/caacb2e2-3dca-44dd-9aa2-6d714537b83f.webp","options":["lo más cerca posible del borde derecho de la calzada.","por la zona que mejor convenga.","por el centro de la calzada, en tramos rectos."],"correct":0,"explanation":"Cuando la vía urbana tiene un solo carril para cada sentido, la obligación es circular lo más cerca posible del borde derecho de la calzada."}',
'{"text":"На городской дороге с одной полосой движения в каждом направлении вы должны двигаться...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-002/caacb2e2-3dca-44dd-9aa2-6d714537b83f.webp","options":["как можно ближе к правому краю проезжей части.","там, где удобнее всего для вашего маршрута.","по центру проезжей части на прямых участках."],"correct":0,"explanation":"Когда в каждом направлении движения только одна полоса, необходимо двигаться как можно ближе к правому краю проезжей части."}');

-- Step 12: 1.5.2 Contar carriles sin marcas
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 12, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.2 ¿Cuántos carriles tiene una vía sin marcas?"},{"type":"callout","variant":"info","title":"Regla de conteo","text":"En una vía hay tantos carriles como filas de vehículos (que no sean motocicletas) quepan uno al lado del otro."},{"type":"callout","variant":"tip","title":"Ejemplo","text":"Si caben dos turismos uno al lado del otro → la vía tiene 2 carriles."}]}',
'{"blocks":[{"type":"heading","text":"1.5.2 Сколько полос у дороги без разметки?"},{"type":"callout","variant":"info","title":"Правило подсчёта","text":"На дороге столько полос, сколько рядов транспортных средств (не считая мотоциклов) могут разместиться рядом."},{"type":"callout","variant":"tip","title":"Пример","text":"Если рядом помещаются два легковых автомобиля → дорога имеет 2 полосы."}]}');

-- Step 13: 1.5.3 Sin líneas que separen los sentidos
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 13, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.3 Sin líneas que separen los sentidos"},{"type":"callout","variant":"danger","title":"Regla clave","text":"Tanto dentro como fuera de poblado, si no hay líneas que separen los sentidos de circulación, se circulará por la derecha de la calzada, lo más cerca posible del borde.\n\nHay que dejar completamente libre la mitad correspondiente al sentido contrario."}]}',
'{"blocks":[{"type":"heading","text":"1.5.3 Нет разметки, разделяющей направления"},{"type":"callout","variant":"danger","title":"Ключевое правило","text":"Как внутри, так и вне населённого пункта, если нет разметки, разделяющей направления движения, следует двигаться по правой стороне проезжей части, как можно ближе к её краю.\n\nПоловина проезжей части для встречного направления должна быть полностью свободна."}]}');

-- Step 14: Quiz 390f07a2 — sentido único sin marcas → carril derecho (correct idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 14, 'quiz',
'{"text":"En una vía urbana de sentido único, si los carriles no están delimitados por marcas viales, ¿por dónde está obligado a circular el conductor de un turismo?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/390f07a2-ed61-4deb-93e2-5edff9d2c26a_1768753725097.webp","options":["Por el carril derecho, pudiendo utilizar el resto cuando las circunstancias lo aconsejen.","Por el carril que mejor convenga a su destino.","Por el centro de la calzada."],"correct":0,"explanation":"Sin marcas que delimiten los carriles, incluso en sentido único, el conductor está obligado a circular por el carril derecho. Los demás carriles se pueden usar cuando las circunstancias lo aconsejen."}',
'{"text":"На городской дороге с односторонним движением, если полосы движения не размечены, где обязан двигаться водитель легкового автомобиля?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-012/390f07a2-ed61-4deb-93e2-5edff9d2c26a_1768753725097.webp","options":["По правой полосе, имея возможность использовать остальные, когда этого требуют обстоятельства.","По полосе, которая лучше всего подходит для вашего направления.","По центру проезжей части."],"correct":0,"explanation":"При отсутствии разметки полос на дороге с односторонним движением водитель обязан двигаться по правой полосе. Остальные можно использовать, когда того требуют обстоятельства."}');

END $$;
