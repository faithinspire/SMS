import { NextRequest, NextResponse } from 'next/server'
import os from 'os'

export async function GET(request: NextRequest) {
  try {
    // Get all network interfaces
    const interfaces = os.networkInterfaces()
    let ipAddress = null

    // Find IPv4 address (excluding localhost)
    for (const name of Object.keys(interfaces)) {
      const addrs = interfaces[name]
      if (addrs) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            ipAddress = addr.address
            break
          }
        }
      }
      if (ipAddress) break
    }

    return NextResponse.json({
      success: true,
      ip: ipAddress,
      port: 3000,
      url: ipAddress ? `http://${ipAddress}:3000` : null,
      hostname: os.hostname(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
