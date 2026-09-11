export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function DELETE(req: NextRequest) {
  try {
    const { staffId } = await req.json()

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 })
    }

    console.log('Attempting to delete staff with ID:', staffId)

    // Get the staff member - could be in teachers table or users table
    let staffMember: any = null
    let fromTable = 'unknown'

    // First try teachers table
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('user_id, full_name, id')
      .eq('id', staffId)
      .single()

    if (!teacherError && teacherData) {
      staffMember = teacherData
      fromTable = 'teachers'
      console.log('Found staff in teachers table')
    } else {
      // Try users table (staff might be registered as user only)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', staffId)
        .single()

      if (!userError && userData) {
        staffMember = userData
        fromTable = 'users'
        console.log('Found staff in users table')
      }
    }

    if (!staffMember) {
      console.error('Staff member not found with ID:', staffId)
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Delete from appropriate table
    if (fromTable === 'teachers') {
      const { error: deleteTeacherError } = await supabase
        .from('teachers')
        .delete()
        .eq('id', staffId)

      if (deleteTeacherError) {
        console.error('Error deleting from teachers table:', deleteTeacherError)
        return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
      }
    }

    // Delete from users table if it's the primary record
    if (staffMember.user_id || fromTable === 'users') {
      const userId = staffMember.user_id || staffMember.id
      
      // First delete the users record
      const { error: deleteUserRecordError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteUserRecordError) {
        console.error('Error deleting user record:', deleteUserRecordError)
      }

      // Then delete from auth
      try {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
          console.error('Warning: Error deleting auth user:', deleteAuthError)
          // Continue anyway - user record is already deleted
        }
      } catch (authErr) {
        console.error('Warning: Could not delete auth user:', authErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Staff member "${staffMember.full_name}" deleted successfully`,
      staffId,
    }, { status: 200 })
  } catch (err: any) {
    console.error('[DELETE STAFF] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
