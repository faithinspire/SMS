/**
 * Fallback authentication for school admins when Supabase Auth is unavailable
 * Uses credentials stored in the schools table
 */

import { supabase } from './supabase-client'

interface FallbackLoginResult {
  success: boolean
  schoolId?: string
  schoolName?: string
  adminEmail?: string
  error?: string
}

/**
 * Attempt fallback login using schools table credentials
 * This is used when Supabase Auth fails with "Invalid login credentials"
 */
export async function fallbackSchoolAdminLogin(
  email: string,
  password: string
): Promise<FallbackLoginResult> {
  try {
    console.log('🔑 Attempting fallback login for:', email)

    // Query schools table for matching admin email and password
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, admin_email, admin_password, status')
      .eq('admin_email', email)
      .eq('status', 'ACTIVE')
      .limit(1)

    if (error) {
      console.error('❌ Fallback login query error:', error)
      return {
        success: false,
        error: 'Failed to verify credentials',
      }
    }

    if (!schools || schools.length === 0) {
      console.warn('⚠️ No school found with admin email:', email)
      return {
        success: false,
        error: 'Invalid email or password',
      }
    }

    const school = schools[0]

    // Compare password (plain text comparison - stored in plain text in DB)
    if (school.admin_password !== password) {
      console.warn('⚠️ Password mismatch for school:', school.id)
      return {
        success: false,
        error: 'Invalid email or password',
      }
    }

    console.log('✅ Fallback login successful for school:', school.id)

    // Create or update a session in localStorage
    // Note: This is NOT a secure Supabase session, just a marker for the app
    const sessionData = {
      schoolId: school.id,
      schoolName: school.name,
      adminEmail: school.admin_email,
      loginMethod: 'fallback',
      loginTime: new Date().toISOString(),
    }

    localStorage.setItem('fallback_session', JSON.stringify(sessionData))

    return {
      success: true,
      schoolId: school.id,
      schoolName: school.name,
      adminEmail: school.admin_email,
    }
  } catch (error: any) {
    console.error('❌ Fallback login exception:', error.message)
    return {
      success: false,
      error: error.message || 'Login failed',
    }
  }
}

/**
 * Check if there's a valid fallback session
 */
export function checkFallbackSession(): {
  valid: boolean
  schoolId?: string
  schoolName?: string
} {
  try {
    const sessionStr = localStorage.getItem('fallback_session')
    if (!sessionStr) {
      return { valid: false }
    }

    const session = JSON.parse(sessionStr)
    // Sessions are valid for 24 hours
    const loginTime = new Date(session.loginTime).getTime()
    const now = new Date().getTime()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    if (now - loginTime > maxAge) {
      localStorage.removeItem('fallback_session')
      return { valid: false }
    }

    return {
      valid: true,
      schoolId: session.schoolId,
      schoolName: session.schoolName,
    }
  } catch (error) {
    console.error('Error checking fallback session:', error)
    return { valid: false }
  }
}

/**
 * Clear fallback session (logout)
 */
export function clearFallbackSession(): void {
  localStorage.removeItem('fallback_session')
}

/**
 * Get fallback session data
 */
export function getFallbackSession() {
  try {
    const sessionStr = localStorage.getItem('fallback_session')
    if (!sessionStr) return null
    return JSON.parse(sessionStr)
  } catch (error) {
    console.error('Error getting fallback session:', error)
    return null
  }
}
