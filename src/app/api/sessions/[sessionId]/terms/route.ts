import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/sessions/:sessionId/terms
 * 
 * Returns all terms for a specific academic session, ordered by term_order (ASC).
 * Terms are always in correct sequence: First → Second → Third.
 * 
 * Response:
 * {
 *   success: boolean,
 *   count: number,
 *   session_year: "2026/2027",
 *   terms: [
 *     {
 *       id: UUID,
 *       term_name: "First Term",
 *       term_order: 1,
 *       start_date: "2026-09-01",
 *       end_date: "2026-11-30",
 *       is_active: true,
 *       created_at: ISO8601
 *     }
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      )
    }

    // Get session info first
    const { data: session, error: sessionError } = await supabase
      .from('academic_sessions')
      .select('id, session_year, school_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Session not found:', sessionError)
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Fetch all terms for this session, ordered by term_order
    const { data: terms, error: termsError } = await supabase
      .from('academic_terms')
      .select('id, term_name, term_order, start_date, end_date, is_active, created_at')
      .eq('session_id', sessionId)
      .order('term_order', { ascending: true })

    if (termsError) {
      console.error('Error fetching terms:', termsError)
      throw termsError
    }

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      session_year: session.session_year,
      school_id: session.school_id,
      count: terms?.length || 0,
      terms: terms || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/sessions/:sessionId/terms:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
