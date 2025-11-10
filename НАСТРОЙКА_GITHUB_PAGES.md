# 🌐 Как увидеть изменения на GitHub Pages

## Проблема

Изменения есть в ветке `feature/premium-race-game`, но не видны на GitHub Pages, потому что GitHub Pages публикуется с ветки `main`.

## 🎯 Быстрое решение (2 минуты)

### Шаг 1: Открой настройки GitHub Pages

1. Перейди на: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep/settings/pages
2. Войди в свой GitHub аккаунт, если нужно

### Шаг 2: Измени ветку для публикации

В разделе **"Build and deployment"**:

1. Найди **"Branch"** 
2. Нажми на выпадающий список (сейчас там `main`)
3. Выбери **`feature/premium-race-game`**
4. Нажми **"Save"**

### Шаг 3: Подожди обновления

- GitHub начнет публикацию (занимает 1-2 минуты)
- Увидишь статус вверху страницы: "Your site is live at..."
- Можешь обновить страницу, чтобы увидеть прогресс

### Готово! 🎉

Теперь GitHub Pages будет публиковать версию из ветки `feature/premium-race-game` с DGT тестами.

---

## 📝 Альтернативный способ (через Pull Request)

Если хочешь слить изменения в `main` (более правильный подход):

1. Открой: https://github.com/Dmitry-Kuzmin/sdadim-dgt-prep
2. Нажми зеленую кнопку **"Compare & pull request"**
3. Заполни описание (можешь скопировать из коммита)
4. Нажми **"Create pull request"**
5. Разреши конфликты, если GitHub их покажет (обычно есть кнопка "Resolve conflicts")
6. Нажми **"Merge pull request"**

После merge GitHub Pages обновится автоматически.

---

## ✅ Проверка

После обновления открой:
- https://dmitry-kuzmin.github.io/sdadim-dgt-prep/dgt-tests

Должна открыться страница с выбором категорий DGT экзаменов!

