import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/students/class
 * Get all students in the teacher's managed class(es)
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - teacher_id: UUID (required)
 * - class_arm_combo_id?: UUID (optional - filter by specific class)
 * 
 * RETURNS:
 * - Array of students with human-readable names
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')
    const classArmComboId = searchParams.get('class_arm_combo_id')

    if (!schoolId || !teacherId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, teacher_id' },
        { status: 400 }
      )
    }

    // Get classes taught by this teacher
    let classQuery = supabase
      .from('class_arm_combos')
      .select('id')
      .eq('class_teacher_id', teacherId)
      .eq('school_id', schoolId)

    const { data: managedClasses, error: classError } = await classQuery

    if (classError) {
      console.error('Error fetching managed classes:', classError)
      return NextResponse.json(
        { error: 'Failed to fetch managed classes' },
        { status: 500 }
      )
    }

    if (!managedClasses || managedClasses.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        students: [],
        message: 'Teacher does not manage any classes',
      })
    }

    const classIds = managedClasses.map((c) => c.id)

    // Get all students in managed classes
    let studentQuery = supabase
      .from('students')
      .select(
        `
        id,
        user_id,
        admission_number,
        photo_url,
        class_arm_combo_id,
        users (
          id,
          full_name,
          email
        ),
        class_arm_combos (
          id,
          classes (name),
          arms (name)
        ),
        student_subjects (
          id,
          subject_id,
          subjects (name, code)
        )
      `
      )
      .eq('school_id', schoolId)
      .in('class_arm_combo_id', classIds)

    if (classArmComboId) {
      studentQuery = studentQuery.eq('class_arm_combo_id', classArmComboId)
    }

    const { data: students, error: studentError } = await studentQuery.order('admission_number', {
      ascending: true,
    })

    if (studentError) {
      console.error('Error fetching students:', studentError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    // Format response
    const formattedStudents = (students || []).map((student: any) => ({
      id: student.id,
      user_id: student.user_id,
      name: student.users?.full_name || 'N/A',
      admission_number: student.admission_number,
      email: student.users?.email || 'N/A',
      photo_url: student.photo_url,
      class_name: student.class_arm_combos?.classes?.name || 'N/A',
      arm_name: student.class_arm_combos?.arms?.name || 'N/A',
      subjects: student.student_subjects?.map((ss: any) => ({
        id: ss.subject_id,
        name: ss.subjects?.name || 'N/A',
        code: ss.subjects?.code || 'N/A',
      })) || [],
    }))

    return NextResponse.json({
      success: true,
      count: formattedStudents.length,
      students: formattedStudents,
    })
  } catch (error: any) {
    console.error('Exception in teacher class students:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

