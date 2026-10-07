/**
 * GET /api/school-admin/results/canonical
 * 
 * Returns school-wide canonical results
 * Supports filtering by class, subject, session, term
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { AuthService } from '@/services/auth.service';
import { CanonicalResultService } from '@/services/canonical-result.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');

    if (!sessionId || !termId) {
      return NextResponse.json(
        { error: 'Missing sessionId or termId' },
        { status: 400 }
      );
    }

    // Get current user
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get school
    const { data: staff } = await supabase
      .from('staff')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();

    if (!staff || (staff.role !== 'school_admin' && staff.role !== 'principal')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const schoolId = staff.school_id;

    // If class and subject provided, get detailed class results
    if (classId && subjectId) {
      const { data: classArm } = await supabase
        .from('class_arm_combos')
        .select('id')
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        .single();

      if (!classArm) {
        return NextResponse.json(
          { error: 'Class not found' },
          { status: 404 }
        );
      }

      const results = await CanonicalResultService.getClassResults(
        schoolId,
        classId,
        classArm.id,
        subjectId,
        sessionId,
        termId
      );

      return NextResponse.json({
        success: true,
        data: {
          type: 'class_results',
          classId,
          subjectId,
          results,
        },
      });
    }

    // Otherwise return school statistics
    const stats = await CanonicalResultService.getSchoolStatistics(
      schoolId,
      sessionId,
      termId
    );

    // Get all classes for context
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId);

    return NextResponse.json({
      success: true,
      data: {
        type: 'school_statistics',
        statistics: stats,
        classes: classes || [],
      },
    });
  } catch (error) {
    console.error('[GET /api/school-admin/results/canonical] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
