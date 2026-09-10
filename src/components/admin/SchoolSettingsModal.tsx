'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'

interface SchoolSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  schoolId: string
  schoolData?: any
  onUpdate?: () => void
}

export default function SchoolSettingsModal({
  isOpen,
  onClose,
  schoolId,
  schoolData,
  onUpdate,
}: SchoolSettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'conduct' | 'vision'>('general')

  const [formData, setFormData] = useState({
    schoolMotto: '',
    schoolVision: '',
    schoolMission: '',
    codeOfConductUrl: '',
    codeOfConductText: '',
  })

  useEffect(() => {
    if (isOpen && schoolData) {
      setFormData({
        schoolMotto: schoolData.school_motto || '',
        schoolVision: schoolData.school_vision || '',
        schoolMission: schoolData.school_mission || '',
        codeOfConductUrl: schoolData.code_of_conduct_url || '',
        codeOfConductText: schoolData.code_of_conduct_text || '',
      })
    }
  }, [isOpen, schoolData])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          school_motto: formData.schoolMotto || null,
          school_vision: formData.schoolVision || null,
          school_mission: formData.schoolMission || null,
          code_of_conduct_url: formData.codeOfConductUrl || null,
          code_of_conduct_text: formData.codeOfConductText || null,
        })
        .eq('id', schoolId)

      if (updateError) throw updateError

      setSuccess('School settings updated successfully!')
      setTimeout(() => {
        if (onUpdate) onUpdate()
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update school settings')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white sticky top-0 flex justify-between items-center">
          <h3 className="text-2xl font-bold">⚙️ School Settings & Code of Conduct</h3>
          <button onClick={onClose} className="text-2xl font-bold hover:opacity-80">
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded text-green-700">
              {success}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'general'
                  ? 'border-b-4 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 General Info
            </button>
            <button
              onClick={() => setActiveTab('vision')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'vision'
                  ? 'border-b-4 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎯 Vision & Mission
            </button>
            <button
              onClick={() => setActiveTab('conduct')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'conduct'
                  ? 'border-b-4 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📘 Code of Conduct
            </button>
          </div>

          {/* General Info Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Motto
                </label>
                <input
                  type="text"
                  name="schoolMotto"
                  value={formData.schoolMotto}
                  onChange={handleInputChange}
                  placeholder="e.g., Excellence, Integrity, Service"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This motto will appear in generated letters
                </p>
              </div>
            </div>
          )}

          {/* Vision & Mission Tab */}
          {activeTab === 'vision' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Vision
                </label>
                <textarea
                  name="schoolVision"
                  value={formData.schoolVision}
                  onChange={handleInputChange}
                  placeholder="Enter your school's vision statement..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be included in admission letters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Mission
                </label>
                <textarea
                  name="schoolMission"
                  value={formData.schoolMission}
                  onChange={handleInputChange}
                  placeholder="Enter your school's mission statement..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be included in admission letters
                </p>
              </div>
            </div>
          )}

          {/* Code of Conduct Tab */}
          {activeTab === 'conduct' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code of Conduct URL
                </label>
                <input
                  type="url"
                  name="codeOfConductUrl"
                  value={formData.codeOfConductUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/code-of-conduct"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to your code of conduct document (optional)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code of Conduct Text (Key Points)
                </label>
                <textarea
                  name="codeOfConductText"
                  value={formData.codeOfConductText}
                  onChange={handleInputChange}
                  placeholder={`Example:
1. Students must wear complete school uniform
2. Mobile phones are not allowed in class
3. Respect for staff and fellow students is mandatory
4. Academic integrity: No cheating or plagiarism
5. Violence or bullying will result in immediate suspension
6. Punctuality and regular attendance are required
7. Students must follow school security protocols`}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Key points from your code of conduct. These will be included in admission letters.
                  Use numbered format as shown above.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">💡 Preview</h4>
                <p className="text-sm text-blue-800">
                  This text will appear in all student admission letters generated from this school.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t flex gap-4 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold transition disabled:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition disabled:bg-gray-400"
            >
              {loading ? '⏳ Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
