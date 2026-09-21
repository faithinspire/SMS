import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/teacher/assignments/create
 *
 * Creates a new assignment for a class
 *
 * REQUEST BODY:
 * {
 *   school_id: UUID (required),
 *   teacher_id: UUID (required),
 *   subject_id: UUID (required),
 *   class_arm_combo_id: UUID (required),
 *   title: string (required),
 *   description?: string,
 *   instructions?: string,
 *   due_date?: DATE (YYYY-MM-DD format),
 *   max_marks?: number,
 *   term_id?: UUID,
 *   attachments?: object
 * }
 *
 * RETURNS:
 * {
 *   success: boolean,
 *   assignment_id: UUID,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      school_id: schoolId,
      teacher_id: teacherId,
      subject_id: subjectId,
      class_arm_combo_id: classArmComboId,
      title,
      description,
      instructions,
      due_date: dueDate,
      max_marks: maxMarks,
      term_id: termId,
      attachments,
    } = body

    // Validate required fields
    if (!schoolId || !teacherId || !subjectId || !classArmComboId || !title) {
      return NextResponse.json(
        {
          error: 'Missing required fields: school_id, teacher_id, subject_id, class_arm_combo_id, title',
        },
        { status: 400 }
      )
    }

    console.log('[AssignmentAPI] Creating assignment:', {
      schoolId,
      teacherId,
      subjectId,
      classArmComboId,
      title,
      dueDate,
    })

    // Verify teacher exists and belongs to school
    const { data: teacherData, error: teacherError } = await supabase
      .from('users')
      .select('id, school_id')
      .eq('id', teacherId)
      .eq('school_id', schoolId)
      .single()

    if (teacherError || !teacherData) {
      console.error('[AssignmentAPI] Teacher not found or not in school:', teacherError)
      return NextResponse.json(
        { error: 'Teacher not found in this school' },
        { status: 404 }
      )
    }

    // Verify subject exists and is in school
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('id, school_id')
      .eq('id', subjectId)
      .eq('school_id', schoolId)
      .single()

    if (subjectError || !subjectData) {
      console.error('[AssignmentAPI] Subject not found:', subjectError)
      return NextResponse.json(
        { error: 'Subject not found in this school' },
        { status: 404 }
      )
    }

    // Verify class_arm_combo exists and is in school
    const { data: classData, error: classError } = await supabase
      .from('class_arm_combos')
      .select('id, school_id')
      .eq('id', classArmComboId)
      .eq('school_id', schoolId)
      .single()

    if (classError || !classData) {
      console.error('[AssignmentAPI] Class not found:', classError)
      return NextResponse.json(
        { error: 'Class not found in this school' },
        { status: 404 }
      )
    }

    // If term_id provided, verify it exists
    if (termId) {
      const { data: termData, error: termError } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('id', termId)
        .eq('school_id', schoolId)
        .single()

      if (termError || !termData) {
        console.error('[AssignmentAPI] Term not found:', termError)
        return NextResponse.json(
          { error: 'Academic term not found' },
          { status: 404 }
        )
      }
    }

    // Create the assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        school_id: schoolId,
        subject_id: subjectId,
        class_arm_combo_id: classArmComboId,
        created_by: teacherId,
        title,
        description: description || null,
        instructions: instructions || null,
        due_date: dueDate || null,
        max_marks: maxMarks || null,
        term_id: termId || null,
        attachments: attachments || null,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (assignmentError) {
      console.error('[AssignmentAPI] Error creating assignment:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to create assignment', details: assignmentError.message },
        { status: 500 }
      )
    }

    const assignmentId = assignmentData.id

    console.log('[AssignmentAPI] ✅ Assignment created:', assignmentId)

    return NextResponse.json({
      success: true,
      assignment_id: assignmentId,
      message: 'Assignment created successfully',
    })
  } catch (error: any) {
    console.error('[AssignmentAPI] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
