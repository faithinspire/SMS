'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'

interface Subject {
  id: string
  name: string
}

interface ClassArm {
  id: string
  name: string
}

interface Term {
  id: string
  name: string
}

interface Question {
  id: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY'
  text: string
  marks: number
}

export default function CBTPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state - NEW: Added Term and Assessment Type dropdowns
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    class_arm_combo_id: '',
    term_id: '', // ✅ NEW FIELD
    assessment_type: 'CA1', // ✅ NEW FIELD - CA1/CA2/CA3/CA4/EXAM
    exam_type: 'TEST' as 'TEST' | 'EXAM',
    test_number: '1',
    start_time: '',
    end_time: '',
    duration_minutes: '60',
    total_marks: '100',
    passing_percentage: '50',
  })

  // Dropdown data
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classArms, setClassArms] = useState<ClassArm[]>([])
  const [terms, setTerms] = useState<Term[]>([]) // ✅ NEW: Terms list
  const [submitting, setSubmitting] = useState(false)

  // Load user and school
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        if (currentUser.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('*')
            .eq('id', currentUser.school_id)
            .single()
          setSchool(schoolData)

          // Load subjects
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('id, name')
            .eq('school_id', currentUser.school_id)
            .order('name')

          if (subjectsData) {
            setSubjects(subjectsData as Subject[])
          }

          // Load class arms
          const { data: classArmsData } = await supabase
            .from('class_arm_combos')
            .select(`id, classes(name), arms(name)`)
            .eq('school_id', currentUser.school_id)
            .order('created_at')

          if (classArmsData) {
            const formatted = classArmsData.map((ca: any) => ({
              id: ca.id,
              name: `${ca.classes?.name || 'Unknown'} - ${ca.arms?.name || 'Unknown'}`,
            }))
            setClassArms(formatted)
          }

          // ✅ NEW: Load terms from database - try 'terms' table first (canonical)
          const { data: termsData, error: termsError } = await supabase
            .from('terms')
            .select('id, name')
            .eq('school_id', currentUser.school_id)
            .order('created_at', { ascending: false })

          if (termsError) {
            console.error('Error loading terms:', termsError)
          }

          if (termsData && termsData.length > 0) {
            console.log(`✅ Loaded ${termsData.length} terms from 'terms' table`)
            setTerms(termsData as Term[])
          } else {
            console.warn('⚠️ No terms found in database for school:', currentUser.school_id)
            // Don't try academic_terms - use canonical terms table only
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/landing')
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ Validate that Term and Assessment Type are selected
    if (!formData.term_id) {
      setError('Please select an academic term')
      return
    }

    if (!formData.assessment_type) {
      setError('Please select an assessment type')
      return
    }

    if (!formData.subject_id || !formData.class_arm_combo_id) {
      setError('Please select subject and class')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Use the API endpoint instead of direct Supabase insert
      const response = await fetch('/api/cbt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: school?.id || user?.school_id,
          subject_id: formData.subject_id,
          class_arm_combo_id: formData.class_arm_combo_id,
          term_id: formData.term_id,
          title: formData.title,
          description: formData.description,
          exam_type: formData.exam_type,
          test_number: parseInt(formData.test_number),
          start_time: formData.start_time,
          end_time: formData.end_time,
          duration_minutes: parseInt(formData.duration_minutes),
          total_marks: parseInt(formData.total_marks),
          passing_percentage: parseInt(formData.passing_percentage),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create exam')
      }

      setSuccess('CBT created successfully!')
      setFormData({
        title: '',
        description: '',
        subject_id: '',
        class_arm_combo_id: '',
        term_id: '',
        assessment_type: 'CA1',
        exam_type: 'TEST',
        test_number: '1',
        start_time: '',
        end_time: '',
        duration_minutes: '60',
        total_marks: '100',
        passing_percentage: '50',
      })
      setShowForm(false)
    } catch (err: any) {
      console.error('Error creating CBT:', err)
      setError(err.message || 'Failed to create CBT')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💻 CBT Management</h1>
        <p className="text-gray-600 mb-6">Create and manage computer-based tests</p>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
            {success}
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? '✕ Cancel' : '+ Create New Exam'}
        </button>

        {/* Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
            <h2 className="text-2xl font-bold mb-6">Create Computer-Based Test</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Title and Exam Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Chemistry Test 1"
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Exam Type</label>
                  <select
                    value={formData.exam_type}
                    onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as 'TEST' | 'EXAM' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TEST">Test</option>
                    <option value="EXAM">Exam</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Subject and Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Class *</label>
                  <select
                    value={formData.class_arm_combo_id}
                    onChange={(e) => setFormData({ ...formData, class_arm_combo_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select class</option>
                    {classArms.map((ca) => (
                      <option key={ca.id} value={ca.id}>
                        {ca.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ✅ NEW ROW: Academic Term and Assessment Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded border border-blue-200">
                <div>
                  <label className="block text-sm font-semibold mb-2">Academic Term *</label>
                  <select
                    value={formData.term_id}
                    onChange={(e) => setFormData({ ...formData, term_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">Select term</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {terms.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ No terms found. Check database.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Assessment Type *</label>
                  <select
                    value={formData.assessment_type}
                    onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="CA1">CA1 - Continuous Assessment 1</option>
                    <option value="CA2">CA2 - Continuous Assessment 2</option>
                    <option value="CA3">CA3 - Continuous Assessment 3</option>
                    <option value="CA4">CA4 - Continuous Assessment 4</option>
                    <option value="EXAM">EXAM - Final Exam</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Duration and Test Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Test Number</label>
                  <input
                    type="number"
                    value={formData.test_number}
                    onChange={(e) => setFormData({ ...formData, test_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>

              {/* Row 4: Total Marks and Passing Percentage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Total Marks</label>
                  <input
                    type="number"
                    value={formData.total_marks}
                    onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Passing Percentage (%)</label>
                  <input
                    type="number"
                    value={formData.passing_percentage}
                    onChange={(e) => setFormData({ ...formData, passing_percentage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Row 5: Start and End Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Test instructions..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create CBT'}
              </button>
            </form>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-blue-700">
          <p className="text-sm">
            ✅ <strong>NEW:</strong> Academic Term and Assessment Type dropdowns are now available above. These are required for linking CBT scores to scoresheets.
          </p>
        </div>
      </div>
    </div>
  )
}
