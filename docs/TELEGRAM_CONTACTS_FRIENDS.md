# 📱 Telegram контакты как друзья

## 🔍 Текущая ситуация

Telegram WebApp API **не предоставляет прямой доступ** к списку контактов пользователя из соображений приватности.

## ✅ Доступные варианты

### Вариант 1: `requestContact()` (рекомендуется)

Telegram WebApp API предоставляет метод `requestContact()`, который запрашивает у пользователя разрешение на доступ к его контакту:

```typescript
// В компоненте React
const webApp = window.Telegram?.WebApp;

if (webApp) {
  // Запрашиваем контакт пользователя
  webApp.requestContact((contact) => {
    if (contact) {
      // contact содержит:
      // - phone_number: номер телефона
      // - first_name: имя
      // - last_name: фамилия
      // - user_id: ID пользователя Telegram
      
      // Отправляем на сервер для поиска друзей
      findFriendsByPhone(contact.phone_number);
    }
  });
}
```

**Преимущества:**
- ✅ Работает через официальный API
- ✅ Пользователь контролирует доступ
- ✅ Безопасно

**Недостатки:**
- ❌ Требует действия пользователя (нажатие кнопки)
- ❌ Можно получить только один контакт за раз
- ❌ Нельзя получить весь список контактов автоматически

### Вариант 2: Хранение телефонных номеров

Если пользователь предоставил свой номер телефона, можно:

1. **Сохранить номер в профиле:**
   ```sql
   ALTER TABLE profiles 
   ADD COLUMN phone_number TEXT;
   ```

2. **Сопоставить номера:**
   - Пользователь A предоставляет свой номер
   - Пользователь B предоставляет свой номер
   - Если номера совпадают с контактами → они друзья

**Проблема:**
- Нужно получить контакты пользователя (недоступно напрямую)
- Нужно получить номера других пользователей

### Вариант 3: Telegram Bot API (только для ботов)

Если у нас есть Telegram Bot, можно использовать Bot API для получения контактов:

```typescript
// В Edge Function или Bot Handler
const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getContacts`, {
  method: 'POST',
  body: JSON.stringify({
    user_id: telegramUserId
  })
});
```

**Проблема:**
- ❌ Bot API не предоставляет метод `getContacts`
- ❌ Контакты доступны только через клиентское приложение

### Вариант 4: Интеграция через Telegram Mini App (будущее)

Telegram планирует добавить больше возможностей для Mini Apps, но пока это недоступно.

---

## 💡 Рекомендуемое решение

### Гибридный подход:

1. **Друзья из реферальной системы** (уже реализовано)
2. **Друзья из дуэлей** (реализовано)
3. **Друзья из контактов** (через `requestContact()`):

```typescript
// Компонент для добавления друзей через контакт
const AddFriendByContact = () => {
  const webApp = window.Telegram?.WebApp;
  const [loading, setLoading] = useState(false);

  const handleRequestContact = () => {
    if (!webApp) return;

    setLoading(true);
    webApp.requestContact(async (contact) => {
      if (contact?.phone_number) {
        // Ищем пользователя по номеру телефона
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, phone_number')
          .eq('phone_number', contact.phone_number)
          .single();

        if (data) {
          // Добавляем в список друзей
          await addFriend(data.id);
        }
      }
      setLoading(false);
    });
  };

  return (
    <Button onClick={handleRequestContact} disabled={loading}>
      {loading ? 'Загрузка...' : 'Добавить друга из контактов'}
    </Button>
  );
};
```

---

## 📋 План реализации

### Шаг 1: Добавить поле `phone_number` в `profiles`

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_number 
  ON profiles(phone_number) 
  WHERE phone_number IS NOT NULL;
```

### Шаг 2: Создать таблицу для хранения друзей из контактов

```sql
CREATE TABLE IF NOT EXISTS user_contact_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT,  -- Номер из контакта
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK(user_id != friend_id)
);
```

### Шаг 3: Обновить функцию `get_user_leaderboard_position`

Добавить в UNION запрос друзей из `user_contact_friends`.

### Шаг 4: Создать UI компонент

Компонент для запроса контакта и добавления друзей.

---

## 🎯 Текущая реализация

**Сейчас друзья определяются через:**
1. ✅ Реферальная система (`referrals`)
2. ✅ Дуэли (`duel_players` - те, с кем играл)

**Telegram контакты:**
- ⏳ Планируется добавить через `requestContact()`
- ⏳ Требует действия пользователя (нажатие кнопки)

---

## 📝 Примечания

1. **Приватность:**
   - Telegram не предоставляет доступ к контактам автоматически
   - Пользователь должен явно разрешить доступ
   - Это правильный подход с точки зрения безопасности

2. **Альтернативы:**
   - Можно использовать поиск по username
   - Можно использовать поиск по имени (если пользователь указал)
   - Можно использовать QR-коды для добавления друзей

3. **Будущее:**
   - Следить за обновлениями Telegram Mini Apps API
   - Возможно, появятся новые методы для работы с контактами

