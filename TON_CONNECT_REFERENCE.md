# TON Connect — Полная справка для AI-агента

> Этот файл — единый источник правды по TON Connect для работы с кодовой базой проекта.
> Источник: https://docs.ton.org/ecosystem/ton-connect/overview + анализ живого кода.
> Обновлён: 2026-03-27

---

## 1. Что такое TON Connect

TON Connect — стандартный протокол подключения кошельков для TON-блокчейна (аналог WalletConnect на Ethereum, но специально для TON). Обязателен для всех Telegram Mini Apps. Поддерживает 30+ кошельков и сотни dApps.

**Главный принцип:** пользователь авторизует транзакции, сохраняя контроль над приватным ключом. Протокол — только канал связи между кошельком и dApp.

---

## 2. SDK-пакеты (что и когда использовать)

| Пакет | Назначение | Когда использовать |
|-------|-----------|-------------------|
| `@tonconnect/sdk` | Низкоуровневый SDK | Кастомное хранилище, кастомный UI |
| `@tonconnect/ui` | UI + логика (без React) | Ванильный JS, AppKit-интеграции |
| `@tonconnect/ui-react` | React-обёртка над UI | Стандартные React-приложения |
| `@tonconnect/protocol` | Протокол (для разработчиков кошельков) | Не использовать в dApps |
| `@ton/appkit` + `@ton/appkit-react` | Обёртка над всеми провайдерами | **Используется в ЭТОМ проекте** |

### ⚠️ Важно для ЭТОГО проекта
Проект использует **НЕ стандартный** `@tonconnect/ui-react`, а собственную архитектуру:
- `@ton/appkit` + `@ton/appkit-react` — AppKit-обёртка
- `@tonconnect/sdk` + `@tonconnect/ui` — низкоуровневые пакеты
- Кастомное хранилище (`TonCloudStorage`) для персистентности в Telegram
- Кастомный `TonAddressContext` вместо `useAddress()` из AppKit

---

## 3. Архитектура этого проекта (TON-стек)

```
src/lib/ton-appkit.ts          ← Единственный инстанс TonConnectUI (синглтон)
src/lib/ton-cloud-storage.ts   ← Кастомный IStorage: localStorage + Telegram CloudStorage
src/contexts/TonAddressContext.tsx  ← React Context с адресом кошелька
src/hooks/useTonReady.ts       ← Хук: кошелёк готов + адрес
src/hooks/useTonWalletSync.ts  ← Синхронизация адреса в Supabase
src/hooks/useTonStreaming.ts   ← SSE-стриминг статуса транзакций
src/components/monetization/TonWalletHeader.tsx  ← UI заголовка кошелька
src/components/monetization/TonConnectButton.tsx ← Кнопка подключения
src/components/monetization/TonPaymentWidget.tsx ← Виджет оплаты
```

### Схема инициализации

```
ton-appkit.ts (модуль-синглтон)
├── TonCloudStorage (localStorage + Telegram.WebApp.CloudStorage)
├── TonConnect SDK (кастомное хранилище + манифест)
├── TonConnectUI (restoreConnection: true, returnStrategy: 'back')
├── tonConnectionRestored Promise (отслеживает восстановление сессии)
└── AppKit (tonConnector + mainnet config)
```

---

## 4. Манифест (tonconnect-manifest.json)

### Расположение и требования

Файл ОБЯЗАТЕЛЕН. Размещается по URL: `https://[домен]/tonconnect-manifest.json`

**Критические требования:**
- URL должен быть **абсолютным** (не `/tonconnect-manifest.json` — это упадёт молча)
- Доступен через GET без CORS-ограничений
- Без авторизации и без прокси (CloudFlare может блокировать)
- Иконка должна возвращать валидное изображение (404 → ошибка подключения)

### Структура файла

```json
{
  "url": "https://skilyapp.com",
  "name": "Skily DGT",
  "iconUrl": "https://skilyapp.com/icon.png",
  "termsOfUseUrl": "https://skilyapp.com/terms",
  "privacyPolicyUrl": "https://skilyapp.com/privacy"
}
```

