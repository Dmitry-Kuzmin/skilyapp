import type { Language } from "@/contexts/LanguageContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ReactNode } from "react";
import {
  ArticleAccordion,
  ArticleCallout,
  ArticleCardGrid,
  ArticleCTA,
  ArticleComparison,
  ArticleDivider,
  ArticleLinkCard,
  ArticleList,
  ArticleQuote,
  ArticleStats,
  ArticleTable,
} from "@/components/ui/article-kit";

type ArticleCopy = {
  introLead: ReactNode;
  creatorTitle: string;
  creatorBody: ReactNode;
  unchanged: {
    heading: string;
    intro: ReactNode;
    stats: { value: string; label: string; note?: string }[];
    checklist: ReactNode[];
  };
  phase1: {
    divider: string;
    heading: string;
    body: ReactNode;
    cards: { icon: string; title: string; description: string; badge?: string }[];
    warningTitle: string;
    warningBody: ReactNode;
  };
  phase2: {
    divider: string;
    heading: string;
    body: ReactNode;
    stats: { value: string; label: string; note?: string }[];
    scenariosTitle: string;
    scenariosIntro: ReactNode;
    cards: { icon: string; title: string; description: string }[];
    officialTitle: string;
    officialIntro: ReactNode;
    officialCardTitle: string;
    officialCardDescription: string;
    officialTipTitle: string;
    officialTipBody: ReactNode;
  };
  why: {
    divider: string;
    heading: string;
    quotes: { text: string; author: string; role: string }[];
    body: ReactNode;
  };
  harder: {
    divider: string;
    heading: string;
    warningTitle: string;
    warningBody: ReactNode;
    comparison: {
      headerA: string;
      headerB: string;
      rows: { feature: string; a: boolean; b: boolean }[];
    };
    statsTitle: string;
    table: {
      headers: string[];
      rows: string[][];
      caption: string;
    };
  };
  interview: {
    divider: string;
    heading: string;
    intro: ReactNode;
    accordionTitle: string;
    items: { question: string; answer: string }[];
  };
  tips: {
    divider: string;
    heading: string;
    items: ReactNode[];
  };
  skilyapp: {
    divider: string;
    heading: string;
    checklist: ReactNode[];
    cta: {
      title: string;
      description: string;
      primaryLabel: string;
      secondaryLabel: string;
    };
  };
  conclusion: {
    divider: string;
    heading: string;
    items: ReactNode[];
    summaryTitle: string;
    summaryBody: ReactNode;
  };
};

