import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * SYSTEM INITIALIZATION ENDPOINT
 * POST /api/system/init-storage
 * 
 * Creates necessary storage buckets with proper configuration
 * Requires SUPABASE_SERVICE_KEY (server-only)
 */

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const results = {
    timestamp: new Date().toISOString(),
    status: 'initializing',
    buckets: {
      'student-documents': { status: 'checking', error: null as string | null },
      'lesson-notes': { status: 'checking', error: null as string | null },
      'school-logos': { status: 'checking', error: null as string | null },
    },
  }

  try {
    // Create student-documents bucket
    console.log('📦 Creating student-documents bucket...')
    try {
      const { data: createBucketData, error: createError } = await supabaseAdmin.storage.createBucket(
        'student-documents',
        {
          public: true,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        }
      )

      if (createError) {
        // Check if it's because bucket already exists
        if (createError.message?.includes('already exists')) {
          results.buckets['student-documents'] = {
            status: 'exists',
            error: null,
          }
          console.log('✅ student-documents bucket already exists')
        } else {
          results.buckets['student-documents'] = {
            status: 'failed',
            error: createError.message,
          }
          console.error('❌ Failed to create student-documents:', createError.message)
        }
      } else {
        results.buckets['student-documents'] = {
          status: 'created',
          error: null,
        }
        console.log('✅ Created student-documents bucket')
      }
    } catch (err: any) {
      results.buckets['student-documents'] = {
        status: 'failed',
        error: err.message,
      }
      console.error('❌ Exception creating student-documents:', err.message)
    }

    // Create lesson-notes bucket
    console.log('📦 Creating lesson-notes bucket...')
    try {
      const { data: createBucketData, error: createError } = await supabaseAdmin.storage.createBucket(
        'lesson-notes',
        {
          public: true,
          fileSizeLimit: 104857600, // 100MB
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        }
      )

      if (createError) {
        if (createError.message?.includes('already exists')) {
          results.buckets['lesson-notes'] = {
            status: 'exists',
            error: null,
          }
          console.log('✅ lesson-notes bucket already exists')
        } else {
          results.buckets['lesson-notes'] = {
            status: 'failed',
            error: createError.message,
          }
          console.error('❌ Failed to create lesson-notes:', createError.message)
        }
      } else {
        results.buckets['lesson-notes'] = {
          status: 'created',
          error: null,
        }
        console.log('✅ Created lesson-notes bucket')
      }
    } catch (err: any) {
      results.buckets['lesson-notes'] = {
        status: 'failed',
        error: err.message,
      }
      console.error('❌ Exception creating lesson-notes:', err.message)
    }

    // Create school-logos bucket
    console.log('📦 Creating school-logos bucket...')
    try {
      const { data: createBucketData, error: createError } = await supabaseAdmin.storage.createBucket(
        'school-logos',
        {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        }
      )

      if (createError) {
        if (createError.message?.includes('already exists')) {
          results.buckets['school-logos'] = {
            status: 'exists',
            error: null,
          }
          console.log('✅ school-logos bucket already exists')
        } else {
          results.buckets['school-logos'] = {
            status: 'failed',
            error: createError.message,
          }
        }
      } else {
        results.buckets['school-logos'] = {
          status: 'created',
          error: null,
        }
        console.log('✅ Created school-logos bucket')
      }
    } catch (err: any) {
      results.buckets['school-logos'] = {
        status: 'failed',
        error: err.message,
      }
    }

    // Determine overall status
    const allSuccess = Object.values(results.buckets).every(
      b => b.status === 'created' || b.status === 'exists'
    )
    results.status = allSuccess ? 'success' : 'partial_success'

    return NextResponse.json(results, {
      status: allSuccess ? 200 : 207,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
