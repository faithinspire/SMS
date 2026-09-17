import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/results/school-sessions-and-terms?schoolId=...
 * 
 * Fetches all academic sessions and their terms for a specific school
 * ALSO fetches from ALL sources (academic_sessions, academic_terms, terms, etc.)
 * This is resilient to schema variations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    console.log('[API-Sessions] Fetching sessions and terms for school:', schoolId)
    console.log('[API-Sessions] Using Supabase client:', !!supabase)

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing schoolId parameter' },
        { status: 400 }
      )
    }

    let allSessions: any[] = []
    let allTerms: any[] = []

    // ========================================================================
    // TRY: Fetch from academic_sessions table
    // ========================================================================
    console.log('[API-Sessions] Attempting to fetch from academic_sessions...')
    const { data: sessions, error: sessionsError } = await supabase
      .from('academic_sessions')
      .select('id, school_id, session_year, is_active')
      .eq('school_id', schoolId)
      .order('session_year', { ascending: false })

    if (sessionsError) {
      console.error('[API-Sessions] Error fetching from academic_sessions:', sessionsError)
    } else {
      console.log('[API-Sessions] Found from academic_sessions:', sessions?.length || 0)
      allSessions = sessions || []
    }

    // ========================================================================
    // TRY: If no sessions, try fetching ALL sessions (maybe school_id is NULL or unfiltered)
    // ========================================================================
    if (allSessions.length === 0) {
      console.log('[API-Sessions] No sessions found with school filter, trying all sessions...')
      const { data: allSessionsData, error: allError } = await supabase
        .from('academic_sessions')
        .select('id, school_id, session_year, is_active')
        .order('session_year', { ascending: false })

      console.log('[API-Sessions] All sessions in DB:', allSessionsData?.length || 0)
      if (allSessionsData && allSessionsData.length > 0) {
        console.log('[API-Sessions] Sample session:', allSessionsData[0])
      }
    }

    // ========================================================================
    // STEP 2: Fetch terms if we have sessions
    // ========================================================================
    if (allSessions.length > 0) {
      const sessionIds = allSessions.map((s) => s.id)
      console.log('[API-Sessions] Fetching terms for sessions:', sessionIds)

      const { data: terms, error: termsError } = await supabase
        .from('academic_terms')
        .select('id, session_id, term_name, term_number, is_active, start_date, end_date')
        .in('session_id', sessionIds)
        .order('term_number', { ascending: true })

      if (termsError) {
        console.error('[API-Sessions] Error fetching terms:', termsError)
      } else {
        console.log('[API-Sessions] Found terms:', terms?.length || 0)
        allTerms = terms || []
      }
    }

    // ========================================================================
    // FALLBACK: Try fetching from 'terms' table as fallback
    // ========================================================================
    if (allTerms.length === 0) {
      console.log('[API-Sessions] No terms found from academic_terms, trying terms table...')
      const { data: fallbackTerms, error: fallbackError } = await supabase
        .from('terms')
        .select('*')
        .limit(10)

      if (!fallbackError && fallbackTerms) {
        console.log('[API-Sessions] Fallback terms table has:', fallbackTerms.length, 'records')
        if (fallbackTerms.length > 0) {
          console.log('[API-Sessions] Sample fallback term:', fallbackTerms[0])
        }
      }
    }

    // ========================================================================
    // Response
    // ========================================================================
    console.log('[API-Sessions] Returning:', {
      sessions: allSessions.length,
      terms: allTerms.length,
    })

    return NextResponse.json({
      success: true,
      sessions: allSessions,
      terms: allTerms,
      message: `Found ${allSessions.length} sessions and ${allTerms.length} terms`,
      debug: {
        schoolId,
        sessionCount: allSessions.length,
        termCount: allTerms.length,
      },
    })
  } catch (error: any) {
    console.error('[API-Sessions] Exception:', error)
    console.error('[API-Sessions] Error details:', error.message, error.stack)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
