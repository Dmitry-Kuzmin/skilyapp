import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ChallengeStats = {
    errors: number;
    favorites: number;
};

export function useChallengeStats(profileId: string | null, country?: string, category?: string) {
    return useQuery<ChallengeStats>({
        queryKey: ["challenge-stats", profileId, country, category],
        queryFn: async () => {
            if (!profileId) return { errors: 0, favorites: 0 };

            const dbCountry = country === 'russia' ? 'ru' : country === 'spain' ? 'es' : country;

            // Errors Query
            let errorsQuery = supabase
                .from("user_challenge_questions")
                .select("questions_new!inner(country)", { count: "exact", head: true })
                .eq("user_id", profileId)
                .eq("mastered", false);

            if (dbCountry) {
                errorsQuery = errorsQuery.eq("questions_new.country", dbCountry);
            }
            if (category && country === 'russia') {
                errorsQuery = errorsQuery.filter("questions_new.metadata->>ticket_category", "ilike", `%${category}%`);
            }

            // Favorites Query
            let favoritesQuery = supabase
                .from("user_challenge_questions")
                .select("questions_new!inner(country)", { count: "exact", head: true })
                .eq("user_id", profileId)
                .eq("is_favorite", true);

            if (dbCountry) {
                favoritesQuery = favoritesQuery.eq("questions_new.country", dbCountry);
            }
            if (category && country === 'russia') {
                favoritesQuery = favoritesQuery.filter("questions_new.metadata->>ticket_category", "ilike", `%${category}%`);
            }

            const [errorsResult, favoritesResult] = await Promise.all([
                errorsQuery,
                favoritesQuery
            ]);

            if (errorsResult.error) throw errorsResult.error;
            if (favoritesResult.error) throw favoritesResult.error;

            return {
                errors: errorsResult.count || 0,
                favorites: favoritesResult.count || 0
            };
        },
        enabled: !!profileId,
        staleTime: 2 * 60 * 1000,
        retry: 1,
    });
}
