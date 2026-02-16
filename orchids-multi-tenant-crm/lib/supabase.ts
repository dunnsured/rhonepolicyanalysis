import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service role (for API routes)
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Database types (generate with Supabase CLI in production)
export interface Client {
  id: string
  name: string
  industry: string
  contact_email: string
  contact_name: string
  priority_tier: 'normal' | 'high' | 'vip'
  created_at: string
  updated_at: string
  user_id: string
}

export interface Policy {
  id: string
  client_id: string
  file_name: string
  file_path: string
  file_size: number
  uploaded_by: string
  analysis_id: string | null
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed'
  overall_score: number | null
  recommendation: string | null
  report_url: string | null
  analysis_data: Record<string, unknown> | null
  analysis_completed_at: string | null
  analysis_error: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'analyst' | 'viewer'
  created_at: string
}
