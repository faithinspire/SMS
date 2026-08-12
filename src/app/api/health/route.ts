import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    const checks = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabase: {
        url_configured: !!supabaseUrl,
        anon_key_configured: !!anonKey,
        service_key_configured: !!serviceKey,
      },
      node_version: process.version,
    }

    // Test Supabase connection
    if (supabaseUrl && anonKey) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/schools?limit=0`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
        })
        checks.supabase.connection = response.ok ? 'ok' : `failed (${response.status})`
      } catch (e: any) {
        checks.supabase.connection = `error: ${e.message}`
      }
    }

    return NextResponse.json(checks, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Health check failed' },
      { status: 500 }
    )
  }
}
