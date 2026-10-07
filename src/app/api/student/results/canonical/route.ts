/**
 * GET /api/student/results/canonical
 * 
 * Returns student's own canonical results
 * Shows aggregation of manual teacher scores + CBT scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { AuthService } from '@/services/auth.service';
import { CanonicalResultService, CanonicalResult } from '@/services/canonical-result.service';

interface StudentCanonicalResults {
  success: boolean;
  data: {
    student: {
      id: string;
      fullName: string;
      admissionNumber: string;
      class: string;
    };
    session: {
      id: string;
      name: string;
    };
    term: {
      id: string;
      name: string;
    };
    results: CanonicalResult[];
    summary: {
      overallAverage: number;
      totalSubjects: number;
      bestSubject: { name: string; score: number } | null;
      worstSubject: { name: string; score: number } | null;
    };
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<StudentCanonicalResults | { error: string }>> {
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
    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get student record
    const { data: student } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        school_id,
        admission_number,
        class_arm_combo:class_arm_combo_id (
          class_id,
          classes(name)
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get session and term info
    const { data: session } = await supabase
      .from('academic_sessions')
      .select('id, name')
      .eq('id', sessionId)
      .single();

    const { data: term } = await supabase
      .from('academic_terms')
      .select('id, name')
      .eq('id', termId)
      .single();

    if (!session || !term) {
      return NextResponse.json(
        { error: 'Session or term not found' },
        { status: 404 }
      );
    }

    // Get canonical results
    const results = await CanonicalResultService.getStudentTermResults(
      student.school_id,
      student.id,
      sessionId,
      termId
    );

    // Calculate summary
    let overallAverage = 0;
    let bestSubject = null;
    let worstSubject = null;
    let maxScore = -1;
    let minScore = 1000;

    if (results.length > 0) {
      const scores = results.map(r => r.overall_total);
      overallAverage = scores.reduce((a, b) => a + b, 0) / scores.length;

      results.forEach(result => {
        if (result.overall_total > maxScore) {
          maxScore = result.overall_total;
          bestSubject = {
            name: result.subject_id, // TODO: Join subject name
            score: result.overall_total,
          };
        }
        if (result.overall_total < minScore) {
          minScore = result.overall_total;
          worstSubject = {
            name: result.subject_id, // TODO: Join subject name
            score: result.overall_total,
          };
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          fullName: user.full_name || 'Unknown',
          admissionNumber: student.admission_number || 'N/A',
          class: student.class_arm_combo?.classes?.name || 'Unknown',
        },
        session: {
          id: session.id,
          name: session.name,
        },
        term: {
          id: term.id,
          name: term.name,
        },
        results,
        summary: {
          overallAverage,
          totalSubjects: results.length,
          bestSubject,
          worstSubject,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/student/results/canonical] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
