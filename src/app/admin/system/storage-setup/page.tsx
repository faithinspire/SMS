'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function StorageSetupPage() {
  const [initStatus, setInitStatus] = useState<any>(null)
  const [verifyStatus, setVerifyStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const initStorageBuckets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/init-storage', { method: 'POST' })
      const data = await res.json()
      setInitStatus(data)
    } catch (err: any) {
      setInitStatus({ error: err.message })
    }
    setLoading(false)
  }

  const verifyBuckets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/verify-buckets')
      const data = await res.json()
      setVerifyStatus(data)
    } catch (err: any) {
      setVerifyStatus({ error: err.message })
    }
    setLoading(false)
  }

  useEffect(() => {
    verifyBuckets()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Storage Bucket Setup</h1>
          <p className="text-gray-600 mt-2">
            Configure Supabase storage buckets for photos, logos, and lesson notes
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Current Bucket Status</h2>

          {verifyStatus?.error && (
            <div className="bg-red-100 border border-red-400 rounded p-4 text-red-700 mb-4">
              Error: {verifyStatus.error}
            </div>
          )}

          {verifyStatus?.buckets && (
            <div className="space-y-4">
              {Object.entries(verifyStatus.buckets).map(([name, bucket]: [string, any]) => (
                <div key={name} className="border rounded p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{name}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {bucket.exists ? (
                          <>
                            <p>✅ Exists</p>
                            <p>Public: {bucket.public ? '✅ Yes' : '❌ No'}</p>
                            <p>Files: {bucket.file_count || 0}</p>
                          </>
                        ) : (
                          <p>❌ Does not exist</p>
                        )}
                      </div>
                    </div>
                    {bucket.list_error && (
                      <div className="text-red-600 text-sm">Error: {bucket.list_error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {verifyStatus?.recommendations && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-900 mb-2">Recommendations:</h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                {verifyStatus.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Initialize Buckets */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Step 1: Create Buckets</h2>
          <p className="text-gray-600 mb-4">
            This will attempt to create the necessary storage buckets via API.
          </p>
          <button
            onClick={initStorageBuckets}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium transition"
          >
            {loading ? '⏳ Initializing...' : '📦 Initialize Buckets'}
          </button>

          {initStatus && (
            <div className="mt-4 p-4 bg-gray-100 rounded border">
              <pre className="text-xs overflow-auto max-h-64">
                {JSON.stringify(initStatus, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Manual Setup Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Step 2: Manual Configuration</h2>
          <p className="text-gray-600 mb-4">
            If buckets still have issues, configure them manually in Supabase Dashboard:
          </p>

          <div className="space-y-6">
            {[
              {
                name: 'student-documents',
                purpose: 'Student profile photos',
              },
              {
                name: 'school-logos',
                purpose: 'School logos and branding',
              },
              {
                name: 'lesson-notes',
                purpose: 'Teacher lesson notes and uploads',
              },
            ].map((bucket) => (
              <div key={bucket.name} className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-800">{bucket.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{bucket.purpose}</p>
                <ol className="text-sm text-gray-700 space-y-1">
                  <li>1. Go to Supabase Dashboard → Storage</li>
                  <li>2. Find or create bucket: <code className="bg-gray-200 px-2 py-1">{bucket.name}</code></li>
                  <li>3. Click Edit/Settings</li>
                  <li>4. Set <strong>Public: ON</strong></li>
                  <li>5. Set <strong>Row Level Security (RLS): OFF</strong></li>
                  <li>6. Click Save</li>
                </ol>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>✅ After configuration:</strong> Photos, logos, and files will be publicly accessible without authentication.
            </p>
          </div>
        </div>

        {/* Verification Link */}
        <div className="mt-8 text-center">
          <button
            onClick={verifyBuckets}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-medium transition"
          >
            {loading ? '⏳ Verifying...' : '🔍 Verify Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
