import os
import json
import http.client
from urllib.parse import urlparse

# Read .env to get Supabase details
def get_env():
    env = {}
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    env[key] = value
    return env

env = get_env()
url = env.get('VITE_SUPABASE_URL')
key = env.get('SUPABASE_SERVICE_KEY')

if not url or not key:
    print("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    exit(1)

# Read migration file
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
migration_path = project_root / 'supabase' / 'migrations' / '20260210_achievement_system.sql'
with open(migration_path, 'r') as f:
    sql = f.read()

# Prepare request
parsed_url = urlparse(url)
conn = http.client.HTTPSConnection(parsed_url.netloc)

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json'
}

body = json.dumps({'sql': sql})

# Send request to apply-sql function
conn.request('POST', '/functions/v1/apply-sql', body, headers)
response = conn.getresponse()
data = response.read()

print(f"Status: {response.status}")
print(f"Response: {data.decode()}")
