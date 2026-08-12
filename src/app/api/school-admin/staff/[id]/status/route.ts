/**
 * API Endpoint: PATCH /api/school-admin/staff/[id]/status
 * Updates staff member status
 * 
 * Authentication: Required
 * Authorization: SCHOOL_ADMIN only
 * 
 * Request: { status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED' }
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      return { authorized: false, error: 'Only school admins can update staff' };
    }

    if (userProfile.school_id !== schoolId) {
      return { authorized: false, error: 'You can only manage your own school staff' };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function PATCH(
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
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!['ACTIVE', 'PAUSED', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

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

    // Update staff status
    const { error: updateError } = await supabase
      .from('staff')
      .update({ status })
      .eq('id', staffId);

    if (updateError) throw updateError;

    // Also update corresponding user status
    await supabase
      .from('users')
      .update({ status })
      .eq('id', staff.user_id)
      .catch(err => console.error('Error updating user status:', err));

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: staff.school_id,
      user_id: auth.userId,
      action: 'UPDATE_STAFF_STATUS',
      entity_type: 'STAFF',
      entity_id: staffId,
      new_values: { status },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        success: true,
        message: `Staff member status updated to ${status}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating staff status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
