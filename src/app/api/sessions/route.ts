/**
 * GET /api/sessions - Get all academic sessions for a school
 * POST /api/sessions - Create a new academic session with auto-generated terms
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId query parameter is required' },
        { status: 400 }
      )
    }

    // Fetch academic sessions ordered by start_year DESC (newest first)
    const { data, error } = await supabase
      .from('academic_sessions')
      .select('id, session_year, start_year, end_year, is_active, created_at')
      .eq('school_id', schoolId)
      .order('start_year', { ascending: false })

    if (error) {
      console.error('[API] Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        sessions: data || [],
        count: (data || []).length,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[API] Unexpected error in GET /api/sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, start_year, end_year, is_active } = body

    // Validate inputs
    if (!school_id || start_year === undefined) {
      return NextResponse.json(
        { error: 'school_id and start_year are required' },
        { status: 400 }
      )
    }

    // Generate session_year string
    const endYearValue = end_year || start_year + 1
    const session_year = `${start_year}/${endYearValue}`

    // Create academic session
    const { data: sessionData, error: sessionError } = await supabase
      .from('academic_sessions')
      .insert({
        school_id,
        session_year,
        start_year,
        end_year: endYearValue,
        is_active: is_active || false,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('[API] Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session', details: sessionError.message },
        { status: 500 }
      )
    }

    // Create default terms (First, Second, Third)
    const termsToCreate = [
      { term_name: 'First Term', term_order: 1 },
      { term_name: 'Second Term', term_order: 2 },
      { term_name: 'Third Term', term_order: 3 },
    ].map((term) => ({
      academic_session_id: sessionData.id,
      ...term,
    }))

    const { error: termsError } = await supabase
      .from('academic_terms')
      .insert(termsToCreate)

    if (termsError) {
      console.warn('[API] Warning: Terms creation had issues:', termsError)
      // Don't fail the whole request if terms creation has issues
    }

    return NextResponse.json(
      {
        success: true,
        session_id: sessionData.id,
        session_year: sessionData.session_year,
        terms_auto_created: 3,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API] Unexpected error in POST /api/sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
