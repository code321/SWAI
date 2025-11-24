export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          answer_norm: string | null
          answer_raw: string
          attempt_no: number
          checked_at: string
          id: string
          is_correct: boolean
          sentence_id: string
          session_id: string
        }
        Insert: {
          answer_norm?: string | null
          answer_raw: string
          attempt_no: number
          checked_at?: string
          id?: string
          is_correct: boolean
          sentence_id: string
          session_id: string
        }
        Update: {
          answer_norm?: string | null
          answer_raw?: string
          attempt_no?: number
          checked_at?: string
          id?: string
          is_correct?: boolean
          sentence_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_sentence_id_fkey"
            columns: ["sentence_id"]
            isOneToOne: false
            referencedRelation: "sentences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exercise_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          entity_id: string
          event_type: string
          id: string
          occurred_at: string
          user_id: string
        }
        Insert: {
          entity_id: string
          event_type: string
          id?: string
          occurred_at?: string
          user_id?: string
        }
        Update: {
          entity_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exercise_sessions: {
        Row: {
          finished_at: string | null
          generation_id: string
          id: string
          set_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          generation_id: string
          id?: string
          set_id: string
          started_at?: string
          user_id?: string
        }
        Update: {
          finished_at?: string | null
          generation_id?: string
          id?: string
          set_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sessions_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      generation_log: {
        Row: {
          id: string
          occurred_at: string
          set_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          occurred_at?: string
          set_id?: string | null
          user_id?: string
        }
        Update: {
          id?: string
          occurred_at?: string
          set_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_log_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      generation_runs: {
        Row: {
          cost_usd: number | null
          id: string
          idempotency_key: string
          model_id: string
          occurred_at: string
          prompt_version: string
          set_id: string
          temperature: number
          tokens_in: number
          tokens_out: number
          user_id: string
          words_snapshot: Json
        }
        Insert: {
          cost_usd?: number | null
          id?: string
          idempotency_key: string
          model_id: string
          occurred_at?: string
          prompt_version: string
          set_id: string
          temperature?: number
          tokens_in: number
          tokens_out: number
          user_id?: string
          words_snapshot: Json
        }
        Update: {
          cost_usd?: number | null
          id?: string
          idempotency_key?: string
          model_id?: string
          occurred_at?: string
          prompt_version?: string
          set_id?: string
          temperature?: number
          tokens_in?: number
          tokens_out?: number
          user_id?: string
          words_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generation_runs_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          timezone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          timezone: string
          user_id?: string
        }
        Update: {
          created_at?: string
          timezone?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          session_id: string
          stars: number
        }
        Insert: {
          created_at?: string
          session_id: string
          stars: number
        }
        Update: {
          created_at?: string
          session_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "exercise_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sentences: {
        Row: {
          generation_id: string
          id: string
          pl_text: string
          pl_word_count: number | null
          target_en: string
          target_en_norm: string | null
          user_id: string
          word_id: string
        }
        Insert: {
          generation_id: string
          id?: string
          pl_text: string
          pl_word_count?: number | null
          target_en: string
          target_en_norm?: string | null
          user_id?: string
          word_id: string
        }
        Update: {
          generation_id?: string
          id?: string
          pl_text?: string
          pl_word_count?: number | null
          target_en?: string
          target_en_norm?: string | null
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentences_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sentences_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["cefr_level"]
          name: string
          updated_at: string
          user_id: string
          words_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["cefr_level"]
          name: string
          updated_at?: string
          user_id?: string
          words_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["cefr_level"]
          name?: string
          updated_at?: string
          user_id?: string
          words_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      words: {
        Row: {
          created_at: string
          en: string
          en_norm: string | null
          id: string
          pl: string
          set_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          en: string
          en_norm?: string | null
          id?: string
          pl: string
          set_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          en?: string
          en_norm?: string | null
          id?: string
          pl?: string
          set_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "words_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "words_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_words: { Args: { text_input: string }; Returns: number }
      normalize_en: { Args: { text_input: string }; Returns: string }
    }
    Enums: {
      cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cefr_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
    },
  },
} as const

