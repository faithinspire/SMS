'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { AcademicSessionService } from '@/services/academic-session.service'
import { supabase } from '@/lib/supabase-client'
import { TeacherContextService } from '@/services/teacher-context.service'
import { User, School } from '@/types'

interface CBTExam {
  id: string
  title: string
  subject_id: string
  class_arm_combo_id: string
  exam_type: 'TEST' | 'EXAM'
  duration_minutes: number
  total_marks: number
  passing_percentage: number
  start_time: string
  end_time: string
  created_at: string
}

interface CBTQuestion {
  id: string
  question_text: string
  question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY'
  marks: number
  options: Array<{ id: string; option_text: string; is_correct: boolean }>
}

export default function CBTManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // List view
  const [cbts, setCBTs] = useState<CBTExam[]>([])
  const [loadingCBTs, setLoadingCBTs] = useState(false)

  // Sessions and Terms
  const [sessions, setSessions] = useState<Array<{ id: string; session_year: string }>>([])
  const [terms, setTerms] = useState<Array<{ id: string; term_name: string }>>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])

  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    class_arm_combo_id: '',
    session_id: '',
    term_id: '',
    exam_type: 'TEST' as 'TEST' | 'EXAM',
    duration_minutes: 60,
    total_marks: 100,
    passing_percentage: 40,
    start_time: '',
    end_time: '',
    questions: [] as Array<{
      question_text: string
      question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY'
      marks: number
      options: Array<{ text: string; isCorrect: boolean }>
    }>,
  })

  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    question_type: 'MULTIPLE_CHOICE' as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY',
    marks: 1,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  })

  const [submitting, setSubmitting] = useState(false)

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true)

        const currentUser = await AuthService.getCurrentUser()
        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/auth/teacher/login')
          return
        }

        setUser(currentUser)

        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)

        // Get teacher context
        const context = await TeacherContextService.getCurrentTeacherContext()

        const subjectsFormatted = context.taughtSubjects.map((s) => ({
          id: s.subject_id,
          name: s.name,
        }))

        // Get ALL classes in the school, not just teacher's assigned classes
        const { data: allClasses, error: classError } = await supabase
          .from('class_arm_combos')
          .select('id, classes(name), arms(name)')
          .eq('school_id', currentUser.school_id)
          .order('classes(name), arms(name)', { ascending: true })

        if (classError) {
          console.error('[CBT] Error loading classes:', classError)
        }

        const classesFormatted = (allClasses || []).map((c: any) => ({
          id: c.id,
          name: `${c.classes?.name || 'Unknown'} - ${c.arms?.name || 'Unknown'}`,
        }))

        setSubjects(subjectsFormatted)
        setClasses(classesFormatted)

        // Load CBTs - pass userId to avoid async state timing issue
        await loadCBTs(currentUser.school_id, currentUser.id)
        
        // Load sessions and terms
        await loadSessions(currentUser.school_id)
      } catch (err) {
        console.error('[CBT] Error initializing:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize')
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [router])

  const loadCBTs = async (schoolId: string, userId?: string) => {
    try {
      setLoadingCBTs(true)

      // Use userId param if provided (during init), otherwise use state
      const teacherId = userId || user?.id
      
      if (!teacherId) {
        setError('Teacher ID not found')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('cbt_exams')
        .select('id, title, subject_id, class_arm_combo_id, exam_type, duration_minutes, total_marks, passing_percentage, start_time, end_time, created_at')
        .eq('school_id', schoolId)
        .eq('created_by', teacherId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setCBTs(data || [])
    } catch (err) {
      console.error('[CBT] Error loading CBTs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load CBTs')
    } finally {
      setLoadingCBTs(false)
    }
  }

  const loadSessions = async (schoolId: string) => {
    try {
      setLoadingSessions(true)
      console.log('[CBT] Loading sessions for school:', schoolId)
      
      const sessionsData = await AcademicSessionService.getAcademicSessions(schoolId)
      console.log('[CBT] Sessions loaded:', sessionsData.length)
      
      setSessions(sessionsData)

      // If sessions exist, auto-select first and load its terms
      if (sessionsData.length > 0) {
        const firstSession = sessionsData[0]
        console.log('[CBT] Auto-selecting session:', firstSession.session_year)
        setFormData((prev) => ({
          ...prev,
          session_id: firstSession.id,
        }))
        
        // Load terms for this session
        const termsData = await AcademicSessionService.getTerms(firstSession.id)
        console.log('[CBT] Terms loaded:', termsData.length)
        setTerms(termsData)
        
        // Auto-select first term
        if (termsData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            term_id: termsData[0].id,
          }))
        }
      }
    } catch (err) {
      console.error('[CBT] Error loading sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleSessionChange = async (sessionId: string) => {
    setFormData((prev) => ({
      ...prev,
      session_id: sessionId,
      term_id: '', // Reset term when session changes
    }))

    if (sessionId) {
      try {
        const termsData = await AcademicSessionService.getTerms(sessionId)
        setTerms(termsData)

        // Auto-select first term
        if (termsData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            term_id: termsData[0].id,
          }))
        }
      } catch (err) {
        console.error('[CBT] Error loading terms:', err)
      }
    }
  }

  const addQuestion = () => {
    if (!currentQuestion.question_text.trim()) {
      setError('Question text is required')
      return
    }

    if (currentQuestion.question_type === 'MULTIPLE_CHOICE' || currentQuestion.question_type === 'TRUE_FALSE') {
      const hasValidOptions = currentQuestion.options.some((opt) => opt.text.trim() && opt.isCorrect) &&
        currentQuestion.options.some((opt) => opt.text.trim() && !opt.isCorrect)

      if (!hasValidOptions) {
        setError('Provide at least one correct and one incorrect option')
        return
      }
    }

    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, currentQuestion],
    }))

    setCurrentQuestion({
      question_text: '',
      question_type: 'MULTIPLE_CHOICE',
      marks: 1,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    })

    setError(null)
  }

  const removeQuestion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }))
  }

  const handleCreateCBT = async () => {
    try {
      if (submitting) {
        console.warn('[CBT] Submission already in progress - ignoring duplicate submission')
        return
      }

      setSubmitting(true)
      setError(null)

      if (!user || !school) {
        setError('User or school not found')
        return
      }

      if (!formData.title || !formData.subject_id || !formData.class_arm_combo_id || !formData.term_id || formData.questions.length === 0) {
        setError('Fill in all required fields (including term) and add at least one question')
        return
      }

      if (!formData.start_time || !formData.end_time) {
        setError('Please set start and end times for the exam')
        return
      }

      // Validate that end time is after start time
      const startTime = new Date(formData.start_time)
      const endTime = new Date(formData.end_time)
      if (endTime <= startTime) {
        setError('End time must be after start time')
        return
      }

      console.log('[CBT] Attempting to create CBT with:', {
        school_id: user.school_id,
        subject_id: formData.subject_id,
        class_arm_combo_id: formData.class_arm_combo_id,
        teacher_id: user.id,
        term_id: formData.term_id,
        title: formData.title,
      })

      // Create CBT exam using API endpoint
      const createResponse = await fetch('/api/teacher/cbt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          subject_id: formData.subject_id,
          class_arm_combo_id: formData.class_arm_combo_id,
          teacher_id: user.id,
          term_id: formData.term_id,
          title: formData.title,
          assessment_type: 'CA1',
          description: formData.title,
          duration_minutes: formData.duration_minutes,
          total_marks: formData.total_marks,
          passing_percentage: formData.passing_percentage,
        }),
      })

      const responseText = await createResponse.text()
      console.log('[CBT] Response status:', createResponse.status)
      console.log('[CBT] Response text:', responseText)

      if (!createResponse.ok) {
        try {
          const errorData = JSON.parse(responseText)
          setError(`❌ Error: ${errorData.error || responseText}`)
          console.error('[CBT] API Error Details:', errorData)
        } catch {
          setError(`❌ Error: ${responseText || `HTTP ${createResponse.status}`}`)
        }
        setSubmitting(false)
        return
      }

      let examData
      try {
        const responseData = JSON.parse(responseText)
        examData = responseData.exam
      } catch {
        setError('❌ Invalid response from server')
        setSubmitting(false)
        return
      }

      if (!examData?.id) {
        setError('❌ No exam ID returned')
        setSubmitting(false)
        return
      }

      const examId = examData.id
      console.log('[CBT] Exam created with ID:', examId)

      // Batch insert all questions at once instead of one by one
      const questionsToInsert = formData.questions.map((question, qIndex) => ({
        school_id: user.school_id,
        cbt_exam_id: examId,
        question_type: question.question_type,
        question_text: question.question_text,
        marks: question.marks,
        display_order: qIndex + 1,
      }))

      console.log(`[CBT] Inserting ${questionsToInsert.length} questions`)
      const { data: questionsData, error: questionsError } = await supabase
        .from('cbt_questions')
        .insert(questionsToInsert)
        .select()

      if (questionsError) throw questionsError
      if (!questionsData) throw new Error('No question data returned')

      console.log(`[CBT] Questions inserted successfully: ${questionsData.length}`)

      // Now batch insert all options
      const optionsToInsert: any[] = []
      formData.questions.forEach((question, qIndex) => {
        const createdQuestion = questionsData[qIndex]
        if (!createdQuestion) {
          console.warn(`[CBT] No created question at index ${qIndex}`)
          return
        }

        question.options
          .filter((opt) => opt.text.trim())
          .forEach((opt, optIndex) => {
            optionsToInsert.push({
              question_id: createdQuestion.id,
              option_text: opt.text,
              is_correct: opt.isCorrect,
              display_order: optIndex + 1,
              option_key: String.fromCharCode(65 + optIndex), // A, B, C, D, etc.
            })
          })
      })

      if (optionsToInsert.length > 0) {
        console.log(`[CBT] Inserting ${optionsToInsert.length} options`)
        const { error: optionsError } = await supabase.from('cbt_options').insert(optionsToInsert)
        if (optionsError) throw optionsError
      }

      // Reset form
      setFormData({
        title: '',
        subject_id: '',
        class_arm_combo_id: '',
        session_id: '',
        term_id: '',
        exam_type: 'TEST',
        duration_minutes: 60,
        total_marks: 100,
        passing_percentage: 40,
        start_time: '',
        end_time: '',
        questions: [],
      })

      setShowCreateForm(false)
      await loadCBTs(user.school_id)

      // Show success
      const el = document.createElement('div')
      el.textContent = `✅ CBT "${formData.title}" created with ${formData.questions.length} questions`
      el.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg'
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 3000)
    } catch (err) {
      console.error('[CBT] Error creating:', err)
      setError(err instanceof Error ? err.message : 'Error creating CBT')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error loading data</p>
          <button
            onClick={() => router.push('/auth/teacher/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🧪 CBT Management</h1>
              <p className="text-gray-600 mt-1">Create and manage computer-based tests</p>
              <p className="text-sm text-gray-500 mt-2">{school.name}</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {showCreateForm ? 'Cancel' : '+ Create New CBT'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {showCreateForm ? (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">CBT Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                  <select
                    value={formData.exam_type}
                    onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TEST">Test</option>
                    <option value="EXAM">Exam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                  <select
                    value={formData.class_arm_combo_id}
                    onChange={(e) => setFormData({ ...formData, class_arm_combo_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Session * {loadingSessions && <span className="text-xs text-gray-500">(Loading...)</span>}</label>
                  <select
                    value={formData.session_id}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    disabled={loadingSessions || sessions.length === 0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select session</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.session_year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term * {!formData.session_id && <span className="text-xs text-gray-500">(Select session first)</span>}</label>
                  <select
                    value={formData.term_id}
                    onChange={(e) => setFormData({ ...formData, term_id: e.target.value })}
                    disabled={!formData.session_id || terms.length === 0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select term</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.term_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passing Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passing_percentage}
                    onChange={(e) => setFormData({ ...formData, passing_percentage: parseInt(e.target.value) || 40 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Questions ({formData.questions.length})</h2>

              {formData.questions.length > 0 && (
                <div className="space-y-2">
                  {formData.questions.map((q, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Q{idx + 1}. {q.question_text}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Type: {q.question_type} | Marks: {q.marks}
                        </p>
                      </div>
                      <button
                        onClick={() => removeQuestion(idx)}
                        className="ml-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-gray-900">Add Question</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
                  <textarea
                    value={currentQuestion.question_text}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={currentQuestion.question_type}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      <option value="TRUE_FALSE">True/False</option>
                      <option value="THEORY">Theory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                    <input
                      type="number"
                      min="1"
                      value={currentQuestion.marks}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {(currentQuestion.question_type === 'MULTIPLE_CHOICE' || currentQuestion.question_type === 'TRUE_FALSE') && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Options * (select correct answer)</label>
                    {currentQuestion.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={opt.isCorrect}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options]
                            newOptions[idx].isCorrect = e.target.checked
                            setCurrentQuestion({ ...currentQuestion, options: newOptions })
                          }}
                          className="w-4 h-4"
                        />
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          value={opt.text}
                          onChange={(e) => {
                            const newOptions = [...currentQuestion.options]
                            newOptions[idx].text = e.target.value
                            setCurrentQuestion({ ...currentQuestion, options: newOptions })
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={addQuestion}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Add Question
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleCreateCBT}
              disabled={submitting || formData.questions.length === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create CBT Exam'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {loadingCBTs ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">Loading CBTs...</p>
              </div>
            ) : cbts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cbts.map((cbt) => (
                  <div key={cbt.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{cbt.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{cbt.exam_type}</p>
                    <div className="space-y-2 text-sm text-gray-700 mb-4">
                      <p>Duration: {cbt.duration_minutes} mins</p>
                      <p>Total Marks: {cbt.total_marks}</p>
                      <p>Passing: {cbt.passing_percentage}%</p>
                    </div>
                    <button
                      onClick={() => router.push(`/teacher/cbt-management/${cbt.id}`)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      View / Edit
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600 mb-4">No CBT exams created yet</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Your First CBT
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
