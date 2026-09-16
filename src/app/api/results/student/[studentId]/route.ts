import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/results/student/[studentId]
 * 
 * Fetch all scores for a student in a specific term
 * Returns scores from score_sheets table (both manual and CBT)
 * 
 * Query params:
 * - schoolId: UUID (required)
 * - termId: UUID (required)
 * 
 * Response:
 * {
 *   subjects: [
 *     {
 *       subject_id: UUID,
 *       subject_name: string,
 *       test1: number | null,
 *       test2: number | null,
 *       test3: number | null,
 *       test4: number | null,
 *       exam: number | null,
 *       total: number,
 *       grade: string,
 *       sources: { test1_source, test2_source, ... }
 *     }
 *   ],
 *   overall_score: number,
 *   overall_grade: string
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const termId = searchParams.get('termId')
    const studentId = params.studentId

    console.log('[API] GET /api/results/student fetch:', {
      schoolId,
      studentId,
      termId,
    })

    if (!schoolId || !studentId || !termId) {
      return NextResponse.json(
        { error: 'Missing required parameters: schoolId, studentId, termId' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 1: GET ALL SCORES FOR THIS STUDENT IN THIS TERM
    // ========================================================================

    const { data: scores, error: scoresError } = await supabase
      .from('score_sheets')
      .select(
        `
        id,
        student_id,
        subject_id,
        term_id,
        test1,
        test2,
        test3,
        test4,
        exam,
        total,
        grade,
        test1_source,
        test2_source,
        test3_source,
        test4_source,
        exam_source,
        subjects(id, name, code)
      `
      )
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('term_id', termId)

    if (scoresError) {
      console.error('[API] Error fetching scores:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch scores', details: scoresError.message },
        { status: 500 }
      )
    }

    console.log('[API] Fetched scores:', scores?.length || 0)

    if (!scores || scores.length === 0) {
      console.warn('[API] No scores found for student')
      return NextResponse.json({
        subjects: [],
        overall_score: 0,
        overall_grade: 'N/A',
      })
    }

    // ========================================================================
    // STEP 2: FORMAT RESPONSE - MATCH RESULTS PAGE EXPECTATIONS
    // ========================================================================

    const subjects = scores.map((score: any) => ({
      subject_id: score.subject_id,
      subject_name: score.subjects?.name || 'Unknown Subject',
      test1: score.test1,
      test2: score.test2,
      test3: score.test3,
      test4: score.test4,
      exam: score.exam,
      total: score.total,
      grade: score.grade,
      sources: {
        test1_source: score.test1_source,
        test2_source: score.test2_source,
        test3_source: score.test3_source,
        test4_source: score.test4_source,
        exam_source: score.exam_source,
      },
    }))

    // Calculate overall score
    const totalScore = subjects.reduce((sum, s) => sum + (s.total || 0), 0)
    const overallScore =
      subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0

    // Determine overall grade
    let overallGrade = 'F'
    if (overallScore >= 90) overallGrade = 'A'
    else if (overallScore >= 80) overallGrade = 'B'
    else if (overallScore >= 70) overallGrade = 'C'
    else if (overallScore >= 60) overallGrade = 'D'
    else if (overallScore >= 40) overallGrade = 'E'

    console.log('[API] Returning scores:', {
      subjectCount: subjects.length,
      overallScore,
      overallGrade,
    })

    return NextResponse.json({
      success: true,
      subjects,
      overall_score: overallScore,
      overall_grade: overallGrade,
      message: `Found ${subjects.length} subjects with scores`,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /api/results/student:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
