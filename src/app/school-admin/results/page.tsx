'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';

interface Session {
  id: string;
  session_year: string;
  start_year: number;
  end_year: number;
  is_active: boolean;
}

interface Term {
  id: string;
  session_id: string;
  term_name: string;
  term_order: number;
  is_active: boolean;
}

interface Class {
  id: string;
  name: string;
  level: string;
}

interface ClassArm {
  id: string;
  class_id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
}

interface Student {
  id: string;
  admission_number: string;
  full_name: string;
}

interface Score {
  student_id: string;
  subject_id: string;
  score: number;
  grade?: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classArms, setClassArms] = useState<ClassArm[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scores, setScores] = useState<Map<string, Score>>(new Map());

  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedArm, setSelectedArm] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get authenticated user's school
  useEffect(() => {
    const getSchool = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        if (!user.school_id) {
          setError('Your account is not linked to a school');
          return;
        }

        setSchoolId(user.school_id);
      } catch (err) {
        console.error('Error getting school:', err);
        setError('Failed to load school information');
      }
    };

    getSchool();
  }, [router]);

  // Load sessions
  useEffect(() => {
    if (!schoolId) return;

    const loadSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('[Results] Loading sessions for school:', schoolId);
        
        const response = await fetch(`/api/school/academic/sessions?schoolId=${schoolId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.data || result.data.length === 0) {
          console.warn('[Results] No sessions found for school:', schoolId);
          setSessions([]);
          setError('No academic sessions configured. Contact your school administrator.');
          return;
        }
        
        console.log('[Results] ✅ Loaded', result.data.length, 'sessions');
        setSessions(result.data);
      } catch (err: any) {
        console.error('[Results] Error loading sessions:', err);
        setError(`Failed to load sessions: ${err.message}`);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [schoolId]);

  // Load terms when session selected
  useEffect(() => {
    if (!selectedSession) {
      setTerms([]);
      setSelectedTerm('');
      return;
    }

    const loadTerms = async () => {
      try {
        const response = await fetch(
          `/api/school/academic/terms?sessionId=${selectedSession}&schoolId=${schoolId}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        setTerms(result.data || []);
      } catch (err: any) {
        console.error('Error loading terms:', err);
        toast.error('Failed to load terms');
        setTerms([]);
      }
    };

    loadTerms();
  }, [selectedSession, schoolId]);

  // Load classes when term selected
  useEffect(() => {
    if (!selectedTerm) {
      setClasses([]);
      setSelectedClass('');
      return;
    }

    const loadClasses = async () => {
      try {
        const response = await fetch(`/api/school/academic/classes?schoolId=${schoolId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        setClasses(result.data || []);
      } catch (err: any) {
        console.error('Error loading classes:', err);
        toast.error('Failed to load classes');
        setClasses([]);
      }
    };

    loadClasses();
  }, [selectedTerm, schoolId]);

  // Load class arms when class selected
  useEffect(() => {
    if (!selectedClass) {
      setClassArms([]);
      setSelectedArm('');
      return;
    }

    const loadArms = async () => {
      try {
        const response = await fetch(
          `/api/school/academic/arms?classId=${selectedClass}&schoolId=${schoolId}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        setClassArms(result.data || []);
      } catch (err: any) {
        console.error('Error loading class arms:', err);
        toast.error('Failed to load class arms');
        setClassArms([]);
      }
    };

    loadArms();
  }, [selectedClass, schoolId]);

  // Load students and scores when arm selected
  useEffect(() => {
    if (!selectedArm || !selectedTerm) {
      setStudents([]);
      setSubjects([]);
      setScores(new Map());
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);

        // Fetch students using fetch instead of client-side Supabase
        const studentsResponse = await fetch(
          `/api/school/students?schoolId=${schoolId}`
        );
        if (!studentsResponse.ok) throw new Error('Failed to fetch students');
        const studentsResult = await studentsResponse.json();
        
        // Filter students for this arm
        const armStudents = (studentsResult.data || [])
          .filter((s: any) => s.class_arm_combo_id === selectedArm)
          .map((s: any) => ({
            id: s.id,
            admission_number: s.admission_number || '',
            full_name: s.users?.full_name || 'Unknown',
          }));

        setStudents(armStudents);
        setSubjects([]);
        setScores(new Map());
      } catch (err: any) {
        console.error('Error loading data:', err);
        toast.error('Failed to load student data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedArm, selectedTerm, schoolId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white rounded-lg shadow-md p-6 m-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white rounded-lg shadow-md p-6 m-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Results Management</h1>
          <p className="text-gray-600 mt-2">Manage student results and scores</p>
        </div>

        {/* Cascade Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Session */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Session</label>
            <select
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                setSelectedTerm('');
                setSelectedClass('');
                setSelectedArm('');
              }}
              disabled={isLoading || sessions.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select session...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.session_year}
                </option>
              ))}
            </select>
            {sessions.length === 0 && (
              <p className="text-xs text-red-600 mt-1">No sessions available</p>
            )}
          </div>

          {/* Term */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                setSelectedClass('');
                setSelectedArm('');
              }}
              disabled={!selectedSession}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select term...</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.term_name}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedArm('');
              }}
              disabled={!selectedTerm}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class Arm */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Arm</label>
            <select
              value={selectedArm}
              onChange={(e) => setSelectedArm(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select arm...</option>
              {classArms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading results...</p>
          </div>
        ) : selectedArm && students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 sticky left-0 bg-gray-100 z-10">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Admission #</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student, idx) => (
                  <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 z-10 bg-inherit">
                      {student.full_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{student.admission_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedArm ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No students in this class arm</p>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Select session, term, class, and arm to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}
