export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          company_uid: string | null
          details: Json | null
          location_uid: string
          name: string
          rule_uid: string | null
          timestamp: string | null
          uid: string
          user_uid: string
        }
        ComputedFields: never
        Insert: {
          company_uid?: string | null
          details?: Json | null
          location_uid: string
          name: string
          rule_uid?: string | null
          timestamp?: string | null
          uid?: string
          user_uid: string
        }
        Update: {
          company_uid?: string | null
          details?: Json | null
          location_uid?: string
          name?: string
          rule_uid?: string | null
          timestamp?: string | null
          uid?: string
          user_uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "alerts_location_uid_fkey"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "alerts_rule_uid_fkey"
            columns: ["rule_uid"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "fk_alerts_user"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
        ]
      }
      applause: {
        Row: {
          company_uid: string | null
          details: Json | null
          location_uid: string | null
          name: string
          rule_uid: string | null
          timestamp: string | null
          uid: string
          user_uid: string
        }
        ComputedFields: never
        Insert: {
          company_uid?: string | null
          details?: Json | null
          location_uid?: string | null
          name: string
          rule_uid?: string | null
          timestamp?: string | null
          uid?: string
          user_uid: string
        }
        Update: {
          company_uid?: string | null
          details?: Json | null
          location_uid?: string | null
          name?: string
          rule_uid?: string | null
          timestamp?: string | null
          uid?: string
          user_uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "applause_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "applause_location_uid_fkey"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "applause_rule_uid_fkey"
            columns: ["rule_uid"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "fk_applause_user"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
        ]
      }
      clips: {
        Row: {
          company_uid: string | null
          created_at: string | null
          length: number | null
          location_uid: string
          recording_stop_timestamp: string | null
          thumbnail_url: string | null
          title: string | null
          uid: string
          user_uid: string
          video_url: string
        }
        ComputedFields: never
        Insert: {
          company_uid?: string | null
          created_at?: string | null
          length?: number | null
          location_uid: string
          recording_stop_timestamp?: string | null
          thumbnail_url?: string | null
          title?: string | null
          uid?: string
          user_uid: string
          video_url: string
        }
        Update: {
          company_uid?: string | null
          created_at?: string | null
          length?: number | null
          location_uid?: string
          recording_stop_timestamp?: string | null
          thumbnail_url?: string | null
          title?: string | null
          uid?: string
          user_uid?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "clips_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "clips_location_uid_fkey"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "clips_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
        ]
      }
      companies: {
        Row: {
          abbreviation: string | null
          address: string | null
          created_at: string | null
          name: string
          uid: string
        }
        ComputedFields: never
        Insert: {
          abbreviation?: string | null
          address?: string | null
          created_at?: string | null
          name: string
          uid?: string
        }
        Update: {
          abbreviation?: string | null
          address?: string | null
          created_at?: string | null
          name?: string
          uid?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          alert_uid: string | null
          applause_uid: string | null
          company_uid: string | null
          created_at: string | null
          evaluation_value: string
          evaluator_user_uid: string | null
          location_uid: string | null
          notes: string | null
          timestamp: string | null
          uid: string
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          alert_uid?: string | null
          applause_uid?: string | null
          company_uid?: string | null
          created_at?: string | null
          evaluation_value: string
          evaluator_user_uid?: string | null
          location_uid?: string | null
          notes?: string | null
          timestamp?: string | null
          uid?: string
          updated_at?: string | null
        }
        Update: {
          alert_uid?: string | null
          applause_uid?: string | null
          company_uid?: string | null
          created_at?: string | null
          evaluation_value?: string
          evaluator_user_uid?: string | null
          location_uid?: string | null
          notes?: string | null
          timestamp?: string | null
          uid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_alert_uid_fkey"
            columns: ["alert_uid"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_applause_uid_fkey"
            columns: ["applause_uid"]
            isOneToOne: false
            referencedRelation: "applause"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_evaluator_user_uid_fkey"
            columns: ["evaluator_user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_location_uid_fkey"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          company_uid: string
          created_at: string | null
          name: string
          uid: string
        }
        ComputedFields: never
        Insert: {
          address?: string | null
          company_uid: string
          created_at?: string | null
          name: string
          uid?: string
        }
        Update: {
          address?: string | null
          company_uid?: string
          created_at?: string | null
          name?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_locations_company"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
        ]
      }
      logs: {
        Row: {
          clip_id: string | null
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          function_name: string
          location_uid: string | null
          message: string | null
          status: string
          uid: string
          user_uid: string | null
        }
        ComputedFields: never
        Insert: {
          clip_id?: string | null
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          function_name: string
          location_uid?: string | null
          message?: string | null
          status: string
          uid?: string
          user_uid?: string | null
        }
        Update: {
          clip_id?: string | null
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          function_name?: string
          location_uid?: string | null
          message?: string | null
          status?: string
          uid?: string
          user_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_location_uid_fkey"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "logs_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
        ]
      }
      reports: {
        Row: {
          contents: string | null
          created_at: string | null
          grade: string | null
          location_uid: string
          title: string
          uid: string
        }
        ComputedFields: never
        Insert: {
          contents?: string | null
          created_at?: string | null
          grade?: string | null
          location_uid: string
          title: string
          uid?: string
        }
        Update: {
          contents?: string | null
          created_at?: string | null
          grade?: string | null
          location_uid?: string
          title?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reports_location"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
        ]
      }
      rules: {
        Row: {
          company_uid: string | null
          created_at: string | null
          details: string | null
          location_uid: string | null
          name: string
          status: string
          uid: string
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          company_uid?: string | null
          created_at?: string | null
          details?: string | null
          location_uid?: string | null
          name: string
          status: string
          uid?: string
          updated_at?: string | null
        }
        Update: {
          company_uid?: string | null
          created_at?: string | null
          details?: string | null
          location_uid?: string | null
          name?: string
          status?: string
          uid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rules_location"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "rules_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
        ]
      }
      users: {
        Row: {
          company_uid: string
          created_at: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          location_uid: string
          role: Database["public"]["Enums"]["role"]
          uid: string
        }
        ComputedFields: never
        Insert: {
          company_uid: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          location_uid: string
          role?: Database["public"]["Enums"]["role"]
          uid?: string
        }
        Update: {
          company_uid?: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          location_uid?: string
          role?: Database["public"]["Enums"]["role"]
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_company"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "fk_users_location"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
        ]
      }
    }
    Views: {
      evaluations_with_item_type: {
        Row: {
          alert_uid: string | null
          applause_uid: string | null
          company_uid: string | null
          created_at: string | null
          evaluated_item_type: string | null
          evaluated_item_uid: string | null
          evaluation_value: string
          evaluator_user_uid: string | null
          location_uid: string | null
          notes: string | null
          timestamp: string | null
          uid: string
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          alert_uid?: string | null
          applause_uid?: string | null
          company_uid?: string | null
          created_at?: string | null
          evaluated_item_type?: never
          evaluated_item_uid?: never
          evaluation_value?: string | null
          evaluator_user_uid?: string | null
          location_uid?: string | null
          notes?: string | null
          timestamp?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_uid?: string | null
          applause_uid?: string | null
          company_uid?: string | null
          created_at?: string | null
          evaluated_item_type?: never
          evaluated_item_uid?: never
          evaluation_value?: string | null
          evaluator_user_uid?: string | null
          location_uid?: string | null
          notes?: string | null
          timestamp?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_alert_uid_fkey"
            columns: ["alert_uid"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_applause_uid_fkey"
            columns: ["applause_uid"]
            isOneToOne: false
            referencedRelation: "applause"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_evaluator_user_uid_fkey"
            columns: ["evaluator_user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "evaluations_location_uid_fkey"
            columns: ["location_uid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uid"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      role: "admin" | "manager" | "appUser"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      role: ["admin", "manager", "appUser"],
    },
  },
} as const
