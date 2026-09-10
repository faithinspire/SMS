import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


/**
 * Server-side photo upload endpoint
 * Bypasses client-side RLS issues by using service role
 * 
 * POST /api/student/upload-photo
 * 
 * Request (multipart/form-data):
 *   - file: File object
 *   - student_id: UUID
 *   - school_id: UUID
 * 
 * Response:
 *   - success: boolean
 *   - photo_url: string (public URL)
 *   - error?: string
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const student_id = formData.get('student_id') as string | null
    const school_id = formData.get('school_id') as string | null

    // Validate inputs
    if (!file || !student_id || !school_id) {
      return NextResponse.json(
        { error: 'Missing file, student_id, or school_id' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be less than 5MB' },
        { status: 400 }
      )
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // Generate filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `${student_id}-${timestamp}.${fileExt}`
    const filePath = `student-photos/${school_id}/${fileName}`

    console.log(`ðŸ“¸ Server: Uploading photo for student ${student_id}`)
    console.log(`   Path: ${filePath}`)
    console.log(`   Size: ${file.size} bytes`)

    // Convert file to buffer
    const buffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(buffer)

    // Upload using service role (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('student-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error('âŒ Upload failed:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('âœ… File uploaded successfully')

    // Generate public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('student-documents')
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData?.publicUrl

    if (!publicUrl) {
      console.error('âŒ Failed to generate public URL')
      return NextResponse.json(
        { error: 'Failed to generate public URL' },
        { status: 500 }
      )
    }

    console.log('âœ… Public URL generated:', publicUrl.substring(0, 80) + '...')

    // Update student record with photo URL using service role
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('students')
      .update({ photo_url: publicUrl })
      .eq('id', student_id)

    if (updateError) {
      console.error('âŒ Database update failed:', updateError)
      return NextResponse.json(
        { error: `Database update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('âœ… Database updated with photo URL')

    return NextResponse.json(
      {
        success: true,
        photo_url: publicUrl,
        message: 'Photo uploaded successfully',
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('âŒ Server error:', error)
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    )
  }
}

