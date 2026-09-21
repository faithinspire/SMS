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
 *   title: string (maps to 'topic' in DB),
 *   content: string (maps to 'content_summary' in DB),
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

    // Fetch current term for this school
    let termId = null
    try {
      const { data: termData } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('school_id', school_id)
        .eq('is_active', true)
        .single()
      termId = termData?.id
    } catch (err) {
      console.warn('Could not fetch active term, using placeholder')
    }

    // Fetch teacher name
    let teacherName = 'Teacher'
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', teacher_id)
        .single()
      if (userData?.full_name) teacherName = userData.full_name
    } catch (err) {
      console.warn('Could not fetch teacher name, using placeholder')
    }

    // Create lesson note with status = SUBMITTED
    // NOTE: Schema from Migration 083 uses different column names:
    // - teacher_id (not created_by)
    // - topic (not title)
    // - content_summary (not content)
    // - lesson_date (not published_at)
    // - file_path, file_name for attachments
    
    const fileData = attachments?.[0] ? {
      file_path: attachments[0].url,
      file_name: attachments[0].name,
    } : {}

    const { data, error } = await supabase
      .from('lesson_notes')
      .insert({
        school_id,
        subject_id,
        class_arm_combo_id,
        teacher_id,
        teacher_name: teacherName,
        term_id: termId || '00000000-0000-0000-0000-000000000000', // Use fetched term or placeholder
        topic: title, // Map title → topic
        content_summary: content, // Map content → content_summary
        lesson_date: new Date().toISOString().split('T')[0], // Today's date
        status: 'SUBMITTED',
        ...fileData,
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

