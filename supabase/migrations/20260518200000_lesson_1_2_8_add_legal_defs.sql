-- Lección 1.2.8 — agregar definiciones legales de Todoterreno y Autocaravana
-- Lesson id: f32db36c-735e-4b32-af95-fb4d08ba0053
-- Insertar nuevo step 3 (definiciones del R.G.C.) y desplazar steps 3-12 → 4-13

DO $$
DECLARE
  l_id uuid := 'f32db36c-735e-4b32-af95-fb4d08ba0053';
BEGIN

  -- 1. Desplazar steps existentes desde order_index 3 en adelante
  UPDATE lesson_steps
  SET order_index = order_index + 1
  WHERE lesson_id = l_id AND order_index >= 3;

  -- 2. Insertar nuevo step 3 con las definiciones legales del R.G.C.
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Vehículo todoterreno (R.G.C.)","text":"Automóvil dotado de tracción integral, en los dos ejes, utilizado en terrenos con poco agarre como barro, nieve, tierra."},
      {"type":"callout","variant":"info","title":"Autocaravana (R.G.C.)","text":"Vehículo construido con propósito especial, incluyendo alojamiento vivienda y conteniendo, al menos, el equipo siguiente: asientos y mesa, camas o literas que puedan ser convertidos en asientos, cocina y armarios o similares. Este equipo estará rígidamente fijado al compartimento vivienda; los asientos y la mesa podrán ser de diseño desmontable."},
      {"type":"callout","variant":"warning","text":"¡Ojo al examen! El todoterreno tiene tracción INTEGRAL en los DOS ejes — no solo en uno. Una pregunta clásica intenta confundir con tracción delantera o trasera solamente."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Внедорожник — todoterreno (R.G.C.)","text":"Автомобиль с полным приводом на оба моста, используемый на покрытиях с плохим сцеплением, таких как грязь, снег, грунт."},
      {"type":"callout","variant":"info","title":"Автодом — autocaravana (R.G.C.)","text":"Транспортное средство, построенное для специальной цели, включающее жилое пространство и содержащее как минимум следующее оборудование: сиденья и стол, кровати или спальные полки, которые могут быть преобразованы в сиденья, кухню и шкафы или аналогичное. Это оборудование будет жёстко закреплено в жилом отсеке; сиденья и стол могут быть съёмными."},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! У внедорожника полный привод на ОБА моста — не только на один. Классический вопрос-ловушка пытается запутать с передним или задним приводом."}
    ]}'
  );

END $$;
