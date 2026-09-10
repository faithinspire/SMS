import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function DELETE(req: NextRequest) {
  try {
    const { staffId } = await req.json()

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 })
    }

    // First, get the staff member's user_id
    const { data: staffMember, error: staffError } = await supabase
      .from('teachers')
      .select('user_id, full_name')
      .eq('id', staffId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Delete from teachers table
    const { error: deleteTeacherError } = await supabase
      .from('teachers')
      .delete()
      .eq('id', staffId)

    if (deleteTeacherError) {
      console.error('Error deleting teacher:', deleteTeacherError)
      return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
    }

    // Delete the associated user from auth
    if (staffMember.user_id) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(staffMember.user_id)
      
      if (deleteUserError) {
        console.error('Error deleting user:', deleteUserError)
        // Still return success as teacher record was deleted
        return NextResponse.json({ 
          success: true, 
          message: `Staff member "${staffMember.full_name}" deleted successfully (user account deletion had issues but record removed)`,
          staffId 
        }, { status: 200 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Staff member "${staffMember.full_name}" deleted successfully`,
      staffId 
    }, { status: 200 })
  } catch (err: any) {
    console.error('[DELETE STAFF] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
