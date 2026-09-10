import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await request.json()

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log('🌱 [SEED] Starting school data seeding for:', schoolId)

    // Call the auto-seeding function directly
    const { data, error } = await supabase.rpc('create_default_school_data', {
      p_school_id: schoolId,
    })

    if (error) {
      console.error('❌ [SEED] Error calling create_default_school_data:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to seed school data' },
        { status: 500 }
      )
    }

    console.log('✅ [SEED] School data seeding completed')

    // Verify the seeding worked
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)

    const { data: subjects, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('school_id', schoolId)

    const { data: combos, error: comboError } = await supabase
      .from('class_arm_combos')
      .select('id')
      .eq('school_id', schoolId)

    const classCount = !classError ? (classes?.length || 0) : 0
    const subjectCount = !subjectError ? (subjects?.length || 0) : 0
    const comboCount = !comboError ? (combos?.length || 0) : 0

    console.log('📊 [SEED] Verification - Classes:', classCount, 'Subjects:', subjectCount, 'Combos:', comboCount)

    return NextResponse.json({
      success: true,
      message: 'School data seeded successfully',
      stats: {
        classCount,
        subjectCount,
        comboCount,
      },
    })
  } catch (error: any) {
    console.error('❌ [SEED] Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
