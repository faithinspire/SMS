/**
 * POST /api/sessions/initialize - Create default academic session if none exist
 * 
 * Called by CBT management page to ensure sessions exist.
 * Creates: 2026/2027 session with First/Second/Third terms
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id } = body

    if (!school_id) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    // Check if sessions already exist for this school
    const { data: existingSessions, error: checkError } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('school_id', school_id)
      .limit(1)

    if (checkError) {
      return NextResponse.json(
        { error: 'Failed to check existing sessions', details: checkError.message },
        { status: 500 }
      )
    }

    // If sessions exist, return them
    if ((existingSessions || []).length > 0) {
      return NextResponse.json(
        { success: true, created: false, message: 'Sessions already exist' },
        { status: 200 }
      )
    }

    // Create 2026/2027 academic session
    const { data: sessionData, error: sessionError } = await supabase
      .from('academic_sessions')
      .insert({
        school_id,
        session_year: '2026/2027',
        start_year: 2026,
        end_year: 2027,
        is_active: true,
      })
      .select()
      .single()

    if (sessionError) {
      return NextResponse.json(
        { error: 'Failed to create session', details: sessionError.message },
        { status: 500 }
      )
    }

    // Create default terms
    const termsToCreate = [
      { term_name: 'First Term', term_order: 1, academic_session_id: sessionData.id },
      { term_name: 'Second Term', term_order: 2, academic_session_id: sessionData.id },
      { term_name: 'Third Term', term_order: 3, academic_session_id: sessionData.id },
    ]

    const { data: termsData, error: termsError } = await supabase
      .from('academic_terms')
      .insert(termsToCreate)
      .select()

    if (termsError) {
      return NextResponse.json(
        { error: 'Failed to create terms', details: termsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        created: true,
        session_id: sessionData.id,
        session_year: sessionData.session_year,
        terms_created: (termsData || []).length,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API] Error in POST /api/sessions/initialize:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
