/**
 * API: POST /api/school-admin/students/[id]/lock
 * Allows school admin to lock a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { StudentAuthService } from '@/services/student-auth.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is school admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const schoolId = userProfile.school_id;

    // Parse request body for optional reason
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || undefined;

    // Lock the student
    const result = await StudentAuthService.lockStudent(
      studentId,
      schoolId,
      user.id,
      reason
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Student locked successfully',
      studentId,
    });
  } catch (error) {
    console.error('[Lock Student API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to lock student' },
      { status: 500 }
    );
  }
}
