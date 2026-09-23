import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/schools/delete
 * Deletes a school and all associated data (cascading delete)
 * 
 * REQUEST BODY:
 * {
 *   school_id: UUID (required)
 * }
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   message: string,
 *   deleted_school_id: UUID
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[SchoolDelete] ===== START =====')

    const body = await request.json()
    const { school_id: schoolId } = body

    if (!schoolId) {
      console.log('[SchoolDelete] ❌ Validation failed: missing school_id')
      return NextResponse.json(
        { error: 'Missing required field: school_id' },
        { status: 400 }
      )
    }

    console.log('[SchoolDelete] ✅ Input validated:', { schoolId })

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[SchoolDelete] ❌ Missing Supabase env vars')
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('[SchoolDelete] ✅ Supabase client created')

    // Verify school exists before deleting
    console.log('[SchoolDelete] Verifying school exists...')
    const { data: schoolCheck, error: checkError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .single()

    if (checkError || !schoolCheck) {
      console.log('[SchoolDelete] ❌ School not found:', schoolId)
      return NextResponse.json(
        { error: 'School not found', details: checkError?.message },
        { status: 404 }
      )
    }

    const schoolName = schoolCheck.name
    console.log('[SchoolDelete] ✅ School found:', schoolName)

    // Delete the school (cascading delete will handle all related data)
    console.log('[SchoolDelete] Deleting school and all related data...')
    const { error: deleteError } = await supabase
      .from('schools')
      .delete()
      .eq('id', schoolId)

    if (deleteError) {
      console.error('[SchoolDelete] ❌ Delete failed')
      console.error('  Error code:', deleteError.code)
      console.error('  Error message:', deleteError.message)
      console.error('  Error details:', (deleteError as any).details)
      return NextResponse.json(
        { error: 'Failed to delete school', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('[SchoolDelete] ✅ School deleted successfully')
    console.log('[SchoolDelete] ===== SUCCESS =====')

    return NextResponse.json({
      success: true,
      message: `School "${schoolName}" and all associated data have been deleted`,
      deleted_school_id: schoolId,
    })
  } catch (error: any) {
    console.error('[SchoolDelete] ❌ ===== EXCEPTION =====')
    console.error('[SchoolDelete] Error type:', error.constructor.name)
    console.error('[SchoolDelete] Error message:', error.message)
    console.error('[SchoolDelete] Error stack:', error.stack)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
