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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          case_id: string | null
          created_at: string
          details: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          case_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          case_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      case_messages: {
        Row: {
          author: Database["public"]["Enums"]["author_type"]
          body: string
          case_id: string
          created_at: string
          id: string
        }
        Insert: {
          author: Database["public"]["Enums"]["author_type"]
          body: string
          case_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author?: Database["public"]["Enums"]["author_type"]
          body?: string
          case_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_to: string | null
          case_code: string
          category: Database["public"]["Enums"]["case_category"]
          constituency: string
          contact_method: string | null
          contact_value: string | null
          created_at: string
          description: string
          escalated_at: string | null
          escalation_authority: string | null
          escalation_status: string
          escalation_target: string | null
          forwarded_at: string | null
          forwarded_by: string | null
          forwarded_reference: string | null
          id: string
          intervention_notes: string | null
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
          urgency: Database["public"]["Enums"]["case_urgency"]
          ward: string | null
        }
        Insert: {
          assigned_to?: string | null
          case_code?: string
          category: Database["public"]["Enums"]["case_category"]
          constituency: string
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string
          description: string
          escalated_at?: string | null
          escalation_authority?: string | null
          escalation_status?: string
          escalation_target?: string | null
          forwarded_at?: string | null
          forwarded_by?: string | null
          forwarded_reference?: string | null
          id?: string
          intervention_notes?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["case_urgency"]
          ward?: string | null
        }
        Update: {
          assigned_to?: string | null
          case_code?: string
          category?: Database["public"]["Enums"]["case_category"]
          constituency?: string
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string
          description?: string
          escalated_at?: string | null
          escalation_authority?: string | null
          escalation_status?: string
          escalation_target?: string | null
          forwarded_at?: string | null
          forwarded_by?: string | null
          forwarded_reference?: string | null
          id?: string
          intervention_notes?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["case_urgency"]
          ward?: string | null
        }
        Relationships: []
      }
      mentor_pool: {
        Row: {
          active_caseload: number
          capacity: number
          constituency: string
          contact: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          languages: string[]
          notes: string | null
          skills: string[]
          updated_at: string
        }
        Insert: {
          active_caseload?: number
          capacity?: number
          constituency: string
          contact?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          languages?: string[]
          notes?: string | null
          skills?: string[]
          updated_at?: string
        }
        Update: {
          active_caseload?: number
          capacity?: number
          constituency?: string
          contact?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          languages?: string[]
          notes?: string | null
          skills?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          contact: string | null
          created_at: string
          description: string
          id: string
          location: string | null
          title: string
          url: string | null
        }
        Insert: {
          category: string
          contact?: string | null
          created_at?: string
          description: string
          id?: string
          location?: string | null
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          contact?: string | null
          created_at?: string
          description?: string
          id?: string
          location?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          constituency: string | null
          contact: string | null
          created_at: string
          description: string
          display_name: string | null
          id: string
          type: Database["public"]["Enums"]["support_type"]
        }
        Insert: {
          constituency?: string | null
          contact?: string | null
          created_at?: string
          description: string
          display_name?: string | null
          id?: string
          type: Database["public"]["Enums"]["support_type"]
        }
        Update: {
          constituency?: string | null
          contact?: string | null
          created_at?: string
          description?: string
          display_name?: string | null
          id?: string
          type?: Database["public"]["Enums"]["support_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      generate_case_code: { Args: never; Returns: string }
      get_case_by_code: { Args: { p_code: string }; Returns: Json }
      grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_escalation_forwarded: {
        Args: { p_case_id: string; p_reference?: string }
        Returns: undefined
      }
      post_reporter_message: {
        Args: { p_body: string; p_code: string }
        Returns: string
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user: string
        }
        Returns: undefined
      }
      submit_anonymous_case: {
        Args: {
          p_category: Database["public"]["Enums"]["case_category"]
          p_constituency: string
          p_contact_method?: string
          p_contact_value?: string
          p_description?: string
          p_escalation_authority?: string
          p_escalation_target?: string
          p_urgency?: Database["public"]["Enums"]["case_urgency"]
          p_ward?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "mentor"
      author_type: "reporter" | "admin" | "system"
      case_category:
        | "sudden_isolation"
        | "harmful_online_influence"
        | "school_dropout_risk"
        | "emotional_distress"
        | "violent_rhetoric"
        | "recruitment_concerns"
        | "substance_abuse"
        | "family_community_conflict"
      case_status:
        | "submitted"
        | "under_review"
        | "verified"
        | "intervention_assigned"
        | "active_support"
        | "monitoring"
        | "resolved"
      case_urgency: "low" | "moderate" | "urgent" | "critical"
      support_type:
        | "mentorship"
        | "counseling"
        | "jobs"
        | "education"
        | "mental_health"
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
      app_role: ["admin", "coordinator", "mentor"],
      author_type: ["reporter", "admin", "system"],
      case_category: [
        "sudden_isolation",
        "harmful_online_influence",
        "school_dropout_risk",
        "emotional_distress",
        "violent_rhetoric",
        "recruitment_concerns",
        "substance_abuse",
        "family_community_conflict",
      ],
      case_status: [
        "submitted",
        "under_review",
        "verified",
        "intervention_assigned",
        "active_support",
        "monitoring",
        "resolved",
      ],
      case_urgency: ["low", "moderate", "urgent", "critical"],
      support_type: [
        "mentorship",
        "counseling",
        "jobs",
        "education",
        "mental_health",
      ],
    },
  },
} as const