const ARTICLE_COPY: Record<Language, ArticleCopy> = {
  ru: {
    introLead: (
      <>
        DGT (Dirección General de Tráfico) запустила{" "}
        <strong>самую крупную реформу теоретического экзамена на права за последние 10 лет</strong>.
        Изменения вводятся в две фазы — обновлённый каталог знаков (уже действует) и совершенно
        новый формат видео-вопросов (с февраля 2026). Я разберу всё, что меняется, как
        готовиться, и почему этот экзамен сложнее, чем кажется.
      </>
    ),
    creatorTitle: "Меня зовут Дмитрий",
    creatorBody: (
      <>
        Я создатель платформы Skilyapp — помогаем людям готовиться к DGT с ИИ. За последние
        месяцы мы перестроили платформу под новый формат, и я расскажу, что мы узнали в
        процессе.
      </>
    ),
    unchanged: {
      heading: "Что осталось без изменений",
      intro: (
        <>
          Прежде чем углубляться в нововведения — базовая структура экзамена{" "}
          <strong>не поменялась</strong>:
        </>
      ),
      stats: [
        { value: "30", label: "Вопросов", note: "как и раньше" },
        { value: "3", label: "Макс. ошибки", note: "для сдачи" },
        { value: "30 мин", label: "На экзамен", note: "± с видео" },
        { value: "€94", label: "Цена", note: "2 попытки" },
      ],
      checklist: [
        "3 варианта ответа на каждый вопрос",
        "Permiso B — стандартная категория",
        "24 месяца на сдачу практики после теории",
        "Запись через cita previa на сайте DGT",
      ],
    },
    phase1: {
      divider: "Фаза 1 — уже действует",
      heading: "Фаза 1: новые знаки (с 1 октября 2025)",
      body: (
        <>
          Первая часть реформы запущена в октябре 2025. DGT обновила официальный каталог дорожных
          знаков — теперь он включает реалии современного города: электросамокаты, зоны с нулевыми
          выбросами, электромобили.
        </>
      ),
      cards: [
        {
          icon: "🛴",
          title: "Электросамокаты (VMP)",
          description:
            "Собственные знаки для устройств персональной мобильности: въезд, парковка, взаимодействие с трафиком.",
          badge: "новое",
        },
        {
          icon: "🌍",
          title: "Зоны низких выбросов (ZBE)",
          description:
            "Обязательны во всех городах Испании с населением 50 000+. Знаки указывают границы, разрешённые ТС и время ограничений.",
          badge: "новое",
        },
        {
          icon: "⚡",
          title: "Зарядные станции",
          description: "Знаки для электромобилей и других экологических видов транспорта.",
          badge: "новое",
        },
        {
          icon: "🚗",
          title: "Полосы VAO",
          description:
            "Vehículos de Alta Ocupación — выделенные полосы для машин с несколькими пассажирами.",
          badge: "новое",
        },
        {
          icon: "🛣",
          title: "Дороги 2+1",
          description:
            "Новый формат шоссе с чередующимися полосами обгона, всё чаще встречается в Испании.",
          badge: "новое",
        },
        {
          icon: "🚁",
          title: "Воздушное наблюдение",
          description: "Предупреждения о зонах с радарами и дронами DGT.",
          badge: "новое",
        },
      ],
      warningTitle: "Готовились по старым материалам?",
      warningBody: (
        <>
          Проверьте, обновлены ли они до версии 2025–2026. Skilyapp обновил базу вопросов под
          новый каталог — если вы уже занимались, зайдите и пересдайте тест по знакам.
        </>
      ),
    },
    phase2: {
      divider: "Фаза 2 — главное нововведение",
      heading: "Фаза 2: видео-вопросы",
      body: (
        <>
          Это то, о чём все говорят. Впервые в истории DGT экзамен включает{" "}
          <strong>полноценные видеоролики с реальными дорожными ситуациями</strong>. Вместо
          текстового вопроса вы видите ролик до 60 секунд, снятый от лица водителя (POV), и после
          него — классический вопрос с тремя ответами.
        </>
      ),
      stats: [
        { value: "≤60с", label: "Длина видео" },
        { value: "3×", label: "Можно пересмотреть" },
        { value: "≥1", label: "Видео на экзамен" },
        { value: "POV", label: "Формат съёмки" },
      ],
      scenariosTitle: "Какие сценарии показывают",
      scenariosIntro: (
        <>
          DGT ориентируется на ситуации, где большинство аварий происходит из-за{" "}
          <strong>неспособности предвидеть риск</strong>, а не незнания правил:
        </>
      ),
      cards: [
        { icon: "🚶", title: "Неожиданный пешеход", description: "Ребёнок выбегает из-за припаркованной машины или переходит на красный." },
        { icon: "🚲", title: "Велосипедист", description: "Невидимый из-за грузовика, выезжает из-за угла на перекрёстке." },
        { icon: "🌧", title: "Плохая погода", description: "Сильный дождь, туман, мокрая дорога — как меняется безопасная дистанция." },
        { icon: "🚛", title: "Грузовик закрывает обзор", description: "Что скрывается за ним на трассе или в городе?" },
        { icon: "📱", title: "Отвлечённый водитель", description: "Машина впереди едет непредсказуемо — что предпринять." },
        { icon: "🔄", title: "Круговые перекрёстки", description: "Кто имеет приоритет в реальной ситуации, не по тексту правила." },
        { icon: "🛣", title: "Перестроения", description: "Когда обгон опасен: слепые зоны, скорость, разметка." },
        { icon: "🚗", title: "Машина на обочине", description: "Открытая дверь, человек рядом — правильная реакция." },
        { icon: "⚠️", title: "Неподходящая скорость", description: "Для текущих условий дороги, погоды, видимости." },
      ],
      officialTitle: "Официальные примеры от DGT",
      officialIntro: (
        <>
          DGT не выпустила экзаменационные ролики публично. Но есть{" "}
          <strong>официальный обучающий ресурс</strong> — 21 видео, идентичных формату экзамена:
        </>
      ),
      officialCardTitle: "DGT — Test de Predicción de Riesgos",
      officialCardDescription: "21 официальное видео · каждое <60 с · бесплатно · на испанском",
      officialTipTitle: "Лучший бесплатный ресурс",
      officialTipBody: (
        <>
          Пройдите все 21 видео минимум 3–4 раза. После каждого просмотра спрашивайте себя: что я
          заметил? Что упустил?
        </>
      ),
    },
    why: {
      divider: "Зачем DGT это делает",
      heading: "Зачем DGT это делает",
      quotes: [
        {
          text: "Экзамен оставит позади стадию простого списка вопросов и ответов. Мы хотим знать, как будущий водитель реагирует, видя потенциально опасную ситуацию.",
          author: "Pere Navarro",
          role: "Директор DGT",
        },
        {
          text: "Мы хотим улучшить качество теоретической подготовки, избежать запоминания и помочь будущим водителям быстро воспринимать риск.",
          author: "Montserrat Pérez",
          role: "Заместитель директора DGT по образованию",
        },
        {
          text: "Большинство аварий происходит не потому, что правило неизвестно, а потому что его важность не была усвоена.",
          author: "Sergio Olivera",
          role: "Генеральный секретарь CNAE (конфедерация автошкол Испании)",
        },
      ],
      body: (
        <>
          CNAE годами лоббировала это изменение, ссылаясь на опыт Великобритании, Германии,
          Франции, Финляндии и Латвии — стран, где видео-тесты уже введены. Британский результат:
          после введения Hazard Perception Test в 2002 году аварийность с молодыми водителями{" "}
          <strong>снизилась на 11%</strong> в первые годы.
        </>
      ),
    },
    harder: {
      divider: "Стало ли сложнее?",
      heading: "Стало ли сложнее?",
      warningTitle: "Честный ответ — да",
      warningBody: (
        <>
          Для тех, кто привык зубрить — определённо да. Видео-вопросы созданы специально, чтобы{" "}
          <strong>обмануть «зубрилу»</strong>.
        </>
      ),
      comparison: {
        headerA: "Старый экзамен",
        headerB: "Новый (2026)",
        rows: [
          { feature: "Только текстовые вопросы", a: true, b: false },
          { feature: "Видео-вопросы", a: false, b: true },
          { feature: "Новые знаки (ZBE, VMP, VAO)", a: false, b: true },
          { feature: "Достаточно зубрёжки", a: true, b: false },
          { feature: "Нужно читать ситуацию", a: false, b: true },
          { feature: "30 вопросов, 3 ошибки", a: true, b: true },
          { feature: "€94,05 за экзамен", a: true, b: true },
        ],
      },
      statsTitle: "Текущая статистика сдачи (2025, до видео)",
      table: {
        headers: ["Показатель", "Значение"],
        rows: [
          ["Средняя сдача permiso B с 1-й попытки", "55–60%"],
          ["Худший регион: Сеута / Мелилья", "42–43%"],
          ["Лучший: Хаэн / Самора", "61%"],
          ["Прогноз после Feb 2026 (эксперты)", "−5–10% на первом этапе"],
        ],
        caption:
          "Источник: DGT 2025. После адаптации (2–3 года) показатели выровняются — как было в Великобритании.",
      },
    },
    interview: {
      divider: "Интервью: взгляд изнутри автошколы",
      heading: "Интервью: взгляд изнутри автошколы",
      intro: (
        <>
          Директор крупной автошколы Коста-дель-Соль — анонимно, но откровенно — ответил на 10
          ключевых вопросов о новой реформе.
        </>
      ),
      accordionTitle: "10 вопросов директору автошколы",
      items: [
        {
          question: "Какое самое значимое изменение между старым и новым экзаменом?",
          answer:
            "Радикальное смещение от запоминания к пониманию. Раньше можно было «прокачать» базу из 3000 вопросов и сдать. Теперь нужно научиться видеть дорогу, а не просто запоминать ответы.",
        },
        {
          question: "Как ученики реагируют на видео-вопросы?",
          answer:
            "Двояко. Молодые (18–25 лет) — воодушевлены, им интереснее. А вот ученики старше 35–40 лет переживают: они привыкли к классическому формату «вопрос → правильный ответ».",
        },
        {
          question: "Какой тип учеников страдает больше всего?",
          answer:
            "Те, кто учится «по списку». Хорошо знают правила, но не научились их применять в реальной ситуации. Также страдают «переосмысливающие» — те, кто видит риск везде и парализуется. Идеальный кандидат — понявший логику правил, а не их форму.",
        },
        {
          question: "Пришлось ли школе переделывать учебные программы?",
          answer:
            "Полностью. Добавили видеомодули с первой недели, переработали материалы по знакам, и каждое занятие теперь включает блок «анализ ситуации». Раньше большинство занятий — чистая теория. Сейчас минимум 40% времени уходит на разбор реальных дорожных сцен.",
        },
        {
          question: "Реально ли сохранить «3 ошибки из 30», когда один вопрос — сложный видео-сценарий?",
          answer:
            "Это самый спорный момент. На мой взгляд — да, реально, но только при правильной подготовке. Если ученик просто прошёл базу тестов, он вряд ли сдаст с первого раза. Нужна именно видео-тренировка, а не только текстовые тесты.",
        },
        {
          question: "Верите ли вы, что Испания увидит снижение аварийности, как Британия?",
          answer:
            "Убеждён. Главные жертвы аварий в Испании — водители 18–24 лет, и именно они слабее всего читают дорогу. Если экзамен заставит научиться предсказывать ситуации до получения прав — это спасёт жизни. Не сразу, но через 3–5 лет точно.",
        },
        {
          question: "Три самые частые ошибки на видео-вопросах?",
          answer:
            "Во-первых, фиксация на очевидной угрозе — ученик видит велосипедиста и забывает про пешехода в зеркале.\n\nВо-вторых, игнорирование погоды и состояния дороги — мокрый асфальт меняет всё.\n\nВ-третьих, слепота к периферии — большинство рисков на видео приходят сбоку, а не из центра кадра.",
        },
        {
          question: "Достаточно ли традиционных приложений с тестами?",
          answer:
            "Больше нет. Любая платформа, которая не предлагает видео-тренировку — устаревшая. Мы рекомендуем ученикам комбинировать традиционные тесты с видео-практикой. К счастью, есть приложения вроде Skilyapp, которые уже встроили это в обучение.",
        },
        {
          question: "Готовы ли муниципальные центры к переходу?",
          answer:
            "67 центров самой DGT — уже да, всё цифровое. А 92 децентрализованных муниципальных центра — в процессе модернизации. Жду задержки в маленьких городах в первые 6 месяцев 2026 года.",
        },
        {
          question: "Один совет ученику, сдающему экзамен в 2026?",
          answer:
            "Выйдите из режима «решения теста» и войдите в режим «вождения». На экзамене вы не отвечаете на вопросы — вы принимаете решения как водитель. Это другая ментальная модель. Кто это поймёт, тот сдаст.",
        },
      ],
    },
    tips: {
      divider: "7 практических советов",
      heading: "Как готовиться к видео-вопросам: 7 советов",
      items: [
        <><strong>Тренируйтесь на официальном тесте DGT.</strong> Пройдите все 21 видео минимум 3–4 раза. После каждого: что заметил? Что упустил?</>,
        <><strong>Используйте все 3 пересмотра стратегически.</strong> 1-й — общая картина. 2-й — периферия (зеркала, обочина, тротуар). 3-й — подтверждение конкретного риска.</>,
        <><strong>Смотрите весь кадр, не центр.</strong> Реальный водитель сканирует всё пространство. Тренируйте этот навык — большинство рисков приходит сбоку.</>,
        <><strong>Думайте «что произойдёт через 3 секунды».</strong> Ребёнок возле мяча → через 3 с он может выбежать. Грузовик на повороте → кто за ним? Предвидьте, а не реагируйте.</>,
        <><strong>Учитывайте контекст.</strong> Дождь = увеличенная дистанция. Туман = снижайте скорость. Школа рядом = дети. Вечер пятницы = больше рисков. Косвенные факторы важны.</>,
        <><strong>Думайте действиями, не правилами.</strong> «Что я должен сделать?» сильнее, чем «что говорит закон?». Видео-тест проверяет поведение водителя, не знание норм.</>,
        <><strong>Не зубрите — принимайте внутренне.</strong> Реформа создана, чтобы победить зубрилу. «Выучить ответ» → провал. «Понять, почему этот ответ правильный» → успех.</>,
      ],
    },
    skilyapp: {
      divider: "Skilyapp и DGT 2026",
      heading: "Как Skilyapp помогает в новом формате",
      checklist: [
        "Полная база официальных вопросов 2026 на русском, испанском и английском",
        "ИИ-наставник 24/7 — задайте любой вопрос про правила, получите чёткий ответ",
        "Симуляция экзамена в новом формате (30 вопросов, 30 минут)",
        "Адаптация к слабым местам — алгоритм фокусирует обучение на ваших пробелах",
        "Геймификация — PvP-дуэли с другими учениками, ежедневные стрики",
        "Доступ через Telegram Mini App @skilyapp_bot",
      ],
      cta: {
        title: "Готовьтесь к DGT 2026 на Skilyapp",
        description:
          "ИИ-наставник 24/7, полная база вопросов 2026, симуляция экзамена с новым форматом. Русский, испанский, английский.",
        primaryLabel: "Начать бесплатно",
        secondaryLabel: "Открыть в Telegram",
      },
    },
    conclusion: {
      divider: "Заключение",
      heading: "Заключение: что делать прямо сейчас",
      items: [
        <><strong>Проверьте дату экзамена.</strong> До февраля 2026 — старый формат. После — уже видео-вопросы.</>,
        <><strong>Обновите материалы</strong> до версии 2025–2026: новые знаки, ZBE, электросамокаты.</>,
        <><strong>Пройдите официальный тест DGT</strong> на восприятие риска. Бесплатно, минимум 3 раза.</>,
        <><strong>Тренируйтесь на современной платформе</strong> — приложения без видео-формата устарели.</>,
        <><strong>Думайте как водитель, а не как ученик.</strong> Это главный сдвиг реформы.</>,
      ],
      summaryTitle: "Итог",
      summaryBody: (
        <>
          Реформа сложная, но логичная. DGT хочет готовить не «сдавателей экзамена», а{" "}
          <strong>реальных водителей</strong>. Это в интересах всех на дороге.
        </>
      ),
    },
  },
  en: {
    introLead: (
      <>
        DGT (Dirección General de Tráfico) has launched{" "}
        <strong>the biggest reform of Spain’s driving theory exam in the last 10 years</strong>.
        The rollout comes in two phases: an updated road sign catalogue (already active) and a
        completely new video-question format (from February 2026). Here is what is changing, how
        to prepare, and why this exam is harder than it looks.
      </>
    ),
    creatorTitle: "My name is Dmitry",
    creatorBody: (
      <>
        I am the founder of Skilyapp. We help people prepare for DGT with AI. Over the last few
        months we rebuilt the platform around the new format, and I want to share what we learned.
      </>
    ),
    unchanged: {
      heading: "What stays the same",
      intro: (
        <>
          Before we dive into the changes, the core exam structure{" "}
          <strong>has not changed</strong>:
        </>
      ),
      stats: [
        { value: "30", label: "Questions", note: "same as before" },
        { value: "3", label: "Max mistakes", note: "to pass" },
        { value: "30 min", label: "Exam time", note: "± with video" },
        { value: "€94", label: "Fee", note: "2 attempts" },
      ],
      checklist: [
        "3 answer options for each question",
        "Permiso B — standard licence category",
        "24 months to pass the practical after theory",
        "Booking through cita previa on the DGT website",
      ],
    },
    phase1: {
      divider: "Phase 1 — already active",
      heading: "Phase 1: new road signs (from 1 October 2025)",
      body: (
        <>
          The first part of the reform went live in October 2025. DGT updated the official road
          sign catalogue so it now reflects the realities of a modern city: e-scooters,
          zero-emission zones and electric vehicles.
        </>
      ),
      cards: [
        {
          icon: "🛴",
          title: "E-scooters (VMP)",
          description:
            "Dedicated signs for personal mobility vehicles: access, parking and interaction with traffic.",
          badge: "new",
        },
        {
          icon: "🌍",
          title: "Low-emission zones (ZBE)",
          description:
            "Mandatory in every Spanish city with 50,000+ residents. Signs show boundaries, allowed vehicles and time restrictions.",
          badge: "new",
        },
        {
          icon: "⚡",
          title: "Charging stations",
          description: "Road signs for electric cars and other eco-friendly transport.",
          badge: "new",
        },
        {
          icon: "🚗",
          title: "VAO lanes",
          description:
            "Vehículos de Alta Ocupación — priority lanes for vehicles carrying multiple passengers.",
          badge: "new",
        },
        {
          icon: "🛣",
          title: "2+1 roads",
          description:
            "A new highway format with alternating overtaking lanes, increasingly common in Spain.",
          badge: "new",
        },
        {
          icon: "🚁",
          title: "Aerial surveillance",
          description: "Warnings for areas monitored by DGT radars and drones.",
          badge: "new",
        },
      ],
      warningTitle: "Studying with old materials?",
      warningBody: (
        <>
          Make sure they were updated for 2025–2026. Skilyapp already refreshed its question bank
          for the new sign catalogue, so if you have studied before, go back in and retake the sign
          tests.
        </>
      ),
    },
    phase2: {
      divider: "Phase 2 — the major change",
      heading: "Phase 2: video questions",
      body: (
        <>
          This is what everyone is talking about. For the first time in DGT history, the exam will
          include <strong>full video clips with real road situations</strong>. Instead of a purely
          text question, you watch a clip up to 60 seconds long, filmed from the driver’s point of
          view (POV), and then answer a classic multiple-choice question with three options.
        </>
      ),
      stats: [
        { value: "≤60s", label: "Video length" },
        { value: "3×", label: "Replays allowed" },
        { value: "≥1", label: "Videos in exam" },
        { value: "POV", label: "Recording style" },
      ],
      scenariosTitle: "What scenarios they will show",
      scenariosIntro: (
        <>
          DGT is focusing on situations where most crashes happen because of{" "}
          <strong>an inability to anticipate risk</strong>, not because the rule itself is unknown:
        </>
      ),
      cards: [
        { icon: "🚶", title: "Unexpected pedestrian", description: "A child runs out from behind a parked car or crosses on red." },
        { icon: "🚲", title: "Cyclist", description: "Hidden by a truck, then appears from a corner at an intersection." },
        { icon: "🌧", title: "Bad weather", description: "Heavy rain, fog or wet tarmac — how the safe distance changes." },
        { icon: "🚛", title: "Truck blocks the view", description: "What might be hidden behind it in the city or on the road?" },
        { icon: "📱", title: "Distracted driver", description: "The vehicle ahead behaves unpredictably — what should you do?" },
        { icon: "🔄", title: "Roundabouts", description: "Who really has priority in a live situation, not just in a rulebook sentence." },
        { icon: "🛣", title: "Lane changes", description: "When overtaking becomes dangerous: blind spots, speed and markings." },
        { icon: "🚗", title: "Car on the shoulder", description: "An open door, a person nearby — what is the correct response?" },
        { icon: "⚠️", title: "Unsafe speed", description: "For the current road, weather and visibility conditions." },
      ],
      officialTitle: "Official examples from DGT",
      officialIntro: (
        <>
          DGT has not released actual exam clips publicly. But there is an{" "}
          <strong>official training resource</strong> with 21 videos in exactly the same format as
          the exam:
        </>
      ),
      officialCardTitle: "DGT — Test de Predicción de Riesgos",
      officialCardDescription: "21 official videos · each under 60 s · free · in Spanish",
      officialTipTitle: "Best free resource",
      officialTipBody: (
        <>
          Go through all 21 videos at least 3–4 times. After every viewing ask yourself: what did I
          notice? What did I miss?
        </>
      ),
    },
    why: {
      divider: "Why DGT is doing this",
      heading: "Why DGT is doing this",
      quotes: [
        {
          text: "The exam is leaving behind the stage of being just a list of questions and answers. We want to know how a future driver reacts when facing a potentially dangerous situation.",
          author: "Pere Navarro",
          role: "Director of DGT",
        },
        {
          text: "We want to improve the quality of theory training, reduce rote memorisation and help future drivers recognise risk more quickly.",
          author: "Montserrat Pérez",
          role: "Deputy Director of Education at DGT",
        },
        {
          text: "Most crashes happen not because a rule is unknown, but because its importance was never truly internalised.",
          author: "Sergio Olivera",
          role: "General Secretary of CNAE (Spanish driving school confederation)",
        },
      ],
      body: (
        <>
          CNAE has lobbied for this change for years, pointing to the experience of the United
          Kingdom, Germany, France, Finland and Latvia, where video-based testing is already in
          place. The British result is especially telling: after Hazard Perception Test was
          introduced in 2002, crash rates among young drivers{" "}
          <strong>fell by 11%</strong> in the first years.
        </>
      ),
    },
    harder: {
      divider: "Is it harder now?",
      heading: "Is it harder now?",
      warningTitle: "The honest answer: yes",
      warningBody: (
        <>
          If you rely on memorising answers, then absolutely yes. Video questions are designed
          specifically to <strong>break the “rote learner” approach</strong>.
        </>
      ),
      comparison: {
        headerA: "Old exam",
        headerB: "New exam (2026)",
        rows: [
          { feature: "Text-only questions", a: true, b: false },
          { feature: "Video questions", a: false, b: true },
          { feature: "New signs (ZBE, VMP, VAO)", a: false, b: true },
          { feature: "Memorising is enough", a: true, b: false },
          { feature: "Need to read the situation", a: false, b: true },
          { feature: "30 questions, 3 mistakes", a: true, b: true },
          { feature: "€94.05 exam fee", a: true, b: true },
        ],
      },
      statsTitle: "Current pass-rate snapshot (2025, before video)",
      table: {
        headers: ["Metric", "Value"],
        rows: [
          ["Average first-attempt pass rate for permiso B", "55–60%"],
          ["Lowest region: Ceuta / Melilla", "42–43%"],
          ["Highest: Jaén / Zamora", "61%"],
          ["Forecast after Feb 2026 (experts)", "−5–10% at first"],
        ],
        caption:
          "Source: DGT 2025. After adaptation (2–3 years), results should stabilise again, as happened in the UK.",
      },
    },
    interview: {
      divider: "Interview: a driving school insider’s view",
      heading: "Interview: a driving school insider’s view",
      intro: (
        <>
          The director of a major Costa del Sol driving school — anonymous but candid — answered 10
          key questions about the reform.
        </>
      ),
      accordionTitle: "10 questions for a driving school director",
      items: [
        {
          question: "What is the biggest change between the old and new exam?",
          answer:
            "A radical shift from memorisation to understanding. Before, you could grind through a bank of 3,000 questions and pass. Now you have to learn to read the road, not just remember answers.",
        },
        {
          question: "How are students reacting to video questions?",
          answer:
            "It is mixed. Younger learners (18–25) are excited because it feels more engaging. Students over 35–40 are more anxious because they are used to the classic “question → correct answer” format.",
        },
        {
          question: "Which learners suffer the most?",
          answer:
            "Those who study “from a list”. They know the rules well but never learned to apply them in real situations. Overthinkers also struggle — they see danger everywhere and freeze. The ideal candidate understands the logic behind the rules, not just their wording.",
        },
        {
          question: "Did your school have to rebuild the training programme?",
          answer:
            "Completely. We added video modules from week one, rebuilt our sign materials, and now every class includes a situation-analysis block. Before, most lessons were pure theory. Now at least 40% of the time is spent analysing real road scenes.",
        },
        {
          question: "Can Spain realistically keep “3 mistakes out of 30” if one question is a complex video scenario?",
          answer:
            "That is the most debated point. In my view, yes — but only with the right preparation. If a learner just completes a standard question bank, a first-time pass is unlikely. They need real video practice, not only text tests.",
        },
        {
          question: "Do you believe Spain will reduce crash rates the way Britain did?",
          answer:
            "I do. The biggest crash victims in Spain are drivers aged 18–24, and they are the weakest at reading the road. If the exam forces them to anticipate situations before they ever get a licence, it will save lives. Not instantly, but within 3–5 years for sure.",
        },
        {
          question: "What are the three most common mistakes in video questions?",
          answer:
            "First, tunnel vision on the obvious threat — a student sees the cyclist and forgets about the pedestrian in the mirror.\n\nSecond, ignoring weather and road condition — wet asphalt changes everything.\n\nThird, peripheral blindness — most risks in these clips come from the side, not from the centre of the frame.",
        },
        {
          question: "Are traditional test apps still enough?",
          answer:
            "Not anymore. Any platform that does not offer video training is already outdated. We advise students to combine standard tests with video practice. Fortunately, there are apps like Skilyapp that have already built this into the learning flow.",
        },
        {
          question: "Are local testing centres ready for the transition?",
          answer:
            "The 67 DGT-run centres are basically ready — they are already digital. The 92 decentralised municipal centres are still upgrading. I expect delays in smaller towns during the first six months of 2026.",
        },
        {
          question: "One piece of advice for a student taking the exam in 2026?",
          answer:
            "Leave “test-solving mode” and enter “driving mode”. In the exam you are not answering trivia — you are making decisions like a driver. That is a different mental model. The people who understand this will pass.",
        },
      ],
    },
    tips: {
      divider: "7 practical tips",
      heading: "How to prepare for video questions: 7 tips",
      items: [
        <><strong>Train on the official DGT test.</strong> Go through all 21 videos at least 3–4 times. After each one ask: what did I notice? What did I miss?</>,
        <><strong>Use all 3 replays strategically.</strong> First pass for the big picture. Second for the periphery (mirrors, shoulder, pavement). Third to confirm the specific risk.</>,
        <><strong>Watch the whole frame, not just the centre.</strong> Real drivers scan the entire scene. Build that habit — most risks appear from the sides.</>,
        <><strong>Think “what happens in 3 seconds?”</strong> A child near a ball may run out. A truck entering a bend may hide someone behind it. Anticipate, do not just react.</>,
        <><strong>Always read the context.</strong> Rain means longer stopping distance. Fog means lower speed. A school nearby means children. Friday evening means more unpredictable traffic. Indirect clues matter.</>,
        <><strong>Think in actions, not rules.</strong> “What should I do?” is stronger than “what does the law say?”. The video test checks driver behaviour, not just legal memory.</>,
        <><strong>Do not cram — internalise.</strong> The reform was built to beat the memoriser. “Learn the answer” leads to failure. “Understand why the answer is right” leads to success.</>,
      ],
    },
    skilyapp: {
      divider: "Skilyapp and DGT 2026",
      heading: "How Skilyapp helps with the new format",
      checklist: [
        "Full bank of official 2026 questions in Russian, Spanish and English",
        "24/7 AI tutor — ask any traffic-rule question and get a clear answer",
        "Exam simulation in the new format (30 questions, 30 minutes)",
        "Weak-spot adaptation — the algorithm focuses your study on gaps",
        "Gamification — PvP duels with other learners and daily streaks",
        "Access through Telegram Mini App @skilyapp_bot",
      ],
      cta: {
        title: "Prepare for DGT 2026 with Skilyapp",
        description:
          "24/7 AI tutor, full 2026 question bank and exam simulation for the new format. Russian, Spanish and English.",
        primaryLabel: "Start free",
        secondaryLabel: "Open in Telegram",
      },
    },
    conclusion: {
      divider: "Conclusion",
      heading: "Conclusion: what to do right now",
      items: [
        <><strong>Check your exam date.</strong> Before February 2026 you still get the old format. After that, expect video questions.</>,
        <><strong>Update your materials</strong> to the 2025–2026 version: new signs, ZBE and e-scooters.</>,
        <><strong>Take the official DGT risk-perception test</strong>. It is free and you should do it at least three times.</>,
        <><strong>Train on a modern platform</strong> — apps without a video-based workflow are already outdated.</>,
        <><strong>Think like a driver, not like a student.</strong> That is the core mental shift behind the reform.</>,
      ],
      summaryTitle: "Bottom line",
      summaryBody: (
        <>
          The reform is demanding, but logical. DGT wants to produce not just “exam passers”, but{" "}
          <strong>real drivers</strong>. That benefits everyone on the road.
        </>
      ),
    },
  },
  es: {
    introLead: (
      <>
        La DGT (Dirección General de Tráfico) ha lanzado{" "}
        <strong>la mayor reforma del examen teórico de conducir en España de los últimos 10 años</strong>.
        Los cambios llegan en dos fases: un catálogo renovado de señales (ya en vigor) y un formato
        completamente nuevo de preguntas en vídeo (desde febrero de 2026). Aquí te explico qué
        cambia, cómo prepararte y por qué este examen es más difícil de lo que parece.
      </>
    ),
    creatorTitle: "Me llamo Dmitry",
    creatorBody: (
      <>
        Soy el fundador de Skilyapp. Ayudamos a las personas a prepararse para la DGT con IA. En
        los últimos meses hemos rediseñado la plataforma para este nuevo formato y quiero contarte
        lo que hemos aprendido.
      </>
    ),
    unchanged: {
      heading: "Qué no cambia",
      intro: (
        <>
          Antes de entrar en las novedades, la estructura básica del examen{" "}
          <strong>no ha cambiado</strong>:
        </>
      ),
      stats: [
        { value: "30", label: "Preguntas", note: "como siempre" },
        { value: "3", label: "Errores máx.", note: "para aprobar" },
        { value: "30 min", label: "Duración", note: "± con vídeo" },
        { value: "€94", label: "Precio", note: "2 intentos" },
      ],
      checklist: [
        "3 opciones de respuesta por pregunta",
        "Permiso B — categoría estándar",
        "24 meses para aprobar la práctica después de la teoría",
        "Reserva mediante cita previa en la web de la DGT",
      ],
    },
    phase1: {
      divider: "Fase 1 — ya en vigor",
      heading: "Fase 1: nuevas señales (desde el 1 de octubre de 2025)",
      body: (
        <>
          La primera parte de la reforma se activó en octubre de 2025. La DGT actualizó el catálogo
          oficial de señales para incluir la realidad de la ciudad moderna: patinetes eléctricos,
          zonas de bajas emisiones y vehículos eléctricos.
        </>
      ),
      cards: [
        {
          icon: "🛴",
          title: "Patinetes eléctricos (VMP)",
          description:
            "Señales específicas para vehículos de movilidad personal: acceso, aparcamiento e interacción con el tráfico.",
          badge: "nuevo",
        },
        {
          icon: "🌍",
          title: "Zonas de bajas emisiones (ZBE)",
          description:
            "Obligatorias en todas las ciudades españolas de más de 50.000 habitantes. Las señales indican límites, vehículos permitidos y franjas horarias.",
          badge: "nuevo",
        },
        {
          icon: "⚡",
          title: "Puntos de recarga",
          description: "Señales para coches eléctricos y otros medios de transporte ecológicos.",
          badge: "nuevo",
        },
        {
          icon: "🚗",
          title: "Carriles VAO",
          description:
            "Vehículos de Alta Ocupación: carriles reservados para coches con varios ocupantes.",
          badge: "nuevo",
        },
        {
          icon: "🛣",
          title: "Carreteras 2+1",
          description:
            "Nuevo formato de vía con carriles de adelantamiento alternos, cada vez más frecuente en España.",
          badge: "nuevo",
        },
        {
          icon: "🚁",
          title: "Vigilancia aérea",
          description: "Avisos de zonas con radares y drones de la DGT.",
          badge: "nuevo",
        },
      ],
      warningTitle: "¿Estudiaste con materiales antiguos?",
      warningBody: (
        <>
          Comprueba si están actualizados a la versión 2025–2026. Skilyapp ya ha adaptado la base
          de preguntas al nuevo catálogo, así que si ya estudiabas antes, entra y repite el test de
          señales.
        </>
      ),
    },
    phase2: {
      divider: "Fase 2 — la gran novedad",
      heading: "Fase 2: preguntas en vídeo",
      body: (
        <>
          Este es el cambio del que todo el mundo habla. Por primera vez en la historia de la DGT,
          el examen incluirá <strong>vídeos completos con situaciones reales de tráfico</strong>.
          En lugar de una pregunta solo de texto, verás un vídeo de hasta 60 segundos, grabado
          desde el punto de vista del conductor (POV), y después responderás una pregunta clásica
          con tres opciones.
        </>
      ),
      stats: [
        { value: "≤60 s", label: "Duración del vídeo" },
        { value: "3×", label: "Repeticiones" },
        { value: "≥1", label: "Vídeos por examen" },
        { value: "POV", label: "Formato de grabación" },
      ],
      scenariosTitle: "Qué tipos de situaciones aparecerán",
      scenariosIntro: (
        <>
          La DGT se centra en situaciones donde la mayoría de los accidentes ocurren por{" "}
          <strong>no anticipar el riesgo</strong>, no por desconocer la norma:
        </>
      ),
      cards: [
        { icon: "🚶", title: "Peatón inesperado", description: "Un niño sale de detrás de un coche aparcado o cruza en rojo." },
        { icon: "🚲", title: "Ciclista", description: "Oculto por un camión, aparece desde una esquina en un cruce." },
        { icon: "🌧", title: "Mal tiempo", description: "Lluvia intensa, niebla o asfalto mojado: cómo cambia la distancia de seguridad." },
        { icon: "🚛", title: "Camión que tapa la visión", description: "¿Qué puede haber detrás de él en ciudad o carretera?" },
        { icon: "📱", title: "Conductor distraído", description: "El coche de delante se comporta de forma imprevisible: qué hacer." },
        { icon: "🔄", title: "Glorietas", description: "Quién tiene prioridad en una situación real, no solo en la frase del reglamento." },
        { icon: "🛣", title: "Cambios de carril", description: "Cuándo adelantar es peligroso: ángulos muertos, velocidad y marcas viales." },
        { icon: "🚗", title: "Coche en el arcén", description: "Puerta abierta y una persona al lado: cuál es la reacción correcta." },
        { icon: "⚠️", title: "Velocidad inadecuada", description: "Para las condiciones reales de la vía, el clima y la visibilidad." },
      ],
      officialTitle: "Ejemplos oficiales de la DGT",
      officialIntro: (
        <>
          La DGT no ha publicado vídeos reales del examen. Pero sí existe un{" "}
          <strong>recurso oficial de entrenamiento</strong> con 21 vídeos idénticos en formato al
          examen:
        </>
      ),
      officialCardTitle: "DGT — Test de Predicción de Riesgos",
      officialCardDescription: "21 vídeos oficiales · cada uno <60 s · gratis · en español",
      officialTipTitle: "El mejor recurso gratuito",
      officialTipBody: (
        <>
          Haz los 21 vídeos al menos 3–4 veces. Después de cada visualización pregúntate: ¿qué he
          visto? ¿Qué se me escapó?
        </>
      ),
    },
    why: {
      divider: "Por qué la DGT hace esto",
      heading: "Por qué la DGT hace esto",
      quotes: [
        {
          text: "El examen dejará atrás la etapa de ser simplemente una lista de preguntas y respuestas. Queremos saber cómo reacciona un futuro conductor cuando ve una situación potencialmente peligrosa.",
          author: "Pere Navarro",
          role: "Director de la DGT",
        },
        {
          text: "Queremos mejorar la calidad de la preparación teórica, evitar la memorización mecánica y ayudar a los futuros conductores a percibir el riesgo con mayor rapidez.",
          author: "Montserrat Pérez",
          role: "Subdirectora de Formación de la DGT",
        },
        {
          text: "La mayoría de los accidentes no ocurre porque la norma sea desconocida, sino porque su importancia nunca fue realmente interiorizada.",
          author: "Sergio Olivera",
          role: "Secretario general de la CNAE",
        },
      ],
      body: (
        <>
          La CNAE lleva años impulsando este cambio, apoyándose en la experiencia del Reino Unido,
          Alemania, Francia, Finlandia y Letonia, donde las pruebas en vídeo ya existen. El caso
          británico es especialmente relevante: tras la introducción del Hazard Perception Test en
          2002, la siniestralidad entre conductores jóvenes{" "}
          <strong>bajó un 11%</strong> en los primeros años.
        </>
      ),
    },
    harder: {
      divider: "¿Será más difícil?",
      heading: "¿Será más difícil?",
      warningTitle: "La respuesta honesta: sí",
      warningBody: (
        <>
          Para quien depende de memorizar respuestas, sí. Las preguntas en vídeo están pensadas
          precisamente para <strong>romper el enfoque de empollar</strong>.
        </>
      ),
      comparison: {
        headerA: "Examen antiguo",
        headerB: "Nuevo examen (2026)",
        rows: [
          { feature: "Solo preguntas de texto", a: true, b: false },
          { feature: "Preguntas en vídeo", a: false, b: true },
          { feature: "Nuevas señales (ZBE, VMP, VAO)", a: false, b: true },
          { feature: "Memorizar basta", a: true, b: false },
          { feature: "Hay que leer la situación", a: false, b: true },
          { feature: "30 preguntas, 3 fallos", a: true, b: true },
          { feature: "€94,05 por examen", a: true, b: true },
        ],
      },
      statsTitle: "Datos actuales de aprobados (2025, antes del vídeo)",
      table: {
        headers: ["Indicador", "Valor"],
        rows: [
          ["Media de aprobados del permiso B al primer intento", "55–60%"],
          ["Peor región: Ceuta / Melilla", "42–43%"],
          ["Mejor: Jaén / Zamora", "61%"],
          ["Previsión tras feb. 2026 (expertos)", "−5–10% al inicio"],
        ],
        caption:
          "Fuente: DGT 2025. Tras el periodo de adaptación (2–3 años), los resultados deberían estabilizarse, igual que ocurrió en Reino Unido.",
      },
    },
    interview: {
      divider: "Entrevista: visión desde dentro de una autoescuela",
      heading: "Entrevista: visión desde dentro de una autoescuela",
      intro: (
        <>
          El director de una gran autoescuela de la Costa del Sol — de forma anónima, pero muy
          sincera — respondió a 10 preguntas clave sobre la reforma.
        </>
      ),
      accordionTitle: "10 preguntas al director de una autoescuela",
      items: [
        {
          question: "¿Cuál es el cambio más importante entre el examen antiguo y el nuevo?",
          answer:
            "Un cambio radical de la memorización a la comprensión. Antes se podía repetir una base de 3.000 preguntas y aprobar. Ahora hay que aprender a leer la carretera, no solo a recordar respuestas.",
        },
        {
          question: "¿Cómo reaccionan los alumnos ante las preguntas en vídeo?",
          answer:
            "De manera mixta. Los más jóvenes (18–25 años) están motivados porque les resulta más interesante. Los alumnos mayores de 35–40 años lo viven con más ansiedad porque están acostumbrados al formato clásico de “pregunta → respuesta correcta”.",
        },
        {
          question: "¿Qué tipo de alumno lo pasa peor?",
          answer:
            "Quien estudia “por lista”. Conoce bien las normas, pero no ha aprendido a aplicarlas en una situación real. También sufre quien sobreanaliza: ve peligro en todas partes y se bloquea. El candidato ideal entiende la lógica de las normas, no solo su forma.",
        },
        {
          question: "¿La autoescuela tuvo que rehacer el programa?",
          answer:
            "Por completo. Añadimos módulos de vídeo desde la primera semana, rehacimos los materiales de señales y ahora cada clase incluye análisis de situaciones. Antes la mayoría del tiempo era teoría pura. Ahora al menos un 40% se dedica a escenas reales de tráfico.",
        },
        {
          question: "¿Es realista mantener “3 fallos de 30” si una pregunta puede ser un escenario complejo en vídeo?",
          answer:
            "Ese es el punto más discutido. En mi opinión, sí, pero solo con la preparación adecuada. Si el alumno solo ha hecho una base de test estándar, es difícil que apruebe a la primera. Hace falta entrenamiento en vídeo, no solo test de texto.",
        },
        {
          question: "¿Cree que España reducirá los accidentes como ocurrió en Reino Unido?",
          answer:
            "Estoy convencido. Las principales víctimas de los accidentes en España son los conductores de 18 a 24 años, y precisamente son quienes peor leen la carretera. Si el examen les obliga a anticipar situaciones antes de obtener el carné, salvará vidas. No de inmediato, pero sí en 3–5 años.",
        },
        {
          question: "¿Cuáles son los tres errores más comunes en las preguntas en vídeo?",
          answer:
            "Primero, fijarse solo en la amenaza obvia: el alumno ve al ciclista y olvida al peatón que aparece en el espejo.\n\nSegundo, ignorar el clima y el estado de la calzada: el asfalto mojado lo cambia todo.\n\nTercero, la ceguera periférica: la mayoría de los riesgos en estos vídeos llega desde los lados, no desde el centro.",
        },
        {
          question: "¿Siguen siendo suficientes las apps tradicionales de tests?",
          answer:
            "Ya no. Cualquier plataforma que no ofrezca entrenamiento en vídeo está desactualizada. Recomendamos combinar tests clásicos con práctica en vídeo. Por suerte, ya hay apps como Skilyapp que lo han integrado en el aprendizaje.",
        },
        {
          question: "¿Están preparados los centros de examen para la transición?",
          answer:
            "Los 67 centros gestionados directamente por la DGT sí, porque ya son digitales. Los 92 centros municipales descentralizados siguen modernizándose. Espero retrasos en ciudades pequeñas durante los primeros seis meses de 2026.",
        },
        {
          question: "Un consejo para quien haga el examen en 2026",
          answer:
            "Sal del modo “resolver test” y entra en modo “conducir”. En el examen no respondes a una trivia: tomas decisiones como conductor. Es otro modelo mental. Quien entienda eso, aprobará.",
        },
      ],
    },
    tips: {
      divider: "7 consejos prácticos",
      heading: "Cómo prepararte para las preguntas en vídeo: 7 consejos",
      items: [
        <><strong>Practica con el test oficial de la DGT.</strong> Haz los 21 vídeos al menos 3–4 veces. Después de cada uno pregúntate: ¿qué vi? ¿qué se me escapó?</>,
        <><strong>Usa las 3 repeticiones con estrategia.</strong> La primera para la visión general. La segunda para la periferia (espejos, arcén, acera). La tercera para confirmar el riesgo concreto.</>,
        <><strong>Mira todo el encuadre, no solo el centro.</strong> Un conductor real escanea toda la escena. Entrena ese hábito: la mayoría de los riesgos aparece desde los lados.</>,
        <><strong>Piensa “qué pasará en 3 segundos”.</strong> Un niño junto a una pelota puede salir corriendo. Un camión entrando en una curva puede tapar a alguien. Anticipa, no solo reacciones.</>,
        <><strong>Lee siempre el contexto.</strong> Lluvia = más distancia de frenado. Niebla = menos velocidad. Colegio cerca = niños. Viernes por la tarde = tráfico más imprevisible. Las pistas indirectas importan.</>,
        <><strong>Piensa en acciones, no en normas.</strong> “¿Qué debo hacer?” es más útil que “¿qué dice la ley?”. El vídeo evalúa el comportamiento del conductor, no solo memoria normativa.</>,
        <><strong>No empolles: interioriza.</strong> La reforma está diseñada para vencer al que memoriza. “Aprender la respuesta” lleva al fallo. “Entender por qué es correcta” lleva al aprobado.</>,
      ],
    },
    skilyapp: {
      divider: "Skilyapp y la DGT 2026",
      heading: "Cómo ayuda Skilyapp en el nuevo formato",
      checklist: [
        "Base completa de preguntas oficiales 2026 en ruso, español e inglés",
        "Tutor con IA 24/7: pregunta cualquier duda sobre normas y obtén una respuesta clara",
        "Simulación del examen en el nuevo formato (30 preguntas, 30 minutos)",
        "Adaptación a puntos débiles: el algoritmo centra el estudio en tus lagunas",
        "Gamificación: duelos PvP con otros alumnos y rachas diarias",
        "Acceso mediante Telegram Mini App @skilyapp_bot",
      ],
      cta: {
        title: "Prepárate para la DGT 2026 con Skilyapp",
        description:
          "Tutor con IA 24/7, base completa de preguntas 2026 y simulación del examen con el nuevo formato. Ruso, español e inglés.",
        primaryLabel: "Empezar gratis",
        secondaryLabel: "Abrir en Telegram",
      },
    },
    conclusion: {
      divider: "Conclusión",
      heading: "Conclusión: qué hacer desde hoy",
      items: [
        <><strong>Comprueba la fecha de tu examen.</strong> Antes de febrero de 2026 sigue vigente el formato antiguo. Después, ya habrá preguntas en vídeo.</>,
        <><strong>Actualiza tus materiales</strong> a la versión 2025–2026: nuevas señales, ZBE y patinetes eléctricos.</>,
        <><strong>Haz el test oficial de percepción del riesgo de la DGT</strong>. Es gratis y deberías repetirlo al menos tres veces.</>,
        <><strong>Entrena en una plataforma moderna</strong>: las apps sin flujo de vídeo ya se han quedado atrás.</>,
        <><strong>Piensa como conductor, no como alumno.</strong> Ese es el cambio mental central de toda la reforma.</>,
      ],
      summaryTitle: "Resumen",
      summaryBody: (
        <>
          La reforma es exigente, pero lógica. La DGT quiere formar no solo a gente que aprueba, sino
          a <strong>conductores reales</strong>. Eso beneficia a todos los que compartimos la vía.
        </>
      ),
    },
  },
};

