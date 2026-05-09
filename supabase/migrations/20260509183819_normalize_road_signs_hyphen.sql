-- Normalize fancy hyphens (U+2010, U+2013, U+2014) → ASCII '-' in road_signs.sign_number.
-- 144 of 333 rows historically used U+2010, which broke .ilike('sign_number', 'R-100')
-- lookups from the AI chat (where the model emits ASCII hyphens).

UPDATE road_signs
SET sign_number = regexp_replace(sign_number, '[‐–—]', '-', 'g')
WHERE sign_number ~ '[‐–—]';

ALTER TABLE road_signs
ADD CONSTRAINT road_signs_sign_number_no_fancy_hyphens
CHECK (sign_number !~ '[‐–—]');
