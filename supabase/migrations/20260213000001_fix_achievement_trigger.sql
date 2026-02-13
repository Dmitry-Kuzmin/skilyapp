-- Fix sync_achievements_with_profile function
-- It was using avatar_url which does not exist in profiles. Correct field is photo_url.

CREATE OR REPLACE FUNCTION public.sync_achievements_with_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Photomodel (Photo added)
    -- Corrected: using photo_url instead of avatar_url
    IF NEW.photo_url IS NOT NULL AND (OLD.photo_url IS NULL OR OLD.photo_url <> NEW.photo_url) THEN
        PERFORM public.update_user_achievement(NEW.id, 'photomodel', 1, true);
    END IF;

    -- PDD Master (XP check)
    IF NEW.xp >= 4000 THEN
        PERFORM public.update_user_achievement(NEW.id, 'pdd_master', 4000, true);
    END IF;
    
    RETURN NEW;
END;
$$;
