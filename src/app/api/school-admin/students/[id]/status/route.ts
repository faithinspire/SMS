export const dynamic = 'force-dynamic';
/**
 * API Endpoint: PATCH /api/school-admin/students/[id]/status
 * Updates student status
 * 
 * Authentication: Required
 * Authorization: SCHOOL_ADMIN only
 * 
 * Request: { status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED' }
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

const supabase = createClient();

async function verifySchoolAdmin(token: string, schoolId: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { authorized: false, error: 'User not found' };
    }

    if (userProfile.role !== 'SCHOOL_ADMIN') {
      return { authorized: false, error: 'Only school admins can update students' };
    }

    if (userProfile.school_id !== schoolId) {
      return { authorized: false, error: 'You can only manage your own school students' };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const studentId = params.id;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!['ACTIVE', 'PAUSED', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get student and verify school
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, school_id, user_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Verify authorization
    const auth = await verifySchoolAdmin(token, student.school_id);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    // Update student status
    const { error: updateError } = await supabase
      .from('students')
      .update({ status })
      .eq('id', studentId);

    if (updateError) throw updateError;

    // Also update corresponding user status
    await supabase
      .from('users')
      .update({ status })
      .eq('id', student.user_id)
      .catch(err => console.error('Error updating user status:', err));

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: student.school_id,
      user_id: auth.userId,
      action: 'UPDATE_STUDENT_STATUS',
      entity_type: 'STUDENT',
      entity_id: studentId,
      new_values: { status },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        success: true,
        message: `Student status updated to ${status}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating student status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
