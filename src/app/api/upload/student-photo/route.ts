/**
 * API Endpoint: POST /api/upload/student-photo
 * Handles student photo upload to Supabase Storage
 * 
 * Authentication: Required (Bearer token)
 * Authorization: SCHOOL_ADMIN, TEACHER, or STUDENT (own photo only)
 * 
 * Request: FormData with 'file' and 'student_id' fields
 * Response: { success, file_url, thumbnail_url, storage_path }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';
import { uploadFile } from '@/lib/file-upload';
export const dynamic = 'force-dynamic'


const supabase = createClient();

// Authorization middleware
async function authorizeUser(token: string, schoolId: string, studentId: string) {
  try {
    // Get current user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized: Invalid token' };
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { authorized: false, error: 'User profile not found' };
    }

    // Check if user belongs to this school
    if (userProfile.school_id !== schoolId) {
      return { authorized: false, error: 'User does not belong to this school' };
    }

    // Authorization rules:
    // 1. SCHOOL_ADMIN can upload for any student
    if (userProfile.role === 'SCHOOL_ADMIN') {
      return { authorized: true, user: userProfile };
    }

    // 2. TEACHER can upload for students in their classes
    if (userProfile.role === 'TEACHER') {
      // Verify student exists in teacher's school and get their user_id
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('user_id, school_id')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return { authorized: false, error: 'Student not found' };
      }

      if (student.school_id !== schoolId) {
        return { authorized: false, error: 'Student not in your school' };
      }

      return { authorized: true, user: userProfile };
    }

    // 3. STUDENT can only upload their own photo
    if (userProfile.role === 'STUDENT') {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('user_id, school_id')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return { authorized: false, error: 'Student not found' };
      }

      // Verify it's the same student
      if (student.user_id !== user.id) {
        return { 
          authorized: false, 
          error: 'Students can only upload their own photo' 
        };
      }

      if (student.school_id !== schoolId) {
        return { authorized: false, error: 'Student not in your school' };
      }

      return { authorized: true, user: userProfile };
    }

    return { 
      authorized: false, 
      error: 'Forbidden: Your role cannot upload student photos' 
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
    const studentId = formData.get('student_id') as string;

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

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' },
        { status: 400 }
      );
    }

    // Authorize user
    const auth = await authorizeUser(token, schoolId, studentId);
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
      'STUDENT_PHOTO',
      schoolId,
      user.id,
      'STUDENT',
      studentId
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

    // Update students table with photo URL
    const { error: updateError } = await supabase
      .from('students')
      .update({ photo_url: result.file_url })
      .eq('id', studentId);

    if (updateError) {
      console.error('Error updating student photo URL:', updateError);
      // Don't fail - file was uploaded successfully
    }

    // Also update user profile photo if it's the student uploading for themselves
    const { data: student } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', studentId)
      .single();

    if (student && student.user_id === user.id) {
      await supabase
        .from('users')
        .update({ photo_url: result.file_url })
        .eq('id', student.user_id)
        .catch(error => console.error('Error updating user photo:', error));
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      school_id: schoolId,
      user_id: user.id,
      action: 'UPLOAD_STUDENT_PHOTO',
      entity_type: 'FILE',
      entity_id: studentId,
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
        message: 'Student photo uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Student photo upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload student photo',
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

