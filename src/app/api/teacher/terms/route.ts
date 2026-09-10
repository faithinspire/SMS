import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/terms
 * 
 * Fetch all available terms for a school
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * 
 * RETURNS:
 * - Array of terms with id, name, dates, and is_current flag
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

    const { data: terms, error } = await supabase
      .from('academic_terms')
      .select('id, term_name, start_date, end_date, is_active, session_id')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching terms:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      count: (terms || []).length,
      terms: terms || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/teacher/terms:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