| Поле | Обязательное | Описание |
|------|-------------|---------|
| `url` | ✅ | URL приложения (без trailing slash) |
| `name` | ✅ | Название приложения |
| `iconUrl` | ✅ | PNG или ICO, рекомендуется 180×180 px |
| `termsOfUseUrl` | ❌ | Нужно для попадания в список кошельков |
| `privacyPolicyUrl` | ❌ | Нужно для попадания в список кошельков |

### В проекте
```typescript
// src/lib/ton-appkit.ts
const origin = typeof window !== 'undefined' ? window.location.origin : 'https://skilyapp.com';
const tonConnectSDK = new TonConnect({
    manifestUrl: `${origin}/tonconnect-manifest.json`,
    storage: cloudStorage,
});
```
Манифест подтягивается динамически через `window.location.origin` — это защищает от ошибок при работе на разных доменах.

---

## 5. Инициализация и провайдеры

### Стандартный способ (ui-react)

```tsx
import { TonConnectUIProvider } from '@tonconnect/ui-react';

function App() {
  return (
    <TonConnectUIProvider manifestUrl="https://myapp.com/tonconnect-manifest.json">
      {/* приложение */}
    </TonConnectUIProvider>
  );
}
```

### В ЭТОМ проекте (AppKit + синглтон)

```tsx
// src/components/providers/AppProviders.tsx
// AppKit оборачивает всё приложение через appKit из ton-appkit.ts
// НЕ используется TonConnectUIProvider напрямую
```

**⚠️ Не создавать новые инстансы TonConnect/TonConnectUI в компонентах.** Всегда импортировать синглтон:
```typescript
import { tonConnectUI } from '@/lib/ton-appkit';
```

---

## 6. Хуки и контексты (этот проект)

### `useTonAddress()` — текущий адрес кошелька

```typescript
import { useTonAddress } from '@/contexts/TonAddressContext';

const address = useTonAddress(); // string | null
```

- Читает из `TonAddressContext` (подписан на `tonConnectUI.onStatusChange`)
- Безопасен для поздне-монтируемых компонентов (не пропускает события)
- Синхронизируется при `focus`, `visibilitychange`, Telegram `activated`

### `useTonReady()` — кошелёк готов к платежу

```typescript
import { useTonReady } from '@/hooks/useTonReady';

const { isReady, address } = useTonReady();
// isReady: true если connectionRestored завершён
// address: null если isReady=false (нет spinner-флеша при открытии модалки)
```

**Использовать в платёжных модалках** — гарантирует отсутствие гонки состояний.

### `useTonWalletSync()` — синхронизация в Supabase

```typescript
import { useTonWalletSync } from '@/hooks/useTonWalletSync';
// Монтируется один раз в AppProviders/TonWalletSyncHandler
// Сохраняет/очищает ton_wallet_address в profiles
```

### `useTonStreaming()` — статус транзакции в реальном времени

```typescript
import { useTonStreaming } from '@/hooks/useTonStreaming';

const { status, subscribe, unsubscribe, reset } = useTonStreaming();
// status: 'idle' | 'pending' | 'confirmed' | 'finalized' | 'trace_invalidated' | 'error'

await subscribe(address, apiKey?, testnet?);
```

---

## 7. Подключение кошелька (UI)

### TonConnectButton (стандартный)

```tsx
import { TonConnectButton } from '@tonconnect/ui-react';
// Трансформируется в меню кошелька после подключения
<TonConnectButton />
```

### Программное открытие модалки

```typescript
import { tonConnectUI } from '@/lib/ton-appkit';

// Открыть общий список кошельков
tonConnectUI.openModal();

// Открыть конкретный кошелёк
tonConnectUI.openSingleWalletModal('tonkeeper');

// Закрыть
tonConnectUI.closeModal();

// Отключить кошелёк
await tonConnectUI.disconnect();
```

### Отслеживание статуса подключения

```typescript
const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
  if (wallet) {
    console.log('Подключён:', wallet.account.address);
    console.log('Сеть:', wallet.account.chain); // '-239' = mainnet, '-3' = testnet
  } else {
    console.log('Отключён');
  }
});

// Отписаться:
unsubscribe();
```

