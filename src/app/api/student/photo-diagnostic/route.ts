import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { createClient } from '@supabase/supabase-js'

/**
 * DIAGNOSTIC ENDPOINT FOR PHOTO DISPLAY ISSUES
 * GET /api/student/photo-diagnostic
 * 
 * Checks:
 * 1. Whether storage bucket exists and is accessible
 * 2. Whether photo URLs are in correct format
 * 3. Whether specific student photos can be accessed
 * 4. RLS policy configuration
 * 5. Checks actual photo URLs stored in database
 * 6. Provides recommendations for fixes
 */

export async function GET(request: NextRequest) {
  // Create admin client for database queries
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
  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'checking',
    checks: {
      supabaseConfig: { status: 'unknown', details: '' },
      bucketExists: { status: 'unknown', details: '' },
      bucketPublic: { status: 'unknown', details: '' },
      bucketRLS: { status: 'unknown', details: '' },
      samplePhotoUrl: { status: 'unknown', details: '' },
      samplePhotoAccess: { status: 'unknown', details: '' },
      databasePhotoUrls: { status: 'unknown', details: '', samples: [] as any[] },
    },
    recommendations: [] as string[],
    solutions: [] as string[],
  }

  try {
    // Check 1: Supabase Configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      diagnostics.checks.supabaseConfig = {
        status: 'failed',
        details: 'Supabase URL or Anon Key missing from environment',
      }
      diagnostics.recommendations.push('Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return NextResponse.json(diagnostics, { status: 400 })
    }

    diagnostics.checks.supabaseConfig = {
      status: 'success',
      details: `URL: ${supabaseUrl.substring(0, 30)}...`,
    }

    // Check 2: List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      diagnostics.checks.bucketExists = {
        status: 'failed',
        details: `Failed to list buckets: ${listError.message}`,
      }
      diagnostics.recommendations.push('Verify Supabase project is active and API keys are correct')
      return NextResponse.json(diagnostics, { status: 400 })
    }

    // Check 3: Find student-documents bucket
    const studentDocumentsBucket = buckets?.find(b => b.name === 'student-documents')

    if (!studentDocumentsBucket) {
      diagnostics.checks.bucketExists = {
        status: 'failed',
        details: 'Bucket "student-documents" not found. Available buckets: ' + 
                buckets?.map(b => b.name).join(', '),
      }
      diagnostics.recommendations.push(
        '1. Go to Supabase Dashboard → Storage',
        '2. Click "New Bucket"',
        '3. Name it "student-documents"',
        '4. Set Public = ON',
        '5. Set Row Level Security = OFF'
      )
      diagnostics.solutions.push('CREATE_BUCKET_MANUALLY')
      return NextResponse.json(diagnostics, { status: 400 })
    }

    diagnostics.checks.bucketExists = {
      status: 'success',
      details: `Bucket found: ${studentDocumentsBucket.name}`,
    }

    // Check 4: Bucket public status
    if (!studentDocumentsBucket.public) {
      diagnostics.checks.bucketPublic = {
        status: 'failed',
        details: 'Bucket is PRIVATE. Public URLs will return 403 Forbidden.',
      }
      diagnostics.recommendations.push(
        'CRITICAL FIX: In Supabase Dashboard:',
        '1. Storage → student-documents',
        '2. Click Edit/Settings',
        '3. Set Public: ON',
        '4. Click Save'
      )
      diagnostics.solutions.push('SET_BUCKET_PUBLIC')
    } else {
      diagnostics.checks.bucketPublic = {
        status: 'success',
        details: 'Bucket is PUBLIC ✓',
      }
    }

    // Check 5: Try to list objects in bucket
    const { data: objects, error: listObjectsError } = await supabase.storage
      .from('student-documents')
      .list('student-photos', { limit: 5 })

    if (listObjectsError) {
      diagnostics.checks.bucketRLS = {
        status: 'warning',
        details: `Could not list objects: ${listObjectsError.message}. This might indicate RLS restrictions.`,
      }
      diagnostics.recommendations.push(
        'POSSIBLE RLS ISSUE:',
        'In Supabase Dashboard:',
        '1. Storage → student-documents',
        '2. Click Edit/Settings',
        '3. Set Row Level Security: OFF',
        '4. Click Save'
      )
      diagnostics.solutions.push('DISABLE_RLS_MASTER_SWITCH')
    } else {
      diagnostics.checks.bucketRLS = {
        status: 'success',
        details: `Can access bucket objects. Found ${objects?.length || 0} files in student-photos/`,
      }

      // Check 6: Sample photo access
      if (objects && objects.length > 0) {
        const sampleFile = objects[0]
        const samplePath = `student-photos/${sampleFile.name}`

        const { data: publicUrlData } = supabase.storage
          .from('student-documents')
          .getPublicUrl(samplePath)

        if (publicUrlData?.publicUrl) {
          diagnostics.checks.samplePhotoUrl = {
            status: 'success',
            details: `Generated public URL: ${publicUrlData.publicUrl.substring(0, 80)}...`,
          }

          // Try to fetch the URL
          try {
            const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' })
            if (response.ok) {
              diagnostics.checks.samplePhotoAccess = {
                status: 'success',
                details: `URL is accessible (HTTP ${response.status})`,
              }
            } else {
              diagnostics.checks.samplePhotoAccess = {
                status: 'failed',
                details: `URL returned HTTP ${response.status}. File may be private or missing.`,
              }
              diagnostics.solutions.push('CHECK_FILE_EXISTS')
            }
          } catch (error: any) {
            diagnostics.checks.samplePhotoAccess = {
              status: 'failed',
              details: `Could not fetch URL: ${error.message}`,
            }
            diagnostics.solutions.push('CHECK_CORS_HEADERS')
          }
        }
      }
    }

    // Summarize overall status
    const allPassed = Object.values(diagnostics.checks).every(check => check.status === 'success')
    diagnostics.status = allPassed ? 'success' : 'needs_attention'

    // Check 7: Query database for actual photo URLs
    try {
      console.log('🔍 Querying students table for photo URLs...')
      const { data: students, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id, admission_number, photo_url, user_id')
        .not('photo_url', 'is', null)
        .limit(10)

      if (studentsError) {
        console.error('❌ Student query error:', studentsError)
        diagnostics.checks.databasePhotoUrls = {
          status: 'failed',
          details: `Failed to query students table: ${studentsError.message}`,
          samples: [],
        }
      } else if (students && students.length > 0) {
        console.log(`✅ Found ${students.length} students with photos`)
        diagnostics.checks.databasePhotoUrls = {
          status: 'success',
          details: `Found ${students.length} students with photo_url set`,
          samples: students.map(s => ({
            admission_number: s.admission_number,
            photo_url: s.photo_url,
            urlIsValid: s.photo_url?.includes('supabase') && s.photo_url?.startsWith('https'),
            urlLength: s.photo_url?.length || 0,
          })),
        }

        // Check if any URLs are accessible
        for (const student of students.slice(0, 3)) {
          if (student.photo_url) {
            try {
              const headResponse = await fetch(student.photo_url, { method: 'HEAD', timeout: 5000 })
              console.log(`Photo URL check for ${student.admission_number}: ${headResponse.status}`)
            } catch (err: any) {
              console.log(`Photo URL check failed for ${student.admission_number}: ${err.message}`)
            }
          }
        }
      } else {
        console.log('ℹ️ No students with photo_url found')
        diagnostics.checks.databasePhotoUrls = {
          status: 'warning',
          details: 'No students found with photo_url set in database',
          samples: [],
        }
        diagnostics.recommendations.push('Upload a photo to test the system')
      }
    } catch (err: any) {
      console.error('❌ Database error:', err)
      diagnostics.checks.databasePhotoUrls = {
        status: 'failed',
        details: `Error querying database: ${err.message}`,
        samples: [],
      }
    }

    // Summarize overall status (updated)
    const allPassedFinal = Object.values(diagnostics.checks).every(
      check => check.status === 'success' || check.status === 'warning'
    )
    diagnostics.status = allPassedFinal ? 'success' : 'needs_attention'

    // Add final recommendations
    if (diagnostics.status === 'success') {
      diagnostics.recommendations.push('✅ Storage configuration looks correct!')
      diagnostics.recommendations.push('If photos still not showing: try hard refresh (Ctrl+Shift+R)')
      diagnostics.recommendations.push('Check browser console for specific error messages')
      diagnostics.recommendations.push(`Database shows ${diagnostics.checks.databasePhotoUrls.samples.length} photos stored`)
    } else {
      diagnostics.recommendations.push('Apply the solutions listed above in order')
    }

    return NextResponse.json(diagnostics, {
      status: allPassedFinal ? 200 : 400,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ...diagnostics,
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
