import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/student/report-card
 * 
 * Generate report card for a student for a specific term
 * 
 * â­ CANONICAL DATA SOURCE: Reads ONLY from score_sheets table
 * - All scores flow through score_sheets (MANUAL entry by subject teachers or AUTO from CBT)
 * - Includes source tracking (MANUAL vs CBT) for transparency
 * - No duplicate data - single source of truth
 * 
 * Combines scores, attendance, and comments
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - student_id: UUID (required)
 * - term_id: UUID (optional)
 * 
 * RETURNS:
 * - Complete report card data with scores, attendance, and comments
 * - Score sources (MANUAL/CBT) included for transparency
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const studentId = searchParams.get('student_id')
    const termId = searchParams.get('term_id')

    if (!schoolId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, student_id' },
        { status: 400 }
      )
    }

    // Fetch student information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        admission_number,
        user_id,
        class_arm_combo_id,
        users!students_user_id_fkey (
          full_name,
          email,
          photo_url
        ),
        class_arm_combos (
          id,
          classes (name, level),
          arms (name)
        )
      `)
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Fetch school information
    const { data: schoolData } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()

    // Fetch term information
    let term = null
    if (termId) {
      const { data: termData } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('id', termId)
        .eq('school_id', schoolId)
        .maybeSingle()
      term = termData
    } else {
      // Get current term
      const { data: termData } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .maybeSingle()
      
      if (!termData) {
        // Fallback to first available term
        const { data: fallbackTerm } = await supabase
          .from('academic_terms')
          .select('*')
          .eq('school_id', schoolId)
          .limit(1)
          .maybeSingle()
        term = fallbackTerm
      } else {
        term = termData
      }
    }

    // Fetch scores from CANONICAL score_sheets table
    let scoreQuery = supabase
      .from('score_sheets')
      .select(`
        id,
        subject_id,
        test1,
        test2,
        test3,
        test4,
        exam,
        total,
        grade,
        teacher_comment,
        updated_at,
        test1_source,
        test2_source,
        test3_source,
        test4_source,
        exam_source,
        subjects (
          id,
          name,
          code
        )
      `)
      .eq('school_id', schoolId)
      .eq('student_id', studentId)

    if (termId) {
      scoreQuery = scoreQuery.eq('term_id', termId)
    } else {
      // If no term specified, use current term
      if (term?.id) {
        scoreQuery = scoreQuery.eq('term_id', term.id)
      }
    }

    const { data: scores, error: scoreError } = await scoreQuery

    if (scoreError) {
      console.error('Error fetching scores:', scoreError)
      // Continue without scores instead of failing
    }

    // Fetch attendance for the student
    let attendanceQuery = supabase
      .from('attendance')
      .select('status, date')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)

    // Filter by term dates if term exists
    if (term?.start_date && term?.end_date) {
      attendanceQuery = attendanceQuery
        .gte('date', term.start_date)
        .lte('date', term.end_date)
    }

    const { data: attendanceRecords, error: attendanceError } = await attendanceQuery

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      // Continue without attendance
    }

    // Calculate attendance statistics
    let attendanceStats = {
      total_school_days: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      percentage: 0,
    }

    if (attendanceRecords && attendanceRecords.length > 0) {
      const unique_dates = new Set(attendanceRecords.map(a => a.date))
      attendanceStats.total_school_days = unique_dates.size

      attendanceRecords.forEach(record => {
        switch (record.status) {
          case 'PRESENT':
            attendanceStats.present++
            break
          case 'ABSENT':
            attendanceStats.absent++
            break
          case 'LATE':
            attendanceStats.late++
            break
          case 'EXCUSED':
            attendanceStats.excused++
            break
        }
      })

      attendanceStats.percentage =
        attendanceStats.total_school_days > 0
          ? ((attendanceStats.present + attendanceStats.late) / attendanceStats.total_school_days) * 100
          : 0
    }

    // Calculate overall statistics - map from score_sheets to report card format
    const reportCardScores = (scores || []).map(score => ({
      subject_id: score.subject_id,
      subject_name: score.subjects?.name || 'Unknown',
      subject_code: score.subjects?.code || '',
      test1: score.test1,
      test2: score.test2,
      test3: score.test3,
      test4: score.test4,
      test_total: (score.test1 || 0) + (score.test2 || 0) + (score.test3 || 0) + (score.test4 || 0),
      exam: score.exam,
      total: score.total,
      grade: score.grade || '-',
      teacher_comment: score.teacher_comment || '',
      updated_at: score.updated_at,
      test1_source: score.test1_source,
      test2_source: score.test2_source,
      test3_source: score.test3_source,
      test4_source: score.test4_source,
      exam_source: score.exam_source,
    }))

    // Calculate overall performance
    let overallStats = {
      total_subjects: reportCardScores.length,
      overall_score: 0,
      overall_percentage: 0,
      overall_grade: '-',
      subjects_passed: 0,
    }

    if (reportCardScores.length > 0) {
      const totalScore = reportCardScores.reduce((sum, s) => sum + (s.total || 0), 0)
      overallStats.overall_score = totalScore
      overallStats.overall_percentage = (totalScore / reportCardScores.length) / 100 * 100
      overallStats.subjects_passed = reportCardScores.filter(
        s => s.grade && s.grade !== 'F' && s.grade !== '-'
      ).length

      // Determine overall grade
      if (overallStats.overall_percentage >= 70) overallStats.overall_grade = 'A'
      else if (overallStats.overall_percentage >= 60) overallStats.overall_grade = 'B'
      else if (overallStats.overall_percentage >= 50) overallStats.overall_grade = 'C'
      else if (overallStats.overall_percentage >= 40) overallStats.overall_grade = 'D'
      else overallStats.overall_grade = 'F'
    }

    return NextResponse.json({
      success: true,
      report_card: {
        student: {
          id: student.id,
          admission_number: student.admission_number,
          full_name: student.users?.full_name || 'Unknown',
          email: student.users?.email,
          photo_url: student.users?.photo_url,
          class: student.class_arm_combos?.classes?.name || 'Unknown',
          arm: student.class_arm_combos?.arms?.name || 'Unknown',
          level: student.class_arm_combos?.classes?.level,
        },
        school: {
          id: schoolData?.id,
          name: schoolData?.name || 'Unknown School',
          logo_url: schoolData?.logo_url,
        },
        term: term ? {
          id: term.id,
          name: term.name,
          session_year: term.session_year,
          start_date: term.start_date,
          end_date: term.end_date,
        } : null,
        scores: reportCardScores,
        attendance: attendanceStats,
        overall: overallStats,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/student/report-card:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

