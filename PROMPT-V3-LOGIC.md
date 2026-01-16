# ✅ ПРОМПТ V3: ЛОГИКА + ИСПАНСКИЙ ВАЙБ

## 🎯 Что исправлено:

### ❌ Проблемы которые ты нашел:
1. **Односторонняя разметка, double-flow** — абсурд
2. **2 полосы, знак "70|70|70" (3)** — противоречие  
3. **Грузовик на встречке** — опасно
4. **Стрелки ведут к столкновению** — ???

### ✅ Теперь исправлено:

#### **1. VISION анализирует направления:**
```
6. **Traffic Flow Direction** (CRITICAL):
   - For EACH vehicle: "Car 1 NORTH, Car 2 SOUTH"
   - Check markings: dashed = TWO-WAY, no center = ONE-WAY
   - Flag contradictions: "WARNING: One-way but opposing traffic"
```

#### **2. IMAGEN получает правила:**
```
## TRAFFIC LOGIC (OBEY STRICTLY):
- Dashed center = TWO-WAY (cars opposite)
- No center line = ONE-WAY (same direction)
- Lane signs MUST match actual lanes (3-lane sign = 3 lanes drawn)
- Trajectory arrows = SAFE paths (no collisions)
- Trucks on right lane (Spanish rule)
```

#### **3. Испанский колорит (опционально, креативно):**
```
**Optional Spanish atmosphere** (DON'T force, vary each image):
  * Urban: Mercadona/DIA, Farmacias, Estancos
  * Delivery: Correos vans, bikes
  * Highways: Repsol/Cepsa, rest areas
  * Railways: RENFE trains if crossing
```

---

## 📋 Примеры как работает:

### **Сценарий 1: Двухполосная встречка**
**Vision:**
```
MARKINGS: White dashed center line (TWO-WAY)
TRAFFIC_FLOW:
- Car 1 (Seat Leon white): NORTH, right lane
- Truck (blue): SOUTH, left lane
✅ Correct - opposing flow matches dashed line
```

**Imagen:** Рисует машину NORTH ↑, грузов ик SOUTH ↓

---

### **Сценарий 2: Односторонняя autovía**
**Vision:**
```
MARKINGS: No center line, only lane dividers (ONE-WAY)
SIGNS: S-50 "3 arrows up" (3 lanes, all same direction)
TRAFFIC_FLOW:
- All 3 vehicles: traveling NORTH
✅ Correct - one-way layout
```

**Imagen:** Все машины едут ↑↑↑ в одну сторону

---

### **Сценарий 3: Перекресток**
**Vision:**
```
TRAJECTORIES:
- Orange arrow: Car NORTH → turns WEST (safe arc)
- Orange arrow: Truck EAST → continues EAST (straight)
✅ No collision - paths clear
```

**Imagen:** Стрелки БЕЗ пересечений

---

## 🎨 Испанский колорит:

AI САМ решает где добавить:
- **Город:** Аптека с зеленым крестом, табачный киоск
- **Трасса:** Биллборд Repsol, зона отдыха "Área de descanso"
- **ЖД:** Поезд RENFE (красно-золотой)
- **Доставка:** Желтый фургон Correos

**НЕ обязательно!** Только где уместно. **Каждая картинка уникальна.**

---

## 🚀 Теперь:

1. **Удали старые 4 картинки** (с ошибками логики):
```bash
rm -f ./data/generated-images/*.png
```

2. **Запусти генерацию:**
Dashboard → Topic-01 → Test → "Генерить"

3. **Проверь новые:**
✅ Правильный поток движения
✅ Знаки = количество полос
✅ Траектории БЕЗ столкновений
✅ Испанский вайб (опционально)

---

**Промпт усилен! Пробуй!** 🚦🇪🇸✨
