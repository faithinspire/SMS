import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * POST /api/teacher/lessons/submit
 * Teacher submits a lesson note for principal review
 * 
 * REQUEST BODY:
 * {
 *   school_id: UUID,
 *   subject_id: UUID,
 *   class_arm_combo_id: UUID,
 *   teacher_id: UUID,
 *   title: string,
 *   content: string,
 *   attachments?: Array<{url: string, name: string}>
 * }
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   lesson_note_id: UUID,
 *   status: 'SUBMITTED',
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      school_id,
      subject_id,
      class_arm_combo_id,
      teacher_id,
      title,
      content,
      attachments,
    } = body

    // Validation
    if (!school_id || !subject_id || !class_arm_combo_id || !teacher_id || !title || !content) {
      return NextResponse.json(
        {
          error: 'Missing required fields: school_id, subject_id, class_arm_combo_id, teacher_id, title, content',
        },
        { status: 400 }
      )
    }

    // Create lesson note with status = SUBMITTED
    const { data, error } = await supabase
      .from('lesson_notes')
      .insert({
        school_id,
        subject_id,
        class_arm_combo_id,
        created_by: teacher_id,
        title,
        content,
        attachments: attachments || [],
        status: 'SUBMITTED',
        published_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error('Error submitting lesson note:', error)
      return NextResponse.json(
        { error: 'Failed to submit lesson note', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Failed to create lesson note' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      lesson_note_id: data[0].id,
      status: data[0].status,
      message: 'Lesson note submitted successfully for principal review',
    })
  } catch (error) {
    console.error('Error in POST /api/teacher/lessons/submit:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

