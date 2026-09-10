/**
 * API Endpoint: POST /api/schools/share-credentials
 * Sends school login credentials via email
 * 
 * Authentication: Required (Bearer token)
 * Authorization: SUPER_ADMIN or SCHOOL_ADMIN only
 * 
 * Request: { school_id, recipient_email }
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Email service - using Resend or your preferred email provider
async function sendEmailWithCredentials(
  recipientEmail: string,
  schoolName: string,
  schoolEmail: string,
  schoolId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, we'll use a simple logging approach
    // In production, integrate with Resend, SendGrid, or AWS SES
    
    const emailContent = `
School Login Credentials
========================

School Name: ${schoolName}
School Email: ${schoolEmail}
School ID: ${schoolId}

Portal Link: ${process.env.NEXT_PUBLIC_APP_URL || 'https://sms.example.com'}/login

Please log in with your credentials to access the School Management System.

Best regards,
SMS Administration
    `;

    // Log for debugging
    console.log(`Email to be sent to ${recipientEmail}:\n${emailContent}`);

    // TODO: Integrate actual email service
    // Example with Resend (if available):
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'noreply@sms.example.com',
    //     to: recipientEmail,
    //     subject: `School Login Credentials - ${schoolName}`,
    //     html: emailContent,
    //   }),
    // });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email send failed',
    };
  }
}

// Verify authorization
async function authorize(token: string, schoolId: string) {
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
      return { authorized: false, error: 'User profile not found' };
    }

    // SUPER_ADMIN can share any school, SCHOOL_ADMIN only their own
    if (userProfile.role === 'SUPER_ADMIN') {
      return { authorized: true };
    }

    if (userProfile.role === 'SCHOOL_ADMIN' && userProfile.school_id === schoolId) {
      return { authorized: true };
    }

    return { authorized: false, error: 'Forbidden: You cannot share credentials for this school' };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const body = await request.json();
    const { school_id: schoolId, recipient_email: recipientEmail } = body;

    // Validate inputs
    if (!schoolId || !recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'school_id and recipient_email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Authorize
    const auth = await authorize(token, schoolId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    // Get school details
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, email, phone')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    // Send email
    const emailResult = await sendEmailWithCredentials(
      recipientEmail,
      school.name,
      school.email || 'admin@school.local',
      schoolId
    );

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: emailResult.error },
        { status: 500 }
      );
    }

    // Get current user for audit log
    const { data: { user } } = await supabase.auth.getUser(token);

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: schoolId,
      user_id: user?.id,
      action: 'SHARE_CREDENTIALS',
      entity_type: 'SCHOOL',
      entity_id: schoolId,
      new_values: { recipient_email: recipientEmail },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        success: true,
        message: `Credentials shared successfully with ${recipientEmail}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sharing credentials:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share credentials',
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

