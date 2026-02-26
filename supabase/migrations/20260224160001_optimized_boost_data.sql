-- Optimized RPC to get all boost related data in a single request
CREATE OR REPLACE FUNCTION public.get_duel_boost_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_loadout RECORD;
    v_inventory JSON;
    v_definitions JSON;
    v_result JSON;
BEGIN
    -- 1. Get Loadout
    SELECT slot_1_boost_type, slot_2_boost_type, slot_3_boost_type
    INTO v_loadout
    FROM public.user_loadouts
    WHERE user_id = p_user_id;

    -- 2. Get Inventory
    SELECT json_agg(json_build_object('boost_type', boost_type, 'quantity', quantity))
    INTO v_inventory
    FROM public.boost_inventory
    WHERE user_id = p_user_id;

    -- 3. Get Definitions (all of them, as they are small and useful for caching)
    SELECT json_agg(json_build_object('type', type, 'icon', icon, 'name_ru', name_ru))
    INTO v_definitions
    FROM public.boost_definitions;

    -- 4. Combine into final result
    v_result := json_build_object(
        'loadout', CASE 
            WHEN v_loadout IS NULL THEN NULL 
            ELSE json_build_object(
                'slot_1', v_loadout.slot_1_boost_type,
                'slot_2', v_loadout.slot_2_boost_type,
                'slot_3', v_loadout.slot_3_boost_type
            )
        END,
        'inventory', COALESCE(v_inventory, '[]'::json),
        'definitions', COALESCE(v_definitions, '[]'::json)
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_duel_boost_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_duel_boost_data(UUID) TO service_role;
