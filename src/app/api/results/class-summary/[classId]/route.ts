import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/results/class-summary/[classId]
 * 
 * Fetch all student scores for a class (for Principal/HeadTeacher dashboards)
 * Returns aggregated scores for all students in a class
 * 
 * Query params:
 * - schoolId: UUID (required)
 * - termId: UUID (required)
 * 
 * Response:
 * {
 *   students: [
 *     {
 *       student_id: UUID,
 *       full_name: string,
 *       admission_number: string,
 *       overall_score: number,
 *       overall_grade: string,
 *       performance_rating: string
 *     }
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const termId = searchParams.get('termId')
    const classId = params.classId

    console.log('[API] GET /api/results/class-summary fetch:', {
      classId,
      schoolId,
      termId,
    })

    if (!schoolId || !classId || !termId) {
      return NextResponse.json(
        { error: 'Missing required parameters: schoolId, classId, termId' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 1: GET ALL STUDENTS IN THIS CLASS
    // ========================================================================
    console.log('[API] Fetching students from class:', classId)

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, admission_number, user_id')
      .eq('class_arm_combo_id', classId)
      .order('admission_number', { ascending: true })

    if (studentsError) {
      console.error('[API] Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      )
    }

    console.log('[API] Found students:', students?.length || 0)

    if (!students || students.length === 0) {
      console.warn('[API] No students found in class')
      return NextResponse.json({
        success: true,
        students: [],
        message: 'No students in this class',
      })
    }

    // ========================================================================
    // STEP 2: GET SCORES FOR ALL STUDENTS
    // ========================================================================
    console.log('[API] Fetching scores for:', students.length, 'students')

    const studentIds = students.map((s) => s.id)
    console.log('[API] Student IDs:', studentIds)

    const { data: allScores, error: scoresError } = await supabase
      .from('score_sheets')
      .select('id, student_id, test1, test2, test3, test4, exam, total, grade')
      .eq('school_id', schoolId)
      .eq('term_id', termId)
      .in('student_id', studentIds)

    if (scoresError) {
      console.error('[API] Error fetching scores:', scoresError)
      console.error('[API] Filters used:', { school_id: schoolId, term_id: termId, student_ids: studentIds })
      // Don't fail - just continue with 0 scores
    }

    console.log('[API] Fetched scores:', allScores?.length || 0)

    // ========================================================================
    // STEP 3: AGGREGATE SCORES BY STUDENT
    // ========================================================================

    const scoresByStudent: Record<string, any> = {}

    for (const score of allScores || []) {
      if (!scoresByStudent[score.student_id]) {
        scoresByStudent[score.student_id] = {
          scores: [],
          totalSum: 0,
          count: 0,
        }
      }

      const total = score.total || 0
      scoresByStudent[score.student_id].scores.push(total)
      scoresByStudent[score.student_id].totalSum += total
      scoresByStudent[score.student_id].count += 1
    }

    // ========================================================================
    // STEP 4: FORMAT RESPONSE
    // ========================================================================

    const studentResults = students.map((student) => {
      const stats = scoresByStudent[student.id]
      const overallScore =
        stats && stats.count > 0
          ? Math.round(stats.totalSum / stats.count)
          : 0

      let overallGrade = 'F'
      if (overallScore >= 90) overallGrade = 'A'
      else if (overallScore >= 80) overallGrade = 'B'
      else if (overallScore >= 70) overallGrade = 'C'
      else if (overallScore >= 60) overallGrade = 'D'
      else if (overallScore >= 40) overallGrade = 'E'

      let performanceRating = 'Very Poor'
      if (overallScore >= 85) performanceRating = 'Excellent'
      else if (overallScore >= 75) performanceRating = 'Very Good'
      else if (overallScore >= 65) performanceRating = 'Good'
      else if (overallScore >= 55) performanceRating = 'Fair'
      else if (overallScore >= 40) performanceRating = 'Poor'

      return {
        id: student.id,
        student_id: student.id,
        full_name: student.full_name || 'Unknown',
        admission_number: student.admission_number || 'N/A',
        overall_score: overallScore,
        overall_grade: overallGrade,
        performance_rating: performanceRating,
      }
    })

    // Sort by score descending
    studentResults.sort((a, b) => b.overall_score - a.overall_score)

    console.log('[API] Returning class results:', {
      studentCount: studentResults.length,
      schoolId,
      termId,
      classId,
    })

    return NextResponse.json({
      success: true,
      students: studentResults,
      message: `Found ${studentResults.length} students`,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /api/results/class-summary:', error)
    console.error('[API] Error stack:', error.stack)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
