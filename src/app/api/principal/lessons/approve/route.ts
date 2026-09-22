import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'

/**
 * POST /api/principal/lessons/approve
 * Principal approves a lesson note
 * 
 * REQUEST BODY:
 * {
 *   lesson_note_id: UUID,
 *   school_id: UUID,
 *   principal_id: UUID,
 *   comments?: string
 * }
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   lesson_note_id: UUID,
 *   status: 'APPROVED',
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lesson_note_id, school_id, principal_id, comments } = body

    if (!lesson_note_id || !school_id || !principal_id) {
      return NextResponse.json(
        { error: 'Missing required fields: lesson_note_id, school_id, principal_id' },
        { status: 400 }
      )
    }

    // Update lesson note to APPROVED status
    const { data, error } = await supabase
      .from('lesson_notes')
      .update({
        status: 'APPROVED',
        reviewed_by: principal_id,
        reviewed_at: new Date().toISOString(),
        reviewer_comments: comments || null,
      })
      .eq('id', lesson_note_id)
      .eq('school_id', school_id)
      .select()

    if (error) {
      console.error('[LessonApprove] Error approving lesson note:', error)
      return NextResponse.json(
        { error: 'Failed to approve lesson note', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Lesson note not found or not accessible' },
        { status: 404 }
      )
    }

    console.log('[LessonApprove] ✅ Lesson note approved:', lesson_note_id)

    return NextResponse.json({
      success: true,
      lesson_note_id: data[0].id,
      status: data[0].status,
      message: 'Lesson note approved successfully',
    })
  } catch (error) {
    console.error('[LessonApprove] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}


