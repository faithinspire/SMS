import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * PUT /api/principal/lessons/[lessonId]/approve
 * Principal approves a lesson note
 * 
 * REQUEST BODY:
 * {
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

    // Update lesson note to APPROVED status
    const { data, error } = await supabase
      .from('lesson_notes')
      .update({
        status: 'APPROVED',
        reviewed_by: principal_id,
        reviewed_at: new Date().toISOString(),
        review_comments: comments || null,
      })
      .eq('id', lessonId)
      .eq('school_id', school_id)
      .select()

    if (error) {
      console.error('Error approving lesson note:', error)
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

    return NextResponse.json({
      success: true,
      lesson_note_id: data[0].id,
      status: data[0].status,
      message: 'Lesson note approved successfully',
    })
  } catch (error) {
    console.error('Error in PUT /api/principal/lessons/approve:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

