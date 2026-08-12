import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/schools?order=created_at.desc`,
      {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to fetch schools:', error)
      return NextResponse.json(
        { error: 'Failed to fetch schools' },
        { status: response.status }
      )
    }

    const schools = await response.json()
    return NextResponse.json(schools, { status: 200 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  // Delegate to register route
  return NextResponse.json(
    { error: 'Use POST /api/schools/register' },
    { status: 400 }
  )
}
