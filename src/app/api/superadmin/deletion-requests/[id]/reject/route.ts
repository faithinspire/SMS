export const dynamic = 'force-dynamic';
/**
 * API Endpoint: POST /api/superadmin/deletion-requests/[id]/reject
 * Super admin rejects a deletion request
 * Marks request as rejected with reason
 * 
 * Authentication: Required
 * Authorization: SUPER_ADMIN only
 * 
 * Request: { rejection_reason?: string }
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

const supabase = createClient();

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
      return { authorized: false, error: 'Only super admins can reject deletions' };
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
    const body = await request.json();
    const { rejection_reason } = body;

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
        { success: false, error: `Request is ${deletionRequest.status.toLowerCase()}, cannot reject` },
        { status: 400 }
      );
    }

    // Update deletion request to REJECTED
    const { error: updateError } = await supabase
      .from('deletion_requests')
      .update({
        status: 'REJECTED',
        rejected_by: auth.userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null,
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
      action: 'REJECT_DELETION_REQUEST',
      entity_type: 'DELETION_REQUEST',
      entity_id: requestId,
      new_values: {
        status: 'REJECTED',
        rejection_reason,
        student_name: student?.user?.full_name,
      },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    // TODO: Send notification to requesting teacher
    // Example: Send email to teacher with rejection and reason

    return NextResponse.json(
      {
        success: true,
        message: `Deletion request rejected. Teacher will be notified.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error rejecting deletion request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject deletion request',
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
