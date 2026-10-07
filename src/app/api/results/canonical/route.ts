/**
 * GET /api/results/canonical
 * 
 * Returns canonical results based on user role:
 * - Teacher: own classes' results
 * - School Admin: school-wide results
 * - Principal: school-wide results
 * - Student: own results
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
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');

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

    // Get user's school
    const { data: staffProfile } = await supabase
      .from('staff')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();

    const schoolId = staffProfile?.school_id;
    if (!schoolId && user.role !== 'student') {
      return NextResponse.json(
        { error: 'No school found for user' },
        { status: 403 }
      );
    }

    // Student results
    if (user.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('school_id, id')
        .eq('user_id', user.id)
        .single();

      if (!studentData) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }

      const results = await CanonicalResultService.getStudentTermResults(
        studentData.school_id,
        studentData.id,
        sessionId,
        termId
      );

      return NextResponse.json({
        success: true,
        data: results,
        role: 'student',
      });
    }

    // Teacher results
    if (user.role === 'teacher') {
      if (!subjectId || !classId) {
        return NextResponse.json(
          { error: 'Missing subjectId or classId for teacher results' },
          { status: 400 }
        );
      }

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
        schoolId!,
        classId,
        classArm.id,
        subjectId,
        sessionId,
        termId
      );

      return NextResponse.json({
        success: true,
        data: results,
        role: 'teacher',
      });
    }

    // School Admin or Principal (school-wide results)
    if (staffProfile?.role === 'school_admin' || staffProfile?.role === 'principal') {
      // If classId provided, get class results
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
          schoolId!,
          classId,
          classArm.id,
          subjectId,
          sessionId,
          termId
        );

        return NextResponse.json({
          success: true,
          data: results,
          role: staffProfile.role,
        });
      }

      // Get school statistics
      const stats = await CanonicalResultService.getSchoolStatistics(
        schoolId!,
        sessionId,
        termId
      );

      return NextResponse.json({
        success: true,
        data: stats,
        role: staffProfile.role,
      });
    }

    return NextResponse.json(
      { error: 'Unauthorized role' },
      { status: 403 }
    );
  } catch (error) {
    console.error('[GET /api/results/canonical] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
