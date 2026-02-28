import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'user' | 'admin'
        }
        Update: {
          email?: string
          full_name?: string | null
          role?: 'user' | 'admin'
        }
      }
      recipes: {
        Row: {
          id: string
          name: string
          ingredients: string[]
          instructions: string[]
          cuisine_type: string | null
          prep_time_minutes: number | null
          image_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          ingredients: string[]
          instructions: string[]
          cuisine_type?: string | null
          prep_time_minutes?: number | null
          image_url?: string | null
          created_by: string
        }
        Update: {
          name?: string
          ingredients?: string[]
          instructions?: string[]
          cuisine_type?: string | null
          prep_time_minutes?: number | null
          image_url?: string | null
        }
      }
      user_recipe_status: {
        Row: {
          id: string
          user_id: string
          recipe_id: string
          status: 'favorite' | 'to_try' | 'made_before'
          created_at: string
        }
        Insert: {
          user_id: string
          recipe_id: string
          status: 'favorite' | 'to_try' | 'made_before'
        }
        Update: {
          status?: 'favorite' | 'to_try' | 'made_before'
        }
      }
      recipe_shares: {
        Row: {
          id: string
          recipe_id: string
          shared_by: string
          shared_with: string
          permission: 'view' | 'edit'
          created_at: string
        }
        Insert: {
          recipe_id: string
          shared_by: string
          shared_with: string
          permission?: 'view' | 'edit'
        }
        Update: {
          permission?: 'view' | 'edit'
        }
      }
      public_recipe_links: {
        Row: {
          id: string
          recipe_id: string
          created_by: string
          is_active: boolean
          created_at: string
          expires_at: string | null
        }
        Insert: {
          recipe_id: string
          created_by: string
          is_active?: boolean
          expires_at?: string | null
        }
        Update: {
          is_active?: boolean
          expires_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'recipe_shared' | 'recipe_updated' | 'recipe_deleted'
          title: string
          message: string
          recipe_id: string | null
          shared_by: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          type: 'recipe_shared' | 'recipe_updated' | 'recipe_deleted'
          title: string
          message: string
          recipe_id?: string | null
          shared_by?: string | null
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
    }
  }
}