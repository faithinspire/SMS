/**
 * POST /api/cbt/submit
 * Student submits completed exam
 * Body: { submission_id, answers: [{ question_id, selected_option_id, answer_text }] }
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CBTScoringService } from '@/services/cbt-scoring.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const { submission_id, answers } = await request.json()

    if (!submission_id || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required fields: submission_id, answers' },
        { status: 400 }
      )
    }

    // Verify submission belongs to current user
    const { data: submission, error: submissionError } = await supabase
      .from('cbt_submissions')
      .select(`
        id,
        student_id,
        cbt_exam_id,
        school_id,
        status,
        students(user_id)
      `)
      .eq('id', submission_id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Verify this is the student's submission
    const studentUserId = (submission.students as any)?.user_id
    if (studentUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot submit exam for another student' },
        { status: 403 }
      )
    }

    // Verify submission is in progress
    if (submission.status !== 'STARTED' && submission.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: `Cannot submit exam with status: ${submission.status}` },
        { status: 400 }
      )
    }

    // Insert all answers
    const answersWithMetadata = answers.map((answer: any) => ({
      submission_id,
      school_id: submission.school_id,
      question_id: answer.question_id,
      selected_option_id: answer.selected_option_id || null,
      answer_text: answer.answer_text || null,
      created_at: new Date().toISOString(),
    }))

    const { error: answersError } = await supabase
      .from('cbt_answers')
      .insert(answersWithMetadata)

    if (answersError) {
      console.error('❌ Error inserting answers:', answersError)
      return NextResponse.json(
        { error: `Failed to save answers: ${answersError.message}` },
        { status: 400 }
      )
    }

    // Update submission status to submitted
    const { error: updateError } = await supabase
      .from('cbt_submissions')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', submission_id)

    if (updateError) {
      console.error('❌ Error updating submission:', updateError)
      return NextResponse.json(
        { error: `Failed to update submission: ${updateError.message}` },
        { status: 400 }
      )
    }

    // Auto-score the submission
    let scoringResult: any
    try {
      scoringResult = await CBTScoringService.scoreSubmission(submission_id)
      console.log('✅ Exam auto-scored:', scoringResult)
    } catch (scoringErr: any) {
      console.warn('⚠️ Auto-scoring failed, marking as submitted but not graded:', scoringErr.message)
      // Continue - student has submitted successfully
    }

    console.log('✅ Exam submitted and scored successfully')

    return NextResponse.json(
      {
        success: true,
        message: 'Exam submitted successfully',
        submission_id,
        scoring: scoringResult || null,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('❌ Exception in CBT submit:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
