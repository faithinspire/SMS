/**
 * Centralized School Context Service
 * Single source of truth for resolving authenticated user → school
 * 
 * PROBLEM BEING SOLVED:
 * - Multiple pages independently looked up school_id
 * - Many failed silently or threw errors
 * - Users saw "account not linked to school" even when it was
 * 
 * SOLUTION:
 * - One reliable method: getCurrentUserSchool()
 * - Comprehensive logging for diagnostics
 * - Three-tier fallback (auth metadata → users table → error with context)
 * - Used by: Staff Page, Student Page, Results Page, Navigation, etc.
 */

import { createClient } from '@/lib/supabase-client'

const supabase = createClient()

export interface UserWithSchool {
  userId: string
  email: string
  schoolId: string
  schoolName?: string
  fullName?: string
  role?: string
}

export class SchoolContextService {
  /**
   * Get the authenticated user's school with comprehensive debugging
   * 
   * Returns: { userId, email, schoolId, schoolName, fullName, role }
   * Throws: Error with descriptive message if user not found or not linked to school
   * 
   * RESOLUTION STRATEGY:
   * 1. Get authenticated user from Supabase Auth
   * 2. Check auth user_metadata for school_id (fastest)
   * 3. Fallback to users table lookup for school_id (if needed)
   * 4. Fallback to school name lookup (optional, for UI display)
   * 5. Throw with context if all fail
   */
  static async getCurrentUserSchool(): Promise<UserWithSchool> {
    console.log('[SchoolContextService] 🚀 Resolving user school context...')

    try {
      // STEP 1: Get authenticated user
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        console.error('[SchoolContextService] ❌ No authenticated user found')
        throw new Error('Not authenticated. Please log in.')
      }

      const authUser = authData.user
      console.log('[SchoolContextService] ✅ Authenticated user:', {
        id: authUser.id,
        email: authUser.email,
      })

      // STEP 2: Try auth metadata first (fastest)
      const metadataSchoolId = authUser.user_metadata?.school_id as string | undefined
      const metadataRole = authUser.user_metadata?.role as string | undefined
      const metadataName = authUser.user_metadata?.name as string | undefined

      if (metadataSchoolId) {
        console.log(
          '[SchoolContextService] ✅ PRIORITY 1: Found school_id in auth metadata:',
          metadataSchoolId
        )
        return {
          userId: authUser.id,
          email: authUser.email || '',
          schoolId: metadataSchoolId,
          fullName: metadataName,
          role: metadataRole,
        }
      }

      console.log(
        '[SchoolContextService] ⚠️  No school_id in auth metadata, checking users table...'
      )

      // STEP 3: Query users table for school_id
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, school_id, full_name, role, email')
        .eq('id', authUser.id)
        .maybeSingle()

      if (userError) {
        console.error('[SchoolContextService] ❌ Database error:', userError.message)
        throw new Error(
          `Failed to look up school relationship: ${userError.message}`
        )
      }

      if (!userRecord) {
        console.error('[SchoolContextService] ❌ User record not found in users table')
        throw new Error(
          `User profile not found. Contact your administrator. (User ID: ${authUser.id})`
        )
      }

      if (!userRecord.school_id) {
        console.error(
          '[SchoolContextService] ❌ User found but has NO school_id:',
          userRecord
        )
        throw new Error(
          `Your account is not linked to a school. Contact your administrator.`
        )
      }

      console.log('[SchoolContextService] ✅ PRIORITY 2: Found school_id in users table:', {
        userId: userRecord.id,
        schoolId: userRecord.school_id,
      })

      return {
        userId: authUser.id,
        email: authUser.email || userRecord.email || '',
        schoolId: userRecord.school_id,
        fullName: userRecord.full_name,
        role: userRecord.role,
      }
    } catch (error) {
      console.error('[SchoolContextService] ❌ CRITICAL ERROR:', error)
      throw error
    }
  }

  /**
   * Get school details (name, logo, etc.)
   */
  static async getSchoolDetails(schoolId: string) {
    console.log('[SchoolContextService] Fetching school details for:', schoolId)

    try {
      const { data: school, error } = await supabase
        .from('schools')
        .select('id, name, logo_url, email, phone, address, website, motto')
        .eq('id', schoolId)
        .maybeSingle()

      if (error) {
        console.error('[SchoolContextService] Error fetching school:', error)
        throw error
      }

      if (!school) {
        console.warn('[SchoolContextService] School not found:', schoolId)
        return null
      }

      console.log('[SchoolContextService] ✅ School details loaded:', school.name)
      return school
    } catch (error) {
      console.error('[SchoolContextService] Error:', error)
      throw error
    }
  }

  /**
   * Validate that user belongs to school (security check)
   */
  static async validateUserBelongsToSchool(userId: string, schoolId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('school_id', schoolId)
        .maybeSingle()

      if (error) {
        console.error('[SchoolContextService] Validation error:', error)
        return false
      }

      const isValid = !!data
      console.log(
        `[SchoolContextService] User ${userId} belongs to school ${schoolId}:`,
        isValid
      )
      return isValid
    } catch (error) {
      console.error('[SchoolContextService] Validation failed:', error)
      return false
    }
  }
}
