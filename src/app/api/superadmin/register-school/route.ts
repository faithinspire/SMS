/**
 * API Endpoint: POST /api/superadmin/register-school
 * Registers a new school and auto-seeds it with Nigerian curriculum
 * 
 * Request Body:
 * {
 *   school_name: string
 *   school_email: string
 *   admin_email: string (for records)
 *   admin_password: string (for records only)
 *   admin_name: string
 *   phone: string
 *   address: string
 *   subscription_plan: string
 *   school_type?: 'PRIMARY' | 'SECONDARY' | 'BOTH'
 *   logo_url?: string
 * }
 * 
 * Response: { success, school_id, message, seeding }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { seedSchoolCurriculum } from '@/lib/school-seeding'
export const dynamic = 'force-dynamic'


// Create service client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json()
    const {
      school_name,
      school_email,
      admin_email,
      admin_password,
      admin_name,
      phone,
      address,
      subscription_plan,
      school_type = 'BOTH',
      logo_url,
    } = body

    // Validate required fields
    const missingFields = []
    if (!school_name) missingFields.push('school_name')
    if (!school_email) missingFields.push('school_email')
    if (!admin_email) missingFields.push('admin_email')
    if (!admin_password) missingFields.push('admin_password')
    if (!admin_name) missingFields.push('admin_name')
    if (!phone) missingFields.push('phone')
    if (!address) missingFields.push('address')
    if (!subscription_plan) missingFields.push('subscription_plan')

    if (missingFields.length > 0) {
      console.error('Missing fields:', missingFields)
      return NextResponse.json(
        { 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      )
    }

    console.log('Starting school registration for:', school_name)

    // Create school record WITH admin credentials
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: school_name,
        email: school_email,
        phone: phone,
        address: address,
        type: school_type,
        subscription_plan: subscription_plan,
        logo_url: logo_url || null,
        status: 'ACTIVE',
        admin_email: admin_email,
        admin_password: admin_password,
      })
      .select()
      .single()

    if (schoolError) {
      console.error('School creation error:', schoolError)
      console.error('Request body was:', body)
      
      // Handle specific constraint errors
      let errorMessage = schoolError.message
      if (schoolError.code === '23505') {
        // Unique constraint violation
        errorMessage = 'This email address is already registered in the system'
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          details: schoolError.details || schoolError.hint,
          code: schoolError.code
        },
        { status: 400 }
      )
    }

    console.log('School created:', school.id)

    // ðŸ” CREATE SUPABASE AUTH USER FOR SCHOOL ADMIN
    try {
      console.log('Creating Supabase Auth user for school admin:', admin_email)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true,
        user_metadata: {
          school_id: school.id,
          school_name: school_name,
          role: 'SCHOOL_ADMIN',
          full_name: admin_name,
        },
      })

      if (authError) {
        // If user already exists, that's okay - continue
        if (authError.message?.includes('already exists')) {
          console.warn('Auth user already exists:', admin_email)
        } else {
          console.error('Auth creation error:', authError)
          throw new Error(`Failed to create auth user: ${authError.message}`)
        }
      } else {
        console.log('âœ… Supabase Auth user created:', authUser?.user?.id)
      }
    } catch (err: any) {
      console.error('âŒ Auth user creation failed:', err.message)
      // Don't fail the entire registration if auth creation fails
      // The school is still created, but admin won't be able to login
      console.warn('Continuing registration without auth user...')
    }

    // CREATE USERS TABLE RECORD
    try {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', admin_email)
        .single()
        .catch(() => ({ data: null }))

      if (!existingUser) {
        // Create user record in users table
        await supabaseAdmin
          .from('users')
          .insert({
            school_id: school.id,
            email: admin_email,
            full_name: admin_name,
            role: 'SCHOOL_ADMIN',
            status: 'ACTIVE',
          })
          .catch(err => console.warn('Could not create user record:', err.message))
      }
    } catch (err) {
      console.warn('User record creation skipped:', err)
    }

    console.log('School registration successful:', school.id)

    // ðŸŒ± AUTO-SEED SCHOOL WITH NIGERIAN CURRICULUM
    console.log('Starting auto-seeding of Nigerian curriculum...')
    const seedingResult = await seedSchoolCurriculum(school.id)
    
    if (!seedingResult.success) {
      console.warn('Seeding completed with warnings:', seedingResult.error)
    } else {
      console.log(`âœ… Seeding complete: ${seedingResult.classesCreated} classes, ${seedingResult.armsCreated} arms, ${seedingResult.subjectsCreated} subjects`)
    }

    // Return success with school credentials and seeding info
    return NextResponse.json(
      {
        success: true,
        school_id: school.id,
        school_name: school.name,
        admin_email: admin_email,
        message: 'School registered successfully with Nigerian curriculum',
        seeding: seedingResult,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

