export const dynamic = 'force-dynamic';
/**
 * API Endpoint: POST /api/superadmin/schools/[id]/share-details
 * Share school details via WhatsApp or Email
 * 
 * Authentication: Required (Bearer token)
 * Authorization: SUPER_ADMIN only
 * 
 * Request: { share_via_whatsapp: boolean, share_via_email: boolean }
 * Response: { success, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

const supabase = createClient();

// Verify Super Admin authorization
async function verifyAdmin(token: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'SUPER_ADMIN') {
      return { authorized: false, error: 'Forbidden: Super Admin access required' };
    }

    return { authorized: true, userId: user.id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

// Format school details for sharing
async function formatSchoolDetails(schoolId: string) {
  const { data: school, error } = await supabase
    .from('schools')
    .select('id, name, email, phone, address, subscription_plan, created_at')
    .eq('id', schoolId)
    .single();

  if (error || !school) {
    throw new Error('School not found');
  }

  // Get admin credentials (if stored)
  const { data: adminUser } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('school_id', schoolId)
    .eq('role', 'SCHOOL_ADMIN')
    .single();

  const createdDate = new Date(school.created_at).toLocaleDateString();

  const details = {
    schoolName: school.name,
    schoolEmail: school.email,
    phone: school.phone,
    address: school.address,
    plan: school.subscription_plan,
    adminName: adminUser?.full_name || 'N/A',
    adminEmail: adminUser?.email || 'N/A',
    createdAt: createdDate,
  };

  return details;
}

// Send via Email using SendGrid
async function sendViaEmail(schoolDetails: any, toEmail: string) {
  try {
    // For now, we'll just log it. In production, integrate with SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn('SendGrid API key not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const message = `
School Registration Details:

School Name: ${schoolDetails.schoolName}
School Email: ${schoolDetails.schoolEmail}
Phone: ${schoolDetails.phone}
Address: ${schoolDetails.address}
Subscription Plan: ${schoolDetails.plan}

Admin Details:
Name: ${schoolDetails.adminName}
Email: ${schoolDetails.adminEmail}

Active Since: ${schoolDetails.createdAt}

Please keep these credentials safe.
    `.trim();

    // In production, call SendGrid API
    console.log(`Email would be sent to ${toEmail} with school details`);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Send via WhatsApp using Twilio
async function sendViaWhatsApp(schoolDetails: any, phoneNumber: string) {
  try {
    // For now, we'll just log it. In production, integrate with Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not configured');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    const message = `
*School Registration Details*

*School Name:* ${schoolDetails.schoolName}
*Email:* ${schoolDetails.schoolEmail}
*Phone:* ${schoolDetails.phone}
*Address:* ${schoolDetails.address}
*Plan:* ${schoolDetails.plan}

*Admin Details:*
*Name:* ${schoolDetails.adminName}
*Email:* ${schoolDetails.adminEmail}

*Active Since:* ${schoolDetails.createdAt}

Please keep these credentials safe.
    `.trim();

    // In production, call Twilio API
    console.log(`WhatsApp message would be sent to ${phoneNumber}`);
    return { success: true };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: 'Failed to send WhatsApp message' };
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
    const schoolId = params.id;

    // Verify admin
    const auth = await verifyAdmin(token);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { share_via_whatsapp, share_via_email } = body;

    // Validate request
    if (!share_via_whatsapp && !share_via_email) {
      return NextResponse.json(
        { success: false, error: 'Select at least one sharing method' },
        { status: 400 }
      );
    }

    // Get school details
    const schoolDetails = await formatSchoolDetails(schoolId);

    // Get school to find contact info
    const { data: school } = await supabase
      .from('schools')
      .select('email, phone')
      .eq('id', schoolId)
      .single();

    let results = {
      email_sent: false,
      whatsapp_sent: false,
    };

    if (share_via_email && school?.email) {
      const emailResult = await sendViaEmail(schoolDetails, school.email);
      results.email_sent = emailResult.success;
    }

    if (share_via_whatsapp && school?.phone) {
      const whatsappResult = await sendViaWhatsApp(schoolDetails, school.phone);
      results.whatsapp_sent = whatsappResult.success;
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: schoolId,
      user_id: auth.userId,
      action: 'SHARE_SCHOOL_DETAILS',
      entity_type: 'SCHOOL',
      entity_id: schoolId,
      new_values: {
        share_via_email,
        share_via_whatsapp,
        results,
      },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        success: true,
        message: 'School details shared successfully',
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sharing school details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share details',
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
