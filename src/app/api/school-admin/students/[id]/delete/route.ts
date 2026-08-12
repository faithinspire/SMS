/**
 * API Endpoint: DELETE /api/school-admin/students/[id]/delete
 * Deletes a student record (usually via deletion request workflow)
 * 
 * Authentication: Required
 * Authorization: SCHOOL_ADMIN only
 * 
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      return { authorized: false, error: 'Only school admins can delete students' };
    }

    if (userProfile.school_id !== schoolId) {
      return { authorized: false, error: 'You can only manage your own school students' };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function DELETE(
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

    // Get student name for audit
    const { data: studentUser } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', student.user_id)
      .single();

    // Delete student record (cascades to related data)
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (deleteError) throw deleteError;

    // Also delete the user record
    await supabase
      .from('users')
      .delete()
      .eq('id', student.user_id)
      .catch(err => console.error('Error deleting user:', err));

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: student.school_id,
      user_id: auth.userId,
      action: 'DELETE_STUDENT',
      entity_type: 'STUDENT',
      entity_id: studentId,
      old_values: { name: studentUser?.full_name },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        success: true,
        message: `Student ${studentUser?.full_name || 'deleted'} successfully removed`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete student',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
