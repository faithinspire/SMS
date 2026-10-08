/**
 * GET /api/sessions/[sessionId]/terms - Get all terms for a specific academic session
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      )
    }

    // Fetch terms for this session, ordered by term_number ASC
    const { data, error } = await supabase
      .from('academic_terms')
      .select('id, name, term_number, start_date, end_date, is_active, created_at')
      .eq('session_id', sessionId)
      .order('term_number', { ascending: true })

    if (error) {
      console.error('[API] Error fetching terms:', error)
      return NextResponse.json(
        { error: 'Failed to fetch terms', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        terms: (data || []).map((t: any) => ({
          id: t.id,
          term_name: t.name,  // Map 'name' to 'term_name' for client compatibility
          term_order: t.term_number,
          start_date: t.start_date,
          end_date: t.end_date,
          is_active: t.is_active,
          created_at: t.created_at,
        })),
        count: (data || []).length,
        session_id: sessionId,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[API] Unexpected error in GET /api/sessions/[sessionId]/terms:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
