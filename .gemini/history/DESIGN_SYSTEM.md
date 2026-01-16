# 🎨 Skilyapp Premium Design System

> **Стандарт UI/UX для всех интерфейсов приложения**  
> Уровень: Linear / Vercel / Stripe / AI Studio

---

## 🎯 Философия дизайна

### Три главных принципа:
1. **Elegant & Compact** — воздушный, но не раздутый
2. **Functional First** — красота через функциональность
3. **Subtle Effects** — эффекты должны быть едва заметны

### Что делает дизайн премиальным:
- ✅ Чистота и минимализм
- ✅ Точные пропорции и spacing
- ✅ Тонкие borders и subtle shadows
- ✅ Live feedback и интерактивность
- ✅ Профессиональная типографика

### Что убивает премиальность:
- ❌ Огромные отступы и кнопки-кирпичи
- ❌ Тяжёлые анимации и glow эффекты
- ❌ Вертикальные списки карточек вместо таблиц
- ❌ Старомодные цвета (slate вместо zinc)
- ❌ Лишние элементы и украшения

---

## 🎨 Цветовая палитра

### Основные цвета (Zinc, НЕ Slate!):

```tsx
// Фоны
bg-zinc-950  // Основной фон страницы (#0A0A0B)
bg-zinc-900  // Карточки и панели
bg-zinc-800  // Hover состояния, inputs

// Borders (ВАЖНО: используй white с opacity!)
border-white/5   // Очень тонкие (едва видимые)
border-white/10  // Стандартные
border-zinc-800  // Альтернатива для более контрастных границ

// Текст (от светлого к тёмному)
text-white       // Заголовки, важный текст
text-zinc-200    // Обычный текст
text-zinc-300    // Вторичный текст
text-zinc-400    // Placeholder, описания
text-zinc-500    // Labels, метаданные
text-zinc-600    // Едва видимый текст
```

### Акцентные цвета:

```tsx
// Primary (Indigo/Blue)
text-indigo-400
bg-indigo-500/10
border-indigo-500/20
focus:ring-indigo-500/50

// Success (Emerald/Green)
text-emerald-400
bg-emerald-500/10
border-emerald-500/20

// Gradients
bg-gradient-to-r from-blue-500 to-violet-500
bg-gradient-to-br from-purple-500 to-pink-500
```

---

## 📐 Layout & Structure

### Split-View Pattern (основной):

```tsx
// Пример: Форма слева, Preview справа
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
  {/* Left: Controls (5 cols) */}
  <div className="lg:col-span-5">
    {/* Форма */}
  </div>
  
  {/* Right: Preview (7 cols) */}
  <div className="lg:col-span-7">
    {/* Результат */}
  </div>
  
  {/* Full Width Section (12 cols) */}
  <div className="col-span-full mt-16">
    {/* Таблица истории */}
  </div>
</div>
```

### Контейнеры:

```tsx
// Основной контейнер
<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

// Для широких макетов
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Ambient Background (опционально):

```tsx
// Два статичных blur круга
<div className="fixed inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
  <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
</div>
```

---

## 🔘 Кнопки

### Главная кнопка (Primary - белая):

```tsx
<button className="
  w-full relative overflow-hidden group 
  bg-white text-black 
  font-medium py-3.5 rounded-xl 
  hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]
  hover:scale-[1.01]
  transition-all duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
">
  <span className="relative z-10 flex items-center justify-center gap-2">
    Generate Magic Link
    <Sparkles size={16} />
  </span>
  {/* Gradient overlay на hover */}
  <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
</button>
```

### Альтернатива (Gradient):

```tsx
<button className="
  bg-gradient-to-r from-blue-500 to-violet-500 
  text-white font-medium 
  h-12 px-6 rounded-xl
  hover:opacity-90
  transition-all
">
  Create Link
</button>
```

### Вторичная кнопка:

```tsx
<button className="
  bg-zinc-800 hover:bg-zinc-700 
  text-zinc-300 hover:text-white
  px-4 py-2 rounded-lg 
  text-sm font-medium
  border border-zinc-700
  transition-colors
">
  Cancel
</button>
```

### Иконочная кнопка:

```tsx
<button className="
  p-1.5 
  text-zinc-400 hover:text-white 
  hover:bg-zinc-700 
  rounded-md 
  transition-colors
">
  <Copy className="w-4 h-4" />
</button>
```

---

## 📝 Формы и Inputs

### Label (всегда uppercase):

```tsx
<label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
  Campaign Name
