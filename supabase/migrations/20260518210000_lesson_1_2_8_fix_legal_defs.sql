-- Lección 1.2.8 — actualizar step 3: corregir autocaravana + añadir pick-up y autoturismo
-- Lesson id: f32db36c-735e-4b32-af95-fb4d08ba0053
-- Step order_index: 3

DO $$
DECLARE
  l_id uuid := 'f32db36c-735e-4b32-af95-fb4d08ba0053';
BEGIN

  UPDATE lesson_steps
  SET
    content_es = '{"blocks":[
      {"type":"callout","variant":"info","title":"Vehículo todoterreno (R.G.C.)","text":"Automóvil dotado de tracción integral, en los dos ejes, utilizado en terrenos con poco agarre como barro, nieve, tierra."},
      {"type":"callout","variant":"info","title":"Autocaravana (R.G.C.)","text":"Vehículo construido con propósito especial, incluyendo alojamiento vivienda y conteniendo, al menos, el equipo siguiente: asientos y mesa, camas o literas que puedan ser convertidos en asientos, cocina y armarios o similares. Este equipo estará rígidamente fijado al compartimento vivienda; los asientos y la mesa pueden ser diseñados para ser desmontados fácilmente."},
      {"type":"callout","variant":"info","title":"Pick-up (R.G.C.)","text":"Vehículo automóvil con cabina cerrada para el conductor y, en su caso, pasajeros, y plataforma posterior abierta para el transporte de carga, separada de la cabina por una pared fija."},
      {"type":"callout","variant":"info","title":"Autoturismo (R.G.C.)","text":"Término equivalente a turismo. Automóvil concebido y construido principalmente para el transporte de personas y su equipaje, con un máximo de ocho plazas de asiento además del asiento del conductor."},
      {"type":"callout","variant":"warning","text":"¡Ojo al examen! El todoterreno tiene tracción INTEGRAL en los DOS ejes. El pick-up tiene plataforma ABIERTA en la parte posterior. La autocaravana tiene el equipo de vivienda RÍGIDAMENTE FIJADO (aunque asientos y mesa puedan desmontarse)."}
    ]}',
    content_ru = '{"blocks":[
      {"type":"callout","variant":"info","title":"Внедорожник — todoterreno (R.G.C.)","text":"Автомобиль с полным приводом на оба моста, используемый на покрытиях с плохим сцеплением, таких как грязь, снег, грунт."},
      {"type":"callout","variant":"info","title":"Автодом — autocaravana (R.G.C.)","text":"Транспортное средство, построенное для специальной цели, включающее жилое пространство и содержащее как минимум следующее оборудование: сиденья и стол, кровати или спальные полки, которые могут быть преобразованы в сиденья, кухню и шкафы или аналогичное. Это оборудование будет жёстко закреплено в жилом отсеке; сиденья и стол могут быть спроектированы для лёгкого демонтажа."},
      {"type":"callout","variant":"info","title":"Пикап — pick-up (R.G.C.)","text":"Автомобиль с закрытой кабиной для водителя и при необходимости пассажиров, и открытой грузовой платформой в задней части, отделённой от кабины неподвижной перегородкой."},
      {"type":"callout","variant":"info","title":"Автотуризм — autoturismo (R.G.C.)","text":"Термин, эквивалентный ''turismo'' (легковому автомобилю). Автомобиль, разработанный и построенный преимущественно для перевозки людей и их багажа, с максимальным числом мест восемь, не считая водительского."},
      {"type":"callout","variant":"warning","text":"Внимание на экзамене! У внедорожника полный привод на ОБА моста. У пикапа — ОТКРЫТАЯ платформа сзади. У автодома оборудование жилого отсека ЖЁСТКО ЗАКРЕПЛЕНО (хотя сиденья и стол могут сниматься)."}
    ]}'
  WHERE lesson_id = l_id AND order_index = 3;

END $$;
