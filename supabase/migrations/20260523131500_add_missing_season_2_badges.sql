-- Add missing badge_definitions referenced by duel_pass_season_rewards for season 2+.
--
-- Without these rows, claiming the level-10 (gold) or level-30 (silver/platinum) reward
-- via duel-pass-claim fails with FK 23503 → 500 "Internal error".
--
-- Mirrors the season_1 badge metadata (color/icon/rarity).

insert into public.badge_definitions
  (id, name_ru, name_es, description_ru, description_es, rarity, is_premium, category, metadata)
values
  ('season_2_silver',
   'Серебро Сезона 2',
   'Plata Temporada 2',
   'Достиг уровня 30 в Duel Pass Сезона 2',
   'Alcanzó el nivel 30 en Duel Pass Temporada 2',
   'rare',
   false,
   'seasonal',
   jsonb_build_object('color', '#cbd5e1', 'icon', 'medal')
  ),
  ('badge_season_2_gold',
   'Золото Сезона 2',
   'Oro Temporada 2',
   'Достиг уровня 10 Premium в Duel Pass Сезона 2',
   'Alcanzó el nivel 10 Premium en Duel Pass Temporada 2',
   'epic',
   true,
   'seasonal',
   jsonb_build_object('color', '#fbbf24', 'icon', 'trophy')
  ),
  ('badge_season_2_platinum',
   'Платина Сезона 2',
   'Platino Temporada 2',
   'Достиг уровня 30 Premium в Duel Pass Сезона 2',
   'Alcanzó el nivel 30 Premium en Duel Pass Temporada 2',
   'legendary',
   true,
   'seasonal',
   jsonb_build_object('color', '#e5e7eb', 'icon', 'trophy', 'animated', true)
  )
on conflict (id) do nothing;
