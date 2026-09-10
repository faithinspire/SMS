import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Initializes default data for a school
 * Creates 12 classes, arms, combos, streams, and subjects
 * 
 * POST /api/setup/init-school-data
 * Body: { schoolId: "uuid" }
 */
export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await request.json()

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 })
    }

    console.log('🔧 [INIT SCHOOL DATA] Starting for schoolId:', schoolId)

    // Check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Check if data already exists
    const { count: classCount } = await supabase
      .from('classes')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId)

    if ((classCount || 0) > 0) {
      return NextResponse.json({
        status: 'already_exists',
        message: 'School already has classes',
        classCount,
      })
    }

    // ====================================================================
    // CREATE PRIMARY CLASSES (Prep, Nursery, KG, Primary 1-6)
    // ====================================================================
    const primaryClasses = []
    const primaryClassDefs = [
      { name: 'Prep', level: 0 },
      { name: 'Nursery', level: 1 },
      { name: 'Kindergarten', level: 2 },
      { name: 'Primary 1', level: 3 },
      { name: 'Primary 2', level: 4 },
      { name: 'Primary 3', level: 5 },
      { name: 'Primary 4', level: 6 },
      { name: 'Primary 5', level: 7 },
      { name: 'Primary 6', level: 8 },
    ]

    for (const classDef of primaryClassDefs) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert([{
          school_id: schoolId,
          name: classDef.name,
          level: classDef.level,
          type: 'PRIMARY',
        }])
        .select()

      if (classError) {
        console.error('❌ Error creating primary class:', classError)
        throw classError
      }
      if (classData) {
        primaryClasses.push(classData[0])
      }
    }

    console.log('✅ Created', primaryClasses.length, 'primary classes')

    // ====================================================================
    // CREATE SECONDARY CLASSES (JSS 1-3: levels 9-11, SSS 1-3: levels 12-14)
    // ====================================================================
    const secondaryClasses = []
    const secondaryClassDefs = [
      { name: 'JSS 1', level: 9 },
      { name: 'JSS 2', level: 10 },
      { name: 'JSS 3', level: 11 },
      { name: 'SSS 1', level: 12 },
      { name: 'SSS 2', level: 13 },
      { name: 'SSS 3', level: 14 },
    ]

    for (const classDef of secondaryClassDefs) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert([{
          school_id: schoolId,
          name: classDef.name,
          level: classDef.level,
          type: 'SECONDARY',
        }])
        .select()

      if (classError) {
        console.error('❌ Error creating secondary class:', classError)
        throw classError
      }
      if (classData) {
        secondaryClasses.push(classData[0])
      }
    }

    console.log('✅ Created', secondaryClasses.length, 'secondary classes')

    const allClasses = [...primaryClasses, ...secondaryClasses]

    // ====================================================================
    // CREATE ARMS (A, B, C for each class)
    // ====================================================================
    const armNames = ['A', 'B', 'C']
    const allArms = []

    for (const classRecord of allClasses) {
      for (const armName of armNames) {
        const { data: armData, error: armError } = await supabase
          .from('arms')
          .insert([{
            class_id: classRecord.id,
            school_id: schoolId,
            name: armName,
            capacity: 40,
          }])
          .select()

        if (armError) {
          console.error('❌ Error creating arm:', armError)
          throw armError
        }
        if (armData) {
          allArms.push(armData[0])
        }
      }
    }

    console.log('✅ Created', allArms.length, 'arms')

    // ====================================================================
    // CREATE CLASS-ARM COMBINATIONS
    // ====================================================================
    const combos = []
    for (const arm of allArms) {
      const { data: comboData, error: comboError } = await supabase
        .from('class_arm_combos')
        .insert([{
          school_id: schoolId,
          class_id: arm.class_id,
          arm_id: arm.id,
        }])
        .select()

      if (comboError) {
        console.error('❌ Error creating combo:', comboError)
        throw comboError
      }
      if (comboData) {
        combos.push(comboData[0])
      }
    }

    console.log('✅ Created', combos.length, 'class-arm combinations')

    // ====================================================================
    // CREATE STREAMS
    // ====================================================================
    const streamNames = ['Science', 'Commercial', 'Humanities', 'Technical']
    const streams = []

    for (const streamName of streamNames) {
      const { data: streamData, error: streamError } = await supabase
        .from('streams')
        .insert([{
          school_id: schoolId,
          name: streamName,
        }])
        .select()

      if (streamError) {
        console.error('❌ Error creating stream:', streamError)
        // Don't throw - streams table might not exist yet
        console.warn('⚠️ Streams table might not exist, skipping...')
      } else if (streamData) {
        streams.push(streamData[0])
      }
    }

    console.log('✅ Created', streams.length, 'streams')

    // ====================================================================
    // SUBJECTS ARE NOW AUTO-SEEDED VIA MIGRATION 049
    // No need to create them here - migration handles all 37 canonical subjects
    // ====================================================================
    console.log('✅ Subjects will be auto-seeded via migration 049 for all schools')
    const subjectCount = 37 // Canonical subject count

    // ====================================================================
    // SUCCESS
    // ====================================================================
    return NextResponse.json({
      status: 'success',
      message: `School data initialized for ${school.name}`,
      data: {
        schoolId,
        schoolName: school.name,
        stats: {
          classCount: allClasses.length,
          armCount: allArms.length,
          comboCount: combos.length,
          streamCount: streams.length,
          subjectCount: subjectCount,
          subjectNote: 'Auto-seeded via migration 049 (37 canonical subjects)',
        },
      },
    })
  } catch (error: any) {
    console.error('❌ [INIT SCHOOL DATA] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Failed to initialize school data',
        error: error.details || error,
      },
      { status: 500 }
    )
  }
}
