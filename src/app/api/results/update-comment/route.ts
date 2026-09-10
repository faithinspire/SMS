import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * PATCH /api/results/update-comment
 * Update teacher comment on a score sheet entry
 * 
 * BODY:
 * {
 *   "result_id": "uuid",
 *   "teacher_id": "uuid",
 *   "school_id": "uuid",
 *   "teacher_comment": "string"
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { result_id, teacher_id, school_id, teacher_comment } = body

    if (!result_id || !teacher_id || !school_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify teacher owns this score sheet entry
    const { data: existingResult, error: fetchError } = await supabase
      .from('score_sheets')
      .select('id, teacher_id')
      .eq('id', result_id)
      .eq('school_id', school_id)
      .single()

    if (fetchError || !existingResult) {
      return NextResponse.json(
        { error: 'Score sheet entry not found' },
        { status: 404 }
      )
    }

    if (existingResult.teacher_id !== teacher_id) {
      return NextResponse.json(
        { error: 'Unauthorized: You cannot edit comments for results you did not create' },
        { status: 403 }
      )
    }

    // Update comment
    const { data, error } = await supabase
      .from('score_sheets')
      .update({
        teacher_comment: teacher_comment || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', result_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      result: data,
      message: 'Teacher comment updated successfully',
    })
  } catch (error: any) {
    console.error('Exception in update comment PATCH:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
