import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * POST /api/student/cbt/start
 * Start a CBT exam (create submission)
 * 
 * REQUIRED FIELDS:
 * - school_id: UUID
 * - student_id: UUID
 * - cbt_exam_id: UUID
 * 
 * RETURNS:
 * - submission object with id, exam details, questions, student info
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { school_id, student_id, cbt_exam_id } = body

    if (!school_id || !student_id || !cbt_exam_id) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, student_id, cbt_exam_id' },
        { status: 400 }
      )
    }

    // Get exam details with all relationships
    const { data: exam, error: examError } = await supabase
      .from('cbt_exams')
      .select(
        `
        id,
        title,
        description,
        assessment_type,
        duration_minutes,
        total_marks,
        term_id,
        subject_id,
        class_arm_combo_id,
        subjects (id, name, code),
        class_arm_combos (
          id,
          classes (id, name, level),
          arms (id, name)
        ),
        terms (id, name)
      `
      )
      .eq('id', cbt_exam_id)
      .eq('school_id', school_id)
      .single()

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    // Get student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(
        `
        id,
        admission_number,
        class_arm_combo_id,
        users!students_user_id_fkey (
          id,
          full_name,
          email,
          photo_url
        )
      `
      )
      .eq('id', student_id)
      .eq('school_id', school_id)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if student already has submission for this exam
    const { data: existingSubmission } = await supabase
      .from('cbt_submissions')
      .select('id, submitted_at, score')
      .eq('cbt_exam_id', cbtExamId)
      .eq('student_id', student_id)
      .single()

    if (existingSubmission && existingSubmission.submitted_at) {
      return NextResponse.json(
        {
          error: 'Student has already submitted this exam',
          submitted_at: existingSubmission.submitted_at,
          score: existingSubmission.score,
        },
        { status: 409 }
      )
    }

    // Create new submission
    const now = new Date()
    const { data: submission, error: submissionError } = await supabase
      .from('cbt_submissions')
      .insert({
        school_id,
        cbt_exam_id,
        student_id,
        started_at: now.toISOString(),
        status: 'IN_PROGRESS',
        assessment_type: exam.assessment_type,
        term_id: exam.term_id,
        total_marks: exam.total_marks,
        created_at: now.toISOString(),
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Error creating submission:', submissionError)
      return NextResponse.json(
        { error: `Failed to start exam: ${submissionError.message}` },
        { status: 500 }
      )
    }

    // Get all questions for the exam
    const { data: questions, error: questionsError } = await supabase
      .from('cbt_questions')
      .select(
        `
        id,
        question_text,
        question_type,
        marks,
        display_order,
        cbt_options (
          id,
          option_text,
          display_order
        )
      `
      )
      .eq('cbt_exam_id', cbt_exam_id)
      .order('display_order', { ascending: true })

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
    }

    // Get school info for header
    const { data: school } = await supabase
      .from('schools')
      .select('name, logo_url')
      .eq('id', school_id)
      .single()

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        started_at: submission.started_at,
        status: submission.status,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.duration_minutes,
        total_marks: exam.total_marks,
        assessment_type: exam.assessment_type,
        subject: exam.subjects?.name || 'N/A',
        term: exam.terms?.name || 'N/A',
        question_count: questions?.length || 0,
      },
      student_header: {
        school_name: school?.name || 'N/A',
        student_name: student.users?.full_name || 'N/A',
        admission_number: student.admission_number,
        class_name: exam.class_arm_combos?.classes?.name || 'N/A',
        class_arm: exam.class_arm_combos?.arms?.name || 'N/A',
        subject: exam.subjects?.name || 'N/A',
        assessment_type: exam.assessment_type,
        term: exam.terms?.name || 'N/A',
      },
      questions: questions || [],
    })
  } catch (error: any) {
    console.error('Exception in CBT start:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

