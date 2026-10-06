import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Mark as dynamic - uses searchParams which requires request context
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const type = searchParams.get('type') // 'sessions', 'terms', or 'all'

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log(`[Academic API] Fetching ${type || 'all'} for school: ${schoolId}`)

    // Fetch sessions
    const sessionPromise = supabase
      .from('academic_sessions')
      .select('id, session_year, start_year, end_year, is_active')
      .eq('school_id', schoolId)
      .order('start_year', { ascending: false })

    // Fetch terms
    const termPromise = supabase
      .from('academic_terms')
      .select('id, session_id, term_number, name, is_active')
      .eq('school_id', schoolId)
      .order('term_number', { ascending: true })

    // Fetch classes
    const classPromise = supabase
      .from('class_arm_combos')
      .select(`
        id,
        school_id,
        class_id,
        arm_id,
        is_active,
        classes (id, name, level),
        arms (id, name)
      `)
      .eq('school_id', schoolId)

    const [sessionsResult, termsResult, classesResult] = await Promise.all([
      sessionPromise,
      termPromise,
      classPromise,
    ])

    if (sessionsResult.error) {
      console.error('[Academic API] Sessions error:', sessionsResult.error)
      throw sessionsResult.error
    }

    if (termsResult.error) {
      console.error('[Academic API] Terms error:', termsResult.error)
      throw termsResult.error
    }

    if (classesResult.error) {
      console.error('[Academic API] Classes error:', classesResult.error)
      throw classesResult.error
    }

    console.log(`[Academic API] Loaded: ${sessionsResult.data?.length} sessions, ${termsResult.data?.length} terms, ${classesResult.data?.length} classes`)

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsResult.data || [],
        terms: termsResult.data || [],
        classes: classesResult.data || [],
      },
      counts: {
        sessions: sessionsResult.data?.length || 0,
        terms: termsResult.data?.length || 0,
        classes: classesResult.data?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('[Academic API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch academic data' },
      { status: 500 }
    )
  }
}
