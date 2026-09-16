import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/results/class/[classId]
 * 
 * Fetch all scores for all students in a class for a specific term
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
 *       student_name: string,
 *       admission_number: string,
 *       subjects: [ ... ],
 *       overall_score: number,
 *       overall_grade: string
 *     }
 *   ],
 *   class_stats: {
 *     total_students: number,
 *     average_score: number
 *   }
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

    console.log('[API] GET /api/results/class fetch:', {
      schoolId,
      classId,
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

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, admission_number, user_id')
      .eq('school_id', schoolId)
      .eq('class_arm_combo_id', classId)
      .order('admission_number', { ascending: true })

    if (studentsError) {
      console.error('[API] Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      )
    }

    if (!students || students.length === 0) {
      console.warn('[API] No students found in class')
      return NextResponse.json({
        students: [],
        class_stats: {
          total_students: 0,
          average_score: 0,
        },
      })
    }

    console.log('[API] Found students:', students.length)

    // ========================================================================
    // STEP 2: GET USER NAMES FOR STUDENTS
    // ========================================================================

    const userIds = students.map((s) => s.user_id).filter(Boolean)
    let userNameMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds)

      if (users) {
        userNameMap = Object.fromEntries(users.map((u) => [u.id, u.full_name]))
      }
    }

    // ========================================================================
    // STEP 3: GET ALL SCORES FOR ALL STUDENTS IN THIS TERM
    // ========================================================================

    const studentIds = students.map((s) => s.id)
    const { data: allScores, error: scoresError } = await supabase
      .from('score_sheets')
      .select(
        `
        id,
        student_id,
        subject_id,
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
      .eq('term_id', termId)
      .in('student_id', studentIds)

    if (scoresError) {
      console.error('[API] Error fetching scores:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch scores', details: scoresError.message },
        { status: 500 }
      )
    }

    console.log('[API] Fetched total scores:', allScores?.length || 0)

    // ========================================================================
    // STEP 4: GROUP SCORES BY STUDENT
    // ========================================================================

    const scoresMap = new Map<string, any[]>()
    if (allScores) {
      allScores.forEach((score) => {
        if (!scoresMap.has(score.student_id)) {
          scoresMap.set(score.student_id, [])
        }
        scoresMap.get(score.student_id)!.push(score)
      })
    }

    // ========================================================================
    // STEP 5: BUILD RESPONSE - STUDENT RESULTS
    // ========================================================================

    const studentsWithResults = students.map((student) => {
      const studentScores = scoresMap.get(student.id) || []

      // Format subjects
      const subjects = studentScores.map((score: any) => ({
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

      // Calculate student's overall score
      const totalScore = subjects.reduce((sum, s) => sum + (s.total || 0), 0)
      const overallScore =
        subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0

      // Determine grade
      let overallGrade = 'F'
      if (overallScore >= 90) overallGrade = 'A'
      else if (overallScore >= 80) overallGrade = 'B'
      else if (overallScore >= 70) overallGrade = 'C'
      else if (overallScore >= 60) overallGrade = 'D'
      else if (overallScore >= 40) overallGrade = 'E'

      return {
        student_id: student.id,
        student_name: userNameMap[student.user_id] || 'Unknown',
        admission_number: student.admission_number,
        subjects,
        overall_score: overallScore,
        overall_grade: overallGrade,
      }
    })

    // ========================================================================
    // STEP 6: CALCULATE CLASS STATISTICS
    // ========================================================================

    const classAverage = Math.round(
      studentsWithResults.reduce((sum, s) => sum + s.overall_score, 0) /
        studentsWithResults.length
    )

    console.log('[API] Returning class results:', {
      studentCount: studentsWithResults.length,
      classAverage,
    })

    return NextResponse.json({
      success: true,
      students: studentsWithResults,
      class_stats: {
        total_students: studentsWithResults.length,
        average_score: classAverage,
      },
      message: `Found results for ${studentsWithResults.length} students`,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /api/results/class:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
