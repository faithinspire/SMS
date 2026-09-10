import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'


async function retryFetch(url: string, options: any, maxRetries: number = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) {
        return response
      }
      // If not ok but not a network error, don't retry
      if (response.status >= 400 && response.status < 500) {
        return response
      }
      // Retry on 5xx errors
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      } else {
        throw error
      }
    }
  }
  throw new Error('Max retries exceeded')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    console.log('ðŸ“ School registration request:', {
      name: body.name,
      admin_email: body.admin_email,
    })

    // Validate required fields
    if (!body.name || !body.admin_email || !body.admin_password) {
      console.error('âŒ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: name, admin_email, admin_password' },
        { status: 400 }
      )
    }

    // Validate password length
    if (body.admin_password.length < 6) {
      console.error('âŒ Password too short')
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error('âŒ Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    console.log('ðŸ”Œ Step 1: Creating Supabase Auth user FIRST...')
    
    // CREATE AUTH USER FIRST - This ensures the user exists before school is created
    let authUserId: string | null = null
    let authError: string | null = null

    try {
      const authResponse = await retryFetch(
        `${supabaseUrl}/auth/v1/admin/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            email: body.admin_email,
            password: body.admin_password,
            email_confirm: true, // Auto-confirm for development
            user_metadata: {
              name: `${body.name} Admin`,
              role: 'SCHOOL_ADMIN',
            },
          }),
        }
      )

      console.log('ðŸ“Š Auth creation response status:', authResponse.status)

      const authResponseText = await authResponse.text()
      
      if (!authResponse.ok) {
        console.error('âŒ Auth user creation failed:', {
          status: authResponse.status,
          error: authResponseText,
        })
        
        try {
          const errorJson = JSON.parse(authResponseText)
          authError = errorJson.msg || errorJson.error || authResponseText
        } catch {
          authError = authResponseText
        }
        
        // If auth user already exists, that's ok - we can still register the school
        if (!authResponseText.includes('already registered')) {
          throw new Error(`Auth creation failed: ${authError}`)
        }
      } else {
        const authData = JSON.parse(authResponseText)
        authUserId = authData.user?.id
        console.log('âœ… Supabase Auth user created with ID:', authUserId)
      }
    } catch (e: any) {
      console.error('âŒ Auth creation exception:', e.message)
      authError = e.message
      // Don't block school registration if auth fails - we have fallback
    }

    console.log('ðŸ”Œ Step 2: Registering school...')

    // Insert school using Supabase REST API with anon key
    const schoolResponse = await retryFetch(
      `${supabaseUrl}/rest/v1/schools`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          name: body.name,
          email: body.email || null,
          phone: body.phone || null,
          address: body.address || null,
          logo_url: body.logo_url || null,
          type: body.type || 'BOTH',
          admin_email: body.admin_email,
          admin_password: body.admin_password, // Store for fallback
          status: 'ACTIVE',
        }),
      }
    )

    console.log('ðŸ“Š School insert response status:', schoolResponse.status)

    if (!schoolResponse.ok) {
      const errorData = await schoolResponse.text()
      console.error('âŒ School insertion failed:', {
        status: schoolResponse.status,
        error: errorData,
      })
      return NextResponse.json(
        { error: `Failed to register school: ${schoolResponse.statusText}` },
        { status: 500 }
      )
    }

    const responseText = await schoolResponse.text()
    console.log('ðŸ“¦ Raw school response length:', responseText.length)

    if (!responseText || responseText.trim() === '') {
      console.error('âŒ Empty response received')
      return NextResponse.json(
        { error: 'Server returned empty response. RLS policies may be blocking the operation.' },
        { status: 500 }
      )
    }

    let schools
    try {
      schools = JSON.parse(responseText)
    } catch (e) {
      console.error('âŒ Failed to parse response:', responseText)
      return NextResponse.json(
        { error: 'Invalid server response' },
        { status: 500 }
      )
    }

    const school = Array.isArray(schools) ? schools[0] : schools

    if (!school || !school.id) {
      console.error('âŒ No school ID in response:', school)
      return NextResponse.json(
        { error: 'Invalid response: missing school ID' },
        { status: 500 }
      )
    }

    console.log('âœ… School registered with ID:', school.id)

    // Step 3: Update auth user with school ID if auth was successful
    if (authUserId) {
      console.log('ðŸ”Œ Step 3: Updating auth user with school ID...')
      try {
        const updateResponse = await retryFetch(
          `${supabaseUrl}/auth/v1/admin/users/${authUserId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              user_metadata: {
                name: `${body.name} Admin`,
                role: 'SCHOOL_ADMIN',
                schoolId: school.id,
              },
            }),
          }
        )

        if (updateResponse.ok) {
          console.log('âœ… Auth user updated with school ID')
        } else {
          console.warn('âš ï¸ Failed to update auth user with school ID')
        }
      } catch (e: any) {
        console.warn('âš ï¸ Auth user update exception:', e.message)
      }

      // Step 4: Create user record in users table
      console.log('ðŸ”Œ Step 4: Creating user record in users table...')
      try {
        const userTableResponse = await retryFetch(
          `${supabaseUrl}/rest/v1/users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              id: authUserId,
              school_id: school.id,
              email: body.admin_email,
              full_name: `${body.name} Admin`,
              role: 'SCHOOL_ADMIN',
              status: 'ACTIVE',
            }),
          }
        )

        if (userTableResponse.ok) {
          console.log('âœ… User record created in users table')
        } else {
          const userError = await userTableResponse.text()
          console.warn('âš ï¸ User table creation warning:', userError)
        }
      } catch (e: any) {
        console.warn('âš ï¸ User table creation exception:', e.message)
      }
    }

    const response: any = {
      ...school,
      registration_success: true,
      auth_configured: !!authUserId,
    }

    if (authError) {
      response.auth_note = `Warning: ${authError}. School registered. Login will use backup authentication.`
      console.warn('âš ï¸', response.auth_note)
    } else if (authUserId) {
      response.authUserId = authUserId
      console.log('âœ… Full registration completed successfully')
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('âŒ API error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

