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

    console.log(`[Staff API] Fetching staff for school: ${schoolId}`)

    // Get all users with staff roles for this school
    const { data: staffUsers, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('school_id', schoolId)
      .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'])

    if (userError) {
      console.error('[Staff API] Error fetching users:', userError)
      throw userError
    }

    console.log(`[Staff API] Found ${staffUsers?.length || 0} staff users`)

    // Get staff employment records (supplementary data)
    const { data: staffRecords, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_id', schoolId)

    if (staffError) {
      console.warn('[Staff API] Warning fetching staff records:', staffError)
      // Non-fatal - continue with users only
    }

    // Merge data
    const mergedStaff = (staffUsers || []).map((user: any) => {
      const staffRecord = staffRecords?.find((s: any) => s.user_id === user.id)
      return {
        id: staffRecord?.id || `staff_${user.id}`,
        user_id: user.id,
        school_id: user.school_id,
        position: staffRecord?.position || user.role || 'Staff',
        employment_date: staffRecord?.employment_date || null,
        status: staffRecord?.status || user.status || 'ACTIVE',
        user: {
          id: user.id,
          full_name: user.full_name || 'Unknown',
          email: user.email || 'no-email',
          photo_url: user.photo_url,
          role: user.role,
          status: user.status,
        },
      }
    })

    return NextResponse.json({
      success: true,
      count: mergedStaff.length,
      data: mergedStaff,
    })
  } catch (error: any) {
    console.error('[Staff API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}
