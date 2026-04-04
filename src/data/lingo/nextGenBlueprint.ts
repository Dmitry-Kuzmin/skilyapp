export interface LingoExperiencePillar {
  title: string;
  description: string;
  accent: string;
}

export interface LingoNextLessonDraft {
  title: string;
  focus: string;
}

export interface LingoNextModule {
  id: string;
  phase: string;
  emoji: string;
  title: string;
  subtitle: string;
  targetTerms: number;
  outcome: string;
  accentFrom: string;
  accentTo: string;
  lessons: LingoNextLessonDraft[];
}

export const LINGO_VERIFIED_TERM_TOTAL = 558;
export const LINGO_NEXT_GEN_MODULES_TOTAL = 10;
export const LINGO_NEXT_GEN_LESSONS_TOTAL = 30;

export const LINGO_EXPERIENCE_PILLARS: LingoExperiencePillar[] = [
  {
    title: 'Scenario-first',
    description: 'Каждый блок начинается с живой дорожной сцены, а не со скучного списка слов.',
    accent: 'from-amber-300 to-orange-500',
  },
  {
    title: 'Exam decoder',
    description: 'Курс учит распознавать язык формулировок DGT и скрытые ловушки в вопросах.',
    accent: 'from-sky-300 to-cyan-500',
  },
  {
    title: 'Micro mastery',
    description: 'Термины разбиваются на короткие кластеры по смыслу, чтобы не перегружать память.',
    accent: 'from-emerald-300 to-teal-500',
  },
  {
    title: 'Momentum design',
    description: 'Прогресс, серии, уровни уверенности и быстрые победы удерживают темп без усталости.',
    accent: 'from-rose-300 to-red-500',
  },
];

