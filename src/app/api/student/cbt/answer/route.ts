import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * POST /api/student/cbt/answer
 * Save/update a student's answer to a question
 * 
 * REQUIRED FIELDS:
 * - school_id: UUID
 * - submission_id: UUID
 * - question_id: UUID
 * - selected_option_id?: UUID (for MCQ/True-False)
 * - answer_text?: string (for theory)
 * 
 * RETURNS:
 * - Success message with answer id
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { school_id, submission_id, question_id, selected_option_id, answer_text } = body

    if (!school_id || !submission_id || !question_id) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, submission_id, question_id' },
        { status: 400 }
      )
    }

    // Verify submission exists and is in progress
    const { data: submission, error: submissionError } = await supabase
      .from('cbt_submissions')
      .select('id, status')
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

    // Check if answer already exists for this question
    const { data: existingAnswer } = await supabase
      .from('cbt_answers')
      .select('id')
      .eq('submission_id', submission_id)
      .eq('question_id', question_id)
      .single()

    const answerData = {
      school_id,
      submission_id,
      question_id,
      selected_option_id: selected_option_id || null,
      answer_text: answer_text || null,
      updated_at: new Date().toISOString(),
    }

    let answer

    if (existingAnswer) {
      // Update existing answer
      const { data: updated, error: updateError } = await supabase
        .from('cbt_answers')
        .update(answerData)
        .eq('id', existingAnswer.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating answer:', updateError)
        return NextResponse.json(
          { error: `Failed to update answer: ${updateError.message}` },
          { status: 500 }
        )
      }

      answer = updated
    } else {
      // Create new answer
      const { data: created, error: createError } = await supabase
        .from('cbt_answers')
        .insert({
          ...answerData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating answer:', createError)
        return NextResponse.json(
          { error: `Failed to save answer: ${createError.message}` },
          { status: 500 }
        )
      }

      answer = created
    }

    return NextResponse.json({
      success: true,
      answer_id: answer.id,
      message: existingAnswer ? 'Answer updated' : 'Answer saved',
    })
  } catch (error: any) {
    console.error('Exception in CBT answer:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
