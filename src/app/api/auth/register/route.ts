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
