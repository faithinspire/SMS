import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/student-comments
 * Fetch teacher comment for a student in a term
 * 
 * Query params:
 * - student_id: UUID
 * - term_id: UUID
 * - school_id: UUID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    const term_id = searchParams.get('term_id')
    const school_id = searchParams.get('school_id')

    if (!student_id || !term_id || !school_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: student_id, term_id, school_id' },
        { status: 400 }
      )
    }

    const { data: comment, error } = await supabase
      .from('teacher_result_comments')
      .select('*')
      .eq('student_id', student_id)
      .eq('term_id', term_id)
      .eq('school_id', school_id)
      .maybeSingle()

    if (error) {
      console.error('[Teacher Comments] Fetch error:', error)
      return NextResponse.json(
        { error: `Failed to fetch comment: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comment: comment || null,
    })
  } catch (error: any) {
    console.error('[Teacher Comments] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/student-comments
 * Create or update teacher comment for a student
 * 
 * Required:
 * - school_id: UUID
 * - student_id: UUID
 * - term_id: UUID
 * - comment_text: string (can be empty)
 * - teacher_id: UUID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const required = ['school_id', 'student_id', 'term_id', 'teacher_id']

    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Check if comment already exists
    const { data: existing } = await supabase
      .from('teacher_result_comments')
      .select('id')
      .eq('school_id', body.school_id)
      .eq('student_id', body.student_id)
      .eq('term_id', body.term_id)
      .maybeSingle()

    let result

    if (existing) {
      // Update existing comment
      const { data: updated, error } = await supabase
        .from('teacher_result_comments')
        .update({
          comment_text: body.comment_text || null,
          teacher_id: body.teacher_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = updated
      console.log(`[Teacher Comments] âœ… Updated comment for student ${body.student_id}`)
    } else {
      // Create new comment
      const { data: created, error } = await supabase
        .from('teacher_result_comments')
        .insert({
          school_id: body.school_id,
          student_id: body.student_id,
          term_id: body.term_id,
          comment_text: body.comment_text || null,
          teacher_id: body.teacher_id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      result = created
      console.log(`[Teacher Comments] âœ… Created comment for student ${body.student_id}`)
    }

    return NextResponse.json({
      success: true,
      comment: result,
    })
  } catch (error: any) {
    console.error('[Teacher Comments] POST error:', error)
    return NextResponse.json(
      { error: `Failed to save comment: ${error.message}` },
      { status: 500 }
    )
  }
}

