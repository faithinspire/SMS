/**
 * COMPLETE STUDENTS API - v2
 * 
 * Properly resolves:
 * Student → User (full_name) → Class/Arm → Academic Data
 * 
 * Returns real student names, not "Unknown"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!schoolId) {
      console.error('[Students API Complete] Missing schoolId');
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      );
    }

    console.log('[Students API Complete] Fetching students for school:', schoolId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // STEP 1: Fetch students with basic info
    const { data: studentsRaw, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId);

    if (studentsError) {
      console.error('[Students API Complete] Error fetching students:', studentsError.message);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    if (!studentsRaw || studentsRaw.length === 0) {
      console.log('[Students API Complete] No students found for school');
      return NextResponse.json({
        data: [],
        meta: { count: 0 }
      });
    }

    // STEP 2: Fetch all users at once (more efficient than individual lookups)
    const userIds = [...new Set(studentsRaw.map(s => s.user_id))];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, photo_url')
      .in('id', userIds);

    if (usersError) {
      console.error('[Students API Complete] Error fetching users:', usersError.message);
    }

    const usersMap = new Map((users || []).map(u => [u.id, u]));

    // STEP 3: Fetch all class_arm_combos at once
    const classArmIds = [...new Set(studentsRaw.map(s => s.class_arm_combo_id).filter(Boolean))];
    const { data: classArms, error: classArmsError } = await supabase
      .from('class_arm_combos')
      .select(`
        id,
        class_id,
        classes (id, name),
        arms (id, name)
      `)
      .in('id', classArmIds);

    if (classArmsError) {
      console.error('[Students API Complete] Error fetching class arms:', classArmsError.message);
    }

    const classArmsMap = new Map((classArms || []).map(ca => [
      ca.id,
      {
        class: ca.classes as any,
        arm: ca.arms as any,
      }
    ]));

    // STEP 4: Build response with all relationships resolved
    const studentsComplete = studentsRaw.map((student: any) => {
      const user = usersMap.get(student.user_id);
      const classArmData = classArmsMap.get(student.class_arm_combo_id);

      return {
        id: student.id,
        user_id: student.user_id,
        school_id: student.school_id,
        admission_number: student.admission_number,
        date_of_birth: student.date_of_birth,
        photo_url: student.photo_url || user?.photo_url,
        status: student.status || 'ACTIVE',
        is_locked: student.is_locked || false,
        locked_at: student.locked_at,
        locked_by_user_id: student.locked_by_user_id,
        lock_reason: student.lock_reason,
        class_arm_combo_id: student.class_arm_combo_id,
        
        // Resolved relationships
        full_name: user?.full_name || 'Unknown Student',
        email: user?.email,
        
        // Class information
        class: classArmData?.class || { id: null, name: 'Unassigned' },
        arm: classArmData?.arm || { id: null, name: null },

        // Timestamps
        created_at: student.created_at,
        updated_at: student.updated_at,
      };
    });

    console.log('[Students API Complete] ✅ Fetched', studentsComplete.length, 'students with all relationships');

    return NextResponse.json({
      data: studentsComplete,
      meta: { count: studentsComplete.length }
    });

  } catch (error: any) {
    console.error('[Students API Complete] Error:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
