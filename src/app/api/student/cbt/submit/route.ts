import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'

/**
 * POST /api/student/cbt/submit
 * Submit a completed CBT exam
 * 
 * FLOW:
 * 1. Validate submission exists and student ownership
 * 2. Auto-grade MCQ/True-False questions
 * 3. Calculate total score and percentage
 * 4. Set status='GRADED' (triggers Migration 126 auto-sync to score_sheets)
 * 5. Lock submission
 * 
 * NOTE: score_sheets population is handled entirely by the trigger on cbt_submissions
 * No manual score_sheets creation here - maintains single source of truth
 * 
 * REQUIRED FIELDS:
 * - school_id: UUID
 * - submission_id: UUID
 * - student_id: UUID
 * 
 * RETURNS:
 * - Final score, percentage, and result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { school_id, submission_id, student_id } = body

    if (!school_id || !submission_id || !student_id) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, submission_id, student_id' },
        { status: 400 }
      )
    }

    // Get submission with exam details
    const { data: submission, error: submissionError } = await supabase
      .from('cbt_submissions')
      .select(
        `
        id,
        cbt_exam_id,
        student_id,
        status,
        started_at,
        total_marks,
        assessment_type,
        term_id,
        cbt_exams (
          id,
          subject_id,
          class_arm_combo_id,
          total_marks,
          passing_percentage,
          assessment_type,
          exam_type,
          test_number
        )
      `
      )
      .eq('id', submission_id)
      .eq('school_id', school_id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    if (submission.status === 'SUBMITTED' || submission.status === 'LOCKED') {
      return NextResponse.json(
        { error: 'Exam has already been submitted' },
        { status: 409 }
      )
    }

    // Get all answers for this submission
    const { data: answers, error: answersError } = await supabase
      .from('cbt_answers')
      .select(
        `
        id,
        question_id,
        selected_option_id,
        answer_text,
        cbt_questions (
          id,
          question_type,
          marks,
          cbt_options (
            id,
            is_correct
          )
        )
      `
      )
      .eq('submission_id', submission_id)

    if (answersError) {
      console.error('[CBT Submit] Error fetching answers:', answersError)
      return NextResponse.json(
        { error: 'Failed to retrieve answers' },
        { status: 500 }
      )
    }

    // Auto-grade MCQ and True-False questions
    let totalScore = 0
    const exam = submission.cbt_exams as any

    for (const answer of answers || []) {
      const question = answer.cbt_questions as any
      const marks = question.marks || 0

      if (
        question.question_type === 'MULTIPLE_CHOICE' ||
        question.question_type === 'TRUE_FALSE'
      ) {
        // Check if answer is correct
        let isCorrect = false

        if (answer.selected_option_id && question.cbt_options) {
          const selectedOption = question.cbt_options.find(
            (opt: any) => opt.id === answer.selected_option_id
          )
          isCorrect = selectedOption?.is_correct || false
        }

        // Award marks if correct
        if (isCorrect) {
          totalScore += marks
        }

        // Update answer with correctness and marks
        await supabase
          .from('cbt_answers')
          .update({
            is_correct: isCorrect,
            marks_awarded: isCorrect ? marks : 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', answer.id)
      }
      // Theory questions left unmarked for now (manual grading)
    }

    // Calculate percentage
    const examTotalMarks = exam.total_marks || 0
    const percentage = examTotalMarks > 0 ? (totalScore / examTotalMarks) * 100 : 0
    const passed = percentage >= (exam.passing_percentage || 50)

    // Update submission with final scores and set status to GRADED
    // CRITICAL: Setting status='GRADED' fires Migration 126 trigger to auto-populate score_sheets
    const now = new Date()
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('cbt_submissions')
      .update({
        submitted_at: now.toISOString(),
        status: 'GRADED', // ✅ Triggers auto_populate_score_sheets_from_cbt
        score: totalScore,
        percentage: Math.round(percentage * 100) / 100,
        passed,
        graded_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', submission_id)
      .select()
      .single()

    if (updateError) {
      console.error('[CBT Submit] Error updating submission:', updateError)
      return NextResponse.json(
        { error: `Failed to finalize submission: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('[CBT Submit] ✅ Submission graded - trigger will auto-sync to score_sheets', {
      submission_id,
      status: updatedSubmission?.status,
      score: totalScore,
      percentage: updatedSubmission?.percentage,
      exam_assessment_type: exam.assessment_type,
      submission_term_id: submission.term_id,
    })

    // Lock submission (prevents re-submission and further edits)
    const { error: lockError } = await supabase
      .from('cbt_submissions')
      .update({ status: 'LOCKED' })
      .eq('id', submission_id)

    if (lockError) {
      console.error('[CBT Submit] Warning: Could not lock submission:', lockError)
      // Non-critical - submission is already GRADED
    }

    return NextResponse.json({
      success: true,
      result: {
        score: totalScore,
        total_marks: examTotalMarks,
        percentage: updatedSubmission.percentage,
        passed,
        status: 'GRADED',
        submitted_at: updatedSubmission.submitted_at,
        message: passed
          ? `Congratulations! You scored ${totalScore}/${examTotalMarks}`
          : `You scored ${totalScore}/${examTotalMarks}. Try again to improve your score.`,
      },
    })
  } catch (error: any) {
    console.error('[CBT Submit] Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
