-- Функция для получения всех достижений пользователя одним запросом
-- Объединяет achievement_definitions с личным прогрессом пользователя
CREATE OR REPLACE FUNCTION public.get_user_achievements(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(a.id::TEXT, 'virtual-' || ad.id),
            'achievement_type', ad.id,
            'title', COALESCE(a.title, ad.title_ru),
            'description', COALESCE(a.description, ad.description_ru),
            'unlocked', COALESCE(a.unlocked, false),
            'progress', COALESCE(a.progress, 0),
            'max_progress', COALESCE(ad.progress_target, a.max_progress, 1),
            'unlocked_at', a.unlocked_at,
            'category', COALESCE(ad.category, 'other'),
            'reward_xp', COALESCE(ad.reward_xp, 50),
            'icon', COALESCE(ad.icon, 'Trophy')
        )
    )
    INTO v_result
    FROM public.achievement_definitions ad
    LEFT JOIN public.achievements a 
        ON ad.id = a.achievement_type AND a.user_id = p_user_id
    WHERE ad.is_active = true;

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_achievements(UUID) TO anon;
