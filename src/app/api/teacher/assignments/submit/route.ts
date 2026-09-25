import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * POST /api/teacher/assignments/submit
 * Submit an assignment on behalf of a student (teacher uploads work)
 * or marks assignment as graded
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      assignment_id,
      student_id,
      file_url,
      status = 'SUBMITTED', // SUBMITTED, GRADED, PENDING, RETURNED
      grade,
      feedback,
      teacher_id,
    } = body

    // Validate required fields
    if (!assignment_id || !student_id || !teacher_id) {
      return NextResponse.json(
        { error: 'Missing required fields: assignment_id, student_id, teacher_id' },
        { status: 400 }
      )
    }

    console.log('[Assignments Submit] Processing submission:', {
      assignment_id,
      student_id,
      status,
      grade,
    })

    // STEP 1: Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id, class_id, subject_id, created_by')
      .eq('id', assignment_id)
      .single()

    if (assignmentError || !assignment) {
      console.error('[Assignments Submit] Assignment not found:', assignmentError)
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // STEP 2: Verify teacher owns this assignment or is admin
    if (assignment.created_by !== teacher_id) {
      console.warn('[Assignments Submit] Unauthorized teacher access')
      return NextResponse.json(
        { error: 'Unauthorized - you did not create this assignment' },
        { status: 403 }
      )
    }

    // STEP 3: Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id')
      .eq('assignment_id', assignment_id)
      .eq('student_id', student_id)
      .single()

    // STEP 4: Insert or update submission
    let submission
    let submitError

    if (existingSubmission) {
      // Update existing submission
      const { data: updated, error } = await supabase
        .from('submissions')
        .update({
          file_url: file_url || undefined,
          status,
          grade: grade || null,
          feedback: feedback || null,
          submission_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      submission = updated
      submitError = error
      console.log('[Assignments Submit] Updated existing submission:', existingSubmission.id)
    } else {
      // Insert new submission
      const { data: created, error } = await supabase
        .from('submissions')
        .insert({
          assignment_id,
          student_id,
          file_url: file_url || null,
          status,
          grade: grade || null,
          feedback: feedback || null,
          submission_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      submission = created
      submitError = error
      console.log('[Assignments Submit] Created new submission')
    }

    if (submitError) {
      console.error('[Assignments Submit] Submission insert/update error:', submitError)
      // Check if it's a relationship error
      if (submitError.code === 'PGRST201') {
        console.error('[Assignments Submit] Relationship ambiguity error - using direct insert')
        // Try direct insert without relationships
        const { data: directSubmission, error: directError } = await supabase
          .from('submissions')
          .insert({
            assignment_id,
            student_id,
            file_url: file_url || null,
            status,
            grade: grade || null,
            feedback: feedback || null,
            submission_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id, assignment_id, student_id, status, grade, submission_date')
          .single()

        if (directError) {
          return NextResponse.json(
            { error: 'Failed to submit assignment', details: directError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Assignment submitted successfully',
          submission: directSubmission,
        })
      }

      return NextResponse.json(
        { error: 'Failed to submit assignment', details: submitError.message },
        { status: 500 }
      )
    }

    console.log('[Assignments Submit] SUCCESS - Submission processed:', submission?.id)

    return NextResponse.json({
      success: true,
      message: 'Assignment submitted successfully',
      submission: {
        id: submission?.id,
        assignment_id: submission?.assignment_id,
        student_id: submission?.student_id,
        status: submission?.status,
        grade: submission?.grade,
        feedback: submission?.feedback,
        submission_date: submission?.submission_date,
      },
    })
  } catch (error: any) {
    console.error('[Assignments Submit] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/teacher/assignments/submit
 * Get all submissions for an assignment or student
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const assignment_id = searchParams.get('assignment_id')
    const student_id = searchParams.get('student_id')

    if (!assignment_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: assignment_id' },
        { status: 400 }
      )
    }

    console.log('[Assignments Get Submissions] Fetching:', { assignment_id, student_id })

    // Use direct column selection to avoid relationship ambiguity error
    let query = supabase
      .from('submissions')
      .select('id, assignment_id, student_id, file_url, status, grade, feedback, submission_date, created_at')
      .eq('assignment_id', assignment_id)

    if (student_id) {
      query = query.eq('student_id', student_id)
    }

    const { data: submissions, error: submissionsError } = await query

    if (submissionsError) {
      console.error('[Assignments Get Submissions] Error:', submissionsError)
      return NextResponse.json(
        { error: 'Failed to fetch submissions', details: submissionsError.message },
        { status: 500 }
      )
    }

    console.log('[Assignments Get Submissions] Found', submissions?.length || 0, 'submissions')

    return NextResponse.json({
      success: true,
      count: submissions?.length || 0,
      submissions: submissions || [],
    })
  } catch (error: any) {
    console.error('[Assignments Get Submissions] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
