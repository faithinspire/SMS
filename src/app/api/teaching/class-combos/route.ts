/**
 * Get Class-Arm Combos for Teacher Registration
 * GET /api/teaching/class-combos?schoolId=<uuid>&section=<PRIMARY|SECONDARY>
 * 
 * Returns array of class-arm combos formatted for dropdowns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const schoolId = request.nextUrl.searchParams.get('schoolId')
  const section = request.nextUrl.searchParams.get('section')

  try {
    // Validate inputs
    if (!schoolId) {
      console.error('[Class Combos API] Missing schoolId')
      return NextResponse.json(
        { error: 'schoolId is required', success: false },
        { status: 400 }
      )
    }

    console.log('[Class Combos API] Request:', { schoolId, section })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Query class-arm combos with proper joins
    let query = supabase
      .from('class_arm_combos')
      .select(
        `
        id,
        school_id,
        class_id,
        arm_id,
        classes!inner(id, name, school_level),
        arms!inner(id, name)
      `,
        { count: 'exact' }
      )
      .eq('school_id', schoolId)

    // Filter by school_level if provided
    if (section) {
      query = query.eq('classes.school_level', section)
    }

    const { data: combos, error: queryError, count } = await query.order('classes(name)', {
      ascending: true,
    })

    if (queryError) {
      console.error('[Class Combos API] Database error:', queryError.message, queryError.code)
      throw new Error(`Database error: ${queryError.message}`)
    }

    if (!combos || combos.length === 0) {
      console.warn('[Class Combos API] No combos found for school:', schoolId, 'section:', section)
      return NextResponse.json([], { status: 200 })
    }

    // Transform response
    const formattedCombos = combos.map((combo: any) => {
      const classObj = Array.isArray(combo.classes) ? combo.classes[0] : combo.classes
      const armObj = Array.isArray(combo.arms) ? combo.arms[0] : combo.arms

      return {
        id: combo.id,
        class_id: combo.class_id,
        arm_id: combo.arm_id,
        class_name: classObj?.name || 'Unknown Class',
        arm_name: armObj?.name || 'Unknown Arm',
        label: `${classObj?.name || 'Unknown'} - Arm ${armObj?.name || '?'}`,
        school_level: classObj?.school_level,
      }
    })

    const elapsed = Date.now() - startTime
    console.log(`[Class Combos API] ✅ Success: returned ${formattedCombos.length} combos in ${elapsed}ms`)

    return NextResponse.json(formattedCombos, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Class Combos API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 200),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load class combos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
