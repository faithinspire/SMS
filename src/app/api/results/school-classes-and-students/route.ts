import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ClassWithStudents {
  id: string
  class_name: string
  arm_name: string
  student_count: number
  students: Array<{
    id: string
    full_name: string
    admission_number: string
    overall_score: number
    overall_grade: string
    performance_rating: string
  }>
}

/**
 * GET /api/results/school-classes-and-students?schoolId=...&termId=...
 * 
 * Fetches all classes for a school with students and their scores for a specific term
 * Returns:
 * {
 *   classes: [
 *     {
 *       id: string (class_arm_combo_id)
 *       class_name: string
 *       arm_name: string
 *       student_count: number
 *       students: [...student data with scores...]
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const termId = searchParams.get('termId')

    console.log('[API] Fetching classes and students:', {
      schoolId,
      termId,
    })

    if (!schoolId || !termId) {
      return NextResponse.json(
        { error: 'Missing required parameters: schoolId, termId' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 1: Fetch all class_arm_combos for this school
    // ========================================================================
    console.log('[API] Fetching classes for school:', schoolId)

    const { data: classArmCombos, error: classError } = await supabase
      .from('class_arm_combos')
      .select(`
        id,
        classes(id, name),
        arms(id, name)
      `)
      .eq('school_id', schoolId)
      .order('id', { ascending: true })

    if (classError) {
      console.error('[API] Error fetching classes:', classError)
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classError.message },
        { status: 500 }
      )
    }

    console.log('[API] Found classes:', classArmCombos?.length || 0)

    if (!classArmCombos || classArmCombos.length === 0) {
      console.warn('[API] No classes found for school')
      return NextResponse.json({
        success: true,
        classes: [],
        message: 'No classes found for this school',
      })
    }

    // ========================================================================
    // STEP 2: For each class, fetch students and their scores
    // ========================================================================
    const classResults: ClassWithStudents[] = []

    for (const classCombo of classArmCombos) {
      const classId = classCombo.id
      const className = classCombo.classes?.name || 'Class'
      const armName = classCombo.arms?.name || ''

      console.log('[API] Processing class:', className, armName)

      // Get all students in this class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('class_arm_combo_id', classId)
        .is('deleted_at', null)
        .order('admission_number', { ascending: true })

      if (studentsError) {
        console.error('[API] Error fetching students for class:', studentsError)
        classResults.push({
          id: classId,
          class_name: className,
          arm_name: armName,
          student_count: 0,
          students: [],
        })
        continue
      }

      console.log('[API] Found students in class:', students?.length || 0)

      if (!students || students.length === 0) {
        classResults.push({
          id: classId,
          class_name: className,
          arm_name: armName,
          student_count: 0,
          students: [],
        })
        continue
      }

      // Get scores for all students in this class for this term
      const studentIds = students.map((s) => s.id)

      const { data: scoreData, error: scoreError } = await supabase
        .from('score_sheets')
        .select('student_id, test1, test2, test3, test4, exam, total, grade')
        .eq('school_id', schoolId)
        .eq('term_id', termId)
        .in('student_id', studentIds)

      if (scoreError) {
        console.error('[API] Error fetching scores:', scoreError)
        // Continue anyway - students just won't have scores
      }

      console.log('[API] Found scores for term:', scoreData?.length || 0)

      // Aggregate scores by student
      const scoresByStudent: Record<string, any> = {}

      for (const score of scoreData || []) {
        if (!scoresByStudent[score.student_id]) {
          scoresByStudent[score.student_id] = {
            totalSum: 0,
            count: 0,
            scores: [],
          }
        }

        const total = score.total || 0
        scoresByStudent[score.student_id].scores.push(total)
        scoresByStudent[score.student_id].totalSum += total
        scoresByStudent[score.student_id].count += 1
      }

      // Format student results
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
        else if (overallScore >= 50) overallGrade = 'E'

        let performanceRating = 'Very Poor'
        if (overallScore >= 85) performanceRating = 'Excellent'
        else if (overallScore >= 75) performanceRating = 'Very Good'
        else if (overallScore >= 65) performanceRating = 'Good'
        else if (overallScore >= 55) performanceRating = 'Fair'
        else if (overallScore >= 40) performanceRating = 'Poor'

        return {
          id: student.id,
          full_name: student.full_name || 'Unknown',
          admission_number: student.admission_number || 'N/A',
          overall_score: overallScore,
          overall_grade: overallGrade,
          performance_rating: performanceRating,
        }
      })

      // Sort by score descending
      studentResults.sort((a, b) => b.overall_score - a.overall_score)

      classResults.push({
        id: classId,
        class_name: className,
        arm_name: armName,
        student_count: studentResults.length,
        students: studentResults,
      })

      console.log('[API] Class processed:', className, armName, 'with', studentResults.length, 'students')
    }

    console.log('[API] Returning class results:', classResults.length, 'classes')

    return NextResponse.json({
      success: true,
      classes: classResults,
      message: `Found ${classResults.length} classes with ${classResults.reduce((sum, c) => sum + c.student_count, 0)} students`,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /api/results/school-classes-and-students:', error)
    console.error('[API] Error stack:', error.stack)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
