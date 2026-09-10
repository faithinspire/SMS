import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/student/cbt/exams
 * Get all eligible CBT exams for an authenticated student
 * 
 * FILTERS AUTOMATICALLY BY:
 * - Student's school
 * - Student's current term (optional)
 * - Student's enrolled subjects
 * - Student's class
 * - Exam availability window
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - student_id: UUID (required)
 * - term_id?: UUID (optional)
 * 
 * RETURNS:
 * - Array of eligible exams with full details
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

    // Get student details (class, subjects)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(
        `
        id,
        admission_number,
        class_arm_combo_id,
        class_arm_combos (
          id,
          classes (id, name, level),
          arms (id, name)
        ),
        student_subjects (
          id,
          subject_id
        ),
        users (
          id,
          full_name,
          email
        )
      `
      )
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get student's subject IDs
    const subjectIds = student.student_subjects?.map((ss: any) => ss.subject_id) || []

    if (subjectIds.length === 0) {
      return NextResponse.json({
        success: true,
        student_info: {
          name: student.users?.full_name,
          admission_number: student.admission_number,
          class_name: student.class_arm_combos?.classes?.name,
          arm_name: student.class_arm_combos?.arms?.name,
        },
        count: 0,
        exams: [],
        message: 'Student has no enrolled subjects',
      })
    }

    // Build query for eligible exams
    let query = supabase
      .from('cbt_exams')
      .select(
        `
        id,
        school_id,
        subject_id,
        class_arm_combo_id,
        created_by,
        teacher_id,
        title,
        description,
        assessment_type,
        term_id,
        duration_minutes,
        total_marks,
        passing_percentage,
        exam_type,
        status,
        start_time,
        end_time,
        created_at,
        subjects (id, name, code),
        class_arm_combos (
          id,
          classes (id, name, level),
          arms (id, name)
        ),
        terms (id, name),
        users!created_by (id, full_name)
      `
      )
      .eq('school_id', schoolId)
      .eq('class_arm_combo_id', student.class_arm_combo_id)
      .eq('status', 'ACTIVE')
      .in('subject_id', subjectIds)

    // Filter by term if provided
    if (termId) {
      query = query.eq('term_id', termId)
    }

    const { data: exams, error } = await query.order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching student exams:', error)
      return NextResponse.json(
        { error: `Failed to fetch exams: ${error.message}` },
        { status: 500 }
      )
    }

    // Check availability window and format response
    const now = new Date()
    const availableExams = (exams || []).filter((exam: any) => {
      const startTime = new Date(exam.start_time)
      const endTime = new Date(exam.end_time)
      return startTime <= now && endTime >= now
    })

    const upcomingExams = (exams || []).filter((exam: any) => {
      const startTime = new Date(exam.start_time)
      return startTime > now
    })

    const formattedExams = (exams || []).map((exam: any) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      assessment_type: exam.assessment_type,
      exam_type: exam.exam_type,
      subject: {
        id: exam.subject_id,
        name: exam.subjects?.name || 'N/A',
      },
      class: {
        name: exam.class_arm_combos?.classes?.name || 'N/A',
        arm: exam.class_arm_combos?.arms?.name || 'N/A',
      },
      term: {
        id: exam.term_id,
        name: exam.terms?.name || 'N/A',
      },
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      start_time: exam.start_time,
      end_time: exam.end_time,
      teacher_name: exam.users?.full_name || 'N/A',
      is_available: availableExams.some((e: any) => e.id === exam.id),
      is_upcoming: upcomingExams.some((e: any) => e.id === exam.id),
      created_at: exam.created_at,
    }))

    return NextResponse.json({
      success: true,
      student_info: {
        name: student.users?.full_name,
        admission_number: student.admission_number,
        class_name: student.class_arm_combos?.classes?.name,
        arm_name: student.class_arm_combos?.arms?.name,
      },
      count: formattedExams.length,
      available_count: availableExams.length,
      upcoming_count: upcomingExams.length,
      exams: formattedExams,
    })
  } catch (error: any) {
    console.error('Exception in student exams GET:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
