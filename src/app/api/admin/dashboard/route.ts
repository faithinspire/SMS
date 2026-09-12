/**
 * GET /api/admin/dashboard
 * Get admin dashboard data
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AdminDashboardService } from '@/services/admin-dashboard.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and verify role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', session.user.id)
      .single()

    if (userError || !user || user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only school admins can access this' },
        { status: 403 }
      )
    }

    // Get dashboard data
    const dashboardData = await AdminDashboardService.getDashboardData(user.school_id)

    return NextResponse.json(dashboardData, { status: 200 })
  } catch (err: any) {
    console.error('❌ Exception in admin dashboard:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
