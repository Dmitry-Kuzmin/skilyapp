
import json

with open("/Users/dimka/Desktop/Sdadim/sdadim-dgt-prep/supabase/migrations/20260215000001_fix_telegram_profile_linking.sql", "r") as f:
    sql = f.read()

payload = {"query": sql}
with open("/tmp/payload.json", "w") as f:
    json.dump(payload, f)
