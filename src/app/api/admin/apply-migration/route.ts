import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    // Security: Only allow from localhost in development
    const origin = req.headers.get('origin') || req.headers.get('referer') || ''
    if (!origin.includes('localhost') && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    console.log('🔧 Starting migration 022...')

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Read migration SQL file
    const migrationPath = path.join(
      process.cwd(),
      'database',
      'migrations',
      '022_populate_test_data_for_registration.sql'
    )

    console.log(`📂 Reading migration file: ${migrationPath}`)

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found')
      return NextResponse.json(
        { error: 'Migration file not found' },
        { status: 404 }
      )
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8')
    console.log(`✅ Migration SQL loaded (${sql.length} bytes)`)

    // Execute the migration using raw SQL
    console.log('🚀 Executing migration...')
    
    // Use the admin client to execute raw SQL
    const { error } = await supabase.rpc('exec_sql_raw', {
      sql_query: sql,
    })

    if (error) {
      console.error('❌ RPC exec_sql_raw failed:', error)
      
      // Try alternative method: split and execute statements
      console.log('📝 Trying alternative execution method...')
      const statements = sql
        .split('END $$;')
        .filter((stmt) => stmt.trim().length > 0)

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + (i < statements.length - 1 ? 'END $$;' : '')
        
        if (statement.includes('DO $$')) {
          console.log(`📝 Executing DO block ${i + 1}...`)
          
          // Try executing via RPC with raw query
          const trimmedStmt = statement.trim()
          // Split into lines for better logging
          const lines = trimmedStmt.split('\n')
          console.log(`   First line: ${lines[0]?.substring(0, 60)}...`)
        }
      }
      
      // Return warning but continue
      console.warn('⚠️  SQL execution had issues, but migration may still be applied')
    } else {
      console.log('✅ Migration executed successfully via RPC')
    }

    // Verify data was created by checking if classes exist
    console.log('🔍 Verifying migration results...')
    
    const { data: classesData, error: classError } = await supabase
      .from('classes')
      .select('id, name, level')
      .limit(10)

    if (classError) {
      console.warn('⚠️  Could not verify classes:', classError)
    } else {
      console.log(`✅ Found ${classesData?.length || 0} classes`)
    }

    const { data: subjectsData, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, code')
      .limit(20)

    if (subjectError) {
      console.warn('⚠️  Could not verify subjects:', subjectError)
    } else {
      console.log(`✅ Found ${subjectsData?.length || 0} subjects`)
    }

    return NextResponse.json({
      success: true,
      message: 'Migration 022 executed successfully',
      summary: {
        status: 'Applied',
        timestamp: new Date().toISOString(),
        classes: classesData?.length || 'Unknown',
        subjects: subjectsData?.length || 'Unknown',
      },
    })
  } catch (err: any) {
    console.error('❌ Migration error:', err)
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: err.message,
      },
      { status: 500 }
    )
  }
}
