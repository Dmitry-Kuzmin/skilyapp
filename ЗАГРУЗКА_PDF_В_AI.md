# 📚 Загрузка PDF учебников в AI (RAG)

## Проблема

AI не знает специфику испанских ПДД и DGT, поэтому пишет общие фразы вроде "в некоторых странах" и упоминает рубли вместо евро.

## Решение

### Краткосрочное (СДЕЛАНО):
✅ Обновлён промпт — теперь AI знает, что это про Испанию и DGT
✅ Акцент на конкретику и цифры
✅ Запрет на общие фразы

### Долгосрочное (нужно настроить):
Создать RAG (Retrieval-Augmented Generation) — AI будет использовать твои PDF учебники как источник знаний.

## Как загрузить PDF в AI (пошагово)

### Вариант 1: Через Supabase Vector Store (рекомендую)

#### Шаг 1: Создай таблицу для документов

```sql
-- Включаем векторное расширение
create extension if not exists vector;

-- Таблица для хранения чанков документов
create table dgt_knowledge (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  content text not null,
  content_embedding vector(1536),
  source_file text,
  page_number integer,
  created_at timestamptz default now()
);

-- Индекс для быстрого поиска
create index on dgt_knowledge using ivfflat (content_embedding vector_cosine_ops);
```

#### Шаг 2: Обработай PDF файлы

Создай скрипт для обработки PDF:

```typescript
// scripts/process-pdfs.ts
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";

// 1. Загрузи PDF
const loader = new PDFLoader("путь/к/файлу.pdf");
const docs = await loader.load();

// 2. Раздели на чанки
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const chunks = await splitter.splitDocuments(docs);

// 3. Создай embeddings и сохрани в Supabase
const embeddings = new OpenAIEmbeddings();
await SupabaseVectorStore.fromDocuments(
  chunks,
  embeddings,
  {
    client: supabase,
    tableName: "dgt_knowledge",
  }
);
```

#### Шаг 3: Обнови Edge Function

Добавь поиск по векторной базе:

```typescript
// В ai-chat/index.ts
async function getRelevantContext(question: string, supabase: any): Promise<string> {
  // Получаем embedding вопроса
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: question,
    }),
  });
  
  const { data } = await embeddingResponse.json();
  const embedding = data[0].embedding;
  
  // Ищем похожие документы
  const { data: docs } = await supabase
    .rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3,
    });
  
  return docs.map((doc: any) => doc.content).join('\n\n');
}

// В обработке запроса
const context = await getRelevantContext(messages[messages.length - 1].content, supabase);

// Добавляем контекст в промпт
const enhancedPrompt = `${systemPrompt}

КОНТЕКСТ ИЗ УЧЕБНИКОВ DGT:
${context}

Используй этот контекст для точного ответа.`;
```

---

### Вариант 2: Простой (без векторов) - быстрее настроить

#### Шаг 1: Извлеки текст из PDF

Используй онлайн-конвертер или скрипт:
```bash
# Установи pdftotext (если нет)
brew install poppler

# Конвертируй PDF в текст
pdftotext тема1.pdf тема1.txt
pdftotext тема2.pdf тема2.txt
```

#### Шаг 2: Загрузи в таблицу

```sql
create table dgt_manuals (
  id uuid primary key default gen_random_uuid(),
  topic_number integer,
  topic_name text,
  content text not null,
  created_at timestamptz default now()
);

-- Вставь данные
insert into dgt_manuals (topic_number, topic_name, content)
values
  (1, 'Общие положения', 'текст из PDF...'),
  (2, 'Водители', 'текст из PDF...');
```

#### Шаг 3: Используй в AI

```typescript
// Найди релевантную тему
const { data: manual } = await supabase
  .from('dgt_manuals')
  .select('content')
  .eq('topic_number', topicNumber)
  .single();

// Добавь в контекст
const enhancedPrompt = `${systemPrompt}

МАТЕРИАЛ ИЗ УЧЕБНИКА DGT:
${manual.content}

Используй этот материал для точного ответа.`;
```

---

### Вариант 3: Самый простой (временное решение)

Загрузи ключевые факты вручную в промпт:

```typescript
const dgtFacts = `
ИСПАНСКИЕ ПРАВИЛА DGT (краткая справка):

Скорости:
- Населённый пункт: 50 км/ч (30 км/ч на узких улицах)
- Автовиас (autovía): 100 км/ч
- Автописта (autopista): 120 км/ч

Штрафы (евро):
- Превышение 20-30 км/ч: 100€ + 2 балла
- Превышение 30-50 км/ч: 300€ + 4 балла
- Превышение 50+ км/ч: 600€ + 6 баллов
- Проезд на красный: 200€ + 4 балла
- Парковка на paso de peatones: 200€

Алкоголь:
- Лимит: 0.25 мг/л в выдыхаемом воздухе (0.5 г/л в крови)
- Новички (< 2 лет): 0.15 мг/л
- Штраф: от 500€ до 1000€ + лишение прав

[Добавь больше конкретных правил из твоих PDF]
`;

const systemPrompt = `${baseSystemPrompt}

${dgtFacts}`;
```

---

## Что сделать СЕЙЧАС

### Шаг 1: Обнови промпт (уже сделано)

Код обновлён в:
- `supabase/functions/ai-chat/index.ts`
- `AI_CHAT_CODE.txt`

Теперь AI знает, что это про Испанию и DGT.

### Шаг 2: Задеплой обновлённый код

1. Supabase Dashboard → Edge Functions → ai-chat → Code
2. Скопируй код из `AI_CHAT_CODE.txt`
3. Вставь в редактор
4. Нажми "Deploy updates"

### Шаг 3: Проверь работу

Задай вопрос про штрафы:
- До: "в некоторых странах... рубли..."
- После: "В Испании по правилам DGT... евро..."

---

## Загрузка PDF (следующий шаг)

### Что нужно для RAG:

1. **PDF файлы** (у тебя есть — 10 штук по темам)
2. **Скрипт обработки** (конвертация PDF → текст → чанки)
3. **Векторная база** (Supabase Vector Store)
4. **Embeddings API** (OpenAI или бесплатная альтернатива)
5. **Обновление Edge Function** (добавить поиск по векторам)

### Стоимость:

- **OpenAI Embeddings**: ~$0.0001 за 1000 токенов
- **Supabase Vector Store**: бесплатно
- **Общая стоимость**: ~$1-5 за обработку 10 PDF

### Бесплатные альтернативы:

- **Hugging Face Embeddings** (бесплатно)
- **Cohere Embeddings** (бесплатный тир)

---

## Какой вариант выбрать?

### Если нужно БЫСТРО (сегодня):
→ **Вариант 3**: Добавь ключевые факты в промпт вручную

### Если есть время (1-2 дня):
→ **Вариант 2**: Простая таблица с текстами

### Если хочешь ЛУЧШЕЕ (неделя):
→ **Вариант 1**: Полноценный RAG с векторами

---

## Что делать дальше?

1. **Сейчас**: Обнови промпт (код готов) — AI будет говорить про Испанию
2. **Потом**: Выбери вариант загрузки PDF
3. **Напиши**, какой вариант хочешь — помогу настроить

Хочешь начать с простого (Вариант 3 — ключевые факты в промпт)?
Или сразу делать RAG с векторами (Вариант 1)?

