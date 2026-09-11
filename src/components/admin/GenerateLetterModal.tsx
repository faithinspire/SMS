'use client'

import { useState, useEffect } from 'react'
import { LetterGenerationService, EmploymentLetterData, AdmissionLetterData, EnhancedEmploymentLetterData, EnhancedAdmissionLetterData } from '@/services/letter-generation.service'
import { SharingService } from '@/services/sharing.service'
import { supabase } from '@/lib/supabase-client'

interface GenerateLetterModalProps {
  type: 'EMPLOYMENT' | 'ADMISSION'
  recipientData: any
  schoolData: any
  isOpen: boolean
  onClose: () => void
}

export default function GenerateLetterModal({
  type,
  recipientData,
  schoolData,
  isOpen,
  onClose,
}: GenerateLetterModalProps) {
  const [generatedLetter, setGeneratedLetter] = useState<string>('')
  const [letterHTML, setLetterHTML] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)
  const [shareMode, setShareMode] = useState<'whatsapp' | 'email' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shareData, setShareData] = useState({
    phoneNumber: '',
    email: '',
  })
  const [enrichedData, setEnrichedData] = useState<any>(null)

  useEffect(() => {
    if (isOpen && recipientData) {
      enrichLetterData()
    }
  }, [isOpen, recipientData])

  const enrichLetterData = async () => {
    try {
      const enhanced: any = { ...recipientData }

      if (type === 'ADMISSION') {
        // Get class teacher information
        if (recipientData.class_arm_combo_id) {
          const { data: classData } = await supabase
            .from('class_arm_combos')
            .select(`
              id,
              class_teacher:class_teacher_id(full_name, email)
            `)
            .eq('id', recipientData.class_arm_combo_id)
            .single()

          if (classData?.class_teacher) {
            enhanced.classTeacherName = classData.class_teacher.full_name
            enhanced.classTeacherEmail = classData.class_teacher.email
          }
        }

        // Get guardian information - use guardians table (not student_guardians)
        if (recipientData.id) {
          const { data: guardians } = await supabase
            .from('guardians')
            .select('full_name')
            .eq('student_id', recipientData.id)
            .limit(2)

          if (guardians && guardians.length > 0) {
            enhanced.guardianNames = guardians.map((g: any) => g.full_name)
          }
        }
      }

      // Add school details
      if (schoolData) {
        enhanced.schoolMotto = schoolData.school_motto
        enhanced.schoolVision = schoolData.school_vision
        enhanced.schoolMission = schoolData.school_mission
        enhanced.codeOfConductUrl = schoolData.code_of_conduct_url
        enhanced.codeOfConductText = schoolData.code_of_conduct_text
      }

      if (type === 'EMPLOYMENT') {
        // Get position details from position_details table
        const { data: positionData } = await supabase
          .from('position_details')
          .select('*')
          .eq('school_id', schoolData.id)
          .eq('role', recipientData.role)
          .single()

        if (positionData) {
          enhanced.jobDescription = positionData.description
          enhanced.benefits = positionData.benefits
          enhanced.workingHours = positionData.work_hours
          enhanced.reportingManager = positionData.reporting_manager_role
        }

        // Get teacher-specific details
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('salary, bank_name, account_number')
          .eq('user_id', recipientData.id)
          .single()

        if (teacherData) {
          enhanced.salary = teacherData.salary || recipientData.salary_amount || 0
        }
      }

      setEnrichedData(enhanced)
    } catch (err) {
      console.error('Error enriching letter data:', err)
      setEnrichedData(recipientData)
    }
  }

  const generateLetter = () => {
    setError('')
    try {
      let letter = ''
      let html = ''

      const dataToUse = enrichedData || recipientData

      if (type === 'EMPLOYMENT' && dataToUse) {
        // Map role to position title
        const roleToPositionMap: {[key: string]: string} = {
          'TEACHER': 'Teacher',
          'HEAD_TEACHER': 'Head Teacher',
          'PRINCIPAL': 'Principal',
          'ACCOUNTANT': 'Accountant',
          'ADMIN': 'Administrator',
          'STAFF': 'Staff Member',
          'LIBRARIAN': 'Librarian',
          'NURSE': 'School Nurse',
          'COUNSELOR': 'Counselor',
          'ICT_COORDINATOR': 'ICT Coordinator',
        }
        
        const employmentData: EnhancedEmploymentLetterData = {
          teacherName: dataToUse.full_name,
          teacherId: dataToUse.id,
          schoolName: schoolData?.name || 'School',
          position: roleToPositionMap[dataToUse.role] || dataToUse.role || 'Staff Member',
          salary: dataToUse.salary || 0,
          startDate: new Date().toISOString(),
          employmentTerms: 'As per school policies',
          jobDescription: dataToUse.jobDescription,
          benefits: dataToUse.benefits,
          workingHours: dataToUse.workingHours,
          reportingManager: dataToUse.reportingManager,
          schoolMotto: dataToUse.schoolMotto,
          schoolLogoUrl: schoolData?.logo_url, // Add school logo to employment letter
        }

        letter = LetterGenerationService.generateEmploymentLetter(employmentData)
        html = LetterGenerationService.generateEmploymentLetterHTML(employmentData)
      } else if (type === 'ADMISSION' && dataToUse) {
        const admissionData: EnhancedAdmissionLetterData = {
          studentName: dataToUse.full_name,
          studentId: dataToUse.id,
          admissionNumber: dataToUse.admission_number,
          schoolName: schoolData?.name || 'School',
          className: dataToUse.class_name || 'Class',
          department: dataToUse.department,
          startDate: new Date().toISOString(),
          classTeacherName: dataToUse.classTeacherName,
          classTeacherEmail: dataToUse.classTeacherEmail,
          codeOfConductUrl: dataToUse.codeOfConductUrl,
          codeOfConductText: dataToUse.codeOfConductText,
          guardianNames: dataToUse.guardianNames,
          schoolMotto: dataToUse.schoolMotto,
          schoolVision: dataToUse.schoolVision,
          schoolMission: dataToUse.schoolMission,
          schoolLogoUrl: schoolData?.logo_url, // Add school logo to admission letter
        }

        letter = LetterGenerationService.generateAdmissionLetter(admissionData)
        html = LetterGenerationService.generateAdmissionLetterHTML(admissionData)
      }

      setGeneratedLetter(letter)
      setLetterHTML(html)
      setShowPreview(true)
    } catch (err: any) {
      setError(err.message || 'Failed to generate letter')
    }
  }

  const handleShareWhatsApp = async () => {
    try {
      setLoading(true)
      
      // Get phone number from recipient data or user input
      let phoneNumber = shareData.phoneNumber
      
      if (!phoneNumber && recipientData?.phone) {
        phoneNumber = recipientData.phone
      }
      
      if (!phoneNumber) {
        setError('No phone number available. Please enter one or ensure the recipient has a phone number.')
        setLoading(false)
        return
      }

      const validated = SharingService.validatePhoneNumber(phoneNumber)
      if (!validated) {
        setError('Invalid phone number. Please use Nigerian format.')
        setLoading(false)
        return
      }

      SharingService.shareViaWhatsApp({
        phoneNumber: phoneNumber,
        message: `Here is your ${type === 'EMPLOYMENT' ? 'employment' : 'admission'} letter from ${schoolData?.name}`,
        letterContent: generatedLetter,
      })

      setSuccess(`✅ Opening WhatsApp to send to ${phoneNumber}`)
      setTimeout(() => {
        onClose()
        setShareMode(null)
        setGeneratedLetter('')
        setShowPreview(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleShareEmail = async () => {
    if (!shareData.email) {
      setError('Please enter an email address')
      return
    }

    try {
      setLoading(true)
      const validated = SharingService.validateEmail(shareData.email)
      if (!validated) {
        setError('Invalid email address')
        return
      }

      const result = await SharingService.shareViaEmail({
        emailAddress: shareData.email,
        subject: `${type === 'EMPLOYMENT' ? 'Employment' : 'Admission'} Letter from ${schoolData?.name}`,
        letterContent: generatedLetter,
        recipientName: recipientData.full_name,
        schoolName: schoolData?.name || 'School',
      })

      setSuccess(`✅ Letter shared via email to ${shareData.email}`)
      setTimeout(() => {
        onClose()
        setShareMode(null)
        setGeneratedLetter('')
        setShowPreview(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    const fileName = `${type === 'EMPLOYMENT' ? 'employment' : 'admission'}_letter_${recipientData.full_name}_${new Date().getTime()}.txt`
    LetterGenerationService.downloadLetter(generatedLetter, fileName)
  }

  const handleCopy = async () => {
    const copied = await LetterGenerationService.copyToClipboard(generatedLetter)
    if (copied) {
      setSuccess('✅ Letter copied to clipboard!')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const handlePrint = () => {
    LetterGenerationService.printLetter(generatedLetter)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 border-b shadow-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {type === 'EMPLOYMENT' ? '📄 Employment Letter' : '🎓 Admission Letter'}
            </h2>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-all">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

          {!showPreview ? (
            <div className="text-center space-y-6">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-8">
                <p className="text-lg text-gray-700 mb-4">
                  Generate a {type === 'EMPLOYMENT' ? 'professional employment' : 'formal admission'} letter for:
                </p>
                <p className="text-2xl font-bold text-purple-700 mb-2">{recipientData?.full_name}</p>
                {type === 'EMPLOYMENT' && recipientData?.salary_amount && (
                  <p className="text-sm text-gray-600">
                    Monthly Salary: ₦{recipientData.salary_amount.toLocaleString()}
                  </p>
                )}
                {type === 'ADMISSION' && recipientData?.admission_number && (
                  <p className="text-sm text-gray-600">
                    Admission Number: {recipientData.admission_number}
                  </p>
                )}
              </div>

              <button
                onClick={generateLetter}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
              >
                ✨ Generate Letter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Letter Preview */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">📋 Letter Preview:</h3>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 max-h-96 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                  {generatedLetter}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold transition-all"
                >
                  📋 Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold transition-all"
                >
                  💾 Download
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-semibold transition-all"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setShareMode(shareMode ? null : 'whatsapp')}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold transition-all"
                >
                  💬 WhatsApp
                </button>
              </div>

              {/* Share via WhatsApp */}
              {shareMode === 'whatsapp' && (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={shareData.phoneNumber || (recipientData?.phone || '')}
                    onChange={(e) => setShareData({ ...shareData, phoneNumber: e.target.value })}
                    placeholder={recipientData?.phone ? `Use: ${recipientData.phone}` : "+234 801 234 5678 or 08012345678"}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleShareWhatsApp}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 transition-all"
                    >
                      {loading ? 'Sending...' : '✓ Send via WhatsApp'}
                    </button>
                    <button
                      onClick={() => setShareMode(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* More Actions */}
              <button
                onClick={() => setShareMode(shareMode === 'email' ? null : 'email')}
                className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold transition-all"
              >
                ✉️ Share via Email
              </button>

              {/* Share via Email */}
              {shareMode === 'email' && (
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={shareData.email}
                    onChange={(e) => setShareData({ ...shareData, email: e.target.value })}
                    placeholder="recipient@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleShareEmail}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400 transition-all"
                    >
                      {loading ? 'Sending...' : '✓ Send via Email'}
                    </button>
                    <button
                      onClick={() => setShareMode(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setGeneratedLetter('')
                    setShareMode(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
