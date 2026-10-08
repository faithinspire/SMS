/**
 * PATCH /api/school/students/[id]/lock
 * 
 * Updates student lock status (server-side feature lock)
 * This prevents the student from accessing certain features
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const { is_locked, lock_reason } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    console.log('[Student Lock API] Updating lock status for student:', studentId, '→', is_locked);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Update student lock status
    const { data, error } = await supabase
      .from('students')
      .update({
        is_locked,
        locked_at: is_locked ? new Date().toISOString() : null,
        locked_by_user_id: null, // In production, should be current_user_id()
        lock_reason: lock_reason || (is_locked ? 'Locked by School Admin' : null),
      })
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      console.error('[Student Lock API] Database error:', error.message);
      return NextResponse.json(
        { error: 'Failed to update student' },
        { status: 500 }
      );
    }

    console.log('[Student Lock API] ✅ Updated student lock status');

    return NextResponse.json({
      data,
      message: is_locked ? 'Student features locked' : 'Student features unlocked'
    });

  } catch (error: any) {
    console.error('[Student Lock API] Error:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
