# 🔧 Решение проблем с Cloudflare Tunnel

## Ошибка: "Missing script: tunnel:start"

### Решение 1: Убедитесь, что вы в правильной директории

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
npm run tunnel:start
```

### Решение 2: Очистите кэш npm

```bash
npm cache clean --force
npm run tunnel:start
```

### Решение 3: Перезапустите терминал

Закройте и откройте терминал заново, затем:

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
npm run tunnel:start
```

### Решение 4: Проверьте, что скрипт существует

```bash
ls -la scripts/start-cloudflare-tunnel.sh
```

Должен показать файл с правами на выполнение (`-rwxr-xr-x`).

### Решение 5: Запустите напрямую

Если npm скрипт не работает, запустите напрямую:

```bash
./scripts/start-cloudflare-tunnel.sh
```

Или с указанием порта:

```bash
./scripts/start-cloudflare-tunnel.sh 8080
```

## Проверка всех доступных скриптов

```bash
npm run
```

Должны быть видны:
- `tunnel:start` - запуск tunnel
- `tunnel:url` - получить текущий URL
- `tunnel:start:save` - запуск с сохранением URL в файл
- `dev:telegram` - автоматический запуск всего (dev + tunnel)

## Если ничего не помогает

1. Убедитесь, что вы на правильной ветке:
   ```bash
   git branch
   ```

2. Обновите код:
   ```bash
   git pull
   ```

3. Проверьте package.json:
   ```bash
   cat package.json | grep tunnel
   ```

4. Запустите напрямую:
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```

