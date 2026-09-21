'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StaffHeader from '@/components/StaffHeader'
import styles from './lesson-notes.module.css'

interface LessonNote {
  id: string
  topic: string
  content_summary: string
  status: string
  submitted_at: string
  reviewed_at?: string
  reviewer_feedback?: string
  teacher: {
    id: string
    full_name: string
    email: string
  }
  subject: {
    id: string
    name: string
    code: string
  }
  class_arm: {
    class_name: string
    arm_name: string
  }
}

interface FilterCriteria {
  status: string
}

export default function SchoolAdminLessonNotesPage() {
  const router = useRouter()
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([])
  const [filteredNotes, setFilteredNotes] = useState<LessonNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterCriteria>({
    status: 'SUBMITTED',
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadLessonNotes = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get user data from localStorage
        const userDataStr = localStorage.getItem('userData')
        if (!userDataStr) {
          router.push('/auth/school-admin/login')
          return
        }

        const userData = JSON.parse(userDataStr)
        const { school_id: schoolId, id: adminId } = userData

        if (!schoolId || !adminId) {
          setError('Missing user information')
          return
        }

        // Fetch lesson notes
        const response = await fetch(
          `/api/school-admin/lessons/pending?school_id=${schoolId}&admin_id=${adminId}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch lesson notes')
        }

        const data = await response.json()
        setLessonNotes(data.lesson_notes || [])
      } catch (err) {
        console.error('Error loading lesson notes:', err)
        setError(err instanceof Error ? err.message : 'Failed to load lesson notes')
      } finally {
        setLoading(false)
      }
    }

    loadLessonNotes()
  }, [router])

  // Apply filters and search
  useEffect(() => {
    let filtered = lessonNotes

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(note => note.status === filters.status)
    }

    // Search by teacher name or subject
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        note =>
          note.teacher.full_name.toLowerCase().includes(term) ||
          note.subject.name.toLowerCase().includes(term) ||
          note.topic.toLowerCase().includes(term)
      )
    }

    setFilteredNotes(filtered)
  }, [lessonNotes, filters, searchTerm])

  return (
    <div>
      <StaffHeader title="SCHOOL ADMIN DASHBOARD" subtitle="Lesson Notes Review" />

      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <h1>📖 Lesson Notes</h1>
          <p>Review and manage lesson notes submitted by teachers</p>
        </div>

        {/* Statistics */}
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{lessonNotes.length}</div>
            <div className={styles.statLabel}>Total Notes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {lessonNotes.filter(n => n.status === 'SUBMITTED').length}
            </div>
            <div className={styles.statLabel}>Pending Review</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {lessonNotes.filter(n => n.status === 'UNDER_REVIEW').length}
            </div>
            <div className={styles.statLabel}>Under Review</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {lessonNotes.filter(n => n.status === 'RETURNED').length}
            </div>
            <div className={styles.statLabel}>Returned</div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className={styles.filterSection}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by teacher name, subject, or topic..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <div className={styles.filterButtons}>
            {['SUBMITTED', 'UNDER_REVIEW', 'RETURNED'].map(status => (
              <button
                key={status}
                className={`${styles.filterButton} ${filters.status === status ? styles.active : ''}`}
                onClick={() => setFilters({ ...filters, status })}
              >
                {status === 'SUBMITTED' && '📤'}
                {status === 'UNDER_REVIEW' && '👀'}
                {status === 'RETURNED' && '↩️'}
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading lesson notes...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
          </div>
        )}

        {/* Lesson Notes List */}
        {!loading && !error && filteredNotes.length > 0 && (
          <div className={styles.notesGrid}>
            {filteredNotes.map(note => (
              <div key={note.id} className={styles.noteCard}>
                <div className={styles.noteHeader}>
                  <div className={styles.noteTitle}>{note.topic}</div>
                  <span
                    className={`${styles.statusBadge} ${styles[`status-${note.status.toLowerCase()}`]}`}
                  >
                    {note.status}
                  </span>
                </div>

                <div className={styles.noteContent}>
                  <p className={styles.contentPreview}>{note.content_summary}</p>
                </div>

                <div className={styles.noteMetadata}>
                  <div className={styles.metaItem}>
                    <strong>Teacher:</strong> {note.teacher.full_name}
                  </div>
                  <div className={styles.metaItem}>
                    <strong>Subject:</strong> {note.subject.name}
                  </div>
                  <div className={styles.metaItem}>
                    <strong>Class:</strong> {note.class_arm.class_name} ({note.class_arm.arm_name})
                  </div>
                  <div className={styles.metaItem}>
                    <strong>Submitted:</strong> {new Date(note.submitted_at).toLocaleDateString()}
                  </div>
                </div>

                {note.reviewer_feedback && (
                  <div className={styles.feedbackBox}>
                    <strong>Feedback:</strong> {note.reviewer_feedback}
                  </div>
                )}

                <div className={styles.noteActions}>
                  <button className={styles.viewButton}>View Details</button>
                  <button className={styles.approveButton}>Approve</button>
                  <button className={styles.returnButton}>Return for Revision</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredNotes.length === 0 && (
          <div className={styles.emptyState}>
            <p>📭 No lesson notes found</p>
            <small>Lesson notes will appear here once teachers submit them</small>
          </div>
        )}
      </div>
    </div>
  )
}
