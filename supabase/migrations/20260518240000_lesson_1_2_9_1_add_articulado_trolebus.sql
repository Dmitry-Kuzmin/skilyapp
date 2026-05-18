-- Lección 1.2.9.1 — añadir step 11: autobús articulado y trolebús
-- Lesson id: d734c0f3-c76a-4566-a2ef-03b4b5ceb62e

DO $$
DECLARE
  l_id uuid := 'd734c0f3-c76a-4566-a2ef-03b4b5ceb62e';
BEGIN

  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 11, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Autobús articulado (R.G.C.)","text":"El compuesto por dos secciones rígidas unidas por otra articulada que las comunica."},
      {"type":"callout","variant":"info","title":"Trolebús (R.G.C.)","text":"Automóvil destinado al transporte de personas con capacidad para 10 o más plazas, incluido el conductor, accionado por motor eléctrico con toma de corriente por trole, que circula sin carriles."},
      {"type":"callout","variant":"warning","text":"El trolebús NO circula por carriles (como el tren o el tranvía) — circula libremente por la calzada como un autobús normal, pero se alimenta de electricidad mediante los cables aéreos (trole)."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Сочленённый автобус — autobús articulado (R.G.C.)","text":"Автобус, состоящий из двух жёстких секций, соединённых между собой гибким сочленением, обеспечивающим проход между ними."},
      {"type":"callout","variant":"info","title":"Троллейбус — trolebús (R.G.C.)","text":"Автомобиль для перевозки людей вместимостью 10 и более мест, включая водителя, приводимый электрическим двигателем с токосъёмом через штангу (трол), движущийся без рельсов."},
      {"type":"callout","variant":"warning","text":"Троллейбус НЕ движется по рельсам (в отличие от трамвая или поезда) — он свободно едет по дороге как обычный автобус, но питается от электричества через воздушные провода (штангу)."}
    ]}'
  );

END $$;
