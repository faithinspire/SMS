/**
 * StudentAuthService - Server-side student access control
 * Manages student lock/unlock system with persistent database state
 * Lock enforcement is server-side and cannot be bypassed by client
 */

import { supabase } from '@/lib/supabase-client';

export interface StudentLockStatus {
  id: string;
  is_locked: boolean;
  locked_at: string | null;
  locked_by_user_id: string | null;
  lock_reason: string | null;
  school_id: string;
}

export class StudentAuthService {
  /**
   * Check if a student is locked
   * This is used for API route guards and before rendering dashboards
   */
  static async isStudentLocked(studentId: string, schoolId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('is_locked')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single();

      if (error) {
        console.error('[StudentAuthService] Error checking lock status:', error);
        return false;
      }

      return data?.is_locked || false;
    } catch (error) {
      console.error('[StudentAuthService] Unexpected error checking lock:', error);
      return false;
    }
  }

  /**
   * Get detailed lock information for a student
   */
  static async getStudentLockStatus(
    studentId: string,
    schoolId: string
  ): Promise<StudentLockStatus | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(
          'id, is_locked, locked_at, locked_by_user_id, lock_reason, school_id'
        )
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single();

      if (error) {
        console.error('[StudentAuthService] Error getting lock status:', error);
        return null;
      }

      return data as StudentLockStatus;
    } catch (error) {
      console.error('[StudentAuthService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Lock a student (school admin action)
   * Persists to database - cannot be bypassed by refreshing or client action
   */
  static async lockStudent(
    studentId: string,
    schoolId: string,
    adminUserId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('id, school_id')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single();

      if (fetchError || !student) {
        return {
          success: false,
          error: 'Student not found in this school',
        };
      }

      const { error: updateError } = await supabase
        .from('students')
        .update({
          is_locked: true,
          locked_at: new Date().toISOString(),
          locked_by_user_id: adminUserId,
          lock_reason: reason || null,
        })
        .eq('id', studentId)
        .eq('school_id', schoolId);

      if (updateError) {
        console.error('[StudentAuthService] Error locking student:', updateError);
        return {
          success: false,
          error: 'Failed to lock student',
        };
      }

      console.log('[StudentAuthService] Student locked:', studentId);
      return { success: true };
    } catch (error) {
      console.error('[StudentAuthService] Unexpected error locking student:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Unlock a student (school admin action)
   * Removes lock - student regains access immediately
   */
  static async unlockStudent(
    studentId: string,
    schoolId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('id, school_id')
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single();

      if (fetchError || !student) {
        return {
          success: false,
          error: 'Student not found in this school',
        };
      }

      const { error: updateError } = await supabase
        .from('students')
        .update({
          is_locked: false,
          locked_at: null,
          locked_by_user_id: null,
          lock_reason: null,
        })
        .eq('id', studentId)
        .eq('school_id', schoolId);

      if (updateError) {
        console.error('[StudentAuthService] Error unlocking student:', updateError);
        return {
          success: false,
          error: 'Failed to unlock student',
        };
      }

      console.log('[StudentAuthService] Student unlocked:', studentId);
      return { success: true };
    } catch (error) {
      console.error('[StudentAuthService] Unexpected error unlocking student:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Check if a student can access a specific API/page
   * Server-side enforcement: cannot be bypassed by client
   * Returns { allowed: boolean, lockReason?: string }
   */
  static async canStudentAccess(
    studentId: string,
    schoolId: string
  ): Promise<{ allowed: boolean; lockReason?: string }> {
    try {
      const lockStatus = await this.getStudentLockStatus(studentId, schoolId);

      if (!lockStatus) {
        // Student doesn't exist in this school
        return { allowed: false, lockReason: 'Student not found' };
      }

      if (lockStatus.is_locked) {
        return {
          allowed: false,
          lockReason:
            lockStatus.lock_reason ||
            'Your account has been temporarily locked by your school administrator.',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[StudentAuthService] Error checking access:', error);
      return {
        allowed: false,
        lockReason: 'Unable to verify access status',
      };
    }
  }

  /**
   * Bulk check lock status for multiple students
   * Useful for filtering student lists
   */
  static async getMultipleStudentLockStatus(
    studentIds: string[],
    schoolId: string
  ): Promise<Map<string, boolean>> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, is_locked')
        .eq('school_id', schoolId)
        .in('id', studentIds);

      if (error) {
        console.error('[StudentAuthService] Error checking multiple locks:', error);
        return new Map();
      }

      const lockMap = new Map<string, boolean>();
      data?.forEach((student: any) => {
        lockMap.set(student.id, student.is_locked || false);
      });

      return lockMap;
    } catch (error) {
      console.error('[StudentAuthService] Unexpected error:', error);
      return new Map();
    }
  }
}
