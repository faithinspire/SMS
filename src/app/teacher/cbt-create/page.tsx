'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'

export default function CBTCreatePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    class_arm_combo_id: '',
    term_id: '',
    exam_type: 'TEST' as 'TEST' | 'EXAM',
    duration_minutes: '60',
    total_marks: '100',
    passing_percentage: '50',
  })

  // Dropdown data
  const [subjects, setSubjects] = useState<any[]>([])
  const [classArms, setClassArms] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Check auth
        const currentUser = await AuthService.getCurrentUser()
        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Load subjects
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('id, name')
          .eq('school_id', currentUser.school_id)
          .order('name')

        if (subjectsData) setSubjects(subjectsData)

        // Load class arms
        const { data: classArmsData } = await supabase
          .from('class_arm_combos')
          .select('id, classes(name), arms(name)')
          .eq('school_id', currentUser.school_id)
          .order('created_at')

        if (classArmsData) {
          const formatted = classArmsData.map((ca: any) => ({
            id: ca.id,
            name: `${ca.classes?.name || 'Unknown'} - ${ca.arms?.name || 'Unknown'}`,
          }))
          setClassArms(formatted)
        }

        // ✅ CRITICAL: Load terms from database
        console.log(`Loading terms for school: ${currentUser.school_id}`)
        const { data: termsData, error: termsError } = await supabase
          .from('terms')
          .select('id, name')
          .eq('school_id', currentUser.school_id)
          .order('created_at')

        if (termsError) {
          console.error('Terms error:', termsError)
        } else {
          console.log(`✅ Loaded ${termsData?.length || 0} terms:`, termsData)
          if (termsData && termsData.length > 0) {
            setTerms(termsData)
          } else {
            console.warn('No terms found for this school')
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load data')
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!formData.title || !formData.subject_id || !formData.class_arm_combo_id || !formData.term_id) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Direct Supabase insert
      const { error: insertError } = await supabase.from('cbt_exams').insert({
        school_id: user.school_id,
        subject_id: formData.subject_id,
        class_arm_combo_id: formData.class_arm_combo_id,
        term_id: formData.term_id,
        created_by: user.id,
        title: formData.title,
        exam_type: formData.exam_type,
        duration_minutes: parseInt(formData.duration_minutes),
        total_marks: parseInt(formData.total_marks),
        passing_percentage: parseInt(formData.passing_percentage),
        status: 'DRAFT',
      })

      if (insertError) {
        throw insertError
      }

      setSuccess('✅ CBT created successfully!')
      setFormData({
        title: '',
        subject_id: '',
        class_arm_combo_id: '',
        term_id: '',
        exam_type: 'TEST',
        duration_minutes: '60',
        total_marks: '100',
        passing_percentage: '50',
      })

      setTimeout(() => {
        router.push('/teacher/cbt')
      }, 2000)
    } catch (err: any) {
      console.error('Error creating CBT:', err)
      setError(`Error: ${err.message || 'Failed to create CBT'}`)
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create CBT Exam</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
          {/* Title */}
          <div>
            <label className="block font-semibold mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Mathematics Test 1"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block font-semibold mb-1">Subject *</label>
            <select
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Class */}
          <div>
            <label className="block font-semibold mb-1">Class *</label>
            <select
              value={formData.class_arm_combo_id}
              onChange={(e) => setFormData({ ...formData, class_arm_combo_id: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select class</option>
              {classArms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Term - ✅ SIMPLE DIRECT RENDERING */}
          <div>
            <label className="block font-semibold mb-1">Academic Term *</label>
            <select
              value={formData.term_id}
              onChange={(e) => setFormData({ ...formData, term_id: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select term</option>
              {terms.length > 0 ? (
                terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              ) : (
                <option disabled>No terms available</option>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {terms.length > 0 ? `${terms.length} terms loaded` : '⚠️ No terms found - check database'}
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block font-semibold mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          {/* Total Marks */}
          <div>
            <label className="block font-semibold mb-1">Total Marks</label>
            <input
              type="number"
              value={formData.total_marks}
              onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          {/* Passing Percentage */}
          <div>
            <label className="block font-semibold mb-1">Passing Percentage (%)</label>
            <input
              type="number"
              value={formData.passing_percentage}
              onChange={(e) => setFormData({ ...formData, passing_percentage: e.target.value })}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create CBT Exam'}
          </button>
        </form>
      </div>
    </div>
  )
}
