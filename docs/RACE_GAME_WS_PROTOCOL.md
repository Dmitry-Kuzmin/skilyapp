# Race Game WebSocket Protocol

## Обзор

Протокол WebSocket для режима "Гонка" (Race Mode) с server-authoritative архитектурой.

## Базовые требования

- Все вычисления очков и времени выполняются только на сервере
- Клиент отправляет только попытки ответов
- Сервер отправляет результаты и новые вопросы
- Idempotency-key для каждой попытки ответа
- Heartbeat для отслеживания соединения

## Клиент → Сервер

### 1. `race_start`

Запрос на начало игры.

```json
{
  "type": "race_start",
  "session_id": null,  // null для новой сессии
  "topic_id": "uuid",  // опционально
  "difficulty": "easy|medium|hard",  // опционально
  "client_lang": "ru|es|en",
  "client_ts": 1699123456789
}
```

### 2. `answer_attempt`

Попытка ответа на вопрос.

```json
{
  "type": "answer_attempt",
  "session_id": "race_1699123456789_abc123",
  "attempt_id": "attempt_1699123457000_xyz789",  // Idempotency key
  "question_id": "q_1699123456789_0.123",
  "chosen": true,  // true = Верно, false = Неверно
  "client_ts": 1699123457123
}
```

**Валидация на сервере:**
- Проверка `attempt_id` на дубликаты (idempotency)
- Проверка `MIN_ANSWER_INTERVAL_MS` (600ms)
- Проверка `client_ts` vs `server_ts` для latency compensation
- Вычисление `is_correct` по базе данных

### 3. `heartbeat`

Поддержание соединения.

```json
{
  "type": "heartbeat",
  "session_id": "race_1699123456789_abc123",
  "client_ts": 1699123458000
}
```

**Сервер:**
- Если нет heartbeat > 10s → помечает как offline
- Если offline > 20s → автоматически завершает сессию

### 4. `pause_request`

Запрос на паузу (опционально).

```json
{
  "type": "pause_request",
  "session_id": "race_1699123456789_abc123",
  "pause": true
}
```

## Сервер → Клиент

### 1. `race_started`

Подтверждение начала игры.

```json
{
  "type": "race_started",
  "session_id": "race_1699123456789_abc123",
  "start_time_ms": 60000,
  "question": {
    "question_id": "q_1699123456789_0.123",
    "term_id": "uuid",
    "term_es": "Abrochar el cinturón",
    "translation": "Пристегнуть ремень безопасности",
    "is_correct": true,
    "server_ts": 1699123456789
  }
}
```

### 2. `question`

Новый вопрос.

```json
{
  "type": "question",
  "question_id": "q_1699123457000_0.456",
  "term_id": "uuid",
  "term_es": "Conducir",
  "translation": "Водить",
  "is_correct": false,  // Показывается правильный или неправильный перевод
  "server_ts": 1699123457000
}
```

### 3. `answer_result`

Результат ответа.

```json
{
  "type": "answer_result",
  "attempt_id": "attempt_1699123457000_xyz789",
  "is_correct": true,
  "points_awarded": 1,
  "total_points": 15,
  "new_remaining_time_ms": 65000,
  "combo_count": 3,
  "combo_bonus": {
    "points": 2,
    "time_ms": 0
  },
  "next_question": {
    "question_id": "q_1699123457123_0.789",
    "term_id": "uuid",
    "term_es": "Siguiente término",
    "translation": "Следующий термин",
    "is_correct": true,
    "server_ts": 1699123457123
  }
}
```

**Поля:**
- `is_correct`: Правильный ли ответ
- `points_awarded`: Очки за этот ответ (включая комбо бонусы)
- `total_points`: Общее количество очков
- `new_remaining_time_ms`: Новое оставшееся время
- `combo_count`: Текущая серия правильных ответов
- `combo_bonus`: Бонус за комбо (если достигнут порог)
- `next_question`: Следующий вопрос (если игра продолжается)

### 4. `race_ended`

Завершение игры.

```json
{
  "type": "race_ended",
  "session_id": "race_1699123456789_abc123",
  "total_points": 42,
  "correct_count": 35,
  "incorrect_count": 7,
  "total_answered": 42,
  "max_combo": 12,
  "xp_awarded": 70,
  "coins_awarded": 5,
  "accuracy_percentage": 83.33,
  "reason": "time_up",  // time_up | consecutive_misses | manual | connection_lost
  "finished_at": "2025-11-04T10:30:00Z"
}
```

### 5. `anti_cheat_alert`

Предупреждение о подозрительной активности.

```json
{
  "type": "anti_cheat_alert",
  "level": "warn",  // info | warn | block
  "message": "Отвечайте не быстрее, чем 0.6s",
  "event_type": "suspect_attempt",
  "session_id": "race_1699123456789_abc123"
}
```

