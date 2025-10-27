export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string
          created_at: string
          description: string
          id: string
          max_progress: number | null
          progress: number | null
          title: string
          unlocked: boolean | null
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_type: string
          created_at?: string
          description: string
          id?: string
          max_progress?: number | null
          progress?: number | null
          title: string
          unlocked?: boolean | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_type?: string
          created_at?: string
          description?: string
          id?: string
          max_progress?: number | null
          progress?: number | null
          title?: string
          unlocked?: boolean | null
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          game_type: string
          id: string
          score: number
          total_questions: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          game_type: string
          id?: string
          score?: number
          total_questions?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          game_type?: string
          id?: string
          score?: number
          total_questions?: number
          user_id?: string | null
        }
        Relationships: []
      }
      language_terms: {
        Row: {
          audio_url: string | null
          category: string | null
          created_at: string | null
          description_es: string
          description_ru: string
          difficulty: string | null
          id: string
          image_url: string | null
          term_es: string
          term_ru: string
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          description_es: string
          description_ru: string
          difficulty?: string | null
          id?: string
          image_url?: string | null
          term_es: string
          term_ru: string
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          created_at?: string | null
          description_es?: string
          description_ru?: string
          difficulty?: string | null
          id?: string
          image_url?: string | null
          term_es?: string
          term_ru?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          boosts: number | null
          clerk_id: string | null
          created_at: string | null
          first_name: string
          id: string
          is_premium: boolean | null
          language_code: string | null
          last_login: string | null
          last_name: string | null
          photo_url: string | null
          platform: string | null
          settings: Json | null
          subscription_expires_at: string | null
          subscription_status: string | null
          telegram_id: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          boosts?: number | null
          clerk_id?: string | null
          created_at?: string | null
          first_name: string
          id?: string
          is_premium?: boolean | null
          language_code?: string | null
          last_login?: string | null
          last_name?: string | null
          photo_url?: string | null
          platform?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          boosts?: number | null
          clerk_id?: string | null
          created_at?: string | null
          first_name?: string
          id?: string
          is_premium?: boolean | null
          language_code?: string | null
          last_login?: string | null
          last_name?: string | null
          photo_url?: string | null
          platform?: string | null
          settings?: Json | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer_es: string
          correct_answer_ru: string
          created_at: string
          explanation_es: string | null
          explanation_ru: string | null
          id: string
          options_es: string[]
          options_ru: string[]
          question_es: string
          question_ru: string
          topic_es: string
          topic_ru: string
          updated_at: string
        }
        Insert: {
          correct_answer_es: string
          correct_answer_ru: string
          created_at?: string
          explanation_es?: string | null
          explanation_ru?: string | null
          id?: string
          options_es: string[]
          options_ru: string[]
          question_es: string
          question_ru: string
          topic_es: string
          topic_ru: string
          updated_at?: string
        }
        Update: {
          correct_answer_es?: string
          correct_answer_ru?: string
          created_at?: string
          explanation_es?: string | null
          explanation_ru?: string | null
          id?: string
          options_es?: string[]
          options_ru?: string[]
          question_es?: string
          question_ru?: string
          topic_es?: string
          topic_ru?: string
          updated_at?: string
        }
        Relationships: []
      }
      road_signs: {
        Row: {
          created_at: string | null
          description_es: string
          description_ru: string
          id: string
          image_url: string | null
          name_es: string
          name_ru: string
          sign_number: string | null
          sign_type: string
        }
        Insert: {
          created_at?: string | null
          description_es: string
          description_ru: string
          id?: string
          image_url?: string | null
          name_es: string
          name_ru: string
          sign_number?: string | null
          sign_type: string
        }
        Update: {
          created_at?: string | null
          description_es?: string
          description_ru?: string
          id?: string
          image_url?: string | null
          name_es?: string
          name_ru?: string
          sign_number?: string | null
          sign_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      link_telegram_to_user: {
        Args: {
          _first_name: string
          _last_name?: string
          _photo_url?: string
          _telegram_id: number
          _user_id: string
          _username?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
