import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/teacher/subject-students
 * Fetch all students enrolled in a teacher's subject
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teacherId = searchParams.get('teacherId')
    const subjectId = searchParams.get('subjectId')
    const classId = searchParams.get('classId')
    const schoolId = searchParams.get('schoolId')

    if (!teacherId || !subjectId) {
      return NextResponse.json(
        { error: 'Missing required parameters: teacherId, subjectId' },
        { status: 400 }
      )
    }

    console.log('[Teacher Subject Students] Fetching for:', {
      teacherId,
      subjectId,
      classId,
      schoolId,
    })

    // Query 1: Get students enrolled in this subject
    let query = supabase
      .from('subject_enrollments')
      .select(
        `
        id,
        student_id,
        subject_id,
        school_id,
        students (
          id,
          full_name,
          admission_number,
          email,
          student_class (
            class_id,
            classes (
              class_name,
              arm_name
            )
          )
        )
      `
      )
      .eq('subject_id', subjectId)

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data: enrollments, error: enrollmentError } = await query

    if (enrollmentError) {
      console.error('[Teacher Subject Students] Error fetching enrollments:', enrollmentError)
      return NextResponse.json(
        { error: 'Failed to fetch subject students', details: enrollmentError.message },
        { status: 500 }
      )
    }

    // Format response
    const students = (enrollments || []).map((enrollment: any) => ({
      id: enrollment.student_id,
      full_name: enrollment.students?.full_name,
      admission_number: enrollment.students?.admission_number,
      email: enrollment.students?.email,
      class_name: enrollment.students?.student_class?.[0]?.classes?.class_name,
      arm_name: enrollment.students?.student_class?.[0]?.classes?.arm_name,
    }))

    console.log('[Teacher Subject Students] Found', students.length, 'students')

    return NextResponse.json({
      success: true,
      count: students.length,
      students,
    })
  } catch (error: any) {
    console.error('[Teacher Subject Students] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
