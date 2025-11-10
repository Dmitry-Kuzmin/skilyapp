#!/bin/bash

# Загружаем переменные из .env
set -a
source ../.env 2>/dev/null || source .env 2>/dev/null
set +a

# Запускаем импорт
npx tsx import-dgt-questions.ts

