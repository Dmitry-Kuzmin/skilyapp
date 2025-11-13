# Ambient Music Setup Guide

## Обзор

Ambient музыка теперь хранится в Supabase Storage вместо внешних CDN (Pixabay, Incompetech и т.д.) для стабильности и надежности.

## Шаги установки

### 1. Применить миграцию

```bash
cd /Users/dimka/Desktop/Sdadim/sdadim-dgt-prep
supabase db push
```

Это создаст bucket `ambient-music` в Supabase Storage.

### 2. Загрузить музыкальные файлы

#### Вариант A: Через Supabase Dashboard (рекомендуется)

1. Открой [Supabase Dashboard](https://supabase.com/dashboard/project/yffjnqegeiorunyvcxkn/storage/buckets)
2. Найди bucket `ambient-music`
3. Нажми "Upload file"
4. Загрузи 6-8 MP3 файлов ambient музыки

#### Вариант B: Через CLI

```bash
# Установи Supabase CLI если еще не установлен
brew install supabase/tap/supabase

# Залогинься
supabase login

# Загрузи файлы
supabase storage upload ambient-music track1.mp3
supabase storage upload ambient-music track2.mp3
# ... и так далее
```

### 3. Рекомендуемые источники бесплатной музыки

Скачай 6-8 треков (по 2-5 минут каждый) из этих источников:

#### 🎵 Pixabay Music (CC0 License)
- https://pixabay.com/music/
- Фильтр: "Meditation", "Ambient", "Chill"
- Скачай MP3, затем загрузи в Supabase

#### 🎵 Free Music Archive
- https://freemusicarchive.org/
- Ищи "ambient", "meditation"
- Выбирай треки с CC0 или CC BY лицензией

#### 🎵 YouTube Audio Library
- https://www.youtube.com/audiolibrary
- Категория: "Ambient"
- Все треки royalty-free

#### 🎵 Incompetech (Kevin MacLeod)
- https://incompetech.com/music/royalty-free/music.html
- Секция: "Ambient"
- Скачай MP3 файлы

### 4. Именование файлов

Рекомендуемый формат: `ambient-01.mp3`, `ambient-02.mp3`, и т.д.

Или описательные названия: `calm-piano.mp3`, `meditation-waves.mp3`

### 5. Проверка загрузки

После загрузки файлов, проверь их доступность:

1. Открой Supabase Dashboard → Storage → ambient-music
2. Скопируй Public URL любого файла
3. Открой URL в браузере - должна начаться загрузка/воспроизведение

Public URL будет вида:
```
https://yffjnqegeiorunyvcxkn.supabase.co/storage/v1/object/public/ambient-music/ambient-01.mp3
```

### 6. Обновление кода (автоматически)

Код уже обновлен для использования Supabase Storage. Плейлист будет загружаться из bucket `ambient-music`.

## Технические детали

- **Bucket:** `ambient-music` (public)
- **Лимит размера файла:** 10MB
- **Форматы:** MP3, WAV, OGG
- **Доступ:** Публичный для чтения, только админы могут загружать/удалять
- **RLS Policies:** Настроены автоматически

## Преимущества

✅ **Стабильность:** Нет зависимости от внешних CDN  
✅ **Без CORS:** Все файлы с того же домена  
✅ **Без лимитов:** Pixabay не будет блокировать запросы  
✅ **Контроль:** Полный контроль над файлами  
✅ **Быстро:** Supabase CDN по всему миру  

## Troubleshooting

### Файлы не воспроизводятся
- Проверь, что bucket `ambient-music` публичный
- Проверь RLS policies (должны разрешать SELECT всем)
- Проверь формат файлов (MP3 работает лучше всего)

### 403 Forbidden
- Проверь RLS policy "Anyone can view ambient music"
- Убедись что bucket.public = true

### Музыка не переключается
- Проверь консоль браузера на ошибки
- Убедись что загружено минимум 3-4 трека
- Проверь что все файлы доступны по public URL

