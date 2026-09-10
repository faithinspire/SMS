import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/cbt/verify-auto-population?submission_id=UUID
 * 
 * Verify that a CBT submission has been auto-populated into score_sheets
 * This is for testing and debugging the CBT â†’ score_sheets sync flow
 * 
 * RETURNS:
 * - submission: the cbt_submissions record
 * - score_sheet: the related score_sheets record (if exists)
 * - mapping: the assessment_type â†’ score column mapping
 * - success: whether auto-population was successful
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('submission_id')

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submission_id query parameter required' },
        { status: 400 }
      )
    }

    console.log('[Verify] Checking CBT submission:', submissionId)

    // Get the submission
    const { data: submission, error: submissionError } = await supabase
      .from('cbt_submissions')
      .select(
        `
        id,
        student_id,
        cbt_exam_id,
        school_id,
        score,
        total_marks,
        percentage,
        status,
        assessment_type,
        term_id,
        cbt_exams (
          id,
          subject_id,
          assessment_type,
          class_arm_combo_id
        )
      `
      )
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      console.error('[Verify] Submission error:', submissionError)
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    const exam = submission.cbt_exams as any
    const assessmentType = submission.assessment_type || exam?.assessment_type

    console.log('[Verify] Submission found:', {
      assessment_type: assessmentType,
      score: submission.score,
      total_marks: submission.total_marks,
    })

    // Determine which score column should have been updated
    let expectedSourceColumn: string | null = null
    let expectedScoreColumn: string | null = null

    switch (assessmentType) {
      case 'CA1':
        expectedScoreColumn = 'test1'
        expectedSourceColumn = 'test1_source'
        break
      case 'CA2':
        expectedScoreColumn = 'test2'
        expectedSourceColumn = 'test2_source'
        break
      case 'CA3':
        expectedScoreColumn = 'test3'
        expectedSourceColumn = 'test3_source'
        break
      case 'CA4':
        expectedScoreColumn = 'test4'
        expectedSourceColumn = 'test4_source'
        break
      case 'EXAM':
        expectedScoreColumn = 'exam'
        expectedSourceColumn = 'exam_source'
        break
    }

    // Look for matching score_sheets entry
    const { data: scoreSheet, error: sheetError } = await supabase
      .from('score_sheets')
      .select('*')
      .eq('school_id', submission.school_id)
      .eq('student_id', submission.student_id)
      .eq('subject_id', exam.subject_id)
      .eq('term_id', submission.term_id)
      .single()

    if (sheetError && sheetError.code !== 'PGRST116') {
      // PGRST116 = no rows
      console.error('[Verify] Sheet error:', sheetError)
      return NextResponse.json(
        { error: `Failed to query score sheet: ${sheetError.message}` },
        { status: 500 }
      )
    }

    console.log('[Verify] Score sheet result:', scoreSheet ? 'FOUND' : 'NOT FOUND')

    // Verify the auto-population
    let autoPopulationStatus = {
      success: false,
      reason: '',
      expectedColumn: expectedScoreColumn,
      expectedSource: expectedSourceColumn,
      actualValue: null as any,
      actualSource: null as any,
      submission: submission,
      scoreSheet: scoreSheet,
    }

    if (!scoreSheet) {
      autoPopulationStatus.reason = 'Score sheet entry not found for this student-subject-term'
      return NextResponse.json(autoPopulationStatus, { status: 200 })
    }

    if (expectedScoreColumn && expectedSourceColumn) {
      const actualScore = (scoreSheet as any)[expectedScoreColumn]
      const actualSource = (scoreSheet as any)[expectedSourceColumn]

      autoPopulationStatus.actualValue = actualScore
      autoPopulationStatus.actualSource = actualSource

      if (actualScore !== null && actualSource === 'CBT') {
        autoPopulationStatus.success = true
        autoPopulationStatus.reason = `âœ… CBT score auto-populated: ${expectedScoreColumn}=${actualScore} from submission`
      } else if (actualScore === null) {
        autoPopulationStatus.reason = `âŒ ${expectedScoreColumn} is NULL (not populated)`
      } else if (actualSource !== 'CBT') {
        autoPopulationStatus.reason = `âŒ ${expectedSourceColumn} is '${actualSource}' (expected 'CBT')`
      }
    } else {
      autoPopulationStatus.reason = `âŒ Unknown assessment type: ${assessmentType}`
    }

    return NextResponse.json(autoPopulationStatus, { status: 200 })
  } catch (error: any) {
    console.error('[Verify] Exception:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

