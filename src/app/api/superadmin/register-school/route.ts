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
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
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

    // Check if school email already exists
    const { data: existingSchool, error: checkError } = await supabaseAdmin
      .from('schools')
      .select('id, name')
      .eq('email', school_email)
      .maybeSingle()

    if (existingSchool) {
      return NextResponse.json(
        { 
          success: false, 
          message: `School with email ${school_email} already exists in the system`
        },
        { status: 400 }
      )
    }

    // Create school record - NO ON CONFLICT CLAUSE
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

    // CREATE SUPABASE AUTH USER FOR SCHOOL ADMIN
    let authUserId: string | null = null
    try {
      console.log('Creating Supabase Auth user for school admin:', admin_email)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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
        if (authError.message?.includes('already exists')) {
          console.warn('Auth user already exists:', admin_email)
          // Try to fetch existing user ID
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = users?.find(u => u.email === admin_email)
          if (existingUser) {
            authUserId = existingUser.id
          }
        } else {
          console.error('Auth creation error:', authError)
          throw new Error(`Failed to create auth user: ${authError.message}`)
        }
      } else {
        authUserId = authData?.user?.id || null
        console.log('Auth user created:', authUserId)
      }
    } catch (err: any) {
      console.error('Auth user creation failed:', err.message)
      console.warn('Continuing registration without auth user...')
    }

    // CREATE USERS TABLE RECORD - CRITICAL FOR LOGIN
    try {
      console.log(`Creating users table record for ${admin_email}...`)
      
      // First check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', admin_email)
        .maybeSingle()

      if (!existingUser) {
        // Use auth user ID if available, otherwise generate UUID
        const userId = authUserId || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
        
        // Create user record in users table
        const { data: newUser, error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            school_id: school.id,
            email: admin_email,
            full_name: admin_name,
            role: 'SCHOOL_ADMIN',
            status: 'ACTIVE',
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating user record:', insertError)
          throw new Error(`Failed to create user record: ${insertError.message}`)
        }

        console.log(`User record created successfully for ${admin_email}`)
      } else {
        console.log(`User record already exists for ${admin_email}`)
      }
    } catch (err: any) {
      console.error('User record creation failed:', err.message)
      // Don't fail school registration if user record fails
      console.warn('School created but user record creation failed')
    }

    console.log('School registration successful:', school.id)

    // AUTO-SEED SCHOOL WITH NIGERIAN CURRICULUM
    console.log('Starting auto-seeding of Nigerian curriculum...')
    const seedingResult = await seedSchoolCurriculum(school.id)
    
    if (!seedingResult.success) {
      console.warn('Seeding completed with warnings:', seedingResult.error)
    } else {
      console.log(`Seeding complete: ${seedingResult.classesCreated} classes, ${seedingResult.armsCreated} arms, ${seedingResult.subjectsCreated} subjects`)
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
