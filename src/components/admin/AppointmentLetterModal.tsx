'use client'

import { useState, useEffect } from 'react'

interface AppointmentLetterModalProps {
  teacherId: string
  isOpen: boolean
  onClose: () => void
}

export default function AppointmentLetterModal({
  teacherId,
  isOpen,
  onClose,
}: AppointmentLetterModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [letterData, setLetterData] = useState<any>(null)

  useEffect(() => {
    if (isOpen && teacherId) {
      loadAppointmentLetter()
    }
  }, [isOpen, teacherId])

  const loadAppointmentLetter = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/documents/appointment-letter?teacherId=${teacherId}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load appointment letter')
      }

      setLetterData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to generate appointment letter')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (letterData?.letterHtml) {
      const printWindow = window.open('', '', 'height=800,width=900')
      printWindow?.document.write(letterData.letterHtml)
      printWindow?.document.close()
      printWindow?.print()
    }
  }

  const handleDownload = () => {
    if (letterData?.letterHtml) {
      const element = document.createElement('a')
      const file = new Blob([letterData.letterHtml], { type: 'text/html' })
      element.href = URL.createObjectURL(file)
      element.download = `Appointment_Letter_${letterData.teacherName?.replace(/\s+/g, '_')}.html`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }

  if (!isOpen) return null

  const bgOverlay = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
  const modalClass = 'bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col'

  return (
    <div className={bgOverlay}>
      <div className={modalClass}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 border-b shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">📋 Appointment Letter</h2>
              <p className="text-purple-100 text-sm mt-1">
                {letterData?.teacherName}
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-purple-200 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating appointment letter...</p>
              </div>
            </div>
          ) : letterData?.letterHtml ? (
            <>
              {/* Letter Preview */}
              <div
                className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 mb-6"
                dangerouslySetInnerHTML={{ __html: letterData.letterHtml }}
              />

              {/* Quick Info Cards */}
              {letterData?.classes && letterData.classes.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900">Classes Assigned</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{letterData.classes.length}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-900">Subjects Teaching</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{letterData.subjects?.length || 0}</p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer with Actions */}
        {letterData && !loading && (
          <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
            >
              ⬇️ Download
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
            >
              🖨️ Print
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
