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
          user_id: string
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
          user_id: string
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
          user_id?: string
        }
        Relationships: []
      }
      answer_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
          text_en: string
          text_es: string
          text_ru: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id: string
          text_en: string
          text_es: string
          text_ru: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
          text_en?: string
          text_es?: string
          text_ru?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_new"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_definitions: {
        Row: {
          cost_coins: number
          created_at: string | null
          description_es: string | null
          description_ru: string | null
          icon: string | null
          id: string
          is_premium: boolean | null
          name_es: string
          name_ru: string
          type: string
        }
        Insert: {
          cost_coins: number
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean | null
          name_es: string
          name_ru: string
          type: string
        }
        Update: {
          cost_coins?: number
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean | null
          name_es?: string
          name_ru?: string
          type?: string
        }
        Relationships: []
      }
      boost_inventory: {
        Row: {
          boost_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          quantity: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          boost_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          quantity?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          boost_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          quantity?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_bonus_def: {
        Row: {
          created_at: string | null
          day_number: number
          description: string
          reward: Json
        }
        Insert: {
          created_at?: string | null
          day_number: number
          description: string
          reward: Json
        }
        Update: {
          created_at?: string | null
          day_number?: number
          description?: string
          reward?: Json
        }
        Relationships: []
      }
      daily_duel_limits: {
        Row: {
          created_at: string
          date: string
          duels_played: number
          full_rewards_claimed: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          duels_played?: number
          full_rewards_claimed?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duels_played?: number
          full_rewards_claimed?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_duel_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          max_progress: number
          progress: number
          reward: number
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          max_progress: number
          progress?: number
          reward?: number
          task_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          max_progress?: number
          progress?: number
          reward?: number
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_answers: {
        Row: {
          boost_used: string | null
          combo_at_time: number
          created_at: string
          duel_id: string
          duel_question_id: string
          id: string
          is_correct: boolean
          is_skipped: boolean | null
          player_id: string
          points_awarded: number
          selected_option_id: string | null
          time_taken_ms: number
        }
        Insert: {
          boost_used?: string | null
          combo_at_time?: number
          created_at?: string
          duel_id: string
          duel_question_id: string
          id?: string
          is_correct: boolean
          is_skipped?: boolean | null
          player_id: string
          points_awarded?: number
          selected_option_id?: string | null
          time_taken_ms: number
        }
        Update: {
          boost_used?: string | null
          combo_at_time?: number
          created_at?: string
          duel_id?: string
          duel_question_id?: string
          id?: string
          is_correct?: boolean
          is_skipped?: boolean | null
          player_id?: string
          points_awarded?: number
          selected_option_id?: string | null
          time_taken_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_answers_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_answers_duel_question_id_fkey"
            columns: ["duel_question_id"]
            isOneToOne: false
            referencedRelation: "duel_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_boosts_used: {
        Row: {
          boost_type: string
          duel_id: string
          duel_question_id: string | null
          id: string
          player_id: string
          used_at: string | null
        }
        Insert: {
          boost_type: string
          duel_id: string
          duel_question_id?: string | null
          id?: string
          player_id: string
          used_at?: string | null
        }
        Update: {
          boost_type?: string
          duel_id?: string
          duel_question_id?: string | null
          id?: string
          player_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_boosts_used_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_boosts_used_duel_question_id_fkey"
            columns: ["duel_question_id"]
            isOneToOne: false
            referencedRelation: "duel_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_boosts_used_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_notifications: {
        Row: {
          created_at: string | null
          duel_id: string | null
          icon: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duel_id?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duel_id?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_notifications_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_players: {
        Row: {
          bot_difficulty: string | null
          connected: boolean
          correct_count: number
          created_at: string
          duel_id: string
          estimated_latency_ms: number | null
          id: string
          is_bot: boolean
          is_host: boolean
          score: number
          user_id: string | null
        }
        Insert: {
          bot_difficulty?: string | null
          connected?: boolean
          correct_count?: number
          created_at?: string
          duel_id: string
          estimated_latency_ms?: number | null
          id?: string
          is_bot?: boolean
          is_host?: boolean
          score?: number
          user_id?: string | null
        }
        Update: {
          bot_difficulty?: string | null
          connected?: boolean
          correct_count?: number
          created_at?: string
          duel_id?: string
          estimated_latency_ms?: number | null
          id?: string
          is_bot?: boolean
          is_host?: boolean
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_players_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_questions: {
        Row: {
          correct_option_ids: Json
          created_at: string
          duel_id: string
          id: string
          position: number
          question_id: string
          question_snapshot: Json
        }
        Insert: {
          correct_option_ids: Json
          created_at?: string
          duel_id: string
          id?: string
          position: number
          question_id: string
          question_snapshot: Json
        }
        Update: {
          correct_option_ids?: Json
          created_at?: string
          duel_id?: string
          id?: string
          position?: number
          question_id?: string
          question_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "duel_questions_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_new"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_stats: {
        Row: {
          avg_score: number | null
          best_streak: number
          created_at: string
          current_streak: number
          draws: number
          id: string
          losses: number
          total_duels: number
          total_points: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          avg_score?: number | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          draws?: number
          id?: string
          losses?: number
          total_duels?: number
          total_points?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          avg_score?: number | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          draws?: number
          id?: string
          losses?: number
          total_duels?: number
          total_points?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          categories: Json | null
          code: string
          created_at: string
          difficulty: string | null
          expires_at: string
          finished_at: string | null
          finished_by_players: string[] | null
          host_user: string
          id: string
          num_questions: number
          question_seed: number
          started_at: string | null
          status: string
          user_a_finished_at: string | null
          user_b_finished_at: string | null
          winner_id: string | null
        }
        Insert: {
          categories?: Json | null
          code: string
          created_at?: string
          difficulty?: string | null
          expires_at?: string
          finished_at?: string | null
          finished_by_players?: string[] | null
          host_user: string
          id?: string
          num_questions: number
          question_seed: number
          started_at?: string | null
          status?: string
          user_a_finished_at?: string | null
          user_b_finished_at?: string | null
          winner_id?: string | null
        }
        Update: {
          categories?: Json | null
          code?: string
          created_at?: string
          difficulty?: string | null
          expires_at?: string
          finished_at?: string | null
          finished_by_players?: string[] | null
          host_user?: string
          id?: string
          num_questions?: number
          question_seed?: number
          started_at?: string | null
          status?: string
          user_a_finished_at?: string | null
          user_b_finished_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_host_user_fkey"
            columns: ["host_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          game_type: string
          id: string
          mode: string | null
          questions_data: Json | null
          score: number
          topic: string | null
          total_questions: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          game_type: string
          id?: string
          mode?: string | null
          questions_data?: Json | null
          score?: number
          topic?: string | null
          total_questions?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          game_type?: string
          id?: string
          mode?: string | null
          questions_data?: Json | null
          score?: number
          topic?: string | null
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
          topic_id: string | null
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
          topic_id?: string | null
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
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_terms_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      material_versions: {
        Row: {
          content: Json
          created_at: string
          html_preview: string
          id: string
          material_id: string
          updated_by: string | null
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          html_preview: string
          id?: string
          material_id: string
          updated_by?: string | null
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          html_preview?: string
          id?: string
          material_id?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_versions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          content: Json | null
          content_en: string
          content_es: string
          content_ru: string
          created_at: string
          html_preview: string | null
          id: string
          images: Json | null
          is_published: boolean
          source_pdf: string | null
          subtopic_id: string
          title_en: string
          title_es: string
          title_ru: string
          type: Database["public"]["Enums"]["material_type"] | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          content?: Json | null
          content_en: string
          content_es: string
          content_ru: string
          created_at?: string
          html_preview?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean
          source_pdf?: string | null
          subtopic_id: string
          title_en: string
          title_es: string
          title_ru: string
          type?: Database["public"]["Enums"]["material_type"] | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          content?: Json | null
          content_en?: string
          content_es?: string
          content_ru?: string
          created_at?: string
          html_preview?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean
          source_pdf?: string | null
          subtopic_id?: string
          title_en?: string
          title_es?: string
          title_ru?: string
          type?: Database["public"]["Enums"]["material_type"] | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          boosts: number | null
          clerk_id: string | null
          coins: number
          created_at: string | null
          first_name: string
          id: string
          is_premium: boolean | null
          language_code: string | null
          last_activity_date: string | null
          last_login: string | null
          last_name: string | null
          photo_url: string | null
          platform: string | null
          rank: string
          settings: Json | null
          streak_days: number
          subscription_expires_at: string | null
          subscription_status: string | null
          telegram_id: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          xp: number
        }
        Insert: {
          boosts?: number | null
          clerk_id?: string | null
          coins?: number
          created_at?: string | null
          first_name: string
          id?: string
          is_premium?: boolean | null
          language_code?: string | null
          last_activity_date?: string | null
          last_login?: string | null
          last_name?: string | null
          photo_url?: string | null
          platform?: string | null
          rank?: string
          settings?: Json | null
          streak_days?: number
          subscription_expires_at?: string | null
          subscription_status?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          xp?: number
        }
        Update: {
          boosts?: number | null
          clerk_id?: string | null
          coins?: number
          created_at?: string | null
          first_name?: string
          id?: string
          is_premium?: boolean | null
          language_code?: string | null
          last_activity_date?: string | null
          last_login?: string | null
          last_name?: string | null
          photo_url?: string | null
          platform?: string | null
          rank?: string
          settings?: Json | null
          streak_days?: number
          subscription_expires_at?: string | null
          subscription_status?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          question_id: string
          tag_id: string
        }
        Insert: {
          question_id: string
          tag_id: string
        }
        Update: {
          question_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_new: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation_en: string | null
          explanation_es: string | null
          explanation_ru: string | null
          id: string
          image_url: string | null
          is_premium: boolean
          notes: string | null
          percent_correct: number | null
          question_en: string
          question_es: string
          question_ru: string
          sign_code: string | null
          source: string | null
          source_id: string | null
          topic_id: string | null
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation_en?: string | null
          explanation_es?: string | null
          explanation_ru?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          notes?: string | null
          percent_correct?: number | null
          question_en: string
          question_es: string
          question_ru: string
          sign_code?: string | null
          source?: string | null
          source_id?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation_en?: string | null
          explanation_es?: string | null
          explanation_ru?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          notes?: string | null
          percent_correct?: number | null
          question_en?: string
          question_es?: string
          question_ru?: string
          sign_code?: string | null
          source?: string | null
          source_id?: string | null
          topic_id?: string | null
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_new_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      road_race_achievements: {
        Row: {
          achievement_type: string
          description_en: string
          description_es: string
          description_ru: string
          icon: string | null
          id: string
          name_en: string
          name_es: string
          name_ru: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          description_en: string
          description_es: string
          description_ru: string
          icon?: string | null
          id?: string
          name_en: string
          name_es: string
          name_ru: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          description_en?: string
          description_es?: string
          description_ru?: string
          icon?: string | null
          id?: string
          name_en?: string
          name_es?: string
          name_ru?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      road_race_leaderboard: {
        Row: {
          accuracy_percent: number
          avg_speed: number
          created_at: string
          id: string
          route_id: string
          score: number
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          accuracy_percent: number
          avg_speed: number
          created_at?: string
          id?: string
          route_id: string
          score: number
          time_spent_seconds: number
          user_id: string
        }
        Update: {
          accuracy_percent?: number
          avg_speed?: number
          created_at?: string
          id?: string
          route_id?: string
          score?: number
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "road_race_leaderboard_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "road_race_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      road_race_routes: {
        Row: {
          checkpoint_interval: number
          created_at: string
          description_en: string
          description_es: string
          description_ru: string
          difficulty: string
          gradient_from: string
          gradient_to: string
          icon: string | null
          id: string
          is_premium: boolean
          name_en: string
          name_es: string
          name_ru: string
          question_mix: Json
          total_distance: number
          updated_at: string
        }
        Insert: {
          checkpoint_interval?: number
          created_at?: string
          description_en: string
          description_es: string
          description_ru: string
          difficulty?: string
          gradient_from?: string
          gradient_to?: string
          icon?: string | null
          id?: string
          is_premium?: boolean
          name_en: string
          name_es: string
          name_ru: string
          question_mix?: Json
          total_distance?: number
          updated_at?: string
        }
        Update: {
          checkpoint_interval?: number
          created_at?: string
          description_en?: string
          description_es?: string
          description_ru?: string
          difficulty?: string
          gradient_from?: string
          gradient_to?: string
          icon?: string | null
          id?: string
          is_premium?: boolean
          name_en?: string
          name_es?: string
          name_ru?: string
          question_mix?: Json
          total_distance?: number
          updated_at?: string
        }
        Relationships: []
      }
      road_race_sessions: {
        Row: {
          avg_speed: number
          checkpoints_reached: number
          combo_max: number
          completed: boolean
          completed_at: string | null
          correct_answers: number
          created_at: string
          distance_completed: number
          final_score: number
          fuel_remaining: number
          id: string
          incorrect_answers: number
          max_speed: number
          route_id: string
          session_data: Json | null
          time_spent_seconds: number
          total_distance: number
          total_questions: number
          user_id: string
        }
        Insert: {
          avg_speed?: number
          checkpoints_reached?: number
          combo_max?: number
          completed?: boolean
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          distance_completed?: number
          final_score?: number
          fuel_remaining?: number
          id?: string
          incorrect_answers?: number
          max_speed?: number
          route_id: string
          session_data?: Json | null
          time_spent_seconds?: number
          total_distance: number
          total_questions: number
          user_id: string
        }
        Update: {
          avg_speed?: number
          checkpoints_reached?: number
          combo_max?: number
          completed?: boolean
          completed_at?: string | null
          correct_answers?: number
          created_at?: string
          distance_completed?: number
          final_score?: number
          fuel_remaining?: number
          id?: string
          incorrect_answers?: number
          max_speed?: number
          route_id?: string
          session_data?: Json | null
          time_spent_seconds?: number
          total_distance?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "road_race_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "road_race_routes"
            referencedColumns: ["id"]
          },
        ]
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
      subtopics: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          is_required: boolean
          order_index: number
          title_en: string
          title_es: string
          title_ru: string
          topic_id: string
          type: Database["public"]["Enums"]["subtopic_type"]
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          order_index: number
          title_en: string
          title_es: string
          title_ru: string
          topic_id: string
          type: Database["public"]["Enums"]["subtopic_type"]
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          order_index?: number
          title_en?: string
          title_es?: string
          title_ru?: string
          topic_id?: string
          type?: Database["public"]["Enums"]["subtopic_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name_en: string
          name_es: string
          name_ru: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name_en: string
          name_es: string
          name_ru: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name_en?: string
          name_es?: string
          name_ru?: string
        }
        Relationships: []
      }
      topic_tests: {
        Row: {
          created_at: string
          id: string
          is_skip_test: boolean
          min_pass_percent: number
          question_count: number
          subtopic_id: string | null
          title_en: string
          title_es: string
          title_ru: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_skip_test?: boolean
          min_pass_percent?: number
          question_count?: number
          subtopic_id?: string | null
          title_en: string
          title_es: string
          title_ru: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_skip_test?: boolean
          min_pass_percent?: number
          question_count?: number
          subtopic_id?: string | null
          title_en?: string
          title_es?: string
          title_ru?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_tests_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_tests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          cover_image: string | null
          created_at: string
          description_en: string | null
          description_es: string | null
          description_ru: string | null
          gradient_from: string
          gradient_to: string
          id: string
          is_premium: boolean
          number: number
          order_index: number
          title_en: string
          title_es: string
          title_ru: string
          unlock_condition: Json | null
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          is_premium?: boolean
          number: number
          order_index: number
          title_en: string
          title_es: string
          title_ru: string
          unlock_condition?: Json | null
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          gradient_from?: string
          gradient_to?: string
          id?: string
          is_premium?: boolean
          number?: number
          order_index?: number
          title_en?: string
          title_es?: string
          title_ru?: string
          unlock_condition?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      user_daily_bonus: {
        Row: {
          created_at: string | null
          current_streak: number
          id: string
          last_claimed_date: string | null
          streak_restore_available: boolean | null
          total_claims: number
          total_restores: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_claimed_date?: string | null
          streak_restore_available?: boolean | null
          total_claims?: number
          total_restores?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_claimed_date?: string | null
          streak_restore_available?: boolean | null
          total_claims?: number
          total_restores?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_bonus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          answer_history: Json | null
          attempts: number
          created_at: string
          id: string
          is_answered: boolean
          is_correct: boolean
          last_attempt_at: string | null
          question_id: string
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_history?: Json | null
          attempts?: number
          created_at?: string
          id?: string
          is_answered?: boolean
          is_correct?: boolean
          last_attempt_at?: string | null
          question_id: string
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_history?: Json | null
          attempts?: number
          created_at?: string
          id?: string
          is_answered?: boolean
          is_correct?: boolean
          last_attempt_at?: string | null
          question_id?: string
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sign_progress: {
        Row: {
          created_at: string
          id: string
          last_practiced_at: string | null
          mastery_level: number
          sign_id: string
          times_practiced: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          sign_id: string
          times_practiced?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          sign_id?: string
          times_practiced?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sign_progress_sign_id_fkey"
            columns: ["sign_id"]
            isOneToOne: false
            referencedRelation: "road_signs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sign_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_term_progress: {
        Row: {
          created_at: string
          id: string
          last_practiced_at: string | null
          mastery_level: number
          term_id: string
          times_practiced: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          term_id: string
          times_practiced?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          term_id?: string
          times_practiced?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_term_progress_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "language_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_term_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_activity: string
          score: number | null
          subtopic_id: string | null
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_activity?: string
          score?: number | null
          subtopic_id?: string | null
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_activity?: string
          score?: number | null
          subtopic_id?: string | null
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_progress_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topic_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_profile_id: { Args: never; Returns: string }
      has_boost: {
        Args: { p_boost_type: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_profile_value: {
        Args: { p_amount: number; p_column: string; p_profile_id: string }
        Returns: undefined
      }
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
      modify_boost_inventory: {
        Args: { p_boost_type: string; p_change: number; p_user_id: string }
        Returns: undefined
      }
      upsert_duel_stats: {
        Args: {
          p_is_draw: boolean
          p_is_win: boolean
          p_score: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "easy" | "medium" | "hard"
      material_type: "theory" | "test" | "terms"
      question_type: "single" | "multiple" | "true_false" | "image"
      subtopic_type: "material" | "test" | "terms"
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
    Enums: {
      app_role: ["admin", "user"],
      difficulty_level: ["easy", "medium", "hard"],
      material_type: ["theory", "test", "terms"],
      question_type: ["single", "multiple", "true_false", "image"],
      subtopic_type: ["material", "test", "terms"],
    },
  },
} as const
