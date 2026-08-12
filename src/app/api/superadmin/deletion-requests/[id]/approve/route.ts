/**
 * API Endpoint: POST /api/superadmin/deletion-requests/[id]/approve
 * Super admin approves a deletion request
 * Marks request as approved, triggers eventual deletion
 * 
 * Authentication: Required
 * Authorization: SUPER_ADMIN only
 * 
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifySuperAdmin(token: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'SUPER_ADMIN') {
      return { authorized: false, error: 'Only super admins can approve deletions' };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function POST(
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
    const requestId = params.id;

    // Verify super admin
    const auth = await verifySuperAdmin(token);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    // Get deletion request
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('id, school_id, student_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !deletionRequest) {
      return NextResponse.json(
        { success: false, error: 'Deletion request not found' },
        { status: 404 }
      );
    }

    if (deletionRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Request is ${deletionRequest.status.toLowerCase()}, cannot approve` },
        { status: 400 }
      );
    }

    // Update deletion request to APPROVED
    const { error: updateError } = await supabase
      .from('deletion_requests')
      .update({
        status: 'APPROVED',
        approved_by: auth.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Get student info for audit
    const { data: student } = await supabase
      .from('students')
      .select('user:user_id(full_name)')
      .eq('id', deletionRequest.student_id)
      .single();

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: deletionRequest.school_id,
      user_id: auth.userId,
      action: 'APPROVE_DELETION_REQUEST',
      entity_type: 'DELETION_REQUEST',
      entity_id: requestId,
      new_values: {
        status: 'APPROVED',
        student_name: student?.user?.full_name,
      },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    // TODO: Send notification to requesting teacher
    // Example: Send email to teacher with approval notification

    return NextResponse.json(
      {
        success: true,
        message: `Deletion request approved. Student ${student?.user?.full_name || 'record'} can now be deleted.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving deletion request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve deletion request',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
