-- Update boost names and descriptions for human readability
UPDATE public.boost_definitions SET 
    name_ru = 'Скремблер', 
    description_ru = 'Накладывает цифровые помехи на экран соперника, мешая читать вопрос.',
    name_en = 'Screen Scrambler',
    description_en = 'Injects digital noise onto the opponent''s screen, making it hard to read.',
    name_es = 'Codificador',
    description_es = 'Inyecta ruido digital en la pantalla del oponente, dificultando la lectura.'
WHERE type = 'screen_injector';

UPDATE public.boost_definitions SET 
    name_ru = 'Спуфинг кнопок', 
    description_ru = 'Перемешивает местами варианты ответов на устройстве соперника.',
    name_en = 'Button Spoofing',
    description_en = 'Shuffles the positions of answer options on the opponent''s device.',
    name_es = 'Suplantación de Botones',
    description_es = 'Baraja las posiciones de las opciones de respuesta en el dispositivo del oponente.'
WHERE type = 'gps_spoofing';

UPDATE public.boost_definitions SET 
    name_ru = 'Инпут-лаг', 
    description_ru = 'Добавляет задержку между нажатием кнопки и срабатыванием ответа у соперника.',
    name_en = 'Input Lag',
    description_en = 'Adds a delay between pressing a button and the answer being registered for the opponent.',
    name_es = 'Retraso de Entrada',
    description_es = 'Añade un retraso entre presionar un botón y que se registre la respuesta para el oponente.'
WHERE type = 'input_lag';

UPDATE public.boost_definitions SET 
    name_ru = 'Бэкдор', 
    description_ru = 'Взламывает систему и подсвечивает один гарантированно верный ответ.',
    name_en = 'Backdoor',
    description_en = 'Hacks the system and highlights one guaranteed correct answer.',
    name_es = 'Puerta Trasera',
    description_es = 'Hackea el sistema и resalta una respuesta garantizada correcta.'
WHERE type = 'police_backdoor';

UPDATE public.boost_definitions SET 
    name_ru = 'Файервол', 
    description_ru = 'Автоматически блокирует и отражает следующую атаку соперника.',
    name_en = 'Firewall',
    description_en = 'Automatically blocks and reflects the next attack from the opponent.',
    name_es = 'Cortafuegos',
    description_es = 'Bloquea и refleja automáticamente el siguiente ataque del oponente.'
WHERE type = 'firewall';

UPDATE public.boost_definitions SET 
    name_ru = 'Криптолокер', 
    description_ru = 'Зашифровывает вопрос соперника. Нужно "протереть" экран, чтобы снять шифр.',
    name_en = 'Cryptolocker',
    description_en = 'Encrypts the opponent''s question. They must "wipe" the screen to decrypt.',
    name_es = 'Criptolocker',
    description_es = 'Encritpta la pregunta del oponente. Debe "limpiar" la pantalla para descifrar.'
WHERE type = 'cryptolocker';
