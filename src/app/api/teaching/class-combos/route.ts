/**
 * Get Class-Arm Combos for Teacher Registration
 * GET /api/teaching/class-combos?schoolId=<uuid>&section=<PRIMARY|SECONDARY>
 * 
 * Loads actual classes and arms from Supabase for the authenticated school.
 * Returns properly formatted combo options for registration dropdowns.
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

    // PHASE 1: Fetch classes for the school with the given type (PRIMARY|SECONDARY)
    console.log('[Class Combos API] Phase 1: Fetching classes...')
    let classesQuery = supabase
      .from('classes')
      .select('id, name, level, type')
      .eq('school_id', schoolId)

    // Filter by section/type if provided (type = PRIMARY or SECONDARY)
    if (section) {
      classesQuery = classesQuery.eq('type', section)
    }

    const { data: classes, error: classesError } = await classesQuery

    if (classesError) {
      console.error('[Class Combos API] Classes query error:', classesError)
      throw new Error(`Failed to fetch classes: ${classesError.message}`)
    }

    if (!classes || classes.length === 0) {
      console.log(
        '[Class Combos API] No classes found for school:',
        schoolId,
        'section:',
        section || 'any'
      )
      return NextResponse.json([], { status: 200 })
    }

    console.log(`[Class Combos API] Found ${classes.length} classes`)

    // PHASE 2: Fetch arms for each class
    console.log('[Class Combos API] Phase 2: Fetching arms for classes...')
    const classIds = classes.map((c: any) => c.id)

    const { data: arms, error: armsError } = await supabase
      .from('arms')
      .select('id, class_id, name')
      .in('class_id', classIds)

    if (armsError) {
      console.error('[Class Combos API] Arms query error:', armsError)
      throw new Error(`Failed to fetch arms: ${armsError.message}`)
    }

    const armsByClassId = (arms || []).reduce(
      (acc: any, arm: any) => {
        if (!acc[arm.class_id]) acc[arm.class_id] = []
        acc[arm.class_id].push(arm)
        return acc
      },
      {}
    )

    console.log(`[Class Combos API] Found ${arms?.length || 0} arms total`)

    // PHASE 3: Fetch class-arm-combos to get class teacher info
    console.log('[Class Combos API] Phase 3: Fetching class-arm combo records...')
    const { data: combos, error: combosError } = await supabase
      .from('class_arm_combos')
      .select('id, class_id, arm_id, class_teacher_id')
      .eq('school_id', schoolId)
      .in('class_id', classIds)

    if (combosError) {
      console.error('[Class Combos API] Combos query error:', combosError)
      throw new Error(`Failed to fetch class-arm combos: ${combosError.message}`)
    }

    console.log(`[Class Combos API] Found ${combos?.length || 0} combos`)

    // PHASE 4: Build formatted response
    console.log('[Class Combos API] Phase 4: Building formatted response...')
    const formattedCombos: any[] = []

    for (const classRecord of classes) {
      const classArms = armsByClassId[classRecord.id] || []

      for (const arm of classArms) {
        // Find the matching combo record
        const comboRecord = (combos || []).find(
          (c: any) => c.class_id === classRecord.id && c.arm_id === arm.id
        )

        formattedCombos.push({
          id: comboRecord?.id || `${classRecord.id}-${arm.id}`, // Use combo ID if available
          class_id: classRecord.id,
          arm_id: arm.id,
          class_name: classRecord.name,
          arm_name: arm.name,
          level: classRecord.level,
          type: classRecord.type,
          label: `${classRecord.name} - Arm ${arm.name}`,
          class_teacher_id: comboRecord?.class_teacher_id || null,
        })
      }
    }

    // Sort by class name, then arm name
    formattedCombos.sort((a, b) => {
      const classCompare = a.class_name.localeCompare(b.class_name)
      if (classCompare !== 0) return classCompare
      return a.arm_name.localeCompare(b.arm_name)
    })

    const elapsed = Date.now() - startTime
    console.log(
      `[Class Combos API] ✅ Success: returned ${formattedCombos.length} combos in ${elapsed}ms`
    )

    return NextResponse.json(formattedCombos, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Class Combos API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 300),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load class combos',
      },
      { status: 500 }
    )
  }
}
