import { supabase } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/teaching/class-combos
 * Fetch class-arm combos bypassing the broken nested query
 * Query params: schoolId, section (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    const section = req.nextUrl.searchParams.get('section')

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 })
    }

    console.log(`🔗 API: Loading class-arm combos for ${schoolId}, section: ${section}`)

    // Fetch ALL combos at once (no nested field ordering)
    const { data: allCombos, error: comboError } = await supabase
      .from('class_arm_combos')
      .select(`
        id,
        class_id,
        arm_id,
        classes: class_id (id, name, level, type),
        arms: arm_id (id, name, capacity)
      `)
      .eq('school_id', schoolId)

    if (comboError) {
      console.error('❌ Error loading combos:', comboError)
      return NextResponse.json({ error: comboError.message }, { status: 500 })
    }

    let filtered = allCombos || []

    // Filter by section AFTER fetching (in-memory)
    if (section) {
      filtered = filtered.filter((combo: any) => combo.classes?.type === section)
    }

    // Sort by class level (in-memory)
    const sorted = filtered.sort(
      (a: any, b: any) => (a.classes?.level || 0) - (b.classes?.level || 0)
    )

    console.log(`✅ API: Loaded ${sorted.length} combos`)

    return NextResponse.json(sorted)
  } catch (error: any) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
