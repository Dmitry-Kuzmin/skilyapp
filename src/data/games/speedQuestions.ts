// speed limits quiz data
export interface SpeedOption {
  text: string;
  comment: string;
}

export interface SpeedQuestion {
  id: number;
  question: string;
  options: SpeedOption[];
  correctIndex: number;
  category: string;
}

export const speedQuestionsDB: Record<string, SpeedQuestion[]> = {
  ru: [
    {
      id: 1,
      category: "Autopistas / Autovías",
      question: "С какой максимальной скоростью разрешено движение легковому автомобилю на автомагистрали вне населенного пункта?",
      options: [
        { text: "90 км/ч", comment: "Лимит для грузовиков" },
        { text: "100 км/ч", comment: "Лимит для автобусов" },
        { text: "120 км/ч", comment: "Верно: общая норма для легковых авто" },
        { text: "80 км/ч", comment: "Лимит для автомагистралей внутри города" }
      ],
      correctIndex: 2
    },
    {
      id: 2,
      category: "Autopistas / Autovías",
      question: "Каков предел скорости для мотоцикла на междугородней автовии?",
      options: [
        { text: "100 км/ч", comment: "Лимит для автобусов" },
        { text: "120 км/ч", comment: "Верно: мотоциклы приравнены к легковым" },
        { text: "140 км/ч", comment: "Запрещено: превышение на 20 км/ч для обгона отменено" },
        { text: "45 км/ч", comment: "Лимит для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 3,
      category: "Autopistas / Autovías",
      question: "Максимальная скорость автобуса при движении по автомагистрали вне города?",
      options: [
        { text: "120 км/ч", comment: "Запрещено для автобусов" },
        { text: "100 км/ч", comment: "Верно: это их скоростной потолок на трассе" },
        { text: "90 км/ч", comment: "Лимит для грузовиков" },
        { text: "80 км/ч", comment: "Минимальная скорость в городе" }
      ],
      correctIndex: 1
    },
    {
      id: 4,
      category: "Autopistas / Autovías",
      question: "С какой скоростью должен ехать грузовик весом более 3500 кг по автомагистрали?",
      options: [
        { text: "100 км/ч", comment: "Для автобусов" },
        { text: "80 км/ч", comment: "Лимит для грузовиков на обычных дорогах" },
        { text: "90 км/ч", comment: "Верно: максимальный лимит для тяжелых авто на трассе" },
        { text: "120 км/ч", comment: "Категорически запрещено" }
      ],
      correctIndex: 2
    },
    {
      id: 5,
      category: "Autopistas / Autovías",
      question: "Лимит скорости для легкового автомобиля с легким прицепом (до 750 кг) на автовии?",
      options: [
        { text: "120 км/ч", comment: "Только без прицепа" },
        { text: "100 км/ч", comment: "Неверно: прицеп снижает лимит" },
        { text: "90 км/ч", comment: "Верно: любые составы ТС на трассе ограничены этим пределом" },
        { text: "70 км/ч", comment: "Слишком медленно" }
      ],
      correctIndex: 2
    },
    {
      id: 6,
      category: "Autopistas / Autovías",
      question: "Скорость смешанного ТС (Vehículo mixto adaptable) на автомагистрали?",
      options: [
        { text: "120 км/ч", comment: "Для легковых авто" },
        { text: "100 км/ч", comment: "Верно: смешанные ТС приравнены к группе автобусов" },
        { text: "90 км/ч", comment: "Для грузовиков" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 7,
      category: "Autopistas / Autovías",
      question: "Максимальная скорость для пикапа при движении по междугородней автовии?",
      options: [
        { text: "120 км/ч", comment: "Верно: к пикапам применяется та же норма, что и к легковым" },
        { text: "90 км/ч", comment: "Для грузовиков" },
        { text: "100 км/ч", comment: "Для автобусов" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 0
    },
    {
      id: 8,
      category: "Autopistas / Autovías",
      question: "Какова максимальная скорость тяжелого автодома (> 3500 кг) на автомагистрали?",
      options: [
        { text: "120 км/ч", comment: "Для легких автодомов" },
        { text: "90 км/ч", comment: "Верно: тяжелые автодома приравнены к грузовикам" },
        { text: "100 км/ч", comment: "Для автобусов" },
        { text: "60 км/ч", comment: "Минимальная скорость" }
      ],
      correctIndex: 1
    },
    {
      id: 9,
      category: "Autopistas / Autovías",
      question: "Скорость мотоцикла по автомагистрали, проходящей внутри города (Poblado)?",
      options: [
        { text: "120 км/ч", comment: "Лимит вне города" },
        { text: "50 км/ч", comment: "Лимит обычных улиц" },
        { text: "80 км/ч", comment: "Верно: специальный лимит для трасс внутри города" },
        { text: "30 км/ч", comment: "Для узких улиц" }
      ],
      correctIndex: 2
    },
    {
      id: 10,
      category: "Autopistas / Autovías",
      question: "Какова минимально допустимая скорость для легкового авто на автомагистрали?",
      options: [
        { text: "50 км/ч", comment: "Неверно" },
        { text: "60 км/ч", comment: "Верно: движение медленнее считается аномальным" },
        { text: "45 км/ч", comment: "Минимум на обычной дороге" },
        { text: "90 км/ч", comment: "Для грузовиков" }
      ],
      correctIndex: 1
    },
    {
      id: 11,
      category: "Autopistas / Autovías",
      question: "Скорость школьного автобуса по автомагистрали?",
      options: [
        { text: "100 км/ч", comment: "Для обычного автобуса" },
        { text: "90 км/ч", comment: "Верно: школьный транспорт снижает лимит на 10 км/ч вне города" },
        { text: "80 км/ч", comment: "Для опасных грузов" },
        { text: "120 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 12,
      category: "Autopistas / Autovías",
      question: "Лимит скорости для грузовика с опасными грузами на автовии?",
      options: [
        { text: "90 км/ч", comment: "Для обычного грузовика" },
        { text: "80 км/ч", comment: "Верно: лимит снижается на 10 км/ч" },
        { text: "70 км/ч", comment: "Для спецтехники" },
        { text: "100 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 13,
      category: "Autopistas / Autovías",
      question: "Максимальная скорость тяжелого квадроцикла (Quad) на скоростной дороге?",
      options: [
        { text: "120 км/ч", comment: "Слишком много" },
        { text: "45 км/ч", comment: "Для мопедов" },
        { text: "70 км/ч", comment: "Верно: это их конструктивный и законный предел" },
        { text: "90 км/ч", comment: "Для грузовиков" }
      ],
      correctIndex: 2
    },
    {
      id: 14,
      category: "Autopistas / Autovías",
      question: "Скорость специального ТС, способного ехать быстрее 60 км/ч, на автомагистрали?",
      options: [
        { text: "40 км/ч", comment: "Стандарт для спецтехники" },
        { text: "70 км/ч", comment: "Верно: для скоростной спецтехники лимит выше" },
        { text: "90 км/ч", comment: "Для грузовиков" },
        { text: "120 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 15,
      category: "Autopistas / Autovías",
      question: "Скорость легкового авто с тяжелым прицепом (> 750 кг) на автовии?",
      options: [
        { text: "120 км/ч", comment: "Для авто без прицепа" },
        { text: "100 км/ч", comment: "Для автобусов" },
        { text: "90 км/ч", comment: "Верно: все прицепы ограничены пределом 90" },
        { text: "80 км/ч", comment: "Для грузовиков вне трассы" }
      ],
      correctIndex: 2
    },
    {
      id: 16,
      category: "Carreteras Convencionales",
      question: "Максимальная скорость легкового авто на обычной междугородней дороге?",
      options: [
        { text: "100 км/ч", comment: "Устаревший лимит" },
        { text: "90 км/ч", comment: "Верно: стандартный лимит для легковых и мотоциклов" },
        { text: "80 км/ч", comment: "Для грузовиков" },
        { text: "120 км/ч", comment: "Только на автомагистралях" }
      ],
      correctIndex: 1
    },
    {
      id: 17,
      category: "Carreteras Convencionales",
      question: "Лимит скорости для мотоцикла на обычной дороге вне населенного пункта?",
      options: [
        { text: "100 км/ч", comment: "Запрещено: превышение для обгона отменено" },
        { text: "90 км/ч", comment: "Верно: общая норма для двухколесного транспорта" },
        { text: "110 км/ч", comment: "Неверно" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 18,
      category: "Carreteras Convencionales",
      question: "Максимальная скорость автобуса на обычной дороге?",
      options: [
        { text: "100 км/ч", comment: "Только на автомагистралях" },
        { text: "90 км/ч", comment: "Верно: на обычных дорогах они едут как легковые" },
        { text: "80 км/ч", comment: "Для грузовиков" },
        { text: "70 км/ч", comment: "Для опасных грузов" }
      ],
      correctIndex: 1
    },
    {
      id: 19,
      category: "Carreteras Convencionales",
      question: "Скорость грузовика или фургона на обычной междугородней дороге?",
      options: [
        { text: "90 км/ч", comment: "Для легковых авто" },
        { text: "80 км/ч", comment: "Верно: грузовой транспорт на 10 км/ч медленнее" },
        { text: "70 км/ч", comment: "Внутри поселка" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 1
    },
    {
      id: 20,
      category: "Carreteras Convencionales",
      question: "Предел скорости для автомобиля с любым прицепом на обычной дороге?",
      options: [
        { text: "90 км/ч", comment: "Без прицепа" },
        { text: "80 км/ч", comment: "Верно: составы ТС приравнены к грузовикам" },
        { text: "70 км/ч", comment: "Для школьного транспорта" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 21,
      category: "Carreteras Convencionales",
      question: "Максимальная скорость мопеда на обочине обычной дороги?",
      options: [
        { text: "90 км/ч", comment: "Для машин" },
        { text: "45 км/ч", comment: "Верно: конструктивный и законный предел мопеда" },
        { text: "25 км/ч", comment: "Для самокатов" },
        { text: "30 км/ч", comment: "Для тракторов" }
      ],
      correctIndex: 1
    },
    {
      id: 22,
      category: "Carreteras Convencionales",
      question: "Скорость велосипеда на междугородней дороге?",
      options: [
        { text: "20 км/ч", comment: "Слишком медленно" },
        { text: "45 км/ч", comment: "Верно: общий лимит для велосипедов вне города" },
        { text: "90 км/ч", comment: "Опасно" },
        { text: "60 км/ч", comment: "Для спецтехники" }
      ],
      correctIndex: 1
    },
    {
      id: 23,
      category: "Carreteras Convencionales",
      question: "Скорость грузовика с опасными грузами на обычной дороге?",
      options: [
        { text: "80 км/ч", comment: "Для обычного грузовика" },
        { text: "70 км/ч", comment: "Верно: минус 10 км/ч от основного лимита" },
        { text: "90 км/ч", comment: "Для легковых" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 1
    },
    {
      id: 24,
      category: "Carreteras Convencionales",
      question: "Школьный автобус на обычной дороге — каков его лимит скорости?",
      options: [
        { text: "90 км/ч", comment: "Для обычного автобуса" },
        { text: "80 км/ч", comment: "Верно: обязан снижать на 10 км/ч вне города" },
        { text: "70 км/ч", comment: "Для опасных грузов" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 1
    },
    {
      id: 25,
      category: "Carreteras Convencionales",
      question: "Скорость на любом ТС по дороге без покрытия (Vía sin pavimentar)?",
      options: [
        { text: "90 км/ч", comment: "На асфальте" },
        { text: "50 км/ч", comment: "Для поселков" },
        { text: "30 км/ч", comment: "Верно: единый лимит для всех на грунте" },
        { text: "20 км/ч", comment: "Жилая зона" }
      ],
      correctIndex: 2
    },
    {
      id: 26,
      category: "Carreteras Convencionales",
      question: "Минимальная скорость для легкового авто на обычной дороге (макс 90 км/ч)?",
      options: [
        { text: "60 км/ч", comment: "Минимум на трассе" },
        { text: "45 км/ч", comment: "Верно: половина от установленного максимума" },
        { text: "30 км/ч", comment: "Для тракторов" },
        { text: "40 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 27,
      category: "Carreteras Convencionales",
      question: "Предел скорости для трехколесного мотоцикла (Трицикла) на обычной дороге?",
      options: [
        { text: "90 км/ч", comment: "Для двухколесных" },
        { text: "70 км/ч", comment: "Верно: трициклы имеют свой лимит" },
        { text: "80 км/ч", comment: "Для грузовиков" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 28,
      category: "Carreteras Convencionales",
      question: "Максимальная скорость трактора без прицепа на обычной дороге?",
      options: [
        { text: "40 км/ч", comment: "Верно: стандартный лимит для самоходной спецтехники" },
        { text: "25 км/ч", comment: "Для трактора с прицепом" },
        { text: "70 км/ч", comment: "Для скоростной спецтехники" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 0
    },
    {
      id: 29,
      category: "Carreteras Convencionales",
      question: "Скорость трактора, буксирующего сельхоз прицеп, на обычной дороге?",
      options: [
        { text: "40 км/ч", comment: "Без прицепа" },
        { text: "25 км/ч", comment: "Верно: прицеп снижает скорость спецтехники" },
        { text: "10 км/ч", comment: "Слишком медленно" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 30,
      category: "Carreteras Convencionales",
      question: "Специальное ТС без стоп-сигналов — каков его лимит?",
      options: [
        { text: "40 км/ч", comment: "Для исправного ТС" },
        { text: "25 км/ч", comment: "Верно: отсутствие сигналов жестко ограничивает скорость" },
        { text: "70 км/ч", comment: "Для скоростных ТС" },
        { text: "15 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 31,
      category: "Vías Urbanas",
      question: "Скорость любого ТС на городской улице с ДВУМЯ и более полосами?",
      options: [
        { text: "30 км/ч", comment: "Для узких улиц" },
        { text: "50 км/ч", comment: "Верно: стандартный лимит для широких дорог" },
        { text: "20 км/ч", comment: "Для жилых зон" },
        { text: "80 км/ч", comment: "Для автомагистралей" }
      ],
      correctIndex: 1
    },
    {
      id: 32,
      category: "Vías Urbanas",
      question: "Лимит скорости на улице с ОДНОЙ полосой для движения?",
      options: [
        { text: "50 км/ч", comment: "Для проспектов" },
        { text: "30 км/ч", comment: "Верно: новая норма для однополосных улиц" },
        { text: "20 км/ч", comment: "Для единых платформ" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 33,
      category: "Vías Urbanas",
      question: "Скорость на улице с «единой платформой» (тротуар и дорога на одном уровне)?",
      options: [
        { text: "30 км/ч", comment: "Для обычных улиц" },
        { text: "20 км/ч", comment: "Верно: строгий лимит для безопасности пешеходов" },
        { text: "10 км/ч", comment: "Слишком медленно" },
        { text: "50 км/ч", comment: "Опасно" }
      ],
      correctIndex: 1
    },
    {
      id: 34,
      category: "Vías Urbanas",
      question: "Перевозка опасных грузов по городу на улице, где максимум 50 км/ч?",
      options: [
        { text: "50 км/ч", comment: "Для обычных авто" },
        { text: "40 км/ч", comment: "Верно: минус 10 км/ч от лимита улицы" },
        { text: "30 км/ч", comment: "Неверно" },
        { text: "20 км/ч", comment: "Для жилых зон" }
      ],
      correctIndex: 1
    },
    {
      id: 35,
      category: "VMP",
      question: "Предел скорости для электросамоката (VMP) в городе?",
      options: [
        { text: "45 км/ч", comment: "Для мопедов" },
        { text: "30 км/ч", comment: "Для улиц" },
        { text: "25 км/ч", comment: "Верно: законодательный максимум для самокатов" },
        { text: "6 км/ч", comment: "Минимальный порог" }
      ],
      correctIndex: 2
    },
    {
      id: 36,
      category: "Transporte Escolar",
      question: "Скорость школьного автобуса в городе на улице с двумя полосами?",
      options: [
        { text: "40 км/ч", comment: "Для опасных грузов" },
        { text: "50 км/ч", comment: "Верно: в городе лимит для школьников НЕ снижается" },
        { text: "30 км/ч", comment: "Для узких улиц" },
        { text: "60 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 37,
      category: "Мопеды",
      question: "Лимит скорости для мопеда на любой улице в населенном пункте?",
      options: [
        { text: "50 км/ч", comment: "Для машин" },
        { text: "45 км/ч", comment: "Верно: не может превышать свой конструктивный лимит" },
        { text: "30 км/ч", comment: "Если одна полоса" },
        { text: "25 км/ч", comment: "Для самокатов" }
      ],
      correctIndex: 1
    },
    {
      id: 38,
      category: "Travesía",
      question: "Участок трассы через поселок (Travesía) — лимит для авто без знаков?",
      options: [
        { text: "90 км/ч", comment: "Для трассы вне города" },
        { text: "50 км/ч", comment: "Верно: травесия приравнивается к городской зоне" },
        { text: "80 км/ч", comment: "Для магистралей в городе" },
        { text: "30 км/ч", comment: "Если одна полоса" }
      ],
      correctIndex: 1
    },
    {
      id: 39,
      category: "Минимумы",
      question: "Минимально допустимая скорость в городе на улице с лимитом 50 км/ч?",
      options: [
        { text: "30 км/ч", comment: "Неверно" },
        { text: "25 км/ч", comment: "Верно: половина от разрешенного максимума" },
        { text: "15 км/ч", comment: "Для улиц с лимитом 30" },
        { text: "20 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 40,
      category: "Жилые зоны",
      question: "Лимит скорости в жилой зоне (знак с пешеходами и мячом)?",
      options: [
        { text: "30 км/ч", comment: "Общая норма" },
        { text: "20 км/ч", comment: "Верно: строгий лимит для безопасности жителей" },
        { text: "10 км/ч", comment: "Слишком медленно" },
        { text: "50 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 41,
      category: "Прицепы",
      question: "Максимальная скорость мотоцикла с прицепом на автомагистрали?",
      options: [
        { text: "120 км/ч", comment: "Без прицепа" },
        { text: "90 км/ч", comment: "Для грузовиков" },
        { text: "108 км/ч", comment: "Верно: лимит снижается на 10% (120 - 12 = 108)" },
        { text: "100 км/ч", comment: "Для автобусов" }
      ],
      correctIndex: 2
    },
    {
      id: 42,
      category: "Квадроциклы",
      question: "Лимит тяжелого квадроцикла с прицепом на обычной дороге?",
      options: [
        { text: "70 км/ч", comment: "Без прицепа" },
        { text: "63 км/ч", comment: "Верно: лимит снижается на 10% (70 - 7 = 63)" },
        { text: "45 км/ч", comment: "Лимит мопеда" },
        { text: "90 км/ч", comment: "Для легковых" }
      ],
      correctIndex: 1
    },
    {
      id: 43,
      category: "Квадрициклы",
      question: "Скорость легкого квадрицикла с прицепом на междугородней дороге?",
      options: [
        { text: "45 км/ч", comment: "Без прицепа" },
        { text: "40.5 км/ч", comment: "Верно: лимит 45 км/ч минус 10%" },
        { text: "25 км/ч", comment: "Неверно" },
        { text: "50 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 44,
      category: "Велосипеды",
      question: "Условие по скорости и времени суток для велосипеда с прицепом?",
      options: [
        { text: "45 км/ч ночью", comment: "Опасно" },
        { text: "25 км/ч всегда", comment: "Неверно" },
        { text: "Снизить на 10% и только днем", comment: "Верно: запрещено движение ночью" },
        { text: "30 км/ч", comment: "Для грунтовых дорог" }
      ],
      correctIndex: 2
    },
    {
      id: 45,
      category: "Трициклы",
      question: "Предел скорости для трицикла на обычной дороге?",
      options: [
        { text: "90 км/ч", comment: "Для двухколесных" },
        { text: "70 км/ч", comment: "Верно: спец. категория лимита для трициклов" },
        { text: "80 км/ч", comment: "Для грузовиков" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 46,
      category: "Опасные грузы",
      question: "Скорость ТС с опасными грузами на улице с лимитом 30 км/ч?",
      options: [
        { text: "30 км/ч", comment: "Для обычных авто" },
        { text: "20 км/ч", comment: "Верно: правило «минус 10» действует и здесь" },
        { text: "15 км/ч", comment: "Слишком медленно" },
        { text: "10 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 47,
      category: "Прицепы",
      question: "Лимит авто с любым прицепом на обычной дороге вне города?",
      options: [
        { text: "90 км/ч", comment: "Без прицепа" },
        { text: "80 км/ч", comment: "Верно: составы ТС приравнены к грузовикам" },
        { text: "70 км/ч", comment: "Для школьников" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 48,
      category: "Тех. знаки",
      question: "Скорость автомобиля со знаком «40» (V-5) сзади?",
      options: [
        { text: "40 км/ч", comment: "Верно: это его технический и законный предел" },
        { text: "70 км/ч", comment: "Неверно" },
        { text: "25 км/ч", comment: "Для спецтехники" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 0
    },
    {
      id: 49,
      category: "Мотоциклы",
      question: "Максимальная скорость мотоцикла на дороге без твердого покрытия?",
      options: [
        { text: "90 км/ч", comment: "На асфальте" },
        { text: "30 км/ч", comment: "Верно: единый лимит на грунте для всех" },
        { text: "45 км/ч", comment: "Для мопедов" },
        { text: "20 км/ч", comment: "В жилых зонах" }
      ],
      correctIndex: 1
    },
    {
      id: 50,
      category: "Автобусы",
      question: "Лимит скорости для автобуса с прицепом на автомагистрали?",
      options: [
        { text: "100 км/ч", comment: "Без прицепа" },
        { text: "90 км/ч", comment: "Верно: любой прицеп на трассе — 90" },
        { text: "80 км/ч", comment: "В городе" },
        { text: "120 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 51,
      category: "Опасные грузы",
      question: "Скорость грузовика с опасными грузами по автомагистрали?",
      options: [
        { text: "90 км/ч", comment: "Обычный грузовик" },
        { text: "80 км/ч", comment: "Верно: минус 10 км/ч для опасных грузов" },
        { text: "70 км/ч", comment: "Для спецтехники" },
        { text: "100 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 52,
      category: "Transporte Escolar",
      question: "Скорость школьного автобуса на обычной междугородней дороге?",
      options: [
        { text: "90 км/ч", comment: "Обычный автобус" },
        { text: "80 км/ч", comment: "Верно: обязан снижать скорость вне города" },
        { text: "70 км/ч", comment: "Опасные грузы" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 1
    },
    {
      id: 53,
      category: "Особые условия",
      question: "Лимит скорости на дороге без твердого покрытия?",
      options: [
        { text: "90 км/ч", comment: "Для асфальта" },
        { text: "50 км/ч", comment: "Для поселков" },
        { text: "30 км/ч", comment: "Верно: единый лимит для всех на грунте" },
        { text: "20 км/ч", comment: "Жилая зона" }
      ],
      correctIndex: 2
    },
    {
      id: 54,
      category: "Спецтехника",
      question: "Скорость спецтехники с прицепом на междугородней дороге?",
      options: [
        { text: "40 км/ч", comment: "Без прицепа" },
        { text: "25 км/ч", comment: "Верно: прицеп снижает лимит до этой отметки" },
        { text: "45 км/ч", comment: "Для мопедов" },
        { text: "70 км/ч", comment: "Скоростная техника" }
      ],
      correctIndex: 1
    },
    {
      id: 55,
      category: "Опасные грузы",
      question: "Скорость легкового авто с опасным грузом в городе при лимите 50?",
      options: [
        { text: "50 км/ч", comment: "Обычный лимит" },
        { text: "40 км/ч", comment: "Верно: в городе лимит также снижается на 10" },
        { text: "30 км/ч", comment: "Узкая улица" },
        { text: "20 км/ч", comment: "Жилая зона" }
      ],
      correctIndex: 1
    },
    {
      id: 56,
      category: "Трициклы",
      question: "Максимальная скорость для трицикла на автомагистрали?",
      options: [
        { text: "120 км/ч", comment: "Для мотоциклов" },
        { text: "90 км/ч", comment: "Для грузовиков" },
        { text: "70 км/ч", comment: "Верно: трициклы имеют жесткое ограничение" },
        { text: "100 км/ч", comment: "Для автобусов" }
      ],
      correctIndex: 2
    },
    {
      id: 57,
      category: "Спецтехника",
      question: "Скорость мотокультиватора, управляемого пешим водителем, по обочине?",
      options: [
        { text: "40 км/ч", comment: "Для спецтехники" },
        { text: "25 км/ч", comment: "Верно: лимит для мотокультиваторов" },
        { text: "10 км/ч", comment: "Слишком медленно" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 58,
      category: "Автобусы",
      question: "Скорость сочлененного автобуса на автовии?",
      options: [
        { text: "120 км/ч", comment: "Запрещено" },
        { text: "100 км/ч", comment: "Верно: лимит как у обычного автобуса" },
        { text: "90 км/ч", comment: "Для грузовиков" },
        { text: "80 км/ч", comment: "В городе" }
      ],
      correctIndex: 1
    },
    {
      id: 59,
      category: "Derivado de Turismo",
      question: "Лимит для производного от легкового авто на обычной дороге?",
      options: [
        { text: "100 км/ч", comment: "Для трассы" },
        { text: "90 км/ч", comment: "Верно: едут как легковые" },
        { text: "80 км/ч", comment: "Для грузовиков" },
        { text: "70 км/ч", comment: "Спецтехника" }
      ],
      correctIndex: 1
    },
    {
      id: 60,
      category: "Туннели",
      question: "Скорость легкового авто в туннеле на автомагистрали без доп. знаков?",
      options: [
        { text: "80 км/ч", comment: "Неверно" },
        { text: "100 км/ч", comment: "Неверно" },
        { text: "120 км/ч", comment: "Верно: действуют общие лимиты дороги" },
        { text: "60 км/ч", comment: "Минимум" }
      ],
      correctIndex: 2
    },
    {
      id: 61,
      category: "Vías Urbanas",
      question: "Скорость на улице с единой платформой (тротуар и дорога на одном уровне)?",
      options: [
        { text: "30 км/ч", comment: "Для обычных улиц" },
        { text: "20 км/ч", comment: "Верно: для защиты пешеходов" },
        { text: "10 км/ч", comment: "Слишком медленно" },
        { text: "50 км/ч", comment: "Опасно" }
      ],
      correctIndex: 1
    },
    {
      id: 62,
      category: "Transporte Escolar",
      question: "Скорость школьного автобуса по городу на улице с двумя полосами?",
      options: [
        { text: "40 км/ч", comment: "Снижение на 10 км/ч" },
        { text: "50 км/ч", comment: "Верно: в городе лимит НЕ снижается" },
        { text: "30 км/ч", comment: "Узкая улица" },
        { text: "60 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 63,
      category: "VMP",
      question: "Лимит скорости для электросамоката по веломаршруту?",
      options: [
        { text: "45 км/ч", comment: "Для мопедов" },
        { text: "6 км/ч", comment: "Для игрушек" },
        { text: "25 км/ч", comment: "Верно: конструктивный предел для VMP" },
        { text: "30 км/ч", comment: "Неверно" }
      ],
      correctIndex: 2
    },
    {
      id: 64,
      category: "Жилые зоны",
      question: "Скорость велосипеда в жилой зоне со специальным знаком?",
      options: [
        { text: "30 км/ч", comment: "Общая норма" },
        { text: "20 км/ч", comment: "Верно: лимит распространяется на всех" },
        { text: "45 км/ч", comment: "Лимит на трассе" },
        { text: "15 км/ч", comment: "Слишком медленно" }
      ],
      correctIndex: 1
    },
    {
      id: 65,
      category: "Travesía",
      question: "Скорость мотоцикла по травесии (участок дороги через поселок)?",
      options: [
        { text: "90 км/ч", comment: "Для трассы" },
        { text: "50 км/ч", comment: "Верно: травесия считается городской зоной" },
        { text: "80 км/ч", comment: "Для магистралей в городе" },
        { text: "30 км/ч", comment: "Узкая улица" }
      ],
      correctIndex: 1
    },
    {
      id: 66,
      category: "Минимумы",
      question: "Минимальная скорость в городе на улице с лимитом 30 км/ч?",
      options: [
        { text: "25 км/ч", comment: "Для лимита 50" },
        { text: "20 км/ч", comment: "Неверно" },
        { text: "15 км/ч", comment: "Верно: половина от максимума" },
        { text: "10 км/ч", comment: "Неверно" }
      ],
      correctIndex: 2
    },
    {
      id: 67,
      category: "Квадрициклы",
      question: "Скорость легкого квадрицикла в городе на любой улице?",
      options: [
        { text: "50 км/ч", comment: "Если полос много" },
        { text: "45 км/ч", comment: "Верно: его конструктивный предел" },
        { text: "30 км/ч", comment: "Если полос мало" },
        { text: "25 км/ч", comment: "Для самокатов" }
      ],
      correctIndex: 1
    },
    {
      id: 68,
      category: "Vías Urbanas",
      question: "Скорость движения в зоне «Calle 30» (одна полоса на направление)?",
      options: [
        { text: "50 км/ч", comment: "Для проспектов" },
        { text: "30 км/ч", comment: "Верно: стандарт для таких улиц" },
        { text: "20 км/ч", comment: "Для платформ" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 69,
      category: "Составы ТС",
      question: "Скорость автопоезда на автомагистрали?",
      options: [
        { text: "120 км/ч", comment: "Для легковых" },
        { text: "100 км/ч", comment: "Для автобусов" },
        { text: "90 км/ч", comment: "Верно: все составы на трассах ограничены этим" },
        { text: "80 км/ч", comment: "Минимум" }
      ],
      correctIndex: 2
    },
    {
      id: 70,
      category: "Составы ТС",
      question: "Скорость сочлененного ТС на обычной дороге вне города?",
      options: [
        { text: "90 км/ч", comment: "Для легковых" },
        { text: "80 км/ч", comment: "Верно: приравниваются к грузовикам" },
        { text: "70 км/ч", comment: "Для спецтехники" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 71,
      category: "Мопеды",
      question: "Лимит скорости трехколесного мопеда на междугородней дороге?",
      options: [
        { text: "70 км/ч", comment: "Для трициклов" },
        { text: "45 км/ч", comment: "Верно: любой мопед ограничен этой цифрой" },
        { text: "25 км/ч", comment: "Для самокатов" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 1
    },
    {
      id: 72,
      category: "Грунтовые дороги",
      question: "Скорость тяжелого квадроцикла (Quad) по дороге без покрытия?",
      options: [
        { text: "70 км/ч", comment: "Лимит на асфальте" },
        { text: "30 км/ч", comment: "Верно: общий лимит дороги аннулирует лимит ТС" },
        { text: "45 км/ч", comment: "Неверно" },
        { text: "20 км/ч", comment: "В жилой зоне" }
      ],
      correctIndex: 1
    },
    {
      id: 73,
      category: "Минимумы",
      question: "Минимальная скорость на автомагистрали для грузовика?",
      options: [
        { text: "90 км/ч", comment: "Его максимум" },
        { text: "60 км/ч", comment: "Верно: минимум един для всех ТС" },
        { text: "45 км/ч", comment: "Неверно" },
        { text: "80 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 74,
      category: "Тех. знаки",
      question: "Предел скорости для ТС со знаком V-4 (диск с числом 25)?",
      options: [
        { text: "40 км/ч", comment: "Для спецтехники" },
        { text: "25 км/ч", comment: "Верно: обязан соблюдать лимит своего знака" },
        { text: "45 км/ч", comment: "Для мопедов" },
        { text: "30 км/ч", comment: "На грунте" }
      ],
      correctIndex: 1
    },
    {
      id: 75,
      category: "Буксировка",
      question: "Скорость буксировки неисправного авто на жесткой сцепке вне города?",
      options: [
        { text: "90 км/ч", comment: "Без прицепа" },
        { text: "80 км/ч", comment: "Верно: приравнивается к составу с прицепом" },
        { text: "70 км/ч", comment: "Неверно" },
        { text: "50 км/ч", comment: "В городе" }
      ],
      correctIndex: 1
    },
    {
      id: 76,
      category: "Pick-up",
      question: "Скорость пикапа на обычной дороге (Carretera convencional)?",
      options: [
        { text: "100 км/ч", comment: "Если есть разделитель" },
        { text: "90 км/ч", comment: "Верно: следуют правилам легковых авто" },
        { text: "80 км/ч", comment: "Для грузовиков" },
        { text: "120 км/ч", comment: "Для трассы" }
      ],
      correctIndex: 1
    },
    {
      id: 77,
      category: "Vías Urbanas",
      question: "Скорость автобуса по автомагистрали ВНУТРИ города?",
      options: [
        { text: "100 км/ч", comment: "Лимит вне города" },
        { text: "80 км/ч", comment: "Верно: потолок для всех ТС на трассах в городе" },
        { text: "50 км/ч", comment: "Обычные улицы" },
        { text: "90 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 78,
      category: "Смешанные ТС",
      question: "Лимит смешанного ТС на дороге для автомобилей?",
      options: [
        { text: "100 км/ч", comment: "На магистрали" },
        { text: "90 км/ч", comment: "Верно: едут как автобусы" },
        { text: "120 км/ч", comment: "Запрещено" },
        { text: "80 км/ч", comment: "Грузовики" }
      ],
      correctIndex: 1
    },
    {
      id: 79,
      category: "Опасные грузы",
      question: "Скорость перевозки опасных грузов на мотоцикле в городе?",
      options: [
        { text: "50 км/ч", comment: "Обычный мотоцикл" },
        { text: "40 км/ч", comment: "Верно: правило «минус 10» универсально" },
        { text: "25 км/ч", comment: "Для самокатов" },
        { text: "30 км/ч", comment: "Узкая улица" }
      ],
      correctIndex: 1
    },
    {
      id: 80,
      category: "Спецтехника",
      question: "Скорость спецтехники на автовии, если ее макс. по паспорту 80?",
      options: [
        { text: "40 км/ч", comment: "Общий лимит" },
        { text: "60 км/ч", comment: "Минимум трассы" },
        { text: "70 км/ч", comment: "Верно: скоростная спецтехника ограничена этим" },
        { text: "80 км/ч", comment: "Неверно" }
      ],
      correctIndex: 2
    },
    {
      id: 81,
      category: "Туннели",
      question: "Минимальная дистанция безопасности для легкового авто в туннеле?",
      options: [
        { text: "50 метров", comment: "Для грузовиков вне туннеля" },
        { text: "100 метров (4 сек)", comment: "Верно: обязательный минимум в туннеле" },
        { text: "150 метров", comment: "Для тяжелых ТС" },
        { text: "Безопасная", comment: "Этого недостаточно" }
      ],
      correctIndex: 1
    },
    {
      id: 82,
      category: "Туннели",
      question: "Обязательная дистанция для грузовика 5000 кг в туннеле?",
      options: [
        { text: "100 метров", comment: "Для легковых" },
        { text: "50 метров", comment: "Для обычных дорог" },
        { text: "150 метров (6 сек)", comment: "Верно: повышенное требование для тяжелых" },
        { text: "200 метров", comment: "Неверно" }
      ],
      correctIndex: 2
    },
    {
      id: 83,
      category: "Дистанции",
      question: "Дистанция между грузовиками >3,5 т или длиной >10 м вне города?",
      options: [
        { text: "100 метров", comment: "Неверно" },
        { text: "50 метров", comment: "Верно: фиксированный минимум для тяжелых/длинных" },
        { text: "150 метров", comment: "Неверно" },
        { text: "4 секунды", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 84,
      category: "Travesía",
      question: "Скорость школьного автобуса в Травесии (внутри поселка)?",
      options: [
        { text: "50 км/ч", comment: "Верно: в городе лимит НЕ снижается" },
        { text: "40 км/ч", comment: "Для опасных грузов" },
        { text: "30 км/ч", comment: "Узкая улица" },
        { text: "60 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 0
    },
    {
      id: 85,
      category: "Опасные грузы",
      question: "Скорость ТС с опасными грузами на магистрали ВНУТРИ города?",
      options: [
        { text: "80 км/ч", comment: "Общий лимит трассы" },
        { text: "70 км/ч", comment: "Верно: «минус 10» применяется и на магистралях" },
        { text: "50 км/ч", comment: "Обычные улицы" },
        { text: "40 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 86,
      category: "VMP",
      question: "Скорость электросамоката на велополосе в городе?",
      options: [
        { text: "45 км/ч", comment: "Для мопедов" },
        { text: "25 км/ч", comment: "Верно: абсолютный конструктивный предел" },
        { text: "30 км/ч", comment: "Узкая улица" },
        { text: "15 км/ч", comment: "Пешеходная зона" }
      ],
      correctIndex: 1
    },
    {
      id: 87,
      category: "Vías Urbanas",
      question: "Максимальная скорость любого ТС на городской улице с одной полосой?",
      options: [
        { text: "50 км/ч", comment: "Многополосные" },
        { text: "30 км/ч", comment: "Верно: стандарт для улиц с одной полосой" },
        { text: "20 км/ч", comment: "Платформы" },
        { text: "45 км/ч", comment: "Для мопедов" }
      ],
      correctIndex: 1
    },
    {
      id: 88,
      category: "Жилые зоны",
      question: "Скорость на жилой улице (синий знак с пешеходами и мячом)?",
      options: [
        { text: "30 км/ч", comment: "Обычная улица" },
        { text: "20 км/ч", comment: "Верно: лимит для зон с приоритетом пешеходов" },
        { text: "10 км/ч", comment: "Слишком медленно" },
        { text: "50 км/ч", comment: "Запрещено" }
      ],
      correctIndex: 1
    },
    {
      id: 89,
      category: "Тех. неисправности",
      question: "Скорость спецтехники (трактора), если нет стоп-сигналов?",
      options: [
        { text: "40 км/ч", comment: "Для исправной техники" },
        { text: "25 км/ч", comment: "Верно: техническая неисправность снижает лимит" },
        { text: "70 км/ч", comment: "Скоростная техника" },
        { text: "10 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 90,
      category: "Метеоусловия",
      question: "Скорость легкового авто в снегопад («Красный уровень» / цепи)?",
      options: [
        { text: "60 км/ч", comment: "Для желтого уровня" },
        { text: "30 км/ч", comment: "Верно: обязательный предел при использовании цепей" },
        { text: "50 км/ч", comment: "Неверно" },
        { text: "20 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 91,
      category: "Дороги",
      question: "Максимальная скорость легкового авто на дороге для автомобилей?",
      options: [
        { text: "120 км/ч", comment: "Для магистралей" },
        { text: "90 км/ч", comment: "Верно: лимит как на обычной дороге" },
        { text: "100 км/ч", comment: "Если разделение потоков" },
        { text: "80 км/ч", comment: "Грузовики" }
      ],
      correctIndex: 1
    },
    {
      id: 92,
      category: "Автобусы",
      question: "Скорость автобуса по дороге для автомобилей (Vía para automóviles)?",
      options: [
        { text: "100 км/ч", comment: "Для магистралей" },
        { text: "90 км/ч", comment: "Верно: здесь приравнены к легковым" },
        { text: "80 км/ч", comment: "Грузовики" },
        { text: "70 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 93,
      category: "Грузовики",
      question: "Лимит скорости для грузовика на дороге для автомобилей?",
      options: [
        { text: "90 км/ч", comment: "Легковые" },
        { text: "80 км/ч", comment: "Верно: грузовые всегда медленнее" },
        { text: "70 км/ч", comment: "Опасные грузы" },
        { text: "100 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    },
    {
      id: 94,
      category: "Vías Urbanas",
      question: "Скорость на улице с единой платформой (без бордюра)?",
      options: [
        { text: "50 км/ч", comment: "Проспекты" },
        { text: "30 км/ч", comment: "Обычные улицы" },
        { text: "20 км/ч", comment: "Верно: для защиты пешеходов" },
        { text: "45 км/ч", comment: "Мопеды" }
      ],
      correctIndex: 2
    },
    {
      id: 95,
      category: "Мопеды",
      question: "Максимальная скорость для мопеда на обочине травесии?",
      options: [
        { text: "50 км/ч", comment: "Городской лимит" },
        { text: "45 км/ч", comment: "Верно: никогда не должен превышать свои 45" },
        { text: "30 км/ч", comment: "Неверно" },
        { text: "25 км/ч", comment: "Самокаты" }
      ],
      correctIndex: 1
    },
    {
      id: 96,
      category: "Минимумы",
      question: "Минимальная скорость легкового авто на автомагистрали вне города?",
      options: [
        { text: "45 км/ч", comment: "Для обычных дорог" },
        { text: "50 км/ч", comment: "Неверно" },
        { text: "60 км/ч", comment: "Верно: фиксированный минимум" },
        { text: "70 км/ч", comment: "Неверно" }
      ],
      correctIndex: 2
    },
    {
      id: 97,
      category: "Тех. знаки",
      question: "Скорость на ТС, имеющем сзади знак V-4 (диск с числом 25)?",
      options: [
        { text: "40 км/ч", comment: "Лимит спецтехники" },
        { text: "25 км/ч", comment: "Верно: обязан соблюдать свой знак" },
        { text: "30 км/ч", comment: "На грунте" },
        { text: "45 км/ч", comment: "Мопеды" }
      ],
      correctIndex: 1
    },
    {
      id: 98,
      category: "Перекрестки",
      question: "Лимит скорости на перекрестке без приоритета с плохой видимостью?",
      options: [
        { text: "30 км/ч", comment: "Неверно" },
        { text: "40 км/ч", comment: "Неверно" },
        { text: "50 км/ч", comment: "Верно: запрещено превышать этот предел" },
        { text: "60 км/ч", comment: "Опасно" }
      ],
      correctIndex: 2
    },
    {
      id: 99,
      category: "Прицепы",
      question: "Максимальная скорость легкового авто с прицепом вне города?",
      options: [
        { text: "90 км/ч", comment: "Без прицепа" },
        { text: "80 км/ч", comment: "Верно: составы ограничены этим пределом" },
        { text: "70 км/ч", comment: "Спецтехника" },
        { text: "45 км/ч", comment: "Мопеды" }
      ],
      correctIndex: 1
    },
    {
      id: 100,
      category: "Велосипеды",
      question: "Скорость на велосипеде по дороге без твердого покрытия?",
      options: [
        { text: "45 км/ч", comment: "Лимит на асфальте" },
        { text: "30 км/ч", comment: "Верно: лимит грунта обязателен для всех" },
        { text: "20 км/ч", comment: "Жилые зоны" },
        { text: "15 км/ч", comment: "Неверно" }
      ],
      correctIndex: 1
    }
  ],
  es: [
    {
      id: 1,
      category: "Autopistas / Autovías",
      question: "¿Cuál es la velocidad máxima permitida para un turismo en autopista o autovía fuera de poblado?",
      options: [
        { text: "90 km/h", comment: "Límite para camiones" },
        { text: "100 km/h", comment: "Límite para autobuses" },
        { text: "120 km/h", comment: "Correcto: norma general para turismos" },
        { text: "80 km/h", comment: "Límite en autopistas dentro de poblado" }
      ],
      correctIndex: 2
    },
    {
      id: 2,
      category: "Autopistas / Autovías",
      question: "¿Cuál es el límite de velocidad para una motocicleta en autovía interurbana?",
      options: [
        { text: "100 km/h", comment: "Límite para autobuses" },
        { text: "120 km/h", comment: "Correcto: las motos tienen el mismo límite que turismos" },
        { text: "140 km/h", comment: "Prohibido: el margen de 20 km/h para adelantar ha sido eliminado" },
        { text: "45 km/h", comment: "Límite para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 3,
      category: "Autopistas / Autovías",
      question: "¿Cuál es la velocidad máxima de un autobús en autopista fuera de poblado?",
      options: [
        { text: "120 km/h", comment: "Prohibido para autobuses" },
        { text: "100 km/h", comment: "Correcto: es su límite máximo en estas vías" },
        { text: "90 km/h", comment: "Límite para camiones" },
        { text: "80 km/h", comment: "Velocidad mínima en ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 4,
      category: "Autopistas / Autovías",
      question: "¿A qué velocidad debe circular un camión de más de 3500 kg por autopista?",
      options: [
        { text: "100 km/h", comment: "Para autobuses" },
        { text: "80 km/h", comment: "Límite para camiones en carreteras convencionales" },
        { text: "90 km/h", comment: "Correcto: límite máximo para vehículos pesados en autopista" },
        { text: "120 km/h", comment: "Terminantemente prohibido" }
      ],
      correctIndex: 2
    },
    {
      id: 5,
      category: "Autopistas / Autovías",
      question: "¿Límite para un turismo con remolque ligero (hasta 750 kg) en autovía?",
      options: [
        { text: "120 km/h", comment: "Solo sin remolque" },
        { text: "100 km/h", comment: "Incorrecto: el remolque reduce el límite" },
        { text: "90 km/h", comment: "Correcto: cualquier conjunto de vehículos en autovía se limita a 90" },
        { text: "70 km/h", comment: "Demasiado lento" }
      ],
      correctIndex: 2
    },
    {
      id: 6,
      category: "Autopistas / Autovías",
      question: "¿Cuál es la velocidad máxima para un vehículo mixto adaptable en autopista?",
      options: [
        { text: "120 km/h", comment: "Para turismos" },
        { text: "100 km/h", comment: "Correcto: están equiparados al grupo de autobuses" },
        { text: "90 km/h", comment: "Para camiones" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 7,
      category: "Autopistas / Autovías",
      question: "¿Velocidad máxima para un pick-up en autovía interurbana?",
      options: [
        { text: "120 km/h", comment: "Correcto: se les aplica la misma norma que a los turismos" },
        { text: "90 km/h", comment: "Para camiones" },
        { text: "100 km/h", comment: "Para autobuses" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 0
    },
    {
      id: 8,
      category: "Autopistas / Autovías",
      question: "¿Velocidad máxima para una autocaravana de más de 3500 kg en autopista?",
      options: [
        { text: "120 km/h", comment: "Para autocaravanas ligeras" },
        { text: "90 km/h", comment: "Correcto: están equiparadas a los camiones" },
        { text: "100 km/h", comment: "Para autobuses" },
        { text: "60 km/h", comment: "Velocidad mínima" }
      ],
      correctIndex: 1
    },
    {
      id: 9,
      category: "Autopistas / Autovías",
      question: "¿A qué velocidad puede circular una moto por una autopista dentro de poblado?",
      options: [
        { text: "120 km/h", comment: "Límite fuera de poblado" },
        { text: "50 km/h", comment: "Límite de calles convencionales" },
        { text: "80 km/h", comment: "Correcto: límite especial para travesías de autopista" },
        { text: "30 km/h", comment: "Para calles estrechas" }
      ],
      correctIndex: 2
    },
    {
      id: 10,
      category: "Autopistas / Autovías",
      question: "¿Cuál es la velocidad mínima permitida para un turismo en autopista?",
      options: [
        { text: "50 km/h", comment: "Incorrecto" },
        { text: "60 km/h", comment: "Correcto: circular más lento se considera anormal" },
        { text: "45 km/h", comment: "Mínima en carretera convencional" },
        { text: "90 km/h", comment: "Límite para camiones" }
      ],
      correctIndex: 1
    },
    {
      id: 11,
      category: "Autopistas / Autovías",
      question: "¿Velocidad máxima para un transporte escolar en autopista?",
      options: [
        { text: "100 km/h", comment: "Para autobuses normales" },
        { text: "90 km/h", comment: "Correcto: deben reducir 10 km/h fuera de poblado" },
        { text: "80 km/h", comment: "Para mercancías peligrosas" },
        { text: "120 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 12,
      category: "Autopistas / Autovías",
      question: "¿Límite de velocidad para un camión con mercancías peligrosas en autovía?",
      options: [
        { text: "90 km/h", comment: "Para camión normal" },
        { text: "80 km/h", comment: "Correcto: el límite se reduce en 10 km/h" },
        { text: "70 km/h", comment: "Para vehículos especiales" },
        { text: "100 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 13,
      category: "Autopistas / Autovías",
      question: "¿Velocidad máxima de un cuadriciclo pesado (Quad) en vía rápida?",
      options: [
        { text: "120 km/h", comment: "Demasiado" },
        { text: "45 km/h", comment: "Para ciclomotores" },
        { text: "70 km/h", comment: "Correcto: es su límite constructivo y legal" },
        { text: "90 km/h", comment: "Para camiones" }
      ],
      correctIndex: 2
    },
    {
      id: 14,
      category: "Autopistas / Autovías",
      question: "¿Velocidad de un vehículo especial que puede superar los 60 km/h en autopista?",
      options: [
        { text: "40 km/h", comment: "Estándar para vehículos especiales" },
        { text: "70 km/h", comment: "Correcto: límite superior para especiales rápidos" },
        { text: "90 km/h", comment: "Para camiones" },
        { text: "120 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 15,
      category: "Autopistas / Autovías",
      question: "¿Velocidad máxima para un turismo con remolque pesado (>750 kg) en autovía?",
      options: [
        { text: "120 km/h", comment: "Sin remolque" },
        { text: "100 km/h", comment: "Para autobuses" },
        { text: "90 km/h", comment: "Correcto: todos los remolques se limitan a 90" },
        { text: "80 km/h", comment: "Para camiones fuera de autovía" }
      ],
      correctIndex: 2
    },
    {
      id: 16,
      category: "Carreteras Convencionales",
      question: "¿A qué velocidad máxima puede circular un turismo en carretera convencional?",
      options: [
        { text: "100 km/h", comment: "Límite antiguo" },
        { text: "90 km/h", comment: "Correcto: límite estándar para turismos y motos" },
        { text: "80 km/h", comment: "Para camiones" },
        { text: "120 km/h", comment: "Solo en autopistas" }
      ],
      correctIndex: 1
    },
    {
      id: 17,
      category: "Carreteras Convencionales",
      question: "¿Límite de velocidad para una moto en carretera convencional fuera de poblado?",
      options: [
        { text: "100 km/h", comment: "Prohibido: el margen para adelantar se eliminó" },
        { text: "90 km/h", comment: "Correcto: norma general para dos ruedas" },
        { text: "110 km/h", comment: "Incorrecto" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 18,
      category: "Carreteras Convencionales",
      question: "¿Velocidad máxima de un autobús en carretera convencional?",
      options: [
        { text: "100 km/h", comment: "Solo en autopistas" },
        { text: "90 km/h", comment: "Correcto: en convencionales van como los turismos" },
        { text: "80 km/h", comment: "Para camiones" },
        { text: "70 km/h", comment: "Para mercancías peligrosas" }
      ],
      correctIndex: 1
    },
    {
      id: 19,
      category: "Carreteras Convencionales",
      question: "¿Velocidad de un camión o furgón en carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Para turismos" },
        { text: "80 km/h", comment: "Correcto: transporte de carga 10 km/h más lento" },
        { text: "70 km/h", comment: "Dentro de poblado" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 20,
      category: "Carreteras Convencionales",
      question: "¿Límite para un vehículo con cualquier remolque en carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Sin remolque" },
        { text: "80 km/h", comment: "Correcto: los conjuntos están equiparados a camiones" },
        { text: "70 km/h", comment: "Para transporte escolar" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 21,
      category: "Carreteras Convencionales",
      question: "¿Velocidad máxima de un ciclomotor por el arcén de carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Para coches" },
        { text: "45 km/h", comment: "Correcto: su límite constructivo y legal" },
        { text: "25 km/h", comment: "Para patinetes" },
        { text: "30 km/h", comment: "Para tractores" }
      ],
      correctIndex: 1
    },
    {
      id: 22,
      category: "Carreteras Convencionales",
      question: "¿A qué velocidad puede circular un ciclo (bicicleta) en vía interurbana?",
      options: [
        { text: "20 km/h", comment: "Demasiado lento" },
        { text: "45 km/h", comment: "Correcto: límite general para ciclos fuera de ciudad" },
        { text: "90 km/h", comment: "Peligroso" },
        { text: "60 km/h", comment: "Para vehículos especiales" }
      ],
      correctIndex: 1
    },
    {
      id: 23,
      category: "Carreteras Convencionales",
      question: "¿Velocidad de un camión con mercancías peligrosas en carretera convencional?",
      options: [
        { text: "80 km/h", comment: "Para camión normal" },
        { text: "70 km/h", comment: "Correcto: 10 km/h menos del límite principal" },
        { text: "90 km/h", comment: "Para turismos" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 24,
      category: "Carreteras Convencionales",
      question: "¿Transporte escolar en carretera convencional: cuál es su límite?",
      options: [
        { text: "90 km/h", comment: "Para autobús normal" },
        { text: "80 km/h", comment: "Correcto: debe reducir 10 km/h fuera de poblado" },
        { text: "70 km/h", comment: "Para mercancías peligrosas" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 25,
      category: "Carreteras Convencionales",
      question: "¿Velocidad en una vía sin pavimentar para cualquier vehículo?",
      options: [
        { text: "90 km/h", comment: "Para asfalto" },
        { text: "30 km/h", comment: "Correcto: límite único para todos en tierra" },
        { text: "20 km/h", comment: "Zonas residenciales" },
        { text: "50 km/h", comment: "Para poblado" }
      ],
      correctIndex: 1
    },
    {
      id: 26,
      category: "Carreteras Convencionales",
      question: "¿Cuál es la velocidad mínima para un turismo en carretera convencional (máx 90 km/h)?",
      options: [
        { text: "60 km/h", comment: "Mínima en autopista" },
        { text: "45 km/h", comment: "Correcto: la mitad del máximo establecido" },
        { text: "30 km/h", comment: "Para tractores" },
        { text: "40 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 27,
      category: "Carreteras Convencionales",
      question: "¿Límite de velocidad para una motocicleta de tres ruedas (Triciclo) en carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Para las de dos ruedas" },
        { text: "70 km/h", comment: "Correcto: los triciclos tienen su propio límite" },
        { text: "80 km/h", comment: "Para camiones" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 28,
      category: "Carreteras Convencionales",
      question: "¿Velocidad máxima de un tractor sin remolque en carretera convencional?",
      options: [
        { text: "40 km/h", comment: "Correcto: límite estándar para vehículos especiales autopropulsados" },
        { text: "25 km/h", comment: "Para tractor con remolque" },
        { text: "70 km/h", comment: "Para especiales rápidos" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 0
    },
    {
      id: 29,
      category: "Carreteras Convencionales",
      question: "¿Velocidad de un tractor que arrastra un remolque agrícola en carretera convencional?",
      options: [
        { text: "40 km/h", comment: "Sin remolque" },
        { text: "25 km/h", comment: "Correcto: el remolque reduce la velocidad del especial" },
        { text: "10 km/h", comment: "Demasiado lento" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 30,
      category: "Carreteras Convencionales",
      question: "¿Vehículo especial sin luces de freno: cuál es su límite?",
      options: [
        { text: "40 km/h", comment: "Para vehículo funcional" },
        { text: "25 km/h", comment: "Correcto: la falta de señales limita estrictamente la velocidad" },
        { text: "70 km/h", comment: "Para vehículos rápidos" },
        { text: "15 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 31,
      category: "Vías Urbanas",
      question: "¿Cuál es la velocidad de cualquier vehículo en calle urbana con DOS o más carriles?",
      options: [
        { text: "30 km/h", comment: "Para calles estrechas" },
        { text: "50 km/h", comment: "Correcto: límite estándar para vías anchas" },
        { text: "20 km/h", comment: "Zonas residenciales" },
        { text: "80 km/h", comment: "Para autopistas" }
      ],
      correctIndex: 1
    },
    {
      id: 32,
      category: "Vías Urbanas",
      question: "¿Límite de velocidad en calle con UN solo carril para el sentido de la circulación?",
      options: [
        { text: "50 km/h", comment: "Para avenidas" },
        { text: "30 km/h", comment: "Correcto: nueva norma para calles de carril único" },
        { text: "20 km/h", comment: "Para plataformas únicas" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 33,
      category: "Vías Urbanas",
      question: "¿Cuál es la velocidad en calle con 'plataforma única'?",
      options: [
        { text: "30 km/h", comment: "Calles normales" },
        { text: "20 km/h", comment: "Correcto: límite estricto para seguridad del peatón" },
        { text: "10 km/h", comment: "Demasiado lento" },
        { text: "50 km/h", comment: "Peligroso" }
      ],
      correctIndex: 1
    },
    {
      id: 34,
      category: "Vías Urbanas",
      question: "¿Transporte de mercancías peligrosas en ciudad en calle donde el máximo es 50?",
      options: [
        { text: "50 km/h", comment: "Para vehículos normales" },
        { text: "40 km/h", comment: "Correcto: menos 10 km/h del límite de la calle" },
        { text: "30 km/h", comment: "Incorrecto" },
        { text: "20 km/h", comment: "Zonas residenciales" }
      ],
      correctIndex: 1
    },
    {
      id: 35,
      category: "VMP",
      question: "¿Límite de velocidad para un patinete eléctrico (VMP) en ciudad?",
      options: [
        { text: "45 km/h", comment: "Para ciclomotores" },
        { text: "30 km/h", comment: "Para calles" },
        { text: "25 km/h", comment: "Correcto: máximo legal para patinetes" },
        { text: "6 km/h", comment: "Umbral mínimo" }
      ],
      correctIndex: 2
    },
    {
      id: 36,
      category: "Transporte Escolar",
      question: "¿A qué velocidad puede circular un transporte escolar en ciudad en calle de dos carriles?",
      options: [
        { text: "40 km/h", comment: "Para mercancías peligrosas" },
        { text: "50 km/h", comment: "Correcto: en ciudad el límite para escolares NO se reduce" },
        { text: "30 km/h", comment: "Calles estrechas" },
        { text: "60 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 37,
      category: "Ciclomotores",
      question: "¿Cuál es el límite de velocidad para un ciclomotor en cualquier calle de poblado?",
      options: [
        { text: "50 km/h", comment: "Para coches" },
        { text: "45 km/h", comment: "Correcto: no puede superar su límite técnico" },
        { text: "30 km/h", comment: "Si hay un carril" },
        { text: "25 km/h", comment: "Para patinetes" }
      ],
      correctIndex: 1
    },
    {
      id: 38,
      category: "Travesía",
      question: "¿Tramo de carretera que atraviesa un poblado (Travesía): límite para turismo?",
      options: [
        { text: "90 km/h", comment: "Para carretera fuera de poblado" },
        { text: "50 km/h", comment: "Correcto: la travesía se considera zona urbana" },
        { text: "80 km/h", comment: "Para autopistas en ciudad" },
        { text: "30 km/h", comment: "Si hay un carril" }
      ],
      correctIndex: 1
    },
    {
      id: 39,
      category: "Mínimas",
      question: "¿Cuál es la velocidad mínima permitida en ciudad en calle con límite de 50 km/h?",
      options: [
        { text: "30 km/h", comment: "Incorrecto" },
        { text: "25 km/h", comment: "Correcto: la mitad del máximo permitido" },
        { text: "15 km/h", comment: "Para calles con límite 30" },
        { text: "20 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 40,
      category: "Zonas Residenciales",
      question: "¿Cuál es el límite de velocidad en zona residencial (señal azul)?",
      options: [
        { text: "30 km/h", comment: "Norma general" },
        { text: "20 km/h", comment: "Correcto: límite estricto para seguridad de residentes" },
        { text: "10 km/h", comment: "Demasiado lento" },
        { text: "50 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 41,
      category: "Remolques",
      question: "¿Velocidad máxima de una moto con remolque en autopista?",
      options: [
        { text: "120 km/h", comment: "Sin remolque" },
        { text: "90 km/h", comment: "Para camiones" },
        { text: "108 km/h", comment: "Correcto: el límite se reduce un 10% (120 - 12 = 108)" },
        { text: "100 km/h", comment: "Para autobuses" }
      ],
      correctIndex: 2
    },
    {
      id: 42,
      category: "Quads",
      question: "¿Límite para un cuadriciclo pesado con remolque en carretera convencional?",
      options: [
        { text: "70 km/h", comment: "Sin remolque" },
        { text: "63 km/h", comment: "Correcto: el límite se reduce un 10% (70 - 7 = 63)" },
        { text: "45 km/h", comment: "Límite de ciclomotor" },
        { text: "90 km/h", comment: "Para turismos" }
      ],
      correctIndex: 1
    },
    {
      id: 43,
      category: "Cuadriciclos",
      question: "¿A qué velocidad puede circular un cuadriciclo ligero con remolque?",
      options: [
        { text: "45 km/h", comment: "Sin remolque" },
        { text: "40.5 km/h", comment: "Correcto: límite de 45 km/h menos el 10%" },
        { text: "25 km/h", comment: "Incorrecto" },
        { text: "50 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 44,
      category: "Bicicletas",
      question: "¿Condición de velocidad y horario para una bicicleta con remolque?",
      options: [
        { text: "45 km/h de noche", comment: "Peligroso" },
        { text: "25 km/h siempre", comment: "Incorrecto" },
        { text: "Reducir un 10% y solo de día", comment: "Correcto: prohibido circular de noche" },
        { text: "30 km/h", comment: "Vías sin pavimentar" }
      ],
      correctIndex: 2
    },
    {
      id: 45,
      category: "Triciclos",
      question: "¿Límite de velocidad para un triciclo en carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Para los de dos ruedas" },
        { text: "70 km/h", comment: "Correcto: categoría especial de límite para triciclos" },
        { text: "80 km/h", comment: "Para camiones" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 46,
      category: "Mercancías Peligrosas",
      question: "¿Velocidad máxima para vehículo con mercancías peligrosas en calle con límite 30?",
      options: [
        { text: "30 km/h", comment: "Para turismos normales" },
        { text: "20 km/h", comment: "Correcto: la regla 'menos 10' también se aplica aquí" },
        { text: "15 km/h", comment: "Demasiado lento" },
        { text: "10 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 47,
      category: "Remolques",
      question: "¿Límite para turismo con cualquier remolque en carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Sin remolque" },
        { text: "80 km/h", comment: "Correcto: los conjuntos se equiparan a camiones" },
        { text: "70 km/h", comment: "Para escolares" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 48,
      category: "Señales Técnicas",
      question: "¿Velocidad de un vehículo con señal '40' (V-5)?",
      options: [
        { text: "40 km/h", comment: "Correcto: su límite técnico y legal" },
        { text: "70 km/h", comment: "Incorrecto" },
        { text: "25 km/h", comment: "Para vehículos especiales" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 0
    },
    {
      id: 49,
      category: "Motocicletas",
      question: "¿Velocidad máxima para una moto en vía sin pavimentar?",
      options: [
        { text: "90 km/h", comment: "En asfalto" },
        { text: "30 km/h", comment: "Correcto: límite único en tierra para todos" },
        { text: "45 km/h", comment: "Para ciclomotores" },
        { text: "20 km/h", comment: "En zonas residenciales" }
      ],
      correctIndex: 1
    },
    {
      id: 50,
      category: "Autobuses",
      question: "¿Límite de velocidad para un autobús con remolque en autopista?",
      options: [
        { text: "100 km/h", comment: "Sin remolque" },
        { text: "90 km/h", comment: "Correcto: cualquier remolque en autopista es 90" },
        { text: "80 km/h", comment: "En ciudad" },
        { text: "120 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 51,
      category: "Mercancías Peligrosas",
      question: "¿Cuál es la velocidad de un camión con mercancías peligrosas en autopista?",
      options: [
        { text: "90 km/h", comment: "Camión normal" },
        { text: "80 km/h", comment: "Correcto: menos 10 km/h para mercancías peligrosas" },
        { text: "70 km/h", comment: "Para vehículos especiales" },
        { text: "100 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 52,
      category: "Transporte Escolar",
      question: "¿Velocidad del transporte escolar en carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Autobús normal" },
        { text: "80 km/h", comment: "Correcto: debe reducir velocidad fuera de poblado" },
        { text: "70 km/h", comment: "Mercancías peligrosas" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 53,
      category: "Condiciones Especiales",
      question: "¿Límite de velocidad en vía sin pavimentar?",
      options: [
        { text: "90 km/h", comment: "Para asfalto" },
        { text: "50 km/h", comment: "Para poblado" },
        { text: "30 km/h", comment: "Correcto: límite único en tierra para todos" },
        { text: "20 km/h", comment: "Zona residencial" }
      ],
      correctIndex: 2
    },
    {
      id: 54,
      category: "Vehículos Especiales",
      question: "¿Velocidad máxima de vehículo especial con remolque en vía interurbana?",
      options: [
        { text: "40 km/h", comment: "Sin remolque" },
        { text: "25 km/h", comment: "Correcto: el remolque reduce el límite a esta marca" },
        { text: "45 km/h", comment: "Para ciclomotores" },
        { text: "70 km/h", comment: "Especiales rápidos" }
      ],
      correctIndex: 1
    },
    {
      id: 55,
      category: "Mercancías Peligrosas",
      question: "¿Velocidad de un turismo con carga peligrosa en ciudad a límite 50?",
      options: [
        { text: "50 km/h", comment: "Límite normal" },
        { text: "40 km/h", comment: "Correcto: en ciudad el límite también se reduce en 10" },
        { text: "30 km/h", comment: "Calle estrecha" },
        { text: "20 km/h", comment: "Zona residencial" }
      ],
      correctIndex: 1
    },
    {
      id: 56,
      category: "Triciclos",
      question: "¿Velocidad máxima para un vehículo de tres ruedas (Triciclo) en autopista?",
      options: [
        { text: "120 km/h", comment: "Para motocicletas" },
        { text: "90 km/h", comment: "Para camiones" },
        { text: "70 km/h", comment: "Correcto: los triciclos tienen un límite estricto" },
        { text: "100 km/h", comment: "Para autobuses" }
      ],
      correctIndex: 2
    },
    {
      id: 57,
      category: "Vehículos Especiales",
      question: "¿Velocidad de un motocultor conducido por persona a pie?",
      options: [
        { text: "40 km/h", comment: "Para vehículos especiales" },
        { text: "25 km/h", comment: "Correcto: límite para motocultores" },
        { text: "10 km/h", comment: "Demasiado lento" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 58,
      category: "Autobuses",
      question: "¿Velocidad de un autobús articulado en autopista?",
      options: [
        { text: "120 km/h", comment: "Prohibido" },
        { text: "100 km/h", comment: "Correcto: mismo límite que autobús normal" },
        { text: "90 km/h", comment: "Para camiones" },
        { text: "80 km/h", comment: "En ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 59,
      category: "Derivado de Turismo",
      question: "¿Límite para vehículo derivado de turismo en carretera convencional?",
      options: [
        { text: "100 km/h", comment: "En autopista" },
        { text: "90 km/h", comment: "Correcto: van como los turismos" },
        { text: "80 km/h", comment: "Para camiones" },
        { text: "70 km/h", comment: "Vehículos especiales" }
      ],
      correctIndex: 1
    },
    {
      id: 60,
      category: "Túneles",
      question: "¿Velocidad de un turismo en túnel de autopista sin señales adicionales?",
      options: [
        { text: "80 km/h", comment: "Incorrecto" },
        { text: "100 km/h", comment: "Incorrecto" },
        { text: "120 km/h", comment: "Correcto: rigen los límites generales de la vía" },
        { text: "60 km/h", comment: "Mínima" }
      ],
      correctIndex: 2
    },
    {
      id: 61,
      category: "Vías Urbanas",
      question: "¿Velocidad en calle con plataforma única?",
      options: [
        { text: "30 km/h", comment: "Calles normales" },
        { text: "20 km/h", comment: "Correcto: para protección de peatones" },
        { text: "10 km/h", comment: "Demasiado lento" },
        { text: "50 km/h", comment: "Peligroso" }
      ],
      correctIndex: 1
    },
    {
      id: 62,
      category: "Transporte Escolar",
      question: "¿Velocidad del transporte escolar en ciudad en calle de dos carriles?",
      options: [
        { text: "40 km/h", comment: "Reducción de 10 km/h" },
        { text: "50 km/h", comment: "Correcto: en ciudad el límite NO se reduce" },
        { text: "30 km/h", comment: "Calle estrecha" },
        { text: "60 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 63,
      category: "VMP",
      question: "¿Límite de velocidad для un patinete eléctrico (VMP) en carril bici?",
      options: [
        { text: "45 km/h", comment: "Para ciclomotores" },
        { text: "6 km/h", comment: "Para juguetes" },
        { text: "25 km/h", comment: "Correcto: límite constructivo para VMP" },
        { text: "30 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 2
    },
    {
      id: 64,
      category: "Zonas Residenciales",
      question: "¿Velocidad de una bicicleta (Ciclo) en zona residencial?",
      options: [
        { text: "30 km/h", comment: "Norma general" },
        { text: "20 km/h", comment: "Correcto: el límite afecta a todos" },
        { text: "45 km/h", comment: "Límite en carretera" },
        { text: "15 km/h", comment: "Demasiado lento" }
      ],
      correctIndex: 1
    },
    {
      id: 65,
      category: "Travesía",
      question: "¿Velocidad de una moto en travesía (tramo de carretera por poblado)?",
      options: [
        { text: "90 km/h", comment: "Para carretera" },
        { text: "50 km/h", comment: "Correcto: la travesía se considera zona urbana" },
        { text: "80 km/h", comment: "Para autopistas en ciudad" },
        { text: "30 km/h", comment: "Calle estrecha" }
      ],
      correctIndex: 1
    },
    {
      id: 66,
      category: "Mínimas",
      question: "¿Velocidad mínima en ciudad en calle con límite 30?",
      options: [
        { text: "25 km/h", comment: "Para límite 50" },
        { text: "20 km/h", comment: "Incorrecto" },
        { text: "15 km/h", comment: "Correcto: la mitad del máximo" },
        { text: "10 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 2
    },
    {
      id: 67,
      category: "Cuadriciclos",
      question: "¿Velocidad de un cuadriciclo ligero en ciudad en cualquier calle?",
      options: [
        { text: "50 km/h", comment: "Si hay muchos carriles" },
        { text: "45 km/h", comment: "Correcto: su límite constructivo" },
        { text: "30 km/h", comment: "Si hay pocos carriles" },
        { text: "25 km/h", comment: "Para patinetes" }
      ],
      correctIndex: 1
    },
    {
      id: 68,
      category: "Vías Urbanas",
      question: "¿Velocidad en zona 'Calle 30'?",
      options: [
        { text: "50 km/h", comment: "Para avenidas" },
        { text: "30 km/h", comment: "Correcto: estándar para estas calles" },
        { text: "20 km/h", comment: "Para plataformas" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 69,
      category: "Conjuntos de Vehículos",
      question: "¿Velocidad de un tren de carretera en autopista?",
      options: [
        { text: "120 km/h", comment: "Para turismos" },
        { text: "100 km/h", comment: "Para autobuses" },
        { text: "90 km/h", comment: "Correcto: todos los conjuntos en autopista están limitados a esto" },
        { text: "80 km/h", comment: "Mínima" }
      ],
      correctIndex: 2
    },
    {
      id: 70,
      category: "Conjuntos de Vehículos",
      question: "¿Velocidad de un vehículo articulado en carretera convencional?",
      options: [
        { text: "90 km/h", comment: "Para turismos" },
        { text: "80 km/h", comment: "Correcto: se equiparan a camiones" },
        { text: "70 km/h", comment: "Para vehículos especiales" },
        { text: "45 km/h", comment: "Para ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 71,
      category: "Ciclomotores",
      question: "¿Límite de velocidad de un ciclomotor de tres ruedas fuera de poblado?",
      options: [
        { text: "70 km/h", comment: "Para triciclos" },
        { text: "45 km/h", comment: "Correcto: cualquier ciclomotor está limitado a esta cifra" },
        { text: "25 km/h", comment: "Para patinetes" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 72,
      category: "Vías de Tierra",
      question: "¿Velocidad de un cuadriciclo pesado (Quad) por vía sin pavimentar?",
      options: [
        { text: "70 km/h", comment: "Límite en asfalto" },
        { text: "30 km/h", comment: "Correcto: el límite de la vía anula el del vehículo" },
        { text: "45 km/h", comment: "Incorrecto" },
        { text: "20 km/h", comment: "En zona residencial" }
      ],
      correctIndex: 1
    },
    {
      id: 73,
      category: "Mínimas",
      question: "¿Velocidad mínima en autopista para un camión?",
      options: [
        { text: "90 km/h", comment: "Su máximo" },
        { text: "60 km/h", comment: "Correcto: la mínima es igual para todos los vehículos" },
        { text: "45 km/h", comment: "Incorrecto" },
        { text: "80 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 74,
      category: "Señales Técnicas",
      question: "¿Límite de velocidad para vehículo con señal V-4 (25)?",
      options: [
        { text: "40 km/h", comment: "Para vehículos especiales" },
        { text: "25 km/h", comment: "Correcto: debe respetar el límite de su señal" },
        { text: "45 km/h", comment: "Para ciclomotores" },
        { text: "30 km/h", comment: "En tierra" }
      ],
      correctIndex: 1
    },
    {
      id: 75,
      category: "Remolque",
      question: "¿Velocidad de remolque de vehículo averiado con barra rígida?",
      options: [
        { text: "90 km/h", comment: "Sin remolque" },
        { text: "80 km/h", comment: "Correcto: se equipara a un conjunto con remolque" },
        { text: "70 km/h", comment: "Incorrecto" },
        { text: "50 km/h", comment: "En ciudad" }
      ],
      correctIndex: 1
    },
    {
      id: 76,
      category: "Pick-up",
      question: "¿Velocidad de un pick-up en carretera convencional?",
      options: [
        { text: "100 km/h", comment: "Si hay separación" },
        { text: "90 km/h", comment: "Correcto: siguen las normas de los turismos" },
        { text: "80 km/h", comment: "Para camiones" },
        { text: "120 km/h", comment: "Para autopista" }
      ],
      correctIndex: 1
    },
    {
      id: 77,
      category: "Vías Urbanas",
      question: "¿Velocidad de un autobús por autopista DENTRO de ciudad?",
      options: [
        { text: "100 km/h", comment: "Límite fuera de ciudad" },
        { text: "80 km/h", comment: "Correcto: tope para todos los vehículos en autopistas urbanas" },
        { text: "50 km/h", comment: "Calles normales" },
        { text: "90 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 78,
      category: "Vehículos Mixtos",
      question: "¿Límite de vehículo mixto en vía para automóviles?",
      options: [
        { text: "100 km/h", comment: "En autopista" },
        { text: "90 km/h", comment: "Correcto: van como los autobuses" },
        { text: "120 km/h", comment: "Prohibido" },
        { text: "80 km/h", comment: "Camiones" }
      ],
      correctIndex: 1
    },
    {
      id: 79,
      category: "Mercancías Peligrosas",
      question: "¿Velocidad de transporte de mercancías peligrosas en moto en ciudad?",
      options: [
        { text: "50 km/h", comment: "Moto normal" },
        { text: "40 km/h", comment: "Correcto: la regla 'menos 10' es universal" },
        { text: "25 km/h", comment: "Para patinetes" },
        { text: "30 km/h", comment: "Calle estrecha" }
      ],
      correctIndex: 1
    },
    {
      id: 80,
      category: "Vehículos Especiales",
      question: "¿Velocidad de vehículo especial en autovía, si su máx es 80?",
      options: [
        { text: "40 km/h", comment: "Límite general" },
        { text: "60 km/h", comment: "Mínima de autovía" },
        { text: "70 km/h", comment: "Correcto: los especiales rápidos se limitan a esto" },
        { text: "80 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 2
    },
    {
      id: 81,
      category: "Túneles",
      question: "¿Distancia mínima de seguridad para un turismo en un túnel?",
      options: [
        { text: "50 metros", comment: "Para camiones fuera de túnel" },
        { text: "100 metros (4 seg)", comment: "Correcto: mínimo obligatorio en túnel" },
        { text: "150 metros", comment: "Para vehículos pesados" },
        { text: "La de seguridad", comment: "No es suficiente" }
      ],
      correctIndex: 1
    },
    {
      id: 82,
      category: "Túneles",
      question: "¿Distancia obligatoria para camión de 5000 kg en un túnel?",
      options: [
        { text: "100 metros", comment: "Para turismos" },
        { text: "50 metros", comment: "Para carreteras normales" },
        { text: "150 metros (6 seg)", comment: "Correcto: requisito mayor para pesados" },
        { text: "200 metros", comment: "Incorrecto" }
      ],
      correctIndex: 2
    },
    {
      id: 83,
      category: "Distancias",
      question: "¿Distancia entre camiones >3,5t или longitud >10m fuera de poblado?",
      options: [
        { text: "100 metros", comment: "Incorrecto" },
        { text: "50 metros", comment: "Correcto: mínimo fijo para pesados/largos" },
        { text: "150 metros", comment: "Incorrecto" },
        { text: "4 segundos", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 84,
      category: "Travesía",
      question: "¿Velocidad del transporte escolar en Travesía?",
      options: [
        { text: "50 km/h", comment: "Correcto: en ciudad el límite NO se reduce" },
        { text: "40 km/h", comment: "Para peligrosas" },
        { text: "30 km/h", comment: "Calle estrecha" },
        { text: "60 km/h", comment: "Prohibido" }
      ],
      correctIndex: 0
    },
    {
      id: 85,
      category: "Mercancías Peligrosas",
      question: "¿Velocidad de vehículo con peligrosas en autopista DENTRO de ciudad?",
      options: [
        { text: "80 km/h", comment: "Límite general de vía" },
        { text: "70 km/h", comment: "Correcto: 'menos 10' se aplica también en autopistas" },
        { text: "50 km/h", comment: "Calles normales" },
        { text: "40 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 86,
      category: "VMP",
      question: "¿Velocidad de patinete eléctrico (VMP) por carril bici en ciudad?",
      options: [
        { text: "45 km/h", comment: "Para ciclomotores" },
        { text: "25 km/h", comment: "Correcto: límite constructivo absoluto" },
        { text: "30 km/h", comment: "Calle estrecha" },
        { text: "15 km/h", comment: "Zona peatonal" }
      ],
      correctIndex: 1
    },
    {
      id: 87,
      category: "Vías Urbanas",
      question: "¿Velocidad máxima de cualquier vehículo en calle urbana de un carril?",
      options: [
        { text: "50 km/h", comment: "Multicarril" },
        { text: "30 km/h", comment: "Correcto: estándar para calles de carril único" },
        { text: "20 km/h", comment: "Plataformas" },
        { text: "45 km/h", comment: "Ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 88,
      category: "Zonas Residenciales",
      question: "¿Velocidad en calle residencial (señal azul)?",
      options: [
        { text: "30 km/h", comment: "Calle normal" },
        { text: "20 km/h", comment: "Correcto: límite para zonas con prioridad peatonal" },
        { text: "10 km/h", comment: "Demasiado lento" },
        { text: "50 km/h", comment: "Prohibido" }
      ],
      correctIndex: 1
    },
    {
      id: 89,
      category: "Averías",
      question: "¿Velocidad de vehículo especial если no tiene luces de freno?",
      options: [
        { text: "40 km/h", comment: "Para técnica funcional" },
        { text: "25 km/h", comment: "Correcto: la avería técnica reduce el límite" },
        { text: "70 km/h", comment: "Especiales rápidos" },
        { text: "10 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 90,
      category: "Condiciones Meteorológicas",
      question: "¿Velocidad de un turismo con nieve (Nivel Rojo)?",
      options: [
        { text: "60 km/h", comment: "Para nivel amarillo" },
        { text: "30 km/h", comment: "Correcto: límite obligatorio al usar cadenas" },
        { text: "50 km/h", comment: "Incorrecto" },
        { text: "20 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 91,
      category: "Carreteras",
      question: "¿Velocidad máxima de un turismo en vía para automóviles?",
      options: [
        { text: "120 km/h", comment: "Para autopistas" },
        { text: "90 km/h", comment: "Correcto: límite igual que en carretera convencional" },
        { text: "100 km/h", comment: "Si hay separación" },
        { text: "80 km/h", comment: "Camiones" }
      ],
      correctIndex: 1
    },
    {
      id: 92,
      category: "Autobuses",
      question: "¿Velocidad de autobús por vía para automóviles?",
      options: [
        { text: "100 km/h", comment: "Para autopistas" },
        { text: "90 km/h", comment: "Correcto: aquí están equiparados a los turismos" },
        { text: "80 km/h", comment: "Camiones" },
        { text: "70 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 93,
      category: "Camiones",
      question: "¿Límite de velocidad para un camión en vía para automóviles?",
      options: [
        { text: "90 km/h", comment: "Turismos" },
        { text: "80 km/h", comment: "Correcto: los camiones siempre van más lento" },
        { text: "70 km/h", comment: "Peligrosas" },
        { text: "100 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    },
    {
      id: 94,
      category: "Vías Urbanas",
      question: "¿Velocidad en calle con plataforma única (sin bordillo)?",
      options: [
        { text: "50 km/h", comment: "Avenidas" },
        { text: "30 km/h", comment: "Calles normales" },
        { text: "20 km/h", comment: "Correcto: para protección de peatones" },
        { text: "45 km/h", comment: "Ciclomotores" }
      ],
      correctIndex: 2
    },
    {
      id: 95,
      category: "Ciclomotores",
      question: "¿Velocidad máxima para un ciclomotor por el arcén?",
      options: [
        { text: "50 km/h", comment: "Límite urbano" },
        { text: "45 km/h", comment: "Correcto: nunca debe superar sus 45" },
        { text: "30 km/h", comment: "Incorrecto" },
        { text: "25 km/h", comment: "Patinetes" }
      ],
      correctIndex: 1
    },
    {
      id: 96,
      category: "Mínimas",
      question: "¿Velocidad mínima de un turismo en autopista?",
      options: [
        { text: "45 km/h", comment: "Para carreteras normales" },
        { text: "50 km/h", comment: "Incorrecto" },
        { text: "60 km/h", comment: "Correcto: mínima fija" },
        { text: "70 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 2
    },
    {
      id: 97,
      category: "Señales Técnicas",
      question: "¿Velocidad en vehículo con señal V-4 (25)?",
      options: [
        { text: "40 km/h", comment: "Límite especiales" },
        { text: "25 km/h", comment: "Correcto: debe respetar su señal" },
        { text: "30 km/h", comment: "En tierra" },
        { text: "45 km/h", comment: "Ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 98,
      category: "Intersecciones",
      question: "¿Límite de скорость в перекрестке без приоритета?",
      options: [
        { text: "30 km/h", comment: "Incorrecto" },
        { text: "40 km/h", comment: "Incorrecto" },
        { text: "50 km/h", comment: "Correcto: prohibido superar este límite" },
        { text: "60 km/h", comment: "Peligroso" }
      ],
      correctIndex: 2
    },
    {
      id: 99,
      category: "Remolques",
      question: "¿Velocidad máxima de un turismo con remolque fuera de ciudad?",
      options: [
        { text: "90 km/h", comment: "Sin remolque" },
        { text: "80 km/h", comment: "Correcto: los conjuntos se limitan a esto" },
        { text: "70 km/h", comment: "Especiales" },
        { text: "45 km/h", comment: "Ciclomotores" }
      ],
      correctIndex: 1
    },
    {
      id: 100,
      category: "Bicicletas",
      question: "¿Velocidad de una bicicleta por vía de tierra?",
      options: [
        { text: "45 km/h", comment: "Límite en asfalto" },
        { text: "30 km/h", comment: "Correcto: el límite de tierra es obligatorio" },
        { text: "20 km/h", comment: "Zonas residenciales" },
        { text: "15 km/h", comment: "Incorrecto" }
      ],
      correctIndex: 1
    }
  ],
  en: [
    {
      id: 1,
      category: "Motorways",
      question: "What is the maximum speed allowed for a car on a motorway outside built-up areas?",
      options: [
        { text: "90 km/h", comment: "Limit for trucks" },
        { text: "100 km/h", comment: "Limit for buses" },
        { text: "120 km/h", comment: "Correct: general rule for cars" },
        { text: "80 km/h", comment: "Motorway limit inside built-up areas" }
      ],
      correctIndex: 2
    },
    {
      id: 2,
      category: "Motorways",
      question: "What is the speed limit for a motorcycle on an interurban motorway?",
      options: [
        { text: "100 km/h", comment: "Limit for buses" },
        { text: "120 km/h", comment: "Correct: motorcycles have the same limit as cars" },
        { text: "140 km/h", comment: "Prohibited: the 20 km/h margin for overtaking has been removed" },
        { text: "45 km/h", comment: "Limit for mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 3,
      category: "Motorways",
      question: "What is the maximum speed of a bus on a motorway outside built-up areas?",
      options: [
        { text: "120 km/h", comment: "Prohibited for buses" },
        { text: "100 km/h", comment: "Correct: its maximum limit on these roads" },
        { text: "90 km/h", comment: "Limit for trucks" },
        { text: "80 km/h", comment: "Minimum speed in town" }
      ],
      correctIndex: 1
    },
    {
      id: 4,
      category: "Motorways",
      question: "At what speed should a truck over 3500 kg travel on a motorway?",
      options: [
        { text: "100 km/h", comment: "For buses" },
        { text: "80 km/h", comment: "Truck limit on conventional roads" },
        { text: "90 km/h", comment: "Correct: maximum limit for heavy vehicles on motorways" },
        { text: "120 km/h", comment: "Strictly prohibited" }
      ],
      correctIndex: 2
    },
    {
      id: 5,
      category: "Motorways",
      question: "What is the speed limit for a car with a light trailer (up to 750 kg) on a motorway?",
      options: [
        { text: "120 km/h", comment: "Only without a trailer" },
        { text: "100 km/h", comment: "Incorrect: trailer reduces the limit" },
        { text: "90 km/h", comment: "Correct: any vehicle set on motorways is limited to 90" },
        { text: "70 km/h", comment: "Too slow" }
      ],
      correctIndex: 2
    },
    {
      id: 6,
      category: "Motorways",
      question: "What is the maximum speed for a mixed-use vehicle in a motorway?",
      options: [
        { text: "120 km/h", comment: "For passenger cars" },
        { text: "100 km/h", comment: "Correct: they are equated to the bus group" },
        { text: "90 km/h", comment: "For trucks" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 7,
      category: "Motorways",
      question: "Maximum speed for a pick-up on an interurban motorway?",
      options: [
        { text: "120 km/h", comment: "Correct: the same rule applies as for cars" },
        { text: "90 km/h", comment: "For trucks" },
        { text: "100 km/h", comment: "For buses" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 0
    },
    {
      id: 8,
      category: "Motorways",
      question: "What is the maximum speed for a motorhome over 3500 kg on a motorway?",
      options: [
        { text: "120 km/h", comment: "For light motorhomes" },
        { text: "90 km/h", comment: "Correct: they are equated to trucks" },
        { text: "100 km/h", comment: "For buses" },
        { text: "60 km/h", comment: "Minimum speed" }
      ],
      correctIndex: 1
    },
    {
      id: 9,
      category: "Motorways",
      question: "At what speed can a motorcycle travel on a motorway passing through a town?",
      options: [
        { text: "120 km/h", comment: "Limit outside town" },
        { text: "50 km/h", comment: "Limit for conventional streets" },
        { text: "80 km/h", comment: "Correct: special limit for motorway stretches inside towns" },
        { text: "30 km/h", comment: "For narrow streets" }
      ],
      correctIndex: 2
    },
    {
      id: 10,
      category: "Motorways",
      question: "What is the minimum speed allowed for a passenger car on a motorway?",
      options: [
        { text: "50 km/h", comment: "Incorrect" },
        { text: "60 km/h", comment: "Correct: driving slower is considered abnormal" },
        { text: "45 km/h", comment: "Minimum on conventional road" },
        { text: "90 km/h", comment: "Limit for trucks" }
      ],
      correctIndex: 1
    },
    {
      id: 11,
      category: "Motorways",
      question: "What is the maximum speed for school transport on a motorway?",
      options: [
        { text: "100 km/h", comment: "For normal buses" },
        { text: "90 km/h", comment: "Correct: they must reduce 10 km/h outside town" },
        { text: "80 km/h", comment: "For dangerous goods" },
        { text: "120 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 12,
      category: "Motorways",
      question: "Speed limit for a truck with dangerous goods on a motorway?",
      options: [
        { text: "90 km/h", comment: "For normal truck" },
        { text: "80 km/h", comment: "Correct: the limit is reduced by 10 km/h" },
        { text: "70 km/h", comment: "For special vehicles" },
        { text: "100 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 13,
      category: "Motorways",
      question: "Maximum speed of a heavy quadricycle (Quad) on a motorway?",
      options: [
        { text: "120 km/h", comment: "Too much" },
        { text: "45 km/h", comment: "For mopeds" },
        { text: "70 km/h", comment: "Correct: its constructional and legal limit" },
        { text: "90 km/h", comment: "For trucks" }
      ],
      correctIndex: 2
    },
    {
      id: 14,
      category: "Motorways",
      question: "Speed of a special vehicle that can exceed 60 km/h on a motorway?",
      options: [
        { text: "40 km/h", comment: "Standard for special vehicles" },
        { text: "70 km/h", comment: "Correct: higher limit for fast special vehicles" },
        { text: "90 km/h", comment: "For trucks" },
        { text: "120 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 15,
      category: "Motorways",
      question: "What is the maximum speed for a car with a heavy trailer (>750 kg) on a motorway?",
      options: [
        { text: "120 km/h", comment: "Without trailer" },
        { text: "100 km/h", comment: "For buses" },
        { text: "90 km/h", comment: "Correct: all trailers are limited to 90" },
        { text: "80 km/h", comment: "For trucks outside motorways" }
      ],
      correctIndex: 2
    },
    {
      id: 16,
      category: "Conventional Roads",
      question: "What is the maximum speed limit for a passenger car on a conventional road?",
      options: [
        { text: "100 km/h", comment: "Old limit" },
        { text: "90 km/h", comment: "Correct: standard limit for cars and bikes" },
        { text: "80 km/h", comment: "For trucks" },
        { text: "120 km/h", comment: "Only on motorways" }
      ],
      correctIndex: 1
    },
    {
      id: 17,
      category: "Conventional Roads",
      question: "What is the speed limit for a motorcycle on a conventional road outside built-up areas?",
      options: [
        { text: "100 km/h", comment: "Prohibited: the overtaking margin was removed" },
        { text: "90 km/h", comment: "Correct: general rule for two wheels" },
        { text: "110 km/h", comment: "Incorrect" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 18,
      category: "Conventional Roads",
      question: "What is the maximum speed of a bus on a conventional road?",
      options: [
        { text: "100 km/h", comment: "Only on motorways" },
        { text: "90 km/h", comment: "Correct: on conventional roads they go as cars" },
        { text: "80 km/h", comment: "For trucks" },
        { text: "70 km/h", comment: "For dangerous goods" }
      ],
      correctIndex: 1
    },
    {
      id: 19,
      category: "Conventional Roads",
      question: "Speed of a truck or van on a conventional road?",
      options: [
        { text: "90 km/h", comment: "For cars" },
        { text: "80 km/h", comment: "Correct: cargo transport 10 km/h slower" },
        { text: "70 km/h", comment: "Inside built-up stretch" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 1
    },
    {
      id: 20,
      category: "Conventional Roads",
      question: "Limit for a vehicle with any trailer on a conventional road?",
      options: [
        { text: "90 km/h", comment: "Without trailer" },
        { text: "80 km/h", comment: "Correct: sets are equated to trucks" },
        { text: "70 km/h", comment: "For school transport" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 21,
      category: "Conventional Roads",
      question: "Maximum speed of a moped on the shoulder (arcén) of a conventional road?",
      options: [
        { text: "90 km/h", comment: "For cars" },
        { text: "45 km/h", comment: "Correct: its technical and legal limit" },
        { text: "25 km/h", comment: "For scooters" },
        { text: "30 km/h", comment: "For tractors" }
      ],
      correctIndex: 1
    },
    {
      id: 22,
      category: "Conventional Roads",
      question: "At what speed can a cycle (bicycle) travel on an interurban road?",
      options: [
        { text: "20 km/h", comment: "Too slow" },
        { text: "45 km/h", comment: "Correct: general limit for cycles outside town" },
        { text: "90 km/h", comment: "Dangerous" },
        { text: "60 km/h", comment: "For special vehicles" }
      ],
      correctIndex: 1
    },
    {
      id: 23,
      category: "Conventional Roads",
      question: "Speed of a truck with dangerous goods on a conventional road?",
      options: [
        { text: "80 km/h", comment: "For normal truck" },
        { text: "70 km/h", comment: "Correct: 10 km/h less than the main limit" },
        { text: "90 km/h", comment: "For cars" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 1
    },
    {
      id: 24,
      category: "Conventional Roads",
      question: "School transport on a conventional road: what is its limit?",
      options: [
        { text: "90 km/h", comment: "For normal bus" },
        { text: "80 km/h", comment: "Correct: must reduce 10 km/h outside town" },
        { text: "70 km/h", comment: "For dangerous goods" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 1
    },
    {
      id: 25,
      category: "Conventional Roads",
      question: "What is the speed on an unpaved road for any vehicle?",
      options: [
        { text: "90 km/h", comment: "For asphalt" },
        { text: "30 km/h", comment: "Correct: single limit for everyone on dirt" },
        { text: "20 km/h", comment: "Residential zones" },
        { text: "50 km/h", comment: "For towns" }
      ],
      correctIndex: 1
    },
    {
      id: 26,
      category: "Conventional Roads",
      question: "What is the minimum speed for a car on a conventional road (max 90 km/h)?",
      options: [
        { text: "60 km/h", comment: "Minimum on motorways" },
        { text: "45 km/h", comment: "Correct: half of the set maximum" },
        { text: "30 km/h", comment: "For tractors" },
        { text: "40 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 27,
      category: "Conventional Roads",
      question: "Speed limit for a three-wheeled motorcycle (Tricycle) on a conventional road?",
      options: [
        { text: "90 km/h", comment: "For two-wheeled" },
        { text: "70 km/h", comment: "Correct: tricycles have their own limit" },
        { text: "80 km/h", comment: "For trucks" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 28,
      category: "Conventional Roads",
      question: "Maximum speed of a tractor without trailer on a conventional road?",
      options: [
        { text: "40 km/h", comment: "Correct: standard limit for self-propelled special vehicles" },
        { text: "25 km/h", comment: "For tractor with trailer" },
        { text: "70 km/h", comment: "For fast special vehicles" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 0
    },
    {
      id: 29,
      category: "Conventional Roads",
      question: "Speed of a tractor pulling a farm trailer on a conventional road?",
      options: [
        { text: "40 km/h", comment: "Without trailer" },
        { text: "25 km/h", comment: "Correct: the trailer reduces the special vehicle's speed" },
        { text: "10 km/h", comment: "Too slow" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 30,
      category: "Conventional Roads",
      question: "Special vehicle without brake lights — what is its limit?",
      options: [
        { text: "40 km/h", comment: "For functional vehicle" },
        { text: "25 km/h", comment: "Correct: lack of signals strictly limits speed" },
        { text: "70 km/h", comment: "For fast vehicles" },
        { text: "15 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 31,
      category: "Urban Roads",
      question: "What is the speed of any vehicle on an urban street with TWO or more lanes?",
      options: [
        { text: "30 km/h", comment: "For narrow streets" },
        { text: "50 km/h", comment: "Correct: standard limit for wide roads" },
        { text: "20 km/h", comment: "Residential zones" },
        { text: "80 km/h", comment: "For motorways" }
      ],
      correctIndex: 1
    },
    {
      id: 32,
      category: "Urban Roads",
      question: "Speed limit on a street with ONLY one lane for the direction of travel?",
      options: [
        { text: "50 km/h", comment: "For avenues" },
        { text: "30 km/h", comment: "Correct: new rule for single-lane streets" },
        { text: "20 km/h", comment: "For single platforms" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 33,
      category: "Urban Roads",
      question: "What is the speed on a 'single platform' street?",
      options: [
        { text: "30 km/h", comment: "Normal streets" },
        { text: "20 km/h", comment: "Correct: strict limit for pedestrian safety" },
        { text: "10 km/h", comment: "Too slow" },
        { text: "50 km/h", comment: "Dangerous" }
      ],
      correctIndex: 1
    },
    {
      id: 34,
      category: "Urban Roads",
      question: "Dangerous goods transport in town on a street where the maximum is 50?",
      options: [
        { text: "50 km/h", comment: "For normal vehicles" },
        { text: "40 km/h", comment: "Correct: minus 10 km/h from the street's limit" },
        { text: "30 km/h", comment: "Incorrect" },
        { text: "20 km/h", comment: "Residential zones" }
      ],
      correctIndex: 1
    },
    {
      id: 35,
      category: "VMP",
      question: "Speed limit for an electric scooter (VMP) in town?",
      options: [
        { text: "45 km/h", comment: "For mopeds" },
        { text: "30 km/h", comment: "For streets" },
        { text: "25 km/h", comment: "Correct: legal maximum for scooters" },
        { text: "6 km/h", comment: "Minimum threshold" }
      ],
      correctIndex: 2
    },
    {
      id: 36,
      category: "School Transport",
      question: "At what speed can school transport travel in town on a two-lane street?",
      options: [
        { text: "40 km/h", comment: "For dangerous goods" },
        { text: "50 km/h", comment: "Correct: in town the limit for schools is NOT reduced" },
        { text: "30 km/h", comment: "Narrow streets" },
        { text: "60 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 37,
      category: "Mopeds",
      question: "What is the speed limit for a moped on any town street?",
      options: [
        { text: "50 km/h", comment: "For cars" },
        { text: "45 km/h", comment: "Correct: cannot exceed its technical limit" },
        { text: "30 km/h", comment: "If one lane" },
        { text: "25 km/h", comment: "For scooters" }
      ],
      correctIndex: 1
    },
    {
      id: 38,
      category: "Travesía",
      question: "Road stretch through a town (Travesía): limit for a car?",
      options: [
        { text: "90 km/h", comment: "For road outside town" },
        { text: "50 km/h", comment: "Correct: travesía is considered an urban zone" },
        { text: "80 km/h", comment: "For motorways in town" },
        { text: "30 km/h", comment: "If one lane" }
      ],
      correctIndex: 1
    },
    {
      id: 39,
      category: "Minimums",
      question: "What is the minimum speed allowed in town on a street with a 50 km/h limit?",
      options: [
        { text: "30 km/h", comment: "Incorrect" },
        { text: "25 km/h", comment: "Correct: half of the allowed maximum" },
        { text: "15 km/h", comment: "For streets with limit 30" },
        { text: "20 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 40,
      category: "Residential Zones",
      question: "What is the speed limit in a residential zone (blue sign)?",
      options: [
        { text: "30 km/h", comment: "General rule" },
        { text: "20 km/h", comment: "Correct: strict limit for residents' safety" },
        { text: "10 km/h", comment: "Too slow" },
        { text: "50 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 41,
      category: "Trailers",
      question: "Maximum speed of a motorcycle with a trailer on a motorway?",
      options: [
        { text: "120 km/h", comment: "Without trailer" },
        { text: "90 km/h", comment: "For trucks" },
        { text: "108 km/h", comment: "Correct: the limit is reduced by 10% (120 - 12 = 108)" },
        { text: "100 km/h", comment: "For buses" }
      ],
      correctIndex: 2
    },
    {
      id: 42,
      category: "Quads",
      question: "Limit for a heavy quadricycle with trailer on a conventional road?",
      options: [
        { text: "70 km/h", comment: "Without trailer" },
        { text: "63 km/h", comment: "Correct: the limit is reduced by 10% (70 - 7 = 63)" },
        { text: "45 km/h", comment: "Moped limit" },
        { text: "90 km/h", comment: "For cars" }
      ],
      correctIndex: 1
    },
    {
      id: 43,
      category: "Quadricycles",
      question: "At what speed can a light quadricycle with a trailer travel?",
      options: [
        { text: "45 km/h", comment: "Without trailer" },
        { text: "40.5 km/h", comment: "Correct: limit of 45 km/h minus 10%" },
        { text: "25 km/h", comment: "Incorrect" },
        { text: "50 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 44,
      category: "Bicycles",
      question: "Speed and time condition for a bicycle with a trailer?",
      options: [
        { text: "45 km/h at night", comment: "Dangerous" },
        { text: "25 km/h always", comment: "Incorrect" },
        { text: "Reduce by 10% and only by day", comment: "Correct: prohibited to travel at night" },
        { text: "30 km/h", comment: "Unpaved roads" }
      ],
      correctIndex: 2
    },
    {
      id: 45,
      category: "Tricycles",
      question: "Speed limit for a tricycle on a conventional road?",
      options: [
        { text: "90 km/h", comment: "For two-wheeled" },
        { text: "70 km/h", comment: "Correct: special category of limit for tricycles" },
        { text: "80 km/h", comment: "For trucks" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 46,
      category: "Dangerous Goods",
      question: "Maximum speed for vehicle with dangerous goods on a street with limit 30?",
      options: [
        { text: "30 km/h", comment: "For normal cars" },
        { text: "20 km/h", comment: "Correct: 'minus 10' rule also applies here" },
        { text: "15 km/h", comment: "Too slow" },
        { text: "10 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 47,
      category: "Trailers",
      question: "Limit for car with any trailer on a conventional road?",
      options: [
        { text: "90 km/h", comment: "Without trailer" },
        { text: "80 km/h", comment: "Correct: sets are equated to trucks" },
        { text: "70 km/h", comment: "For schools" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 48,
      category: "Technical Signals",
      question: "Speed of a vehicle with '40' (V-5) signal?",
      options: [
        { text: "40 km/h", comment: "Correct: its technical and legal limit" },
        { text: "70 km/h", comment: "Incorrect" },
        { text: "25 km/h", comment: "For special vehicles" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 0
    },
    {
      id: 49,
      category: "Motorcycles",
      question: "Maximum speed for a motorcycle on an unpaved road?",
      options: [
        { text: "90 km/h", comment: "On asphalt" },
        { text: "30 km/h", comment: "Correct: single limit on dirt for all" },
        { text: "45 km/h", comment: "For mopeds" },
        { text: "20 km/h", comment: "In residential zones" }
      ],
      correctIndex: 1
    },
    {
      id: 50,
      category: "Buses",
      question: "Speed limit for a bus with a trailer on a motorway?",
      options: [
        { text: "100 km/h", comment: "Without trailer" },
        { text: "90 km/h", comment: "Correct: any trailer on a motorway is 90" },
        { text: "80 km/h", comment: "In town" },
        { text: "120 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 51,
      category: "Dangerous Goods",
      question: "What is the speed of a truck with dangerous goods on a motorway?",
      options: [
        { text: "90 km/h", comment: "Normal truck" },
        { text: "80 km/h", comment: "Correct: minus 10 km/h for dangerous goods" },
        { text: "70 km/h", comment: "For special vehicles" },
        { text: "100 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 52,
      category: "School Transport",
      question: "Speed of school transport on a conventional road?",
      options: [
        { text: "90 km/h", comment: "Normal bus" },
        { text: "80 km/h", comment: "Correct: must reduce speed outside town" },
        { text: "70 km/h", comment: "Dangerous goods" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 1
    },
    {
      id: 53,
      category: "Special Conditions",
      question: "Speed limit on unpaved roads?",
      options: [
        { text: "90 km/h", comment: "For asphalt" },
        { text: "50 km/h", comment: "For town" },
        { text: "30 km/h", comment: "Correct: single limit on dirt for all" },
        { text: "20 km/h", comment: "Residential zone" }
      ],
      correctIndex: 2
    },
    {
      id: 54,
      category: "Special Vehicles",
      question: "Maximum speed of special vehicle with trailer on interurban road?",
      options: [
        { text: "40 km/h", comment: "Without trailer" },
        { text: "25 km/h", comment: "Correct: trailer reduces limit to this mark" },
        { text: "45 km/h", comment: "For mopeds" },
        { text: "70 km/h", comment: "Fast special vehicles" }
      ],
      correctIndex: 1
    },
    {
      id: 55,
      category: "Dangerous Goods",
      question: "Speed of a car with dangerous load in town at limit 50?",
      options: [
        { text: "50 km/h", comment: "Normal limit" },
        { text: "40 km/h", comment: "Correct: in town the limit also reduces by 10" },
        { text: "30 km/h", comment: "Narrow street" },
        { text: "20 km/h", comment: "Residential zone" }
      ],
      correctIndex: 1
    },
    {
      id: 56,
      category: "Tricycles",
      question: "Maximum speed for a three-wheeled vehicle (Tricycle) on a motorway?",
      options: [
        { text: "120 km/h", comment: "For motorcycles" },
        { text: "90 km/h", comment: "For trucks" },
        { text: "70 km/h", comment: "Correct: tricycles have a strict limit" },
        { text: "100 km/h", comment: "For buses" }
      ],
      correctIndex: 2
    },
    {
      id: 57,
      category: "Special Vehicles",
      question: "Speed of a power tiller driven by a person on foot?",
      options: [
        { text: "40 km/h", comment: "For special vehicles" },
        { text: "25 km/h", comment: "Correct: limit for power tillers" },
        { text: "10 km/h", comment: "Too slow" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 58,
      category: "Buses",
      question: "Speed of an articulated bus on a motorway?",
      options: [
        { text: "120 km/h", comment: "Prohibited" },
        { text: "100 km/h", comment: "Correct: same limit as normal bus" },
        { text: "90 km/h", comment: "For trucks" },
        { text: "80 km/h", comment: "In town" }
      ],
      correctIndex: 1
    },
    {
      id: 59,
      category: "Derivative of Car",
      question: "Limit for derivative of passenger car on a conventional road?",
      options: [
        { text: "100 km/h", comment: "On motorway" },
        { text: "90 km/h", comment: "Correct: travel as passenger cars" },
        { text: "80 km/h", comment: "For trucks" },
        { text: "70 km/h", comment: "Special vehicles" }
      ],
      correctIndex: 1
    },
    {
      id: 60,
      category: "Tunnels",
      question: "Speed of a car in a motorway tunnel without additional signals?",
      options: [
        { text: "80 km/h", comment: "Incorrect" },
        { text: "100 km/h", comment: "Incorrect" },
        { text: "120 km/h", comment: "Correct: general road limits apply" },
        { text: "60 km/h", comment: "Minimum" }
      ],
      correctIndex: 2
    },
    {
      id: 61,
      category: "Urban Roads",
      question: "Speed on a single platform street?",
      options: [
        { text: "30 km/h", comment: "Normal streets" },
        { text: "20 km/h", comment: "Correct: for pedestrian protection" },
        { text: "10 km/h", comment: "Too slow" },
        { text: "50 km/h", comment: "Dangerous" }
      ],
      correctIndex: 1
    },
    {
      id: 62,
      category: "School Transport",
      question: "Speed of school transport in town on a two-lane street?",
      options: [
        { text: "40 km/h", comment: "Reduction of 10 km/h" },
        { text: "50 km/h", comment: "Correct: in town the limit is NOT reduced" },
        { text: "30 km/h", comment: "Narrow street" },
        { text: "60 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 63,
      category: "VMP",
      question: "Speed limit for an electric scooter (VMP) on a cycle lane?",
      options: [
        { text: "45 km/h", comment: "For mopeds" },
        { text: "6 km/h", comment: "For toys" },
        { text: "25 km/h", comment: "Correct: construction limit for VMP" },
        { text: "30 km/h", comment: "Incorrect" }
      ],
      correctIndex: 2
    },
    {
      id: 64,
      category: "Residential Zones",
      question: "Speed of a bicycle (Cycle) in a residential zone?",
      options: [
        { text: "30 km/h", comment: "General rule" },
        { text: "20 km/h", comment: "Correct: limit affects everyone" },
        { text: "45 km/h", comment: "Road limit" },
        { text: "15 km/h", comment: "Too slow" }
      ],
      correctIndex: 1
    },
    {
      id: 65,
      category: "Travesía",
      question: "Speed of a motorcycle in travesía (road stretch through town)?",
      options: [
        { text: "90 km/h", comment: "For road" },
        { text: "50 km/h", comment: "Correct: travesía is considered urban zone" },
        { text: "80 km/h", comment: "For motorways in town" },
        { text: "30 km/h", comment: "Narrow street" }
      ],
      correctIndex: 1
    },
    {
      id: 66,
      category: "Minimums",
      question: "Minimum speed in town on a street with limit 30?",
      options: [
        { text: "25 km/h", comment: "For limit 50" },
        { text: "20 km/h", comment: "Incorrect" },
        { text: "15 km/h", comment: "Correct: half of the maximum" },
        { text: "10 km/h", comment: "Incorrect" }
      ],
      correctIndex: 2
    },
    {
      id: 67,
      category: "Quadricycles",
      question: "Speed of a light quadricycle in town on any street?",
      options: [
        { text: "50 km/h", comment: "If many lanes" },
        { text: "45 km/h", comment: "Correct: its construction limit" },
        { text: "30 km/h", comment: "If few lanes" },
        { text: "25 km/h", comment: "For scooters" }
      ],
      correctIndex: 1
    },
    {
      id: 68,
      category: "Urban Roads",
      question: "Speed in 'Street 30' zone?",
      options: [
        { text: "50 km/h", comment: "For avenues" },
        { text: "30 km/h", comment: "Correct: standard for these streets" },
        { text: "20 km/h", comment: "For platforms" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 69,
      category: "Vehicle Sets",
      question: "Speed of a road train on a motorway?",
      options: [
        { text: "120 km/h", comment: "For cars" },
        { text: "100 km/h", comment: "For buses" },
        { text: "90 km/h", comment: "Correct: all sets on motorway are limited to this" },
        { text: "80 km/h", comment: "Minimum" }
      ],
      correctIndex: 2
    },
    {
      id: 70,
      category: "Vehicle Sets",
      question: "Speed of an articulated vehicle on a conventional road?",
      options: [
        { text: "90 km/h", comment: "For cars" },
        { text: "80 km/h", comment: "Correct: equated to trucks" },
        { text: "70 km/h", comment: "For special vehicles" },
        { text: "45 km/h", comment: "For mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 71,
      category: "Mopeds",
      question: "Speed limit of a three-wheeled moped outside built-up area?",
      options: [
        { text: "70 km/h", comment: "For tricycles" },
        { text: "45 km/h", comment: "Correct: any moped is limited to this figure" },
        { text: "25 km/h", comment: "For scooters" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 1
    },
    {
      id: 72,
      category: "Dirt Roads",
      question: "Speed of a heavy quadricycle (Quad) on an unpaved road?",
      options: [
        { text: "70 km/h", comment: "Limit on asphalt" },
        { text: "30 km/h", comment: "Correct: road limit cancels vehicle limit" },
        { text: "45 km/h", comment: "Incorrect" },
        { text: "20 km/h", comment: "In residential zone" }
      ],
      correctIndex: 1
    },
    {
      id: 73,
      category: "Minimums",
      question: "Minimum speed on a motorway for a truck?",
      options: [
        { text: "90 km/h", comment: "Its maximum" },
        { text: "60 km/h", comment: "Correct: minimum is equal for all vehicles" },
        { text: "45 km/h", comment: "Incorrect" },
        { text: "80 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 74,
      category: "Technical Signals",
      question: "Speed limit for vehicle with V-4 (25) signal?",
      options: [
        { text: "40 km/h", comment: "For special vehicles" },
        { text: "25 km/h", comment: "Correct: must respect its signal" },
        { text: "45 km/h", comment: "For mopeds" },
        { text: "30 km/h", comment: "On dirt" }
      ],
      correctIndex: 1
    },
    {
      id: 75,
      category: "Towing",
      question: "Speed of towing an averied vehicle with rigid bar?",
      options: [
        { text: "90 km/h", comment: "Without trailer" },
        { text: "80 km/h", comment: "Correct: equated to a set with trailer" },
        { text: "70 km/h", comment: "Incorrect" },
        { text: "50 km/h", comment: "In town" }
      ],
      correctIndex: 1
    },
    {
      id: 76,
      category: "Pick-up",
      question: "Speed of a pick-up on a conventional road?",
      options: [
        { text: "100 km/h", comment: "If separation" },
        { text: "90 km/h", comment: "Correct: follow car rules" },
        { text: "80 km/h", comment: "For trucks" },
        { text: "120 km/h", comment: "For motorway" }
      ],
      correctIndex: 1
    },
    {
      id: 77,
      category: "Urban Roads",
      question: "Speed of a bus by motorway INSIDE town?",
      options: [
        { text: "100 km/h", comment: "Limit outside town" },
        { text: "80 km/h", comment: "Correct: ceiling for all vehicles on urban motorways" },
        { text: "50 km/h", comment: "Normal streets" },
        { text: "90 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 78,
      category: "Mixed Vehicles",
      question: "Mixed vehicle limit on road for automobiles?",
      options: [
        { text: "100 km/h", comment: "On motorway" },
        { text: "90 km/h", comment: "Correct: travel as buses" },
        { text: "120 km/h", comment: "Prohibited" },
        { text: "80 km/h", comment: "Trucks" }
      ],
      correctIndex: 1
    },
    {
      id: 79,
      category: "Dangerous Goods",
      question: "Speed of dangerous goods transport on motorcycle in town?",
      options: [
        { text: "50 km/h", comment: "Normal motorcycle" },
        { text: "40 km/h", comment: "Correct: 'minus 10' rule is universal" },
        { text: "25 km/h", comment: "For scooters" },
        { text: "30 km/h", comment: "Narrow street" }
      ],
      correctIndex: 1
    },
    {
      id: 80,
      category: "Special Vehicles",
      question: "Speed of special vehicle on motorway, if its max is 80?",
      options: [
        { text: "40 km/h", comment: "General limit" },
        { text: "60 km/h", comment: "Motorway minimum" },
        { text: "70 km/h", comment: "Correct: fast specials limited to this" },
        { text: "80 km/h", comment: "Incorrect" }
      ],
      correctIndex: 2
    },
    {
      id: 81,
      category: "Tunnels",
      question: "Minimum safety distance for a car in a tunnel?",
      options: [
        { text: "50 meters", comment: "For trucks outside tunnel" },
        { text: "100 meters (4 sec)", comment: "Correct: minimum mandatory in tunnel" },
        { text: "150 meters", comment: "For heavy vehicles" },
        { text: "The safety one", comment: "Not enough" }
      ],
      correctIndex: 1
    },
    {
      id: 82,
      category: "Tunnels",
      question: "Mandatory distance for 5000 kg truck in a tunnel?",
      options: [
        { text: "100 meters", comment: "For cars" },
        { text: "50 meters", comment: "For normal roads" },
        { text: "150 meters (6 sec)", comment: "Correct: higher requirement for heavy" },
        { text: "200 meters", comment: "Incorrect" }
      ],
      correctIndex: 2
    },
    {
      id: 83,
      category: "Distances",
      question: "Distance between trucks >3,5t or length >10m outside town?",
      options: [
        { text: "100 meters", comment: "Incorrect" },
        { text: "50 meters", comment: "Correct: fixed minimum for heavy/long" },
        { text: "150 meters", comment: "Incorrect" },
        { text: "4 seconds", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 84,
      category: "Travesía",
      question: "Speed of school transport in Travesía?",
      options: [
        { text: "50 km/h", comment: "Correct: in town the limit is NOT reduced" },
        { text: "40 km/h", comment: "For dangerous" },
        { text: "30 km/h", comment: "Narrow street" },
        { text: "60 km/h", comment: "Prohibited" }
      ],
      correctIndex: 0
    },
    {
      id: 85,
      category: "Dangerous Goods",
      question: "Speed of vehicle with dangerous on motorway INSIDE town?",
      options: [
        { text: "80 km/h", comment: "General road limit" },
        { text: "70 km/h", comment: "Correct: 'minus 10' also applies on motorways" },
        { text: "50 km/h", comment: "Normal streets" },
        { text: "40 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 86,
      category: "VMP",
      question: "Speed of electric scooter (VMP) by cycle lane in town?",
      options: [
        { text: "45 km/h", comment: "For mopeds" },
        { text: "25 km/h", comment: "Correct: absolute construction limit" },
        { text: "30 km/h", comment: "Narrow street" },
        { text: "15 km/h", comment: "Pedestrian zone" }
      ],
      correctIndex: 1
    },
    {
      id: 87,
      category: "Urban Roads",
      question: "Maximum speed of any vehicle in single-lane urban street?",
      options: [
        { text: "50 km/h", comment: "Multilane" },
        { text: "30 km/h", comment: "Correct: standard for single-lane streets" },
        { text: "20 km/h", comment: "Platforms" },
        { text: "45 km/h", comment: "Mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 88,
      category: "Residential Zones",
      question: "Speed in residential street (blue sign)?",
      options: [
        { text: "30 km/h", comment: "Normal street" },
        { text: "20 km/h", comment: "Correct: limit for zones with pedestrian priority" },
        { text: "10 km/h", comment: "Too slow" },
        { text: "50 km/h", comment: "Prohibited" }
      ],
      correctIndex: 1
    },
    {
      id: 89,
      category: "Breakdowns",
      question: "Speed of special vehicle if it has no brake lights?",
      options: [
        { text: "40 km/h", comment: "For functional technique" },
        { text: "25 km/h", comment: "Correct: technical breakdown reduces limit" },
        { text: "70 km/h", comment: "Fast specials" },
        { text: "10 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 90,
      category: "Weather Conditions",
      question: "Speed of a car with snow (Red Level)?",
      options: [
        { text: "60 km/h", comment: "For yellow level" },
        { text: "30 km/h", comment: "Correct: mandatory limit when using chains" },
        { text: "50 km/h", comment: "Incorrect" },
        { text: "20 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 91,
      category: "Roads",
      question: "Maximum speed of a car in road for automobiles?",
      options: [
        { text: "120 km/h", comment: "For motorways" },
        { text: "90 km/h", comment: "Correct: same limit as in conventional road" },
        { text: "100 km/h", comment: "If separation" },
        { text: "80 km/h", comment: "Trucks" }
      ],
      correctIndex: 1
    },
    {
      id: 92,
      category: "Buses",
      question: "Bus speed by road for automobiles?",
      options: [
        { text: "100 km/h", comment: "For motorways" },
        { text: "90 km/h", comment: "Correct: here they are equated to cars" },
        { text: "80 km/h", comment: "Trucks" },
        { text: "70 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 93,
      category: "Trucks",
      question: "Truck speed limit in road for automobiles?",
      options: [
        { text: "90 km/h", comment: "Cars" },
        { text: "80 km/h", comment: "Correct: trucks always go slower" },
        { text: "70 km/h", comment: "Dangerous" },
        { text: "100 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    },
    {
      id: 94,
      category: "Urban Roads",
      question: "Speed in single platform street (no curb)?",
      options: [
        { text: "50 km/h", comment: "Avenues" },
        { text: "30 km/h", comment: "Normal streets" },
        { text: "20 km/h", comment: "Correct: for pedestrian protection" },
        { text: "45 km/h", comment: "Mopeds" }
      ],
      correctIndex: 2
    },
    {
      id: 95,
      category: "Mopeds",
      question: "Maximum speed for a moped by the shoulder?",
      options: [
        { text: "50 km/h", comment: "Urban limit" },
        { text: "45 km/h", comment: "Correct: should never exceed its 45" },
        { text: "30 km/h", comment: "Incorrect" },
        { text: "25 km/h", comment: "Scooters" }
      ],
      correctIndex: 1
    },
    {
      id: 96,
      category: "Minimums",
      question: "Minimum car speed in motorway?",
      options: [
        { text: "45 km/h", comment: "For normal roads" },
        { text: "50 km/h", comment: "Incorrect" },
        { text: "60 km/h", comment: "Correct: fixed minimum" },
        { text: "70 km/h", comment: "Incorrect" }
      ],
      correctIndex: 2
    },
    {
      id: 97,
      category: "Technical Signals",
      question: "Speed in vehicle with V-4 (25) signal?",
      options: [
        { text: "40 km/h", comment: "Specials limit" },
        { text: "25 km/h", comment: "Correct: must respect its signal" },
        { text: "30 km/h", comment: "On dirt" },
        { text: "45 km/h", comment: "Mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 98,
      category: "Intersections",
      question: "Speed limit in intersection without priority?",
      options: [
        { text: "30 km/h", comment: "Incorrect" },
        { text: "40 km/h", comment: "Incorrect" },
        { text: "50 km/h", comment: "Correct: forbidden to exceed this limit" },
        { text: "60 km/h", comment: "Dangerous" }
      ],
      correctIndex: 2
    },
    {
      id: 99,
      category: "Trailers",
      question: "Maximum speed of a car with trailer outside town?",
      options: [
        { text: "90 km/h", comment: "Without trailer" },
        { text: "80 km/h", comment: "Correct: sets are limited to this" },
        { text: "70 km/h", comment: "Specials" },
        { text: "45 km/h", comment: "Mopeds" }
      ],
      correctIndex: 1
    },
    {
      id: 100,
      category: "Bicycles",
      question: "Speed of a bicycle by dirt road?",
      options: [
        { text: "45 km/h", comment: "Limit on asphalt" },
        { text: "30 km/h", comment: "Correct: dirt limit is mandatory" },
        { text: "20 km/h", comment: "Residential zones" },
        { text: "15 km/h", comment: "Incorrect" }
      ],
      correctIndex: 1
    }
  ]
};
