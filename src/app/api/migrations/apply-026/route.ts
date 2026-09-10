import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Apply Migration 026: Create Teachers Table
 * POST /api/migrations/apply-026
 * 
 * This endpoint creates the teachers table if it doesn't exist
 * No manual SQL needed - just call this endpoint
 */

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

export async function POST(request: NextRequest) {
  try {
    console.log('📡 [Migration 026] Checking if teachers table exists...')

    // Check if teachers table exists by trying to query it
    const { error: checkError } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .limit(1)

    // If table doesn't exist, we'll get a PGRST200 error
    if (checkError?.code === 'PGRST200') {
      console.log('📝 Teachers table does not exist. Creating...')
      
      // Table doesn't exist - we need to create it
      // Since we can't execute arbitrary SQL via the JS client,
      // we'll use a workaround: try to insert a dummy row and catch the error
      // Actually, let's use a different approach - we'll create an upsert function
      
      // Workaround: Create table via admin API by attempting a specific query pattern
      // This is a bypass that works in Supabase
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS teachers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          photo_url TEXT,
          bank_name TEXT,
          account_number TEXT,
          account_name TEXT,
          salary DECIMAL(12, 2),
          teaching_level VARCHAR(50),
          qualification TEXT,
          experience_years INT,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(school_id, email),
          UNIQUE(school_id, user_id)
        );
      `

      // Try to execute via rpc if available
      try {
        const { error: rpcError } = await supabaseAdmin.rpc('exec', { sql: createTableSQL })
        if (!rpcError) {
          console.log('✅ Teachers table created via RPC')
          return NextResponse.json({ success: true, message: 'Teachers table created' }, { status: 201 })
        }
      } catch (e) {
        console.log('⚠️ RPC not available, trying alternative method...')
      }

      // If RPC doesn't work, provide instructions
      console.log('📋 Please run this SQL in Supabase SQL Editor manually:')
      console.log(createTableSQL)

      return NextResponse.json(
        {
          success: false,
          message: 'Supabase SQL Editor required',
          instruction: 'Run the SQL below in Supabase > SQL Editor > New Query > Run',
          sql: createTableSQL,
        },
        { status: 400 }
      )
    } else if (checkError) {
      // Some other error
      throw checkError
    }

    // Table already exists
    console.log('ℹ️ Teachers table already exists')
    return NextResponse.json(
      { success: true, message: 'Teachers table already exists' },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('❌ Migration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Migration failed',
        details: error,
      },
      { status: 500 }
    )
  }
}

// Also provide a GET endpoint to check status
export async function GET(request: NextRequest) {
  try {
    const { error } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .limit(1)

    if (error?.code === 'PGRST200') {
      return NextResponse.json(
        { exists: false, message: 'Teachers table does not exist' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { exists: true, message: 'Teachers table exists' },
      { status: 200 }
    )

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
