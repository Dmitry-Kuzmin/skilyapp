DO $$ DECLARE
  mod_id uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id   uuid;
BEGIN

INSERT INTO course_lessons (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
VALUES (
  mod_id,
  '1.5.8',
  'Glorietas: circulación y preferencia',
  'Кольцевые перекрёстки: движение и приоритет',
  29, 40, false
)
RETURNING id INTO l_id;

-- Step 1: Heading
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 1, 'theory',
'{"blocks":[{"type":"heading","text":"1.5.8 ¿Qué es una glorieta?"}]}',
'{"blocks":[{"type":"heading","text":"1.5.8 Что такое кольцевой перекрёсток?"}]}');

-- Step 2: Definición y reglas básicas
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 2, 'theory',
'{"blocks":[{"type":"callout","variant":"info","title":"Definición","text":"Una glorieta es una intersección con circulación giratoria. Se debe circular dejando el centro de la glorieta a la IZQUIERDA de nuestro vehículo."},{"type":"callout","variant":"danger","title":"Preferencia","text":"Tienen preferencia los vehículos que ya circulan dentro de la glorieta. Los que quieren entrar deben ceder el paso."},{"type":"callout","variant":"tip","title":"Para abandonar la glorieta","text":"Nos situaremos en el carril DERECHO antes de la salida."}]}',
'{"blocks":[{"type":"callout","variant":"info","title":"Определение","text":"Кольцевой перекрёсток — это пересечение с круговым движением. Необходимо двигаться, оставляя центр кольца СЛЕВА от своего транспортного средства."},{"type":"callout","variant":"danger","title":"Приоритет","text":"Преимущество имеют транспортные средства, уже движущиеся по кольцу. Въезжающие обязаны уступить дорогу."},{"type":"callout","variant":"tip","title":"Чтобы покинуть кольцо","text":"Перед съездом занимаем ПРАВУЮ полосу."}]}');

-- Step 3: Quiz 65645c68 — ¿por dónde circular en glorieta? → derecha, centro a izq (idx 2)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 3, 'quiz',
'{"text":"En una glorieta, ¿por dónde se debe circular?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-011/65645c68-586d-4de6-9216-a3e6dda3bdba_1768743160154.webp","options":["Por la izquierda, dejando a mi derecha el centro de la glorieta.","Puedo circular por la derecha o por la izquierda indistintamente.","Por la derecha, dejando a mi izquierda el centro de la glorieta."],"correct":2,"explanation":"En toda glorieta el sentido de circulación es antihorario: siempre por la derecha, dejando el centro de la glorieta a nuestra izquierda."}',
'{"text":"На круговом движении (Glorieta), в каком направлении следует двигаться?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-011/65645c68-586d-4de6-9216-a3e6dda3bdba_1768743160154.webp","options":["Слева, оставляя центр кругового движения справа от себя.","Можно двигаться как справа, так и слева без разницы.","Справа, оставляя центр кругового движения слева от себя."],"correct":2,"explanation":"На любом кольцевом перекрёстке движение против часовой стрелки: всегда вправо, оставляя центр кольца слева."}');

-- Step 4: Quiz 3f8719f5 — glorietas dejar centro → a la izquierda (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 4, 'quiz',
'{"text":"En las glorietas se circulará dejando el centro...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-004/3f8719f5-1d63-4fa6-890c-97bd8151cecc_1768932423334_pro.webp","options":["a la izquierda.","a la derecha.","a la izquierda o a la derecha, es indistinto."],"correct":0,"explanation":"En las glorietas siempre se deja el centro a la izquierda, lo que hace que la circulación sea en sentido antihorario."}',
'{"text":"При движении по круговому перекрестку (glorieta) центр должен оставаться...","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-004/3f8719f5-1d63-4fa6-890c-97bd8151cecc_1768932423334_pro.webp","options":["слева.","справа.","слева или справа, это безразлично."],"correct":0,"explanation":"На кольцевых перекрёстках центр всегда остаётся слева, что обеспечивает движение против часовой стрелки."}');

