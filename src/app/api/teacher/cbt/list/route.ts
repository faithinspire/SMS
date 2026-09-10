import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/teacher/cbt/list
 * List all CBT exams for a teacher (by subject/class)
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - teacher_id: UUID (required)
 * - subject_id?: UUID (optional - filter by subject)
 * - class_arm_combo_id?: UUID (optional - filter by class)
 * 
 * RETURNS:
 * - Array of exams with full subject/class information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')
    const subjectId = searchParams.get('subject_id')
    const classArmComboId = searchParams.get('class_arm_combo_id')

    if (!schoolId || !teacherId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, teacher_id' },
        { status: 400 }
      )
    }

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
      .eq('teacher_id', teacherId)

    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    }

    if (classArmComboId) {
      query = query.eq('class_arm_combo_id', classArmComboId)
    }

    const { data: exams, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching exams:', error)
      return NextResponse.json(
        { error: `Failed to fetch exams: ${error.message}` },
        { status: 500 }
      )
    }

    // Format response with human-readable names
    const formattedExams = (exams || []).map((exam: any) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      assessment_type: exam.assessment_type,
      exam_type: exam.exam_type,
      status: exam.status,
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      passing_percentage: exam.passing_percentage,
      subject: {
        id: exam.subject_id,
        name: exam.subjects?.name || 'N/A',
        code: exam.subjects?.code || '',
      },
      class: {
        id: exam.class_arm_combo_id,
        class_name: exam.class_arm_combos?.classes?.name || 'N/A',
        arm_name: exam.class_arm_combos?.arms?.name || 'N/A',
      },
      term: {
        id: exam.term_id,
        name: exam.terms?.name || 'N/A',
      },
      start_time: exam.start_time,
      end_time: exam.end_time,
      created_at: exam.created_at,
      teacher_name: exam.users?.full_name || 'N/A',
    }))

    return NextResponse.json({
      success: true,
      count: formattedExams.length,
      exams: formattedExams,
    })
  } catch (error: any) {
    console.error('Exception in CBT list:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
