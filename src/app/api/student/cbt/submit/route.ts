import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * POST /api/student/cbt/submit
 * Submit a completed CBT exam
 * 
 * STEPS:
 * 1. Mark submission as SUBMITTED
 * 2. Auto-grade MCQ/True-False questions
 * 3. Calculate total score and percentage
 * 4. Create/update score_sheets entry
 * 5. Lock submission
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
          assessment_type
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
      console.error('Error fetching answers:', answersError)
      return NextResponse.json(
        { error: 'Failed to retrieve answers' },
        { status: 500 }
      )
    }

    // Auto-grade MCQ and True-False questions
    let totalScore = 0
    let markedCount = 0
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

        markedCount++
      }
      // Theory questions left unmarked for now (manual grading)
    }

    // Calculate percentage
    const examTotalMarks = exam.total_marks || 0
    const percentage = examTotalMarks > 0 ? (totalScore / examTotalMarks) * 100 : 0
    const passed = percentage >= (exam.passing_percentage || 50)

    // Update submission with final scores
    const now = new Date()
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('cbt_submissions')
      .update({
        submitted_at: now.toISOString(),
        status: 'GRADED',
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
      console.error('Error updating submission:', updateError)
      return NextResponse.json(
        { error: `Failed to finalize submission: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Get student and create/update score sheet
    const { data: student } = await supabase
      .from('students')
      .select('class_arm_combo_id')
      .eq('id', student_id)
      .single()

    // DEBUG: Log all conditions for score_sheets creation
    console.log('[CBT Submit] Score sheet creation conditions:', {
      hasStudent: !!student,
      hasSubjectId: !!exam.subject_id,
      hasAssessmentType: !!exam.assessment_type,
      hasTermId: !!submission.term_id,
    })

    if (!student) {
      console.error('[CBT Submit] âŒ No student found for ID:', student_id)
    }
    if (!exam.subject_id) {
      console.error('[CBT Submit] âŒ No subject_id on exam:', exam.id)
    }
    if (!exam.assessment_type) {
      console.error('[CBT Submit] âŒ No assessment_type on exam:', exam.id)
    }
    if (!submission.term_id) {
      console.error('[CBT Submit] âŒ No term_id on submission:', submission_id)
    }

    if (student && exam.subject_id && exam.assessment_type && submission.term_id) {
      console.log('[CBT Submit] âœ… All conditions met - proceeding with score_sheets creation')
      
      // BLOCKER 2 FIX: Get academic session from term (use academic_terms)
      let academicSessionId = null
      let sessionYear = null
      
      const { data: term } = await supabase
        .from('academic_terms')
        .select('session_id')
        .eq('id', submission.term_id)
        .single()
      
      if (term?.session_id) {
        academicSessionId = term.session_id
        console.log('[CBT Submit] âœ… Found academic session:', academicSessionId)
        
        // Get the session_year from academic_sessions
        const { data: session } = await supabase
          .from('academic_sessions')
          .select('session_year')
          .eq('id', term.session_id)
          .single()
        
        sessionYear = session?.session_year || null
        console.log('[CBT Submit] âœ… Found session year:', sessionYear)
      } else {
        console.warn('[CBT Submit] âš ï¸ Could not find academic session for term:', submission.term_id)
      }

      // Convert exam score to appropriate column based on assessment type
      const scoreSheetUpdate: any = {
        school_id,
        student_id,
        subject_id: exam.subject_id,
        term_id: submission.term_id,
        academic_session_id: academicSessionId, // âœ… NOW TRACKED
        session_year: sessionYear, // âœ… Backup field
      }

      // Map assessment type to score column
      switch (exam.assessment_type) {
        case 'CA1':
          scoreSheetUpdate.test1 = Math.round((totalScore / examTotalMarks) * 10 * 100) / 100
          scoreSheetUpdate.test1_cbt_source = submission_id
          scoreSheetUpdate.test1_source = 'CBT'
          break
        case 'CA2':
          scoreSheetUpdate.test2 = Math.round((totalScore / examTotalMarks) * 10 * 100) / 100
          scoreSheetUpdate.test2_cbt_source = submission_id
          scoreSheetUpdate.test2_source = 'CBT'
          break
        case 'CA3':
          scoreSheetUpdate.test3 = Math.round((totalScore / examTotalMarks) * 10 * 100) / 100
          scoreSheetUpdate.test3_cbt_source = submission_id
          scoreSheetUpdate.test3_source = 'CBT'
          break
        case 'CA4':
          scoreSheetUpdate.test4 = Math.round((totalScore / examTotalMarks) * 10 * 100) / 100
          scoreSheetUpdate.test4_cbt_source = submission_id
          scoreSheetUpdate.test4_source = 'CBT'
          break
        case 'EXAM':
          scoreSheetUpdate.exam = Math.round((totalScore / examTotalMarks) * 60 * 100) / 100
          scoreSheetUpdate.exam_cbt_source = submission_id
          scoreSheetUpdate.exam_source = 'CBT'
          break
        default:
          console.warn('[CBT Submit] âš ï¸ Unknown assessment_type:', exam.assessment_type)
      }

      scoreSheetUpdate.updated_at = now.toISOString()
      scoreSheetUpdate.class_arm_combo_id = student.class_arm_combo_id

      // Try to update existing score sheet, otherwise insert
      const { data: existingSheet, error: sheetSearchError } = await supabase
        .from('score_sheets')
        .select('id')
        .eq('school_id', school_id)
        .eq('student_id', student_id)
        .eq('subject_id', exam.subject_id)
        .eq('term_id', submission.term_id)
        .maybeSingle()

      if (sheetSearchError) {
        console.error('[CBT Submit] âŒ Error searching for existing score_sheets:', sheetSearchError)
      }

      if (existingSheet) {
        console.log('[CBT Submit] âœ… Updating existing score_sheets:', existingSheet.id)
        const { error: updateSheetError } = await supabase
          .from('score_sheets')
          .update(scoreSheetUpdate)
          .eq('id', existingSheet.id)

        if (updateSheetError) {
          console.error('[CBT Submit] âŒ Error updating score_sheets:', updateSheetError)
        } else {
          console.log('[CBT Submit] âœ… Score_sheets updated successfully')
        }
      } else {
        console.log('[CBT Submit] âœ… Creating new score_sheets entry with data:', scoreSheetUpdate)
        const { data: createdSheet, error: insertSheetError } = await supabase
          .from('score_sheets')
          .insert({
            ...scoreSheetUpdate,
            created_at: now.toISOString(),
          })
          .select()

        if (insertSheetError) {
          console.error('[CBT Submit] âŒ Error creating score_sheets:', insertSheetError)
        } else {
          console.log('[CBT Submit] âœ… Score_sheets created successfully:', createdSheet)
        }
      }
    } else {
      console.warn('[CBT Submit] âš ï¸ Skipping score_sheets creation - missing required fields')
    }

    // Lock submission after successful submission
    await supabase
      .from('cbt_submissions')
      .update({ status: 'LOCKED' })
      .eq('id', submission_id)

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
          : `You scored ${totalScore}/${examTotalMarks}. Please try again.`,
      },
    })
  } catch (error: any) {
    console.error('Exception in CBT submit:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