-- Step 5: Preferencia y salida
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 5, 'theory',
'{"blocks":[{"type":"heading","text":"Preferencia en la glorieta y cómo salir"},{"type":"callout","variant":"info","title":"Circulación por carriles dentro de la glorieta","text":"Las glorietas siguen las mismas reglas de carril que cualquier otra vía:\n\n• Fuera de poblado: carril de la derecha como norma general.\n• Dentro de poblado con marcas: carril más conveniente al destino.\n• Sin marcas: lo más cerca posible del borde derecho."}]}',
'{"blocks":[{"type":"heading","text":"Приоритет на кольце и выезд"},{"type":"callout","variant":"info","title":"Движение по полосам внутри кольца","text":"На кольцевых перекрёстках действуют те же правила выбора полосы:\n\n• Вне населённого пункта: как правило, правая полоса.\n• Внутри населённого пункта с разметкой: полоса, удобная для маршрута.\n• Без разметки: как можно ближе к правому краю."}]}');

-- Step 6: Quiz ac59b189 — se acerca sin señales → ceder a dentro (idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 6, 'quiz',
'{"text":"Se acerca a una glorieta, no hay señales de preferencia. ¿A qué vehículos debe ceder el paso?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-013/ac59b189-de33-4a12-a187-aa6cee6b5a0c_1768755270534.webp","options":["A ninguno, porque yo circulo por la vía principal.","A los que circulan dentro de la glorieta.","A los que quieran acceder a la glorieta por la vía de la derecha."],"correct":1,"explanation":"En las glorietas siempre ceden el paso los que quieren entrar. Los vehículos que ya circulan dentro tienen preferencia, independientemente de señalización."}',
'{"text":"Вы приближаетесь к круговому движению, знаков приоритета нет. Кому вы должны уступить дорогу?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-013/ac59b189-de33-4a12-a187-aa6cee6b5a0c_1768755270534.webp","options":["Никому, потому что я еду по главной дороге.","Тем, кто движется по кольцу.","Тем, кто хочет въехать на кольцо справа."],"correct":1,"explanation":"На кольцевых перекрёстках уступают дорогу всегда въезжающие. Транспортные средства, уже движущиеся по кольцу, имеют преимущество независимо от наличия знаков."}');

-- Step 7: Quiz c7d27c6f — señal ceda → vehículo dentro (idx 0)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 7, 'quiz',
'{"text":"En una glorieta regulada exclusivamente por esta señal, ¿quién tiene prioridad de paso?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/c7d27c6f-4e4f-4b8d-a775-9d770b1075fc.webp","options":["El vehículo que se encuentra dentro de la calzada circular.","El vehículo que pretende acceder a la glorieta.","Siempre el vehículo que tenga libre su derecha."],"correct":0,"explanation":"La señal de ceda el paso a la entrada de la glorieta confirma que quien circula dentro tiene prioridad. El que entra siempre cede."}',
'{"text":"Кто имеет преимущество проезда на круговом движении (Glorieta), регулируемом исключительно этим знаком?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-005/c7d27c6f-4e4f-4b8d-a775-9d770b1075fc.webp","options":["Транспортное средство, находящееся на кольцевой проезжей части.","Транспортное средство, намеревающееся въехать на круговое движение.","Всегда транспортное средство, у которого свободна правая сторона."],"correct":0,"explanation":"Знак «Уступи дорогу» при въезде на кольцо подтверждает: преимущество у тех, кто уже движется по кольцу. Въезжающий всегда уступает."}');

-- Step 8: Quiz 3184585c — abandonar glorieta 3 carriles → carril derecho (idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 8, 'quiz',
'{"text":"Un conductor que circula por una glorieta con tres carriles de circulación, ¿dónde debe situarse para abandonarla?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-010/3184585c-9158-4eab-8380-254e248a4db7_1768739700136.webp","options":["En el carril central.","En el carril derecho.","En cualquier carril, aunque corte la trayectoria a otros usuarios."],"correct":1,"explanation":"Para abandonar la glorieta siempre hay que situarse en el carril derecho antes de la salida, independientemente del número de carriles que tenga la glorieta."}',
'{"text":"Водитель, движущийся по круговому движению с тремя полосами движения, где должен находиться, чтобы покинуть его?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-010/3184585c-9158-4eab-8380-254e248a4db7_1768739700136.webp","options":["На центральной полосе.","На правой полосе.","На любой полосе, даже если это преграждает путь другим участникам."],"correct":1,"explanation":"Для выезда с кольца всегда нужно заранее занять правую полосу, независимо от количества полос на кольце."}');

