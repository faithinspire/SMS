'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RLSBypassPage() {
  const [status, setStatus] = useState('ready')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const applyBypass = async () => {
    setLoading(true)
    setStatus('applying')
    try {
      const res = await fetch('/api/system/bypass-rls', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      setStatus(data.success ? 'success' : 'error')
    } catch (err: any) {
      setResult({ error: err.message })
      setStatus('error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">RLS Bypass</h1>
          <p className="text-gray-600 mt-2">
            Force bypass RLS restrictions to allow public photo access
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {status === 'ready' && (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">What This Does</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✅ Drops all restrictive RLS policies on storage.objects</li>
                  <li>✅ Creates permissive policies for public reads</li>
                  <li>✅ Allows authenticated users full access</li>
                  <li>✅ Allows service role full access</li>
                  <li>✅ Photos will display in browser</li>
                </ul>
              </div>

              <button
                onClick={applyBypass}
                disabled={loading}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
              >
                {loading ? '⏳ Applying...' : '🔓 Apply RLS Bypass'}
              </button>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-800">
                <h3 className="font-bold text-lg">✅ RLS Bypass Applied Successfully!</h3>
                <p className="mt-2 text-sm">Storage RLS has been bypassed. Photos should now display.</p>
              </div>

              {result?.actions && (
                <div className="mb-6 p-4 bg-gray-50 rounded">
                  <h4 className="font-semibold text-gray-800 mb-2">Actions Completed:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.actions.map((action: string, idx: number) => (
                      <li key={idx}>✓ {action}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                href="/student/dashboard"
                className="block text-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition"
              >
                Go to Student Dashboard →
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-800">
                <h3 className="font-bold text-lg">❌ Error Applying RLS Bypass</h3>
                {result?.error && <p className="mt-2 text-sm">{result.error}</p>}
              </div>

              <button
                onClick={applyBypass}
                disabled={loading}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
              >
                Retry
              </button>
            </>
          )}

          {status === 'applying' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Applying RLS bypass...</p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t">
            <h3 className="font-semibold text-gray-800 mb-4">Troubleshooting</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                <strong>If bypass fails:</strong> You may need to manually run the migration in Supabase SQL Editor
              </p>
              <p>
                <strong>Manual SQL:</strong>
                <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                  {`CREATE POLICY "allow_public_read_all_objects" ON storage.objects FOR SELECT USING (true);`}
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
