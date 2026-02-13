export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          telegram_id: number | null
          first_name: string | null
          last_name: string | null
          username: string | null
          coins: number | null
          xp: number | null
          premium_until: string | null
          trial_until: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          duel_pass_level: number
          duel_pass_xp: number
          duel_pass_premium: boolean
          duel_pass_season: number
          equipped_avatar: string
          assistant_mood: string
          assistant_last_interaction: string
          settings: Json | null
          active_country: string | null
          photo_url: string | null
          language_code: string | null
          is_telegram_premium: boolean | null
          subscription_status: string | null
          premium_forever_purchased_at: string | null
          created_at: string | null
          updated_at: string | null

        }
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      transactions: {
        Row: {
          id: string
          user_id: string
          transaction_type: string
          amount: number
          metadata: Json | null
          created_at: string
        };
        Insert: {
          id?: string
          user_id: string
          transaction_type: string
          amount: number
          metadata?: Json | null
          created_at?: string
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      purchases: {
        Row: {
          id: string
          user_id: string
          item_type: string
          item_id: string | null
          price: number
          currency: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          status: string
          metadata: Json | null
          created_at: string
          completed_at: string | null
        };
        Insert: Partial<Database["public"]["Tables"]["purchases"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["purchases"]["Row"]>;
      };
      stripe_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          payload: Json
          processed: boolean
          created_at: string
        };
        Insert: Partial<Database["public"]["Tables"]["stripe_events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["stripe_events"]["Row"]>;
      };
      duel_pass_rewards: {
        Row: {
          level: number
          xp_required: number
          free_reward: Json
          premium_reward: Json
          created_at: string
        };
        Insert: Partial<Database["public"]["Tables"]["duel_pass_rewards"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["duel_pass_rewards"]["Row"]>;
      };
      user_claimed_rewards: {
        Row: {
          id: string
          user_id: string
          season: number
          level: number
          is_premium: boolean
          claimed_at: string
        };
        Insert: {
          id?: string
          user_id: string
          season: number
          level: number
          is_premium?: boolean
          claimed_at?: string
        };
        Update: Partial<Database["public"]["Tables"]["user_claimed_rewards"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

