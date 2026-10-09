/**
 * Get Class-Arm Combos for Teacher Registration
 * 
 * GET /api/teaching/class-combos?schoolId=<schoolId>&section=<section>
 * 
 * Returns all available class-arm combos for a school and section
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId')
    const section = request.nextUrl.searchParams.get('section')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log('[Class Combos API] Fetching combos for school:', schoolId, 'section:', section)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Build query
    let query = supabase
      .from('class_arm_combos')
      .select(`
        id,
        classes (id, name, section),
        arms (id, name)
      `)
      .eq('school_id', schoolId)

    // Filter by section if provided
    if (section) {
      query = query.eq('classes.section', section)
    }

    const { data: combos, error } = await query.order('classes.name', { ascending: true })

    if (error) {
      console.error('[Class Combos API] Error:', error)
      throw error
    }

    // Transform response
    const formattedCombos = (combos || []).map((combo: any) => ({
      id: combo.id,
      class_name: combo.classes?.name || 'Unknown',
      arm_name: combo.arms?.name || 'Unknown',
      label: `${combo.classes?.name || 'Unknown'} - ${combo.arms?.name || 'Unknown'}`,
    }))

    console.log('[Class Combos API] ✅ Loaded combos:', formattedCombos.length)

    return NextResponse.json(formattedCombos)
  } catch (error: any) {
    console.error('[Class Combos API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load class combos' },
      { status: 500 }
    )
  }
}