### Восстановление сессии

```typescript
// Всегда ждать восстановления перед показом платёжного UI:
import { tonConnectionRestored } from '@/lib/ton-appkit';

await tonConnectionRestored; // Promise<boolean>
```

---

## 8. Отправка транзакций

### Структура транзакции

```typescript
const transaction = {
  validUntil: Math.floor(Date.now() / 1000) + 300, // Unix timestamp (5 минут)
  network: CHAIN.MAINNET, // опционально
  messages: [
    {
      address: 'EQC...', // адрес получателя (user-friendly формат)
      amount: '200000000', // в нанотонах (строка!) 0.2 TON = 200_000_000
      payload: '...', // base64, опционально
      stateInit: '...', // base64, для деплоя контрактов
    }
  ]
};

const result = await tonConnectUI.sendTransaction(transaction);
// result.boc — Bag of Cells для трекинга транзакции
```

### Лимиты сообщений на транзакцию

| Версия кошелька | Макс. сообщений |
|----------------|----------------|
| v3 / v4 | 4 |
| v5 | 255 |
| Highload | 255 |

### Обработка ошибок

```typescript
try {
  const result = await tonConnectUI.sendTransaction(transaction);
  // Успех
} catch (err) {
  if (err.message === 'The Wallet declined the request') {
    // Пользователь отказал — это финальное состояние,
    // нельзя переотправить тот же запрос, нужно создать новый
  }
}
```

### Единицы измерения

```
1 TON = 1_000_000_000 нанотон (10⁹)
1 USDT = 1_000_000 (10⁶, 6 decimals)
Стандартный Jetton = 9 decimals
```

---

## 9. Jetton-переводы (TEP-74)

### Получение адреса Jetton-кошелька

Перед переводом нужно получить адрес контракта Jetton-кошелька отправителя (не мастер-контракт!):

```typescript
import { JettonMaster, JettonWallet, TonClient } from '@ton/ton';

const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
const jettonMaster = client.open(JettonMaster.create(Address.parse(JETTON_MASTER_ADDRESS)));
const jettonWalletAddress = await jettonMaster.getWalletAddress(Address.parse(ownerAddress));
```

### Payload для перевода Jetton

```typescript
import { beginCell, toNano, Address } from '@ton/ton';

const body = beginCell()
  .storeUint(0xf8a7ea5, 32)                           // opcode: jetton transfer
  .storeUint(0, 64)                                   // query_id
  .storeCoins(toNano('1'))                            // amount (в единицах Jetton)
  .storeAddress(Address.parse(RECIPIENT_ADDRESS))     // destination
  .storeAddress(Address.parse(SENDER_ADDRESS))        // response_destination
  .storeUint(0, 1)                                    // custom_payload = null
  .storeCoins(toNano('0.05'))                         // forward_ton_amount (газ для уведомления)
  .storeBit(1)
  .storeRef(beginCell().endCell())                    // forward_payload
  .endCell();

const myTransaction = {
  validUntil: Math.floor(Date.now() / 1000) + 360,
  messages: [{
    address: jettonWalletAddress.toString(),          // Jetton-кошелёк отправителя (!)
    amount: toNano('0.1').toString(),                 // газ в TON для выполнения
    payload: body.toBoc().toString('base64'),
  }]
};

await tonConnectUI.sendTransaction(myTransaction);
```

### Перевод с комментарием

```typescript
const forwardPayload = beginCell()
  .storeUint(0, 32)              // opcode 0 = текстовый комментарий
  .storeStringTail('Привет!')
  .endCell();
```

### Burn Jetton

```typescript
// opcode: 0x595f07bc
const burnBody = beginCell()
  .storeUint(0x595f07bc, 32)
  .storeUint(0, 64)
  .storeCoins(amountToBurn)
  .storeAddress(null)
  .endCell();
```

---

## 10. Перевод TON (простой)

```typescript
const tonTransfer = {
  validUntil: Math.floor(Date.now() / 1000) + 300,
  messages: [{
    address: 'EQRecipientAddress...',
    amount: '500000000', // 0.5 TON в нанотонах
  }]
};

await tonConnectUI.sendTransaction(tonTransfer);
```

