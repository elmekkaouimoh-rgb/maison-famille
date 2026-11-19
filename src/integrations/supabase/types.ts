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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          amount: number
          month: string
        }
        Insert: {
          amount?: number
          month: string
        }
        Update: {
          amount?: number
          month?: string
        }
        Relationships: []
      }
      clothing_items: {
        Row: {
          category: string
          condition: string | null
          created_at: string
          done: boolean
          id: string
          kind: string
          location: string | null
          member_id: string | null
          price: number | null
          priority: string
          quantity: number
          season: string
          size: string | null
          title: string
          to_member_id: string | null
        }
        Insert: {
          category?: string
          condition?: string | null
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          location?: string | null
          member_id?: string | null
          price?: number | null
          priority?: string
          quantity?: number
          season?: string
          size?: string | null
          title: string
          to_member_id?: string | null
        }
        Update: {
          category?: string
          condition?: string | null
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          location?: string | null
          member_id?: string | null
          price?: number | null
          priority?: string
          quantity?: number
          season?: string
          size?: string | null
          title?: string
          to_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clothing_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clothing_items_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      clothing_sizes: {
        Row: {
          bottom: string | null
          height_cm: number | null
          member_id: string
          notes: string | null
          pajamas: string | null
          shoes: string | null
          top: string | null
          updated_at: string
        }
        Insert: {
          bottom?: string | null
          height_cm?: number | null
          member_id: string
          notes?: string | null
          pajamas?: string | null
          shoes?: string | null
          top?: string | null
          updated_at?: string
        }
        Update: {
          bottom?: string | null
          height_cm?: number | null
          member_id?: string
          notes?: string | null
          pajamas?: string | null
          shoes?: string | null
          top?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clothing_sizes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          last_read_at: string
          member_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          member_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          icon: string
          id: string
          last_message_at: string
          title: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          last_message_at?: string
          title: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          last_message_at?: string
          title?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          category: string
          created_at: string
          end_at: string | null
          id: string
          member_ids: string[]
          notes: string | null
          recurrence: string
          start_at: string
          title: string
        }
        Insert: {
          all_day?: boolean
          category?: string
          created_at?: string
          end_at?: string | null
          id?: string
          member_ids?: string[]
          notes?: string | null
          recurrence?: string
          start_at: string
          title: string
        }
        Update: {
          all_day?: boolean
          category?: string
          created_at?: string
          end_at?: string | null
          id?: string
          member_ids?: string[]
          notes?: string | null
          recurrence?: string
          start_at?: string
          title?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          created_at: string
          day: string | null
          details: string | null
          id: string
          kind: string
          member_id: string
          title: string
        }
        Insert: {
          created_at?: string
          day?: string | null
          details?: string | null
          id?: string
          kind: string
          member_id: string
          title: string
        }
        Update: {
          created_at?: string
          day?: string | null
          details?: string | null
          id?: string
          kind?: string
          member_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          day: string
          id: string
          ingredients: string[]
          slot: string
          title: string
        }
        Insert: {
          day: string
          id?: string
          ingredients?: string[]
          slot: string
          title: string
        }
        Update: {
          day?: string
          id?: string
          ingredients?: string[]
          slot?: string
          title?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          active: boolean
          avatar: string
          birth_date: string
          color: string
          created_at: string
          family_role: Database["public"]["Enums"]["app_role"]
          first_name: string
          id: string
          interface: string
          must_change_password: boolean
          photo_path: string | null
          points: number
          sex: string
          sort: number
          user_id: string | null
          username: string | null
        }
        Insert: {
          active?: boolean
          avatar?: string
          birth_date: string
          color?: string
          created_at?: string
          family_role?: Database["public"]["Enums"]["app_role"]
          first_name: string
          id?: string
          interface?: string
          must_change_password?: boolean
          photo_path?: string | null
          points?: number
          sex?: string
          sort?: number
          user_id?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean
          avatar?: string
          birth_date?: string
          color?: string
          created_at?: string
          family_role?: Database["public"]["Enums"]["app_role"]
          first_name?: string
          id?: string
          interface?: string
          must_change_password?: boolean
          photo_path?: string | null
          points?: number
          sex?: string
          sort?: number
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      memories: {
        Row: {
          created_at: string
          created_by: string | null
          day: string
          description: string | null
          favorite: boolean
          file_path: string | null
          id: string
          kind: string
          member_ids: string[]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day?: string
          description?: string | null
          favorite?: boolean
          file_path?: string | null
          id?: string
          kind?: string
          member_ids?: string[]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day?: string
          description?: string | null
          favorite?: boolean
          file_path?: string | null
          id?: string
          kind?: string
          member_ids?: string[]
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          member_id: string
          read: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          member_id: string
          read?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          member_id?: string
          read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_claims: {
        Row: {
          created_at: string
          id: string
          member_id: string
          reward_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          reward_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          reward_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost: number
          created_at: string
          icon: string
          id: string
          title: string
        }
        Insert: {
          cost?: number
          created_at?: string
          icon?: string
          id?: string
          title: string
        }
        Update: {
          cost?: number
          created_at?: string
          icon?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      routine_checks: {
        Row: {
          day: string
          id: string
          member_id: string
          routine_id: string
        }
        Insert: {
          day?: string
          id?: string
          member_id: string
          routine_id: string
        }
        Update: {
          day?: string
          id?: string
          member_id?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_checks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_checks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          icon: string
          id: string
          member_id: string
          period: string
          sort: number
          title: string
        }
        Insert: {
          icon?: string
          id?: string
          member_id: string
          period?: string
          sort?: number
          title: string
        }
        Update: {
          icon?: string
          id?: string
          member_id?: string
          period?: string
          sort?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      school_items: {
        Row: {
          created_at: string
          done: boolean
          due_date: string | null
          grade: number | null
          id: string
          kind: string
          member_id: string
          out_of: number | null
          subject: string | null
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          grade?: number | null
          id?: string
          kind?: string
          member_id: string
          out_of?: number | null
          subject?: string | null
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          grade?: number | null
          id?: string
          kind?: string
          member_id?: string
          out_of?: number | null
          subject?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      school_profiles: {
        Row: {
          class_name: string | null
          member_id: string
          notes: string | null
          school: string | null
          teacher: string | null
        }
        Insert: {
          class_name?: string | null
          member_id: string
          notes?: string | null
          school?: string | null
          teacher?: string | null
        }
        Update: {
          class_name?: string | null
          member_id?: string
          notes?: string | null
          school?: string | null
          teacher?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          category: string
          created_at: string
          done: boolean
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          done?: boolean
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          done?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          comment: string | null
          created_at: string
          description: string | null
          due_date: string | null
          frequency: string
          icon: string
          id: string
          member_id: string
          points: number
          status: string
          title: string
          validated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          frequency?: string
          icon?: string
          id?: string
          member_id: string
          points?: number
          status?: string
          title: string
          validated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          frequency?: string
          icon?: string
          id?: string
          member_id?: string
          points?: number
          status?: string
          title?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          day: string
          id: string
          kind: string
          label: string
          member_id: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          day?: string
          id?: string
          kind?: string
          label: string
          member_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          day?: string
          id?: string
          kind?: string
          label?: string
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veille_items: {
        Row: {
          category: string
          child_visible: boolean
          class_average: number | null
          coefficient: number | null
          collected_at: string
          day: string | null
          description: string | null
          document_url: string | null
          done_state: string
          ends_at: string | null
          first_seen: string
          grade: number | null
          grade_raw: string | null
          grade_status: string | null
          id: string
          justified: boolean | null
          last_seen: string
          location: string | null
          member_id: string
          out_of: number | null
          period: string | null
          possible_duplicate: boolean
          source_id: string
          source_key: string
          source_status: string | null
          starts_at: string | null
          subject: string | null
          title: string
          uncertainties: string[]
        }
        Insert: {
          category: string
          child_visible?: boolean
          class_average?: number | null
          coefficient?: number | null
          collected_at: string
          day?: string | null
          description?: string | null
          document_url?: string | null
          done_state?: string
          ends_at?: string | null
          first_seen?: string
          grade?: number | null
          grade_raw?: string | null
          grade_status?: string | null
          id?: string
          justified?: boolean | null
          last_seen?: string
          location?: string | null
          member_id: string
          out_of?: number | null
          period?: string | null
          possible_duplicate?: boolean
          source_id: string
          source_key: string
          source_status?: string | null
          starts_at?: string | null
          subject?: string | null
          title: string
          uncertainties?: string[]
        }
        Update: {
          category?: string
          child_visible?: boolean
          class_average?: number | null
          coefficient?: number | null
          collected_at?: string
          day?: string | null
          description?: string | null
          document_url?: string | null
          done_state?: string
          ends_at?: string | null
          first_seen?: string
          grade?: number | null
          grade_raw?: string | null
          grade_status?: string | null
          id?: string
          justified?: boolean | null
          last_seen?: string
          location?: string | null
          member_id?: string
          out_of?: number | null
          period?: string | null
          possible_duplicate?: boolean
          source_id?: string
          source_key?: string
          source_status?: string | null
          starts_at?: string | null
          subject?: string | null
          title?: string
          uncertainties?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "veille_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veille_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "veille_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      veille_runs: {
        Row: {
          collected_at: string | null
          coverage: Json
          created: number
          created_at: string
          duplicates: number
          errors: Json
          id: string
          rejected: number
          source_id: string
          unchanged: number
          updated: number
        }
        Insert: {
          collected_at?: string | null
          coverage?: Json
          created?: number
          created_at?: string
          duplicates?: number
          errors?: Json
          id?: string
          rejected?: number
          source_id: string
          unchanged?: number
          updated?: number
        }
        Update: {
          collected_at?: string | null
          coverage?: Json
          created?: number
          created_at?: string
          duplicates?: number
          errors?: Json
          id?: string
          rejected?: number
          source_id?: string
          unchanged?: number
          updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "veille_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "veille_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      veille_sources: {
        Row: {
          active: boolean
          categories: string[]
          child_categories: string[]
          created_at: string
          domain: string
          id: string
          label: string
          member_id: string
          url: string
        }
        Insert: {
          active?: boolean
          categories?: string[]
          child_categories?: string[]
          created_at?: string
          domain: string
          id?: string
          label: string
          member_id: string
          url: string
        }
        Update: {
          active?: boolean
          categories?: string[]
          child_categories?: string[]
          created_at?: string
          domain?: string
          id?: string
          label?: string
          member_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "veille_sources_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      wardrobe_digests: {
        Row: {
          created_at: string
          id: string
          recommendations: Json
          status: string
          summary: string
          validated_at: string | null
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          recommendations?: Json
          status?: string
          summary: string
          validated_at?: string | null
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          recommendations?: Json
          status?: string
          summary?: string
          validated_at?: string | null
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_memory_file: { Args: { _path: string }; Returns: boolean }
      conversation_people: {
        Args: never
        Returns: {
          avatar: string
          color: string
          first_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      in_conversation: { Args: { _conv: string }; Returns: boolean }
      is_family: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      my_member_id: { Args: never; Returns: string }
      veille_import: {
        Args: { _apply: boolean; _items: Json; _source: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "adulte" | "ado" | "enfant" | "petit"
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
      app_role: ["admin", "adulte", "ado", "enfant", "petit"],
    },
  },
} as const
