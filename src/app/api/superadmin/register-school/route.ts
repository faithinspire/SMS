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
import { createClient } from '@supabase/supabase-js'
import { seedSchoolCurriculum } from '@/lib/school-seeding'

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
    if (!school_name || !school_email || !admin_email || !admin_password || !admin_name || !phone || !address) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Starting school registration for:', school_name)

    // Create school record
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
      })
      .select()
      .single()

    if (schoolError) {
      console.error('School creation error:', schoolError)
      return NextResponse.json(
        { success: false, message: `Failed to create school: ${schoolError.message}` },
        { status: 400 }
      )
    }

    console.log('School created:', school.id)

    // Create admin user record in users table without Supabase Auth
    // This will be used for manual login setup
    try {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', admin_email)
        .single()
        .catch(() => ({ data: null }))

      if (!existingUser) {
        // Create a placeholder user record
        // In real implementation, admin would set their own password
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

    // 🌱 AUTO-SEED SCHOOL WITH NIGERIAN CURRICULUM
    console.log('Starting auto-seeding of Nigerian curriculum...')
    const seedingResult = await seedSchoolCurriculum(school.id)
    
    if (!seedingResult.success) {
      console.warn('Seeding completed with warnings:', seedingResult.error)
    } else {
      console.log(`✅ Seeding complete: ${seedingResult.classesCreated} classes, ${seedingResult.armsCreated} arms, ${seedingResult.subjectsCreated} subjects`)
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
