# 🎨 Система косметики (Skins, Badges, Stickers)

## Обзор

Полноценная система косметических предметов для персонализации профиля и игрового опыта пользователей.

## 📦 Типы косметики

### 1. Скины (Skins)
- **Назначение**: Кастомизация аватара пользователя
- **Активация**: Только один скин может быть активен одновременно
- **Свойства**:
  - Цвет фона
  - Эффекты (fire, ice, sparkle, shine)
  - Анимация (для легендарных)
  - Редкость (common, rare, epic, legendary)

### 2. Бейджи (Badges)
- **Назначение**: Достижения и статусные знаки
- **Отображение**: До 3 бейджей можно показать в профиле
- **Категории**:
  - Achievement (достижения)
  - Seasonal (сезонные)
  - Special (особые)
- **Свойства**:
  - Иконка (trophy, flame, star, crown, calendar)
  - Цвет
  - Редкость
  - Анимация (для особых)

### 3. Стикеры (Stickers)
- **Назначение**: Эмоции для использования в дуэлях
- **Расходные**: Количество уменьшается при использовании
- **Категории**:
  - Emoji (эмодзи)
  - Reaction (реакции)
  - Celebration (празднования)
- **Свойства**:
  - Эмодзи/изображение
  - Эффекты (bounce для особых)
  - Редкость

## 🗄️ База данных

### Таблицы определений

```sql
-- Определения скинов
skin_definitions (
  id TEXT PRIMARY KEY,
  name_ru TEXT,
  name_es TEXT,
  description_ru TEXT,
  description_es TEXT,
  rarity TEXT,
  preview_url TEXT,
  is_premium BOOLEAN,
  is_animated BOOLEAN,
  metadata JSONB
)

-- Определения бейджей
badge_definitions (
  id TEXT PRIMARY KEY,
  name_ru TEXT,
  name_es TEXT,
  description_ru TEXT,
  description_es TEXT,
  rarity TEXT,
  icon_url TEXT,
  is_premium BOOLEAN,
  category TEXT,
  metadata JSONB
)

-- Определения стикеров
sticker_definitions (
  id TEXT PRIMARY KEY,
  name_ru TEXT,
  name_es TEXT,
  description_ru TEXT,
  description_es TEXT,
  rarity TEXT,
  image_url TEXT,
  is_premium BOOLEAN,
  is_animated BOOLEAN,
  category TEXT,
  metadata JSONB
)
```

### Таблицы инвентаря

```sql
-- Скины пользователя
user_skins (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  skin_id TEXT REFERENCES skin_definitions(id),
  is_active BOOLEAN,
  obtained_at TIMESTAMPTZ,
  obtained_from TEXT,
  obtained_metadata JSONB
)

-- Бейджи пользователя
user_badges (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  badge_id TEXT REFERENCES badge_definitions(id),
  is_displayed BOOLEAN,
  display_order INTEGER,
  obtained_at TIMESTAMPTZ,
  obtained_from TEXT,
  obtained_metadata JSONB
)

-- Стикеры пользователя
user_stickers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  sticker_id TEXT REFERENCES sticker_definitions(id),
  quantity INTEGER,
  obtained_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  obtained_from TEXT,
  obtained_metadata JSONB
)
```

## 🔧 Функции PostgreSQL

### activate_skin(p_user_id UUID, p_skin_id TEXT)
Активирует скин для пользователя (деактивирует все остальные).

```sql
SELECT activate_skin('user-uuid', 'avatar_fire');
```

### toggle_badge_display(p_user_id UUID, p_badge_id TEXT, p_display BOOLEAN)
Управляет отображением бейджа (максимум 3).

```sql
SELECT toggle_badge_display('user-uuid', 'badge_winner_100', true);
```

### use_sticker(p_user_id UUID, p_sticker_id TEXT)
Использует стикер (уменьшает количество).

```sql
SELECT use_sticker('user-uuid', 'sticker_fire');
```

## 🎁 Получение косметики

### Источники

1. **Duel Pass** - основной источник
2. **Daily Bonus** - ежедневные награды
3. **Shop** - покупка за монеты
4. **Events** - специальные события

### Edge Function: duel-pass-claim

Обновлен для автоматического добавления косметики в инвентарь:

```typescript
// Скины
await supabase.from("user_skins").insert({
  user_id,
  skin_id: rewardPayload.id,
  obtained_from: "duel_pass",
  obtained_metadata: { season, level, is_premium }
});

// Бейджи
await supabase.from("user_badges").insert({
  user_id,
  badge_id: rewardPayload.id,
  obtained_from: "duel_pass",
  obtained_metadata: { season, level, is_premium }
});

// Стикеры (с учетом количества)
await supabase.from("user_stickers").insert({
  user_id,
  sticker_id: rewardPayload.id,
  quantity: rewardPayload.amount || 1,
  obtained_from: "duel_pass",
  obtained_metadata: { season, level, is_premium }
});
```

