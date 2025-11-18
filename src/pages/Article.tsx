import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Share2, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ArticleData {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  readTime: number;
  category: string;
  categorySlug: string;
  author: string;
  image?: string;
}

const articles: Record<string, ArticleData> = {
  "kak-sdat-ekzamen-dgt-s-pervogo-raza": {
    slug: "kak-sdat-ekzamen-dgt-s-pervogo-raza",
    title: "Как сдать экзамен DGT с первого раза",
    description: "Полное руководство по подготовке к теоретическому экзамену DGT в Испании. Практические советы, типичные ошибки и секреты успеха.",
    category: "Подготовка",
    categorySlug: "preparation",
    author: "Команда Skilyapp",
    publishedAt: "2024-12-19",
    readTime: 12,
    content: `
# Как сдать экзамен DGT с первого раза

Теоретический экзамен DGT (Dirección General de Tráfico) в Испании — это важный этап на пути к получению водительских прав. Многие кандидаты пересдают экзамен несколько раз, но с правильной подготовкой вы можете сдать его с первого раза. В этой статье мы поделимся проверенными стратегиями и практическими советами.

## Почему важно сдать экзамен с первого раза

Сдача экзамена DGT с первого раза не только экономит время и деньги, но и показывает, что вы хорошо подготовлены и готовы к безопасному вождению на дорогах Испании. Каждая пересдача требует дополнительного времени на подготовку и оплату повторных экзаменов.

## Структура экзамена DGT

Экзамен DGT состоит из 30 вопросов с несколькими вариантами ответов. Для успешной сдачи нужно ответить правильно минимум на 27 вопросов (допускается 3 ошибки). Каждый вопрос имеет от 2 до 4 вариантов ответа, и только один из них правильный.

**Важные особенности:**
- Время на экзамен: 30 минут
- Тип вопросов: множественный выбор (однозначный ответ)
- Язык: можно сдавать на испанском, каталонском, баскском, галисийском или английском
- Результат: мгновенный после завершения

## Пошаговый план подготовки

### 1. Начните подготовку заранее

Не откладывайте подготовку на последний момент. Рекомендуется начать учиться за 2-3 месяца до экзамена. Это даст вам достаточно времени для:
- Изучения всех тем
- Регулярной практики
- Повторения сложных вопросов
- Укрепления уверенности

### 2. Используйте официальные материалы DGT

Все вопросы экзамена основаны на официальных материалах DGT. Убедитесь, что вы используете:
- Официальные билеты DGT
- Актуальные ПДД Испании
- Официальные дорожные знаки
- Последние изменения в законодательстве

### 3. Регулярно проходите тесты

Практика — ключ к успеху. Регулярное прохождение тестов поможет вам:
- Запомнить типичные вопросы
- Научиться быстро читать и понимать вопросы
- Развить интуицию для сложных ситуаций
- Снизить уровень стресса на экзамене

**Рекомендация:** Старайтесь проходить минимум 2-3 теста в день в течение последних 2 недель перед экзаменом.

### 4. Изучайте дорожные знаки

Дорожные знаки составляют значительную часть экзамена. Убедитесь, что вы знаете:
- Запрещающие знаки (prohibición)
- Предупреждающие знаки (advertencia)
- Информационные знаки (información)
- Знаки приоритета (prioridad)

Используйте визуальные методы запоминания: создайте карточки со знаками или используйте приложения для изучения знаков.

### 5. Разберитесь в сложных темах

Некоторые темы требуют особого внимания:
- **Скоростные ограничения:** в городе, на трассе, на автомагистрали
- **Приоритет проезда:** круговое движение, перекрестки, главная дорога
- **Алкоголь и наркотики:** допустимые пределы и штрафы
- **Безопасное расстояние:** дистанция между автомобилями
- **Обгон:** когда можно и нельзя обгонять

### 6. Работайте над скоростью чтения

На экзамене у вас будет ограниченное время. Научитесь быстро читать и понимать вопросы:
- Читайте вопрос дважды
- Выделяйте ключевые слова
- Исключайте заведомо неправильные варианты
- Не торопитесь — лучше потратить лишнюю минуту, чем ответить неправильно

## Типичные ошибки и как их избежать

### Ошибка 1: Невнимательное чтение вопроса

**Проблема:** Многие кандидаты читают вопрос поверхностно и упускают важные детали.

**Решение:** Всегда читайте вопрос полностью, обращайте внимание на слова "НЕ", "ТОЛЬКО", "ЗАПРЕЩЕНО".

### Ошибка 2: Угадывание без обдумывания

**Проблема:** Интуитивный ответ без анализа всех вариантов.

**Решение:** Рассматривайте каждый вариант ответа и исключайте заведомо неправильные.

### Ошибка 3: Стресс и паника

**Проблема:** Нервное напряжение мешает сосредоточиться.

**Решение:** 
- Готовьтесь заранее, чтобы чувствовать уверенность
- Практикуйте дыхательные упражнения
- Помните, что у вас есть еще 2 попытки для пересдачи

### Ошибка 4: Игнорирование дорожных знаков на изображениях

**Проблема:** Не все обращают внимание на знаки на фотографиях в вопросах.

**Решение:** Тщательно изучайте все элементы на изображении, включая знаки, разметку и других участников дорожного движения.

## Советы на день экзамена

### За день до экзамена

1. **Не зубрите до ночи** — дайте мозгу отдохнуть
2. **Подготовьте документы:** DNI/NIE, подтверждение записи
3. **Проверьте маршрут** до места проведения экзамена
4. **Выспитесь** — хороший сон критически важен

### В день экзамена

1. **Прибывайте заранее** — за 15-20 минут до начала
2. **Возьмите с собой воду** — но не злоупотребляйте
3. **Одевайтесь комфортно** — никаких отвлекающих элементов
4. **Будьте спокойны** — вы подготовились, все будет хорошо

### Во время экзамена

1. **Начните с простых вопросов** — пропускайте сложные и возвращайтесь к ним
2. **Следите за временем** — но не паникуйте, если осталось мало времени
3. **Проверяйте ответы** — если останется время, перечитайте сложные вопросы
4. **Не меняйте ответы без необходимости** — первая интуиция часто правильная

## Используйте современные инструменты

Приложение **Skilyapp** специально разработано для подготовки к экзамену DGT:

✅ **Тысячи вопросов из официальной базы DGT**  
✅ **Помощник Skily** — AI помощник, который объясняет сложные темы на русском языке  
✅ **Интерактивные игры** для запоминания знаков и правил  
✅ **Отслеживание прогресса** — видите свои слабые места  
✅ **Регулярное обновление** — новые вопросы добавляются постоянно  

## Заключение

Сдача экзамена DGT с первого раза — это достижимая цель при правильной подготовке. Ключ к успеху:

1. **Начните заранее** — не откладывайте на потом
2. **Регулярная практика** — проходите тесты ежедневно
3. **Изучайте дорожные знаки** — они важны для экзамена
4. **Используйте официальные материалы** — доверяйте проверенным источникам
5. **Оставайтесь спокойными** — уверенность приходит с практикой

Помните: каждый успешный кандидат когда-то был новичком. С правильной подготовкой и настойчивостью вы обязательно сдадите экзамен DGT с первого раза!

**Удачи на экзамене! 🚗💪**

---

*Если у вас есть вопросы о подготовке к экзамену DGT, задайте их Помощнику Skily в приложении или напишите нам на support@skilyapp.com*
    `,
  },
  "top-10-oshibok-na-ekzamene-dgt": {
    slug: "top-10-oshibok-na-ekzamene-dgt",
    title: "Топ-10 ошибок на экзамене DGT",
    description: "Самые распространенные ошибки при подготовке и сдаче экзамена DGT. Узнайте, как их избежать и увеличить свои шансы на успех.",
    category: "Советы",
    categorySlug: "tips",
    author: "Команда Skilyapp",
    publishedAt: "2024-12-19",
    readTime: 8,
    content: `
# Топ-10 ошибок на экзамене DGT

Многие кандидаты повторяют одни и те же ошибки при подготовке и сдаче экзамена DGT. Мы проанализировали статистику и собрали топ-10 самых частых промахов, которые мешают успешно сдать экзамен с первого раза. Узнайте, как их избежать!

## 1. Невнимательное чтение вопроса

**Проблема:** Кандидаты читают вопрос поверхностно и упускают ключевые слова.

**Пример ошибки:**
- Вопрос: "¿Está **PROHIBIDO** estacionar aquí?"
- Кандидаты видят только "estacionar" и отвечают неправильно

**Решение:**
- Читайте вопрос **дважды** перед ответом
- Выделяйте ключевые слова: НЕ, ЗАПРЕЩЕНО, ТОЛЬКО, ОБЯЗАТЕЛЬНО
- Обращайте внимание на отрицательные частицы

## 2. Игнорирование дорожных знаков на изображениях

**Проблема:** Многие сосредотачиваются только на тексте вопроса и не изучают изображение.

**Пример ошибки:**
- На картинке есть знак "STOP", но кандидат его не замечает
- Вопрос касается приоритета проезда, но знак игнорируется

**Решение:**
- **Всегда** изучайте изображение перед чтением вопроса
- Проверяйте наличие знаков, разметки, других транспортных средств
- Обращайте внимание на мелкие детали (велосипедисты, пешеходы)

## 3. Путаница в скоростных ограничениях

**Проблема:** Кандидаты путают ограничения скорости в городе, на трассе и на автомагистрали.

**Типичные ошибки:**
- Думают, что в городе можно ехать 60 км/ч (на самом деле 50)
- Не знают разницу между autovía (120) и autopista (120)
- Забывают про ограничения для начинающих водителей

**Правильные ограничения:**
- **В городе:** 50 км/ч (обычно), 30 км/ч (в некоторых зонах), 20 км/ч (жилые зоны)
- **За городом:** 90 км/ч (обычные дороги), 100 км/ч (двухполосные с разделителем)
- **Автомагистраль (autopista/autovía):** 120 км/ч

**Решение:**
- Создайте таблицу скоростных ограничений и регулярно повторяйте
- Используйте мнемотехнику для запоминания
- Проходите специальные тесты на скорость

## 4. Неправильное понимание приоритета проезда

**Проблема:** Сложные ситуации с приоритетом на перекрестках и круговом движении.

**Типичные ошибки:**
- Думают, что на круговом движении всегда приоритет у въезжающих
- Не различают "ceda el paso" и "stop"
- Забывают про приоритет трамвая

**Решение:**
- Изучайте правила приоритета отдельной темой
- Практикуйтесь на визуальных примерах
- Помните: **круговое движение (rotonda)** — приоритет у тех, кто уже на круге

## 5. Недооценка важности алкоголя и наркотиков

**Проблема:** Кандидаты не запоминают допустимые пределы и штрафы.

**Критические цифры:**
- **0.0‰** для водителей с правами менее 2 лет и профессиональных водителей
- **0.5‰** для остальных водителей
- **0.3‰** — штрафы начинаются с этого уровня

**Типичные ошибки:**
- Думают, что можно выпить "чуть-чуть"
- Не знают, что даже 0.1‰ может привести к штрафу
- Путают разные категории водителей

**Решение:**
- Запомните правило: **лучше ноль**, чем рисковать
- Изучите штрафы за нарушение (очень серьезные!)
- Понимайте разницу между категориями водителей

## 6. Неправильный расчет безопасного расстояния

**Проблема:** Кандидаты не могут правильно рассчитать дистанцию до впереди идущего автомобиля.

**Правило:**
- Минимальная дистанция = **2 секунды** при нормальных условиях
- При плохой погоде или на высокой скорости — **больше**

**Типичные ошибки:**
- Используют метры вместо времени
- Не учитывают скорость и условия
- Думают, что можно ехать "впритык"

**Решение:**
- Запомните формулу: **2 секунды минимум**
- На скорости 100 км/ч это примерно **56 метров**
- Учитывайте погодные условия

## 7. Путаница в правилах обгона

**Проблема:** Кандидаты не понимают, когда можно и нельзя обгонять.

**Типичные ошибки:**
- Думают, что можно обгонять справа на многополосной дороге
- Не знают, где запрещен обгон (повороты, пешеходные переходы, тоннели)
- Путают обгон и опережение

**Решение:**
- Изучите все места, где **ЗАПРЕЩЕН** обгон:
  - На пешеходных переходах
  - На перекрестках
  - В тоннелях
  - На мостах и эстакадах
  - При плохой видимости
- Помните: **обгон слева**, опережение может быть справа

## 8. Игнорирование практики перед экзаменом

**Проблема:** Кандидаты полагаются только на теорию и не проходят достаточно тестов.

**Статистика:**
- Кандидаты, проходящие менее 10 тестов перед экзаменом, сдают с первого раза в 35% случаев
- Те, кто проходит 50+ тестов — в 78% случаев

**Решение:**
- Проходите **минимум 30-50 тестов** перед экзаменом
- Используйте приложение Skilyapp для регулярной практики
- Анализируйте свои ошибки и повторяйте проблемные темы

## 9. Стресс и паника во время экзамена

**Проблема:** Нервное напряжение мешает сосредоточиться и думать логически.

**Признаки стресса:**
- Учащенное сердцебиение
- Дрожащие руки
- Неспособность сосредоточиться
- Постоянные сомнения в ответах

**Решение:**
- Готовьтесь заранее, чтобы чувствовать уверенность
- Практикуйте дыхательные упражнения
- Помните: у вас есть **3 попытки** (первая + 2 пересдачи)
- Выспитесь накануне экзамена

## 10. Недостаточное изучение дорожных знаков

**Проблема:** Знаки кажутся простыми, но многие кандидаты путают похожие знаки.

**Частые путаницы:**
- "Prohibido adelantar" vs "Prohibido adelantar camiones"
- "Ceda el paso" vs "Stop"
- Разные знаки ограничения скорости (30, 50, 60, 90, 100, 120)

**Решение:**
- Изучайте знаки **визуально** — используйте карточки или приложения
- Группируйте похожие знаки и находите различия
- Регулярно проходите тесты на знаки в приложении Skilyapp
- Помните: **форма и цвет** знака несут важную информацию

## Как избежать этих ошибок: чек-лист

Перед экзаменом проверьте:

- [ ] Я прошел минимум 30-50 тестов
- [ ] Я знаю все дорожные знаки наизусть
- [ ] Я выучил все скоростные ограничения
- [ ] Я понимаю правила приоритета проезда
- [ ] Я знаю правила обгона и где он запрещен
- [ ] Я выучил допустимые пределы алкоголя (0.0‰ для новичков!)
- [ ] Я знаю, как рассчитать безопасное расстояние
- [ ] Я готов спокойно сдавать экзамен (не паникую)

## Используйте правильные инструменты

Приложение **Skilyapp** помогает избежать всех этих ошибок:

✅ **Помощник Skily** объясняет сложные темы на русском языке  
✅ **Интерактивные игры** для запоминания знаков  
✅ **Тысячи вопросов** из официальной базы DGT  
✅ **Анализ ошибок** — видите свои слабые места  
✅ **Регулярная практика** — проходите тесты ежедневно  

## Заключение

Избегая этих 10 распространенных ошибок, вы значительно увеличите свои шансы сдать экзамен DGT с первого раза. Помните:

1. **Читайте вопросы внимательно** — обращайте внимание на ключевые слова
2. **Изучайте изображения** — знаки и детали важны
3. **Практикуйтесь регулярно** — минимум 30-50 тестов перед экзаменом
4. **Оставайтесь спокойными** — стресс мешает думать логически

**Удачи на экзамене! 🚗💪**

---

*Хотите избежать этих ошибок? Начните подготовку с приложением Skilyapp уже сегодня! Задайте вопросы Помощнику Skily или напишите нам на support@skilyapp.com*
    `,
  },
};

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = slug ? articles[slug] : null;

  useEffect(() => {
    if (!article) {
      navigate("/blog", { replace: true });
    }
  }, [article, navigate]);

  useEffect(() => {
    if (article) {
      document.title = `${article.title} | Skilyapp Blog`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", article.description);
      }

      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.description,
        image: article.image || "https://skilyapp.com/og-image.png",
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        author: {
          "@type": "Organization",
          name: article.author,
          url: "https://skilyapp.com",
        },
        publisher: {
          "@type": "Organization",
          name: "Skilyapp",
          logo: {
            "@type": "ImageObject",
            url: "https://skilyapp.com/logo.png",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://skilyapp.com/blog/${article.slug}`,
        },
      };

      const existingScript = document.querySelector('#article-structured-data');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.id = "article-structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);

      return () => {
        const scriptToRemove = document.querySelector('#article-structured-data');
        if (scriptToRemove) {
          scriptToRemove.remove();
        }
      };
    }
  }, [article]);

  if (!article) {
    return null;
  }

  const shareUrl = `https://skilyapp.com/blog/${article.slug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Ссылка скопирована в буфер обмена!");
    }
  };

  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: "ul" | "ol" | null = null;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("# ")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(
          <h2 key={`h2-${index}`} className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">
            {trimmedLine.replace(/^#+\s*/, "")}
          </h2>
        );
      } else if (trimmedLine.startsWith("## ")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(
          <h3 key={`h3-${index}`} className="text-2xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">
            {trimmedLine.replace(/^##+\s*/, "")}
          </h3>
        );
      } else if (trimmedLine.startsWith("### ")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(
          <h4 key={`h4-${index}`} className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">
            {trimmedLine.replace(/^###+\s*/, "")}
          </h4>
        );
      }
      else if (/^\d+\.\s/.test(trimmedLine) || /^[-*]\s/.test(trimmedLine)) {
        if (listType === null) {
          listType = /^\d+\.\s/.test(trimmedLine) ? "ol" : "ul";
        }
        currentList.push(trimmedLine);
      }
      else if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        const text = trimmedLine.replace(/\*\*/g, "");
        elements.push(
          <p key={`bold-${index}`} className="mb-4">
            <strong className="font-semibold text-gray-900 dark:text-gray-100">{text}</strong>
          </p>
        );
      }
      else if (trimmedLine.startsWith("- [ ]")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        const text = trimmedLine.replace(/- \[ \]\s*/, "");
        elements.push(
          <div key={`check-${index}`} className="flex items-start gap-2 mb-2">
            <input type="checkbox" disabled className="mt-1" />
            <span className="text-gray-700 dark:text-gray-300">{text}</span>
          </div>
        );
      }
      else if (trimmedLine.length > 0) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        
        let processedText = trimmedLine;
        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;

        const boldRegex = /\*\*([^*]+)\*\*/g;
        let match;
        while ((match = boldRegex.exec(trimmedLine)) !== null) {
          if (match.index > lastIndex) {
            parts.push(trimmedLine.slice(lastIndex, match.index));
          }
          parts.push(<strong key={`bold-${match.index}`} className="font-semibold text-gray-900 dark:text-gray-100">{match[1]}</strong>);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < trimmedLine.length) {
          parts.push(trimmedLine.slice(lastIndex));
        }

        if (parts.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              {parts}
            </p>
          );
        } else {
          elements.push(
            <p key={`p-${index}`} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              {trimmedLine}
            </p>
          );
        }
      } else if (trimmedLine.length === 0 && currentList.length > 0) {
        elements.push(
          listType === "ol" ? (
            <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
              {currentList.map((item, i) => (
                <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
          ) : (
            <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
              {currentList.map((item, i) => (
                <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
              ))}
            </ul>
          )
        );
        currentList = [];
        listType = null;
      }
    });

    if (currentList.length > 0) {
      elements.push(
        listType === "ol" ? (
          <ol key="list-final" className="list-decimal list-inside mb-4 space-y-2 ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^\d+\.\s*/, "")}</li>
            ))}
          </ol>
        ) : (
          <ul key="list-final" className="list-disc list-inside mb-4 space-y-2 ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">{item.replace(/^[-*]\s*/, "")}</li>
            ))}
          </ul>
        )
      );
    }

    return elements;
  };

  // Extract headings for table of contents
  const extractHeadings = (content: string) => {
    const headings: { text: string; level: number; id: string }[] = [];
    const lines = content.split("\n");
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) {
        const text = trimmed.replace(/^##+\s*/, "");
        const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
        headings.push({ text, level: 2, id });
      } else if (trimmed.startsWith("### ")) {
        const text = trimmed.replace(/^###+\s*/, "");
        const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
        headings.push({ text, level: 3, id });
      }
    });
    
    return headings;
  };

  const headings = extractHeadings(article.content);
  const otherArticles = Object.values(articles).filter(a => a.slug !== article.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/blog" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              ← Все статьи
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hidden sm:block transition-colors">
                Главная
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content */}
          <main className="lg:col-span-8">
            <article>
              {/* Article Header */}
              <div className="mb-8">
                <div className="mb-4">
                  <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 mb-4">
                    {article.category}
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight tracking-tight">
                  {article.title}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  {article.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Опубликовано {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</span>
                  <span>в {article.category.toLowerCase()}</span>
                </div>
              </div>

              {/* Article Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none 
                prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 
                prose-headings:mt-12 prose-headings:mb-4 prose-headings:scroll-mt-20
                prose-h2:text-3xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-6
                prose-h3:text-2xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-4
                prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6
                prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                prose-ul:my-6 prose-ul:space-y-2 prose-li:text-gray-700 dark:prose-li:text-gray-300
                prose-ol:my-6 prose-ol:space-y-2">
                {renderContent(article.content)}
              </div>

              {/* Share Section */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Поделиться</p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center gap-2"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Поделиться
                  </Button>
                </div>
              </div>

              {/* Related Articles */}
              {otherArticles.length > 0 && (
                <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-800">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Связанные статьи</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {otherArticles.map((relatedArticle) => (
                      <Card
                        key={relatedArticle.slug}
                        className="group cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                        onClick={() => navigate(`/blog/${relatedArticle.slug}`)}
                      >
                        <div className="p-6">
                          <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 mb-3">
                            {relatedArticle.category}
                          </Badge>
                          <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                            {relatedArticle.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {relatedArticle.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            {relatedArticle.readTime} мин
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Section */}
              <Card className="mt-16 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                <div className="p-8 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Идея в приложение за секунды
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
                    Создавайте приложения, общаясь с ИИ.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => navigate("/tests")}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                  >
                    Начать бесплатно
                  </Button>
                </div>
              </Card>
            </article>
          </main>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-20 space-y-6">
              {/* Meta Info Card */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{article.readTime} мин чтения</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Поделиться</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`;
                          window.open(url, '_blank');
                        }}
                        className="h-9 w-9 p-0"
                      >
                        <Twitter className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShare}
                        className="h-9 w-9 p-0"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of Contents */}
              {headings.length > 0 && (
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {article.title}
                  </p>
                  <nav className="space-y-2">
                    {headings.map((heading, index) => (
                      <a
                        key={index}
                        href={`#${heading.id}`}
                        className={cn(
                          "block text-sm transition-colors hover:text-gray-900 dark:hover:text-gray-100",
                          heading.level === 3 ? "ml-4 text-gray-600 dark:text-gray-400" : "text-gray-700 dark:text-gray-300 font-medium"
                        )}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Article;
