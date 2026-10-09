/**
 * Get Canonical Subjects for School
 * GET /api/teaching/canonical-subjects?schoolId=<uuid>
 * 
 * Returns all active subjects for a school that teachers can assign.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const schoolId = request.nextUrl.searchParams.get('schoolId')

  try {
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

    // Fetch all active subjects for this school
    console.log('[Canonical Subjects API] Fetching subjects...')
    const { data: subjects, error: queryError } = await supabase
      .from('subjects')
      .select('id, name, code, applicable_to_levels')
      .eq('school_id', schoolId)
      .order('name', { ascending: true })

    if (queryError) {
      console.error('[Canonical Subjects API] Query error:', queryError.message)
      throw new Error(`Failed to fetch subjects: ${queryError.message}`)
    }

    if (!subjects || subjects.length === 0) {
      console.log('[Canonical Subjects API] No subjects found for school:', schoolId)
      return NextResponse.json([], { status: 200 })
    }

    // Format response
    const formatted = subjects.map((subject: any) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code || '',
      applicable_to_levels: subject.applicable_to_levels || [],
    }))

    const elapsed = Date.now() - startTime
    console.log(
      `[Canonical Subjects API] ✅ Success: returned ${formatted.length} subjects in ${elapsed}ms`
    )

    return NextResponse.json(formatted, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Canonical Subjects API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      stack: error.stack?.substring(0, 200),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load subjects',
      },
      { status: 500 }
    )
  }
}
