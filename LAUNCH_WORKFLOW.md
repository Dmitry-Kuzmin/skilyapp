# 🚀 Как запустить workflow "Stars Payment Retry"

## ✅ Файл открыт правильно!

Вы открыли файл workflow, и видите кнопку **"View Runs"**. Это правильный путь!

---

## 📋 Что делать дальше:

### Шаг 1: Нажмите "View Runs"

На странице файла есть кнопка **"View Runs"** (справа вверху, рядом с commit информацией).

Нажмите на неё — откроется страница с запусками workflow.

---

### Шаг 2: Если "View Runs" показывает "Not found"

Если после нажатия "View Runs" показывает "This workflow does not exist", это нормально — workflow еще не запускался.

**Решение:** Запустите workflow через API или создайте первый запуск:

#### Вариант A: Через GitHub API (быстрый способ)

Откройте в браузере эту ссылку (замените `YOUR_GITHUB_TOKEN` на ваш Personal Access Token):

```
https://api.github.com/repos/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml/dispatches
```

Или используйте curl:

```bash
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml/dispatches \
  -d '{"ref":"feature/premium-race-game"}'
```

#### Вариант B: Через GitHub UI (если есть доступ)

1. Откройте: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
2. В левом меню найдите "Stars Payment Retry" (может быть внизу списка)
3. Если не видно — переключитесь на ветку `feature/premium-race-game` (выпадающий список вверху)

---

### Шаг 3: После первого запуска

После первого запуска workflow появится в списке и можно будет запускать через кнопку **"Run workflow"**.

---

## 🎯 Альтернативный способ: Создать пустой коммит

Иногда GitHub показывает workflow только после первого коммита, который его активирует:

```bash
git commit --allow-empty -m "trigger: activate stars-payment-retry workflow"
git push
```

После этого workflow должен появиться в списке.

---

## ✅ Проверка работы

После запуска workflow:

1. Откройте GitHub → Actions
2. Найдите workflow "Stars Payment Retry"
3. Откройте последний запуск
4. Проверьте логи — должно быть: `✅ Retry выполнен успешно!`

---

## 🔗 Полезные ссылки

- **Файл workflow:** https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/blob/feature/premium-race-game/.github/workflows/stars-payment-retry.yml
- **Actions (все workflows):** https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions
- **Прямая ссылка на workflow:** https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/actions/workflows/stars-payment-retry.yml

