# Project.md

## Что это за workspace

Текущий основной проект:
- `Skily / Sdadim DGT Prep`
- Каноничный путь: `/Users/dimka/Desktop/Skily/sdadim-dgt-prep`
- Git: `https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep`

Внутри него физически лежит отдельный git-репозиторий:
- `sdadim-eu` -> `/Users/dimka/Desktop/Skily/sdadim-dgt-prep/sdadim-eu`

Важно:
- В родительском репозитории они хранятся как `gitlink`-записи.
- При этом файла `.gitmodules` в корне нет.
- Это означает: структура рабочая, но неидеальная и легко создает путаницу с `git status`, `push`, переносом проекта и клонированием.
- Старый путь `/Users/dimka/Desktop/Sdadim/sdadim-dgt-prep` сохранен как symlink, чтобы ничего не сломалось.
- Для быстрого доступа добавлены верхнеуровневые входы:
  - `/Users/dimka/Desktop/Skily/sdadim-eu`
- `ton-core` и локальный исходный `pdd_russia` удалены из основного репозитория как лишние runtime-зависимости.
- Если понадобится повторный импорт `pdd_russia`, использовать внешний клон, например `/tmp/pdd_russia`.

## Моя оценка структуры

Коротко:
- Проект не легкий.
- Проект в рабочем состоянии.
- Исходный код выглядит живым и боевым, но workspace перегружен артефактами, данными и вложенными репозиториями.

По фактам:
- `src` около `13M`
- `data` около `10G`
- `_DELETED_ITEMS` около `740M`
- `sdadim-eu` около `407M`
- `dist` около `260M`
- `public` около `215M`
- `node_modules` около `1.0G`

Вывод:
- По исходникам это не огромный монолит, а средне-крупный продукт.
- По workspace это тяжелый проект, потому что рядом лежит слишком много несущих и временных материалов.

## Чистота проекта

Что хорошо:
- `npm run typecheck` проходит успешно.
- Структура `src` в целом логично разложена по доменам.
- Есть `docs/`, `scripts/`, `supabase/`, отдельные страницы и фичи.
- Основной dev-процесс стандартизирован через `package.json`.

Что мешает идеальному порядку:
- `npm run lint` сейчас слишком широкий: это `eslint .`, он не завершился за 45 секунд.
- В корне лежат временные файлы:
  - `tmp_check_columns.js`
  - `tmp_check_columns.ts`
  - `tmp_diagnose.ts`
  - `tmp_profile_test.ts`
  - `tmp_sql.json`
  - `tmp_test_send.ts`
- В `src` лежат backup/temp файлы:
  - `src/components/AuthModalNew.tsx.bak`
  - `src/components/Layout.tsx.backup`
  - `src/components/test-session/AnswerOptionsList.tsx.backup`
  - `src/hooks/useDuelGame.ts.bak`
  - `src/pages/TestSession.tsx.tmp_questions`
- Внутри основного репозитория все еще есть вложенный отдельный проект `sdadim-eu`.
- В git отслеживаются тяжелые данные и даже `_DELETED_ITEMS`, то есть "удаленное" по факту коммитится.

Оценка:
- Архитектурно: `7/10`
- По чистоте workspace: `4/10`
- По готовности к росту после разгрузки структуры: `8/10`

## Что стоит сделать для идеального порядка

### Уровень 1. Обязательно

1. Вынести вложенные проекты в соседние папки, а не держать их внутри основного репозитория.
   Рекомендуемая схема:
   - `/Users/dimka/Desktop/Skily/sdadim-dgt-prep`
   - `/Users/dimka/Desktop/Skily/sdadim-eu`

2. Перестать хранить `_DELETED_ITEMS` в git.

3. Убрать временные `tmp_*`, `.bak`, `.backup`, `.tmp_*` файлы из боевой структуры.

4. Сузить lint-команду.
   Лучше так:
   - `eslint src scripts supabase`
   - либо отдельные команды `lint:app`, `lint:scripts`, `lint:functions`

5. Разделить:
   - продуктовый код
   - импортируемые данные
   - архивы
   - внешние репозитории

### Уровень 2. Очень желательно

1. Перенести операционные заметки из головы и чатов в этот файл.
2. Добавить `docs/WORKSPACE_STRUCTURE.md` при следующем проходе.
3. Добавить `scripts/dev:doctor` для автопроверки портов, node path и зависших процессов.
4. Добавить `docs/RUNBOOK.md` для запуска, пуша, онбординга, Pagespeed и smoke-check.

## Как запускать localhost

### Основной проект Skily / Sdadim DGT Prep

Путь:
- `/Users/dimka/Desktop/Skily/sdadim-dgt-prep`

Node path:

```bash
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:$PATH"
```

Запуск всего dev-окружения:

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:$PATH"
npm run dev
```

Что поднимется:
- Frontend Vite: `http://localhost:8080`
- Validator API: `http://localhost:3030`
- Maintenance service: фоновый guardian-процесс

Важно:
- Актуальный порт фронтенда по конфигу сейчас `8080`, а не `5173`.
- Это подтверждено в `vite.config.ts`.

Только фронтенд:

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:$PATH"
npm run dev:frontend
```

Только validator:

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:$PATH"
npm run validator
```

### Отдельный проект `sdadim-eu`

