export const dynamic = 'force-dynamic';
/**
 * API Endpoint: DELETE /api/school-admin/staff/[id]/delete
 * Deletes a staff member
 * 
 * Authentication: Required
 * Authorization: SCHOOL_ADMIN only
 * 
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

const supabase = createClient();

async function verifySchoolAdmin(token: string, schoolId: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { authorized: false, error: 'User not found' };
    }

    if (userProfile.role !== 'SCHOOL_ADMIN') {
      return { authorized: false, error: 'Only school admins can delete staff' };
    }

    if (userProfile.school_id !== schoolId) {
      return { authorized: false, error: 'You can only manage your own school staff' };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const staffId = params.id;

    // Get staff and verify school
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, school_id, user_id')
      .eq('id', staffId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Verify authorization
    const auth = await verifySchoolAdmin(token, staff.school_id);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    // Get staff name for audit
    const { data: staffUser } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', staff.user_id)
      .single();

    // Delete staff record (will cascade to related data)
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (deleteError) throw deleteError;

    // Also delete the user record
    await supabase
      .from('users')
      .delete()
      .eq('id', staff.user_id)
      .catch(err => console.error('Error deleting user:', err));

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: staff.school_id,
      user_id: auth.userId,
      action: 'DELETE_STAFF',
      entity_type: 'STAFF',
      entity_id: staffId,
      old_values: { name: staffUser?.full_name },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        success: true,
        message: `Staff member ${staffUser?.full_name || 'deleted'} successfully removed`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete staff',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
