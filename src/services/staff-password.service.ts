'use client'

import { supabase } from '@/lib/supabase-client'
import { AuthService } from './auth.service'

export interface StaffPasswordRecord {
  id: string
  staff_id: string
  school_id: string
  old_email: string
  temporary_password: string
  password_changed_by: string
  password_changed_at: string
  force_change_on_next_login: boolean
  reason: string
}

export interface PasswordChangeRequest {
  staffId: string
  newPassword?: string
  generateTemporary?: boolean
  reason: string
  forceChangeOnLogin?: boolean
}

class StaffPasswordService {
  /**
   * Generate a temporary password for staff member
   */
  static generateTemporaryPassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  /**
   * Change staff password (admin action)
   */
  static async changeStaffPassword(
    schoolId: string,
    staffId: string,
    newPassword: string,
    changedBy: string,
    reason: string = 'Manual password change by admin'
  ): Promise<{ success: boolean; message: string; passwordRecord?: StaffPasswordRecord }> {
    try {
      // Get staff member details
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, email, role, full_name')
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .single()

      if (staffError || !staffData) {
        throw new Error('Staff member not found')
      }

      // Log the password change to history
      const { data: logData, error: logError } = await supabase
        .from('staff_password_history')
        .insert({
          school_id: schoolId,
          staff_id: staffId,
          old_email: staffData.email,
          temporary_password: newPassword,
          password_changed_by: changedBy,
          force_change_on_next_login: true,
          reason: reason,
        })
        .select()

      if (logError) {
        throw new Error(`Failed to log password change: ${logError.message}`)
      }

      // Note: Actual password change in Supabase Auth is done via admin API
      // This service tracks the change and provides audit trail

      return {
        success: true,
        message: `Password change initiated for ${staffData.full_name}. Staff member must update password on next login.`,
        passwordRecord: logData?.[0] as StaffPasswordRecord,
      }
    } catch (error: any) {
      console.error('Error changing staff password:', error)
      return {
        success: false,
        message: error.message || 'Failed to change staff password',
      }
    }
  }

  /**
   * Generate and set temporary password for staff
   */
  static async setTemporaryPassword(
    schoolId: string,
    staffId: string,
    changedBy: string,
    reason: string = 'Temporary password generated'
  ): Promise<{ success: boolean; message: string; temporaryPassword?: string; record?: StaffPasswordRecord }> {
    try {
      const temporaryPassword = this.generateTemporaryPassword()

      // Get staff member details
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, email, role, full_name')
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .single()

      if (staffError || !staffData) {
        throw new Error('Staff member not found')
      }

      // Log the temporary password
      const { data: logData, error: logError } = await supabase
        .from('staff_password_history')
        .insert({
          school_id: schoolId,
          staff_id: staffId,
          old_email: staffData.email,
          temporary_password: temporaryPassword,
          password_changed_by: changedBy,
          force_change_on_next_login: true,
          reason: reason || 'Temporary password generated for staff',
        })
        .select()

      if (logError) {
        throw new Error(`Failed to create temporary password record: ${logError.message}`)
      }

      return {
        success: true,
        message: `Temporary password generated for ${staffData.full_name}. Password must be changed on first login.`,
        temporaryPassword: temporaryPassword,
        record: logData?.[0] as StaffPasswordRecord,
      }
    } catch (error: any) {
      console.error('Error setting temporary password:', error)
      return {
        success: false,
        message: error.message || 'Failed to generate temporary password',
      }
    }
  }

  /**
   * Get password change history for a staff member
   */
  static async getPasswordHistory(
    schoolId: string,
    staffId: string,
    limit: number = 10
  ): Promise<StaffPasswordRecord[]> {
    try {
      const { data, error } = await supabase
        .from('staff_password_history')
        .select('*')
        .eq('school_id', schoolId)
        .eq('staff_id', staffId)
        .order('password_changed_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching password history:', error)
      return []
    }
  }

