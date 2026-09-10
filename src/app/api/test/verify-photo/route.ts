import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Verify photos can be accessed
 * GET /api/test/verify-photo?photo_url=<URL>
 */

export async function GET(request: NextRequest) {
  const photoUrl = request.nextUrl.searchParams.get('photo_url')

  if (!photoUrl) {
    return NextResponse.json({
      error: 'photo_url parameter required',
      example: '/api/test/verify-photo?photo_url=https://...',
    }, { status: 400 })
  }

  try {
    // Try to fetch the photo URL
    const response = await fetch(photoUrl, { method: 'HEAD' })

    return NextResponse.json({
      photo_url: photoUrl,
      status: response.status,
      statusText: response.statusText,
      accessible: response.ok,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
      },
      message: response.ok 
        ? '✅ Photo is accessible!' 
        : `❌ Photo returned ${response.status} ${response.statusText}`,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      photo_url: photoUrl,
      message: '❌ Failed to access photo',
    }, { status: 500 })
  }
}
