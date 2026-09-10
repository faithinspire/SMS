import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Verify bucket configuration is correct
 * GET /api/system/verify-buckets
 */

export async function GET(request: NextRequest) {
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
    recommendations: [] as string[],
  }

  try {
    // Get all buckets
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()

    if (listError) {
      return NextResponse.json({
        error: `Failed to list buckets: ${listError.message}`,
      }, { status: 500 })
    }

    console.log('📦 Available buckets:', buckets?.map(b => b.name))

    // Check each bucket we care about
    for (const bucketName of ['student-documents', 'school-logos', 'lesson-notes']) {
      const bucket = buckets?.find(b => b.name === bucketName)

      if (!bucket) {
        results.buckets[bucketName] = {
          exists: false,
          public: false,
          error: 'Bucket not found',
        }
        results.recommendations.push(`❌ Bucket "${bucketName}" does not exist`)
      } else {
        results.buckets[bucketName] = {
          exists: true,
          public: bucket.public || false,
          file_size_limit: bucket.file_size_limit,
          created_at: bucket.created_at,
        }

        if (!bucket.public) {
          results.recommendations.push(
            `⚠️ Bucket "${bucketName}" is NOT public. Images won't display.`,
            `   Fix: Go to Supabase Dashboard → Storage → ${bucketName} → Edit → Set Public: ON`
          )
        } else {
          results.recommendations.push(`✅ Bucket "${bucketName}" is public`)
        }
      }

      // Try to list objects in the bucket
      if (bucket) {
        const { data: objects, error: listObjError } = await supabaseAdmin.storage
          .from(bucketName)
          .list('', { limit: 5 })

        if (listObjError) {
          console.error(`Error listing objects in ${bucketName}:`, listObjError.message)
          results.buckets[bucketName].list_error = listObjError.message
        } else {
          results.buckets[bucketName].file_count = objects?.length || 0
          if (objects && objects.length > 0) {
            results.buckets[bucketName].sample_files = objects.slice(0, 3).map(o => ({
              name: o.name,
              size: o.metadata?.size,
            }))
          }
        }
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 })
  }
}
