-- Course schema for DGT step-by-step course (Duolingo-style)

-- =====================
-- TABLES
-- =====================

CREATE TABLE course_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number       INT  NOT NULL UNIQUE,
  slug         TEXT NOT NULL UNIQUE,
  title_es     TEXT NOT NULL,
  title_ru     TEXT NOT NULL,
  description_es TEXT,
  description_ru TEXT,
  emoji        TEXT NOT NULL DEFAULT '📚',
  order_index  INT  NOT NULL,
  is_premium   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  code         TEXT,             -- "1.1", "2.5.3", etc.
  title_es     TEXT NOT NULL,
  title_ru     TEXT NOT NULL,
  order_index  INT  NOT NULL,
  xp_reward    INT  NOT NULL DEFAULT 10,
  is_premium   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lesson_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  order_index  INT  NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('theory', 'quiz', 'flashcard')),
  content_es   JSONB NOT NULL DEFAULT '{}',
  content_ru   JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_lesson_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  score        INT DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX course_lessons_module_id_idx ON course_lessons (module_id, order_index);
CREATE INDEX user_lesson_progress_user_id_idx ON user_lesson_progress (user_id);
CREATE INDEX lesson_steps_lesson_id_idx ON lesson_steps (lesson_id, order_index);

-- =====================
-- RLS
-- =====================

ALTER TABLE course_modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_steps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lesson_progress   ENABLE ROW LEVEL SECURITY;

-- Public read for course content
CREATE POLICY "Public read course_modules"
  ON course_modules FOR SELECT USING (true);

CREATE POLICY "Public read course_lessons"
  ON course_lessons FOR SELECT USING (true);

CREATE POLICY "Public read lesson_steps"
  ON lesson_steps FOR SELECT USING (true);

-- User progress: own rows only
CREATE POLICY "Users read own lesson progress"
  ON user_lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lesson progress"
  ON user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own lesson progress"
  ON user_lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================
-- SEED: 10 modules
-- =====================

INSERT INTO course_modules (number, slug, title_es, title_ru, description_es, description_ru, emoji, order_index) VALUES
(1,  'definiciones-vias',        'Definiciones y uso de las vías',         'Определения и дороги',          'Tipos de vehículos, partes de la vía y normas generales de circulación', 'Типы ТС, части дороги, правила движения', '🛣️', 1),
(2,  'maniobras',                'Maniobras',                              'Манёвры',                       'Adelantamiento, cambios de dirección, parada y estacionamiento',         'Обгон, смена направления, остановка и парковка', '🚗', 2),
(3,  'senales',                  'Señales',                                'Знаки и сигналы',               'Señales de tráfico, semáforos, marcas viales y agentes',                 'Дорожные знаки, светофоры, разметка', '🚦', 3),
(4,  'alumbrado',                'Alumbrado',                              'Освещение',                     'Tipos de luces del vehículo y cuándo utilizarlas',                       'Виды фар и когда их использовать', '💡', 4),
(5,  'uso-vehiculo',             'El uso del vehículo',                    'Использование ТС',              'Ocupantes, cinturón de seguridad, niños y transporte de carga',           'Пассажиры, ремни, детские кресла, перевозка грузов', '🪑', 5),
(6,  'documentacion',            'Documentación',                          'Документация',                  'Permisos de conducción, documentos del vehículo e infracciones',         'Права, документы на авто, нарушения', '📄', 6),
(7,  'accidentes',               'Los accidentes',                         'Аварии',                        'Causas, factores de riesgo, alcohol y usuarios vulnerables',             'Причины, факторы риска, алкоголь, уязвимые участники', '⚠️', 7),
(8,  'comportamiento-accidente', 'Comportamiento en caso de accidente',    'Действия при аварии',           'Primeros auxilios y pasos a seguir en un accidente',                     'Первая помощь и порядок действий при ДТП', '🚑', 8),
(9,  'mecanica',                 'Mecánica y mantenimiento del vehículo',  'Механика и обслуживание',       'Aceite, filtros, neumáticos, sistema eléctrico y más',                   'Масло, фильтры, шины, электросистема и другое', '🔧', 9),
(10, 'tecnicas-conduccion',      'Tipos y técnicas de conducción',         'Техники вождения',              'Conducción preventiva, eficiente y zonas de bajas emisiones',            'Превентивное и эффективное вождение, экозоны', '🏎️', 10);
