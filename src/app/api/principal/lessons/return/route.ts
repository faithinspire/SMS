import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * PUT /api/principal/lessons/[lessonId]/return
 * Principal returns a lesson note for revision
 * 
 * REQUEST BODY:
 * {
 *   school_id: UUID,
 *   principal_id: UUID,
 *   comments: string (required - reason for return)
 * }
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   lesson_note_id: UUID,
 *   status: 'RETURNED',
 *   message: string
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: { lessonId: string } }
) {
  try {
    const { lessonId } = context.params
    const body = await request.json()
    const { school_id, principal_id, comments } = body

    if (!school_id || !principal_id || !lessonId) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, principal_id, lessonId' },
        { status: 400 }
      )
    }

    if (!comments || comments.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comments are required when returning a lesson note' },
        { status: 400 }
      )
    }

    // Update lesson note to RETURNED status
    const { data, error } = await supabase
      .from('lesson_notes')
      .update({
        status: 'RETURNED',
        reviewed_by: principal_id,
        reviewed_at: new Date().toISOString(),
        review_comments: comments,
      })
      .eq('id', lessonId)
      .eq('school_id', school_id)
      .select()

    if (error) {
      console.error('Error returning lesson note:', error)
      return NextResponse.json(
        { error: 'Failed to return lesson note', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Lesson note not found or not accessible' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      lesson_note_id: data[0].id,
      status: data[0].status,
      message: 'Lesson note returned for revision',
    })
  } catch (error) {
    console.error('Error in PUT /api/principal/lessons/return:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