## 🎨 UI Компоненты

### CosmeticsInventory
Главный компонент инвентаря с вкладками:
- Скины (с активацией)
- Бейджи (с управлением отображением)
- Стикеры (с количеством)

**Путь**: `/inventory`

```tsx
<CosmeticsInventory />
```

### UserCosmeticsDisplay
Отображение активных косметических предметов пользователя:

```tsx
// Только аватар
<UserCosmeticsDisplay userId={userId} variant="avatar" />

// Только бейджи
<UserCosmeticsDisplay userId={userId} variant="badges" />

// Полное отображение
<UserCosmeticsDisplay userId={userId} variant="full" />
```

### RewardUnlockAnimation
Анимация с конфетти при получении косметики:

```tsx
<RewardUnlockAnimation
  open={open}
  onOpenChange={setOpen}
  reward={{
    type: "skin",
    id: "avatar_fire",
    name_ru: "Огненный",
    description_ru: "Пылающий аватар",
    rarity: "rare",
    metadata: { color: "#ef4444", effect: "fire" }
  }}
/>
```

## 🎯 Система редкости

| Редкость | Цвет | Описание |
|----------|------|----------|
| Common | Серый | Базовые предметы |
| Rare | Синий | Редкие предметы |
| Epic | Фиолетовый | Эпические предметы |
| Legendary | Золотой | Легендарные с анимацией |

## 📊 Начальная косметика

### Скины (5 шт)
1. `avatar_default` - Стандартный (common)
2. `avatar_fire` - Огненный (rare)
3. `avatar_ice` - Ледяной (rare)
4. `avatar_gold` - Золотой (epic, premium)
5. `avatar_diamond` - Алмазный (legendary, premium)

### Бейджи (7 шт)
1. `badge_winner_10` - Победитель x10 (common)
2. `badge_winner_50` - Победитель x50 (rare)
3. `badge_winner_100` - Победитель x100 (epic)
4. `badge_streak_7` - Серия 7 (rare)
5. `badge_perfect` - Идеальный (epic)
6. `badge_season_1` - Сезон 1 (rare)
7. `badge_premium` - Premium (legendary, premium)

### Стикеры (6 шт)
1. `sticker_fire` - 🔥 Огонь (common)
2. `sticker_clap` - 👏 Аплодисменты (common)
3. `sticker_thinking` - 🤔 Думаю (common)
4. `sticker_wow` - 😮 Вау (rare)
5. `sticker_laugh` - 😂 Смех (rare)
6. `sticker_trophy` - 🏆 Трофей (epic, premium)

## 🔐 RLS Политики

- **Definitions**: Все могут читать
- **User Inventory**: 
  - Пользователи видят свой инвентарь
  - Все видят активные скины других
  - Все видят отображаемые бейджи других
  - Service role может добавлять предметы

## 🚀 Интеграция

### В профиль
```tsx
import { UserCosmeticsDisplay } from "@/components/cosmetics/UserCosmeticsDisplay";

<UserCosmeticsDisplay userId={userId} variant="full" />
```

### В Duel Pass
```tsx
// При получении косметики показывается анимация
if (["skin", "badge", "sticker"].includes(reward.type)) {
  setUnlockedReward({
    type: reward.type,
    id: reward.id,
    name_ru: definition.name_ru,
    description_ru: definition.description_ru,
    rarity: definition.rarity,
    metadata: definition.metadata,
  });
}
```

### В навигацию
Кнопка "Inventory" добавлена в `UserProfilePopover`:
```tsx
<Button onClick={() => navigate('/inventory')}>
  <Sparkles className="h-4 w-4 mr-1" />
  Inventory
</Button>
```

## 📝 TODO для расширения

1. **Магазин косметики** - покупка за монеты
2. **Трейды** - обмен стикерами между пользователями
3. **Крафтинг** - создание редких предметов из обычных
4. **Сезонные коллекции** - тематические наборы
5. **Анимированные скины** - более сложные эффекты
6. **Звуковые эффекты** - для стикеров в дуэлях
7. **Предпросмотр** - 3D превью скинов
8. **Достижения** - автоматическая выдача бейджей

## 🎉 Особенности

- ✅ Современный UI с анимациями
- ✅ Система редкости с визуальными эффектами
- ✅ Конфетти при получении косметики
- ✅ Мобильная адаптивность
- ✅ Интеграция с Duel Pass
- ✅ RLS безопасность
- ✅ Мультиязычность (RU/ES)
- ✅ Premium контент
- ✅ История получения (metadata)

