'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { AcademicSessionService } from '@/services/academic-session.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import styles from './cbt-test-slots.module.css'

interface TestSlot {
  id: string
  test_number: number
  test_name: string
  test_type: 'CBT' | 'MANUAL'
  max_score: number
  cbt_exam_id?: string
  status: string
  created_at: string
}

interface TestScore {
  student_id: string
  admission_number: string
  user_id: string
  score: {
    id: string
    score: number
    max_score: number
    percentage: number
  } | null
}

interface Subject {
  id: string
  name: string
}

interface Class {
  id: string
  class_id: string
  arm_id: string
  classes?: { name: string }
  arms?: { name: string }
}

export default function CBTTestSlotsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Session & Term
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [loadingTerms, setLoadingTerms] = useState(false)

  // Subject & Class
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [loadingClasses, setLoadingClasses] = useState(false)

  // Test Slots
  const [testSlots, setTestSlots] = useState<TestSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Test Scores
  const [selectedSlot, setSelectedSlot] = useState<TestSlot | null>(null)
  const [studentScores, setStudentScores] = useState<TestScore[]>([])
  const [loadingScores, setLoadingScores] = useState(false)

  // New test slot form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTestForm, setNewTestForm] = useState({
    test_number: 1,
    test_name: '',
    test_type: 'MANUAL' as 'CBT' | 'MANUAL',
    max_score: 20,
    cbt_exam_id: '',
  })

  // Score editing
  const [editingScore, setEditingScore] = useState<{ student_id: string; score: number } | null>(null)

  // Initialize
  useEffect(() => {
    initialize()
  }, [])

  // Load sessions
  useEffect(() => {
    if (user?.school_id) {
      loadSessions()
    }
  }, [user?.school_id])

  // Load terms
  useEffect(() => {
    if (selectedSession) {
      loadTerms()
    }
  }, [selectedSession])

  // Load subjects
  useEffect(() => {
    if (selectedTerm && user?.school_id) {
      loadSubjects()
    }
  }, [selectedTerm, user?.school_id])

  // Load classes
  useEffect(() => {
    if (selectedSubject && user?.school_id) {
      loadClasses()
    }
  }, [selectedSubject, user?.school_id])

  // Load test slots
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      loadTestSlots()
    }
  }, [selectedClass, selectedSubject, selectedTerm])

  const initialize = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'TEACHER') {
        router.push('/auth/teacher/login')
        return
      }

      setUser(currentUser)
    } catch (err) {
      console.error('[CBT Test Slots] Init error:', err)
      toast.error('Failed to initialize')
      router.push('/landing')
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async () => {
    try {
      setLoadingSessions(true)
      const data = await AcademicSessionService.getAcademicSessions(user.school_id)
      setSessions(data)
      if (data.length > 0) {
        setSelectedSession(data[0].id)
      }
    } catch (err) {
      console.error('[CBT Test Slots] Load sessions error:', err)
      toast.error('Failed to load sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadTerms = async () => {
    try {
      setLoadingTerms(true)
      const data = await AcademicSessionService.getTerms(selectedSession)
      setTerms(data)
      if (data.length > 0) {
        setSelectedTerm(data[0].id)
      }
    } catch (err) {
      console.error('[CBT Test Slots] Load terms error:', err)
      toast.error('Failed to load terms')
    } finally {
      setLoadingTerms(false)
    }
  }

  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true)
      const { data, error } = await supabase
        .from('subject_teacher_assignments')
        .select('subjects(id, name)')
        .eq('teacher_id', user.id)
        .eq('school_id', user.school_id)

      if (error) throw error

      const uniqueSubjects = Array.from(
        new Map(data?.map((s: any) => [s.subjects.id, s.subjects]) || []).values()
      ) as Subject[]

      setSubjects(uniqueSubjects)
      if (uniqueSubjects.length > 0) {
        setSelectedSubject(uniqueSubjects[0].id)
      }
    } catch (err) {
      console.error('[CBT Test Slots] Load subjects error:', err)
      toast.error('Failed to load subjects')
    } finally {
      setLoadingSubjects(false)
    }
  }

  const loadClasses = async () => {
    try {
      setLoadingClasses(true)
      const { data, error } = await supabase
        .from('class_arm_combos')
        .select('id, class_id, arm_id, classes(name), arms(name)')
        .eq('school_id', user.school_id)

      if (error) throw error

      setClasses(data || [])
      if (data && data.length > 0) {
        setSelectedClass(data[0].id)
      }
    } catch (err) {
      console.error('[CBT Test Slots] Load classes error:', err)
      toast.error('Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }

  const loadTestSlots = async () => {
    try {
      setLoadingSlots(true)
      const response = await fetch(
        `/api/teacher/cbt-test-slots?school_id=${user.school_id}&subject_id=${selectedSubject}&class_arm_combo_id=${selectedClass}&term_id=${selectedTerm}`
      )

      if (!response.ok) throw new Error('Failed to load test slots')

      const data = await response.json()
      setTestSlots(data.slots || [])
      setSelectedSlot(null)
      setStudentScores([])
    } catch (err) {
      console.error('[CBT Test Slots] Load slots error:', err)
      toast.error('Failed to load test slots')
    } finally {
      setLoadingSlots(false)
    }
  }

  const loadStudentScores = async (slot: TestSlot) => {
    try {
      setLoadingScores(true)
      setSelectedSlot(slot)

      const response = await fetch(
        `/api/teacher/cbt-test-scores?test_slot_id=${slot.id}&class_arm_combo_id=${selectedClass}`
      )

      if (!response.ok) throw new Error('Failed to load scores')

      const data = await response.json()
      setStudentScores(data.scores || [])
    } catch (err) {
      console.error('[CBT Test Slots] Load scores error:', err)
      toast.error('Failed to load student scores')
    } finally {
      setLoadingScores(false)
    }
  }

  const handleCreateTestSlot = async () => {
    try {
      if (!newTestForm.test_name) {
        toast.error('Enter test name')
        return
      }

      const response = await fetch('/api/teacher/cbt-test-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          subject_id: selectedSubject,
          class_arm_combo_id: selectedClass,
          term_id: selectedTerm,
          test_number: newTestForm.test_number,
          test_name: newTestForm.test_name,
          test_type: newTestForm.test_type,
          max_score: newTestForm.max_score,
          cbt_exam_id: newTestForm.cbt_exam_id || null,
          created_by: user.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success(`✅ Test slot ${newTestForm.test_number} created`)
      setShowCreateForm(false)
      setNewTestForm({
        test_number: 1,
        test_name: '',
        test_type: 'MANUAL',
        max_score: 20,
        cbt_exam_id: '',
      })
      loadTestSlots()
    } catch (err) {
      console.error('[CBT Test Slots] Create error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create test slot')
    }
  }

  const handleDeleteTestSlot = async (slotId: string) => {
    if (!confirm('Delete this test slot? All associated scores will be removed.')) return

    try {
      const response = await fetch(`/api/teacher/cbt-test-slots/${slotId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('✅ Test slot deleted')
      loadTestSlots()
    } catch (err) {
      console.error('[CBT Test Slots] Delete error:', err)
      toast.error('Failed to delete test slot')
    }
  }

  const handleSaveScore = async (studentId: string) => {
    if (!selectedSlot || editingScore?.score === undefined) return

    try {
      const response = await fetch('/api/teacher/cbt-test-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: user.school_id,
          student_id: studentId,
          test_slot_id: selectedSlot.id,
          score: editingScore.score,
          max_score: selectedSlot.max_score,
          entered_by: user.id,
          source: 'MANUAL',
        }),
      })

      if (!response.ok) throw new Error('Failed to save score')

      toast.success('✅ Score saved')
      setEditingScore(null)
      loadStudentScores(selectedSlot)
    } catch (err) {
      console.error('[CBT Test Slots] Save score error:', err)
      toast.error('Failed to save score')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const selectedSubjectName = subjects.find((s) => s.id === selectedSubject)?.name || 'Subject'
  const selectedClassName = classes.find((c) => c.id === selectedClass)
    ? `${classes.find((c) => c.id === selectedClass)?.classes?.name} ${classes.find((c) => c.id === selectedClass)?.arms?.name}`
    : 'Class'

  return (
    <div className={styles.container}>
      <h1>📝 CBT Test Slot Management</h1>

      {/* Selection Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Session</label>
          <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} disabled={loadingSessions}>
            {loadingSessions ? (
              <option>Loading sessions...</option>
            ) : sessions.length === 0 ? (
              <option>No sessions available</option>
            ) : (
              sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.session_year}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Term</label>
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} disabled={loadingTerms || !selectedSession}>
            {loadingTerms ? (
              <option>Loading terms...</option>
            ) : terms.length === 0 ? (
              <option>No terms available</option>
            ) : (
              terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.term_name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={loadingSubjects || !selectedTerm}>
            {loadingSubjects ? (
              <option>Loading subjects...</option>
            ) : subjects.length === 0 ? (
              <option>No subjects available</option>
            ) : (
              subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={loadingClasses || !selectedSubject}>
            {loadingClasses ? (
              <option>Loading classes...</option>
            ) : classes.length === 0 ? (
              <option>No classes available</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.classes?.name} {c.arms?.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Test Slots Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>
            Test Slots for {selectedSubjectName} - {selectedClassName}
          </h2>
          <button className={styles.btnCreate} onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? '❌ Cancel' : '➕ Add Test Slot'}
          </button>
        </div>

        {/* Create New Test Slot Form */}
        {showCreateForm && (
          <div className={styles.createForm}>
            <h3>Create New Test Slot</h3>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Test Number (1-4)</label>
                <select
                  value={newTestForm.test_number}
                  onChange={(e) => setNewTestForm({ ...newTestForm, test_number: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      Test {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Test Name</label>
                <input
                  type="text"
                  placeholder="e.g., Mid-term Assessment"
                  value={newTestForm.test_name}
                  onChange={(e) => setNewTestForm({ ...newTestForm, test_name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Test Type</label>
                <select
                  value={newTestForm.test_type}
                  onChange={(e) => setNewTestForm({ ...newTestForm, test_type: e.target.value as 'CBT' | 'MANUAL' })}
                >
                  <option value="MANUAL">Manual Entry</option>
                  <option value="CBT">CBT Exam</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Max Score</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTestForm.max_score}
                  onChange={(e) => setNewTestForm({ ...newTestForm, max_score: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <button className={styles.btnSubmit} onClick={handleCreateTestSlot}>
              Create Test Slot
            </button>
          </div>
        )}

        {/* Test Slots List */}
        {loadingSlots ? (
          <div className={styles.loading}>Loading test slots...</div>
        ) : testSlots.length === 0 ? (
          <p className={styles.noData}>No test slots created yet. Create one to get started.</p>
        ) : (
          <div className={styles.slotsGrid}>
            {testSlots.map((slot) => (
              <div
                key={slot.id}
                className={`${styles.slotCard} ${selectedSlot?.id === slot.id ? styles.active : ''}`}
              >
                <div className={styles.slotHeader}>
                  <h4>Test {slot.test_number}: {slot.test_name}</h4>
                  <button
                    className={styles.btnDelete}
                    onClick={() => handleDeleteTestSlot(slot.id)}
                    title="Delete test slot"
                  >
                    🗑️
                  </button>
                </div>

                <div className={styles.slotInfo}>
                  <p>
                    <strong>Type:</strong> {slot.test_type}
                  </p>
                  <p>
                    <strong>Max Score:</strong> {slot.max_score}
                  </p>
                </div>

                <button
                  className={styles.btnViewScores}
                  onClick={() => loadStudentScores(slot)}
                >
                  📊 View Scores ({studentScores.length})
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Scores Section */}
      {selectedSlot && (
        <div className={styles.section}>
          <h2>
            📋 Student Scores - Test {selectedSlot.test_number}: {selectedSlot.test_name}
          </h2>

          {loadingScores ? (
            <div className={styles.loading}>Loading scores...</div>
          ) : (
            <div className={styles.scoresTable}>
              <table>
                <thead>
                  <tr>
                    <th>Admission No.</th>
                    <th>Score</th>
                    <th>Max</th>
                    <th>%</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentScores.map((studentScore) => (
                    <tr key={studentScore.student_id}>
                      <td>{studentScore.admission_number}</td>
                      <td>
                        {editingScore?.student_id === studentScore.student_id ? (
                          <input
                            type="number"
                            min="0"
                            max={selectedSlot.max_score}
                            value={editingScore.score}
                            onChange={(e) =>
                              setEditingScore({ ...editingScore, score: parseFloat(e.target.value) })
                            }
                            className={styles.scoreInput}
                          />
                        ) : (
                          studentScore.score?.score || '-'
                        )}
                      </td>
                      <td>{selectedSlot.max_score}</td>
                      <td>{studentScore.score ? studentScore.score.percentage.toFixed(1) : '-'}%</td>
                      <td>
                        {editingScore?.student_id === studentScore.student_id ? (
                          <>
                            <button
                              className={styles.btnSmall}
                              onClick={() => handleSaveScore(studentScore.student_id)}
                            >
                              ✅ Save
                            </button>
                            <button
                              className={styles.btnSmall}
                              onClick={() => setEditingScore(null)}
                            >
                              ❌ Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className={styles.btnSmall}
                            onClick={() =>
                              setEditingScore({ student_id: studentScore.student_id, score: studentScore.score?.score || 0 })
                            }
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
