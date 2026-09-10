import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * FIX BUCKET PERMISSIONS - Make buckets PUBLIC
 * POST /api/system/fix-bucket-public
 * 
 * This endpoint uses the service role to update bucket settings
 * to make them publicly accessible
 */

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const results = {
    timestamp: new Date().toISOString(),
    buckets: {} as Record<string, any>,
  }

  try {
    // Update each bucket to be public
    for (const bucketName of ['student-documents', 'school-logos', 'lesson-notes']) {
      try {
        console.log(`🔓 Setting ${bucketName} to public...`)
        
        // Update bucket to be public
        const { data: updateData, error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
          public: true,
        })

        if (updateError) {
          results.buckets[bucketName] = {
            status: 'failed',
            error: updateError.message,
          }
          console.error(`❌ Failed to update ${bucketName}:`, updateError.message)
        } else {
          results.buckets[bucketName] = {
            status: 'success',
            message: `✅ ${bucketName} is now public`,
          }
          console.log(`✅ ${bucketName} updated to public`)
        }
      } catch (err: any) {
        results.buckets[bucketName] = {
          status: 'error',
          error: err.message,
        }
        console.error(`❌ Exception updating ${bucketName}:`, err.message)
      }
    }

    // Verify the changes
    console.log('🔍 Verifying bucket settings...')
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()

    if (listError) {
      console.error('Failed to verify buckets:', listError.message)
    } else {
      for (const bucket of buckets || []) {
        if (['student-documents', 'school-logos', 'lesson-notes'].includes(bucket.name)) {
          console.log(`  ${bucket.name}: public=${bucket.public}`)
          if (results.buckets[bucket.name]) {
            results.buckets[bucket.name].verified_public = bucket.public
          }
        }
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Fatal error:', error)
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
