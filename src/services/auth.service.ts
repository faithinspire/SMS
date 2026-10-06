import { supabase } from '@/lib/supabase-client'
import { fallbackSchoolAdminLogin, checkFallbackSession, getFallbackSession, clearFallbackSession } from '@/lib/fallback-auth'
import { User as DbUser } from '@/types'

// Auth Service User interface (for auth purposes)
export interface User {
  id: string
  email: string
  name: string
  full_name?: string // Alias for name (for backwards compatibility)
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SCHOOL_ADMIN' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'TEACHER' | 'ACCOUNTANT' | 'STAFF' | 'STUDENT'
  school_id?: string
  createdAt: string
  loginMethod?: 'auth' | 'fallback'
}

export interface School {
  id: string
  name: string
  logo_url?: string
}

export interface RegisterSuperAdminInput {
  email: string
  password: string
  fullName: string
}

export interface RegisterSchoolAdminInput {
  email: string
  password: string
  fullName: string
  school_id: string
}

export interface RegisterStaffInput {
  email: string
  password: string
  fullName: string
  school_id: string
  role?: 'TEACHER' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT'
}

export interface RegisterStudentInput {
  email: string
  password: string
  fullName: string
  school_id: string
}

export interface LoginInput {
  email: string
  password: string
}

export class AuthService {
  // Get All Schools (for dropdowns)
  static async getAllSchools(): Promise<School[]> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, logo_url')
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Get schools error:', error)
      return []
    }
  }

  // Super Admin Registration
  static async registerSuperAdmin(input: RegisterSuperAdminInput): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.fullName,
            role: 'SUPER_ADMIN',
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Super Admin registration failed')

      // Sync user to public.users table via pending_auth_users
      try {
        await supabase.rpc('register_pending_auth_user', {
          p_auth_user_id: data.user.id,
          p_email: input.email,
          p_role: 'SUPER_ADMIN',
          p_school_id: null,
          p_full_name: input.fullName,
        })
      } catch (syncError) {
        console.warn('User sync queueing failed (non-critical):', syncError)
      }

      // For development: Store user as confirmed by doing an immediate sign-in
      // This works because the user just created their account
      try {
        const confirmResponse = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        })
        
        if (confirmResponse.error?.message?.includes('Email not confirmed')) {
          // Email verification required - inform user
          console.warn('Email confirmation required - user must verify email before login')
        }
      } catch (e) {
        console.warn('Auto-confirm attempt (non-critical):', e)
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: input.fullName,
        role: 'SUPER_ADMIN',
        createdAt: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('Super Admin registration error:', error)
      throw new Error(error.message || 'Super Admin registration failed')
    }
  }

  // School Admin Registration
  static async registerSchoolAdmin(input: RegisterSchoolAdminInput): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.fullName,
            role: 'ADMIN',
            school_id: input.school_id,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('School Admin registration failed')

      // Sync user to public.users table via pending_auth_users
      try {
        await supabase.rpc('register_pending_auth_user', {
          p_auth_user_id: data.user.id,
          p_email: input.email,
          p_role: 'ADMIN',
          p_school_id: input.school_id,
          p_full_name: input.fullName,
        })
      } catch (syncError) {
        console.warn('User sync queueing failed (non-critical):', syncError)
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: input.fullName,
        role: 'ADMIN',
        school_id: input.school_id,
        createdAt: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('School Admin registration error:', error)
      throw new Error(error.message || 'School Admin registration failed')
    }
  }

  // Staff Registration - supports TEACHER, PRINCIPAL, HEAD_TEACHER, ACCOUNTANT roles
  static async registerStaff(input: RegisterStaffInput): Promise<User> {
    try {
      const staffRole = input.role || 'TEACHER'
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.fullName,
            role: staffRole,
            school_id: input.school_id,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Staff registration failed')

      // Sync user to public.users table via pending_auth_users
      try {
        await supabase.rpc('register_pending_auth_user', {
          p_auth_user_id: data.user.id,
          p_email: input.email,
          p_role: staffRole,
          p_school_id: input.school_id,
          p_full_name: input.fullName,
        })
      } catch (syncError) {
        console.warn('User sync queueing failed (non-critical):', syncError)
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: input.fullName,
        role: staffRole as any,
        school_id: input.school_id,
        createdAt: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('Staff registration error:', error)
      throw new Error(error.message || 'Staff registration failed')
    }
  }

  // Accountant Registration (uses the registerStaff method with ACCOUNTANT role)
  static async registerAccountant(input: RegisterStaffInput): Promise<User> {
    return this.registerStaff({ ...input, role: 'ACCOUNTANT' })
  }

  // Principal Registration (uses the registerStaff method with PRINCIPAL role)
  static async registerPrincipal(input: RegisterStaffInput): Promise<User> {
    return this.registerStaff({ ...input, role: 'PRINCIPAL' })
  }

  // Headmaster Registration (uses the registerStaff method with HEAD_TEACHER role)
  static async registerHeadmaster(input: RegisterStaffInput): Promise<User> {
    return this.registerStaff({ ...input, role: 'HEAD_TEACHER' })
  }

  // Teacher Registration (uses the registerStaff method with TEACHER role)
  static async registerTeacher(input: RegisterStaffInput): Promise<User> {
    return this.registerStaff({ ...input, role: 'TEACHER' })
  }

  // Student Registration
  static async registerStudent(input: RegisterStudentInput): Promise<User> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name: input.fullName,
            role: 'STUDENT',
            school_id: input.school_id,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Student registration failed')

      // Sync user to public.users table via pending_auth_users
      try {
        await supabase.rpc('register_pending_auth_user', {
          p_auth_user_id: data.user.id,
          p_email: input.email,
          p_role: 'STUDENT',
          p_school_id: input.school_id,
          p_full_name: input.fullName,
        })
      } catch (syncError) {
        console.warn('User sync queueing failed (non-critical):', syncError)
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: input.fullName,
        role: 'STUDENT',
        school_id: input.school_id,
        createdAt: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('Student registration error:', error)
      throw new Error(error.message || 'Student registration failed')
    }
  }

  // Generic Login with Fallback
  static async login(input: LoginInput): Promise<{ user: User; token: string }> {
    try {
      // First, try Supabase Auth with retries
      console.log('🔐 Attempting primary login via Supabase Auth...')
      
      let lastError: any
      let authResponse: any = null

      // Retry logic for network resilience
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          authResponse = await supabase.auth.signInWithPassword({
            email: input.email,
            password: input.password,
          })
          
          // If we get a response, break out of retry loop
          if (authResponse && (authResponse.data || authResponse.error)) {
            break
          }
        } catch (e: any) {
          lastError = e
          if (attempt < 2) {
            console.log(`Retry attempt ${attempt + 1}/2...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          }
        }
      }

      if (!authResponse) {
        throw lastError || new Error('Failed to connect to auth service')
      }

      const { data, error } = authResponse

      // Handle email not confirmed error - allow login anyway for development
      if (error?.message?.includes('Email not confirmed')) {
        console.warn('⚠️ Email not confirmed - attempting alternative login for development')
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user) {
          return {
            user: {
              id: userData.user.id,
              email: userData.user.email || '',
              name: userData.user.user_metadata?.name || '',
              role: userData.user.user_metadata?.role || 'STUDENT',
              schoolId: userData.user.user_metadata?.schoolId,
              createdAt: userData.user.created_at,
              loginMethod: 'auth',
            },
            token: '', // Will use session token
          }
        }
      }

      // If Supabase Auth succeeds, return user with role-based school_id from users table
      if (!error && data?.user) {
        console.log('✅ Primary login successful via Supabase Auth')
        
        // Trigger pending user sync to ensure this user's database record exists
        try {
          await supabase.rpc('sync_pending_auth_users')
        } catch (syncError) {
          console.warn('Pending user sync trigger failed (non-critical):', syncError)
        }
        
        // Fetch user's role and school_id from users table for proper routing
        let userRole = data.user.user_metadata?.role || 'STUDENT'
        let userSchoolId = data.user.user_metadata?.school_id
        
        try {
          const { data: userRecord } = await supabase
            .from('users')
            .select('role, school_id')
            .eq('id', data.user.id)
            .maybeSingle()
          
          if (userRecord) {
            userRole = userRecord.role || userRole
            userSchoolId = userRecord.school_id || userSchoolId
          }
        } catch (e) {
          console.warn('Could not fetch user record from database, using metadata')
        }
        
        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || '',
            role: userRole,
            school_id: userSchoolId,
            createdAt: data.user.created_at,
            loginMethod: 'auth',
          },
          token: data.session?.access_token || '',
        }
      }

      // If Supabase Auth fails, try fallback for school admins
      if (error?.message?.includes('Invalid login credentials') || error?.message?.includes('Invalid email')) {
        console.warn('⚠️ Supabase Auth failed with invalid credentials, attempting fallback login...')
        
        const fallbackResult = await fallbackSchoolAdminLogin(input.email, input.password)
        
        if (fallbackResult.success) {
          console.log('✅ Fallback login successful')
          return {
            user: {
              id: `fallback_${fallbackResult.school_id}`,
              email: fallbackResult.adminEmail || input.email,
              name: `${fallbackResult.schoolName} Admin`,
              role: 'ADMIN',
              school_id: fallbackResult.school_id,
              createdAt: new Date().toISOString(),
              loginMethod: 'fallback',
            },
            token: '',
          }
        }

        // Both methods failed
        throw new Error(fallbackResult.error || 'Invalid email or password')
      }

      // If we get here, there was some other error
      if (error) {
        throw error
      }

      throw new Error('Login failed')
    } catch (error: any) {
      console.error('❌ Login error:', error)
      
      // Better error messages
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
        throw new Error('Connection error. Please check your internet connection and try again.')
      }
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('Email verification pending. Check your email or contact support.')
      }
      if (error.message?.includes('Invalid login credentials') || 
          error.message?.includes('Invalid email') ||
          error.message?.includes('Invalid email or password')) {
        throw new Error('Invalid email or password')
      }
      if (error.message?.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please try again later.')
      }
      
      throw new Error(error.message || 'Login failed. Please try again.')
    }
  }

  // Get Current User
  static async getCurrentUser(): Promise<User | null> {
    try {
      // First check if there's a fallback session
      const fallbackSession = getFallbackSession()
      if (fallbackSession) {
        console.log('📋 Using fallback session for user:', fallbackSession.adminEmail)
        return {
          id: `fallback_${fallbackSession.school_id}`,
          email: fallbackSession.adminEmail,
          name: `${fallbackSession.schoolName} Admin`,
          full_name: `${fallbackSession.schoolName} Admin`,
          role: 'SCHOOL_ADMIN',
          school_id: fallbackSession.school_id,
          createdAt: fallbackSession.loginTime,
          loginMethod: 'fallback',
        }
      }

      // Otherwise check Supabase Auth
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return null

      console.log('👤 Auth user:', data.user.id, 'Email:', data.user.email)
      
      // Get role and school_id from auth metadata first (fastest)
      const metadataRole = data.user.user_metadata?.role as string
      const metadataSchoolId = data.user.user_metadata?.school_id as string
      const metadataFullName = data.user.user_metadata?.name as string

      console.log('🔍 Auth metadata:', { metadataRole, metadataSchoolId, email: data.user.email })

      // PRIORITY 1: If we have school_id in metadata, use it immediately
      if (metadataSchoolId) {
        let mappedRole = metadataRole || 'STUDENT'
        if (mappedRole === 'ADMIN') {
          mappedRole = 'SCHOOL_ADMIN'
        }
        
        console.log('✅ PRIORITY 1: Using school_id from auth metadata:', metadataSchoolId)
        
        return {
          id: data.user.id,
          email: data.user.email || '',
          name: metadataFullName || '',
          full_name: metadataFullName || '',
          role: (mappedRole || 'STUDENT') as any,
          school_id: metadataSchoolId,
          createdAt: data.user.created_at,
          loginMethod: 'auth',
        }
      }

      // PRIORITY 2: If no metadata school_id, try to fetch from users table (for ADMIN/SCHOOL_ADMIN only)
      if (metadataRole === 'SCHOOL_ADMIN' || metadataRole === 'ADMIN') {
        try {
          console.log('🔍 PRIORITY 2: Looking up user record in database...')
          const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('role, school_id, full_name')
            .eq('id', data.user.id)
            .maybeSingle()

          if (!userError && userRecord?.school_id) {
            console.log('✅ PRIORITY 2: Found school_id in users table:', userRecord.school_id)
            
            let mappedRole = userRecord.role === 'ADMIN' ? 'SCHOOL_ADMIN' : userRecord.role
            
            return {
              id: data.user.id,
              email: data.user.email || '',
              name: userRecord.full_name || metadataFullName || '',
              full_name: userRecord.full_name || metadataFullName || '',
              role: (mappedRole || 'STUDENT') as any,
              school_id: userRecord.school_id,
              createdAt: data.user.created_at,
              loginMethod: 'auth',
            }
          } else if (userError) {
            console.warn('⚠️  Database lookup error:', userError.message)
          }
        } catch (dbError) {
          console.warn('⚠️  Database lookup exception:', dbError)
        }
      }

      // PRIORITY 3: Return with whatever we have (even if school_id is missing)
      // Pages will handle missing school_id gracefully
      let mappedRole = metadataRole || 'STUDENT'
      if (mappedRole === 'ADMIN') {
        mappedRole = 'SCHOOL_ADMIN'
      }

      console.log('⚠️  PRIORITY 3: Returning user with role=' + mappedRole + ', school_id=undefined')

      if ((mappedRole === 'SCHOOL_ADMIN' || mappedRole === 'ADMIN') && !metadataSchoolId) {
        console.error('❌ CRITICAL: SCHOOL_ADMIN/ADMIN role but NO school_id found!')
        console.error('   Auth metadata:', JSON.stringify(data.user.user_metadata))
        console.error('   This indicates registration did not store school_id properly')
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: metadataFullName || '',
        full_name: metadataFullName || '',
        role: (mappedRole || 'STUDENT') as any,
        school_id: undefined, // No school_id found
        createdAt: data.user.created_at,
        loginMethod: 'auth',
      }
    } catch (error) {
      console.error('❌ Get user error:', error)
      return null
    }
  }

  // Get Auth Token for API calls
  static async getAuthToken(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        console.warn('No auth session available')
        return null
      }
      return data.session.access_token
    } catch (error) {
      console.error('Get auth token error:', error)
      return null
    }
  }

  // Logout
  static async logout(): Promise<void> {
    try {
      // Clear fallback session if exists
      clearFallbackSession()
      
      // Try to sign out from Supabase
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }
}

