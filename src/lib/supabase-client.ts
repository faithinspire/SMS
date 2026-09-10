import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// CRITICAL: Return dummy object if env vars missing to prevent build-time errors
// This allows the module to load without throwing
const DUMMY_URL = 'https://dummy.supabase.co'
const DUMMY_KEY = 'dummy-key'

// Custom fetch with retry logic and error handling
async function customFetch(url: string | Request, options?: RequestInit): Promise<Response> {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Accept-Encoding': 'gzip, deflate', // Request compression
        },
      })

      // If successful, return the response
      if (response.ok) {
        return response
      }

      // Log non-ok responses but don't retry them
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // For 5xx errors, allow retry
      if (response.status >= 500) {
        lastError = new Error(`Server error: ${response.status}`)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
        return response
      }

      return response
    } catch (error: any) {
      lastError = error
      
      // Retry on network errors
      if (attempt < maxRetries - 1) {
        console.warn(`Fetch attempt ${attempt + 1} failed, retrying...`, error.message)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}

// Lazy initialization - only create client if env vars are available
let supabaseInstance: any = null

function getSupabaseClient() {
  // If env vars are missing during build, use dummy values so module loads
  const url = supabaseUrl || DUMMY_URL
  const key = supabaseAnonKey || DUMMY_KEY
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      fetch: customFetch,
    })
  }
  
  return supabaseInstance
}

export const supabase = new Proxy({}, {
  get: (target, prop) => {
    return getSupabaseClient()[prop]
  },
}) as any

export const supabaseAdmin = new Proxy({}, {
  get: (target, prop) => {
    if (!target.hasOwnProperty('_admin')) {
      const url = supabaseUrl || DUMMY_URL
      const key = supabaseAnonKey || DUMMY_KEY;
      (target as any)._admin = createClient(url, key);
    }
    return (target as any)._admin[prop]
  },
}) as any

export async function getSupabaseUser() {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.getUser()
  return { user: data?.user, error }
}

export async function getSupabaseSession() {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.getSession()
  return { session: data?.session, error }
}
