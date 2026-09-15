/**
 * POST /api/auth/register
 * Backend auth registration route - uses service role key to bypass RLS
 * Creates user in Supabase Auth
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, role, school_id, user_type } = await request.json()

    // Validate inputs
    if (!email || !password || !full_name || !role || !school_id) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, full_name, role, school_id' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Validate school_id is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(school_id)) {
      return NextResponse.json(
        { error: 'Invalid school_id format' },
        { status: 400 }
      )
    }

    // Get credentials - SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Missing Supabase credentials:', {
        url: !!supabaseUrl,
        key: !!supabaseServiceRoleKey,
      })
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create service role client (admin access, bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log(`📝 Attempting to create user: ${email}`)

    // Try to create auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        school_id,
        user_type,
      },
    })

    // If user already exists, that's OK
    if (error && (error.message?.includes('already exists') || error.message?.includes('User already registered'))) {
      console.log(`ℹ️  User already exists: ${email}`)
      
      // Try to get the existing user
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (!listError && users) {
        const existingUser = users.find((u: any) => u.email === email)
        if (existingUser) {
          return NextResponse.json(
            {
              user: {
                id: existingUser.id,
                email: existingUser.email,
                message: 'User already exists'
              }
            },
            { status: 200 }
          )
        }
      }
    }

    if (error) {
      console.error('❌ Auth registration error:', error.message)
      return NextResponse.json(
        { error: `Registration failed: ${error.message}` },
        { status: 400 }
      )
    }

    console.log(`✅ Auth user created: ${data.user?.id}`)

    return NextResponse.json(
      {
        user: {
          id: data.user?.id,
          email: data.user?.email,
          message: 'User registered successfully'
        }
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('❌ Exception in auth register:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
