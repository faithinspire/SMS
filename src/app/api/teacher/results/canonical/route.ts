/**
 * GET /api/teacher/results/canonical
 * 
 * Returns canonical results for teacher's classes
 * Aggregates manual scores + CBT scores per student per subject
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { AuthService } from '@/services/auth.service';
import { CanonicalResultService, CanonicalResult } from '@/services/canonical-result.service';

interface TeacherResultResponse {
  success: boolean;
  data: {
    classes: Array<{
      classId: string;
      className: string;
      subjects: Array<{
        subjectId: string;
        subjectName: string;
        students: CanonicalResult[];
      }>;
    }>;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<TeacherResultResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    if (!sessionId || !termId) {
      return NextResponse.json(
        { error: 'Missing sessionId or termId' },
        { status: 400 }
      );
    }

    // Get current user
    const user = await AuthService.getCurrentUser();
    if (!user || user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get teacher's school and classes
    const { data: teacher } = await supabase
      .from('staff')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    const schoolId = teacher.school_id;

    // Get all classes this teacher teaches
    const { data: teachingAssignments } = await supabase
      .from('class_arm_combos')
      .select(`
        id,
        class_id,
        arm_number,
        classes(id, name),
        subjects(id, name)
      `)
      .eq('school_id', schoolId)
      .eq('teacher_id', user.id);

    if (!teachingAssignments || teachingAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          classes: [],
        },
      });
    }

    const classesData = await Promise.all(
      teachingAssignments.map(async (assignment: any) => {
        const classId = assignment.class_id;
        const className = assignment.classes?.name || `Class ${assignment.arm_number}`;
        const classArmId = assignment.id;

        // Get subjects for this class
        const { data: subjects } = await supabase
          .from('class_subjects')
          .select('subject_id, subjects(id, name)')
          .eq('school_id', schoolId)
          .eq('class_id', classId);

        const subjectsData = await Promise.all(
          (subjects || []).map(async (cs: any) => {
            const subjectId = cs.subject_id;
            const subjectName = cs.subjects?.name || 'Unknown';

            const results = await CanonicalResultService.getClassResults(
              schoolId,
              classId,
              classArmId,
              subjectId,
              sessionId,
              termId
            );

            return {
              subjectId,
              subjectName,
              students: results,
            };
          })
        );

        return {
          classId,
          className,
          subjects: subjectsData,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        classes: classesData,
      },
    });
  } catch (error) {
    console.error('[GET /api/teacher/results/canonical] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
