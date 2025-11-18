import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { ArrowLeft, Clock, Calendar, Share2, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface ArticleData {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  readTime: number;
  category: string;
  author: string;
  image?: string;
}

const articles: Record<string, ArticleData> = {
  "kak-sdat-ekzamen-dgt-s-pervogo-raza": {
    slug: "kak-sdat-ekzamen-dgt-s-pervogo-raza",
    title: "Как сдать экзамен DGT с первого раза",
    description: "Полное руководство по подготовке к теоретическому экзамену DGT в Испании. Практические советы, типичные ошибки и секреты успеха.",
    category: "Подготовка",
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
      // Обновляем метатеги для SEO
      document.title = `${article.title} | Skilyapp Blog`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", article.description);
      }

      // Добавляем структурированные данные Article
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

      // Удаляем старые структурированные данные статьи, если есть
      const existingScript = document.querySelector('#article-structured-data');
      if (existingScript) {
        existingScript.remove();
      }

      // Добавляем новые структурированные данные
      const script = document.createElement("script");
      script.id = "article-structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);

      return () => {
        // Очистка при размонтировании
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
      // Fallback: копируем в буфер обмена
      navigator.clipboard.writeText(shareUrl);
      alert("Ссылка скопирована в буфер обмена!");
    }
  };

  // Конвертируем Markdown в JSX (простая версия)
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: "ul" | "ol" | null = null;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Заголовки
      if (trimmedLine.startsWith("# ")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(
          <h2 key={`h2-${index}`} className="text-3xl font-bold mt-8 mb-4 text-foreground">
            {trimmedLine.replace(/^#+\s*/, "")}
          </h2>
        );
      } else if (trimmedLine.startsWith("## ")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(
          <h3 key={`h3-${index}`} className="text-2xl font-bold mt-6 mb-3 text-foreground">
            {trimmedLine.replace(/^##+\s*/, "")}
          </h3>
        );
      } else if (trimmedLine.startsWith("### ")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(
          <h4 key={`h4-${index}`} className="text-xl font-semibold mt-4 mb-2 text-foreground">
            {trimmedLine.replace(/^###+\s*/, "")}
          </h4>
        );
      }
      // Списки
      else if (/^\d+\.\s/.test(trimmedLine) || /^[-*]\s/.test(trimmedLine)) {
        if (listType === null) {
          listType = /^\d+\.\s/.test(trimmedLine) ? "ol" : "ul";
        }
        currentList.push(trimmedLine);
      }
      // Жирный текст
      else if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
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
            <strong className="font-semibold text-foreground">{text}</strong>
          </p>
        );
      }
      // Чек-листы
      else if (trimmedLine.startsWith("- [ ]")) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
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
            <span className="text-muted-foreground">{text}</span>
          </div>
        );
      }
      // Обычный текст
      else if (trimmedLine.length > 0) {
        if (currentList.length > 0) {
          elements.push(
            listType === "ol" ? (
              <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            ) : (
              <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
                {currentList.map((item, i) => (
                  <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            )
          );
          currentList = [];
          listType = null;
        }
        
        // Обработка форматирования внутри текста
        let processedText = trimmedLine;
        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;

        // Обработка **жирного текста**
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let match;
        while ((match = boldRegex.exec(trimmedLine)) !== null) {
          if (match.index > lastIndex) {
            parts.push(trimmedLine.slice(lastIndex, match.index));
          }
          parts.push(<strong key={`bold-${match.index}`} className="font-semibold">{match[1]}</strong>);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < trimmedLine.length) {
          parts.push(trimmedLine.slice(lastIndex));
        }

        if (parts.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="mb-4 text-muted-foreground leading-relaxed">
              {parts}
            </p>
          );
        } else {
          elements.push(
            <p key={`p-${index}`} className="mb-4 text-muted-foreground leading-relaxed">
              {trimmedLine}
            </p>
          );
        }
      } else if (trimmedLine.length === 0 && currentList.length > 0) {
        elements.push(
          listType === "ol" ? (
            <ol key={`list-${index}`} className="list-decimal list-inside mb-4 space-y-2 ml-4">
              {currentList.map((item, i) => (
                <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
          ) : (
            <ul key={`list-${index}`} className="list-disc list-inside mb-4 space-y-2 ml-4">
              {currentList.map((item, i) => (
                <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
              ))}
            </ul>
          )
        );
        currentList = [];
        listType = null;
      }
    });

    // Добавляем оставшийся список
    if (currentList.length > 0) {
      elements.push(
        listType === "ol" ? (
          <ol key="list-final" className="list-decimal list-inside mb-4 space-y-2 ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, "")}</li>
            ))}
          </ol>
        ) : (
          <ul key="list-final" className="list-disc list-inside mb-4 space-y-2 ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-muted-foreground">{item.replace(/^[-*]\s*/, "")}</li>
            ))}
          </ul>
        )
      );
    }

    return elements;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/blog")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к блогу
          </Button>
        </motion.div>

        {/* Article Header */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8 border-2">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary" className="text-sm">
                  {article.category}
                </Badge>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {article.readTime} мин чтения
                  </div>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {article.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6">
                {article.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="w-4 h-4" />
                  <span>{article.author}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Поделиться
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Article Content */}
          <Card className="border-2">
            <CardContent className="p-6 md:p-8">
              <div className="prose prose-lg max-w-none">
                {renderContent(article.content)}
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card className="mt-8 bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-2 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">
                Готовы начать подготовку?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Присоединяйтесь к тысячам студентов, которые уже готовятся к экзамену DGT с помощью Skilyapp
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/tests")}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                Начать обучение
              </Button>
            </CardContent>
          </Card>
        </motion.article>
      </div>
    </Layout>
  );
};

export default Article;

