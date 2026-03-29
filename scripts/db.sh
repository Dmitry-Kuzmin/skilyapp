#!/bin/bash
# Быстрый доступ к БД Supabase (SkilyApp)
# Использование:
#   ./scripts/db.sh "SELECT * FROM profiles LIMIT 5"
#   ./scripts/db.sh profiles          ← показать таблицу (первые 20 строк)
#   ./scripts/db.sh tables            ← список всех таблиц

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/libpq/bin:$PATH"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SUPABASE="/opt/homebrew/bin/supabase"

if [ -z "$1" ]; then
  echo "Использование: $0 \"SQL запрос\" | имя_таблицы | tables"
  exit 1
fi

run_query() {
  cd "$PROJECT_DIR" && $SUPABASE db query "$1" --linked 2>&1 | python3 -c "
import sys, json, re
raw = sys.stdin.read()
# strip non-JSON prefix lines (e.g. 'Initialising login role...')
match = re.search(r'\{', raw)
raw = raw[match.start():] if match else raw
try:
  d = json.loads(raw)
  rows = d.get('rows', [])
  if not rows:
    print('(пусто)')
    exit()
  keys = list(rows[0].keys())
  widths = {k: max(len(k), max(len(str(r.get(k,''))) for r in rows)) for k in keys}
  fmt = ' | '.join('{:<' + str(widths[k]) + '}' for k in keys)
  sep = '-+-'.join('-' * widths[k] for k in keys)
  print(fmt.format(*keys))
  print(sep)
  for r in rows:
    print(fmt.format(*[str(r.get(k,'')) for k in keys]))
  print(f'\n({len(rows)} строк)')
except Exception as e:
  print(raw)
"
}

if [ "$1" = "tables" ]; then
  run_query "SELECT table_name, pg_size_pretty(pg_total_relation_size('public.' || quote_ident(table_name))) as size FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
elif [[ "$1" != *" "* && "$1" != *";"* ]]; then
  # Это имя таблицы, не SQL
  run_query "SELECT * FROM $1 LIMIT 20"
else
  run_query "$1"
fi
