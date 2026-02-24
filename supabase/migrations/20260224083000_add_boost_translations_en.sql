-- Add English translations to boost_definitions
ALTER TABLE public.boost_definitions ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.boost_definitions ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Update existing boosts with English translations
UPDATE public.boost_definitions SET name_en = '50/50', description_en = 'Removes 2 incorrect answers' WHERE type = 'fifty_fifty' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Time Extend', description_en = 'Adds 30 seconds to the timer' WHERE type = 'time_extend' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Hint', description_en = 'Shows explanation for the question' WHERE type = 'hint' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Skip', description_en = 'Skips the question without penalty' WHERE type = 'skip' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Translate', description_en = 'Translates the question' WHERE type = 'translate' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Double SP', description_en = 'Doubles Season Points for 1 hour' WHERE type = 'double_sp' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Cryptolocker', description_en = 'Encrypts the question. Move cursor/finger to reveal' WHERE type = 'cryptolocker' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Double XP', description_en = 'Doubles Experience Points for 1 hour' WHERE type = 'double_xp' AND (name_en IS NULL OR name_en = '');
UPDATE public.boost_definitions SET name_en = 'Shield', description_en = 'Protects from one wrong answer' WHERE type = 'shield' AND (name_en IS NULL OR name_en = '');

-- Fallback for any other boosts
UPDATE public.boost_definitions SET name_en = type WHERE name_en IS NULL;
