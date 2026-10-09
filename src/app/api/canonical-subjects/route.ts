/**
 * Get All Subjects for a School
 * GET /api/canonical-subjects?schoolId=<uuid>
 * 
 * Returns array of all available subjects for staff/student registration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const schoolId = request.nextUrl.searchParams.get('schoolId')

  try {
    // Validate inputs
    if (!schoolId) {
      console.error('[Canonical Subjects API] Missing schoolId')
      return NextResponse.json(
        { error: 'schoolId is required', success: false },
        { status: 400 }
      )
    }

    console.log('[Canonical Subjects API] Request for school:', schoolId)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get all subjects for school
    const { data: subjects, error: queryError, count } = await supabase
      .from('subjects')
      .select('id, name, code, subject_type, section, is_active', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (queryError) {
      console.error('[Canonical Subjects API] Database error:', queryError.message)
      throw new Error(`Database error: ${queryError.message}`)
    }

    if (!subjects) {
      console.warn('[Canonical Subjects API] No subjects found for school:', schoolId)
      return NextResponse.json([], { status: 200 })
    }

    const elapsed = Date.now() - startTime
    console.log(`[Canonical Subjects API] ✅ Success: returned ${subjects.length} subjects in ${elapsed}ms`)

    return NextResponse.json(subjects, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Canonical Subjects API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      code: error.code,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load subjects',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
