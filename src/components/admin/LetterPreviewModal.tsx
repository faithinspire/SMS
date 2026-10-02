'use client'

import { useState, useEffect } from 'react'
import { X, Download, Mail, MessageCircle, Printer, Copy } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { LetterGenerationService } from '@/services/letter-generation.service'
import { WhatsAppService } from '@/services/whatsapp.service'

interface LetterPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  letterType: 'appointment' | 'admission'
  recipientId: string
  schoolId: string
  recipientEmail?: string
  recipientPhone?: string
}

export function LetterPreviewModal({
  isOpen,
  onClose,
  letterType,
  recipientId,
  schoolId,
  recipientEmail,
  recipientPhone,
}: LetterPreviewModalProps) {
  const [letterHTML, setLetterHTML] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCopyConfirm, setShowCopyConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')

  // Generate letter on mount or when props change
  useEffect(() => {
    if (isOpen) {
      generateLetter()
    }
  }, [isOpen, letterType, recipientId, schoolId])

  const generateLetter = async () => {
    setIsLoading(true)
    try {
      // Fetch school data
      const schoolData = await LetterGenerationService.fetchSchoolData(schoolId)
      if (!schoolData) {
        toast.error('Failed to load school data')
        return
      }

      let html = ''

      if (letterType === 'appointment') {
        // Fetch staff data
        const staffData = await LetterGenerationService.fetchStaffData(recipientId, schoolId)
        if (!staffData) {
          toast.error('Failed to load staff data')
          return
        }
        html = await LetterGenerationService.generateAppointmentLetter(staffData, schoolData)
      } else {
        // Fetch student data
        const studentDataInfo = await LetterGenerationService.fetchStudentData(recipientId, schoolId)
        if (!studentDataInfo) {
          toast.error('Failed to load student data')
          return
        }

        // Format student data for letter generation
        const studentData = {
          full_name: studentDataInfo.student.user?.full_name || '',
          admission_number: studentDataInfo.student.admission_number,
          date_of_birth: studentDataInfo.student.date_of_birth,
          session: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
          parent_name: studentDataInfo.guardians[0]?.full_name || 'Parent/Guardian',
        }

        const classInfo = studentDataInfo.class
          ? {
              name: `${studentDataInfo.class.classes?.name || ''} ${
                studentDataInfo.class.arms?.name || ''
              }`.trim(),
              level: studentDataInfo.class.classes?.level,
            }
          : undefined

        html = await LetterGenerationService.generateAdmissionLetter(studentData, schoolData, classInfo)
      }

      setLetterHTML(html)
      setEditedContent(html)
    } catch (error) {
      console.error('Error generating letter:', error)
      toast.error('Failed to generate letter')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadHTML = () => {
    if (!letterHTML) return
    const blob = new Blob([letterHTML], { type: 'text/html;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${letterType}-letter-${new Date().getTime()}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
    toast.success('Letter downloaded as HTML')
  }

  const handlePrint = () => {
    if (!letterHTML) return
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(letterHTML)
      newWindow.document.close()
      newWindow.print()
    }
  }

  const handleEmailShare = () => {
    if (!recipientEmail) {
      toast.error('No email address available')
      return
    }

    setIsLoading(true)
    try {
      // Try server-side email sending first
      fetch('/api/letters/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail,
          recipientName: letterType === 'appointment' ? 'Staff Member' : 'Parent/Guardian',
          letterType,
          letterHTML,
          schoolName: 'School', // This will be set from fetched school data
          senderEmail: recipientEmail,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success('Letter sent via email!')
          } else if (data.useMailto) {
            // Fallback to mailto
            handleMailtoFallback()
          } else {
            toast.error(data.message || 'Failed to send email')
          }
        })
        .catch((err) => {
          console.error('Email send error:', err)
          // Fallback to mailto
          handleMailtoFallback()
        })
        .finally(() => {
          setIsLoading(false)
        })
    } catch (error) {
      console.error('Error:', error)
      setIsLoading(false)
      handleMailtoFallback()
    }
  }

  const handleMailtoFallback = () => {
    const subject = `${letterType === 'appointment' ? 'Appointment' : 'Admission'} Letter`
    const body = encodeURIComponent(
      `Hello,\n\nPlease find the ${letterType} letter attached.\n\nBest regards,\nSchool Admin`
    )
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`
    toast.info('Opening email client...')
  }

  const handleWhatsAppShare = () => {
    if (!recipientPhone) {
      toast.error('No phone number available')
      return
    }

    const message = encodeURIComponent(
      `Hello! Your ${letterType} letter has been generated and is ready for review. Please contact the school office to collect or request it via email.`
    )
    const phoneNumber = recipientPhone.replace(/\D/g, '')
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank')
    toast.info('Opening WhatsApp...')
  }

  const handleWhatsAppShareEnhanced = async () => {
    if (!recipientPhone) {
      toast.error('No phone number available')
      return
    }

    setIsLoading(true)
    try {
      // Try to create a shareable link first
      const shareUrl = await WhatsAppService.createShareableLink({
        letterHTML,
        letterType,
        recipientId,
        schoolId,
      })

      // Generate WhatsApp message
      const result = await WhatsAppService.shareLetterViaWhatsApp({
        recipientPhone,
        recipientName: letterType === 'appointment' ? 'Staff Member' : 'Parent',
        letterType,
        schoolName: 'School',
        documentUrl: shareUrl || undefined,
      })

      if (result.success) {
        toast.success('Opening WhatsApp...')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('WhatsApp share error:', error)
      // Fallback to basic WhatsApp message
      handleWhatsAppShare()
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyHTML = () => {
    if (!letterHTML) return
    navigator.clipboard.writeText(letterHTML)
    setShowCopyConfirm(true)
    setTimeout(() => setShowCopyConfirm(false), 2000)
    toast.success('HTML copied to clipboard')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {letterType === 'appointment' ? '📋 Appointment' : '🎓 Admission'} Letter
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {isEditing ? 'Edit letter content' : 'Review before sharing or printing'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition text-white"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating letter...</p>
            </div>
          </div>
        )}

        {/* Edit Mode - Text Area */}
        {!isLoading && isEditing && (
          <div className="flex-1 overflow-auto p-6">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full p-4 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Edit letter HTML here..."
            />
          </div>
        )}

        {/* Preview Mode - iFrame */}
        {!isLoading && !isEditing && letterHTML && (
          <div className="flex-1 overflow-auto">
            <iframe
              srcDoc={letterHTML}
              className="w-full h-full border-0"
              title="Letter Preview"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="space-y-4">
            {/* Edit Mode Buttons */}
            {isEditing && (
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setLetterHTML(editedContent)
                    setIsEditing(false)
                    toast.success('Letter updated!')
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  ✓ Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                >
                  ✕ Cancel
                </button>
              </div>
            )}

            {/* Preview Mode Buttons */}
            {!isEditing && (
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition"
                    title="Edit letter content"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={handleDownloadHTML}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>

                  <button
                    onClick={handlePrint}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>

                  <button
                    onClick={handleCopyHTML}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                    title="Copy HTML content to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                    {showCopyConfirm ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recipientEmail && (
                    <button
                      onClick={handleEmailShare}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition"
                      title="Share via email"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                  )}

                  {recipientPhone && (
                    <button
                      onClick={handleWhatsAppShareEnhanced}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition"
                      title="Share via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Helper Text */}
            {!isEditing && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> Click Edit to modify the letter content, Download to save as HTML, or Email/WhatsApp to send directly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
