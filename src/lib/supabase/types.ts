export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cycles: {
        Row: {
          created_at: string
          distribution_date: string | null
          id: string
          is_open: boolean
          program_year_id: string
          season: string
        }
        Insert: {
          created_at?: string
          distribution_date?: string | null
          id?: string
          is_open?: boolean
          program_year_id: string
          season: string
        }
        Update: {
          created_at?: string
          distribution_date?: string | null
          id?: string
          is_open?: boolean
          program_year_id?: string
          season?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_program_year_id_fkey"
            columns: ["program_year_id"]
            isOneToOne: false
            referencedRelation: "program_years"
            referencedColumns: ["id"]
          },
        ]
      }
      distributions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          method: string
          notes: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          method: string
          notes?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          method?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          cycle_id: string
          grade: string
          id: string
          menstruation_preference: string | null
          pack_code: string
          school_district: string
          school_name: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          grade: string
          id?: string
          menstruation_preference?: string | null
          pack_code: string
          school_district: string
          school_name: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          grade?: string
          id?: string
          menstruation_preference?: string | null
          pack_code?: string
          school_district?: string
          school_name?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          county: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          phone: string
          student_id: string
          zip_code: string
        }
        Insert: {
          county: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_primary?: boolean
          last_name: string
          phone: string
          student_id: string
          zip_code: string
        }
        Update: {
          county?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string
          phone?: string
          student_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      program_years: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          district: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          district: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          district?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          date_of_birth: string
          duplicate_of_id: string | null
          ethnic_hair_preference: boolean
          ethnicity: string[]
          first_name: string
          gender: string
          id: string
          is_duplicate: boolean
          is_unenrolled: boolean
          last_name: string
          notes: string | null
          refresh_id: number
          school_student_id: string | null
          unenrolled_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          duplicate_of_id?: string | null
          ethnic_hair_preference?: boolean
          ethnicity?: string[]
          first_name: string
          gender: string
          id?: string
          is_duplicate?: boolean
          is_unenrolled?: boolean
          last_name: string
          notes?: string | null
          refresh_id?: number
          school_student_id?: string | null
          unenrolled_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          duplicate_of_id?: string | null
          ethnic_hair_preference?: boolean
          ethnicity?: string[]
          first_name?: string
          gender?: string
          id?: string
          is_duplicate?: boolean
          is_unenrolled?: boolean
          last_name?: string
          notes?: string | null
          refresh_id?: number
          school_student_id?: string | null
          unenrolled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_duplicate_of_id_fkey"
            columns: ["duplicate_of_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
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
