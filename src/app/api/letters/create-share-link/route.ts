/**
 * API Route: Create Shareable Letter Link
 * Generates a unique, time-limited link to share letters via WhatsApp or other services
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'

const supabase = createClient()

// In-memory cache for share links (in production, use database)
const shareLinksCache = new Map<
  string,
  {
    letterHTML: string
    letterType: string
    recipientId: string
    schoolId: string
    createdAt: number
    expiresAt: number
  }
>()

function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function POST(request: NextRequest) {
  try {
    const { letterHTML, letterType, recipientId, schoolId } = await request.json()

    // Validation
    if (!letterHTML || !letterType || !recipientId || !schoolId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique token
    const shareToken = generateShareToken()

    // Set expiration to 7 days
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000

    // Store share link
    shareLinksCache.set(shareToken, {
      letterHTML,
      letterType,
      recipientId,
      schoolId,
      createdAt: Date.now(),
      expiresAt,
    })

    // Construct share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3001'
    const shareUrl = `${baseUrl}/share/letter/${shareToken}`

    return NextResponse.json(
      {
        success: true,
        shareToken,
        shareUrl,
        expiresAt: new Date(expiresAt).toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Share link creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
}

/**
 * GET handler for retrieving shared letter
 */
export async function GET(request: NextRequest) {
  try {
    const shareToken = request.nextUrl.searchParams.get('token')

    if (!shareToken) {
      return NextResponse.json(
        { error: 'Invalid share token' },
        { status: 400 }
      )
    }

    const sharedData = shareLinksCache.get(shareToken)

    if (!sharedData) {
      return NextResponse.json(
        { error: 'Share link not found or expired' },
        { status: 404 }
      )
    }

    // Check if expired
    if (Date.now() > sharedData.expiresAt) {
      shareLinksCache.delete(shareToken)
      return NextResponse.json(
        { error: 'Share link expired' },
        { status: 410 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        letterHTML: sharedData.letterHTML,
        letterType: sharedData.letterType,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Share link retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
