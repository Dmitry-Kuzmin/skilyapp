# 🔍 Как найти workflow "Stars Payment Retry" в GitHub Actions

## Проблема

Workflow может не отображаться в списке, если он еще не был запущен или находится в feature ветке.

## ✅ Решение 1: Найти через прямую ссылку

Откройте напрямую:
```
https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml
```

Или через интерфейс:
1. GitHub → Actions
2. В левом меню найдите раздел **"All workflows"**
3. Должен быть список: "Deploy to GitHub Pages" и **"Stars Payment Retry"**
4. Если не видно - нажмите **"All workflows"** и прокрутите вниз

---

## ✅ Решение 2: Запустить workflow вручную через GitHub UI

1. **Откройте файл workflow:**
   - https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/blob/feature/premium-race-game/.github/workflows/stars-payment-retry.yml

2. **Нажмите "Actions"** (вверху страницы)

3. **Или откройте напрямую Actions для этой ветки:**
   - https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions

4. **В левом меню найдите "Stars Payment Retry"** (может быть внизу списка)

---

## ✅ Решение 3: Запустить через API (если не видно в UI)

Можно запустить workflow через GitHub API:

```bash
# Установите GITHUB_TOKEN (Personal Access Token с правами repo)
export GITHUB_TOKEN="your_github_token"

# Запустить workflow
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml/dispatches \
  -d '{"ref":"feature/premium-race-game"}'
```

---

## ✅ Решение 4: Создать пустой коммит для активации

Иногда GitHub показывает workflow только после первого запуска. Создайте пустой коммит:

```bash
git commit --allow-empty -m "trigger: activate stars-payment-retry workflow"
git push
```

После этого workflow должен появиться в списке.

---

## 🔍 Где искать workflow

### Вариант A: Через левое меню в Actions

1. GitHub → Actions
2. В левом меню под "All workflows" должны быть:
   - Deploy to GitHub Pages
   - **Stars Payment Retry** ← здесь!

### Вариант B: Через поиск

1. GitHub → Actions
2. В поиске вверху введите: `stars-payment-retry`
3. Должен найтись workflow

### Вариант C: Прямая ссылка

```
https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml
```

---

## ⚠️ Важно

Workflow будет работать **только в ветке, где он находится**. 

Если хотите, чтобы он работал в `main` ветке:
1. Слейте изменения в `main`
2. Или создайте Pull Request и слейте

---

## 🧪 Быстрый тест

Попробуйте открыть эту ссылку напрямую:

```
https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml
```

Если страница открывается - workflow существует и можно запустить вручную кнопкой **"Run workflow"**.

