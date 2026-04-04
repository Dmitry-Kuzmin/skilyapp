import type { LingoChapter } from './types';

export const chapter1: LingoChapter = {
  id: 'ch1',
  title: 'Дорога и разметка',
  emoji: '🛣️',
  color: {
    bg: 'bg-blue-950',
    border: 'border-blue-500',
    text: 'text-blue-300',
    accent: 'bg-blue-500',
  },
  lessons: [
    {
      id: 'ch1-l1',
      title: 'Типы дорог',
      emoji: '🚗',
      exercises: [
        {
          type: 'vocab_intro',
          termEs: 'Autopista',
          termRu: 'Автомагистраль',
          descriptionRu: 'Скоростная дорога с разделёнными полосами. Макс. скорость 120 км/ч. Доступ только через съезды.',
          exampleEs: 'En la autopista, la velocidad máxima es de 120 km/h.',
          exampleRu: 'На автомагистрали максимальная скорость — 120 км/ч.',
          insights: [
            { label: 'Польза', text: 'Это одно из самых частых слов в темах про скорость, обгон и тип дороги.', tone: 'success' },
            { label: 'Экзамен DGT', text: 'Если видишь autopista, почти всегда вспоминай: раздельные потоки, нет обычных перекрёстков, лимит 120.', tone: 'tip' },
          ],
        },
        {
          type: 'flashcard',
          termEs: 'Autopista',
          termRu: 'Автомагистраль',
          descriptionRu: 'Скоростная дорога с разделёнными полосами, доступ только через съезды. Макс. скорость 120 км/ч.',
          insights: [
            { label: 'Запоминалка', text: 'Autopista = максимально контролируемая скоростная дорога.', tone: 'info' },
          ],
        },
        {
          type: 'flashcard',
          termEs: 'Autovía',
          termRu: 'Автодорога',
          descriptionRu: 'Как автомагистраль, но допускает пересечения. Также до 120 км/ч.',
          insights: [
            { label: 'Частая ошибка', text: 'Студенты путают autopista и autovía. На экзамене проверяют именно оттенок различия, а не только перевод.', tone: 'warning' },
          ],
        },
        {
          type: 'flashcard',
          termEs: 'Carretera convencional',
          termRu: 'Обычная дорога',
          descriptionRu: 'Дорога без разделительной полосы. Макс. скорость 90 км/ч.',
          insights: [
            { label: 'Важно', text: 'Когда в вопросе обычная дорога, риски встречки, обгона и ограниченной видимости обычно выше.', tone: 'tip' },
          ],
        },
        {
          type: 'multiple_choice',
          question: 'Что такое «Autopista»?',
          termEs: 'Autopista',
          correctAnswer: 'Автомагистраль',
          options: ['Автомагистраль', 'Обычная дорога', 'Городская улица', 'Объездная дорога'],
          insights: [
            { label: 'Как мыслить', text: 'Сначала ищи тип дороги, а уже потом вспоминай скорость и правила.', tone: 'info' },
          ],
        },
        {
          type: 'multiple_choice',
          question: 'Максимальная скорость на Autovía?',
          termEs: 'Velocidad máxima en autovía',
          correctAnswer: '120 км/ч',
          options: ['90 км/ч', '100 км/ч', '120 км/ч', '140 км/ч'],
          insights: [
            { label: 'Экзамен DGT', text: 'Числа любят смешивать с похожими дорогами. Проверяй не интуицией, а по типу vía.', tone: 'tip' },
          ],
        },
        {
          type: 'match_pairs',
          pairs: [
            { es: 'Autopista', ru: 'Автомагистраль' },
            { es: 'Autovía', ru: 'Автодорога' },
            { es: 'Carretera convencional', ru: 'Обычная дорога' },
            { es: 'Vía urbana', ru: 'Городская улица' },
          ],
        },
        {
          type: 'word_tiles',
          prompt: 'Составь перевод:',
          sentenceEs: 'La autopista tiene dos carriles por sentido.',
          correctWords: ['Автомагистраль', 'имеет', 'две', 'полосы', 'в', 'каждом', 'направлении'],
          extraWords: ['обочину', 'разметку', 'знак'],
        },
        {
          type: 'context',
          sentence: 'На дороге типа «___» допускается съезд через любой перекрёсток.',
          sentenceEs: 'En una «___» se permiten cruces a nivel.',
          options: ['Autovía', 'Autopista', 'Carretera nacional'],
          correctAnswer: 'Autovía',
          insights: [
            { label: 'Логика', text: 'Слова cruces a nivel сразу подсказывают, что это не autopista.', tone: 'success' },
          ],
        },
        {
          type: 'type_answer',
          prompt: 'Переведи на русский:',
          termEs: 'Carretera convencional',
          correctAnswer: 'обычная дорога',
          hint: 'О...',
          insights: [
            { label: 'Польза', text: 'Это опорный термин: через него часто объясняют скорость, обгон и встречное движение.', tone: 'info' },
          ],
        },
      ],
    },
    {
      id: 'ch1-l2',
      title: 'Разметка и полосы',
      emoji: '🔲',
      exercises: [
        {
          type: 'vocab_intro',
          termEs: 'Línea continua',
          termRu: 'Сплошная линия',
          descriptionRu: 'Непрерывная разметка на дороге. Пересекать запрещено — нельзя обгонять и менять полосу.',
          exampleEs: 'Está prohibido cruzar la línea continua.',
          exampleRu: 'Запрещено пересекать сплошную линию.',
          insights: [
            { label: 'Экзамен DGT', text: 'Это не просто слово, а триггер на запрет: обгон, пересечение, выезд через линию.', tone: 'tip' },
            { label: 'Частая ошибка', text: 'Студенты помнят перевод, но забывают, какие действия линия реально запрещает.', tone: 'warning' },
          ],
        },
        {
          type: 'flashcard',
          termEs: 'Línea continua',
          termRu: 'Сплошная линия',
          descriptionRu: 'Запрещает пересечение или выезд на встречную полосу.',
          insights: [
            { label: 'Польза', text: 'Один термин помогает снять много ошибок сразу в темах про разметку.', tone: 'success' },
          ],
        },
        {
          type: 'flashcard',
          termEs: 'Línea discontinua',
          termRu: 'Прерывистая линия',
          descriptionRu: 'Разрешает обгон или смену полосы при безопасности.',
          insights: [
            { label: 'Важно', text: 'Разрешает не значит обязывает: сначала безопасность, потом манёвр.', tone: 'tip' },
          ],
        },
        {
          type: 'flashcard',
          termEs: 'Carril',
          termRu: 'Полоса движения',
          descriptionRu: 'Каждая размеченная полоса на дороге.',
          insights: [
            { label: 'Польза', text: 'Carril будет встречаться почти в каждой теме: скорость, разметка, перестроение, автобусные полосы.', tone: 'info' },
          ],
        },
        {
          type: 'flashcard',
          termEs: 'Arcén',
          termRu: 'Обочина',
          descriptionRu: 'Боковая полоса дороги, не предназначенная для движения.',
          insights: [
            { label: 'Частая ошибка', text: 'Обочина не считается обычной полосой движения. Это проверяют в формулировках про остановку и объезд.', tone: 'warning' },
          ],
        },
        {
          type: 'multiple_choice',
          question: 'Что означает «línea continua»?',
          termEs: 'Línea continua',
          correctAnswer: 'Сплошная линия — запрещено пересекать',
          options: [
            'Сплошная линия — запрещено пересекать',
            'Прерывистая линия — можно обгонять',
            'Разметка пешеходного перехода',
            'Граница обочины',
          ],
          insights: [
            { label: 'Как мыслить', text: 'Увидел continua -> сразу ищи запрет, а не разрешение.', tone: 'success' },
          ],
        },
        {
          type: 'match_pairs',
          pairs: [
            { es: 'Línea continua', ru: 'Сплошная линия' },
            { es: 'Línea discontinua', ru: 'Прерывистая линия' },
            { es: 'Arcén', ru: 'Обочина' },
            { es: 'Carril', ru: 'Полоса движения' },
          ],
        },
        {
          type: 'word_tiles',
          prompt: 'Составь перевод:',
          sentenceEs: 'No se puede cruzar la línea continua.',
          correctWords: ['Нельзя', 'пересекать', 'сплошную', 'линию'],
          extraWords: ['обочину', 'полосу', 'перекрёсток'],
        },
        {
          type: 'context',
          sentence: 'Водитель не может пересекать «___», если она разделяет полосы.',
          options: ['línea continua', 'línea discontinua', 'paso de peatones'],
          correctAnswer: 'línea continua',
          insights: [
            { label: 'DGT формулировка', text: 'В вопросах часто прячут правильный ответ в глаголе no puede.', tone: 'tip' },
          ],
        },
        {
          type: 'type_answer',
          prompt: 'Переведи на русский:',
          termEs: 'Arcén',
          correctAnswer: 'обочина',
          hint: 'О...',
          insights: [
            { label: 'Польза', text: 'Это термин базового дорожного пространства. Без него трудно читать схемы и задачи на безопасность.', tone: 'info' },
          ],
        },
      ],
    },
    {
      id: 'ch1-l3',
      title: 'Перекрёстки',
      emoji: '✚',
      exercises: [
        {
          type: 'vocab_intro',
          termEs: 'Glorieta',
          termRu: 'Круговой перекрёсток',
          descriptionRu: 'Круговое пересечение дорог. Транспорт, уже движущийся в круге, имеет приоритет перед въезжающими.',
          exampleEs: 'En la glorieta, ceda el paso a los que ya circulan.',
          exampleRu: 'На круговом перекрёстке уступите дорогу тем, кто уже едет в круге.',
          insights: [
            { label: 'Экзамен DGT', text: 'Glorieta почти всегда связана с вопросом про приоритет и выбор полосы.', tone: 'tip' },
            { label: 'Частая ошибка', text: 'Новички запоминают форму перекрёстка, но забывают главное правило: приоритет у тех, кто уже внутри.', tone: 'warning' },
          ],
        },
        { type: 'flashcard', termEs: 'Glorieta', termRu: 'Круговой перекрёсток', descriptionRu: 'Круговое пересечение дорог. Транспорт в круге имеет приоритет.', insights: [{ label: 'Запоминалка', text: 'Сначала смотри внутрь круга, а не на въезд.', tone: 'success' }] },
        { type: 'flashcard', termEs: 'Intersección', termRu: 'Перекрёсток', descriptionRu: 'Любое место пересечения двух или более дорог.', insights: [{ label: 'Польза', text: 'Это зонтичный термин, который нужен для сотен формулировок в тестах.', tone: 'info' }] },
        { type: 'flashcard', termEs: 'Paso a nivel', ru: 'Paso a nivel', termRu: 'Железнодорожный переезд', descriptionRu: 'Место пересечения дороги с железнодорожными путями.', insights: [{ label: 'Важно', text: 'Переезд почти всегда означает повышенную опасность и отдельные ограничения.', tone: 'warning' }] },
        { type: 'flashcard', termEs: 'Ceda el paso', termRu: 'Уступи дорогу', descriptionRu: 'Знак/правило: ты обязан пропустить других участников.', insights: [{ label: 'DGT язык', text: 'Если видишь ceder el paso, ищи, кто должен ждать, а кто движется первым.', tone: 'tip' }] },
        {
          type: 'multiple_choice',
          question: 'Кто имеет приоритет на «glorieta»?',
          termEs: 'Glorieta / Rotonda',
          correctAnswer: 'Тот, кто уже едет в круге',
          options: [
            'Тот, кто уже едет в круге',
            'Тот, кто въезжает в круг',
            'Тот, кто едет справа',
            'Знак решает в каждом случае',
          ],
          insights: [
            { label: 'Как мыслить', text: 'На круге базовое правило сильнее привычного “помеха справа”.', tone: 'success' },
          ],
        },
        {
          type: 'match_pairs',
          pairs: [
            { es: 'Glorieta', ru: 'Круговой перекрёсток' },
            { es: 'Intersección', ru: 'Перекрёсток' },
            { es: 'Paso a nivel', ru: 'Ж/д переезд' },
            { es: 'Ceda el paso', ru: 'Уступи дорогу' },
          ],
        },
        {
          type: 'word_tiles',
          prompt: 'Составь перевод:',
          sentenceEs: 'En la glorieta, ceda el paso a los vehículos que circulan.',
          correctWords: ['На', 'круговом', 'перекрёстке', 'уступите', 'дорогу', 'движущимся', 'автомобилям'],
          extraWords: ['светофору', 'пешеходам', 'знаку'],
        },
        {
          type: 'context',
          sentence: 'На «___» все въезжающие обязаны уступить дорогу транспорту в круге.',
          sentenceEs: 'En la «___» los que entran ceden el paso a los que circulan.',
          options: ['glorieta', 'intersección', 'paso a nivel'],
          correctAnswer: 'glorieta',
          insights: [
            { label: 'Польза', text: 'Это почти готовый шаблон экзаменационной фразы, его выгодно запомнить целиком.', tone: 'info' },
          ],
        },
        {
          type: 'type_answer',
          prompt: 'Переведи на русский:',
          termEs: 'Ceda el paso',
          correctAnswer: 'уступи дорогу',
          hint: 'У...',
          insights: [
            { label: 'Важно', text: 'Этот термин должен всплывать автоматически. На экзамене на раздумья времени мало.', tone: 'tip' },
          ],
        },
      ],
    },
    {
      id: 'ch1-l4',
      title: 'Знаки и сигналы',
      emoji: '🚦',
      exercises: [
        {
          type: 'vocab_intro',
          termEs: 'Señal de prohibición',
          termRu: 'Запрещающий знак',
          descriptionRu: 'Круглый знак с красной каймой на белом фоне. Запрещает определённое действие (обгон, остановку, поворот).',
          exampleEs: 'Esta señal de prohibición indica que no se puede adelantar.',
          exampleRu: 'Этот запрещающий знак означает, что обгон запрещён.',
          insights: [
            { label: 'Польза', text: 'Это один из ключевых визуальных шаблонов: форма и цвет часто важнее текста.', tone: 'success' },
            { label: 'Частая ошибка', text: 'Студенты учат название знака, но не категорию. На DGT часто спрашивают именно класс сигнала.', tone: 'warning' },
          ],
        },
        { type: 'flashcard', termEs: 'Señal de prohibición', termRu: 'Запрещающий знак', descriptionRu: 'Красная круглая рамка. Запрещает определённое действие.', insights: [{ label: 'Запоминалка', text: 'Красный круг = нельзя.', tone: 'success' }] },
        { type: 'flashcard', termEs: 'Señal de obligación', termRu: 'Предписывающий знак', descriptionRu: 'Синий круг. Обязывает выполнить действие.', insights: [{ label: 'Запоминалка', text: 'Синий круг = нужно сделать.', tone: 'success' }] },
        { type: 'flashcard', termEs: 'Señal de advertencia', termRu: 'Предупреждающий знак', descriptionRu: 'Жёлтый/белый треугольник с красной рамкой. Предупреждает об опасности.', insights: [{ label: 'Запоминалка', text: 'Треугольник = впереди опасность, а не запрет.', tone: 'tip' }] },
        { type: 'flashcard', termEs: 'Señal de información', termRu: 'Информационный знак', descriptionRu: 'Синий или зелёный прямоугольник. Информирует о маршрутах и услугах.', insights: [{ label: 'Польза', text: 'Эти знаки редко запрещают, их задача — ориентировать.', tone: 'info' }] },
        {
          type: 'multiple_choice',
          question: 'Как выглядит «señal de prohibición»?',
          correctAnswer: 'Красный круг с белым фоном',
          options: [
            'Красный круг с белым фоном',
            'Синий круг',
            'Жёлтый треугольник',
            'Зелёный прямоугольник',
          ],
          insights: [
            { label: 'Экзамен DGT', text: 'Если сомневаешься, сначала определи форму, потом цвет, и только потом действие.', tone: 'tip' },
          ],
        },
        {
          type: 'match_pairs',
          pairs: [
            { es: 'Señal de prohibición', ru: 'Запрещающий знак' },
            { es: 'Señal de obligación', ru: 'Предписывающий знак' },
            { es: 'Señal de advertencia', ru: 'Предупреждающий знак' },
            { es: 'Señal de información', ru: 'Информационный знак' },
          ],
        },
        {
          type: 'word_tiles',
          prompt: 'Составь перевод:',
          sentenceEs: 'La señal de obligación tiene forma circular y color azul.',
          correctWords: ['Предписывающий', 'знак', 'имеет', 'круглую', 'форму', 'и', 'синий', 'цвет'],
          extraWords: ['красный', 'треугольную', 'жёлтый'],
        },
        {
          type: 'context',
          sentence: 'Синий круг — это «___», он обязывает водителя что-то сделать.',
          sentenceEs: 'El círculo azul es una «___», obliga al conductor a actuar.',
          options: ['señal de obligación', 'señal de prohibición', 'señal de advertencia'],
          correctAnswer: 'señal de obligación',
          insights: [
            { label: 'Логика', text: 'Здесь слово obliga уже само подталкивает к правильному типу знака.', tone: 'success' },
          ],
        },
        {
          type: 'type_answer',
          prompt: 'Переведи на русский:',
          termEs: 'Señal de advertencia',
          correctAnswer: 'предупреждающий знак',
          hint: 'П...',
          insights: [
            { label: 'Польза', text: 'Этот термин нужен не только для словаря знаков, но и для понимания иерархии сигналов.', tone: 'info' },
          ],
        },
      ],
    },
    {
      id: 'ch1-l5',
      title: 'Итог: Дорога и разметка',
      emoji: '🏆',
      exercises: [
        {
          type: 'context',
          sentence: 'Скоростная дорога без пересечений на одном уровне — это «___».',
          sentenceEs: 'Una vía de alta velocidad sin cruces a nivel es una «___».',
          options: ['autopista', 'autovía', 'carretera convencional'],
          correctAnswer: 'autopista',
        },
        {
          type: 'multiple_choice',
          question: 'Что означает «arcén»?',
          termEs: 'Arcén',
          correctAnswer: 'Обочина',
          options: ['Обочина', 'Полоса движения', 'Разделительная полоса', 'Тротуар'],
        },
        {
          type: 'context',
          sentence: 'Прерывистую линию «___» можно пересекать при обгоне.',
          sentenceEs: 'La «___» se puede cruzar para adelantar si es seguro.',
          options: ['línea discontinua', 'línea continua', 'línea de parada'],
          correctAnswer: 'línea discontinua',
        },
        {
          type: 'type_answer',
          prompt: 'Переведи на русский:',
          termEs: 'Glorieta',
          correctAnswer: 'круговой перекрёсток',
          hint: 'К...',
        },
        {
          type: 'multiple_choice',
          question: 'Жёлтый треугольник — это...',
          correctAnswer: 'Предупреждающий знак',
          options: ['Предупреждающий знак', 'Запрещающий знак', 'Информационный знак', 'Приоритетный знак'],
        },
        {
          type: 'match_pairs',
          pairs: [
            { es: 'Autopista', ru: 'Автомагистраль' },
            { es: 'Señal de prohibición', ru: 'Запрещающий знак' },
            { es: 'Ceda el paso', ru: 'Уступи дорогу' },
            { es: 'Paso a nivel', ru: 'Ж/д переезд' },
          ],
        },
        {
          type: 'word_tiles',
          prompt: 'Составь перевод:',
          sentenceEs: 'En la carretera convencional la velocidad máxima es 90 km/h.',
          correctWords: ['На', 'обычной', 'дороге', 'максимальная', 'скорость', '90', 'км/ч'],
          extraWords: ['120', 'автомагистрали', 'минимальная'],
        },
        {
          type: 'context',
          sentence: 'На перекрёстке, где нет знаков, приоритет у дороги с «___».',
          sentenceEs: 'En intersecciones sin señales, tiene preferencia la vía con «___».',
          options: ['señal de preferencia', 'ceda el paso', 'línea continua'],
          correctAnswer: 'señal de preferencia',
        },
        {
          type: 'type_answer',
          prompt: 'Переведи на русский:',
          termEs: 'Carril',
          correctAnswer: 'полоса движения',
          hint: 'П...',
        },
      ],
    },
  ],
};