</label>
```

### Input с иконкой:

```tsx
<div className="relative group">
  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <Zap size={14} className="text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
  </div>
  <input
    type="text"
    placeholder="instagram_02дек"
    className="
      w-full h-12
      bg-zinc-900 border border-zinc-800 
      rounded-xl 
      pl-9 pr-4 py-3
      text-sm text-white 
      placeholder:text-zinc-600
      focus:outline-none 
      focus:ring-2 focus:ring-indigo-500/50 
      focus:border-indigo-500/50
      hover:border-zinc-700
      transition-all
    "
  />
</div>
```

### Select:

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="
    h-12 
    bg-zinc-900 border border-zinc-800 
    hover:border-zinc-700
    focus:ring-2 focus:ring-indigo-500/50
    text-sm
  ">
    <SelectValue />
  </SelectTrigger>
  <SelectContent className="bg-zinc-900 border-zinc-800">
    <SelectItem value="home">Главная</SelectItem>
  </SelectContent>
</Select>
```

---

## 📋 Таблицы (для списков данных)

### Структура:

```tsx
<div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
  <table className="w-full text-left">
    <thead>
      <tr className="border-b border-zinc-800 bg-zinc-900/50">
        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Campaign
        </th>
        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
          Clicks
        </th>
        {/* ... */}
      </tr>
    </thead>
    <tbody className="divide-y divide-zinc-800/50">
      <tr className="group hover:bg-zinc-800/30 cursor-pointer transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700">
              <Instagram className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Campaign Name</p>
              <p className="text-xs text-zinc-500">instagram</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <span className="text-sm text-zinc-300 font-medium">1,240</span>
        </td>
        {/* Actions на hover */}
        <td className="px-6 py-4 text-right">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1.5 hover:bg-zinc-700 rounded-md">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Empty State:

```tsx
{filteredData.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 mb-4">
      <Search className="w-6 h-6 text-zinc-500" />
    </div>
    <h3 className="text-zinc-200 font-medium mb-1">Ничего не найдено</h3>
    <p className="text-zinc-500 text-sm max-w-xs">Попробуйте изменить фильтры</p>
  </div>
)}
```

---

## 🎴 Карточки (Cards)

### Glassmorphism Card:

```tsx
<Card className="
  border-white/10 
  bg-zinc-900/40 
  backdrop-blur-xl 
  shadow-2xl
">
  <div className="p-6">
    {/* Content */}
  </div>
</Card>
```

### Premium Preview Card (с mesh gradient):

```tsx
<div className="relative">
  {/* Glow */}
  <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-2xl" />
  
  {/* Card */}
  <div className="relative rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden">
    {/* Mesh Background */}
    <div className="absolute inset-0">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500 to-purple-500 opacity-20 blur-[100px] rounded-full" />
    </div>
    
    {/* Noise Texture */}
    <div 
      className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat'
      }}
    />
    
    {/* Content */}
    <div className="relative p-8">
      {/* ... */}
    </div>
  </div>
</div>
```

---

## 🏷️ Badges & Pills

### Badge:

```tsx
<span className="
  inline-flex items-center gap-1.5
  px-2 py-1 
  rounded-full 
  text-xs font-medium 
  bg-emerald-500/5 
  text-emerald-400 
  border border-emerald-500/20
">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  Active
</span>
```

### PRO Badge:

```tsx
<span className="
  px-2 py-0.5 
  rounded-full 
  bg-indigo-500/10 
  text-indigo-400 
  text-xs font-bold 
  border border-indigo-500/20
">
  PRO
</span>
```

### Pill Buttons (для выбора источников):

```tsx
<button className={`
  flex items-center gap-2 
  px-3 py-2 
  rounded-lg 
  text-sm 
  transition-all duration-200 
  border
  ${isActive 
    ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg' 
    : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800'}
`}>
  <Instagram size={14} />
  Instagram
</button>
```

---

## ✨ Эффекты и Анимации

### Правило: Subtle > Dramatic

```tsx
// ✅ ХОРОШО: Плавный fade-in
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// ❌ ПЛОХО: Тяжёлая анимация
<motion.div
  initial={{ opacity: 0, y: 50, scale: 0.5 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 1, type: "spring" }}
>
```

### Hover эффекты:

```tsx
// Scale на кнопках
hover:scale-[1.01]
active:scale-[0.99]

// Opacity для actions
opacity-0 group-hover:opacity-100

// Background transitions
hover:bg-zinc-800/30 transition-colors

// Glow (только для premium элементов)
hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]
```

---

## 📊 Headers с метриками

### Pattern: Title + Description + Stats

```tsx
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div>
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-white">Links</h1>
      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">PRO</span>
    </div>
    <p className="text-zinc-400 text-sm mt-1">Manage, track, and optimize</p>
  </div>
  
  <div className="flex items-center gap-6 border-l border-zinc-800 pl-6">
    <div className="text-right">
      <p className="text-xs text-zinc-500 uppercase font-semibold">Clicks (7d)</p>
      <p className="text-lg font-bold text-zinc-200">14.2k</p>
    </div>
    {/* ... */}
  </div>
