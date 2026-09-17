import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/results/student/[studentId]
 * 
 * ENHANCED: Fetch scores from score_sheets (includes manual + CBT)
 * Returns ALL subject scores for a student in a term
 * Also includes school info (name, logo) and student class name
 * Includes detailed logging for debugging
 * 
 * Query params:
 * - schoolId: UUID (required)
 * - termId: UUID (required)
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

    const timestamp = new Date().toISOString()
    console.log(`[RESULTS API] ${timestamp} - START fetch for student:`, {
      studentId,
      schoolId,
      termId,
    })

    if (!schoolId || !studentId || !termId) {
      console.error('[RESULTS API] Missing required params')
      return NextResponse.json(
        { error: 'Missing required parameters: schoolId, studentId, termId' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 0: Fetch school info and student class
    // ========================================================================
    console.log('[RESULTS API] Fetching school and student class info...')

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, logo_url')
      .eq('id', schoolId)
      .single()

    if (schoolError) {
      console.warn('[RESULTS API] School fetch warning:', schoolError)
    }

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        class_arm_combo_id,
        class_arm_combos:class_arm_combo_id(
          id,
          classes:class_id(id, name),
          arms:arm_id(id, name)
        )
      `)
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single()

    if (studentError) {
      console.warn('[RESULTS API] Student fetch warning:', studentError)
    }

    let schoolName = school?.name || 'Unknown School'
    let schoolLogo = school?.logo_url || null
    let className = 'No Class'

    if (studentData?.class_arm_combos) {
      const classCombo = studentData.class_arm_combos as any
      const classN = classCombo.classes?.name || ''
      const armName = classCombo.arms?.name || ''
      className = armName ? `${classN} ${armName}` : classN
    }

    console.log('[RESULTS API] School & Class:', { schoolName, className })

    // ========================================================================
    // STEP 1: Query score_sheets with ALL columns (manual + CBT)
    // ========================================================================
    console.log('[RESULTS API] Querying score_sheets with exact filters...')

    const { data: allScores, error: scoresError } = await supabase
      .from('score_sheets')
      .select(
        `
        id,
        student_id,
        subject_id,
        term_id,
        school_id,
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
        class_arm_combo_id,
        created_at,
        updated_at,
        subjects:subject_id(id, name, code)
      `
      )
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('term_id', termId)

    if (scoresError) {
      console.error('[RESULTS API] Score_sheets query failed:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch scores', details: scoresError.message },
        { status: 500 }
      )
    }

    console.log('[RESULTS API] Score_sheets query returned:', allScores?.length || 0, 'records')
    
    // Log sample if scores found
    if (allScores && allScores.length > 0) {
      console.log('[RESULTS API] Sample score record:', JSON.stringify(allScores[0], null, 2))
    }

    if (!allScores || allScores.length === 0) {
      console.warn('[RESULTS API] No scores in score_sheets. Checking enrollment...')
      
      // Check if student is even enrolled
      const { data: enrollment } = await supabase
        .from('student_subjects')
        .select('subject_id, subjects(id, name, code)')
        .eq('student_id', studentId)

      console.log('[RESULTS API] Student enrolled in:', enrollment?.length || 0, 'subjects')
      
      if (!enrollment || enrollment.length === 0) {
        console.warn('[RESULTS API] Student not enrolled in any subjects')
        return NextResponse.json({
          success: true,
          subjects: [],
          overall_score: 0,
          overall_grade: 'N/A',
          message: 'Student has no enrolled subjects',
        })
      }

      // Return enrolled subjects with no scores
      const subjectsWithoutScores = enrollment.map((e: any) => ({
        subject_id: e.subject_id,
        subject_name: e.subjects?.name || 'Unknown',
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

      console.log('[RESULTS API] Returning enrolled subjects without scores')
      return NextResponse.json({
        success: true,
        subjects: subjectsWithoutScores,
        overall_score: 0,
        overall_grade: 'N/A',
        school: {
          name: schoolName,
          logo: schoolLogo,
        },
        class: {
          name: className,
        },
        message: `Found ${enrollment.length} enrolled subjects but no scores entered`,
      })
    }

    // ========================================================================
    // STEP 2: Format scores for response (include sources for debugging)
    // ========================================================================
    console.log('[RESULTS API] Processing scores for response...')

    const subjects = allScores.map((score: any) => {
      const hasAnyScore = 
        score.test1 !== null || score.test2 !== null || 
        score.test3 !== null || score.test4 !== null || 
        score.exam !== null

      return {
        subject_id: score.subject_id,
        subject_name: score.subjects?.name || 'Unknown Subject',
        test1: score.test1,
        test2: score.test2,
        test3: score.test3,
        test4: score.test4,
        exam: score.exam,
        total: score.total || 0,
        grade: score.grade || null,
        hasScores: hasAnyScore,
        sources: {
          test1_source: score.test1_source, // 'Manual' or 'CBT'
          test2_source: score.test2_source,
          test3_source: score.test3_source,
          test4_source: score.test4_source,
          exam_source: score.exam_source,
        },
      }
    })

    // Calculate overall score and grade
    const validScores = subjects.filter((s: any) => s.total > 0)
    const totalScore = validScores.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
    const overallScore = validScores.length > 0 ? Math.round(totalScore / validScores.length) : 0

    let overallGrade = 'N/A'
    if (overallScore >= 90) overallGrade = 'A'
    else if (overallScore >= 80) overallGrade = 'B'
    else if (overallScore >= 70) overallGrade = 'C'
    else if (overallScore >= 60) overallGrade = 'D'
    else if (overallScore >= 50) overallGrade = 'E'
    else if (overallScore > 0) overallGrade = 'F'

    console.log('[RESULTS API] Response:', {
      subjectCount: subjects.length,
      scoresWithValues: validScores.length,
      overallScore,
      overallGrade,
      schoolName,
      className,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      subjects,
      overall_score: overallScore,
      overall_grade: overallGrade,
      school: {
        name: schoolName,
        logo: schoolLogo,
      },
      class: {
        name: className,
      },
      stats: {
        totalSubjects: subjects.length,
        subjectsWithScores: validScores.length,
      },
      message: `Found ${subjects.length} subjects with ${validScores.length} graded`,
    })
  } catch (error: any) {
    console.error('[RESULTS API] Exception:', error)
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
