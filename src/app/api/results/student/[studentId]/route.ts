import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    console.log('[API] GET /api/results/student fetch START:', {
      schoolId,
      studentId,
      termId,
      timestamp: new Date().toISOString(),
    })

    if (!schoolId || !studentId || !termId) {
      console.error('[API] Missing params:', { schoolId, studentId, termId })
      return NextResponse.json(
        { error: 'Missing required parameters: schoolId, studentId, termId' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 1: FETCH SCORES DIRECTLY FROM SCORE_SHEETS (PRIMARY)
    // ========================================================================
    
    console.log('[API] Fetching scores directly from score_sheets...')
    
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
        subjects:subject_id(id, name, code)
      `
      )
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('term_id', termId)

    if (scoresError) {
      console.error('[API] Error fetching scores:', scoresError)
      throw scoresError
    }

    console.log('[API] Direct score query returned:', scores?.length || 0, 'records')

    // If scores found, return them
    if (scores && scores.length > 0) {
      console.log('[API] Found scores directly. Processing...')
      
      const subjects = scores.map((score: any) => ({
        subject_id: score.subject_id,
        subject_name: score.subjects?.name || 'Unknown Subject',
        test1: score.test1,
        test2: score.test2,
        test3: score.test3,
        test4: score.test4,
        exam: score.exam,
        total: score.total || 0,
        grade: score.grade || null,
        sources: {
          test1_source: score.test1_source || null,
          test2_source: score.test2_source || null,
          test3_source: score.test3_source || null,
          test4_source: score.test4_source || null,
          exam_source: score.exam_source || null,
        },
      }))

      // Calculate overall score
      const totalScore = subjects.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
      const overallScore = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0

      // Determine overall grade
      let overallGrade = 'F'
      if (overallScore >= 90) overallGrade = 'A'
      else if (overallScore >= 80) overallGrade = 'B'
      else if (overallScore >= 70) overallGrade = 'C'
      else if (overallScore >= 60) overallGrade = 'D'
      else if (overallScore >= 40) overallGrade = 'E'

      console.log('[API] Returning direct scores:', {
        subjectCount: subjects.length,
        overallScore,
        overallGrade,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        subjects,
        overall_score: overallScore,
        overall_grade: overallGrade,
        message: `Found ${subjects.length} subjects with scores`,
      })
    }

    // ========================================================================
    // STEP 2: IF NO SCORES, GET ENROLLED SUBJECTS (FALLBACK)
    // ========================================================================
    
    console.log('[API] No scores found, fetching enrolled subjects as fallback...')

    const { data: studentSubjects, error: subjectsError } = await supabase
      .from('student_subjects')
      .select('subject_id, subjects(id, name, code)')
      .eq('student_id', studentId)

    if (subjectsError) {
      console.error('[API] Error fetching student subjects:', subjectsError)
      throw subjectsError
    }

    console.log('[API] Found enrolled subjects:', studentSubjects?.length || 0)

    if (!studentSubjects || studentSubjects.length === 0) {
      console.warn('[API] Student not enrolled in any subjects')
      return NextResponse.json({
        success: true,
        subjects: [],
        overall_score: 0,
        overall_grade: 'N/A',
        message: 'Student has no enrolled subjects',
      })
    }

    // Format enrolled subjects without scores
    const subjects = studentSubjects.map((ss: any) => ({
      subject_id: ss.subject_id,
      subject_name: ss.subjects?.name || 'Unknown Subject',
      test1: null,
      test2: null,
      test3: null,
      test4: null,
      exam: null,
      total: 0,
      grade: null,
      sources: {
        test1_source: null,
        test2_source: null,
        test3_source: null,
        test4_source: null,
        exam_source: null,
      },
    }))

    console.log('[API] Returning enrolled subjects (no scores):', {
      subjectCount: subjects.length,
      overallScore: 0,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      subjects,
      overall_score: 0,
      overall_grade: 'N/A',
      message: `Found ${subjects.length} enrolled subjects but no scores yet`,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /api/results/student:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
