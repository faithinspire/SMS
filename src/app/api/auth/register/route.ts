import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key for bypassing auth restrictions
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

interface RegisterRequest {
  email: string
  password: string
  full_name: string
  role: string
  school_id: string
  user_type: string
}

/**
 * Server-side user registration
 * Uses admin client to bypass email validation restrictions
 * Handles existing users gracefully
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()

    // Validate required fields
    if (!body.email || !body.password || !body.full_name || !body.school_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Normalize email
    const email = body.email.trim().toLowerCase()

    console.log('[Auth Register] Creating user:', { email, role: body.role })

    // ✅ CHECK IF USER ALREADY EXISTS
    console.log('[Auth Register] Checking if user exists:', email)
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    let existingUser = null
    if (!listError && existingUsers) {
      existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email)
    }

    // If user already exists, return their data instead of failing
    if (existingUser) {
      console.log('[Auth Register] User already exists:', existingUser.id)
      return NextResponse.json(
        {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: body.role,
            message: 'User already exists - using existing account',
          },
        },
        { status: 200 } // 200 OK because we're returning valid user data
      )
    }

    // Use admin API to create user (bypasses email validation)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: body.full_name,
        role: body.role,
        school_id: body.school_id,
        user_type: body.user_type,
      },
    })

    if (error) {
      console.error('[Auth Register] Error:', error)
      return NextResponse.json(
        { error: `Registration failed: ${error.message}` },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User creation returned no data' },
        { status: 400 }
      )
    }

    console.log('[Auth Register] User created successfully:', data.user.id)

    return NextResponse.json(
      {
        user: {
          id: data.user.id,
          email: data.user.email,
          role: body.role,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Auth Register] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
