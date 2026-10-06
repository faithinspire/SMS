import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ✅ HOTFIX: Use service role key for unrestricted school data access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log(`[Students API] Fetching students for school: ${schoolId}`)

    // Get all students with their related data
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        school_id,
        admission_number,
        date_of_birth,
        status,
        class_arm_combo_id,
        photo_url,
        created_at,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          status,
          photo_url
        ),
        class_arm_combo (
          id,
          class:classes (
            id,
            name,
            level
          ),
          arm:arms (
            id,
            name
          )
        )
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (studentError) {
      console.error('[Students API] Error fetching students:', studentError)
      throw studentError
    }

    console.log(`[Students API] Found ${students?.length || 0} students`)

    return NextResponse.json({
      success: true,
      count: students?.length || 0,
      data: students || [],
    })
  } catch (error: any) {
    console.error('[Students API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch students' },
      { status: 500 }
    )
  }
}
