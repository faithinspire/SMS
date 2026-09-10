/**
 * API Endpoint: POST /api/teachers/deletion-requests/create
 * Teachers can request to delete a student
 * Creates audit trail and notifies super admin
 * 
 * Authentication: Required
 * Authorization: TEACHER only
 * 
 * Request: { student_id, reason }
 * Response: { success, deletion_request, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyTeacher(token: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { authorized: false, error: 'User not found' };
    }

    if (userProfile.role !== 'TEACHER') {
      return { authorized: false, error: 'Only teachers can create deletion requests' };
    }

    return { authorized: true, userId: user.id, schoolId: userProfile.school_id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const body = await request.json();
    const { student_id: studentId, reason } = body;

    // Validate inputs
    if (!studentId || !reason) {
      return NextResponse.json(
        { success: false, error: 'student_id and reason are required' },
        { status: 400 }
      );
    }

    if (reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Verify teacher authorization
    const auth = await verifyTeacher(token);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    // Verify student exists and belongs to teacher's school
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, school_id, user:user_id(full_name)')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    if (student.school_id !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: 'Student does not belong to your school' },
        { status: 403 }
      );
    }

    // Check for existing pending deletion request for this student
    const { data: existingRequest } = await supabase
      .from('deletion_requests')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'PENDING')
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'A deletion request for this student is already pending' },
        { status: 400 }
      );
    }

    // Create deletion request
    const { data: deletionRequest, error: createError } = await supabase
      .from('deletion_requests')
      .insert([
        {
          school_id: auth.schoolId,
          student_id: studentId,
          initiated_by: auth.userId,
          reason,
          request_type: 'STUDENT_DELETION',
          status: 'PENDING',
          metadata: {
            requested_at: new Date().toISOString(),
            teacher_name: auth.userId,
          },
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: auth.schoolId,
      user_id: auth.userId,
      action: 'CREATE_DELETION_REQUEST',
      entity_type: 'DELETION_REQUEST',
      entity_id: deletionRequest.id,
      new_values: {
        student_id: studentId,
        reason,
      },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    // TODO: Send notification to super admin
    // Example: Send email to super_admin@sms.local with deletion request details

    return NextResponse.json(
      {
        success: true,
        deletion_request: deletionRequest,
        message: `Deletion request for "${student.user?.full_name || 'student'}" submitted successfully. Super admin will review it.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating deletion request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create deletion request',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

