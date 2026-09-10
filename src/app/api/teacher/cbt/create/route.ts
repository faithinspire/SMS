import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'

/**
 * POST /api/teacher/cbt/create
 * Create a new CBT exam
 * 
 * REQUIRED FIELDS:
 * - school_id: UUID
 * - subject_id: UUID
 * - class_arm_combo_id: UUID
 * - teacher_id: UUID (authenticated user)
 * - title: string
 * - assessment_type: 'CA1' | 'CA2' | 'CA3' | 'CA4' | 'MIDTERM' | 'EXAM'
 * - term_id: UUID
 * - duration_minutes: number
 * - total_marks: number
 * - description?: string
 * - passing_percentage?: number
 * 
 * RETURNS:
 * - exam object with id, created_at, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const required = [
      'school_id',
      'subject_id',
      'class_arm_combo_id',
      'teacher_id',
      'title',
      'assessment_type',
      'term_id',
      'duration_minutes',
      'total_marks',
    ]

    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Additional validation
    if (!['CA1', 'CA2', 'CA3', 'CA4', 'MIDTERM', 'EXAM'].includes(body.assessment_type)) {
      return NextResponse.json(
        { error: 'Invalid assessment_type' },
        { status: 400 }
      )
    }

    // Verify teacher is assigned to this subject/class
    const { data: assignment, error: assignError } = await supabase
      .from('subject_teacher_assignments')
      .select('id')
      .eq('teacher_id', body.teacher_id)
      .eq('subject_id', body.subject_id)
      .eq('class_arm_combo_id', body.class_arm_combo_id)
      .eq('school_id', body.school_id)
      .single()

    if (assignError || !assignment) {
      return NextResponse.json(
        { error: 'Teacher not assigned to this subject/class combination' },
        { status: 403 }
      )
    }

    // Verify subject exists in canonical catalog
    const subjectExists = await CanonicalSubjectService.verifySubjectExists(
      body.subject_id,
      body.school_id
    )
    if (!subjectExists) {
      return NextResponse.json(
        { error: 'Subject not found or not available for this school' },
        { status: 400 }
      )
    }

    // Get academic_session_id from term_id
    // Try academic_terms first (new system), fallback to terms (old system)
    let termData: any = null
    let sessionId = null

    // Try new academic_terms table
    const { data: academicTermData, error: academicTermError } = await supabase
      .from('academic_terms')
      .select('session_id')
      .eq('id', body.term_id)
      .single()

    if (academicTermData) {
      termData = academicTermData
      sessionId = academicTermData.session_id
    } else {
      // Fallback to old terms table
      const { data: oldTermData, error: oldTermError } = await supabase
        .from('terms')
        .select('id, session_year')
        .eq('id', body.term_id)
        .single()

      if (oldTermData) {
        termData = oldTermData
        // For old terms, we don't have session_id, so we'll leave it NULL
      } else {
        return NextResponse.json(
          { error: 'Invalid term_id: term not found in either academic_terms or terms table' },
          { status: 400 }
        )
      }
    }

    // Create the exam
    const { data: exam, error } = await supabase
      .from('cbt_exams')
      .insert({
        school_id: body.school_id,
        subject_id: body.subject_id,
        class_arm_combo_id: body.class_arm_combo_id,
        created_by: body.teacher_id,
        teacher_id: body.teacher_id,
        title: body.title,
        description: body.description || '',
        assessment_type: body.assessment_type,
        term_id: body.term_id,
        academic_session_id: sessionId, // Can be NULL if using old terms table
        duration_minutes: body.duration_minutes,
        total_marks: body.total_marks,
        passing_percentage: body.passing_percentage || 50,
        exam_type: body.assessment_type === 'EXAM' ? 'EXAM' : 'TEST',
        status: 'DRAFT',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + body.duration_minutes * 60000).toISOString(),
        allow_review: true,
        randomize_questions: false,
        randomize_options: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating exam:', error)
      return NextResponse.json(
        { error: `Failed to create exam: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      exam,
    })
  } catch (error: any) {
    console.error('Exception in CBT create:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
