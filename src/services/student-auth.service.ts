/**
 * StudentAuthService
 * Enforces server-side checks for student account status
 * Used to prevent paused/suspended students from accessing protected endpoints
 */

import { supabase } from '@/lib/supabase-client';

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED' | 'TRANSFERRED' | 'GRADUATED';

export class StudentAuthService {
  /**
   * Check if a student account is active and allowed to access the system
   * Returns locked response if account is paused/suspended
   */
  static async verifyStudentAccountActive(studentId: string): Promise<{
    isActive: boolean;
    status?: StudentStatus;
    message?: string;
  }> {
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('id, status')
        .eq('id', studentId)
        .maybeSingle();

      if (error || !student) {
        return {
          isActive: false,
          message: 'Student record not found',
        };
      }

      if (student.status === 'PAUSED' || student.status === 'SUSPENDED') {
        return {
          isActive: false,
          status: student.status,
          message: 'ACCOUNT LOCKED - Your student account has been temporarily locked by your school administrator. Please contact your school administrator for assistance.',
        };
      }

      if (student.status === 'INACTIVE' || student.status === 'TRANSFERRED' || student.status === 'GRADUATED') {
        return {
          isActive: false,
          status: student.status,
          message: `Your account is ${student.status.toLowerCase()} and cannot access the system.`,
        };
      }

      // Status is ACTIVE
      return {
        isActive: true,
        status: student.status,
      };
    } catch (error) {
      console.error('[StudentAuthService] Error checking student status:', error);
      return {
        isActive: false,
        message: 'Failed to verify account status',
      };
    }
  }

  /**
   * Get student's current status
   */
  static async getStudentStatus(studentId: string): Promise<StudentStatus | null> {
    try {
      const { data: student } = await supabase
        .from('students')
        .select('status')
        .eq('id', studentId)
        .maybeSingle();

      return (student?.status as StudentStatus) || null;
    } catch (error) {
      console.error('[StudentAuthService] Error getting student status:', error);
      return null;
    }
  }

  /**
   * Update student account status
   * Used by school admins and system for status changes
   */
  static async updateStudentStatus(studentId: string, newStatus: StudentStatus): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('id', studentId);

      if (error) throw error;

      return {
        success: true,
        message: `Student status updated to ${newStatus}`,
      };
    } catch (error) {
      console.error('[StudentAuthService] Error updating status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update status',
      };
    }
  }
}
