import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

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
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required')
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key are required')
    }
    if (!target.hasOwnProperty('_admin')) {
      (target as any)._admin = createClient(supabaseUrl, supabaseAnonKey)
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
