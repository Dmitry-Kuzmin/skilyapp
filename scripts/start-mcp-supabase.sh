#!/bin/bash

# Читаем .env файл
export $(grep -v '^#' .env | xargs)

# Запускаем MCP сервер
SUPABASE_URL="$VITE_SUPABASE_URL" \
SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
mcp-server-supabase
