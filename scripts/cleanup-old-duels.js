import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function cleanup() {
    console.log('🗑️  Cleaning up old duels...\n');

    // Delete duel_answers first (FK constraint)
    const { error: answersError } = await supabase
        .from('duel_answers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (answersError) {
        console.error('Error deleting duel_answers:', answersError);
        return;
    }
    console.log('✅ Deleted all duel_answers');

    // Delete duel_questions
    const { error: questionsError } = await supabase
        .from('duel_questions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (questionsError) {
        console.error('Error deleting duel_questions:', questionsError);
        return;
    }
    console.log('✅ Deleted all duel_questions');

    // Delete duel_active_exploits
    const { error: exploitsError } = await supabase
        .from('duel_active_exploits')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (exploitsError) {
        console.error('Error deleting duel_active_exploits:', exploitsError);
    } else {
        console.log('✅ Deleted all duel_active_exploits');
    }

    // Delete duel_players
    const { error: playersError } = await supabase
        .from('duel_players')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (playersError) {
        console.error('Error deleting duel_players:', playersError);
        return;
    }
    console.log('✅ Deleted all duel_players');

    // Delete duels
    const { error: duelsError } = await supabase
        .from('duels')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (duelsError) {
        console.error('Error deleting duels:', duelsError);
        return;
    }
    console.log('✅ Deleted all duels');

    console.log('\n✨ Cleanup complete! You can now create fresh duels.');
}

cleanup();
