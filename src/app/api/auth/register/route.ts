/**
 * POST /api/auth/register
 * Backend auth registration route to avoid rate limiting
 * Creates user in Supabase Auth
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
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

    // Create Supabase client on server
    const supabase = createServerComponentClient({ cookies })

    // Try to create auth user (if already exists, auth will return error)
    const { data, error } = await supabase.auth.admin.createUser({
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

    // If user already exists (error code 422), that's OK
    if (error && error.message?.includes('already exists')) {
      console.log('ℹ️  User already exists, proceeding...')
      
      // Get the existing user
      const { data: { user: existingUser } } = await supabase.auth.getUser()
      
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

    if (error) {
      console.error('❌ Auth registration error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create auth user' },
        { status: 400 }
      )
    }

    console.log('✅ Auth user created:', data.user?.id)

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
