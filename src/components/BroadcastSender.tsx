'use client'

import React, { useState } from 'react'
import toast from 'react-hot-toast'

interface BroadcastSenderProps {
  schoolId: string
  userId: string
  onBroadcastSent?: () => void
}

export default function BroadcastSender({
  schoolId,
  userId,
  onBroadcastSent,
}: BroadcastSenderProps) {
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [recipientType, setRecipientType] = useState<'STAFF' | 'TEACHERS' | 'ALL_STAFF'>('ALL_STAFF')
  const [broadcastType, setBroadcastType] = useState<'GENERAL' | 'URGENT' | 'HOLIDAY'>('GENERAL')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/broadcasts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          recipient_type: recipientType,
          broadcast_type: broadcastType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send broadcast')
        return
      }

      toast.success(`Broadcast sent to ${data.recipients_count} recipients`)
      setTitle('')
      setMessage('')
      setRecipientType('ALL_STAFF')
      setBroadcastType('GENERAL')
      setShowModal(false)

      if (onBroadcastSent) {
        onBroadcastSent()
      }
    } catch (error: any) {
      console.error('Error sending broadcast:', error)
      toast.error('Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Button to open sender */}
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
      >
        📢 Send Broadcast
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">📢 Send Broadcast</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-2xl font-bold hover:text-blue-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Broadcast Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Important School Announcement"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your broadcast message here..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send To *
                </label>
                <select
                  value={recipientType}
                  onChange={e => setRecipientType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL_STAFF">All Staff & Teachers</option>
                  <option value="TEACHERS">Teachers Only</option>
                  <option value="STAFF">Non-Teaching Staff Only</option>
                </select>
              </div>

              {/* Broadcast Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Announcement Type
                </label>
                <select
                  value={broadcastType}
                  onChange={e => setBroadcastType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="GENERAL">General Announcement</option>
                  <option value="URGENT">Urgent Notice</option>
                  <option value="HOLIDAY">Holiday Notice</option>
                </select>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="font-bold text-gray-900">{title || '(Title will appear here)'}</p>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                    {message || '(Message will appear here)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={sending}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {sending ? '⏳ Sending...' : '📤 Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
