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
      active_boosts: {
        Row: {
          activated_at: string
          boost_type: string
          created_at: string
          effect_multiplier: number
          effect_type: string
          expires_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activated_at?: string
          boost_type: string
          created_at?: string
          effect_multiplier: number
          effect_type: string
          expires_at: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activated_at?: string
          boost_type?: string
          created_at?: string
          effect_multiplier?: number
          effect_type?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_boosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_rewards: {
        Row: {
          created_at: string
          daily_count: number
          date: string
          id: string
          last_watched_at: string | null
          reward_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_count?: number
          date?: string
          id?: string
          last_watched_at?: string | null
          reward_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_count?: number
          date?: string
          id?: string
          last_watched_at?: string | null
          reward_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          report_type: string
          resolved_at: string | null
          resolved_by: string | null
          reward_calculation_data: Json
          session_id: string | null
          status: string | null
          test_result_id: string | null
          updated_at: string | null
          user_id: string
          user_message: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          report_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          reward_calculation_data?: Json
          session_id?: string | null
          status?: string | null
          test_result_id?: string | null
          updated_at?: string | null
          user_id: string
          user_message?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          report_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          reward_calculation_data?: Json
          session_id?: string | null
          status?: string | null
          test_result_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_reports_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_history: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_index: number
          model_used: string | null
          response_time_ms: number | null
          role: string
          session_id: string | null
          token_count: number | null
          topic_number: number | null
          used_knowledge: boolean | null
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_index: number
          model_used?: string | null
          response_time_ms?: number | null
          role: string
          session_id?: string | null
          token_count?: number | null
          topic_number?: number | null
          used_knowledge?: boolean | null
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_index?: number
          model_used?: string | null
          response_time_ms?: number | null
          role?: string
          session_id?: string | null
          token_count?: number | null
          topic_number?: number | null
          used_knowledge?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          ai_response: string
          comment: string | null
          created_at: string | null
          id: string
          model_used: string | null
          question: string
          rating: number | null
          response_time_ms: number | null
          session_id: string | null
          test_question_id: string | null
          topic_number: number | null
          used_knowledge: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          ai_response: string
          comment?: string | null
          created_at?: string | null
          id?: string
          model_used?: string | null
          question: string
          rating?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          test_question_id?: string | null
          topic_number?: number | null
          used_knowledge?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          ai_response?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          model_used?: string | null
          question?: string
          rating?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          test_question_id?: string | null
          topic_number?: number | null
          used_knowledge?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_log: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          override_template_type: string | null
          payload: Json | null
          processed: boolean
          processed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          override_template_type?: string | null
          payload?: Json | null
          processed?: boolean
          processed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          override_template_type?: string | null
          payload?: Json | null
          processed?: boolean
          processed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
          text_en: string | null
          text_es: string | null
          text_ru: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id: string
          text_en?: string | null
          text_es?: string | null
          text_ru: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
          text_en?: string | null
          text_es?: string | null
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
      anti_fraud_logs: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          event_type: string
          id: string
          ip_address: string | null
          level: string
          payload: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          level?: string
          payload?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          level?: string
          payload?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anti_fraud_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "race_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anti_fraud_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      autoschool_students: {
        Row: {
          added_at: string | null
          added_by: string | null
          enrollment_date: string | null
          expected_exam_date: string | null
          id: string
          notes: string | null
          partner_id: string
          status: string | null
          student_group: string | null
          student_name: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          enrollment_date?: string | null
          expected_exam_date?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          status?: string | null
          student_group?: string | null
          student_name?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          enrollment_date?: string | null
          expected_exam_date?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          status?: string | null
          student_group?: string | null
          student_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoschool_students_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autoschool_students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          category: string | null
          created_at: string | null
          description_es: string | null
          description_ru: string | null
          icon_url: string | null
          id: string
          is_premium: boolean | null
          metadata: Json | null
          name_es: string
          name_ru: string
          rarity: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          icon_url?: string | null
          id: string
          is_premium?: boolean | null
          metadata?: Json | null
          name_es: string
          name_ru: string
          rarity: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          icon_url?: string | null
          id?: string
          is_premium?: boolean | null
          metadata?: Json | null
          name_es?: string
          name_ru?: string
          rarity?: string
        }
        Relationships: []
      }
      boost_definitions: {
        Row: {
          category: string | null
          cost_coins: number
          created_at: string | null
          description_es: string | null
          description_ru: string | null
          duration_minutes: number | null
          effect_multiplier: number | null
          effect_type: string | null
          icon: string | null
          id: string
          is_premium: boolean | null
          mode: string | null
          name_es: string
          name_ru: string
          target_type: string | null
          type: string
        }
        Insert: {
          category?: string | null
          cost_coins: number
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          duration_minutes?: number | null
          effect_multiplier?: number | null
          effect_type?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean | null
          mode?: string | null
          name_es: string
          name_ru: string
          target_type?: string | null
          type: string
        }
        Update: {
          category?: string | null
          cost_coins?: number
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          duration_minutes?: number | null
          effect_multiplier?: number | null
          effect_type?: string | null
          icon?: string | null
          id?: string
          is_premium?: boolean | null
          mode?: string | null
          name_es?: string
          name_ru?: string
          target_type?: string | null
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
      bot_express_sessions: {
        Row: {
          answers: Json
          completed_at: string | null
          correct_count: number
          created_at: string
          current_index: number
          id: string
          language_code: string | null
          question_snapshots: Json
          session_code: string
          status: string
          telegram_id: number
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          current_index?: number
          id?: string
          language_code?: string | null
          question_snapshots: Json
          session_code: string
          status?: string
          telegram_id: number
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          current_index?: number
          id?: string
          language_code?: string | null
          question_snapshots?: Json
          session_code?: string
          status?: string
          telegram_id?: number
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_express_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_guide_sections: {
        Row: {
          category_slug: string
          category_title: string
          content: string
          created_at: string
          cta_deeplink: string | null
          cta_text: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          language: string
          section_slug: string
          section_title: string
          sort_order: number
          summary: string | null
          updated_at: string
        }
        Insert: {
          category_slug: string
          category_title: string
          content: string
          created_at?: string
          cta_deeplink?: string | null
          cta_text?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          language?: string
          section_slug: string
          section_title: string
          sort_order?: number
          summary?: string | null
          updated_at?: string
        }
        Update: {
          category_slug?: string
          category_title?: string
          content?: string
          created_at?: string
          cta_deeplink?: string | null
          cta_text?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          language?: string
          section_slug?: string
          section_title?: string
          sort_order?: number
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_tips: {
        Row: {
          created_at: string
          cta_deeplink: string | null
          cta_text: string | null
          id: string
          is_active: boolean
          language: string
          skill_level: string | null
          sort_order: number | null
          summary: string | null
          tip_body: string
          title: string
          topic_icon: string | null
          topic_slug: string
          topic_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_deeplink?: string | null
          cta_text?: string | null
          id?: string
          is_active?: boolean
          language?: string
          skill_level?: string | null
          sort_order?: number | null
          summary?: string | null
          tip_body: string
          title: string
          topic_icon?: string | null
          topic_slug: string
          topic_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_deeplink?: string | null
          cta_text?: string | null
          id?: string
          is_active?: boolean
          language?: string
          skill_level?: string | null
          sort_order?: number | null
          summary?: string | null
          tip_body?: string
          title?: string
          topic_icon?: string | null
          topic_slug?: string
          topic_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          default_language: string
          flag_emoji: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_ru: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_language?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_ru: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_language?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_ru?: string
          updated_at?: string
        }
        Relationships: []
      }
      cron_job_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          job_name: string
          result_data: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_name: string
          result_data?: Json | null
          status: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_name?: string
          result_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      daily_ai_usage: {
        Row: {
          created_at: string
          id: string
          request_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
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
      dgt_knowledge: {
        Row: {
          content: string
          content_type: string | null
          created_at: string | null
          id: string
          keywords: string[] | null
          language: string | null
          page_number: number | null
          section_title: string | null
          source_file: string | null
          topic_id: string | null
          topic_number: number | null
          updated_at: string | null
        }
        Insert: {
          content: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          page_number?: number | null
          section_title?: string | null
          source_file?: string | null
          topic_id?: string | null
          topic_number?: number | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          page_number?: number | null
          section_title?: string | null
          source_file?: string | null
          topic_id?: string | null
          topic_number?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dgt_knowledge_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      dgt_questions: {
        Row: {
          category: string
          correct_answer: string
          created_at: string
          explanation_es: string | null
          id: string
          image_filename: string | null
          option_a_es: string
          option_b_es: string
          option_c_es: string
          question_es: string
          source: string | null
          times_correct: number | null
          times_shown: number | null
          updated_at: string
        }
        Insert: {
          category: string
          correct_answer: string
          created_at?: string
          explanation_es?: string | null
          id?: string
          image_filename?: string | null
          option_a_es: string
          option_b_es: string
          option_c_es: string
          question_es: string
          source?: string | null
          times_correct?: number | null
          times_shown?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          correct_answer?: string
          created_at?: string
          explanation_es?: string | null
          id?: string
          image_filename?: string | null
          option_a_es?: string
          option_b_es?: string
          option_c_es?: string
          question_es?: string
          source?: string | null
          times_correct?: number | null
          times_shown?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dgt_rules_compact: {
        Row: {
          common_mistakes: string[] | null
          created_at: string | null
          details: Json | null
          exam_tips: string[] | null
          id: string
          keyword: string
          keyword_es: string | null
          keyword_ru: string | null
          practical_example: string | null
          related_rules: string[] | null
          rule_summary: string
          search_vector: unknown
          signs: string[] | null
          terms: string[] | null
          topic_number: number | null
          updated_at: string | null
        }
        Insert: {
          common_mistakes?: string[] | null
          created_at?: string | null
          details?: Json | null
          exam_tips?: string[] | null
          id?: string
          keyword: string
          keyword_es?: string | null
          keyword_ru?: string | null
          practical_example?: string | null
          related_rules?: string[] | null
          rule_summary: string
          search_vector?: unknown
          signs?: string[] | null
          terms?: string[] | null
          topic_number?: number | null
          updated_at?: string | null
        }
        Update: {
          common_mistakes?: string[] | null
          created_at?: string | null
          details?: Json | null
          exam_tips?: string[] | null
          id?: string
          keyword?: string
          keyword_es?: string | null
          keyword_ru?: string | null
          practical_example?: string | null
          related_rules?: string[] | null
          rule_summary?: string
          search_vector?: unknown
          signs?: string[] | null
          terms?: string[] | null
          topic_number?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dgt_test_answers: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          session_id: string
          time_spent_seconds: number | null
          user_answer: string | null
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          session_id: string
          time_spent_seconds?: number | null
          user_answer?: string | null
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          session_id?: string
          time_spent_seconds?: number | null
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dgt_test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "dgt_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dgt_test_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "dgt_test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dgt_test_sessions: {
        Row: {
          category: string
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          id: string
          incorrect_answers: number | null
          score_percentage: number | null
          started_at: string
          status: string
          time_spent_seconds: number | null
          total_questions: number
          unanswered: number | null
          user_id: string | null
        }
        Insert: {
          category: string
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          incorrect_answers?: number | null
          score_percentage?: number | null
          started_at?: string
          status?: string
          time_spent_seconds?: number | null
          total_questions: number
          unanswered?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          incorrect_answers?: number | null
          score_percentage?: number | null
          started_at?: string
          status?: string
          time_spent_seconds?: number | null
          total_questions?: number
          unanswered?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dgt_test_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_active_exploits: {
        Row: {
          activated_at: string
          attacker_player_id: string
          created_at: string | null
          duel_id: string
          effect_data: Json
          expires_at: string
          exploit_type: string
          id: string
          is_active: boolean | null
          target_player_id: string
        }
        Insert: {
          activated_at?: string
          attacker_player_id: string
          created_at?: string | null
          duel_id: string
          effect_data?: Json
          expires_at: string
          exploit_type: string
          id?: string
          is_active?: boolean | null
          target_player_id: string
        }
        Update: {
          activated_at?: string
          attacker_player_id?: string
          created_at?: string | null
          duel_id?: string
          effect_data?: Json
          expires_at?: string
          exploit_type?: string
          id?: string
          is_active?: boolean | null
          target_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_active_exploits_attacker_player_id_fkey"
            columns: ["attacker_player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_active_exploits_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_active_exploits_target_player_id_fkey"
            columns: ["target_player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
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
      duel_bet_flags: {
        Row: {
          bet_id: string
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          bet_id: string
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          bet_id?: string
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_bet_flags_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "duel_bets"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_bet_history: {
        Row: {
          bet_id: string
          duel_id: string
          id: string
          insurance_refund_host: number
          insurance_refund_opponent: number
          payout_host: number
          payout_opponent: number
          processed_at: string
          processed_by: string | null
          result: Database["public"]["Enums"]["duel_bet_result"]
          season_sp_host: number
          season_sp_opponent: number
        }
        Insert: {
          bet_id: string
          duel_id: string
          id?: string
          insurance_refund_host?: number
          insurance_refund_opponent?: number
          payout_host?: number
          payout_opponent?: number
          processed_at?: string
          processed_by?: string | null
          result: Database["public"]["Enums"]["duel_bet_result"]
          season_sp_host?: number
          season_sp_opponent?: number
        }
        Update: {
          bet_id?: string
          duel_id?: string
          id?: string
          insurance_refund_host?: number
          insurance_refund_opponent?: number
          payout_host?: number
          payout_opponent?: number
          processed_at?: string
          processed_by?: string | null
          result?: Database["public"]["Enums"]["duel_bet_result"]
          season_sp_host?: number
          season_sp_opponent?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_bet_history_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "duel_bets"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_bets: {
        Row: {
          bet_amount: number
          created_at: string
          currency: string
          duel_id: string
          host_confirmed: boolean
          host_coverage_rate: number
          host_insurance_enabled: boolean
          host_insurance_premium: number
          host_insurance_rate: number
          host_user: string
          id: string
          ip_hash_host: string | null
          ip_hash_opponent: string | null
          max_potential_reward: number | null
          opponent_confirmed: boolean
          opponent_coverage_rate: number
          opponent_insurance_enabled: boolean
          opponent_insurance_premium: number
          opponent_insurance_rate: number
          opponent_user: string
          season_sp_host: number
          season_sp_opponent: number
          status: Database["public"]["Enums"]["duel_bet_status"]
          suspicious_flags: Json
          updated_at: string
        }
        Insert: {
          bet_amount: number
          created_at?: string
          currency?: string
          duel_id: string
          host_confirmed?: boolean
          host_coverage_rate?: number
          host_insurance_enabled?: boolean
          host_insurance_premium?: number
          host_insurance_rate?: number
          host_user: string
          id?: string
          ip_hash_host?: string | null
          ip_hash_opponent?: string | null
          max_potential_reward?: number | null
          opponent_confirmed?: boolean
          opponent_coverage_rate?: number
          opponent_insurance_enabled?: boolean
          opponent_insurance_premium?: number
          opponent_insurance_rate?: number
          opponent_user: string
          season_sp_host?: number
          season_sp_opponent?: number
          status?: Database["public"]["Enums"]["duel_bet_status"]
          suspicious_flags?: Json
          updated_at?: string
        }
        Update: {
          bet_amount?: number
          created_at?: string
          currency?: string
          duel_id?: string
          host_confirmed?: boolean
          host_coverage_rate?: number
          host_insurance_enabled?: boolean
          host_insurance_premium?: number
          host_insurance_rate?: number
          host_user?: string
          id?: string
          ip_hash_host?: string | null
          ip_hash_opponent?: string | null
          max_potential_reward?: number | null
          opponent_confirmed?: boolean
          opponent_coverage_rate?: number
          opponent_insurance_enabled?: boolean
          opponent_insurance_premium?: number
          opponent_insurance_rate?: number
          opponent_user?: string
          season_sp_host?: number
          season_sp_opponent?: number
          status?: Database["public"]["Enums"]["duel_bet_status"]
          suspicious_flags?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_bets_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_bets_host_user_fkey"
            columns: ["host_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_bets_opponent_user_fkey"
            columns: ["opponent_user"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      duel_incidents: {
        Row: {
          created_at: string | null
          duel_id: string
          id: string
          incident_type: string
          metadata: Json | null
          player_id: string | null
          resolved_at: string | null
        }
        Insert: {
          created_at?: string | null
          duel_id: string
          id?: string
          incident_type: string
          metadata?: Json | null
          player_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          created_at?: string | null
          duel_id?: string
          id?: string
          incident_type?: string
          metadata?: Json | null
          player_id?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_incidents_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_incidents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_matchmaking_queue: {
        Row: {
          bet_amount: number
          bet_type: string | null
          categories: Json | null
          created_at: string
          difficulty: string | null
          duel_id: string | null
          expires_at: string
          id: string
          matched: boolean
          num_questions: number
          profile_id: string
        }
        Insert: {
          bet_amount?: number
          bet_type?: string | null
          categories?: Json | null
          created_at?: string
          difficulty?: string | null
          duel_id?: string | null
          expires_at?: string
          id?: string
          matched?: boolean
          num_questions: number
          profile_id: string
        }
        Update: {
          bet_amount?: number
          bet_type?: string | null
          categories?: Json | null
          created_at?: string
          difficulty?: string | null
          duel_id?: string | null
          expires_at?: string
          id?: string
          matched?: boolean
          num_questions?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_matchmaking_queue_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_matchmaking_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      duel_pass_rewards: {
        Row: {
          created_at: string
          free_reward: Json
          level: number
          premium_reward: Json
          xp_required: number
        }
        Insert: {
          created_at?: string
          free_reward: Json
          level: number
          premium_reward: Json
          xp_required: number
        }
        Update: {
          created_at?: string
          free_reward?: Json
          level?: number
          premium_reward?: Json
          xp_required?: number
        }
        Relationships: []
      }
      duel_pass_season_rewards: {
        Row: {
          created_at: string
          free_reward: Json | null
          id: string
          level: number
          premium_reward: Json
          season_id: number
          sp_required: number
        }
        Insert: {
          created_at?: string
          free_reward?: Json | null
          id?: string
          level: number
          premium_reward: Json
          season_id: number
          sp_required: number
        }
        Update: {
          created_at?: string
          free_reward?: Json | null
          id?: string
          level?: number
          premium_reward?: Json
          season_id?: number
          sp_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_pass_season_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "duel_pass_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_pass_seasons: {
        Row: {
          banner_image_url: string | null
          created_at: string
          description_en: string | null
          description_es: string | null
          description_ru: string | null
          end_date: string
          id: number
          is_active: boolean
          name_en: string
          name_es: string
          name_ru: string
          season_number: number
          start_date: string
          theme: string
          updated_at: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          end_date: string
          id?: number
          is_active?: boolean
          name_en: string
          name_es: string
          name_ru: string
          season_number: number
          start_date: string
          theme: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          end_date?: string
          id?: number
          is_active?: boolean
          name_en?: string
          name_es?: string
          name_ru?: string
          season_number?: number
          start_date?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      duel_players: {
        Row: {
          activity_status: string | null
          bot_difficulty: string | null
          bot_name: string | null
          connected: boolean
          correct_count: number
          created_at: string
          disconnect_count: number | null
          duel_id: string
          estimated_latency_ms: number | null
          id: string
          is_bot: boolean
          is_connected: boolean | null
          is_host: boolean
          last_activity_at: string | null
          last_disconnect_at: string | null
          last_heartbeat_at: string | null
          name: string | null
          score: number
          surrendered: boolean | null
          user_id: string | null
        }
        Insert: {
          activity_status?: string | null
          bot_difficulty?: string | null
          bot_name?: string | null
          connected?: boolean
          correct_count?: number
          created_at?: string
          disconnect_count?: number | null
          duel_id: string
          estimated_latency_ms?: number | null
          id?: string
          is_bot?: boolean
          is_connected?: boolean | null
          is_host?: boolean
          last_activity_at?: string | null
          last_disconnect_at?: string | null
          last_heartbeat_at?: string | null
          name?: string | null
          score?: number
          surrendered?: boolean | null
          user_id?: string | null
        }
        Update: {
          activity_status?: string | null
          bot_difficulty?: string | null
          bot_name?: string | null
          connected?: boolean
          correct_count?: number
          created_at?: string
          disconnect_count?: number | null
          duel_id?: string
          estimated_latency_ms?: number | null
          id?: string
          is_bot?: boolean
          is_connected?: boolean | null
          is_host?: boolean
          last_activity_at?: string | null
          last_disconnect_at?: string | null
          last_heartbeat_at?: string | null
          name?: string | null
          score?: number
          surrendered?: boolean | null
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
      duel_transactions: {
        Row: {
          amount: number
          created_at: string
          duel_id: string
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          duel_id: string
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          duel_id?: string
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_transactions_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          bet_amount: number | null
          bet_type: string | null
          categories: Json | null
          code: string
          commission_taken: number | null
          created_at: string
          difficulty: string | null
          expires_at: string
          finished_at: string | null
          host_user: string
          id: string
          is_draw: boolean | null
          is_rematch: boolean | null
          match_summary: Json | null
          num_questions: number
          parent_duel_id: string | null
          question_seed: number
          rematch_pot: number | null
          started_at: string | null
          status: string
          winner_id: string | null
        }
        Insert: {
          bet_amount?: number | null
          bet_type?: string | null
          categories?: Json | null
          code: string
          commission_taken?: number | null
          created_at?: string
          difficulty?: string | null
          expires_at?: string
          finished_at?: string | null
          host_user: string
          id?: string
          is_draw?: boolean | null
          is_rematch?: boolean | null
          match_summary?: Json | null
          num_questions: number
          parent_duel_id?: string | null
          question_seed: number
          rematch_pot?: number | null
          started_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          bet_amount?: number | null
          bet_type?: string | null
          categories?: Json | null
          code?: string
          commission_taken?: number | null
          created_at?: string
          difficulty?: string | null
          expires_at?: string
          finished_at?: string | null
          host_user?: string
          id?: string
          is_draw?: boolean | null
          is_rematch?: boolean | null
          match_summary?: Json | null
          num_questions?: number
          parent_duel_id?: string | null
          question_seed?: number
          rematch_pot?: number | null
          started_at?: string | null
          status?: string
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
            foreignKeyName: "duels_parent_duel_id_fkey"
            columns: ["parent_duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
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
      flashcards: {
        Row: {
          answer_eng: string
          answer_es: string
          answer_ru: string
          created_at: string
          id: string
          question_eng: string
          question_es: string
          question_ru: string
          source_id: string
          topic: number
          updated_at: string
        }
        Insert: {
          answer_eng: string
          answer_es: string
          answer_ru: string
          created_at?: string
          id?: string
          question_eng: string
          question_es: string
          question_ru: string
          source_id: string
          topic: number
          updated_at?: string
        }
        Update: {
          answer_eng?: string
          answer_es?: string
          answer_ru?: string
          created_at?: string
          id?: string
          question_eng?: string
          question_es?: string
          question_ru?: string
          source_id?: string
          topic?: number
          updated_at?: string
        }
        Relationships: []
      }
      fraud_blacklist: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      fraud_check_queue: {
        Row: {
          conversion_id: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          partner_id: string
          processed_at: string | null
          status: string | null
        }
        Insert: {
          conversion_id: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          partner_id: string
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          conversion_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          partner_id?: string
          processed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_check_queue_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: true
            referencedRelation: "partner_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_check_queue_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
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
      help_feedback: {
        Row: {
          admin_reply: string | null
          created_at: string | null
          feedback_text: string | null
          helpful: boolean
          id: string
          profile_id: string | null
          replied_at: string | null
          replied_by: string | null
          section_id: string
          subsection_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string | null
          feedback_text?: string | null
          helpful: boolean
          id?: string
          profile_id?: string | null
          replied_at?: string | null
          replied_by?: string | null
          section_id: string
          subsection_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          created_at?: string | null
          feedback_text?: string | null
          helpful?: boolean
          id?: string
          profile_id?: string | null
          replied_at?: string | null
          replied_by?: string | null
          section_id?: string
          subsection_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          source_id: string | null
          term_es: string
          term_ru: string
          topic_id: string | null
          updated_at: string
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
          source_id?: string | null
          term_es: string
          term_ru: string
          topic_id?: string | null
          updated_at?: string
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
          source_id?: string | null
          term_es?: string
          term_ru?: string
          topic_id?: string | null
          updated_at?: string
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
      leaderboard_season_rewards: {
        Row: {
          created_at: string | null
          description_es: string | null
          description_ru: string | null
          id: string
          is_exclusive: boolean | null
          position: number
          reward_data: Json
          reward_type: string
          season_id: number
        }
        Insert: {
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          id?: string
          is_exclusive?: boolean | null
          position: number
          reward_data: Json
          reward_type: string
          season_id: number
        }
        Update: {
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          id?: string
          is_exclusive?: boolean | null
          position?: number
          reward_data?: Json
          reward_type?: string
          season_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_season_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "duel_pass_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_materials: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          name: string
          tags: string[] | null
          type: string
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tags?: string[] | null
          type: string
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tags?: string[] | null
          type?: string
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "material_versions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          content: Json | null
          content_en: string | null
          content_es: string | null
          content_ru: string | null
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
          content_en?: string | null
          content_es?: string | null
          content_ru?: string | null
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
          content_en?: string | null
          content_es?: string | null
          content_ru?: string | null
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
          {
            foreignKeyName: "materials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          category: string | null
          clicked: boolean | null
          clicked_at: string | null
          delivery_status: string | null
          id: string
          message: string
          metadata: Json | null
          sent_at: string | null
          telegram_chat_id: number | null
          telegram_message_id: number | null
          template_id: string | null
          title: string
          type: string | null
          user_id: string
          was_ai_enhanced: boolean | null
        }
        Insert: {
          category?: string | null
          clicked?: boolean | null
          clicked_at?: string | null
          delivery_status?: string | null
          id?: string
          message: string
          metadata?: Json | null
          sent_at?: string | null
          telegram_chat_id?: number | null
          telegram_message_id?: number | null
          template_id?: string | null
          title: string
          type?: string | null
          user_id: string
          was_ai_enhanced?: boolean | null
        }
        Update: {
          category?: string | null
          clicked?: boolean | null
          clicked_at?: string | null
          delivery_status?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          sent_at?: string | null
          telegram_chat_id?: number | null
          telegram_message_id?: number | null
          template_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
          was_ai_enhanced?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          category: string
          cooldown_hours: number
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          max_per_day: number
          priority: number
          rule_name: string
          template_type: string
          updated_at: string
          user_state_filter: Json | null
        }
        Insert: {
          category: string
          cooldown_hours?: number
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          max_per_day?: number
          priority?: number
          rule_name: string
          template_type: string
          updated_at?: string
          user_state_filter?: Json | null
        }
        Update: {
          category?: string
          cooldown_hours?: number
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          max_per_day?: number
          priority?: number
          rule_name?: string
          template_type?: string
          updated_at?: string
          user_state_filter?: Json | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          ai_enhance: boolean | null
          category: string
          cooldown_hours: number | null
          created_at: string | null
          cta_deeplink: string | null
          cta_text: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          message_template: string
          priority: number | null
          title_template: string
          trigger_condition: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          ai_enhance?: boolean | null
          category: string
          cooldown_hours?: number | null
          created_at?: string | null
          cta_deeplink?: string | null
          cta_text?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          message_template: string
          priority?: number | null
          title_template: string
          trigger_condition?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          ai_enhance?: boolean | null
          category?: string
          cooldown_hours?: number | null
          created_at?: string | null
          cta_deeplink?: string | null
          cta_text?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          priority?: number | null
          title_template?: string
          trigger_condition?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      offline_sync_log: {
        Row: {
          action_type: string
          actions_count: number
          errors: Json | null
          failed_count: number
          id: string
          profile_id: string
          success_count: number
          synced_at: string
        }
        Insert: {
          action_type: string
          actions_count: number
          errors?: Json | null
          failed_count: number
          id?: string
          profile_id: string
          success_count: number
          synced_at?: string
        }
        Update: {
          action_type?: string
          actions_count?: number
          errors?: Json | null
          failed_count?: number
          id?: string
          profile_id?: string
          success_count?: number
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_sync_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commission_releases: {
        Row: {
          amount: number
          conversion_id: string
          id: string
          partner_id: string
          released_at: string
        }
        Insert: {
          amount: number
          conversion_id: string
          id?: string
          partner_id: string
          released_at?: string
        }
        Update: {
          amount?: number
          conversion_id?: string
          id?: string
          partner_id?: string
          released_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commission_releases_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: true
            referencedRelation: "partner_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commission_releases_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_conversions: {
        Row: {
          browser: string | null
          click_timestamp: string | null
          commission_amount: number | null
          commission_rate: number | null
          country_code: string | null
          created_at: string
          device_id: string | null
          device_type: string | null
          event_type: string
          fingerprint_hash: string | null
          id: string
          ip_address: unknown
          landing_page: string | null
          os: string | null
          partner_code: string
          partner_id: string
          purchase_amount: number | null
          purchase_id: string | null
          referrer_url: string | null
          session_id: string | null
          time_to_register_seconds: number | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          browser?: string | null
          click_timestamp?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          country_code?: string | null
          created_at?: string
          device_id?: string | null
          device_type?: string | null
          event_type: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          os?: string | null
          partner_code: string
          partner_id: string
          purchase_amount?: number | null
          purchase_id?: string | null
          referrer_url?: string | null
          session_id?: string | null
          time_to_register_seconds?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          browser?: string | null
          click_timestamp?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          country_code?: string | null
          created_at?: string
          device_id?: string | null
          device_type?: string | null
          event_type?: string
          fingerprint_hash?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          os?: string | null
          partner_code?: string
          partner_id?: string
          purchase_amount?: number | null
          purchase_id?: string | null
          referrer_url?: string | null
          session_id?: string | null
          time_to_register_seconds?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_conversions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_conversions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_conversions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_conversions_archive: {
        Row: {
          browser: string | null
          commission_amount: number | null
          commission_rate: number | null
          country_code: string | null
          created_at: string
          device_id: string | null
          device_type: string | null
          event_type: string
          id: string
          ip_address: unknown
          landing_page: string | null
          os: string | null
          partner_code: string
          partner_id: string
          purchase_amount: number | null
          purchase_id: string | null
          referrer_url: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          browser?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          country_code?: string | null
          created_at?: string
          device_id?: string | null
          device_type?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          os?: string | null
          partner_code: string
          partner_id: string
          purchase_amount?: number | null
          purchase_id?: string | null
          referrer_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          browser?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          country_code?: string | null
          created_at?: string
          device_id?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          os?: string | null
          partner_code?: string
          partner_id?: string
          purchase_amount?: number | null
          purchase_id?: string | null
          referrer_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      partner_fraud_alerts: {
        Row: {
          action_taken: string | null
          alert_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          partner_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          alert_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          partner_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          partner_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_fraud_alerts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_link_activations: {
        Row: {
          activated_at: string
          created_at: string
          id: string
          ip_address: unknown
          partner_code: string
          partner_id: string
          premium_until: string
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          activated_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          partner_code: string
          partner_id: string
          premium_until: string
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          activated_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          partner_code?: string
          partner_id?: string
          premium_until?: string
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_link_activations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_link_activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_links: {
        Row: {
          clicks_count: number | null
          created_at: string
          destination: string
          destination_params: Json | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_click_at: string | null
          link_code: string
          partner_id: string
          purchases_count: number | null
          registrations_count: number | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          clicks_count?: number | null
          created_at?: string
          destination: string
          destination_params?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_click_at?: string | null
          link_code: string
          partner_id: string
          purchases_count?: number | null
          registrations_count?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          clicks_count?: number | null
          created_at?: string
          destination?: string
          destination_params?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_click_at?: string | null
          link_code?: string
          partner_id?: string
          purchases_count?: number | null
          registrations_count?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_materials_access: {
        Row: {
          accessed_at: string
          download_count: number | null
          id: string
          material_id: string
          partner_id: string
        }
        Insert: {
          accessed_at?: string
          download_count?: number | null
          id?: string
          material_id: string
          partner_id: string
        }
        Update: {
          accessed_at?: string
          download_count?: number | null
          id?: string
          material_id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_materials_access_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "marketing_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_materials_access_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          admin_notes: string | null
          admin_user_id: string | null
          amount: number
          completed_at: string | null
          created_at: string
          currency: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          partner_id: string
          payout_details: Json
          payout_method: string
          processed_at: string | null
          rejection_reason: string | null
          requested_at: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_user_id?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          partner_id: string
          payout_details: Json
          payout_method: string
          processed_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_user_id?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          partner_id?: string
          payout_details?: Json
          payout_method?: string
          processed_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          discount_amount: number | null
          id: string
          paid_at: string | null
          partner_id: string
          promo_code: string | null
          purchase_amount: number | null
          purchase_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          paid_at?: string | null
          partner_id: string
          promo_code?: string | null
          purchase_amount?: number | null
          purchase_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          paid_at?: string | null
          partner_id?: string
          promo_code?: string | null
          purchase_amount?: number | null
          purchase_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_stats_daily: {
        Row: {
          clicks: number | null
          commission: number | null
          created_at: string | null
          date: string
          installs: number | null
          partner_id: string
          purchases: number | null
          registrations: number | null
          revenue: number | null
          unique_sessions: number | null
          unique_users: number | null
          updated_at: string | null
        }
        Insert: {
          clicks?: number | null
          commission?: number | null
          created_at?: string | null
          date: string
          installs?: number | null
          partner_id: string
          purchases?: number | null
          registrations?: number | null
          revenue?: number | null
          unique_sessions?: number | null
          unique_users?: number | null
          updated_at?: string | null
        }
        Update: {
          clicks?: number | null
          commission?: number | null
          created_at?: string | null
          date?: string
          installs?: number | null
          partner_id?: string
          purchases?: number | null
          registrations?: number | null
          revenue?: number | null
          unique_sessions?: number | null
          unique_users?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_stats_daily_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          accumulated_commission: number | null
          balance_available: number | null
          balance_hold: number | null
          balance_paid: number | null
          channel_name: string | null
          channel_url: string | null
          commission_rate: number | null
          created_at: string
          daily_activation_limit: number | null
          description: string | null
          discount_percent: number | null
          email: string | null
          hold_period_days: number | null
          id: string
          instructor_mode_enabled: boolean | null
          is_partner_premium: boolean | null
          min_payout_amount: number | null
          monthly_activation_limit: number | null
          name: string
          notes: string | null
          partner_code: string | null
          partner_premium_activated_at: string | null
          partner_premium_notes: string | null
          partner_type: string
          promo_code: string | null
          promo_code_commission: number | null
          promo_code_discount: number | null
          registration_status: string | null
          social_links: Json | null
          status: string
          subscribers_count: number | null
          total_keys_activated: number | null
          total_keys_issued: number | null
          total_link_activations: number | null
          total_referrals: number | null
          updated_at: string
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          accumulated_commission?: number | null
          balance_available?: number | null
          balance_hold?: number | null
          balance_paid?: number | null
          channel_name?: string | null
          channel_url?: string | null
          commission_rate?: number | null
          created_at?: string
          daily_activation_limit?: number | null
          description?: string | null
          discount_percent?: number | null
          email?: string | null
          hold_period_days?: number | null
          id?: string
          instructor_mode_enabled?: boolean | null
          is_partner_premium?: boolean | null
          min_payout_amount?: number | null
          monthly_activation_limit?: number | null
          name: string
          notes?: string | null
          partner_code?: string | null
          partner_premium_activated_at?: string | null
          partner_premium_notes?: string | null
          partner_type: string
          promo_code?: string | null
          promo_code_commission?: number | null
          promo_code_discount?: number | null
          registration_status?: string | null
          social_links?: Json | null
          status?: string
          subscribers_count?: number | null
          total_keys_activated?: number | null
          total_keys_issued?: number | null
          total_link_activations?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          accumulated_commission?: number | null
          balance_available?: number | null
          balance_hold?: number | null
          balance_paid?: number | null
          channel_name?: string | null
          channel_url?: string | null
          commission_rate?: number | null
          created_at?: string
          daily_activation_limit?: number | null
          description?: string | null
          discount_percent?: number | null
          email?: string | null
          hold_period_days?: number | null
          id?: string
          instructor_mode_enabled?: boolean | null
          is_partner_premium?: boolean | null
          min_payout_amount?: number | null
          monthly_activation_limit?: number | null
          name?: string
          notes?: string | null
          partner_code?: string | null
          partner_premium_activated_at?: string | null
          partner_premium_notes?: string | null
          partner_type?: string
          promo_code?: string | null
          promo_code_commission?: number | null
          promo_code_discount?: number | null
          registration_status?: string | null
          social_links?: Json | null
          status?: string
          subscribers_count?: number | null
          total_keys_activated?: number | null
          total_keys_issued?: number | null
          total_link_activations?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      passkey_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      password_change_history: {
        Row: {
          changed_at: string
          created_at: string
          device_fingerprint: string | null
          id: string
          ip_address: unknown
          user_id: string
        }
        Insert: {
          changed_at?: string
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: unknown
          user_id: string
        }
        Update: {
          changed_at?: string
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_change_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdd_russia_answers: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          id?: string
          is_correct?: boolean
          position: number
          question_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdd_russia_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pdd_russia_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdd_russia_penalties: {
        Row: {
          article_part: string
          created_at: string
          id: string
          is_criminal: boolean | null
          penalty: string
          text: string
          updated_at: string
        }
        Insert: {
          article_part: string
          created_at?: string
          id?: string
          is_criminal?: boolean | null
          penalty: string
          text: string
          updated_at?: string
        }
        Update: {
          article_part?: string
          created_at?: string
          id?: string
          is_criminal?: boolean | null
          penalty?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      pdd_russia_questions: {
        Row: {
          correct_answer_text: string | null
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          is_premium: boolean | null
          question_number: number | null
          question_text: string
          source_id: string | null
          ticket_category: string | null
          ticket_number: number | null
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          correct_answer_text?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          question_number?: number | null
          question_text: string
          source_id?: string | null
          ticket_category?: string | null
          ticket_number?: number | null
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          correct_answer_text?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          question_number?: number | null
          question_text?: string
          source_id?: string | null
          ticket_category?: string | null
          ticket_number?: number | null
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      pdd_russia_signs: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          number: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          number: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          number?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      premium_keys: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string
          key: string
          partner_id: string | null
          revoked_at: string | null
          revoked_reason: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          key: string
          partner_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          key?: string
          partner_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_keys_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_packages: {
        Row: {
          boost_type: string | null
          coins_amount: number | null
          created_at: string | null
          description_ru: string | null
          duel_pass_season_id: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          package_key: string
          package_type: string
          premium_days: number | null
          price_coins: number
          price_stars: number | null
          title_ru: string
          updated_at: string | null
        }
        Insert: {
          boost_type?: string | null
          coins_amount?: number | null
          created_at?: string | null
          description_ru?: string | null
          duel_pass_season_id?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          package_key: string
          package_type: string
          premium_days?: number | null
          price_coins: number
          price_stars?: number | null
          title_ru: string
          updated_at?: string | null
        }
        Update: {
          boost_type?: string | null
          coins_amount?: number | null
          created_at?: string | null
          description_ru?: string | null
          duel_pass_season_id?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          package_key?: string
          package_type?: string
          premium_days?: number | null
          price_coins?: number
          price_stars?: number | null
          title_ru?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assistant_last_interaction: string
          assistant_mood: string
          boosts: number | null
          clerk_id: string | null
          coins: number
          created_at: string | null
          duel_pass_level: number
          duel_pass_premium: boolean
          duel_pass_season: number
          duel_pass_xp: number
          equipped_avatar: string
          first_name: string
          id: string
          instructor_mode: boolean | null
          is_premium: boolean | null
          language_code: string | null
          last_activity_date: string | null
          last_login: string | null
          last_name: string | null
          last_seen: string | null
          partner_premium_active: boolean | null
          photo_url: string | null
          platform: string | null
          preferred_country: string | null
          preferred_license_category: string | null
          premium_forever_purchased_at: string | null
          premium_until: string | null
          ram_slots_unlocked: number | null
          rank: string
          referral_code: string | null
          referral_reward_claimed: boolean | null
          referred_by: string | null
          settings: Json | null
          streak_days: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_type: string | null
          telegram_id: number | null
          total_referrals: number | null
          trial_until: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          win_streak: number
          xp: number
        }
        Insert: {
          assistant_last_interaction?: string
          assistant_mood?: string
          boosts?: number | null
          clerk_id?: string | null
          coins?: number
          created_at?: string | null
          duel_pass_level?: number
          duel_pass_premium?: boolean
          duel_pass_season?: number
          duel_pass_xp?: number
          equipped_avatar?: string
          first_name: string
          id?: string
          instructor_mode?: boolean | null
          is_premium?: boolean | null
          language_code?: string | null
          last_activity_date?: string | null
          last_login?: string | null
          last_name?: string | null
          last_seen?: string | null
          partner_premium_active?: boolean | null
          photo_url?: string | null
          platform?: string | null
          preferred_country?: string | null
          preferred_license_category?: string | null
          premium_forever_purchased_at?: string | null
          premium_until?: string | null
          ram_slots_unlocked?: number | null
          rank?: string
          referral_code?: string | null
          referral_reward_claimed?: boolean | null
          referred_by?: string | null
          settings?: Json | null
          streak_days?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          telegram_id?: number | null
          total_referrals?: number | null
          trial_until?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          win_streak?: number
          xp?: number
        }
        Update: {
          assistant_last_interaction?: string
          assistant_mood?: string
          boosts?: number | null
          clerk_id?: string | null
          coins?: number
          created_at?: string | null
          duel_pass_level?: number
          duel_pass_premium?: boolean
          duel_pass_season?: number
          duel_pass_xp?: number
          equipped_avatar?: string
          first_name?: string
          id?: string
          instructor_mode?: boolean | null
          is_premium?: boolean | null
          language_code?: string | null
          last_activity_date?: string | null
          last_login?: string | null
          last_name?: string | null
          last_seen?: string | null
          partner_premium_active?: boolean | null
          photo_url?: string | null
          platform?: string | null
          preferred_country?: string | null
          preferred_license_category?: string | null
          premium_forever_purchased_at?: string | null
          premium_until?: string | null
          ram_slots_unlocked?: number | null
          rank?: string
          referral_code?: string | null
          referral_reward_claimed?: boolean | null
          referred_by?: string | null
          settings?: Json | null
          streak_days?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          telegram_id?: number | null
          total_referrals?: number | null
          trial_until?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          win_streak?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          completed_at: string | null
          created_at: string
          cryptomus_order_id: string | null
          cryptomus_payment_id: string | null
          currency: string
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          paddle_subscription_id: string | null
          paddle_transaction_id: string | null
          partner_code: string | null
          price: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cryptomus_order_id?: string | null
          cryptomus_payment_id?: string | null
          currency?: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          paddle_subscription_id?: string | null
          paddle_transaction_id?: string | null
          partner_code?: string | null
          price: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cryptomus_order_id?: string | null
          cryptomus_payment_id?: string | null
          currency?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          paddle_subscription_id?: string | null
          paddle_transaction_id?: string | null
          partner_code?: string | null
          price?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          admin_id: string | null
          admin_response: string | null
          created_at: string
          description: string
          id: string
          question_id: string
          report_type: Database["public"]["Enums"]["report_type"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_response?: string | null
          created_at?: string
          description: string
          id?: string
          question_id: string
          report_type?: Database["public"]["Enums"]["report_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_response?: string | null
          created_at?: string
          description?: string
          id?: string
          question_id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      questions_new: {
        Row: {
          country: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation_en: string | null
          explanation_es: string | null
          explanation_ru: string | null
          id: string
          image_url: string | null
          is_premium: boolean
          metadata: Json
          notes: string | null
          percent_correct: number | null
          question_en: string | null
          question_es: string | null
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
          country?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation_en?: string | null
          explanation_es?: string | null
          explanation_ru?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          metadata?: Json
          notes?: string | null
          percent_correct?: number | null
          question_en?: string | null
          question_es?: string | null
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
          country?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation_en?: string | null
          explanation_es?: string | null
          explanation_ru?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          metadata?: Json
          notes?: string | null
          percent_correct?: number | null
          question_en?: string | null
          question_es?: string | null
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
      race_attempts: {
        Row: {
          attempt_id: string
          chosen_bool: boolean
          client_ts: string | null
          combo_count: number
          created_at: string
          id: string
          is_correct: boolean
          is_suspect: boolean
          points_awarded: number
          question_id: string
          server_ts: string
          session_id: string
          time_delta_ms: number
          time_taken_ms: number
        }
        Insert: {
          attempt_id: string
          chosen_bool: boolean
          client_ts?: string | null
          combo_count?: number
          created_at?: string
          id?: string
          is_correct: boolean
          is_suspect?: boolean
          points_awarded?: number
          question_id: string
          server_ts?: string
          session_id: string
          time_delta_ms: number
          time_taken_ms: number
        }
        Update: {
          attempt_id?: string
          chosen_bool?: boolean
          client_ts?: string | null
          combo_count?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          is_suspect?: boolean
          points_awarded?: number
          question_id?: string
          server_ts?: string
          session_id?: string
          time_delta_ms?: number
          time_taken_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "race_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "race_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      race_questions: {
        Row: {
          created_at: string
          id: string
          is_correct_translation: boolean
          question_id: string
          sent_ts: string
          session_id: string
          term_id: string | null
          translation_shown: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct_translation: boolean
          question_id: string
          sent_ts?: string
          session_id: string
          term_id?: string | null
          translation_shown: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct_translation?: boolean
          question_id?: string
          sent_ts?: string
          session_id?: string
          term_id?: string | null
          translation_shown?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "race_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_questions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "language_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      race_results: {
        Row: {
          accuracy_percentage: number | null
          coins_awarded: number
          correct_count: number
          created_at: string
          finished_at: string
          id: string
          incorrect_count: number
          max_combo: number
          reason: string | null
          session_id: string
          total_answered: number
          total_points: number
          user_id: string | null
          xp_awarded: number
        }
        Insert: {
          accuracy_percentage?: number | null
          coins_awarded?: number
          correct_count?: number
          created_at?: string
          finished_at?: string
          id?: string
          incorrect_count?: number
          max_combo?: number
          reason?: string | null
          session_id: string
          total_answered?: number
          total_points?: number
          user_id?: string | null
          xp_awarded?: number
        }
        Update: {
          accuracy_percentage?: number | null
          coins_awarded?: number
          correct_count?: number
          created_at?: string
          finished_at?: string
          id?: string
          incorrect_count?: number
          max_combo?: number
          reason?: string | null
          session_id?: string
          total_answered?: number
          total_points?: number
          user_id?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "race_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "race_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      race_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          difficulty: string | null
          end_time_ms: number | null
          end_ts: string | null
          final_points: number
          id: string
          ip_address: string | null
          session_id: string
          start_time_ms: number
          start_ts: string
          status: string
          topic_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          difficulty?: string | null
          end_time_ms?: number | null
          end_ts?: string | null
          final_points?: number
          id?: string
          ip_address?: string | null
          session_id: string
          start_time_ms?: number
          start_ts?: string
          status?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          difficulty?: string | null
          end_time_ms?: number | null
          end_ts?: string | null
          final_points?: number
          id?: string
          ip_address?: string | null
          session_id?: string
          start_time_ms?: number
          start_ts?: string
          status?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_rewards: {
        Row: {
          created_at: string | null
          description_es: string | null
          description_ru: string | null
          free_reward: Json | null
          max_level: number | null
          min_level: number
          name_es: string
          name_ru: string
          premium_reward: Json | null
          rank: string
          title_es: string | null
          title_ru: string | null
        }
        Insert: {
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          free_reward?: Json | null
          max_level?: number | null
          min_level: number
          name_es: string
          name_ru: string
          premium_reward?: Json | null
          rank: string
          title_es?: string | null
          title_ru?: string | null
        }
        Update: {
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          free_reward?: Json | null
          max_level?: number | null
          min_level?: number
          name_es?: string
          name_ru?: string
          premium_reward?: Json | null
          rank?: string
          title_es?: string | null
          title_ru?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_bonus: number | null
          referred_bonus: number | null
          referred_earned_50: boolean | null
          referred_id: string
          referrer_id: string
          reward_given: boolean | null
          reward_given_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_bonus?: number | null
          referred_bonus?: number | null
          referred_earned_50?: boolean | null
          referred_id: string
          referrer_id: string
          reward_given?: boolean | null
          reward_given_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_bonus?: number | null
          referred_bonus?: number | null
          referred_earned_50?: boolean | null
          referred_id?: string
          referrer_id?: string
          reward_given?: boolean | null
          reward_given_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_config: {
        Row: {
          effective_from: string | null
          id: number
          is_active: boolean | null
          key: string
          revision: number | null
          season_id: number | null
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          effective_from?: string | null
          id?: number
          is_active?: boolean | null
          key: string
          revision?: number | null
          season_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          effective_from?: string | null
          id?: number
          is_active?: boolean | null
          key?: string
          revision?: number | null
          season_id?: number | null
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reward_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_config_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          config_id: number | null
          id: number
          value: Json
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          config_id?: number | null
          id?: number
          value: Json
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          config_id?: number | null
          id?: number
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reward_config_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_config_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "reward_config"
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
          source_id: string | null
          updated_at: string
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
          source_id?: string | null
          updated_at?: string
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
          source_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      season_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          description_en: string | null
          description_es: string | null
          description_ru: string | null
          end_date: string | null
          id: string
          is_active: boolean
          reward_coins: number
          reward_sp: number
          season_id: number
          start_date: string | null
          target_type: string
          target_value: number
          title_en: string | null
          title_es: string | null
          title_ru: string
          updated_at: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          reward_coins?: number
          reward_sp?: number
          season_id: number
          start_date?: string | null
          target_type: string
          target_value: number
          title_en?: string | null
          title_es?: string | null
          title_ru: string
          updated_at?: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          reward_coins?: number
          reward_sp?: number
          season_id?: number
          start_date?: string | null
          target_type?: string
          target_value?: number
          title_en?: string | null
          title_es?: string | null
          title_ru?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_challenges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "duel_pass_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_definitions: {
        Row: {
          category: string | null
          created_at: string | null
          description_es: string | null
          description_ru: string | null
          id: string
          is_animated: boolean | null
          is_premium: boolean | null
          metadata: Json | null
          name_es: string
          name_ru: string
          preview_url: string | null
          rarity: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          id: string
          is_animated?: boolean | null
          is_premium?: boolean | null
          metadata?: Json | null
          name_es: string
          name_ru: string
          preview_url?: string | null
          rarity: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          id?: string
          is_animated?: boolean | null
          is_premium?: boolean | null
          metadata?: Json | null
          name_es?: string
          name_ru?: string
          preview_url?: string | null
          rarity?: string
        }
        Relationships: []
      }
      stars_payments: {
        Row: {
          coins_equivalent: number
          completed_at: string | null
          created_at: string | null
          id: string
          invoice_payload: string
          metadata: Json | null
          package_id: string | null
          retry_count: number | null
          rewards_completed_at: string | null
          rewards_errors: Json | null
          rewards_status: string | null
          stars_amount: number
          status: string
          telegram_payment_charge_id: string | null
          telegram_user_id: number
          user_id: string
        }
        Insert: {
          coins_equivalent: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invoice_payload: string
          metadata?: Json | null
          package_id?: string | null
          retry_count?: number | null
          rewards_completed_at?: string | null
          rewards_errors?: Json | null
          rewards_status?: string | null
          stars_amount: number
          status?: string
          telegram_payment_charge_id?: string | null
          telegram_user_id: number
          user_id: string
        }
        Update: {
          coins_equivalent?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invoice_payload?: string
          metadata?: Json | null
          package_id?: string | null
          retry_count?: number | null
          rewards_completed_at?: string | null
          rewards_errors?: Json | null
          rewards_status?: string | null
          stars_amount?: number
          status?: string
          telegram_payment_charge_id?: string | null
          telegram_user_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stars_payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "pricing_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stars_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_definitions: {
        Row: {
          category: string | null
          created_at: string | null
          description_es: string | null
          description_ru: string | null
          id: string
          image_url: string | null
          is_animated: boolean | null
          is_premium: boolean | null
          metadata: Json | null
          name_es: string
          name_ru: string
          rarity: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          id: string
          image_url?: string | null
          is_animated?: boolean | null
          is_premium?: boolean | null
          metadata?: Json | null
          name_es: string
          name_ru: string
          rarity: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description_es?: string | null
          description_ru?: string | null
          id?: string
          image_url?: string | null
          is_animated?: boolean | null
          is_premium?: boolean | null
          metadata?: Json | null
          name_es?: string
          name_ru?: string
          rarity?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          stripe_event_id?: string
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
      telegram_chat_members: {
        Row: {
          chat_id: number
          chat_title: string | null
          chat_type: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          last_seen_at: string | null
          metadata: Json | null
          telegram_id: number
          user_id: string
        }
        Insert: {
          chat_id: number
          chat_title?: string | null
          chat_type: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          telegram_id: number
          user_id: string
        }
        Update: {
          chat_id?: number
          chat_title?: string | null
          chat_type?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          telegram_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_history: {
        Row: {
          action: string
          created_at: string
          id: number
          metadata: Json | null
          profile_id: string
          telegram_id: number | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          metadata?: Json | null
          profile_id: string
          telegram_id?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          metadata?: Json | null
          profile_id?: string
          telegram_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_tokens: {
        Row: {
          created_at: string
          expires_at: string
          metadata: Json | null
          profile_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          metadata?: Json | null
          profile_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          metadata?: Json | null
          profile_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          abuse_penalty: number | null
          base_coins_calculated: number | null
          base_sp_calculated: number | null
          coins_awarded: number
          correct_count: number
          created_at: string
          diminishing_factor: number | null
          double_sp_used: boolean | null
          id: string
          premium_used: boolean | null
          questions_count: number
          questions_multiplier: number | null
          score: number
          session_id: string
          sp_awarded: number
          test_duration_seconds: number
          test_id: string | null
          user_id: string
        }
        Insert: {
          abuse_penalty?: number | null
          base_coins_calculated?: number | null
          base_sp_calculated?: number | null
          coins_awarded?: number
          correct_count: number
          created_at?: string
          diminishing_factor?: number | null
          double_sp_used?: boolean | null
          id?: string
          premium_used?: boolean | null
          questions_count: number
          questions_multiplier?: number | null
          score: number
          session_id: string
          sp_awarded?: number
          test_duration_seconds: number
          test_id?: string | null
          user_id: string
        }
        Update: {
          abuse_penalty?: number | null
          base_coins_calculated?: number | null
          base_sp_calculated?: number | null
          coins_awarded?: number
          correct_count?: number
          created_at?: string
          diminishing_factor?: number | null
          double_sp_used?: boolean | null
          id?: string
          premium_used?: boolean | null
          questions_count?: number
          questions_multiplier?: number | null
          score?: number
          session_id?: string
          sp_awarded?: number
          test_duration_seconds?: number
          test_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          mode: string
          questions_count: number
          session_id: string
          started_at: string
          status: string
          test_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          mode: string
          questions_count: number
          session_id: string
          started_at?: string
          status?: string
          test_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          mode?: string
          questions_count?: number
          session_id?: string
          started_at?: string
          status?: string
          test_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          description_en: string | null
          description_es: string | null
          description_ru: string | null
          id: string
          is_unlocked_by_default: boolean
          min_pass_percent: number
          order_index: number
          questions_count: number
          required_test_id: string | null
          source_id_end: number
          source_id_prefix: string
          source_id_start: number
          test_number: number
          title_en: string
          title_es: string
          title_ru: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          id?: string
          is_unlocked_by_default?: boolean
          min_pass_percent?: number
          order_index: number
          questions_count?: number
          required_test_id?: string | null
          source_id_end: number
          source_id_prefix: string
          source_id_start: number
          test_number: number
          title_en: string
          title_es: string
          title_ru: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          description_ru?: string | null
          id?: string
          is_unlocked_by_default?: boolean
          min_pass_percent?: number
          order_index?: number
          questions_count?: number
          required_test_id?: string | null
          source_id_end?: number
          source_id_prefix?: string
          source_id_start?: number
          test_number?: number
          title_en?: string
          title_es?: string
          title_ru?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_required_test_id_fkey"
            columns: ["required_test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
      transactions: {
        Row: {
          amount: number
          client_action_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          client_action_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          client_action_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          display_order: number | null
          id: string
          is_displayed: boolean | null
          obtained_at: string | null
          obtained_from: string | null
          obtained_metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_id: string
          display_order?: number | null
          id?: string
          is_displayed?: boolean | null
          obtained_at?: string | null
          obtained_from?: string | null
          obtained_metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_id?: string
          display_order?: number | null
          id?: string
          is_displayed?: boolean | null
          obtained_at?: string | null
          obtained_from?: string | null
          obtained_metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          reward_claimed: boolean
          reward_claimed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          reward_claimed?: boolean
          reward_claimed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          reward_claimed?: boolean
          reward_claimed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "season_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_questions: {
        Row: {
          created_at: string | null
          id: string
          last_reviewed_at: string | null
          last_wrong_at: string | null
          mastered: boolean | null
          question_id: string
          times_reviewed: number | null
          times_wrong: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_reviewed_at?: string | null
          last_wrong_at?: string | null
          mastered?: boolean | null
          question_id: string
          times_reviewed?: number | null
          times_wrong?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_reviewed_at?: string | null
          last_wrong_at?: string | null
          mastered?: boolean | null
          question_id?: string
          times_reviewed?: number | null
          times_wrong?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_claimed_rewards: {
        Row: {
          claimed_at: string
          id: string
          is_premium: boolean
          level: number
          season: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          is_premium?: boolean
          level: number
          season?: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          is_premium?: boolean
          level?: number
          season?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_claimed_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_bonus: {
        Row: {
          created_at: string | null
          current_streak: number
          freeze_available: number | null
          id: string
          last_claimed_date: string | null
          streak_multiplier: number | null
          streak_restore_available: boolean | null
          total_claims: number
          total_restores: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          freeze_available?: number | null
          id?: string
          last_claimed_date?: string | null
          streak_multiplier?: number | null
          streak_restore_available?: boolean | null
          total_claims?: number
          total_restores?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          freeze_available?: number | null
          id?: string
          last_claimed_date?: string | null
          streak_multiplier?: number | null
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
      user_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string | null
          first_seen_at: string
          id: string
          ip_address: unknown
          is_trusted: boolean
          last_seen_at: string
          platform: string | null
          user_agent: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: unknown
          is_trusted?: boolean
          last_seen_at?: string
          platform?: string | null
          user_agent?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: unknown
          is_trusted?: boolean
          last_seen_at?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_flashcard_progress: {
        Row: {
          created_at: string
          ease_factor: number | null
          flashcard_id: string
          id: string
          interval_days: number | null
          last_position: number | null
          last_rating: number | null
          last_reviewed_at: string | null
          next_review_at: string | null
          repetitions: number | null
          status: string | null
          topic: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number | null
          flashcard_id: string
          id?: string
          interval_days?: number | null
          last_position?: number | null
          last_rating?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          status?: string | null
          topic: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ease_factor?: number | null
          flashcard_id?: string
          id?: string
          interval_days?: number | null
          last_position?: number | null
          last_rating?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          status?: string | null
          topic?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcard_progress_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_flashcard_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          created_at: string | null
          id: string
          item_type: string
          metadata: Json | null
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_type: string
          metadata?: Json | null
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_type?: string
          metadata?: Json | null
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_leaderboard_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          final_duel_pass_level: number
          final_duel_pass_xp: number
          final_position: number
          id: string
          rewards_claimed: Json | null
          season_id: number
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          final_duel_pass_level: number
          final_duel_pass_xp: number
          final_position: number
          id?: string
          rewards_claimed?: Json | null
          season_id: number
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          final_duel_pass_level?: number
          final_duel_pass_xp?: number
          final_position?: number
          id?: string
          rewards_claimed?: Json | null
          season_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_leaderboard_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "duel_pass_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_leaderboard_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_limits: {
        Row: {
          ai_debrief_count: number | null
          created_at: string | null
          last_reset_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_debrief_count?: number | null
          created_at?: string | null
          last_reset_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_debrief_count?: number | null
          created_at?: string | null
          last_reset_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_loadouts: {
        Row: {
          id: string
          slot_1_boost_type: string | null
          slot_2_boost_type: string | null
          slot_3_boost_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          slot_1_boost_type?: string | null
          slot_2_boost_type?: string | null
          slot_3_boost_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          slot_1_boost_type?: string | null
          slot_2_boost_type?: string | null
          slot_3_boost_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_loadouts_slot_1_boost_type_fkey"
            columns: ["slot_1_boost_type"]
            isOneToOne: false
            referencedRelation: "boost_definitions"
            referencedColumns: ["type"]
          },
          {
            foreignKeyName: "user_loadouts_slot_2_boost_type_fkey"
            columns: ["slot_2_boost_type"]
            isOneToOne: false
            referencedRelation: "boost_definitions"
            referencedColumns: ["type"]
          },
          {
            foreignKeyName: "user_loadouts_slot_3_boost_type_fkey"
            columns: ["slot_3_boost_type"]
            isOneToOne: false
            referencedRelation: "boost_definitions"
            referencedColumns: ["type"]
          },
          {
            foreignKeyName: "user_loadouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_metrics: {
        Row: {
          common_mistakes: Json | null
          correct_answers: number | null
          created_at: string | null
          id: string
          last_duel_at: string | null
          last_login_at: string | null
          last_streak_date: string | null
          last_test_at: string | null
          readiness_level: number | null
          streak_days: number | null
          topics_completed: Json | null
          total_duels_played: number | null
          total_questions_answered: number | null
          total_tests_completed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          common_mistakes?: Json | null
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          last_duel_at?: string | null
          last_login_at?: string | null
          last_streak_date?: string | null
          last_test_at?: string | null
          readiness_level?: number | null
          streak_days?: number | null
          topics_completed?: Json | null
          total_duels_played?: number | null
          total_questions_answered?: number | null
          total_tests_completed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          common_mistakes?: Json | null
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          last_duel_at?: string | null
          last_login_at?: string | null
          last_streak_date?: string | null
          last_test_at?: string | null
          readiness_level?: number | null
          streak_days?: number | null
          topics_completed?: Json | null
          total_duels_played?: number | null
          total_questions_answered?: number | null
          total_tests_completed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          categories_enabled: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          only_important: boolean
          preferred_language: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_mode_until: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          categories_enabled?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          only_important?: boolean
          preferred_language?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_mode_until?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          categories_enabled?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          only_important?: boolean
          preferred_language?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_mode_until?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pdd_ticket_progress: {
        Row: {
          attempts_count: number | null
          best_score: number | null
          completed_at: string | null
          correct_answers: number | null
          country: string
          created_at: string
          id: string
          score: number | null
          status: string
          ticket_id: string
          time_spent_seconds: number | null
          total_questions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          best_score?: number | null
          completed_at?: string | null
          correct_answers?: number | null
          country?: string
          created_at?: string
          id?: string
          score?: number | null
          status?: string
          ticket_id: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          best_score?: number | null
          completed_at?: string | null
          correct_answers?: number | null
          country?: string
          created_at?: string
          id?: string
          score?: number | null
          status?: string
          ticket_id?: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pdd_ticket_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
          is_bookmarked: boolean
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
          is_bookmarked?: boolean
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
          is_bookmarked?: boolean
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
      user_ranks: {
        Row: {
          duel_pass_level: number
          duel_pass_xp: number
          id: string
          is_master_top_100: boolean | null
          obtained_at: string | null
          rank: string
          season_id: number
          user_id: string
        }
        Insert: {
          duel_pass_level: number
          duel_pass_xp: number
          id?: string
          is_master_top_100?: boolean | null
          obtained_at?: string | null
          rank: string
          season_id: number
          user_id: string
        }
        Update: {
          duel_pass_level?: number
          duel_pass_xp?: number
          id?: string
          is_master_top_100?: boolean | null
          obtained_at?: string | null
          rank?: string
          season_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ranks_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "duel_pass_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ranks_user_id_fkey"
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
      user_season_history: {
        Row: {
          created_at: string
          final_level: number
          final_sp: number
          id: string
          premium_pass_purchased: boolean
          season_id: number
          total_rewards_claimed: number
          user_id: string
        }
        Insert: {
          created_at?: string
          final_level: number
          final_sp: number
          id?: string
          premium_pass_purchased?: boolean
          season_id: number
          total_rewards_claimed?: number
          user_id: string
        }
        Update: {
          created_at?: string
          final_level?: number
          final_sp?: number
          id?: string
          premium_pass_purchased?: boolean
          season_id?: number
          total_rewards_claimed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_season_history_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "duel_pass_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_season_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_season_progress: {
        Row: {
          created_at: string
          final_level: number | null
          final_sp: number | null
          id: string
          level: number
          levels_skipped: number
          premium_pass_purchased: boolean
          premium_pass_purchased_at: string | null
          season_id: number
          season_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          final_level?: number | null
          final_sp?: number | null
          id?: string
          level?: number
          levels_skipped?: number
          premium_pass_purchased?: boolean
          premium_pass_purchased_at?: string | null
          season_id: number
          season_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          final_level?: number | null
          final_sp?: number | null
          id?: string
          level?: number
          levels_skipped?: number
          premium_pass_purchased?: boolean
          premium_pass_purchased_at?: string | null
          season_id?: number
          season_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_season_progress_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "duel_pass_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_season_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_id: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_activity_at: string
          metadata: Json | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_activity_at?: string
          metadata?: Json | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_activity_at?: string
          metadata?: Json | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_skins: {
        Row: {
          id: string
          is_active: boolean | null
          obtained_at: string | null
          obtained_from: string | null
          obtained_metadata: Json | null
          skin_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          obtained_at?: string | null
          obtained_from?: string | null
          obtained_metadata?: Json | null
          skin_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          obtained_at?: string | null
          obtained_from?: string | null
          obtained_metadata?: Json | null
          skin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skins_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "skin_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stickers: {
        Row: {
          id: string
          last_used_at: string | null
          obtained_at: string | null
          obtained_from: string | null
          obtained_metadata: Json | null
          quantity: number | null
          sticker_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_used_at?: string | null
          obtained_at?: string | null
          obtained_from?: string | null
          obtained_metadata?: Json | null
          quantity?: number | null
          sticker_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_used_at?: string | null
          obtained_at?: string | null
          obtained_from?: string | null
          obtained_metadata?: Json | null
          quantity?: number | null
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stickers_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "sticker_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stickers_user_id_fkey"
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
      user_test_progress: {
        Row: {
          attempts_count: number | null
          best_score: number | null
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          id: string
          score: number | null
          started_at: string | null
          status: string
          test_id: string
          time_spent_seconds: number | null
          total_questions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          best_score?: number | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string
          test_id: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          best_score?: number | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string
          test_id?: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_test_progress_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_test_progress_user_id_fkey"
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
      webauthn_challenges: {
        Row: {
          challenge: string
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          challenge_type: string
          created_at?: string
          expires_at?: string
          id?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          challenge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_daily_pulse: {
        Row: {
          active_this_week: number | null
          at_risk_users: number | null
          avg_streak: number | null
          claims_today: number | null
          max_streak: number | null
          total_active_users: number | null
          users_with_freeze: number | null
        }
        Relationships: []
      }
      daily_bonus_metrics: {
        Row: {
          avg_streak: number | null
          d30_plus: number | null
          d7_plus: number | null
          date: string | null
          day_1_claims: number | null
          day_7_claims: number | null
          max_streak: number | null
          median_streak: number | null
          total_claims: number | null
          unique_users: number | null
          users_with_freeze: number | null
        }
        Relationships: []
      }
      freeze_usage_stats: {
        Row: {
          auto_used: number | null
          avg_streak_lost: number | null
          avg_streak_saved: number | null
          date: string | null
          streaks_lost: number | null
        }
        Relationships: []
      }
      streak_distribution: {
        Row: {
          percentage: number | null
          streak_range: string | null
          user_count: number | null
        }
        Relationships: []
      }
      system_health_check: {
        Row: {
          avg_active_streak: number | null
          claims_today: number | null
          claims_yesterday: number | null
          freezes_used_today: number | null
          growth_rate_percent: number | null
          streaks_lost_today: number | null
        }
        Relationships: []
      }
      top_streakers: {
        Row: {
          current_streak: number | null
          freeze_available: number | null
          last_claimed_date: string | null
          rank: number | null
          streak_multiplier: number | null
          tier: string | null
          total_claims: number | null
          user_id: string | null
          username: string | null
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
    }
    Functions: {
      activate_partner_premium: {
        Args: {
          p_ip_address?: unknown
          p_partner_code: string
          p_user_agent?: string
          p_user_id: string
          p_utm_campaign?: string
          p_utm_medium?: string
          p_utm_source?: string
        }
        Returns: {
          message: string
          premium_until: string
          success: boolean
        }[]
      }
      activate_premium: {
        Args: { p_days: number; p_user_id: string }
        Returns: undefined
      }
      activate_premium_key: {
        Args: { p_key: string; p_user_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      activate_skin: {
        Args: { p_skin_id: string; p_user_id: string }
        Returns: boolean
      }
      activate_temporary_boost: {
        Args: { p_boost_type: string; p_user_id: string }
        Returns: {
          expires_at: string
          message: string
          success: boolean
        }[]
      }
      add_partner_commission_to_hold: {
        Args: { p_amount: number; p_partner_id: string; p_purchase_id?: string }
        Returns: boolean
      }
      add_student_to_autoschool: {
        Args: {
          p_enrollment_date?: string
          p_notes?: string
          p_partner_id: string
          p_student_group?: string
          p_user_id: string
        }
        Returns: {
          message: string
          student_id: string
          success: boolean
        }[]
      }
      add_to_fraud_blacklist: {
        Args: {
          p_expires_days?: number
          p_reason?: string
          p_type: string
          p_value: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      aggregate_partner_stats_yesterday: {
        Args: never
        Returns: {
          clicks: number
          date: string
          partner_id: string
          purchases: number
        }[]
      }
      apply_partner_promo_code: {
        Args: { p_base_price: number; p_promo_code: string; p_user_id: string }
        Returns: {
          commission_rate: number
          discount_amount: number
          discount_percent: number
          final_price: number
          message: string
          partner_code: string
          partner_id: string
          success: boolean
        }[]
      }
      archive_old_conversions: { Args: never; Returns: number }
      async_check_fraud_patterns: {
        Args: { p_conversion_id: string }
        Returns: {
          alert_id: string
          alert_type: string
          description: string
          fraud_detected: boolean
        }[]
      }
      buy_streak_freeze: {
        Args: { p_quantity?: number; p_user_id: string }
        Returns: Json
      }
      calculate_duel_commission: {
        Args: { total_pot: number }
        Returns: number
      }
      can_access_challenge_question: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      can_access_cosmetics: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      can_access_daily_bonus: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      can_access_question_report: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      can_change_password: {
        Args: { p_user_id: string }
        Returns: {
          can_change: boolean
          days_remaining: number
          last_change_date: string
          message: string
        }[]
      }
      cancel_partner_payout: {
        Args: { p_partner_id: string; p_payout_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      check_ad_reward_status: {
        Args: {
          p_cooldown_minutes?: number
          p_daily_limit?: number
          p_reward_type: string
          p_user_id: string
        }
        Returns: Json
      }
      check_ai_usage_limit: {
        Args: { p_user_id: string }
        Returns: {
          current_count: number
          limit_reached: boolean
          remaining: number
        }[]
      }
      check_and_auto_distribute_season_rewards: { Args: never; Returns: Json }
      check_and_distribute_season_rewards: { Args: never; Returns: Json }
      check_and_increment_ai_debrief_limit: {
        Args: { p_user_id: string }
        Returns: Json
      }
      check_and_log_ended_seasons: { Args: never; Returns: Json }
      check_cookie_stuffing: {
        Args: {
          p_created_at: string
          p_event_type: string
          p_session_id: string
        }
        Returns: {
          click_timestamp: string
          is_stuffing: boolean
          time_diff_seconds: number
        }[]
      }
      check_offline_action_processed: {
        Args: { p_action_id: string; p_action_type: string }
        Returns: boolean
      }
      check_self_referral: {
        Args: { p_partner_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_ad_reward: {
        Args: {
          p_cooldown_minutes?: number
          p_daily_limit?: number
          p_reward_amount?: number
          p_reward_type: string
          p_user_id: string
        }
        Returns: Json
      }
      claim_daily_bonus_atomic: {
        Args: {
          p_server_today: string
          p_server_yesterday: string
          p_user_id: string
        }
        Returns: {
          error: string
          freeze_used: boolean
          message: string
          mystery_reward: Json
          new_balance_coins: number
          new_balance_xp: number
          new_streak: number
          reward: Json
          success: boolean
          week_day: number
        }[]
      }
      claim_leaderboard_rewards: {
        Args: { p_position: number; p_season_id: number; p_user_id: string }
        Returns: Json
      }
      claim_technical_win: {
        Args: { p_duel_id: string; p_profile_id: string }
        Returns: Json
      }
      cleanup_expired_boosts: { Args: never; Returns: number }
      cleanup_expired_matchmaking: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_expired_webauthn_challenges: { Args: never; Returns: number }
      cleanup_old_fraud_alerts: { Args: never; Returns: number }
      consume_webauthn_challenge: {
        Args: { p_session_id: string }
        Returns: {
          challenge: string
          challenge_type: string
          created_at: string
          user_id: string
        }[]
      }
      create_fraud_alert: {
        Args: {
          p_alert_type: string
          p_description: string
          p_metadata?: Json
          p_partner_id: string
          p_severity: string
        }
        Returns: string
      }
      create_or_update_session: {
        Args: {
          p_device_id: string
          p_ip_address?: unknown
          p_max_sessions?: number
          p_session_token: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          closed_same_device: boolean
          message: string
          previous_sessions_closed: number
          session_id: string
        }[]
      }
      create_referral: {
        Args: { p_referred_id: string; p_referrer_code: string }
        Returns: {
          message: string
          referred_bonus: number
          result_referrer_id: string
          success: boolean
        }[]
      }
      create_telegram_link_token: { Args: never; Returns: string }
      create_transaction: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_transaction_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_webauthn_challenge: {
        Args: {
          p_challenge: string
          p_challenge_type: string
          p_session_id: string
          p_user_id?: string
        }
        Returns: string
      }
      delete_old_duel_data: {
        Args: never
        Returns: {
          cleaned_duels: number
          deleted_answers: number
          deleted_exploits: number
        }[]
      }
      detect_partner_fraud_patterns: {
        Args: never
        Returns: {
          alert_type: string
          description: string
          metadata: Json
          partner_id: string
          severity: string
        }[]
      }
      duel_pass_xp: { Args: { p_user_id?: string }; Returns: Json }
      enable_instructor_mode: {
        Args: { p_enabled: boolean; p_user_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      ensure_referral_codes: { Args: never; Returns: undefined }
      exec_sql: { Args: { query: string }; Returns: Json }
      finalize_race_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: string
      }
      find_matchmaking_opponent: {
        Args: {
          p_bet_amount: number
          p_difficulty: string
          p_profile_id: string
        }
        Returns: {
          bet_amount: number
          bet_type: string
          categories: Json
          difficulty: string
          id: string
          num_questions: number
          profile_id: string
        }[]
      }
      generate_mystery_box_reward: {
        Args: { p_box_type: string }
        Returns: Json
      }
      generate_partner_link: {
        Args: {
          p_destination: string
          p_destination_params?: Json
          p_expires_days?: number
          p_partner_id: string
          p_utm_campaign?: string
        }
        Returns: {
          full_url: string
          link_code: string
          message: string
          success: boolean
        }[]
      }
      generate_premium_key: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_active_exploits: {
        Args: { p_duel_id: string; p_my_player_id: string }
        Returns: {
          activated_at: string
          attacker_player_id: string
          created_at: string
          duel_id: string
          effect_data: Json
          expires_at: string
          exploit_type: string
          id: string
          is_active: boolean
          target_player_id: string
        }[]
      }
      get_active_reward_config: {
        Args: { p_key: string; p_season_id?: number }
        Returns: Json
      }
      get_active_season: {
        Args: never
        Returns: {
          days_remaining: number
          end_date: string
          id: number
          name_en: string
          name_es: string
          name_ru: string
          season_number: number
          start_date: string
          theme: string
        }[]
      }
      get_ai_debrief_limit_status: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_all_topics_progress: { Args: { p_user_id: string }; Returns: Json }
      get_autoschool_students_progress: {
        Args: { p_partner_id: string }
        Returns: {
          accuracy_rate: number
          avatar_url: string
          correct_answers: number
          days_since_last_test: number
          enrollment_date: string
          esencial_tests_taken: number
          exam_readiness_score: number
          exam_ready: boolean
          expected_exam_date: string
          full_name: string
          general_tests_taken: number
          is_active: boolean
          last_test_at: string
          priority_tests_taken: number
          readiness_status: string
          student_group: string
          student_id: string
          total_questions_answered: number
          total_tests_taken: number
          user_id: string
          weak_categories: Json
        }[]
      }
      get_autoschool_summary: {
        Args: { p_partner_id: string }
        Returns: {
          active_students: number
          almost_ready: number
          avg_accuracy: number
          avg_tests_per_student: number
          ready_for_exam: number
          students_tested_this_week: number
          students_tested_today: number
          total_students: number
        }[]
      }
      get_autoschool_top_students: {
        Args: { p_limit?: number; p_partner_id: string }
        Returns: {
          accuracy_rate: number
          avatar_url: string
          full_name: string
          rank: number
          total_tests_taken: number
          user_id: string
        }[]
      }
      get_challenge_bank_questions: {
        Args: {
          p_limit?: number
          p_only_not_mastered?: boolean
          p_user_id: string
        }
        Returns: {
          explanation_en: string
          explanation_es: string
          explanation_ru: string
          id: string
          image_url: string
          last_wrong_at: string
          mastered: boolean
          question_en: string
          question_es: string
          question_ru: string
          times_reviewed: number
          times_wrong: number
          topic_title_es: string
          topic_title_ru: string
        }[]
      }
      get_challenge_bank_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_wrong_count: number
          mastered_questions: number
          needs_practice: number
          total_questions: number
        }[]
      }
      get_chat_friends: { Args: { p_user_id: string }; Returns: string[] }
      get_current_profile_id: { Args: never; Returns: string }
      get_dashboard_complete: { Args: { p_user_id: string }; Returns: Json }
      get_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_dashboard_super: { Args: { p_user_id: string }; Returns: Json }
      get_database_size: { Args: never; Returns: number }
      get_duel_questions_raw: {
        Args: { p_duel_id: string }
        Returns: {
          correct_option_ids: Json
          created_at: string
          duel_id: string
          id: string
          position: number
          question_id: string
          question_snapshot: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "duel_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_duel_questions_secure: {
        Args: { p_duel_id: string }
        Returns: {
          correct_option_ids: string[]
          created_at: string
          duel_id: string
          id: string
          position: number
          question_id: string
          question_text: string
        }[]
      }
      get_feature_flag: { Args: { flag_key: string }; Returns: boolean }
      get_or_create_season_progress: {
        Args: { p_season_id: number; p_user_id: string }
        Returns: {
          created_at: string
          final_level: number
          final_sp: number
          id: string
          level: number
          levels_skipped: number
          premium_pass_purchased: boolean
          premium_pass_purchased_at: string
          season_id: number
          season_points: number
          updated_at: string
          user_id: string
        }[]
      }
      get_partner_dashboard: {
        Args: { p_user_id: string }
        Returns: {
          keys_data: Json
          partner_data: Json
          stats: Json
        }[]
      }
      get_partner_funnel_by_day: {
        Args: { p_days?: number; p_partner_id: string }
        Returns: {
          clicks: number
          commission: number
          date: string
          installs: number
          purchases: number
          registrations: number
          revenue: number
        }[]
      }
      get_partner_funnel_stats: {
        Args: { p_days?: number; p_partner_id: string }
        Returns: {
          avg_commission_per_purchase: number
          click_to_install_rate: number
          clicks: number
          install_to_reg_rate: number
          installs: number
          overall_conversion_rate: number
          purchases: number
          reg_to_purchase_rate: number
          registrations: number
          total_commission: number
          total_revenue: number
        }[]
      }
      get_partner_funnel_stats_optimized: {
        Args: { p_days?: number; p_partner_id: string }
        Returns: {
          avg_commission_per_purchase: number
          click_to_install_rate: number
          clicks: number
          install_to_reg_rate: number
          installs: number
          overall_conversion_rate: number
          purchases: number
          reg_to_purchase_rate: number
          registrations: number
          total_commission: number
          total_revenue: number
        }[]
      }
      get_partner_geo_stats: {
        Args: { p_days?: number; p_partner_id: string }
        Returns: {
          clicks: number
          conversion_rate: number
          country_code: string
          purchases: number
          registrations: number
          revenue: number
        }[]
      }
      get_partner_link_info: {
        Args: { p_link_code: string }
        Returns: {
          destination: string
          destination_params: Json
          message: string
          partner_code: string
          success: boolean
          utm_campaign: string
        }[]
      }
      get_partner_link_stats: {
        Args: { p_partner_id: string }
        Returns: {
          daily_activations: number
          monthly_activations: number
          total_activations: number
          unique_users: number
        }[]
      }
      get_partner_links_stats: {
        Args: { p_partner_id: string }
        Returns: {
          clicks_count: number
          conversion_rate: number
          created_at: string
          destination: string
          last_click_at: string
          link_code: string
          purchases_count: number
          registrations_count: number
          utm_campaign: string
        }[]
      }
      get_partner_links_with_stats: {
        Args: { p_limit?: number; p_partner_id: string }
        Returns: {
          clicks_count: number
          conversion_rate: number
          created_at: string
          destination: string
          full_url: string
          is_active: boolean
          last_click_at: string
          link_code: string
          link_id: string
          purchases_count: number
          registrations_count: number
          utm_campaign: string
        }[]
      }
      get_partner_payout_history: {
        Args: { p_limit?: number; p_partner_id: string }
        Returns: {
          amount: number
          completed_at: string
          currency: string
          payout_id: string
          payout_method: string
          rejection_reason: string
          requested_at: string
          status: string
        }[]
      }
      get_partner_top_campaigns: {
        Args: { p_days?: number; p_limit?: number; p_partner_id: string }
        Returns: {
          click_to_purchase_rate: number
          clicks: number
          commission: number
          purchases: number
          registrations: number
          revenue: number
          roi: number
          utm_campaign: string
        }[]
      }
      get_passkey_for_verification: {
        Args: { p_credential_id: string }
        Returns: {
          counter: number
          id: string
          public_key: string
          user_email: string
          user_id: string
        }[]
      }
      get_pdd_russia_question_by_source: {
        Args: { p_source_id: string }
        Returns: {
          answers: Json
          explanation: string
          id: string
          image_url: string
          question_number: number
          question_text: string
          ticket_number: number
          topics: string[]
        }[]
      }
      get_pdd_russia_ticket: {
        Args: { p_ticket_number: number }
        Returns: {
          answers: Json
          correct_answer_text: string
          explanation: string
          id: string
          image_url: string
          question_number: number
          question_text: string
          ticket_number: number
          topics: string[]
        }[]
      }
      get_pending_fraud_alerts: {
        Args: { p_limit?: number }
        Returns: {
          alert_id: string
          alert_type: string
          created_at: string
          description: string
          metadata: Json
          partner_code: string
          partner_id: string
          partner_name: string
          severity: string
        }[]
      }
      get_questions_by_country: {
        Args: { p_country: string; p_limit?: number; p_topic_id?: string }
        Returns: {
          country: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation_en: string | null
          explanation_es: string | null
          explanation_ru: string | null
          id: string
          image_url: string | null
          is_premium: boolean
          metadata: Json
          notes: string | null
          percent_correct: number | null
          question_en: string | null
          question_es: string | null
          question_ru: string
          sign_code: string | null
          source: string | null
          source_id: string | null
          topic_id: string | null
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "questions_new"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_random_dgt_questions: {
        Args: { p_category: string; p_limit?: number }
        Returns: {
          category: string
          correct_answer: string
          created_at: string
          explanation_es: string | null
          id: string
          image_filename: string | null
          option_a_es: string
          option_b_es: string
          option_c_es: string
          question_es: string
          source: string | null
          times_correct: number | null
          times_shown: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "dgt_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_random_duel_questions: {
        Args: {
          p_categories?: string[]
          p_difficulty?: string
          p_limit: number
        }
        Returns: {
          answer_options: Json
          difficulty: string
          id: string
          image_url: string
          question_en: string
          question_es: string
          question_ru: string
          topic_id: string
        }[]
      }
      get_random_loot: {
        Args: { p_loot_type: string; p_pool?: string }
        Returns: Json
      }
      get_random_sticker_from_pool: {
        Args: { p_pool?: string }
        Returns: string
      }
      get_seasonal_weekly_badge: { Args: never; Returns: string }
      get_sp_multiplier: { Args: { p_user_id: string }; Returns: number }
      get_test_questions: {
        Args: { p_test_id: string }
        Returns: {
          difficulty: string
          explanation_en: string
          explanation_es: string
          explanation_ru: string
          image_url: string
          question_en: string
          question_es: string
          question_id: string
          question_ru: string
          sign_code: string
          source_id: string
          topic_id: string
        }[]
      }
      get_user_badges: {
        Args: { p_user_id: string }
        Returns: {
          badge_definitions: Json
          badge_id: string
          display_order: number
          id: string
          is_displayed: boolean
          obtained_at: string
        }[]
      }
      get_user_boost_inventory: {
        Args: { p_user_id: string }
        Returns: {
          boost_type: string
          quantity: number
        }[]
      }
      get_user_devices: {
        Args: { p_user_id: string }
        Returns: {
          device_name: string
          first_seen_at: string
          id: string
          is_trusted: boolean
          last_seen_at: string
          platform: string
        }[]
      }
      get_user_leaderboard_position: {
        Args: {
          p_filter_type?: string
          p_filter_value?: string
          p_neighbors_count?: number
          p_user_id: string
        }
        Returns: Json
      }
      get_user_loadout: {
        Args: { p_user_id: string }
        Returns: {
          slot_1_boost_type: string
          slot_2_boost_type: string
          slot_3_boost_type: string
        }[]
      }
      get_user_profile_by_email: {
        Args: { p_email: string }
        Returns: {
          avatar_url: string
          first_name: string
          last_name: string
          username: string
        }[]
      }
      get_user_rank: {
        Args: { p_season_id?: number; p_user_id: string }
        Returns: string
      }
      get_user_skins: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          is_active: boolean
          obtained_at: string
          skin_definitions: Json
          skin_id: string
        }[]
      }
      get_user_stickers: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          obtained_at: string
          quantity: number
          sticker_definitions: Json
          sticker_id: string
        }[]
      }
      get_user_topics_progress_batch: {
        Args: { p_topic_ids: string[]; p_user_id: string }
        Returns: {
          completed: boolean
          completed_subtopic_count: number
          is_unlocked: boolean
          progress_percent: number
          topic_id: string
          total_subtopic_count: number
        }[]
      }
      get_user_transactions: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          metadata: Json
          transaction_type: string
        }[]
      }
      grant_partner_premium: {
        Args: { p_partner_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      grant_random_loot: {
        Args: { p_loot_data: Json; p_user_id: string }
        Returns: Json
      }
      has_boost: {
        Args: { p_boost_type: string; p_user_id: string }
        Returns: boolean
      }
      has_premium_access: { Args: { p_user_id: string }; Returns: boolean }
      has_premium_forever: { Args: { p_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hello_fixed: { Args: never; Returns: string }
      increment_ai_usage: {
        Args: { p_user_id: string }
        Returns: {
          current_count: number
          limit_reached: boolean
        }[]
      }
      increment_profile_stats: {
        Args: {
          p_coins?: number
          p_sp?: number
          p_user_id: string
          p_xp?: number
        }
        Returns: undefined
      }
      increment_profile_value: {
        Args: { p_amount: number; p_column: string; p_profile_id: string }
        Returns: undefined
      }
      increment_profile_value_safe: {
        Args: { p_amount: number; p_column: string; p_user_identifier: string }
        Returns: undefined
      }
      initialize_user_test_progress: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_fraudulent: {
        Args: { p_device_id?: string; p_ip?: unknown; p_user_agent?: string }
        Returns: boolean
      }
      issue_premium_keys_to_partner: {
        Args: {
          p_expires_months?: number
          p_partner_id: string
          p_quantity: number
        }
        Returns: {
          keys_issued: string[]
        }[]
      }
      link_session_to_user: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: number
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
      link_telegram_user: {
        Args: { p_telegram_id: number; p_token: string; p_username: string }
        Returns: Json
      }
      log_offline_sync: {
        Args: {
          p_action_type: string
          p_actions_count: number
          p_errors?: Json
          p_failed_count: number
          p_profile_id: string
          p_success_count: number
        }
        Returns: string
      }
      manual_check_seasons: { Args: never; Returns: Json }
      mark_season_for_rewards_distribution: { Args: never; Returns: Json }
      modify_boost_inventory: {
        Args: { p_boost_type: string; p_change: number; p_user_id: string }
        Returns: undefined
      }
      populate_tests_from_questions: { Args: never; Returns: undefined }
      process_duel_payout: {
        Args: {
          p_duel_id: string
          p_is_draw?: boolean
          p_loser_id: string
          p_winner_id: string
        }
        Returns: {
          commission: number
          rematch_pot: number
          winner_payout: number
        }[]
      }
      process_ended_seasons: {
        Args: never
        Returns: {
          needs_processing: boolean
          season_id: number
          season_name: string
          season_number: number
        }[]
      }
      process_partner_payout: {
        Args: {
          p_action: string
          p_admin_notes?: string
          p_payout_id: string
          p_rejection_reason?: string
          p_transaction_id?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      process_stars_payment_rewards: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      process_test_completion: {
        Args: {
          p_correct_count: number
          p_double_sp_active?: boolean
          p_premium_flag?: boolean
          p_questions_count: number
          p_score: number
          p_session_id: string
          p_test_duration_seconds: number
          p_test_id: string
          p_user_id: string
        }
        Returns: Json
      }
      register_or_update_device: {
        Args: {
          p_device_fingerprint: string
          p_device_name?: string
          p_ip_address?: unknown
          p_platform?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: {
          device_count: number
          device_id: string
          is_new_device: boolean
          message: string
          requires_verification: boolean
        }[]
      }
      register_partner: {
        Args: {
          p_channel_name: string
          p_channel_url: string
          p_description: string
          p_email: string
          p_name: string
          p_partner_type?: string
          p_social_links: Json
          p_subscribers_count: number
        }
        Returns: {
          message: string
          partner_id: string
          success: boolean
        }[]
      }
      register_password_change: {
        Args: {
          p_device_fingerprint?: string
          p_ip_address?: unknown
          p_user_id: string
        }
        Returns: string
      }
      release_partner_commissions_from_hold: {
        Args: never
        Returns: {
          amount_released: number
          partner_id: string
          purchases_count: number
        }[]
      }
      request_partner_payout: {
        Args: {
          p_amount: number
          p_partner_id: string
          p_payout_details: Json
          p_payout_method: string
        }
        Returns: {
          message: string
          payout_id: string
          success: boolean
        }[]
      }
      resolve_exploit: {
        Args: { p_exploit_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      resolve_fraud_alert: {
        Args: {
          p_action_taken?: string
          p_alert_id: string
          p_resolution: string
          p_resolution_notes?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      revoke_partner_premium: {
        Args: { p_partner_id: string; p_reason?: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      save_user_loadout: {
        Args: {
          p_slot_1_boost_type?: string
          p_slot_2_boost_type?: string
          p_slot_3_boost_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      search_compact_rules: {
        Args: { limit_count?: number; search_query: string; topic_num?: number }
        Returns: {
          common_mistakes: string[]
          details: Json
          exam_tips: string[]
          id: string
          keyword: string
          keyword_es: string
          keyword_ru: string
          practical_example: string
          related_rules: string[]
          relevance: number
          rule_summary: string
          signs: string[]
          terms: string[]
          topic_number: number
        }[]
      }
      search_dgt_knowledge: {
        Args: { limit_count?: number; search_query: string; topic_num?: number }
        Returns: {
          content: string
          id: string
          relevance: number
          section_title: string
          topic_number: number
        }[]
      }
      send_referral_notification: {
        Args: {
          p_bonus_amount: number
          p_notification_type?: string
          p_referred_name: string
          p_referrer_id: string
        }
        Returns: string
      }
      should_purchase_duel_pass: {
        Args: { p_season_id: number; p_user_id: string }
        Returns: boolean
      }
      storage_bucket_exists: { Args: { bucket_name: string }; Returns: boolean }
      toggle_badge_display: {
        Args: { p_badge_id: string; p_display: boolean; p_user_id: string }
        Returns: Json
      }
      track_partner_conversion: {
        Args: {
          p_browser?: string
          p_country_code?: string
          p_device_id?: string
          p_device_type?: string
          p_event_type: string
          p_fingerprint_hash?: string
          p_ip_address?: unknown
          p_landing_page?: string
          p_os?: string
          p_partner_code: string
          p_referrer_url?: string
          p_session_id?: string
          p_user_agent?: string
          p_user_id?: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
        }
        Returns: {
          conversion_id: string
          message: string
          success: boolean
        }[]
      }
      trigger_season_rewards_processing: {
        Args: { p_season_id: number }
        Returns: Json
      }
      unlink_telegram_user: { Args: { p_profile_id: string }; Returns: Json }
      unlock_next_test: {
        Args: { p_test_id: string; p_user_id: string }
        Returns: string
      }
      update_app_config: {
        Args: {
          config_description?: string
          config_key: string
          config_value: Json
        }
        Returns: undefined
      }
      update_inactive_players: { Args: never; Returns: undefined }
      update_passkey_last_used: {
        Args: { p_credential_id: string; p_new_counter: number }
        Returns: undefined
      }
      update_test_progress: {
        Args: {
          p_correct_answers: number
          p_test_id: string
          p_time_spent_seconds: number
          p_total_questions: number
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_rank: {
        Args: {
          p_force_update?: boolean
          p_season_id?: number
          p_user_id: string
        }
        Returns: Json
      }
      upsert_chat_member: {
        Args: {
          p_chat_id: number
          p_chat_title: string
          p_chat_type: string
          p_telegram_id: number
          p_user_id?: string
        }
        Returns: string
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
      use_boost_attack: {
        Args: {
          p_boost_type: string
          p_duel_id: string
          p_duel_question_id?: string
          p_language?: string
          p_profile_id?: string
        }
        Returns: Json
      }
      use_sticker: {
        Args: { p_sticker_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "editor"
      difficulty_level: "easy" | "medium" | "hard"
      duel_bet_result:
        | "host_win"
        | "opponent_win"
        | "draw"
        | "technical_draw"
        | "cancelled"
      duel_bet_status:
        | "pending"
        | "confirmed"
        | "active"
        | "settled"
        | "cancelled"
        | "under_review"
      material_type: "theory" | "test" | "terms"
      question_type: "single" | "multiple" | "true_false" | "image"
      report_status: "pending" | "in_progress" | "resolved" | "dismissed"
      report_type:
        | "wrong_translation"
        | "wrong_answer"
        | "wrong_image"
        | "unclear_question"
        | "other"
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
      app_role: ["admin", "user", "editor"],
      difficulty_level: ["easy", "medium", "hard"],
      duel_bet_result: [
        "host_win",
        "opponent_win",
        "draw",
        "technical_draw",
        "cancelled",
      ],
      duel_bet_status: [
        "pending",
        "confirmed",
        "active",
        "settled",
        "cancelled",
        "under_review",
      ],
      material_type: ["theory", "test", "terms"],
      question_type: ["single", "multiple", "true_false", "image"],
      report_status: ["pending", "in_progress", "resolved", "dismissed"],
      report_type: [
        "wrong_translation",
        "wrong_answer",
        "wrong_image",
        "unclear_question",
        "other",
      ],
      subtopic_type: ["material", "test", "terms"],
    },
  },
} as const
