# 🎟️ Интеграция Промокодов в Payment Flow

> **Время:** 15 минут  
> **Файл:** `src/components/monetization/PremiumPlanSelector.tsx`

---

## 📝 Шаги Интеграции

### Шаг 1: Импортировать компонент

Добавить в начало файла `PremiumPlanSelector.tsx`:

```typescript
import { PromoCodeInput } from "@/components/partner/PromoCodeInput";
```

### Шаг 2: Добавить state для промокода

В компоненте `PremiumPlanSelector`, после существующих `useState`:

```typescript
const [promoData, setPromoData] = useState<{
  partnerId: string;
  partnerCode: string;
  commissionRate: number;
  finalPrice: number;
  discountAmount: number;
} | null>(null);
```

### Шаг 3: Создать обработчики промокода

```typescript
const handlePromoApplied = (data: {
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  partnerId: string;
  partnerCode: string;
  commissionRate: number;
}) => {
  setPromoData({
    partnerId: data.partnerId,
    partnerCode: data.partnerCode,
    commissionRate: data.commissionRate,
    finalPrice: data.finalPrice,
    discountAmount: data.discountAmount,
  });
  
  // Обновить отображаемую цену
  toast.success(`Скидка ${data.discountPercent}% применена!`);
};

const handlePromoRemoved = () => {
  setPromoData(null);
};
```

### Шаг 4: Обновить функцию покупки

В функции `handlePurchase`, где создается платеж, передать `promoData`:

```typescript
const handlePurchase = async (planId: 'lifetime' | 'monthly' | 'duel_pass') => {
  try {
    setLoading(true);
    
    // Получить финальную цену (с учетом промокода)
    const finalPrice = promoData?.finalPrice || PRICES[planId].cents;
    
    // Создать покупку с промокодом
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: profileId,
        package_name: planId,
        amount: finalPrice / 100, // конвертируем в евро
        currency: 'EUR',
        status: 'pending',
        // Добавляем данные промокода
        metadata: promoData ? {
          promo_code: promoData.partnerCode,
          partner_id: promoData.partnerId,
          commission_rate: promoData.commissionRate,
          discount_amount: promoData.discountAmount,
          original_price: PRICES[planId].cents / 100,
        } : null,
      })
      .select()
      .single();
      
    // ... остальная логика покупки
  } catch (error) {
    // ... обработка ошибок
  }
};
```

### Шаг 5: Добавить UI компонент

В JSX, перед кнопками покупки (примерно строка 200-250):

```tsx
{/* Промокод */}
{selectedPlan && profileId && (
  <div className="mb-4">
    <PromoCodeInput
      userId={profileId}
      basePrice={PRICES[selectedPlan].cents}
      onPromoApplied={handlePromoApplied}
      onPromoRemoved={handlePromoRemoved}
    />
  </div>
)}

{/* Кнопка покупки */}
<Button
  onClick={() => handlePurchase(selectedPlan)}
  size="lg"
  className="w-full"
>
  {promoData ? (
    <>
      <Sparkles className="h-5 w-5 mr-2" />
      Купить за €{(promoData.finalPrice / 100).toFixed(2)}
      <span className="ml-2 line-through text-slate-400">
        €{(PRICES[selectedPlan].cents / 100).toFixed(2)}
      </span>
    </>
  ) : (
    <>
      <Crown className="h-5 w-5 mr-2" />
      Купить за {PRICES[selectedPlan].display}
    </>
  )}
</Button>
```

---

## 🧪 Тестирование

### 1. Создать тестовый промокод в БД:

```sql
-- В Supabase SQL Editor
-- Создать тестового партнера с промокодом
UPDATE partners
SET 
  promo_code = 'TEST20',
  promo_code_discount = 20,
  promo_code_commission = 0.30
WHERE id = 'YOUR-PARTNER-ID';
```

### 2. Проверить работу:

1. Открыть модальное окно покупки Premium
2. Ввести промокод `TEST20`
3. Нажать "Применить"

**Ожидается:**
```
✅ Промокод активирован! TEST20
💰 Скидка: 20%
💳 Итого: €7.99 (было €9.99)
```

### 3. Проверить в БД после покупки:

```sql
-- Проверить, что создалась конверсия с промокодом
SELECT * FROM partner_conversions
WHERE event_type = 'purchase'
AND partner_code = 'TEST20'
ORDER BY created_at DESC
LIMIT 1;

-- Должны увидеть:
-- purchase_amount: 7.99
-- commission_amount: 2.40 (30% от 7.99)
```

---

## 🎯 Полная Интеграция (Альтернатива)

Если не хочешь модифицировать `PremiumPlanSelector.tsx`, создай новый компонент:

```typescript
// src/components/monetization/PremiumPurchaseWithPromo.tsx
import { PremiumPlanSelector } from './PremiumPlanSelector';
import { PromoCodeInput } from '@/components/partner/PromoCodeInput';

export function PremiumPurchaseWithPromo(props) {
  // ... логика промокода
  return (
    <>
      <PromoCodeInput {...promoProps} />
      <PremiumPlanSelector {...props} modifiedPrices={promoData} />
    </>
  );
}
```

---

## 📊 Tracking Партнерских Покупок

После успешной покупки, **обязательно** записать конверсию:

```typescript
// В handlePurchase, после успешной оплаты:
if (promoData) {
  // @ts-ignore
  await supabase.rpc('track_partner_conversion', {
    p_partner_code: promoData.partnerCode,
    p_event_type: 'purchase',
    p_user_id: profileId,
    p_purchase_id: purchaseData.id,
    p_purchase_amount: finalPrice / 100,
    p_commission_amount: (finalPrice / 100) * promoData.commissionRate,
  });
  
  // Добавить комиссию в hold
  // @ts-ignore
  await supabase.rpc('add_partner_commission_to_hold', {
    p_partner_id: promoData.partnerId,
    p_amount: (finalPrice / 100) * promoData.commissionRate,
    p_purchase_id: purchaseData.id,
  });
}
```

---

**Готово!** Промокоды интегрированы! 🎉





















