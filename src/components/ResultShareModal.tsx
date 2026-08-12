'use client'

import React, { useState, useEffect } from 'react'
import { ResultSharingService, ParentContact } from '@/services/result-sharing.service'

interface ResultShareModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  schoolId: string
  schoolName: string
  teacherId: string
  resultData: any
}

export default function ResultShareModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  schoolId,
  schoolName,
  teacherId,
  resultData,
}: ResultShareModalProps) {
  const [parentContacts, setParentContacts] = useState<ParentContact[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [shareMethod, setShareMethod] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP')
  const [success, setSuccess] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      loadParentContacts()
    }
  }, [isOpen])

  const loadParentContacts = async () => {
    try {
      const contacts = await ResultSharingService.getParentContacts(studentId)
      setParentContacts(contacts)
    } catch (err) {
      console.error('Error loading parent contacts:', err)
      setError('Failed to load parent contacts')
    }
  }

  const handleSelectParent = (parentName: string) => {
    setSelectedParents((prev) =>
      prev.includes(parentName)
        ? prev.filter((p) => p !== parentName)
        : [...prev, parentName]
    )
  }

  const handleShare = async () => {
    try {
      setLoading(true)
      setSuccess('')
      setError('')

      const selectedContacts = parentContacts.filter((p) =>
        selectedParents.includes(p.name)
      )

      if (selectedContacts.length === 0) {
        setError('Please select at least one parent/guardian')
        return
      }

      const results = {
        studentName,
        admissionNumber: resultData.admissionNumber,
        classDetails: resultData.classDetails,
        scores: resultData.scores,
      }

      for (const contact of selectedContacts) {
        if (shareMethod === 'WHATSAPP' && contact.phone) {
          await ResultSharingService.shareViaWhatsApp(
            studentId,
            schoolId,
            teacherId,
            contact.phone,
            results
          )
        } else if (shareMethod === 'EMAIL' && contact.email) {
          await ResultSharingService.shareViaEmail(
            studentId,
            schoolId,
            teacherId,
            contact.email,
            results,
            schoolName
          )
        }
      }

      setSuccess(`✅ Results shared successfully via ${shareMethod}!`)
      setTimeout(() => {
        onClose()
        setSelectedParents([])
      }, 2000)
    } catch (err: any) {
      setError(`❌ Failed to share: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📤 Share Results</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Share Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3 text-gray-700">
            Share Via:
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setShareMethod('WHATSAPP')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                shareMethod === 'WHATSAPP'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📱 WhatsApp
            </button>
            <button
              onClick={() => setShareMethod('EMAIL')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                shareMethod === 'EMAIL'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📧 Email
            </button>
          </div>
        </div>

        {/* Parent Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3 text-gray-700">
            Select Recipients:
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {parentContacts.length === 0 ? (
              <p className="text-gray-600 text-sm">No parent/guardian contacts found</p>
            ) : (
              parentContacts.map((parent, idx) => {
                const hasContact =
                  (shareMethod === 'WHATSAPP' && parent.phone) ||
                  (shareMethod === 'EMAIL' && parent.email)

                return (
                  <label
                    key={idx}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedParents.includes(parent.name)
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-gray-50 border-gray-200'
                    } ${!hasContact ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedParents.includes(parent.name)}
                      onChange={() => handleSelectParent(parent.name)}
                      disabled={!hasContact}
                      className="rounded mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">
                        {parent.name}
                      </p>
                      <p className="text-xs text-gray-600">{parent.relationship}</p>
                      <p className="text-xs text-gray-500">
                        {shareMethod === 'WHATSAPP' ? parent.phone : parent.email}
                      </p>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-500 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-500 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={loading || selectedParents.length === 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sharing...' : '📤 Share'}
          </button>
        </div>
      </div>
    </div>
  )
}
