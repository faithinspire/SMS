/**
 * API: POST /api/school-admin/students/[id]/unlock
 * Allows school admin to unlock a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { StudentAuthService } from '@/services/student-auth.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;

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

    // Unlock the student
    const result = await StudentAuthService.unlockStudent(studentId, schoolId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Student unlocked successfully',
      studentId,
    });
  } catch (error) {
    console.error('[Unlock Student API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to unlock student' },
      { status: 500 }
    );
  }
}
