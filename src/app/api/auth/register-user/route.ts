import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side Supabase client with service role (can create users)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This has admin privileges
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, schoolId, accountType } = body

    // Validate inputs
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    console.log(`[AuthAPI] Creating Supabase Auth user for ${accountType}: ${email}`)

    // Step 1: Create Supabase Auth user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true, // Auto-confirm email to allow immediate login
      user_metadata: {
        name: name,
        role: role || 'STAFF',
        school_id: schoolId,
        account_type: accountType,
      },
    })

    if (authError) {
      console.error(`[AuthAPI] Error creating auth user: ${authError.message}`)
      
      // Check if user already exists
      if (authError.message?.includes('User already registered')) {
        return NextResponse.json(
          { error: `User with email ${email} already exists` },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create auth user' },
        { status: 400 }
      )
    }

    console.log(`[AuthAPI] Supabase Auth user created: ${authData.user.id}`)

    // Step 2: Return the auth user ID so registration can use it
    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: `Auth account created for ${email}`,
    })
  } catch (error: any) {
    console.error('[AuthAPI] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to register user' },
      { status: 500 }
    )
  }
}
