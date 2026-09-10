import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/**
 * GET /api/schools/debug
 * Debug endpoint to check if schools exist in database
 */
export async function GET() {
  try {
    console.log('🔍 [DEBUG] Starting school count check...')
    
    // Count schools
    const { count, error: countError } = await supabaseAdmin
      .from('schools')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ [DEBUG] Count error:', countError)
      return NextResponse.json(
        {
          status: 'error',
          message: 'Count failed',
          error: countError.message,
        },
        { status: 500 }
      )
    }

    console.log(`📊 [DEBUG] Total schools in database: ${count}`)

    // Get all schools with minimal select
    const { data: schools, error: selectError } = await supabaseAdmin
      .from('schools')
      .select('id, name, email, admin_email, created_at, status')
      .order('created_at', { ascending: false })
      .limit(50)

    if (selectError) {
      console.error('❌ [DEBUG] Select error:', selectError)
      return NextResponse.json(
        {
          status: 'error',
          message: 'Select failed',
          error: selectError.message,
        },
        { status: 500 }
      )
    }

    console.log(`✅ [DEBUG] Retrieved ${schools?.length || 0} schools`)

    return NextResponse.json({
      status: 'success',
      total_count: count,
      retrieved_count: schools?.length || 0,
      schools: schools || [],
      timestamp: new Date().toISOString(),
      service_key_present: !!process.env.SUPABASE_SERVICE_KEY,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('/').pop(),
    })
  } catch (error: any) {
    console.error('❌ [DEBUG] Fatal error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
