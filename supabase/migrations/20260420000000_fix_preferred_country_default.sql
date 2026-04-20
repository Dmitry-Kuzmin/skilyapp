-- Fix preferred_country default: was 'russia', which caused new users to get
-- Russian PDD regardless of their location. Onboarding sets the correct value.
ALTER TABLE profiles ALTER COLUMN preferred_country SET DEFAULT NULL;
