'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function BucketFixedPage() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    // Verify buckets are now public
    const verify = async () => {
      try {
        const res = await fetch('/api/system/verify-buckets')
        const data = await res.json()
        
        const allPublic = Object.values(data.buckets).every((b: any) => b.public === true)
        setStatus(allPublic ? 'success' : 'partial')
      } catch (err) {
        setStatus('error')
      }
    }

    verify()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto text-center">
        {status === 'success' && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold text-green-600 mb-4">Buckets Fixed!</h1>
            <p className="text-xl text-gray-700 mb-8">
              Storage buckets are now PUBLIC and accessible.
            </p>

            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">What Changed</h2>
              <ul className="text-left space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="text-2xl mr-3">✅</span>
                  <div>
                    <strong>student-documents</strong> bucket is now PUBLIC
                    <p className="text-sm text-gray-600">Student photos will display</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">✅</span>
                  <div>
                    <strong>school-logos</strong> bucket is now PUBLIC
                    <p className="text-sm text-gray-600">School branding will display</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">⏳</span>
                  <div>
                    <strong>lesson-notes</strong> will be created on first upload
                    <p className="text-sm text-gray-600">Teacher files will be accessible</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-blue-900 mb-3">⚠️ Important: Refresh Your Browser</h3>
              <p className="text-blue-800 mb-4">
                Browser cache may have stored the old 403 errors. You need to:
              </p>
              <ol className="text-left space-y-2 text-blue-700">
                <li>1. Go to Student Dashboard: http://localhost:3000/student/dashboard</li>
                <li>2. <strong>Hard refresh the page</strong>: Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)</li>
                <li>3. Photos should now display ✓</li>
              </ol>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-bold text-green-900 mb-3">Next Steps</h3>
              <p className="text-green-800 mb-4">
                Photos are fixed! Now test the broadcast system:
              </p>
              <Link 
                href="/admin/dashboard"
                className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition"
              >
                Go to Admin Dashboard →
              </Link>
            </div>

            <div className="text-center">
              <p className="text-gray-600 text-sm">
                Questions? Check the browser developer console (F12) or contact support.
              </p>
            </div>
          </>
        )}

        {status === 'partial' && (
          <>
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-3xl font-bold text-yellow-600 mb-4">Partial Fix</h1>
            <p className="text-gray-700 mb-6">
              Some buckets are configured but not all are public yet.
            </p>
            <Link 
              href="/admin/system/storage-setup"
              className="inline-block px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition"
            >
              Continue Setup →
            </Link>
          </>
        )}

        {status === 'checking' && (
          <>
            <div className="text-6xl mb-6">⏳</div>
            <h1 className="text-3xl font-bold text-gray-600 mb-4">Checking...</h1>
            <p className="text-gray-700">Verifying bucket configuration...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-3xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-700 mb-6">
              Could not verify bucket configuration. Try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
            >
              Retry →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