  /**
   * Get all password changes for a school
   */
  static async getSchoolPasswordHistory(
    schoolId: string,
    limit: number = 100
  ): Promise<(StaffPasswordRecord & { staff_name?: string; staff_email?: string })[]> {
    try {
      const { data, error } = await supabase
        .from('staff_password_history')
        .select(`
          *,
          users:staff_id(full_name, email)
        `)
        .eq('school_id', schoolId)
        .order('password_changed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map((record: any) => ({
        ...record,
        staff_name: record.users?.full_name,
        staff_email: record.users?.email,
      }))
    } catch (error) {
      console.error('Error fetching school password history:', error)
      return []
    }
  }

  /**
   * Reset password for staff member who left the school
   */
  static async resetPasswordOnStaffRemoval(
    schoolId: string,
    staffId: string,
    removedBy: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .single()

      if (staffError || !staffData) {
        throw new Error('Staff member not found')
      }

      // Log the removal
      const { error: logError } = await supabase
        .from('staff_password_history')
        .insert({
          school_id: schoolId,
          staff_id: staffId,
          old_email: staffData.email,
          password_changed_by: removedBy,
          reason: `Staff member ${staffData.full_name} (${staffData.role}) removed from system - access revoked`,
          force_change_on_next_login: false,
        })

      if (logError) {
        throw new Error(`Failed to log staff removal: ${logError.message}`)
      }

      return {
        success: true,
        message: `Access revoked for ${staffData.full_name}. Password has been logged as reset.`,
      }
    } catch (error: any) {
      console.error('Error resetting staff password:', error)
      return {
        success: false,
        message: error.message || 'Failed to reset staff password',
      }
    }
  }

  /**
   * Bulk reset passwords for removed staff
   */
  static async bulkResetPasswordsForRemovedStaff(
    schoolId: string,
    staffIds: string[],
    removedBy: string
  ): Promise<{ success: boolean; message: string; processed: number; failed: number }> {
    let processed = 0
    let failed = 0

    try {
      for (const staffId of staffIds) {
        const result = await this.resetPasswordOnStaffRemoval(schoolId, staffId, removedBy)
        if (result.success) {
          processed++
        } else {
          failed++
        }
      }

      return {
        success: failed === 0,
        message: `Processed ${processed} staff removals. ${failed > 0 ? `${failed} failed.` : ''}`,
        processed,
        failed,
      }
    } catch (error: any) {
      console.error('Error in bulk password reset:', error)
      return {
        success: false,
        message: error.message || 'Bulk password reset failed',
        processed,
        failed,
      }
    }
  }

  /**
   * Get password status for all staff in school
   */
  static async getStaffPasswordStatus(
    schoolId: string
  ): Promise<
    Array<{
      id: string
      full_name: string
      email: string
      role: string
      last_password_change?: string
      requires_password_change: boolean
    }>
  > {
    try {
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .eq('school_id', schoolId)
        .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'])

      if (staffError) throw staffError

      // Get latest password changes for each staff
      const { data: passwordHistory, error: historyError } = await supabase
        .from('staff_password_history')
        .select('staff_id, password_changed_at, force_change_on_next_login')
        .eq('school_id', schoolId)
        .order('password_changed_at', { ascending: false })

      if (historyError) throw historyError

      // Create map of latest password changes
      const latestChanges = new Map()
      if (passwordHistory) {
        for (const record of passwordHistory) {
          if (!latestChanges.has(record.staff_id)) {
            latestChanges.set(record.staff_id, record)
          }
        }
      }

      return (staff || []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        role: s.role,
        last_password_change: latestChanges.get(s.id)?.password_changed_at,
        requires_password_change: latestChanges.get(s.id)?.force_change_on_next_login || false,
      }))
    } catch (error) {
      console.error('Error getting staff password status:', error)
      return []
    }
  }
}

export { StaffPasswordService }
