import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey)

export async function getSupabaseUser() {
  const { data, error } = await supabase.auth.getUser()
  return { user: data?.user, error }
}

export async function getSupabaseSession() {
  const { data, error } = await supabase.auth.getSession()
  return { session: data?.session, error }
}
