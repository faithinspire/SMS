import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/results/school-sessions-and-terms?schoolId=...
 * 
 * Fetches all academic sessions and their terms for a specific school
 * Used by result pages to populate session/term selectors
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    console.log('[API] Fetching sessions and terms for school:', schoolId)

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing schoolId parameter' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 1: Fetch all academic sessions for this school
    // ========================================================================
    const { data: sessions, error: sessionsError } = await supabase
      .from('academic_sessions')
      .select('id, school_id, session_year, is_active')
      .eq('school_id', schoolId)
      .order('session_year', { ascending: false })

    if (sessionsError) {
      console.error('[API] Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: sessionsError.message },
        { status: 500 }
      )
    }

    console.log('[API] Found sessions:', sessions?.length || 0)

    // If no sessions, return empty
    if (!sessions || sessions.length === 0) {
      console.warn('[API] No sessions found for school')
      return NextResponse.json({
        success: true,
        sessions: [],
        terms: [],
        message: 'No sessions found for this school',
      })
    }

    // ========================================================================
    // STEP 2: Fetch all terms for each session
    // ========================================================================
    const sessionIds = sessions.map((s) => s.id)
    console.log('[API] Fetching terms for sessions:', sessionIds)

    const { data: terms, error: termsError } = await supabase
      .from('academic_terms')
      .select('id, session_id, term_name, term_number, is_active, start_date, end_date')
      .in('session_id', sessionIds)
      .order('term_number', { ascending: true })

    if (termsError) {
      console.error('[API] Error fetching terms:', termsError)
      return NextResponse.json(
        { error: 'Failed to fetch terms', details: termsError.message },
        { status: 500 }
      )
    }

    console.log('[API] Found terms:', terms?.length || 0)

    // ========================================================================
    // STEP 3: Format response
    // ========================================================================
    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      terms: terms || [],
      message: `Found ${sessions?.length || 0} sessions and ${terms?.length || 0} terms`,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /api/results/school-sessions-and-terms:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