</div>
```

---

## 🔍 Поиск и Фильтры

### Search Bar:

```tsx
<div className="relative flex-1">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
  <input 
    type="text" 
    placeholder="Search campaigns..." 
    className="
      w-full 
      bg-zinc-900 border border-zinc-800 
      rounded-lg 
      pl-10 pr-4 py-2 
      text-sm text-zinc-200 
      placeholder:text-zinc-600
      focus:outline-none 
      focus:ring-2 focus:ring-indigo-500/50
      hover:border-zinc-700
      transition-all
    "
  />
</div>
```

### Toggle Filters:

```tsx
<div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
  <button className={`
    px-3 py-1.5 
    text-xs font-medium 
    rounded-md 
    transition-colors
    ${isActive ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}
  `}>
    All
  </button>
  <button className="...">Active</button>
</div>
```

---

## 🎯 Иконки

### Размеры:

```tsx
// В кнопках и inline
size={14} или size={16}

// В карточках/headers
size={18} или size={20}

// Декоративные большие
size={32} или size={40}
```

### Социальные иконки (маппинг):

```tsx
const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'instagram': return Instagram;
    case 'telegram': return Send;
    case 'tiktok': return Music2;
    case 'youtube': return Youtube;
    case 'whatsapp': return MessageCircle;
    case 'facebook': return Facebook;
    default: return LinkIcon;
  }
};
```

---

## 📏 Spacing

### Правило: Compact but Breathable

```tsx
// Padding карточек
p-4, p-6, p-8  // НЕ p-10, p-12!

// Space между элементами
space-y-3, space-y-4, space-y-6  // НЕ space-y-8!

// Gap в grid/flex
gap-2, gap-3, gap-4  // Для мелких элементов
gap-6, gap-8, gap-10  // Для основных секций
```

---

## 🖋️ Typography

### Заголовки:

```tsx
// H1 (главный)
text-2xl font-bold tracking-tight text-white

// H2 (подзаголовок)
text-xl font-semibold tracking-tight text-white

// H3 (секция)
text-lg font-semibold text-white
```

### Текст:

```tsx
// Основной
text-sm text-zinc-300

// Вторичный
text-sm text-zinc-400

// Мета-информация
text-xs text-zinc-500
```

### Mono (для кода/ссылок):

```tsx
font-mono text-sm text-indigo-300
```

---

## 🎭 Status Indicators

### Live Indicators:

```tsx
<div className="flex items-center gap-6 opacity-40">
  <div className="flex items-center gap-2 text-xs text-zinc-500">
    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
    Live Preview
  </div>
  <div className="flex items-center gap-2 text-xs text-zinc-500">
    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
    Secure SSL
  </div>
</div>
```

### Status Badge в таблице:

```tsx
<span className="
  inline-flex items-center gap-1.5 
  px-2 py-1 
  rounded-full 
  text-xs font-medium 
  border
  bg-emerald-500/5 text-emerald-400 border-emerald-500/20
">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  Active
</span>
```

---

## 🎨 Live Preview Pattern

### Автоматическое обновление:

```tsx
const [previewData, setPreviewData] = useState("");

// Live update при вводе
useEffect(() => {
  if (!inputValue) {
    setPreviewData("waiting...");
    return;
  }
  
  // Генерируем preview
  const preview = generatePreview(inputValue);
  setPreviewData(preview);
}, [inputValue, otherDependencies]);
```

---

## 🚫 Антипаттерны (НЕ ДЕЛАТЬ!)

### ❌ Огромные отступы:

```tsx
// ПЛОХО
<div className="p-10 space-y-8">
<Button className="h-16 text-xl">

// ХОРОШО
<div className="p-6 space-y-4">
<Button className="h-12 text-sm">
```

### ❌ Старые slate цвета:

```tsx
// ПЛОХО
bg-slate-900 border-slate-800 text-slate-400

// ХОРОШО
bg-zinc-900 border-zinc-800 text-zinc-400
```

### ❌ Вертикальные списки:

```tsx
// ПЛОХО - скучные карточки друг под другом
<div className="space-y-4">
  {items.map(item => (
    <Card>...</Card>
  ))}
</div>

// ХОРОШО - таблица или grid
<table>...</table>
// или
<div className="grid grid-cols-2 gap-4">
```

### ❌ Тяжёлые анимации:

```tsx
// ПЛОХО
transition={{ duration: 2, type: "spring", bounce: 0.5 }}
animate={{ rotate: 360, scale: [0, 1.5, 1] }}

