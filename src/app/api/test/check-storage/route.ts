import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface StorageCheckResult {
  status: 'success' | 'error'
  buckets: Array<{
    name: string
    public: boolean
    rls_enabled?: boolean
    policies_count?: number
  }>
  errors: string[]
  recommendations: string[]
  note: string
}

export async function GET(request: NextRequest): Promise<NextResponse<StorageCheckResult>> {
  const result: StorageCheckResult = {
    status: 'success',
    buckets: [],
    errors: [],
    recommendations: [],
    note: 'Use this to diagnose Supabase Storage configuration',
  }

  try {
    // List all buckets
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()

    if (listError) {
      result.errors.push(`Failed to list buckets: ${listError.message}`)
      result.status = 'error'
      return NextResponse.json(result, { status: 500 })
    }

    if (!buckets || buckets.length === 0) {
      result.errors.push('No storage buckets found')
      result.recommendations.push('Create a storage bucket named "student-documents"')
      result.status = 'error'
      return NextResponse.json(result, { status: 200 })
    }

    // Check each bucket
    for (const bucket of buckets) {
      const bucketInfo: (typeof result.buckets)[0] = {
        name: bucket.name,
        public: bucket.public || false,
      }

      result.buckets.push(bucketInfo)

      // Special check for student-documents bucket
      if (bucket.name === 'student-documents') {
        if (!bucket.public) {
          result.errors.push('❌ student-documents bucket is PRIVATE (public: false)')
          result.recommendations.push('Make the bucket PUBLIC in Supabase Dashboard')
        } else {
          result.recommendations.push('✅ student-documents bucket is PUBLIC')
        }
      }
    }

    // Check for student-documents bucket specifically
    const hasStudentDocuments = buckets.some(b => b.name === 'student-documents')
    if (!hasStudentDocuments) {
      result.errors.push('❌ "student-documents" bucket does NOT exist')
      result.recommendations.push('Create a new bucket named "student-documents" in Supabase')
      result.recommendations.push('Set it to PUBLIC')
      result.recommendations.push('Disable RLS on the bucket')
    }

    // Final status
    if (result.errors.length > 0) {
      result.status = 'error'
    }
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`)
    result.status = 'error'
  }

  // Add general recommendations
  if (result.status === 'success' && result.buckets.length > 0) {
    result.recommendations.push('✅ Storage configuration looks correct')
    result.recommendations.push('If uploads still fail, check RLS policies in Supabase Dashboard')
    result.recommendations.push('For student photos, ensure: Public=YES, RLS=NO')
  }

  return NextResponse.json(result, {
    status: result.status === 'success' ? 200 : 500,
  })
}
