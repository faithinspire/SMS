import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/teacher/subjects
 * Fetch all subjects taught by a teacher
 * 
 * HEADERS:
 * - x-teacher-id: UUID (teacher/user id)
 * - x-school-id: UUID (school id)
 * 
 * QUERY PARAMS:
 * - class_arm_combo_id: UUID (optional, filter by specific class)
 * 
 * RETURNS:
 * - Array of subjects with their details
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

    let query = supabase
      .from('subject_teacher_assignments')
      .select(`
        id,
        teacher_id,
        subject_id,
        class_arm_combo_id,
        school_id,
        subjects (
          id,
          name,
          code,
          applicable_to_levels
        ),
        class_arm_combos (
          id,
          class_id,
          arm_id,
          classes (name, level),
          arms (name)
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)

    if (classArmComboId) {
      query = query.eq('class_arm_combo_id', classArmComboId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching subjects:', error)
      throw error
    }

    // Deduplicate subjects (same subject may be taught in multiple classes)
    const subjectMap = new Map()
    const assignments: any[] = []

    (data || []).forEach((assignment: any) => {
      assignments.push(assignment)
      
      const subject = assignment.subjects
      if (subject && !subjectMap.has(subject.id)) {
        subjectMap.set(subject.id, subject)
      }
    })

    return NextResponse.json({
      success: true,
      subjects_count: subjectMap.size,
      assignments_count: assignments.length,
      subjects: Array.from(subjectMap.values()),
      assignments,
    })
  } catch (error: any) {
    console.error('Error in GET /api/teacher/subjects:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
