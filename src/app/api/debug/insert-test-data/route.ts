import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { schoolId } = await request.json()

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('📝 Inserting test data for schoolId:', schoolId)

    // Insert Classes
    const { error: classError } = await supabase
      .from('classes')
      .insert([
        { school_id: schoolId, name: 'Primary 1', level: 1, type: 'PRIMARY' },
        { school_id: schoolId, name: 'Primary 2', level: 2, type: 'PRIMARY' },
        { school_id: schoolId, name: 'Primary 3', level: 3, type: 'PRIMARY' },
        { school_id: schoolId, name: 'Primary 4', level: 4, type: 'PRIMARY' },
        { school_id: schoolId, name: 'Primary 5', level: 5, type: 'PRIMARY' },
        { school_id: schoolId, name: 'Primary 6', level: 6, type: 'PRIMARY' },
        { school_id: schoolId, name: 'JSS 1', level: 7, type: 'SECONDARY' },
        { school_id: schoolId, name: 'JSS 2', level: 8, type: 'SECONDARY' },
        { school_id: schoolId, name: 'JSS 3', level: 9, type: 'SECONDARY' },
        { school_id: schoolId, name: 'SSS 1', level: 10, type: 'SECONDARY' },
        { school_id: schoolId, name: 'SSS 2', level: 11, type: 'SECONDARY' },
        { school_id: schoolId, name: 'SSS 3', level: 12, type: 'SECONDARY' },
      ])
      .select('id')

    if (classError) {
      console.error('❌ Class insert error:', classError)
      return NextResponse.json(
        { error: 'Failed to insert classes', details: classError },
        { status: 500 }
      )
    }

    // Fetch created classes
    const { data: classes, error: classSelectError } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)

    if (!classes || classes.length === 0) {
      return NextResponse.json(
        { error: 'No classes found after insert' },
        { status: 500 }
      )
    }

    console.log('✅ Created', classes.length, 'classes')

    // Insert Arms (A, B, C) for each class
    const armsToInsert = classes.flatMap(c => [
      { school_id: schoolId, class_id: c.id, name: 'A', capacity: 40 },
      { school_id: schoolId, class_id: c.id, name: 'B', capacity: 40 },
      { school_id: schoolId, class_id: c.id, name: 'C', capacity: 40 },
    ])

    const { error: armError } = await supabase
      .from('arms')
      .insert(armsToInsert)

    if (armError) {
      console.error('❌ Arm insert error:', armError)
      return NextResponse.json(
        { error: 'Failed to insert arms', details: armError },
        { status: 500 }
      )
    }

    console.log('✅ Created', armsToInsert.length, 'arms')

    // Fetch arms
    const { data: arms, error: armSelectError } = await supabase
      .from('arms')
      .select('id, class_id')
      .eq('school_id', schoolId)

    // Insert Class-Arm Combinations
    const combosToInsert = arms!.map(arm => ({
      school_id: schoolId,
      class_id: arm.class_id,
      arm_id: arm.id,
    }))

    const { error: comboError } = await supabase
      .from('class_arm_combos')
      .insert(combosToInsert)

    if (comboError) {
      console.error('❌ Combo insert error:', comboError)
      return NextResponse.json(
        { error: 'Failed to insert class_arm_combos', details: comboError },
        { status: 500 }
      )
    }

    console.log('✅ Created', combosToInsert.length, 'class-arm combinations')

    // Insert Subjects
    const { error: subjectError } = await supabase
      .from('subjects')
      .insert([
        // Primary
        { school_id: schoolId, name: 'English Language', code: 'ENG', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Mathematics', code: 'MATH', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Science', code: 'SCI', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Social Studies', code: 'SS', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Civic Education', code: 'CIV', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Physical Education', code: 'PE', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Art & Craft', code: 'ART', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Music', code: 'MUS', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Home Economics', code: 'HE', applicable_to_levels: [1, 2, 3, 4, 5, 6] },
        { school_id: schoolId, name: 'Information Technology', code: 'ICT', applicable_to_levels: [3, 4, 5, 6] },
        // Secondary
        { school_id: schoolId, name: 'English', code: 'ENG_SEC', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Mathematics', code: 'MATH_SEC', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Biology', code: 'BIO', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Chemistry', code: 'CHEM', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Physics', code: 'PHY', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'History', code: 'HIST', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Geography', code: 'GEO', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Civic Education', code: 'CIV_SEC', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Physical Education', code: 'PE_SEC', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Agricultural Science', code: 'AGR', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Technical Drawing', code: 'TD', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Computer Science', code: 'CS', applicable_to_levels: [7, 8, 9, 10, 11, 12] },
        { school_id: schoolId, name: 'Economics', code: 'ECON', applicable_to_levels: [10, 11, 12] },
        { school_id: schoolId, name: 'Accounting', code: 'ACC', applicable_to_levels: [10, 11, 12] },
        { school_id: schoolId, name: 'Government', code: 'GOV', applicable_to_levels: [10, 11, 12] },
        { school_id: schoolId, name: 'Literature In English', code: 'LIT', applicable_to_levels: [10, 11, 12] },
        { school_id: schoolId, name: 'Further Mathematics', code: 'FM', applicable_to_levels: [10, 11, 12] },
      ])

    if (subjectError) {
      console.error('❌ Subject insert error:', subjectError)
      return NextResponse.json(
        { error: 'Failed to insert subjects', details: subjectError },
        { status: 500 }
      )
    }

    console.log('✅ Created 27 subjects')

    return NextResponse.json({
      success: true,
      message: 'Test data inserted successfully',
      data: {
        classes: classes.length,
        arms: armsToInsert.length,
        combos: combosToInsert.length,
        subjects: 27,
      },
    })
  } catch (err: any) {
    console.error('❌ Exception:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
