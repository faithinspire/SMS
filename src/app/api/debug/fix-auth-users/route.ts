import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Manual endpoint to sync pending auth users to database
 * GET /api/debug/fix-auth-users - Shows status
 * POST /api/debug/fix-auth-users - Runs the sync
 */

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check pending users
    const { data: pending, error: pendingErr } = await supabase
      .from('pending_auth_users')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false)

    const { data: processed, error: processedErr } = await supabase
      .from('pending_auth_users')
      .select('*', { count: 'exact', head: true })
      .eq('processed', true)

    const { data: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      status: 'ok',
      pendingCount: pending?.length || 0,
      processedCount: processed?.length || 0,
      totalUsersInDatabase: totalUsers?.length || 0,
      message: 'Run POST request to sync pending users',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the sync function
    const { data, error } = await supabase.rpc('sync_pending_auth_users')

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      results: {
        syncedCount: data?.[0]?.synced_count || 0,
        skippedCount: data?.[0]?.skipped_count || 0,
        failedCount: data?.[0]?.failed_count || 0,
      },
    })
  } catch (error: any) {
    console.error('Error in fix-auth-users:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
