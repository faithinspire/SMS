import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // This middleware runs for all routes
  // For API routes, we rely on export const dynamic = 'force-dynamic' in route handlers
  return NextResponse.next()
}

// Apply middleware to all routes
export const config = {
  matcher: '/:path*',
}
