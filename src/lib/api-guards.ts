/**
 * API Route Guards and Middleware
 * Common guards for enforcing student lock status and access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { StudentAuthService } from '@/services/student-auth.service';

/**
 * Guard: Check if student is locked
 * Should be called at the beginning of student-facing API routes
 * Returns { allowed: boolean, response?: NextResponse }
 * If not allowed, response is set to the error response to return immediately
 */
export async function checkStudentLocked(
  studentId: string,
  schoolId: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    // Get student lock status
    const { data: student, error } = await supabase
      .from('students')
      .select('is_locked, lock_reason, status')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (error || !student) {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        ),
      };
    }

    // Check if student is locked
    if (student.is_locked) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Account locked',
            reason: student.lock_reason || 'Your account has been locked by your school administrator.',
            lockStatus: true,
          },
          { status: 403 }
        ),
      };
    }

    // Check if student account is paused or suspended
    if (student.status === 'PAUSED' || student.status === 'SUSPENDED') {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: `Account ${student.status.toLowerCase()}`,
            reason: `Your account has been ${student.status.toLowerCase()} by your school administrator.`,
            accountStatus: student.status,
          },
          { status: 403 }
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[API Guard] Error checking student lock status:', error);
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Failed to verify access status' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Guard: Verify student belongs to school and extract from request
 * Returns { success: boolean, studentId?: string, schoolId?: string, response?: NextResponse }
 */
export async function verifyStudentSchoolAccess(
  request: NextRequest
): Promise<{
  success: boolean;
  studentId?: string;
  schoolId?: string;
  response?: NextResponse;
}> {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id') || searchParams.get('studentId');
    const schoolId = searchParams.get('school_id') || searchParams.get('schoolId');

    if (!studentId || !schoolId) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Missing required parameters: student_id, school_id' },
          { status: 400 }
        ),
      };
    }

    // Verify student exists and belongs to school
    const { data: student, error } = await supabase
      .from('students')
      .select('id, school_id')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (error || !student) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Invalid student or school' },
          { status: 404 }
        ),
      };
    }

    return { success: true, studentId, schoolId };
  } catch (error) {
    console.error('[API Guard] Error verifying access:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Failed to verify access' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Composite guard: Verify student has access (not locked, not paused)
 * Use this in student API routes
 */
export async function guardStudentAccess(request: NextRequest): Promise<{
  allowed: boolean;
  studentId?: string;
  schoolId?: string;
  response?: NextResponse;
}> {
  // First verify parameters
  const paramCheck = await verifyStudentSchoolAccess(request);
  if (!paramCheck.success) {
    return {
      allowed: false,
      response: paramCheck.response,
    };
  }

  // Then check lock status
  const lockCheck = await checkStudentLocked(paramCheck.studentId!, paramCheck.schoolId!);
  if (!lockCheck.allowed) {
    return {
      allowed: false,
      response: lockCheck.response,
    };
  }

  return {
    allowed: true,
    studentId: paramCheck.studentId,
    schoolId: paramCheck.schoolId,
  };
}