Путь:
- `/Users/dimka/Desktop/Skily/sdadim-eu`

Запуск:

```bash
cd /Users/dimka/Desktop/Skily/sdadim-eu
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:$PATH"
npm run dev
```

Что откроется:
- `http://localhost:3100`

## Если localhost не работает

### Проверка 1. Убей старые процессы

```bash
pkill -f "node.*vite"
pkill -f "validator-server"
pkill -f "maintenance-service"
```

### Проверка 2. Очисти Vite-кэш

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
rm -rf .vite node_modules/.vite
```

### Проверка 3. Полный перезапуск

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:$PATH"
npm run dev
```

### Экстренная глубокая очистка

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:$PATH"
npm run panic-clean
```

## Вход на localhost

В консоли браузера:

```js
console.log(`sdadim_auth('${localStorage.getItem(Object.keys(localStorage).find(k => k.includes("-auth-token")))}')`)
```

## Онбординг

Смотреть:
- `http://localhost:8080/dashboard?onboarding=true`

Перед проверкой очистить в консоли браузера:

```js
localStorage.removeItem('pdd_onboarding_completed')
localStorage.removeItem('pdd_selected_country')
localStorage.removeItem('pdd_selected_category')
```

## Как пушить

### Основной проект

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
git status
git push origin main
```

### `sdadim-eu`

```bash
cd /Users/dimka/Desktop/Skily/sdadim-eu
git status
git push origin main
```

### Внешние reference-репозитории

Сейчас не хранятся внутри основного проекта.

При необходимости использовать внешние временные клоны:
- `git clone https://github.com/ton-blockchain/ton.git /tmp/ton-core`
- `git clone https://github.com/etspring/pdd_russia.git /tmp/pdd_russia`

## Важные файлы

- `CLAUDE.md` лежит в корне рядом с этим файлом
- `TON_CONNECT_REFERENCE.md` лежит в корне рядом с `CLAUDE.md`
- При работе с агентом сначала смотреть этот `Project.md`

## Supabase и база

Что уже настроено:

1. Supabase CLI
   - Версия: `2.84.2`
   - Пример:

```bash
/opt/homebrew/bin/supabase db query "SQL" --linked
```

2. Прямой доступ к БД

```bash
cd /Users/dimka/Desktop/Skily/sdadim-dgt-prep
./scripts/db.sh profiles
./scripts/db.sh tables
./scripts/db.sh "SELECT * FROM duels LIMIT 10"
```

3. Авто git push и авто deploy функций
- Проверять настройки в `~/.claude/settings.json`
- Для `supabase/functions/XXX/` может быть авто deploy `supabase functions deploy XXX`

4. Env vars в Claude settings
- `SUPABASE_PROJECT_REF`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Ежемесячный чек-лист Skily

- [ ] Проверить качество озвучки тестов
- [ ] Проверить работу AI-виджета в тестах и в dashboard
- [ ] Проверить работу уведомлений о баллах
- [ ] Проверить [PageSpeed Insights](https://pagespeed.web.dev)

## План развития

- [ ] Ежедневно прямые эфиры в TikTok по 30 вопросам, 1 час
- [ ] Ролики в TikTok, YouTube и Instagram
- [ ] Динамически менять аватар бота для геймификации

## Спрятано или требует ревизии

- [ ] Добавить 2 плашки на главный экран
- [ ] Проверить зеленую иконку в магазине для рекламы
- [ ] Сделать красивый RGPD-виджет
- [ ] На лендинг курса добавить анимацию рекламы телефона приложения
- [ ] Проверить, что еще скрыто кодом, feature-flag'ами или недоделанными секциями

## Технические сигналы после сканирования

1. `npm run typecheck` проходит.
2. `npm run lint` в текущем виде перегружен и требует сужения области.
3. В `src` около `842` JS/TS-файлов.
4. В `src/components`, `src/hooks`, `src/pages` около `705` файлов.
5. Есть много `TODO`, `eslint-disable`, `@ts-ignore` и временных артефактов.
6. Внутри repo остается вложенный отдельный git-репозиторий `sdadim-eu`.
7. В git отслеживаются тяжелые данные и архивные удаленные файлы.

## Инструкции для ИИ

### База данных

1. Минимизируй количество запросов.
2. Используй типы из `src/integrations/supabase/types.ts`.
3. Для проверки наличия записи используй `count + head`.
4. Для новых таблиц всегда добавляй RLS.
5. Для счетчиков используй атомарные операции, а не перезапись с фронта.

### Edge Functions

1. Держи функции быстрыми.
2. Проверяй JWT/Auth во всех критичных маршрутах.
3. Возвращай понятные JSON-ошибки с корректными HTTP-кодами.

### Фронтенд

1. Используй `staleTime` и `gcTime` в React Query.
2. Думай про оффлайн и optimistic UI.
3. Для длинных списков применяй виртуализацию.

## Рекомендуемый следующий шаг

Сначала привести в порядок структуру workspace, а уже потом делать точечную чистку кода:

1. Вынести `sdadim-eu` в соседнюю папку как отдельный repo.
2. Перестать хранить `_DELETED_ITEMS` в git.
3. Удалить temp/backup файлы.
4. Переделать lint-скрипты.
5. После этого сделать второй проход по `TODO`, hidden UI и feature flags.