// ХОРОШО
transition={{ duration: 0.2 }}
animate={{ opacity: 1, y: 0 }}
```

---

## 📦 Готовые компоненты

### Source Selector (Pills):

```tsx
const SOURCES = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  // ...
];

<div className="flex flex-wrap gap-1.5">
  {SOURCES.map(source => (
    <button
      onClick={() => setSource(source.id)}
      className={`
        flex items-center gap-1.5 
        px-2.5 py-1.5 
        rounded-lg text-sm 
        border transition-all
        ${isActive 
          ? 'bg-zinc-800 border-zinc-600 text-white' 
          : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800'}
      `}
    >
      <source.icon size={13} />
      {source.name}
    </button>
  ))}
</div>
```

### Copy Button with Feedback:

```tsx
const [copied, setCopied] = useState(false);

<button 
  onClick={() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }}
  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700"
>
  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
  <span>{copied ? 'Copied' : 'Copy'}</span>
</button>
```

---

## ⚡ Performance Guidelines

### Оптимизация:
1. **Используй `useMemo`** для фильтрации больших списков
2. **Debounce** для search inputs
3. **Lazy load** для таблиц > 50 строк
4. **Избегай** лишних re-renders

### Пример:

```tsx
const filteredData = useMemo(() => {
  return data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );
}, [data, search]);
```

---

## 🎯 Checklist для нового компонента

Перед созданием нового UI, проверь:

- [ ] Используются zinc цвета (НЕ slate)
- [ ] Borders: white/5 или white/10
- [ ] Labels: uppercase, text-xs, tracking-wider
- [ ] Inputs/Buttons: h-10 или h-12 (НЕ больше!)
- [ ] Spacing: compact (p-4, p-6, space-y-4)
- [ ] Таблица для списков (НЕ вертикальные карточки)
- [ ] Иконки: size={14} для inline
- [ ] Hover эффекты: subtle (opacity, scale-[1.01])
- [ ] Live preview где возможно
- [ ] Empty states с иконкой и описанием

---

## 📚 Референсы

### Вдохновение:
- [Linear](https://linear.app) — чистота и функциональность
- [Vercel Dashboard](https://vercel.com/dashboard) — минимализм
- [Stripe Dashboard](https://dashboard.stripe.com) — профессионализм
- AI Studio Admin (твой референс) — элегантность

### Наши референсы:
- `https://github.com/Dmitry-Kuzmin/Links-` — таблица истории ссылок
- `https://github.com/Dmitry-Kuzmin/Admin-part` — генератор с preview card

---

## 🔧 Быстрый старт

### Создание нового компонента:

```tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

export function MyComponent() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Title</h1>
        <p className="text-sm text-zinc-400">Description</p>
      </div>

      {/* Content */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <div className="p-6">
          {/* Your content */}
        </div>
      </Card>
    </div>
  );
}
```

---

## 📝 Naming Conventions

### CSS Classes порядок:

1. Layout (flex, grid, absolute)
2. Sizing (w-full, h-12)
3. Spacing (p-4, m-2, gap-2)
4. Typography (text-sm, font-medium)
5. Colors (bg-zinc-900, text-white)
6. Borders (border, border-zinc-800)
7. Effects (rounded-xl, shadow-lg)
8. States (hover:, focus:, group-hover:)
9. Transitions (transition-all, duration-200)

---

## 🎓 Примеры "До и После"

### До (старый стиль):
```tsx
<Card className="bg-slate-900/80 border-slate-800">
  <CardHeader className="pb-6">
    <CardTitle className="text-3xl">Огромный заголовок</CardTitle>
  </CardHeader>
  <CardContent className="p-10 space-y-8">
    <Button className="h-16 text-xl">Кнопка-кирпич</Button>
  </CardContent>
</Card>
```

### После (премиум стиль):
```tsx
<Card className="bg-zinc-900 border-zinc-800">
  <div className="p-6 space-y-4">
    <h2 className="text-xl font-semibold text-white">Заголовок</h2>
    <Button className="h-12 text-sm bg-white text-black hover:scale-[1.01]">
      Элегантная кнопка
    </Button>
  </div>
</Card>
```

---

## 🚀 Итого

Этот дизайн-система — не просто правила, это **стандарт качества**. Каждый новый компонент должен выглядеть так, будто его делала команда из Stripe или Linear.

**Главное правило:** Если сомневаешься — делай проще, чище и компактнее.

---

**Последнее обновление:** 2 декабря 2025  
**Автор:** Cursor AI для Skilyapp  
**Статус:** Living Document (обновляется при появлении новых паттернов)

