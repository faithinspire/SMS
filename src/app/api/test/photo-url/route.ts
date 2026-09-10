import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  // Query students with photos
  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('id, admission_number, photo_url, user_id')
    .not('photo_url', 'is', null)
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // List files in student-documents bucket
  const { data: objects, error: listError } = await supabase.storage
    .from('student-documents')
    .list('student-photos', { limit: 10 })

  return NextResponse.json({
    students_with_photos: students || [],
    storage_files: objects || [],
    list_error: listError?.message,
  })
}
