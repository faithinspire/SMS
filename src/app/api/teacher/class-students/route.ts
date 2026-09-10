import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/class-students
 * Fetch all students in a specific class with their enrolled subjects
 * 
 * HEADERS:
 * - x-teacher-id: UUID (teacher/user id)
 * - x-school-id: UUID (school id)
 * 
 * QUERY PARAMS:
 * - class_arm_combo_id: UUID (required)
 * 
 * RETURNS:
 * - Array of students with their enrolled subjects
 */
export async function GET(request: NextRequest) {
  try {
    const teacherId = request.headers.get('x-teacher-id')
    const schoolId = request.headers.get('x-school-id')
    const { searchParams } = new URL(request.url)
    const classArmComboId = searchParams.get('class_arm_combo_id')

    if (!teacherId || !schoolId) {
      return NextResponse.json(
        { error: 'Missing required headers: x-teacher-id, x-school-id' },
        { status: 400 }
      )
    }

    if (!classArmComboId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: class_arm_combo_id' },
        { status: 400 }
      )
    }

    // Fetch students in this class
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        admission_number,
        school_id,
        class_arm_combo_id,
        users!students_user_id_fkey (
          id,
          full_name,
          email,
          photo_url
        )
      `)
      .eq('class_arm_combo_id', classArmComboId)
      .eq('school_id', schoolId)

    if (studentError) {
      console.error('Error fetching students:', studentError)
      throw studentError
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        students: [],
        message: 'No students in this class',
      })
    }

    // Fetch subjects for each student
    const studentIds = students.map(s => s.id)
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('student_subjects')
      .select(`
        id,
        student_id,
        subject_id,
        subjects (
          id,
          name,
          code
        )
      `)
      .in('student_id', studentIds)
      .eq('school_id', schoolId)

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError)
      throw enrollmentError
    }

    // Build enrollment map
    const enrollmentMap = new Map()
    ;(enrollments || []).forEach((enrollment: any) => {
      if (!enrollmentMap.has(enrollment.student_id)) {
        enrollmentMap.set(enrollment.student_id, [])
      }
      enrollmentMap.get(enrollment.student_id).push(enrollment.subjects)
    })

    // Combine student data with subjects
    const enrichedStudents = students.map((student: any) => ({
      id: student.id,
      user_id: student.user_id,
      admission_number: student.admission_number,
      full_name: student.users?.full_name || 'Unknown',
      email: student.users?.email,
      photo_url: student.users?.photo_url,
      class_arm_combo_id: student.class_arm_combo_id,
      school_id: student.school_id,
      subjects: enrollmentMap.get(student.id) || [],
    }))

    return NextResponse.json({
      success: true,
      count: enrichedStudents.length,
      students: enrichedStudents,
    })
  } catch (error: any) {
    console.error('Error in GET /api/teacher/class-students:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