export const LINGO_NEXT_GEN_MODULES: LingoNextModule[] = [
  {
    id: 'road-language',
    phase: 'Phase 01 · Base',
    emoji: '🛣️',
    title: 'Дороги, участники и геометрия',
    subtitle: 'Словарь дороги, полос, пересечений и ролей на дороге.',
    targetTerms: 72,
    outcome: 'Студент свободно понимает базовую лексику любой дорожной сцены.',
    accentFrom: 'from-sky-500/20',
    accentTo: 'to-cyan-500/10',
    lessons: [
      { title: 'Типы дорог и зон', focus: 'autopista, autovía, travesía, vía urbana' },
      { title: 'Полосы, обочины, пересечения', focus: 'carril, arcén, cruce, glorieta' },
      { title: 'Участники движения', focus: 'peatón, conductor, ciclista, autobús' },
    ],
  },
  {
    id: 'maneuvers',
    phase: 'Phase 01 · Base',
    emoji: '🔁',
    title: 'Манёвры и смена траектории',
    subtitle: 'Всё, что связано с перестроением, поворотом и включением в поток.',
    targetTerms: 64,
    outcome: 'Студент читает глаголы действий так же быстро, как дорожные знаки.',
    accentFrom: 'from-teal-500/20',
    accentTo: 'to-emerald-500/10',
    lessons: [
      { title: 'Начало движения и перестроение', focus: 'incorporarse, cambiar de carril, señalizar' },
      { title: 'Повороты и разворот', focus: 'girar, cambio de sentido, extremo derecho' },
      { title: 'Обгон и объезд', focus: 'adelantar, rebasar, mantener distancia' },
    ],
  },
  {
    id: 'signals',
    phase: 'Phase 02 · Navigation',
    emoji: '🚦',
    title: 'Знаки, сигналы и приоритет',
    subtitle: 'Самый важный слой для быстрой интерпретации вопросов DGT.',
    targetTerms: 78,
    outcome: 'Студент мгновенно отличает запрет, обязанность, предупреждение и приоритет.',
    accentFrom: 'from-amber-500/20',
    accentTo: 'to-yellow-500/10',
    lessons: [
      { title: 'Запрещающие и предписывающие знаки', focus: 'prohibición, obligación, dirección obligatoria' },
      { title: 'Светофоры и сигналы агентов', focus: 'semáforo, prioridad, detenerse' },
      { title: 'Приоритет и конфликт сигналов', focus: 'ceda el paso, stop, preferencia' },
    ],
  },
  {
    id: 'lighting',
    phase: 'Phase 02 · Navigation',
    emoji: '💡',
    title: 'Освещение и видимость',
    subtitle: 'Фары, режимы света и словарь ситуаций ограниченной видимости.',
    targetTerms: 42,
    outcome: 'Студент уверенно различает режимы освещения и когда каждый обязателен.',
    accentFrom: 'from-indigo-500/20',
    accentTo: 'to-sky-500/10',
    lessons: [
      { title: 'Основные огни автомобиля', focus: 'luz de cruce, luz larga, posición' },
      { title: 'Ночь, дождь, туман', focus: 'visibilidad reducida, alumbrado obligatorio' },
      { title: 'Ошибки и ограничения', focus: 'deslumbramiento, emergencia, estacionamiento' },
    ],
  },
  {
    id: 'vehicle-use',
    phase: 'Phase 03 · Safety',
    emoji: '👨‍👩‍👧',
    title: 'Использование ТС и пассажиры',
    subtitle: 'Ремни, дети, шлемы, перевозка и безопасное поведение в машине.',
    targetTerms: 46,
    outcome: 'Студент видит ответственность водителя не по теме, а по реальным ситуациям.',
    accentFrom: 'from-emerald-500/20',
    accentTo: 'to-lime-500/10',
    lessons: [
      { title: 'Ремни и удерживающие системы', focus: 'cinturón, SRI, plaza trasera' },
      { title: 'Пассажиры и исключения', focus: 'ocupantes, casco, motocicleta' },
      { title: 'Груз и размещение', focus: 'carga, descarga, visibilidad' },
    ],
  },
  {
    id: 'docs',
    phase: 'Phase 03 · Safety',
    emoji: '📄',
    title: 'Документы, права и разрешения',
    subtitle: 'Термины, без которых вопросы про законность и категории не читаются.',
    targetTerms: 38,
    outcome: 'Студент спокойно различает permiso, licencia, ITV, seguro и категории.',
    accentFrom: 'from-cyan-500/20',
    accentTo: 'to-blue-500/10',
    lessons: [
      { title: 'Разрешения и категории', focus: 'permiso, licencia, AM, A1, B' },
      { title: 'Документы на машину', focus: 'permiso de circulación, ficha técnica' },
      { title: 'ITV, seguro и контроль', focus: 'inspección, obligatorio, sanción' },
    ],
  },
  {
    id: 'accidents',
    phase: 'Phase 04 · Exam readiness',
    emoji: '⚠️',
    title: 'Риски, аварии и факторы ДТП',
    subtitle: 'Лексика причин аварий и типовых опасных сценариев.',
    targetTerms: 48,
    outcome: 'Студент понимает не только термин, но и поведенческую логику вопроса.',
    accentFrom: 'from-rose-500/20',
    accentTo: 'to-red-500/10',
    lessons: [
      { title: 'Причины аварий', focus: 'fatiga, alcohol, velocidad, distracción' },
      { title: 'Опасные условия', focus: 'lluvia, neblina, adherencia, distancia' },
      { title: 'Последствия и профилактика', focus: 'riesgo, impacto, prevención' },
    ],
  },
  {
    id: 'emergency',
    phase: 'Phase 04 · Exam readiness',
    emoji: '🚑',
    title: 'Действия при аварии и первая помощь',
    subtitle: 'Алгоритм PAS, вызов помощи и базовая первая помощь.',
    targetTerms: 54,
    outcome: 'Студент быстро считывает алгоритмы действий под стрессом.',
    accentFrom: 'from-orange-500/20',
    accentTo: 'to-rose-500/10',
    lessons: [
      { title: 'Алгоритм PAS', focus: 'proteger, avisar, socorrer' },
      { title: 'Аварийная остановка и сигнализация', focus: 'triángulo, chaleco, e-Call' },
      { title: 'Первая помощь', focus: 'RCP, hemorragia, posición lateral' },
    ],
  },
  {
    id: 'mechanics',
    phase: 'Phase 04 · Exam readiness',
    emoji: '🔧',
    title: 'Механика и обслуживание',
    subtitle: 'Самый объёмный модуль: детали автомобиля, жидкости, контроль и уход.',
    targetTerms: 86,
    outcome: 'Студент уверенно понимает механику, приборы и повседневное обслуживание.',
    accentFrom: 'from-slate-500/20',
    accentTo: 'to-zinc-500/10',
    lessons: [
      { title: 'Кузов и органы управления', focus: 'volante, embrague, palanca, parabrisas' },
      { title: 'Двигатель и жидкости', focus: 'motor, radiador, aceite, frenos' },
      { title: 'Контроль состояния машины', focus: 'neumático, presión, revisión, avería' },
    ],
  },
  {
    id: 'exam-language',
    phase: 'Phase 04 · Exam readiness',
    emoji: '🎯',
    title: 'Язык формулировок DGT',
    subtitle: 'Модальные конструкции, исключения и ловушки экзамена.',
    targetTerms: 30,
    outcome: 'Студент перестаёт переводить слово в слово и начинает читать экзамен как систему.',
    accentFrom: 'from-fuchsia-500/20',
    accentTo: 'to-pink-500/10',
    lessons: [
      { title: 'Обязан, может, запрещено', focus: 'debe, puede, está prohibido' },
      { title: 'Исключения и условия', focus: 'salvo, excepto, siempre que' },
      { title: 'Ловушки экзамена', focus: 'en ningún caso, con carácter general' },
    ],
  },
];

