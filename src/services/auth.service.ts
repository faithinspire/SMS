import { supabase } from '@/lib/supabase-client'
import { fallbackSchoolAdminLogin, checkFallbackSession, getFallbackSession, clearFallbackSession } from '@/lib/fallback-auth'
import { User as DbUser } from '@/types'

// Auth Service User interface (for auth purposes)
export interface User {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SCHOOL_ADMIN' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'TEACHER' | 'ACCOUNTANT' | 'STAFF' | 'STUDENT'
  schoolId?: string
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
  schoolId: string
}

export interface RegisterStaffInput {
  email: string
  password: string
  fullName: string
  schoolId: string
  role?: 'TEACHER' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT'
}

export interface RegisterStudentInput {
  email: string
  password: string
  fullName: string
  schoolId: string
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
            schoolId: input.schoolId,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('School Admin registration failed')

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: input.fullName,
        role: 'ADMIN',
        schoolId: input.schoolId,
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
            schoolId: input.schoolId,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Staff registration failed')

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: input.fullName,
        role: staffRole as any,
        schoolId: input.schoolId,
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
            schoolId: input.schoolId,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Student registration failed')

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: input.fullName,
        role: 'STUDENT',
        schoolId: input.schoolId,
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

      // If Supabase Auth succeeds, return user
      if (!error && data?.user) {
        console.log('✅ Primary login successful via Supabase Auth')
        return {
          user: {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || '',
            role: data.user.user_metadata?.role || 'STUDENT',
            schoolId: data.user.user_metadata?.schoolId,
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
              id: `fallback_${fallbackResult.schoolId}`,
              email: fallbackResult.adminEmail || input.email,
              name: `${fallbackResult.schoolName} Admin`,
              role: 'ADMIN',
              schoolId: fallbackResult.schoolId,
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
          id: `fallback_${fallbackSession.schoolId}`,
          email: fallbackSession.adminEmail,
          name: `${fallbackSession.schoolName} Admin`,
          role: 'SCHOOL_ADMIN',
          schoolId: fallbackSession.schoolId,
          createdAt: fallbackSession.loginTime,
          loginMethod: 'fallback',
        }
      }

      // Otherwise check Supabase Auth
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return null

      console.log('👤 Auth user:', data.user.id, 'Email:', data.user.email)
      
      // PRIMARY: Get role and school_id from users table (authoritative source)
      try {
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('role, school_id, full_name')
          .eq('id', data.user.id)
          .single()

        if (!userError && userRecord) {
          console.log('✅ User record found:', userRecord.role, 'School:', userRecord.school_id)
          return {
            id: data.user.id,
            email: data.user.email || '',
            name: userRecord.full_name || data.user.user_metadata?.name || '',
            role: (userRecord.role || 'STUDENT') as any,
            schoolId: userRecord.school_id,
            createdAt: data.user.created_at,
            loginMethod: 'auth',
          }
        }
      } catch (dbError) {
        console.warn('Could not fetch user record from database:', dbError)
      }

      // FALLBACK: Use metadata if database lookup fails
      const role = data.user.user_metadata?.role as string
      console.log('⚠️ Using metadata role:', role)
      
      return {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || '',
        role: (role || 'STUDENT') as any,
        schoolId: data.user.user_metadata?.schoolId,
        createdAt: data.user.created_at,
        loginMethod: 'auth',
      }
    } catch (error) {
      console.error('Get user error:', error)
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

