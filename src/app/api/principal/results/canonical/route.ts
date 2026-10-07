/**
 * GET /api/principal/results/canonical
 * 
 * Returns school-wide canonical results for principal oversight
 * Principal has full visibility across all classes and subjects
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { AuthService } from '@/services/auth.service';
import { CanonicalResultService } from '@/services/canonical-result.service';

interface PrincipalResultsResponse {
  success: boolean;
  data: {
    type: 'dashboard' | 'class_view';
    statistics?: {
      totalStudents: number;
      averageScore: number;
      gradeDistribution: Record<string, number>;
      subjectAverages: Record<string, number>;
    };
    classes?: Array<{
      classId: string;
      className: string;
      averageScore: number;
      topPerformer?: {
        studentId: string;
        studentName: string;
        score: number;
      };
      bottomPerformer?: {
        studentId: string;
        studentName: string;
        score: number;
      };
    }>;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<PrincipalResultsResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');
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

    // Get principal's school
    const { data: staff } = await supabase
      .from('staff')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();

    if (!staff || staff.role !== 'principal') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const schoolId = staff.school_id;

    // Class-specific view
    if (classId) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('id', classId)
        .eq('school_id', schoolId)
        .single();

      if (!classData) {
        return NextResponse.json(
          { error: 'Class not found' },
          { status: 404 }
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
          { error: 'Class arm not found' },
          { status: 404 }
        );
      }

      // Get subjects for this class
      const { data: subjects } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects(name)')
        .eq('class_id', classId)
        .eq('school_id', schoolId);

      // Get results for each subject
      let totalScore = 0;
      let resultCount = 0;

      const subjectResults = await Promise.all(
        (subjects || []).map(async (cs: any) => {
          const results = await CanonicalResultService.getClassResults(
            schoolId,
            classId,
            classArm.id,
            cs.subject_id,
            sessionId,
            termId
          );

          results.forEach(r => {
            totalScore += r.overall_total;
            resultCount++;
          });

          return {
            subjectId: cs.subject_id,
            subjectName: cs.subjects?.name,
            studentCount: results.length,
            averageScore: results.length > 0 
              ? results.reduce((sum, r) => sum + r.overall_total, 0) / results.length 
              : 0,
          };
        })
      );

      const averageScore = resultCount > 0 ? totalScore / resultCount : 0;

      return NextResponse.json({
        success: true,
        data: {
          type: 'class_view',
          classes: [{
            classId,
            className: classData.name,
            averageScore,
          }],
        },
      });
    }

    // Dashboard overview
    const statistics = await CanonicalResultService.getSchoolStatistics(
      schoolId,
      sessionId,
      termId
    );

    // Get all classes for performance ranking
    const { data: allClasses } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId);

    const classPerformance = await Promise.all(
      (allClasses || []).map(async (cls: any) => {
        const { data: classArm } = await supabase
          .from('class_arm_combos')
          .select('id')
          .eq('class_id', cls.id)
          .eq('school_id', schoolId)
          .single();

        if (!classArm) {
          return null;
        }

        // Get all subjects for class
        const { data: subjects } = await supabase
          .from('class_subjects')
          .select('subject_id')
          .eq('class_id', cls.id)
          .eq('school_id', schoolId);

        let totalScore = 0;
        let resultCount = 0;

        for (const subject of subjects || []) {
          const results = await CanonicalResultService.getClassResults(
            schoolId,
            cls.id,
            classArm.id,
            subject.subject_id,
            sessionId,
            termId
          );

          results.forEach(r => {
            totalScore += r.overall_total;
            resultCount++;
          });
        }

        const averageScore = resultCount > 0 ? totalScore / resultCount : 0;

        return {
          classId: cls.id,
          className: cls.name,
          averageScore,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        type: 'dashboard',
        statistics,
        classes: classPerformance.filter(c => c !== null) as any[],
      },
    });
  } catch (error) {
    console.error('[GET /api/principal/results/canonical] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