**Адреса:** для кошелёк→кошелёк использовать non-bounceable, для смарт-контрактов — bounceable.

---

## 11. Подпись данных (signData)

```typescript
// Текст (отображается пользователю)
await tonConnectUI.signData({
  type: 'text',
  text: 'Подтверди вход в Skily',
  // network: CHAIN.MAINNET, // опционально
});

// Cell (данные для смарт-контракта)
await tonConnectUI.signData({
  type: 'cell',
  schema: 'message#_ text:string = Message',
  cell: cellBase64,
});

// Binary (наименее предпочтительный)
await tonConnectUI.signData({
  type: 'binary',
  bytes: base64Bytes,
});
```

---

## 12. Верификация ton_proof (серверная)

Используется для подтверждения владения кошельком (аутентификация).

### Шаги верификации

1. Запросить `ton_proof` при подключении:
```typescript
tonConnectUI.setConnectRequestParameters({
  state: 'ready',
  value: {
    tonProof: 'уникальный_payload_от_бэкенда'
  }
});
```

2. Получить proof из `wallet.connectItems.tonProof`:
```typescript
const proof = wallet.connectItems?.tonProof;
// proof.payload, proof.signature, proof.timestamp, proof.domain
```

3. Верифицировать на бэкенде:
- Проверить timestamp (окно: 15 минут)
- Реконструировать сообщение: `"ton-proof-item-v2/" + workchain + address + domain_length + domain + timestamp + payload`
- Верифицировать Ed25519 подпись публичного ключом
- Получить публичный ключ из `walletStateInit` или через `get_public_key` на контракте
- Проверить соответствие ключа и адреса

---

## 13. Кастомное хранилище (TonCloudStorage)

В Telegram Mini Apps `localStorage` может очищаться между сессиями. Проект использует двойное хранилище:

```
TonCloudStorage implements IStorage:
  setItem → localStorage (кэш) + Telegram.WebApp.CloudStorage (персистентно)
  getItem → localStorage сначала, потом CloudStorage (с восстановлением в localStorage)
  removeItem → оба хранилища
```

**Ключи хранятся с префиксом `tc_`** в CloudStorage.

```typescript
import type { IStorage } from '@tonconnect/sdk';
// Класс TonCloudStorage реализует интерфейс IStorage
```

---

## 14. Настройка UI

```typescript
// Язык и тема
tonConnectUI.uiOptions = {
  language: 'ru',
  uiPreferences: { theme: THEME.DARK } // THEME.LIGHT | THEME.SYSTEM
};

// Всегда передавать полный объект опций (merge происходит автоматически)
```

---

## 15. Telegram Mini App — особенности

### returnStrategy
```typescript
// В ton-appkit.ts:
actionsConfiguration: {
  returnStrategy: 'back', // После подтверждения в кошельке возвращает в TMA
}
```
Варианты: `'back'` | `'none'` | `'${deeplink}'`

### Определение платформы
```typescript
const platform = window.Telegram?.WebApp?.platform;
// 'android' | 'ios' | 'tdesktop' | 'weba' | 'webk' | 'unknown'
```

### Обработка возврата в приложение
После подтверждения транзакции в внешнем кошельке приложение получает:
- `window focus` event
- `document visibilitychange` → `visible`
- Telegram WebApp `activated` event

Именно поэтому в `TonAddressContext` подписаны все три события.

---

## 16. Частые ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|---------|
| Манифест не загружается | Относительный URL или CORS | Использовать абсолютный URL, проверить CORS |
| Кошелёк не восстанавливается | `localStorage` очищен в TMA | Убедиться, что `TonCloudStorage` инициализирован до `TonConnect` |
| `The Wallet declined the request` | Пользователь отказал | Финальное состояние, создать новый запрос |
| Адрес кошелька `null` после восстановления | Гонка состояний | Дождаться `tonConnectionRestored` перед показом UI |
| Jetton-перевод не выполняется | Адрес Jetton-кошелька неверный | Использовать адрес Jetton-кошелька отправителя, не мастер-контракт |
| `amount` не то | Перепутаны единицы | TON в нанотонах (×10⁹), передавать как строку |
| Дублирование инстансов | Создали второй `TonConnectUI` | Всегда импортировать синглтон из `@/lib/ton-appkit` |

