import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API: Sync CBT submission score to score_sheets table
 * POST /api/cbt/submissions/sync-scores
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { submission_id } = body

    if (!submission_id) {
      return NextResponse.json(
        { error: 'submission_id is required' },
        { status: 400 }
      )
    }

    console.log('📊 Syncing CBT score for submission:', submission_id)

    // Get submission details
    const { data: submission, error: subError } = await supabaseAdmin
      .from('cbt_submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      console.error('Submission not found:', subError)
      return NextResponse.json(
        { error: 'Submission not found', details: subError?.message },
        { status: 404 }
      )
    }

    console.log('📋 Submission:', {
      student_id: submission.student_id,
      cbt_exam_id: submission.cbt_exam_id,
      score: submission.score,
      total_marks: submission.total_marks,
    })

    // Get exam details
    const { data: exam, error: examError } = await supabaseAdmin
      .from('cbt_exams')
      .select('subject_id, term_id, school_id')
      .eq('id', submission.cbt_exam_id)
      .single()

    if (examError || !exam) {
      console.error('Exam not found:', examError)
      return NextResponse.json(
        { error: 'Exam not found', details: examError?.message },
        { status: 404 }
      )
    }

    // Get student details
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('school_id, class_arm_combo_id')
      .eq('id', submission.student_id)
      .single()

    if (studentError || !student) {
      console.error('Student not found:', studentError)
      return NextResponse.json(
        { error: 'Student not found', details: studentError?.message },
        { status: 404 }
      )
    }

    // Calculate grade
    const percentage = submission.score && submission.total_marks 
      ? (submission.score / submission.total_marks) * 100 
      : 0

    const grade = calculateGrade(percentage)
    const schoolId = exam.school_id || student.school_id

    // Prepare score data
    const scoreData = {
      student_id: submission.student_id,
      school_id: schoolId,
      subject_id: exam.subject_id,
      term_id: exam.term_id,
      class_arm_combo_id: student.class_arm_combo_id,
      assessment_type: 'CBT',
      cbt_exam_id: submission.cbt_exam_id,
      cbt_submission_id: submission_id,
      marks_obtained: submission.score || 0,
      total_marks: submission.total_marks || 0,
      percentage: Math.round(percentage),
      is_passed: submission.status === 'PASSED',
      grade: grade,
      entered_by: 'SYSTEM_CBT_AUTO',
      entered_at: new Date().toISOString(),
      comment: `CBT Exam - ${Math.round(percentage)}%`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log('📝 Score data:', scoreData)

    // Check if exists
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from('score_sheets')
      .select('id')
      .eq('student_id', submission.student_id)
      .eq('subject_id', exam.subject_id)
      .eq('term_id', exam.term_id)
      .eq('school_id', schoolId)
      .eq('assessment_type', 'CBT')

    if (checkErr) console.warn('Check error:', checkErr)

    let scoreSheetId = ''

    if (existing && existing.length > 0) {
      console.log('🔄 Updating score sheet:', existing[0].id)
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('score_sheets')
        .update(scoreData)
        .eq('id', existing[0].id)
        .select('id')
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update', details: updateError.message },
          { status: 500 }
        )
      }

      scoreSheetId = updated?.id || existing[0].id
      console.log('✅ Updated:', scoreSheetId)
    } else {
      console.log('✨ Creating new score sheet entry')
      const { data: created, error: createError } = await supabaseAdmin
        .from('score_sheets')
        .insert([scoreData])
        .select('id')
        .single()

      if (createError) {
        console.error('Create error:', createError)
        return NextResponse.json(
          { error: 'Failed to create', details: createError.message },
          { status: 500 }
        )
      }

      scoreSheetId = created?.id || ''
      console.log('✅ Created:', scoreSheetId)
    }

    return NextResponse.json({
      success: true,
      score_sheet_id: scoreSheetId,
      message: 'Score synced successfully',
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}

function calculateGrade(percentage: number): string {
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'F'
}
