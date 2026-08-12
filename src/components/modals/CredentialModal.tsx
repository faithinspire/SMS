'use client'

import React, { useState } from 'react'
import { generateWhatsAppCredential, CredentialTemplate } from '@/lib/credential-generator'

interface CredentialModalProps {
  isOpen: boolean
  credential: CredentialTemplate
  onClose: () => void
  onCopyToClipboard: (text: string) => void
  onShareWhatsApp: (text: string) => void
}

export function CredentialModal({
  isOpen,
  credential,
  onClose,
  onCopyToClipboard,
  onShareWhatsApp,
}: CredentialModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const getTitleColor = () => {
    switch (credential.type) {
      case 'admin':
        return 'from-purple-600 to-purple-700'
      case 'staff':
        return 'from-green-600 to-green-700'
      case 'student':
        return 'from-blue-600 to-blue-700'
      default:
        return 'from-gray-600 to-gray-700'
    }
  }

  const getIcon = () => {
    switch (credential.type) {
      case 'admin':
        return '🎉'
      case 'staff':
        return '✅'
      case 'student':
        return '✅'
      default:
        return '📋'
    }
  }

  const getTitle = () => {
    switch (credential.type) {
      case 'admin':
        return 'School Successfully Registered!'
      case 'staff':
        return 'Staff Account Created Successfully!'
      case 'student':
        return 'Student Registered Successfully!'
      default:
        return 'Credentials Generated'
    }
  }

  const handleCopy = (text: string) => {
    onCopyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    const whatsappText = generateWhatsAppCredential(credential)
    onShareWhatsApp(whatsappText)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getTitleColor()} text-white p-6`}>
          <div className="text-center">
            <div className="text-4xl mb-2">{getIcon()}</div>
            <h2 className="text-2xl font-bold">{getTitle()}</h2>
            <p className="text-white text-opacity-90 mt-1">Welcome {credential.name}!</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Credentials Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">School</p>
                <p className="font-semibold text-gray-900">{credential.schoolName}</p>
              </div>
              <span className="text-2xl">🏫</span>
            </div>

            {credential.email && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900 break-all">{credential.email}</p>
                </div>
                <button
                  onClick={() => handleCopy(credential.email!)}
                  className="ml-2 p-2 hover:bg-blue-100 rounded transition-colors"
                  title="Copy email"
                >
                  📋
                </button>
              </div>
            )}

            {credential.pin && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Your PIN</p>
                  <p className="font-mono font-bold text-lg text-green-700 tracking-widest">
                    {credential.pin}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(credential.pin!)}
                  className="ml-2 p-2 hover:bg-green-100 rounded transition-colors"
                  title="Copy PIN"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            )}

            {credential.tempPassword && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Temporary Password</p>
                  <p className="font-mono font-bold text-gray-900 break-all">
                    {credential.tempPassword}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(credential.tempPassword!)}
                  className="ml-2 p-2 hover:bg-red-100 rounded transition-colors"
                  title="Copy password"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            )}
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important:</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              {credential.type !== 'student' && (
                <li>✓ Change your password immediately after first login</li>
              )}
              <li>✓ Keep these credentials confidential</li>
              <li>✓ Share only via secure messages (WhatsApp, SMS)</li>
              <li>✓ Never share via unencrypted email</li>
            </ul>
          </div>

          {/* How to Login */}
          <div className="bg-blue-50 p-4 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">📱 How to Login:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to login page</li>
              <li>Select school: {credential.schoolName}</li>
              <li>
                Choose{' '}
                <span className="font-semibold">
                  {credential.pin ? 'PIN Login' : 'Email Login'}
                </span>
              </li>
              <li>Enter your credentials</li>
              <li>Click "Log In"</li>
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            📱 Share via WhatsApp
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ✓ Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default CredentialModal
