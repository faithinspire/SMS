/**
 * API Endpoint: POST /api/upload/school-logo
 * Handles school logo upload to Supabase Storage
 * 
 * Authentication: Required (Bearer token)
 * Authorization: SUPER_ADMIN or SCHOOL_ADMIN only
 * 
 * Request: FormData with 'file' field
 * Response: { success, file_url, thumbnail_url, storage_path }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadFile } from '@/lib/file-upload';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Authorization middleware - verify user is SUPER_ADMIN or SCHOOL_ADMIN
async function authorizeUser(token: string, schoolId: string) {
  try {
    // Get current user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized: Invalid token' };
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { authorized: false, error: 'User profile not found' };
    }

    // Check authorization
    if (userProfile.role === 'SUPER_ADMIN') {
      return { authorized: true, user: userProfile };
    }

    if (userProfile.role === 'SCHOOL_ADMIN' && userProfile.school_id === schoolId) {
      return { authorized: true, user: userProfile };
    }

    return { 
      authorized: false, 
      error: 'Forbidden: Insufficient permissions to upload school logos' 
    };
  } catch (error) {
    return { 
      authorized: false, 
      error: error instanceof Error ? error.message : 'Authorization failed' 
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolId = formData.get('school_id') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'school_id is required' },
        { status: 400 }
      );
    }

    // Authorize user
    const auth = await authorizeUser(token, schoolId);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Could not identify user' },
        { status: 401 }
      );
    }

    // Upload file
    const result = await uploadFile(
      file,
      'SCHOOL_LOGO',
      schoolId,
      user.id,
      'SCHOOL',
      schoolId
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      );
    }

    // Update schools table with new logo URL
    const { error: updateError } = await supabase
      .from('schools')
      .update({ logo_url: result.file_url })
      .eq('id', schoolId);

    if (updateError) {
      console.error('Error updating school logo URL:', updateError);
      // Don't fail - file was uploaded successfully
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      school_id: schoolId,
      user_id: user.id,
      action: 'UPLOAD_SCHOOL_LOGO',
      entity_type: 'FILE',
      entity_id: schoolId,
      new_values: {
        file_url: result.file_url,
        file_name: file.name,
        file_size: file.size,
      },
      status: 'SUCCESS',
    }).catch(error => console.error('Audit log failed:', error));

    return NextResponse.json(
      {
        success: true,
        file_url: result.file_url,
        thumbnail_url: result.thumbnail_url,
        storage_path: result.storage_path,
        message: 'School logo uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('School logo upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload school logo',
      },
      { status: 500 }
    );
  }
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
