import { createClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route: GET /api/letters/fetch-staff
 * Fetches staff data for letter generation
 * Query params: staffId, schoolId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const schoolId = searchParams.get('schoolId')

    if (!staffId || !schoolId) {
      return NextResponse.json(
        { error: 'Missing staffId or schoolId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Fetch staff record
    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        user_id,
        position,
        department,
        employment_date,
        salary,
        bank_name,
        account_number,
        account_name
      `)
      .eq('id', staffId)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (staffError) {
      console.error('[Staff API] Error fetching staff:', staffError)
      return NextResponse.json(
        { error: 'Failed to fetch staff record' },
        { status: 500 }
      )
    }

    if (!staffRecord) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, gender, role')
      .eq('id', staffRecord.user_id)
      .maybeSingle()

    if (userError || !userData) {
      console.error('[Staff API] Error fetching user:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Return combined staff data
    return NextResponse.json({
      success: true,
      data: {
        id: staffRecord.id,
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'Staff Member',
        position: staffRecord.position || 'Staff Member',
        department: staffRecord.department || '',
        employment_date: staffRecord.employment_date || null,
        salary: staffRecord.salary || undefined,
        bank_name: staffRecord.bank_name || '',
        account_number: staffRecord.account_number || '',
        account_name: staffRecord.account_name || '',
      },
    })
  } catch (error) {
    console.error('[Staff API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
