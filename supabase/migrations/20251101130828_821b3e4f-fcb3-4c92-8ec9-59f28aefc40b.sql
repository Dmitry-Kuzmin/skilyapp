-- Fix the foreign key constraint in duels table to reference profiles.id instead of profiles.user_id
ALTER TABLE duels DROP CONSTRAINT IF EXISTS duels_host_user_fkey;
ALTER TABLE duels ADD CONSTRAINT duels_host_user_fkey 
  FOREIGN KEY (host_user) REFERENCES profiles(id) ON DELETE CASCADE;

-- Same fix for duel_players
ALTER TABLE duel_players DROP CONSTRAINT IF EXISTS duel_players_user_id_fkey;
ALTER TABLE duel_players ADD CONSTRAINT duel_players_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Same fix for duel_stats
ALTER TABLE duel_stats DROP CONSTRAINT IF EXISTS duel_stats_user_id_fkey;
ALTER TABLE duel_stats ADD CONSTRAINT duel_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Same fix for daily_duel_limits
ALTER TABLE daily_duel_limits DROP CONSTRAINT IF EXISTS daily_duel_limits_user_id_fkey;
ALTER TABLE daily_duel_limits ADD CONSTRAINT daily_duel_limits_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Grant admin role to kuzmin.public@gmail.com
INSERT INTO user_roles (user_id, role)
VALUES ('0d897282-c18b-4140-bd77-fecb23cd1af1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;