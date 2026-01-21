import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PROJECT_ID = 'yffjnqegeiorunyvcxkn';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

async function getAccessToken() {
    if (process.env.SUPABASE_ACCESS_TOKEN) {
        return process.env.SUPABASE_ACCESS_TOKEN;
    }
    try {
        const { execSync } = await import('child_process');
        const token = execSync('supabase access-token', { encoding: 'utf-8' }).trim();
        if (token) return token;
    } catch (error) {
        console.warn('⚠️  Supabase CLI not found or not logged in');
    }
    return null; // Don't throw yet, maybe service role key is enough for direct SQL?
}

function getMigration() {
    const migrationsDir = join(projectRoot, 'supabase', 'migrations');
    const file = '20260121213000_get_random_questions_v2.sql';
    const filePath = join(migrationsDir, file);
    const stats = statSync(filePath);
    return {
        name: file,
        path: filePath,
        content: readFileSync(filePath, 'utf-8'),
        modified: stats.mtime
    };
}

async function applyMigrationDirect(migration, accessToken) {
    const migrationName = migration.name.replace('.sql', '');
    console.log(`📝 Applying migration directly: ${migrationName}`);

    const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    };

    // If we have access token, use it (for Management API or specialized endpoints)
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        headers['Authorization'] = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    }

    // Try SQL Editor API first (needs accessToken usually) or simple RPC if we have one defined
    try {
        // Trying standard RPC exec_sql if available (some setups have it)
        // OR direct SQL execution via REST if psql is not available.
        // Actually, standard supabase doesn't expose exec_sql by default unless added.
        // But the original script used it.

        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                query: migration.content
            })
        });

        if (!response.ok) {
            // Fallback: try to just create function via magic? No.
            // Let's try the 'apply_migration' RPC from the original script
            const response2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_migration`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    migration_name: migrationName,
                    sql: migration.content
                })
            });

            if (!response2.ok) {
                const errorText = await response2.text();
                throw new Error(`RPC apply_migration failed: ${errorText}`);
            }
            console.log(`✅ RPC apply_migration success`);
            return true;
        }

        console.log(`✅ exec_sql success`);
        return true;
    } catch (error) {
        console.error(`❌ Error applying migration:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting single migration apply...');
    const accessToken = await getAccessToken();
    const migration = getMigration();
    await applyMigrationDirect(migration, accessToken);
}

main();