**Уровни:**
- `info`: Информационное сообщение
- `warn`: Предупреждение (слишком быстрые ответы)
- `block`: Блокировка (множественные подозрительные попытки)

## Примеры сценариев

### Сценарий 1: Начало игры

**Клиент:**
```json
{"type": "race_start", "session_id": null, "client_lang": "ru", "client_ts": 1699123456789}
```

**Сервер:**
```json
{"type": "race_started", "session_id": "race_1699123456789_abc123", "start_time_ms": 60000, "question": {...}}
```

### Сценарий 2: Правильный ответ с комбо

**Клиент:**
```json
{"type": "answer_attempt", "session_id": "race_...", "attempt_id": "attempt_...", "question_id": "q_...", "chosen": true, "client_ts": 1699123457123}
```

**Сервер:**
```json
{
  "type": "answer_result",
  "is_correct": true,
  "points_awarded": 3,  // 1 base + 2 combo bonus
  "total_points": 18,
  "new_remaining_time_ms": 61000,
  "combo_count": 3,
  "combo_bonus": {"points": 2, "time_ms": 0},
  "next_question": {...}
}
```

### Сценарий 3: Неправильный ответ

**Клиент:**
```json
{"type": "answer_attempt", "session_id": "race_...", "attempt_id": "attempt_...", "question_id": "q_...", "chosen": false, "client_ts": 1699123458000}
```

**Сервер:**
```json
{
  "type": "answer_result",
  "is_correct": false,
  "points_awarded": 0,
  "total_points": 18,
  "new_remaining_time_ms": 59000,  // -2000ms penalty
  "combo_count": 0,
  "combo_bonus": null,
  "next_question": {...}
}
```

### Сценарий 4: Слишком быстрый ответ (антиспам)

**Клиент:**
```json
{"type": "answer_attempt", "session_id": "race_...", "attempt_id": "attempt_...", "question_id": "q_...", "chosen": true, "client_ts": 1699123457500}
```

**Сервер:**
```json
{
  "type": "anti_cheat_alert",
  "level": "warn",
  "message": "Отвечайте не быстрее, чем 0.6s",
  "event_type": "suspect_attempt"
}
```

И ответ игнорируется (не начисляются очки).

### Сценарий 5: Завершение игры

**Сервер:**
```json
{
  "type": "race_ended",
  "session_id": "race_1699123456789_abc123",
  "total_points": 42,
  "correct_count": 35,
  "incorrect_count": 7,
  "total_answered": 42,
  "max_combo": 12,
  "xp_awarded": 70,
  "coins_awarded": 5,
  "accuracy_percentage": 83.33,
  "reason": "time_up"
}
```

## Обработка ошибок

### Ошибка подключения

```json
{
  "type": "error",
  "code": "CONNECTION_LOST",
  "message": "Потеряно соединение. Сессия будет завершена автоматически.",
  "session_id": "race_..."
}
```

### Ошибка валидации

```json
{
  "type": "error",
  "code": "VALIDATION_ERROR",
  "message": "Неверный формат запроса",
  "details": {...}
}
```

### Сессия не найдена

```json
{
  "type": "error",
  "code": "SESSION_NOT_FOUND",
  "message": "Сессия не найдена или уже завершена",
  "session_id": "race_..."
}
```

## Реализация на клиенте

```typescript
// Пример обработки WebSocket сообщений
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'race_started':
      // Начать игру
      startGame(message.session_id, message.start_time_ms);
      showQuestion(message.question);
      break;
      
    case 'question':
      // Показать новый вопрос
      showQuestion(message.question);
      break;
      
    case 'answer_result':
      // Обновить UI с результатом
      updateScore(message.total_points);
      updateTime(message.new_remaining_time_ms);
      updateCombo(message.combo_count);
      if (message.combo_bonus) {
        showComboBonus(message.combo_bonus);
      }
      // Показать следующий вопрос
      setTimeout(() => showQuestion(message.next_question), 300);
      break;
      
    case 'race_ended':
      // Завершить игру
      endGame(message);
      break;
      
    case 'anti_cheat_alert':
      // Показать предупреждение
      showAlert(message.level, message.message);
      break;
  }
};
```

## Безопасность

1. **Idempotency**: Каждая попытка имеет уникальный `attempt_id`
2. **Server Authoritative**: Все вычисления на сервере
3. **Rate Limiting**: Ограничение на частоту ответов
4. **Device Fingerprinting**: Отслеживание устройств
5. **IP Tracking**: Логирование IP адресов
6. **Behavioral Analysis**: Анализ паттернов ответов

