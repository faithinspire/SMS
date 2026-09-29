/**
 * Shared Letter View Page
 * Allows viewing and downloading shared letters via unique tokens
 */

'use client'

import { useState, useEffect } from 'react'
import { Download, Copy, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface SharedLetter {
  letterHTML: string
  letterType: 'appointment' | 'admission'
}

export default function SharedLetterPage({ params }: { params: { token: string } }) {
  const [letter, setLetter] = useState<SharedLetter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCopyConfirm, setShowCopyConfirm] = useState(false)

  useEffect(() => {
    const fetchSharedLetter = async () => {
      try {
        const response = await fetch(
          `/api/letters/create-share-link?token=${encodeURIComponent(params.token)}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          setError(
            response.status === 410
              ? 'This share link has expired'
              : response.status === 404
                ? 'Letter not found'
                : 'Failed to load letter'
          )
          return
        }

        const data = await response.json()
        setLetter({
          letterHTML: data.letterHTML,
          letterType: data.letterType,
        })
      } catch (err) {
        console.error('Error loading shared letter:', err)
        setError('Failed to load letter. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSharedLetter()
  }, [params.token])

  const handleDownload = () => {
    if (!letter) return

    const blob = new Blob([letter.letterHTML], { type: 'text/html;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${letter.letterType}-letter-${new Date().getTime()}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    toast.success('Letter downloaded')
  }

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setShowCopyConfirm(true)
    setTimeout(() => setShowCopyConfirm(false), 2000)
    toast.success('Link copied to clipboard')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading letter...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <X className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Unable to Load Letter</h2>
          <p className="text-center text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {letter?.letterType === 'appointment' ? 'Appointment' : 'Admission'} Letter
              </h1>
              <p className="text-gray-600 text-sm mt-1">Shared document - View only</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                title="Copy share link"
              >
                <Copy className="w-4 h-4" />
                {showCopyConfirm ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                title="Download letter"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Letter Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {letter && (
            <iframe
              srcDoc={letter.letterHTML}
              className="w-full border-0"
              style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
              title="Letter Preview"
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 border-t border-gray-200 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600 text-sm">
            <p>This is a shared document. Access expires after 7 days.</p>
            <p className="mt-2 text-xs text-gray-500">
              Questions? Contact your school office for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
