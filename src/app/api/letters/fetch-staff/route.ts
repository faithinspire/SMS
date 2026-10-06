import { createClient } from '@/lib/supabase-client'
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

    console.log('[API /letters/fetch-staff] Request received:', { staffId, schoolId })

    if (!staffId || !schoolId) {
      console.error('[API /letters/fetch-staff] Missing required params')
      return NextResponse.json(
        { error: 'Missing staffId or schoolId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Fetch staff record
    console.log('[API /letters/fetch-staff] Fetching staff record...')
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
      console.error('[API /letters/fetch-staff] Staff query error:', staffError)
      return NextResponse.json(
        { error: 'Failed to fetch staff record', details: staffError.message },
        { status: 500 }
      )
    }

    if (!staffRecord) {
      console.error('[API /letters/fetch-staff] Staff record not found:', { staffId, schoolId })
      return NextResponse.json(
        { error: 'Staff not found', details: `No staff with ID ${staffId} in school ${schoolId}` },
        { status: 404 }
      )
    }

    console.log('[API /letters/fetch-staff] Staff record found, fetching user data...')

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, gender, role')
      .eq('id', staffRecord.user_id)
      .maybeSingle()

    if (userError) {
      console.error('[API /letters/fetch-staff] User query error:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: userError.message },
        { status: 500 }
      )
    }

    if (!userData) {
      console.error('[API /letters/fetch-staff] User not found for staff:', staffRecord.user_id)
      return NextResponse.json(
        { error: 'User not found', details: `No user with ID ${staffRecord.user_id}` },
        { status: 404 }
      )
    }

    console.log('[API /letters/fetch-staff] ✅ Success - returning staff data')

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
    console.error('[API /letters/fetch-staff] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
