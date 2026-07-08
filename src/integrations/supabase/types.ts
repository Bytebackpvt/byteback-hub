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
      ai_events: {
        Row: {
          category: string | null
          confidence: number | null
          created_at: string
          detail: string | null
          event_type: string
          id: string
          lead_email: string | null
          meta: Json
          next_action: string | null
          reason: string | null
          thread_id: string | null
          title: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          lead_email?: string | null
          meta?: Json
          next_action?: string | null
          reason?: string | null
          thread_id?: string | null
          title: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          confidence?: number | null
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          lead_email?: string | null
          meta?: Json
          next_action?: string | null
          reason?: string | null
          thread_id?: string | null
          title?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          correction: string | null
          created_at: string
          id: string
          meta: Json
          suggestion_type: string
          suggestion_value: string
          thread_id: string | null
          user_id: string
          verdict: string
          workspace_id: string
        }
        Insert: {
          correction?: string | null
          created_at?: string
          id?: string
          meta?: Json
          suggestion_type: string
          suggestion_value: string
          thread_id?: string | null
          user_id: string
          verdict: string
          workspace_id: string
        }
        Update: {
          correction?: string | null
          created_at?: string
          id?: string
          meta?: Json
          suggestion_type?: string
          suggestion_value?: string
          thread_id?: string | null
          user_id?: string
          verdict?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_cache: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_cache_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          first_seen_at: string
          id: string
          last_seen_at: string
          meta: Json
          name: string | null
          source: string | null
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          meta?: Json
          name?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          meta?: Json
          name?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          category: string | null
          confidence: number | null
          contact_id: string | null
          created_at: string
          id: string
          last_activity_at: string
          meta: Json
          priority: string | null
          source: string
          stage: string
          thread_id: string | null
          updated_at: string
          value_estimate: number | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          meta?: Json
          priority?: string | null
          source?: string
          stage?: string
          thread_id?: string | null
          updated_at?: string
          value_estimate?: number | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          meta?: Json
          priority?: string | null
          source?: string
          stage?: string
          thread_id?: string | null
          updated_at?: string
          value_estimate?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          created_at: string
          email: string
          id: string
          provider: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          provider: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          provider?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_embeddings: {
        Row: {
          category: string | null
          company: string | null
          contact_email: string | null
          contact_name: string | null
          content: string
          created_at: string
          embedding: string
          id: string
          metadata: Json
          subject: string | null
          thread_id: string | null
          workspace_id: string
        }
        Insert: {
          category?: string | null
          company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          content: string
          created_at?: string
          embedding: string
          id?: string
          metadata?: Json
          subject?: string | null
          thread_id?: string | null
          workspace_id: string
        }
        Update: {
          category?: string | null
          company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          metadata?: Json
          subject?: string | null
          thread_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_embeddings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          category: string | null
          confidence: number | null
          contact_email: string | null
          contact_id: string | null
          created_at: string
          id: string
          last_body: string | null
          last_received_at: string | null
          mailbox: string | null
          meta: Json
          priority: string | null
          source: string
          subject: string | null
          thread_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          contact_email?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_body?: string | null
          last_received_at?: string | null
          mailbox?: string | null
          meta?: Json
          priority?: string | null
          source?: string
          subject?: string | null
          thread_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          confidence?: number | null
          contact_email?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_body?: string | null
          last_received_at?: string | null
          mailbox?: string | null
          meta?: Json
          priority?: string | null
          source?: string
          subject?: string | null
          thread_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_catalog: {
        Row: {
          auth_type: string
          category: string
          created_at: string
          docs_url: string | null
          id: string
          logo_slug: string | null
          name: string
          sort_order: number
          status: string
          tagline: string
          updated_at: string
        }
        Insert: {
          auth_type?: string
          category: string
          created_at?: string
          docs_url?: string | null
          id: string
          logo_slug?: string | null
          name: string
          sort_order?: number
          status?: string
          tagline: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          category?: string
          created_at?: string
          docs_url?: string | null
          id?: string
          logo_slug?: string | null
          name?: string
          sort_order?: number
          status?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          provider_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          provider_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          provider_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          created_at: string
          id: string
          lead_key: string
          reason: string
          score: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_key: string
          reason?: string
          score: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_key?: string
          reason?: string
          score?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          prefs: Json
          quiet_hours_enabled: boolean
          quiet_hours_end: number
          quiet_hours_start: number
          timezone: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prefs?: Json
          quiet_hours_enabled?: boolean
          quiet_hours_end?: number
          quiet_hours_start?: number
          timezone?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prefs?: Json
          quiet_hours_enabled?: boolean
          quiet_hours_end?: number
          quiet_hours_start?: number
          timezone?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          meta: Json
          pinned: boolean
          read_at: string | null
          snoozed_until: string | null
          thread_key: string | null
          title: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          meta?: Json
          pinned?: boolean
          read_at?: string | null
          snoozed_until?: string | null
          thread_key?: string | null
          title: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          meta?: Json
          pinned?: boolean
          read_at?: string | null
          snoozed_until?: string | null
          thread_key?: string | null
          title?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_connections: {
        Row: {
          access_token_enc: string | null
          account_email: string | null
          account_label: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_error: string | null
          meta: Json
          provider: string
          refresh_token_enc: string | null
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token_enc?: string | null
          account_email?: string | null
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          meta?: Json
          provider: string
          refresh_token_enc?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token_enc?: string | null
          account_email?: string | null
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_error?: string | null
          meta?: Json
          provider?: string
          refresh_token_enc?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          automation: Json
          color: string
          created_at: string
          icon: string
          id: string
          is_lost: boolean
          is_won: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          automation?: Json
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          automation?: Json
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          alert_enabled: boolean
          created_at: string
          filters: Json
          id: string
          last_checked_at: string | null
          last_seen_ids: Json
          name: string
          query: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_checked_at?: string | null
          last_seen_ids?: Json
          name: string
          query: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          filters?: Json
          id?: string
          last_checked_at?: string | null
          last_seen_ids?: Json
          name?: string
          query?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          created_at: string
          cursor: string | null
          id: string
          last_error: string | null
          last_ok_at: string | null
          last_run_at: string | null
          source: string
          stats: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          cursor?: string | null
          id?: string
          last_error?: string | null
          last_ok_at?: string | null
          last_run_at?: string | null
          source: string
          stats?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          cursor?: string | null
          id?: string
          last_error?: string | null
          last_ok_at?: string | null
          last_run_at?: string | null
          source?: string
          stats?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_state_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          done: boolean
          due: string | null
          id: string
          linked_to: string
          priority: string
          source: string
          thread_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due?: string | null
          id?: string
          linked_to?: string
          priority?: string
          source?: string
          thread_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due?: string | null
          id?: string
          linked_to?: string
          priority?: string
          source?: string
          thread_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ui_prefs: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_integrations: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          health_status: string
          id: string
          label: string | null
          last_error_at: string | null
          last_error_msg: string | null
          last_sync_at: string | null
          mailbox_count: number
          provider: string
          secret: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          health_status?: string
          id?: string
          label?: string | null
          last_error_at?: string | null
          last_error_msg?: string | null
          last_sync_at?: string | null
          mailbox_count?: number
          provider: string
          secret?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          health_status?: string
          id?: string
          label?: string | null
          last_error_at?: string | null
          last_error_msg?: string | null
          last_sync_at?: string | null
          mailbox_count?: number
          provider?: string
          secret?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          business_type: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          business_type?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_email_embeddings: {
        Args: { _limit?: number; _query: string; _workspace_id: string }
        Returns: {
          category: string
          company: string
          contact_email: string
          contact_name: string
          content: string
          created_at: string
          id: string
          similarity: number
          subject: string
          thread_id: string
        }[]
      }
    }
    Enums: {
      notification_kind:
        | "hot_lead"
        | "new_reply"
        | "lost_lead"
        | "followup"
        | "info"
      workspace_role: "owner" | "admin" | "member" | "viewer"
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
      notification_kind: [
        "hot_lead",
        "new_reply",
        "lost_lead",
        "followup",
        "info",
      ],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
