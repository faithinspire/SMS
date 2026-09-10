import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Always use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * GET /api/schools
 * Returns all schools with complete details including admin credentials
 * Uses service role key to bypass RLS
 */
export async function GET() {
  try {
    console.log('📡 [GET SCHOOLS] Fetching all schools from database...')
    
    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ [GET SCHOOLS] SUPABASE_SERVICE_KEY is not set!')
      return NextResponse.json(
        { error: 'Server configuration error: missing service key' },
        { status: 500 }
      )
    }

    // Select all fields from schools table using service role (bypasses RLS)
    const { data: schools, error } = await supabaseAdmin
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [GET SCHOOLS] Database error:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log(`📊 [GET SCHOOLS] Retrieved ${schools?.length || 0} schools from database`)

    // Fetch admin credentials from users table for each school
    const schoolsWithDetails = await Promise.all(
      (schools || []).map(async (school) => {
        try {
          const { data: adminUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('school_id', school.id)
            .eq('role', 'SCHOOL_ADMIN')
            .single()

          if (userError && userError.code !== 'PGRST116') {
            console.warn(`⚠️ [GET SCHOOLS] Error fetching admin for school ${school.id}:`, userError)
          }

          return {
            ...school,
            admin_email: adminUser?.email || school.admin_email || null,
            admin_name: adminUser?.full_name || null,
          }
        } catch (err) {
          console.warn(`⚠️ [GET SCHOOLS] Exception fetching admin for school ${school.id}:`, err)
          return school
        }
      })
    )

    console.log(`✅ [GET SCHOOLS] Successfully returning ${schoolsWithDetails?.length || 0} schools with details`)
    return NextResponse.json(schoolsWithDetails || [])
  } catch (error: any) {
    console.error('❌ [GET SCHOOLS] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