---

## 17. Sub-Second Finality (Catchain 2.0) — апрель 2026

> Источник: https://docs.ton.org/ecosystem/subsecond

### Параметры сети

| Сеть | Интервал блока | Задержка финализации |
|------|--------------|----------------------|
| Mainnet сегодня | ~2.5s | ~10s |
| Testnet сегодня | ~450ms | ~1–2s |
| Mainnet цель | 200–400ms | ~1s |

Mainnet активация: **начало апреля 2026**.

### Почему важно для проекта

Без адаптации: даже с быстрым блокчейном UI обновляется через ~10 секунд (HTTP polling).
С адаптацией: `"pending"` → ~0.1s, `"confirmed"` → ~0.4s, `"finalized"` → ~0.8s.

### TON Center Streaming API v2

SSE/WebSocket, задержка 30–100ms от события в чейне до клиента.

**Эндпоинты:**

| Протокол | Testnet | Mainnet |
|----------|---------|---------|
| SSE | `https://testnet.toncenter.com/api/streaming/v2/sse` | `https://toncenter.com/api/streaming/v2/sse` |
| WebSocket | `wss://testnet.toncenter.com/api/streaming/v2/ws` | `wss://toncenter.com/api/streaming/v2/ws` |

**Статусы транзакций:**
- `pending` — транзакция в мемпуле, показать индикатор загрузки
- `confirmed` — включена в shard-блок, можно показать оптимистичный успех
- `finalized` — shard-блок закоммичен в мастерчейн, обновить состояние UI
- `trace_invalidated` — откат, сбросить кэш и перепроверить статус вручную

**Тело подписки (POST):**
```json
{
  "accounts": ["<TON_ADDRESS>"],
  "min_finality": "pending"
}
```

`min_finality` по умолчанию = `"finalized"` (без этого параметра `pending` и `confirmed` не придут).

| Сценарий | min_finality |
|----------|-------------|
| Платёжный флоу (real-time фидбек) | `"pending"` |
| История и балансы | `"finalized"` |

**Известные ограничения SSE:**
1. Rate limit при реконнекте (429). Использовать exponential backoff.
2. POST-only (GET не поддерживается несмотря на стандарт SSE).
3. Для `account_state_change` / `jettons_change` нет `trace_invalidated` при откате. Для balance-critical флоу ждать `"finalized"`.

**WebSocket:** отправлять `ping` каждые 15 секунд для keepalive.

### Реализация в проекте (useTonStreaming)

Хук уже реализован в `src/hooks/useTonStreaming.ts`:

```typescript
import { useTonStreaming } from '@/hooks/useTonStreaming';

const { status, subscribe, unsubscribe, reset } = useTonStreaming();

// После отправки транзакции:
await subscribe(senderAddress, VITE_TONCENTER_API_KEY, false /* mainnet */);

// Обновление UI по статусу:
// 'pending'           → показать спиннер
// 'confirmed'         → оптимистичный успех
// 'finalized'         → финальный успех, обновить баланс
// 'trace_invalidated' → ошибка, транзакция отменена
// 'error'             → timeout или сетевая ошибка
```

Таймаут: 45 секунд (STREAM_TIMEOUT_MS), после чего статус → `'error'`.

**API Key:** передаётся через `VITE_TONCENTER_API_KEY`. Без ключа — 2 одновременных соединения (free tier).

---

## 18. Ссылки

- Sub-second finality: https://docs.ton.org/ecosystem/subsecond
- Документация: https://docs.ton.org/ecosystem/ton-connect/overview
- React SDK: https://docs.ton.org/develop/dapps/ton-connect/react
- Транзакции: https://docs.ton.org/develop/dapps/ton-connect/transactions
- GitHub SDK: https://github.com/ton-connect/sdk
- GitHub Bridge: https://github.com/ton-connect/bridge
- TON Center Streaming: https://docs.ton.org/ecosystem/subsecond
- TEP-74 (Jetton стандарт): https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md
