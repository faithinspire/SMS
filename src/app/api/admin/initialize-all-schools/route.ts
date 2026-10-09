/**
 * Admin Utility: Initialize All Existing Schools
 * POST /api/admin/initialize-all-schools?adminKey=<key>
 * 
 * Runs initialization for all schools that were created before 
 * the auto-initialization feature (migration 172).
 * 
 * Security: Requires admin key from environment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const adminKey = request.nextUrl.searchParams.get('adminKey')

  try {
    // Verify admin key
    const expectedKey = process.env.ADMIN_INIT_KEY || 'default-key-change-this'
    if (adminKey !== expectedKey) {
      console.error('[Admin Init API] Unauthorized: invalid admin key')
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    console.log('[Admin Init API] Starting bulk initialization of all schools...')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('status', 'ACTIVE')

    if (schoolsError) {
      console.error('[Admin Init API] Failed to fetch schools:', schoolsError.message)
      return NextResponse.json(
        { error: `Failed to fetch schools: ${schoolsError.message}`, success: false },
        { status: 500 }
      )
    }

    if (!schools || schools.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No schools to initialize',
        data: {
          schoolsProcessed: 0,
          schoolsInitialized: 0,
          schoolsFailed: 0,
        },
      })
    }

    console.log(`[Admin Init API] Found ${schools.length} schools to initialize`)

    let initialized = 0
    let failed = 0
    const results: any[] = []

    for (const school of schools) {
      try {
        console.log(`[Admin Init API] Initializing school: ${school.name} (${school.id})`)

        const { data, error } = await supabase.rpc('initialize_school_data', {
          p_school_id: school.id,
        })

        if (error) {
          console.error(`[Admin Init API] ❌ Failed for ${school.name}:`, error.message)
          failed++
          results.push({
            schoolId: school.id,
            schoolName: school.name,
            status: 'failed',
            error: error.message,
          })
        } else {
          console.log(`[Admin Init API] ✅ Initialized ${school.name}`)
          initialized++
          results.push({
            schoolId: school.id,
            schoolName: school.name,
            status: 'success',
            data: data?.[0] || {},
          })
        }
      } catch (e: any) {
        console.error(`[Admin Init API] Exception for ${school.name}:`, e.message)
        failed++
        results.push({
          schoolId: school.id,
          schoolName: school.name,
          status: 'exception',
          error: e.message,
        })
      }
    }

    const elapsed = Date.now() - startTime
    console.log(
      `[Admin Init API] ✅ Bulk initialization complete in ${elapsed}ms: ${initialized} success, ${failed} failed`
    )

    return NextResponse.json({
      success: true,
      data: {
        schoolsProcessed: schools.length,
        schoolsInitialized: initialized,
        schoolsFailed: failed,
        elapsedMs: elapsed,
        results: results,
      },
      message: `Initialized ${initialized} schools, ${failed} failed`,
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Admin Init API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      stack: error.stack?.substring(0, 300),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Initialization failed',
      },
      { status: 500 }
    )
  }
}
