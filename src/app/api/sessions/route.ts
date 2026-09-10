import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/sessions?schoolId=<uuid>
 * 
 * Returns all academic sessions for a school, ordered by start_year (DESC).
 * Supports unlimited future sessions - no hardcoded limits.
 * 
 * Response:
 * {
 *   success: boolean,
 *   count: number,
 *   sessions: [
 *     {
 *       id: UUID,
 *       session_year: "2026/2027",
 *       start_year: 2026,
 *       end_year: 2027,
 *       is_active: true,
 *       created_at: ISO8601
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing required parameter: schoolId' },
        { status: 400 }
      )
    }

    // Fetch all sessions for school, ordered by start_year DESC (newest first)
    const { data: sessions, error } = await supabase
      .from('academic_sessions')
      .select('id, session_year, start_year, end_year, is_active, created_at')
      .eq('school_id', schoolId)
      .order('start_year', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      count: sessions?.length || 0,
      sessions: sessions || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions
 * 
 * Create a new academic session (admin only).
 * Automatically generates First/Second/Third Terms via trigger.
 * 
 * BODY:
 * {
 *   school_id: UUID (required),
 *   start_year: INT (required) - e.g. 2029,
 *   end_year: INT (optional, defaults to start_year + 1),
 *   is_active: BOOLEAN (optional, defaults to false)
 * }
 * 
 * Returns:
 * {
 *   success: true,
 *   message: "Session created",
 *   session_id: UUID,
 *   session_year: "2029/2030",
 *   terms_auto_created: 3
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, start_year, end_year, is_active } = body

    // Validate required fields
    if (!school_id || start_year === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, start_year' },
        { status: 400 }
      )
    }

    // Calculate end_year if not provided
    const calculatedEndYear = end_year || start_year + 1
    const sessionYear = `${start_year}/${calculatedEndYear}`

    // Validate constraint: end_year = start_year + 1
    if (calculatedEndYear !== start_year + 1) {
      return NextResponse.json(
        { error: 'Invalid years: end_year must equal start_year + 1' },
        { status: 400 }
      )
    }

    // Check if session already exists
    const { data: existing } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('school_id', school_id)
      .eq('session_year', sessionYear)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Session ${sessionYear} already exists for this school` },
        { status: 409 }
      )
    }

    // If setting as active, deactivate others
    if (is_active) {
      await supabase
        .from('academic_sessions')
        .update({ is_active: false })
        .eq('school_id', school_id)
    }

    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from('academic_sessions')
      .insert({
        school_id,
        session_year: sessionYear,
        start_year,
        end_year: calculatedEndYear,
        is_active: is_active || false,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating session:', createError)
      throw createError
    }

    // Verify that trigger auto-created terms
    const { data: terms, error: termsError } = await supabase
      .from('academic_terms')
      .select('id')
      .eq('session_id', newSession.id)

    if (termsError) {
      console.error('Error verifying terms:', termsError)
    }

    return NextResponse.json({
      success: true,
      message: 'Session created successfully',
      session_id: newSession.id,
      session_year: newSession.session_year,
      terms_auto_created: terms?.length || 0,
    })
  } catch (error: any) {
    console.error('Error in POST /api/sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
