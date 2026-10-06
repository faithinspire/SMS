import { AuthService } from './auth.service'
import { supabase } from '@/lib/supabase-client'

export interface SchoolContext {
  schoolId: string
  schoolName: string
  userId: string
  userRole: string
}

/**
 * SchoolContextService
 * Handles resolving and managing school context for authenticated users
 * Replaces fragmented context resolution logic across the app
 */
export class SchoolContextService {
  /**
   * Get the current user's school context
   * Combines auth resolution with school data lookup
   */
  static async getCurrentUserSchool(): Promise<SchoolContext> {
    try {
      // Step 1: Get current user from auth
      const user = await AuthService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Step 2: Verify school_id is available
      if (!user.school_id) {
        throw new Error('Account not linked to a school. Please contact your administrator.')
      }

      // Step 3: Fetch school details
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', user.school_id)
        .maybeSingle()

      if (schoolError) {
        console.error('School lookup error:', schoolError)
        throw new Error('Failed to load school information')
      }

      if (!school) {
        throw new Error('School not found')
      }

      return {
        schoolId: user.school_id,
        schoolName: school.name || 'Unknown School',
        userId: user.id,
        userRole: user.role || 'UNKNOWN',
      }
    } catch (error: any) {
      console.error('SchoolContextService error:', error)
      throw error
    }
  }

  /**
   * Get school data by ID
   */
  static async getSchoolById(schoolId: string): Promise<{ id: string; name: string } | null> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', schoolId)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Get school by ID error:', error)
      return null
    }
  }

  /**
   * Verify user belongs to a school
   */
  static async verifyUserBelongsToSchool(userId: string, schoolId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('school_id', schoolId)
        .maybeSingle()

      if (error) {
        console.error('Verify user school error:', error)
        return false
      }

      return !!data
    } catch (error: any) {
      console.error('Verify user school exception:', error)
      return false
    }
  }

  /**
   * Get all staff for a school
   */
  static async getSchoolStaff(schoolId: string): Promise<Array<{ id: string; full_name: string; role: string }>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('school_id', schoolId)
        .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'])
        .order('full_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Get school staff error:', error)
      return []
    }
  }

  /**
   * Get all students for a school
   */
  static async getSchoolStudents(schoolId: string): Promise<Array<{ id: string; full_name: string; admission_number: string }>> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, user_id, admission_number, users(full_name)')
        .eq('school_id', schoolId)
        .order('admission_number', { ascending: true })

      if (error) throw error
      return (data || []).map(s => ({
        id: s.id,
        full_name: (s.users as any)?.full_name || 'Unknown',
        admission_number: s.admission_number || '',
      }))
    } catch (error: any) {
      console.error('Get school students error:', error)
      return []
    }
  }
}
