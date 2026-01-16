# 🔐 Пошаговая инструкция: Добавление секретов в GitHub

## ✅ Токен получен

Токен: `EFy0JoQoqhIDDw5VrToGwXGM` (уже сохранён)

## 📋 Что нужно добавить в GitHub

### Шаг 1: Открыть настройки секретов

1. Зайди в репозиторий: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep
2. Нажми **Settings** (в верхнем меню репозитория)
3. В левом меню выбери **Secrets and variables** → **Actions**
4. Нажми **New repository secret**

### Шаг 2: Добавить три секрета

#### Секрет 1: VERCEL_TOKEN

- **Name:** `VERCEL_TOKEN`
- **Secret:** `EFy0JoQoqhIDDw5VrToGwXGM`
- Нажми **Add secret**

#### Секрет 2: VERCEL_ORG_ID

- **Name:** `VERCEL_ORG_ID`
- **Secret:** `team_HlZX3EXzjTMTJ8LHMi6CarNo`
- Нажми **Add secret**

#### Секрет 3: VERCEL_PROJECT_ID

- **Name:** `VERCEL_PROJECT_ID`
- **Secret:** `prj_tjowkZGpnTAgPHiUOnf9ykWPHI4v`
- Нажми **Add secret**

### Шаг 3: Проверить результат

После добавления всех трёх секретов ты увидишь их в списке:
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID

### Шаг 4: Запустить workflow

После добавления секретов:

**Вариант 1: Перезапустить прошлый workflow**
1. Зайди в **Actions** (в верхнем меню репозитория)
2. Выбери последний workflow run
3. Нажми **Re-run all jobs**

**Вариант 2: Сделать новый commit**
- Любой commit в `main` автоматически запустит workflow

## 🎯 Ожидаемый результат

После добавления секретов workflow должен:
- ✅ Build (24s)
- ✅ Prerender (56s)
- ✅ Deploy (успешно!)

## ⚠️ Безопасность

- Токен уже показан, но GitHub скроет его после сохранения
- Никогда не коммить токены в код
- Если токен скомпрометирован - отзови его в Vercel и создай новый