export function Dgt2026ArticleContent() {
  const { language } = useLanguage();
  const copy = ARTICLE_COPY[language] ?? ARTICLE_COPY.ru;

  return (
    <>
      <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{copy.introLead}</p>

      <ArticleCallout type="info" title={copy.creatorTitle}>
        {copy.creatorBody}
      </ArticleCallout>

      <h2 id="chto-ostalos">{copy.unchanged.heading}</h2>
      <p>{copy.unchanged.intro}</p>

      <ArticleStats stats={copy.unchanged.stats} />
      <ArticleList type="check" items={copy.unchanged.checklist} />

      <ArticleDivider label={copy.phase1.divider} />

      <h2 id="faza-1">{copy.phase1.heading}</h2>
      <p>{copy.phase1.body}</p>

      <ArticleCardGrid cols={2} cards={copy.phase1.cards} />

      <ArticleCallout type="warning" title={copy.phase1.warningTitle}>
        {copy.phase1.warningBody}
      </ArticleCallout>

      <ArticleDivider label={copy.phase2.divider} />

      <h2 id="faza-2">{copy.phase2.heading}</h2>
      <p>{copy.phase2.body}</p>

      <ArticleStats stats={copy.phase2.stats} />

      <h3 id="scenarii">{copy.phase2.scenariosTitle}</h3>
      <p>{copy.phase2.scenariosIntro}</p>

      <ArticleCardGrid cols={3} cards={copy.phase2.cards} />

      <h3 id="official-test">{copy.phase2.officialTitle}</h3>
      <p>{copy.phase2.officialIntro}</p>

      <ArticleLinkCard
        href="https://www.dgt.es/muevete-con-seguridad/conviertete-en-un-buen-conductor/test-de-prediccion-de-riesgos/"
        title={copy.phase2.officialCardTitle}
        description={copy.phase2.officialCardDescription}
        external
      />

      <ArticleCallout type="tip" title={copy.phase2.officialTipTitle}>
        {copy.phase2.officialTipBody}
      </ArticleCallout>

      <ArticleDivider label={copy.why.divider} />

      <h2 id="zachem">{copy.why.heading}</h2>
      {copy.why.quotes.map((quote) => (
        <ArticleQuote key={`${quote.author}-${quote.text.slice(0, 12)}`} text={quote.text} author={quote.author} role={quote.role} />
      ))}
      <p>{copy.why.body}</p>

      <ArticleDivider label={copy.harder.divider} />

      <h2 id="slozhnee">{copy.harder.heading}</h2>
      <ArticleCallout type="danger" title={copy.harder.warningTitle}>
        {copy.harder.warningBody}
      </ArticleCallout>

      <ArticleComparison
        headerA={copy.harder.comparison.headerA}
        headerB={copy.harder.comparison.headerB}
        rows={copy.harder.comparison.rows}
      />

      <h3>{copy.harder.statsTitle}</h3>
      <ArticleTable
        headers={copy.harder.table.headers}
        rows={copy.harder.table.rows}
        caption={copy.harder.table.caption}
      />

      <ArticleDivider label={copy.interview.divider} />

      <h2 id="intervyu">{copy.interview.heading}</h2>
      <p>{copy.interview.intro}</p>

      <ArticleAccordion title={copy.interview.accordionTitle} items={copy.interview.items} />

      <ArticleDivider label={copy.tips.divider} />

      <h2 id="sovety">{copy.tips.heading}</h2>
      <ArticleList type="number" items={copy.tips.items} />

      <ArticleDivider label={copy.skilyapp.divider} />

      <h2 id="skilyapp">{copy.skilyapp.heading}</h2>
      <ArticleList type="check" items={copy.skilyapp.checklist} />

      <ArticleCTA
        title={copy.skilyapp.cta.title}
        description={copy.skilyapp.cta.description}
        primaryHref="https://skilyapp.com"
        primaryLabel={copy.skilyapp.cta.primaryLabel}
        secondaryHref="https://t.me/skilyapp_bot"
        secondaryLabel={copy.skilyapp.cta.secondaryLabel}
      />

      <ArticleDivider label={copy.conclusion.divider} />

      <h2 id="zaklyuchenie">{copy.conclusion.heading}</h2>
      <ArticleList type="number" items={copy.conclusion.items} />

      <ArticleCallout type="success" title={copy.conclusion.summaryTitle}>
        {copy.conclusion.summaryBody}
      </ArticleCallout>
    </>
  );
}
