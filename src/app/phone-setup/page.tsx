'use client'

import { useEffect, useState } from 'react'

interface SystemInfo {
  ip: string | null
  port: number
  url: string | null
  hostname: string
}

export default function PhoneSetupPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await fetch('/api/system/ip')
        const data = await response.json()
        if (data.success) {
          setSystemInfo(data)
        } else {
          setError(data.error || 'Failed to get system info')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch system info')
      } finally {
        setLoading(false)
      }
    }

    fetchSystemInfo()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Getting your IP address...</p>
        </div>
      </div>
    )
  }

  if (error || !systemInfo?.ip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Could not retrieve system IP address'}</p>
          <p className="text-sm text-gray-500">Make sure the server is running and try again</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📱</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Phone Setup Guide</h1>
          <p className="text-gray-600">Connect your phone to SMS on the same WiFi network</p>
        </div>

        {/* System Information */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your System Information</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Computer Name:</span>
              <span className="font-mono text-lg text-blue-600 font-bold">{systemInfo.hostname}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">IP Address:</span>
              <span className="font-mono text-lg text-blue-600 font-bold">{systemInfo.ip}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Server Port:</span>
              <span className="font-mono text-lg text-blue-600 font-bold">{systemInfo.port}</span>
            </div>
          </div>
        </div>

        {/* Phone URL */}
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📲 Use This URL on Your Phone</h2>
          
          <div className="bg-white border-2 border-green-500 rounded-lg p-4 mb-4">
            <p className="text-center font-mono text-xl text-green-600 font-bold break-all">
              {systemInfo.url}
            </p>
          </div>
          
          <button
            onClick={() => {
              navigator.clipboard.writeText(systemInfo.url || '')
              alert('URL copied to clipboard!')
            }}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            📋 Copy to Clipboard
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-gray-800">Steps to Connect:</h2>
          
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <div>
              <p className="font-semibold text-gray-800">Connect Your Phone to WiFi</p>
              <p className="text-gray-600 text-sm">Use the SAME WiFi network as your computer</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
            <div>
              <p className="font-semibold text-gray-800">Open Browser on Phone</p>
              <p className="text-gray-600 text-sm">Chrome, Safari, or any mobile browser</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
            <div>
              <p className="font-semibold text-gray-800">Type or Paste the URL</p>
              <p className="text-gray-600 text-sm">
                <code className="bg-gray-100 px-2 py-1 rounded">{systemInfo.url}</code>
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
            <div>
              <p className="font-semibold text-gray-800">Press Enter</p>
              <p className="text-gray-600 text-sm">SMS app will load on your phone!</p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
          <h2 className="text-lg font-bold text-gray-800 mb-3">⚠️ Troubleshooting</h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✓ Both devices must be on SAME WiFi network</li>
            <li>✓ Windows Firewall might block connection (allow Node.js)</li>
            <li>✓ If page is slow, try moving closer to WiFi router</li>
            <li>✓ Clear phone browser cache if page looks broken</li>
            <li>✓ Make sure server is still running (check terminal)</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>This is a local development setup</p>
          <p>Not accessible from outside your WiFi network</p>
        </div>
      </div>
    </div>
  )
}
