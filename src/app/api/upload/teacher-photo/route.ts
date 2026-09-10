import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


/**
 * PHOTO UPLOAD BYPASS ENDPOINT
 * Uses service role key to bypass RLS on storage bucket
 * Only accessible from backend (Node.js context)
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const schoolId = formData.get('schoolId') as string
    const teacherId = formData.get('teacherId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!schoolId || !teacherId) {
      return NextResponse.json({ error: 'Missing schoolId or teacherId' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${teacherId}-${timestamp}.${fileExt}`
    const filePath = `teacher-photos/${schoolId}/${fileName}`

    console.log('ðŸ“¤ Uploading teacher photo via admin key:', filePath)

    // Upload using service role key (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('student-documents')
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('âŒ Upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    console.log('âœ… Photo uploaded successfully')

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('student-documents')
      .getPublicUrl(filePath)

    console.log('âœ… Photo public URL:', publicUrl)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
    })
  } catch (error: any) {
    console.error('âŒ Upload endpoint error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

