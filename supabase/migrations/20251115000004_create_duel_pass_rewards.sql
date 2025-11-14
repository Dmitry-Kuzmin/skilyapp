-- Create duel_pass_rewards table with 10 levels (3000 XP total)
CREATE TABLE IF NOT EXISTS public.duel_pass_rewards (
  level INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 10),
  xp_required INTEGER NOT NULL,
  free_reward JSONB NOT NULL,
  premium_reward JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.duel_pass_rewards (level, xp_required, free_reward, premium_reward) VALUES
  (1, 200,  '{"type":"coins","amount":50}',   '{"type":"coins","amount":150}'),
  (2, 250,  '{"type":"skin","id":"avatar_basic"}', '{"type":"skin","id":"avatar_epic"}'),
  (3, 250,  '{"type":"coins","amount":75}',   '{"type":"coins","amount":200}'),
  (4, 300,  '{"type":"skin","id":"frame_1"}', '{"type":"skin","id":"frame_epic"}'),
  (5, 300,  '{"type":"coins","amount":100}',  '{"type":"coins","amount":300}'),
  (6, 350,  '{"type":"coins","amount":150}',  '{"type":"coins","amount":400}'),
  (7, 400,  '{"type":"skin","id":"badge_rare"}', '{"type":"skin","id":"badge_epic"}'),
  (8, 400,  '{"type":"coins","amount":200}',  '{"type":"coins","amount":500}'),
  (9, 450,  '{"type":"skin","id":"effect_basic"}', '{"type":"skin","id":"effect_legendary"}'),
  (10, 500, '{"type":"coins","amount":500}',  '{"type":"coins","amount":2000,"skin":"final_reward"}')
ON CONFLICT (level) DO UPDATE
SET xp_required = EXCLUDED.xp_required,
    free_reward = EXCLUDED.free_reward,
    premium_reward = EXCLUDED.premium_reward;


