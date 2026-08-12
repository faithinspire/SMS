import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const schoolId = searchParams.get('schoolId')

  if (!schoolId) {
    return NextResponse.json({
      error: 'schoolId parameter required',
      example: '/api/debug/registration-data?schoolId=xxx',
    })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Query all the registration data for this school
    const [classesRes, armsRes, combosRes, subjectsRes] = await Promise.all([
      supabase.from('classes').select('*').eq('school_id', schoolId),
      supabase.from('arms').select('*').eq('school_id', schoolId),
      supabase.from('class_arm_combos').select('*').eq('school_id', schoolId),
      supabase.from('subjects').select('*').eq('school_id', schoolId),
    ])

    const diagnosticData = {
      schoolId,
      classes: {
        count: classesRes.data?.length || 0,
        error: classesRes.error,
        sample: classesRes.data?.slice(0, 3),
      },
      arms: {
        count: armsRes.data?.length || 0,
        error: armsRes.error,
        sample: armsRes.data?.slice(0, 3),
      },
      classArmCombos: {
        count: combosRes.data?.length || 0,
        error: combosRes.error,
        sample: combosRes.data?.slice(0, 3),
      },
      subjects: {
        count: subjectsRes.data?.length || 0,
        error: subjectsRes.error,
        sample: subjectsRes.data?.slice(0, 3),
      },
    }

    return NextResponse.json(diagnosticData)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
