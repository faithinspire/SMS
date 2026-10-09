/**
 * Get Canonical Subjects for Staff Registration
 * 
 * GET /api/canonical-subjects?schoolId=<schoolId>
 * 
 * Returns all available subjects for a school
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log('[Canonical Subjects API] Fetching subjects for school:', schoolId)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get all subjects for this school
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('id, name, code, subject_type')
      .eq('school_id', schoolId)
      .order('name', { ascending: true })

    if (error) {
      console.error('[Canonical Subjects API] Error:', error)
      throw error
    }

    console.log('[Canonical Subjects API] ✅ Loaded subjects:', subjects?.length || 0)

    return NextResponse.json(subjects || [])
  } catch (error: any) {
    console.error('[Canonical Subjects API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load subjects' },
      { status: 500 }
    )
  }
}