-- Step 9: Adelantamiento en glorieta
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 9, 'theory',
'{"blocks":[{"type":"callout","variant":"info","title":"Adelantar en la glorieta","text":"En las glorietas está permitido adelantar, siguiendo las mismas reglas de adelantamiento que en cualquier otra vía."},{"type":"callout","variant":"warning","title":"Preferencia al salir","text":"Al salir de la glorieta, la preferencia siempre es del vehículo que circule por el carril de la derecha."}]}',
'{"blocks":[{"type":"callout","variant":"info","title":"Обгон на кольце","text":"На кольцевых перекрёстках обгон разрешён по тем же правилам, что и на любой другой дороге."},{"type":"callout","variant":"warning","title":"Приоритет при выезде","text":"При выезде с кольца приоритет всегда у транспортного средства, движущегося по правой полосе."}]}');

-- Step 10: Quiz acd3ec1e — ¿adelantar en glorieta? → Sí (idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 10, 'quiz',
'{"text":"¿Está permitido adelantar en una glorieta?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-001/acd3ec1e-490f-4909-895a-735577e5b259_1768681482055.webp","options":["No.","Sí.","Sí, pero solo por el carril derecho."],"correct":1,"explanation":"Adelantar en una glorieta está permitido, aplicando las normas generales de adelantamiento. El hecho de ser una intersección no lo prohíbe."}',
'{"text":"Разрешен ли обгон (опережение) на перекрестке с круговым движением?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-02_test-001/acd3ec1e-490f-4909-895a-735577e5b259_1768681482055.webp","options":["Нет.","Да.","Да, но только по правой полосе."],"correct":1,"explanation":"Обгон на кольцевом перекрёстке разрешён по общим правилам обгона. Сам факт того, что это перекрёсток, не запрещает его."}');

-- Step 11: Trampa — intersección giratoria ≠ glorieta
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 11, 'theory',
'{"blocks":[{"type":"callout","variant":"danger","title":"¡Trampa del examen! Intersección giratoria ≠ Glorieta","text":"Una intersección con circulación giratoria que NO tiene señal de glorieta (ceda el paso a la entrada) sigue la regla normal: ceder el paso a los vehículos que vengan por la DERECHA.\n\nEn la glorieta oficial → ceden los que entran (a los de dentro).\nEn intersección giratoria sin señal → cedes a los de la derecha."}]}',
'{"blocks":[{"type":"callout","variant":"danger","title":"Ловушка экзамена! Круговой перекрёсток ≠ Кольцо","text":"Перекрёсток с круговым движением, у которого НЕТ знака кольцевого перекрёстка (уступи дорогу при въезде), работает по обычному правилу: уступи тем, кто едет справа.\n\nОфициальное кольцо → уступают въезжающие (тем, кто на кольце).\nКруговой перекрёсток без знака → уступаешь тем, кто справа."}]}');

-- Step 12: Quiz b7f9c477 — intersección giratoria no glorieta → ceder a derecha (idx 1)
INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru) VALUES (l_id, 12, 'quiz',
'{"text":"En esta intersección con circulación giratoria, que no es glorieta, ¿a qué vehículos debe ceder el paso?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-015/b7f9c477-563d-45aa-a21d-f75d67769d4e_1768761012611.webp","options":["A los que entren por la izquierda.","A los que entren por la derecha.","A los que están girando alrededor de la isleta."],"correct":1,"explanation":"Al no ser una glorieta oficial, no rige la prioridad de los vehículos que circulan dentro. Se aplica la regla general: ceder el paso a los que vienen por la derecha."}',
'{"text":"На этом перекрестке с круговым движением, который не является кольцом, каким транспортным средствам вы должны уступить дорогу?","image_url":"https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/dgt-images/generated/topic-01_test-015/b7f9c477-563d-45aa-a21d-f75d67769d4e_1768761012611.webp","options":["Тем, кто въезжает слева.","Тем, кто въезжает справа.","Тем, кто движется по кругу."],"correct":1,"explanation":"Поскольку это не официальное кольцо, правило приоритета движущихся по кольцу не действует. Применяется общее правило: уступи тем, кто едет справа."}');

END $$;
