# ✅ AUTOPISTA FIX: Физические разделители

## 🚨 Проблема которую ты нашел:

**Второе изображение:**
- Знаки: E-15, AP-7, Barcelona → **AUTOPISTA**
- Все машины едут → в одну сторону ✅
- **НО!** Нарисована белая **пунктирная центральная линия** ❌

**Должно быть:**
1. Autopista = **физический барьер** между встречными направлениями:
   - Бетонная стена (New Jersey barrier), ИЛИ
   - Металлический отбойник (W-beam), ИЛИ
   - Широкая медиана (зеленая полоса 5-10м)
2. Внутри одного направления = **НЕТ центральной линии**, только **разделители полос**

---

## ✅ Что исправлено в промпте:

### **1. STYLE_MASTER_PROMPT — Инфраструктура:**

```diff
+ ## ROAD INFRASTRUCTURE (CRITICAL):
+ 1. **Autopista/Autovía (divided highway)**:
+    - Opposing directions SEPARATED by physical barrier:
+      * Concrete wall (New Jersey barrier), OR
+      * Metal W-beam guardrail, OR
+      * Wide green median (5-10m grass strip)
+    - EACH direction is ONE-WAY (all traffic same direction)
+    - NO center line within each direction - only lane dividers
+    
+ 2. **Carretera convencional (regular road)**:
+    - TWO-WAY with dashed center line
+    - Vehicles going opposite directions
+    - No physical barrier
```

### **2. TRAFFIC LOGIC — Типы дорог:**

```diff
+ 1. **Road Type Infrastructure**:
+    - **Autopista/Autovía** = physical barrier + ONE-WAY sections
+    - **Carretera** = dashed center line + TWO-WAY traffic
+ 2. **Markings ↔ Flow**:
+    - Dashed center = TWO-WAY (regular roads only)
+    - No center line + lane dividers = ONE-WAY (autopistas)
+    - Physical barrier visible = separate one-way sections
+ 5. **Coherence**: If autopista, MUST have physical separator
```

### **3. Final Generation Prompt:**

```diff
## TRAFFIC LOGIC (OBEY STRICTLY):
+ - **Autopista/Autovía** = MUST draw physical barrier between opposing flows
+ - **Carretera** = dashed center line for two-way traffic
+ - If "autopista" + "one-way section" = NO center line, only lane dividers
```

---

## 📊 Как это работает:

### **Сценарий: Autopista с двумя направлениями**

**Vision анализ:**
```
ROAD: Autopista (divided highway)
MARKINGS: No center line, only lane dividers (3 lanes)
INFRASTRUCTURE: Physical barrier visible in center (concrete wall)
TRAFFIC_FLOW:
- Left side: 3 vehicles traveling NORTH (Barcelona direction)
- Right side (opposite carriageway): 3 vehicles traveling SOUTH
```

**Imagen генерация:**
```
✅ Рисую:
- Левая часть: 3 полосы → (все машины север)
- ЦЕНТР: Бетонная стена / зеленая медиана
- Правая часть: 3 полосы ← (все машины юг)
- БЕЗ центральной пунктирной линии внутри направлений
```

---

### **Сценарий: Обычная дорога (carretera)**

**Vision:**
```
ROAD: Carretera convencional (two-way road)
MARKINGS: White dashed center line
INFRASTRUCTURE: No physical barrier
```

**Imagen:**
```
✅ Рисую:
- 1-2 полосы в каждую сторону
- Белая ПУНКТИРНАЯ линия по центру
- Машины едут встречно
- БЕЗ физического барьера
```

---

## 🎯 Теперь AI знает:

| Тип дороги | Разделитель | Разметка внутри | Поток |
|------------|-------------|-----------------|-------|
| **Autopista** | Бетон/металл/медиана | Только разделители полос | Односторонний |
| **Carretera** | Нет | Пунктир по центру | Двусторонний |
| **Urban** | Зависит | Может быть/нет | Зависит |

---

## 🚀 Результат:

✅ **Autopista картинки:**
- Физический барьер между направлениями
- Нет центральной линии внутри
- Правильные полосы

✅ **Carretera картинки:**
- Пунктирная линия по центру
- Встречный поток
- Без барьера

---

**Промпт усилен! Пробуй заново!** 🛣️🚧
