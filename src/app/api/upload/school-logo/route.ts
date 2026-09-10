/**
 * API Endpoint: POST /api/upload/school-logo
 * Handles school logo upload to Supabase Storage
 * 
 * Authentication: Required (Bearer token)
 * Authorization: SUPER_ADMIN or SCHOOL_ADMIN only
 * 
 * Request: FormData with 'file' and 'school_id' fields
 * Response: { success, file_url, message }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const schoolId = formData.get('school_id') as string

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    if (!schoolId) {
      return NextResponse.json(
        { success: false, message: 'No school_id provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File must be less than 5MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate filename
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `${schoolId}-logo-${Date.now()}.${ext}`
    const storagePath = `school-logos/${fileName}`

    console.log('Uploading logo to:', storagePath)

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('school-files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { success: false, message: `Upload failed: ${error.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicData } = supabaseAdmin.storage
      .from('school-files')
      .getPublicUrl(storagePath)

    const fileUrl = publicData.publicUrl

    console.log('Logo uploaded successfully:', fileUrl)

    return NextResponse.json(
      {
        success: true,
        file_url: fileUrl,
        message: 'Logo uploaded successfully',
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('School logo upload error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
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
  )
}

