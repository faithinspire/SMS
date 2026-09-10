import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/students/subject
 * Get all students for a specific subject taught by the teacher
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - teacher_id: UUID (required)
 * - subject_id: UUID (required)
 * - class_arm_combo_id?: UUID (optional - filter by specific class)
 * 
 * RETURNS:
 * - Array of students taking this subject with human-readable info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')
    const subjectId = searchParams.get('subject_id')
    const classArmComboId = searchParams.get('class_arm_combo_id')

    if (!schoolId || !teacherId || !subjectId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, teacher_id, subject_id' },
        { status: 400 }
      )
    }

    // Verify teacher is assigned to this subject in the requested class(es)
    let assignmentQuery = supabase
      .from('subject_teacher_assignments')
      .select('id, class_arm_combo_id')
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId)
      .eq('school_id', schoolId)

    if (classArmComboId) {
      assignmentQuery = assignmentQuery.eq('class_arm_combo_id', classArmComboId)
    }

    const { data: assignments, error: assignError } = await assignmentQuery

    if (assignError || !assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: 'Teacher not assigned to teach this subject' },
        { status: 403 }
      )
    }

    const classIds = assignments.map((a) => a.class_arm_combo_id)

    // Get all students taking this subject in the teacher's assigned classes
    const { data: students, error: studentError } = await supabase
      .from('student_subjects')
      .select(
        `
        id,
        student_id,
        students (
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
          )
        )
      `
      )
      .eq('subject_id', subjectId)
      .eq('school_id', schoolId)
      .in('class_arm_combo_id', classIds)

    if (studentError) {
      console.error('Error fetching subject students:', studentError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    // Get subject details
    const { data: subject } = await supabase
      .from('subjects')
      .select('name, code')
      .eq('id', subjectId)
      .eq('school_id', schoolId)
      .single()

    // Format response
    const formattedStudents = (students || [])
      .map((enrollment: any) => {
        const student = enrollment.students as any
        return {
          id: student.id,
          user_id: student.user_id,
          name: student.users?.full_name || 'N/A',
          admission_number: student.admission_number,
          email: student.users?.email || 'N/A',
          photo_url: student.photo_url,
          class_name: student.class_arm_combos?.classes?.name || 'N/A',
          arm_name: student.class_arm_combos?.arms?.name || 'N/A',
        }
      })
      .sort((a, b) => a.admission_number.localeCompare(b.admission_number))

    return NextResponse.json({
      success: true,
      subject: {
        id: subjectId,
        name: subject?.name || 'N/A',
        code: subject?.code || 'N/A',
      },
      count: formattedStudents.length,
      students: formattedStudents,
    })
  } catch (error: any) {
    console.error('Exception in teacher subject students:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

