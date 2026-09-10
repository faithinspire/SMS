import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Check photo RLS and accessibility
 * GET /api/system/check-photo-rls
 * 
 * Verifies:
 * 1. Storage RLS is disabled
 * 2. Bucket is public
 * 3. Sample photo can be accessed
 * 4. Browser can load the URL
 */

export async function GET(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const result = {
    timestamp: new Date().toISOString(),
    status: 'checking',
    checks: {
      storage_rls_disabled: false,
      bucket_is_public: false,
      sample_photo_exists: false,
      sample_photo_accessible: false,
    },
    details: {} as Record<string, any>,
    recommendations: [] as string[],
  }

  try {
    // Check 1: Verify storage RLS is disabled
    console.log('🔍 Checking storage RLS status...')
    try {
      const { data: tableData, error: tableError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name, row_security_enabled')
        .in('table_name', ['objects', 'buckets'])
        .in('table_schema', ['storage'])

      if (!tableError && tableData) {
        const objectsTable = tableData.find((t: any) => t.table_name === 'objects')
        const bucketsTable = tableData.find((t: any) => t.table_name === 'buckets')

        result.checks.storage_rls_disabled = 
          objectsTable?.row_security_enabled === false && 
          bucketsTable?.row_security_enabled === false

        result.details.storage_tables = {
          objects: { rls_enabled: objectsTable?.row_security_enabled || null },
          buckets: { rls_enabled: bucketsTable?.row_security_enabled || null },
        }

        if (result.checks.storage_rls_disabled) {
          console.log('✅ Storage RLS is disabled')
        } else {
          console.log('⚠️ Storage RLS may still be enabled')
          result.recommendations.push('Run migration 063 to disable storage RLS')
        }
      }
    } catch (err: any) {
      console.log('ℹ️ Could not verify RLS status (may not have access):', err.message)
      result.details.rls_check_error = err.message
    }

    // Check 2: Verify bucket is public
    console.log('🔍 Checking bucket settings...')
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

    if (!bucketsError && buckets) {
      const studentDocsBucket = buckets.find(b => b.name === 'student-documents')
      
      if (studentDocsBucket) {
        result.checks.bucket_is_public = studentDocsBucket.public === true
        result.details.bucket = {
          name: studentDocsBucket.name,
          public: studentDocsBucket.public,
          created_at: studentDocsBucket.created_at,
        }

        if (result.checks.bucket_is_public) {
          console.log('✅ Bucket is public')
        } else {
          console.log('❌ Bucket is NOT public')
          result.recommendations.push('Set student-documents bucket to Public: ON')
        }
      }
    }

    // Check 3: Find sample photo
    console.log('🔍 Looking for sample photos...')
    const { data: photos, error: photosError } = await supabaseAdmin.storage
      .from('student-documents')
      .list('student-photos', { limit: 1 })

    if (!photosError && photos && photos.length > 0) {
      result.checks.sample_photo_exists = true
      const samplePhoto = photos[0]
      const photoPath = `student-photos/${samplePhoto.name}`

      result.details.sample_photo = {
        name: samplePhoto.name,
        size: samplePhoto.metadata?.size,
        created: samplePhoto.created_at,
      }

      console.log('✅ Sample photo found:', samplePhoto.name)

      // Check 4: Try to access the photo URL
      console.log('🔍 Testing photo URL accessibility...')
      try {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('student-documents')
          .getPublicUrl(photoPath)

        const publicUrl = publicUrlData?.publicUrl

        if (publicUrl) {
          result.details.public_url = publicUrl

          // Try to fetch it
          const response = await fetch(publicUrl, { method: 'HEAD', timeout: 10000 })
          result.checks.sample_photo_accessible = response.ok

          result.details.url_fetch = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          }

          if (response.ok) {
            console.log('✅ Photo URL is accessible (HTTP 200)')
          } else {
            console.log(`⚠️ Photo URL returned HTTP ${response.status}`)
            result.recommendations.push(`Photo URL returned HTTP ${response.status} - check RLS and bucket settings`)
          }
        }
      } catch (fetchErr: any) {
        console.log('⚠️ Could not test photo URL:', fetchErr.message)
        result.details.url_fetch_error = fetchErr.message
        result.recommendations.push('Check network connectivity and CORS settings')
      }
    } else {
      console.log('ℹ️ No sample photos found')
      result.recommendations.push('Upload a photo to test display')
    }

    // Determine overall status
    result.status = 
      result.checks.storage_rls_disabled &&
      result.checks.bucket_is_public &&
      result.checks.sample_photo_exists &&
      result.checks.sample_photo_accessible
        ? 'success'
        : 'needs_attention'

    // Final recommendations
    if (result.status === 'success') {
      result.recommendations.push('✅ All checks passed - photos should display')
    } else {
      result.recommendations.push('⚠️ Please address the issues above')
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('❌ Check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
