import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/teacher/academic-sessions
 * 
 * Fetch all academic sessions for a school
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * 
 * RETURNS:
 * - Array of academic sessions with is_current flag
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: school_id' },
        { status: 400 }
      )
    }

    // Fetch all academic sessions for the school
    const { data: sessions, error } = await supabase
      .from('academic_sessions')
      .select('id, session_year, name, is_current, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching academic sessions:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      count: sessions?.length || 0,
      sessions: sessions || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/teacher/academic-sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/academic-sessions
 * 
 * Create a new academic session for a school
 * 
 * BODY:
 * - school_id: UUID (required)
 * - session_year: string e.g. "2026/2027" (required)
 * - name: string (optional, defaults to "{session_year} Academic Session")
 * - is_current: boolean (optional, defaults to false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, session_year, name, is_current } = body

    if (!school_id || !session_year) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, session_year' },
        { status: 400 }
      )
    }

    // Check if session already exists
    const { data: existing } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('school_id', school_id)
      .eq('session_year', session_year)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Session already exists for this school and year' },
        { status: 409 }
      )
    }

    // If setting this as current, unset others
    if (is_current) {
      await supabase
        .from('academic_sessions')
        .update({ is_current: false })
        .eq('school_id', school_id)
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from('academic_sessions')
      .insert({
        school_id,
        session_year,
        name: name || `${session_year} Academic Session`,
        is_current: is_current || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Session created',
      data: newSession,
    })
  } catch (error: any) {
    console.error('Error in POST /api/teacher/academic-sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
