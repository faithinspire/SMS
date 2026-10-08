'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import { ChevronDown, Download, Printer, AlertCircle } from 'lucide-react';

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

interface StudentResult {
  id: string;
  admission_number: string;
  full_name: string;
  class_name?: string;
  results?: {
    ca1?: number;
    ca2?: number;
    ca3?: number;
    ca4?: number;
    exam?: number;
    total?: number;
    grade?: string;
    remark?: string;
  }[];
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
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedArm, setSelectedArm] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

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
        setStatusMessage('Loading academic sessions...');
        
        console.log('[Results] Loading sessions for school:', schoolId);
        
        const response = await fetch(`/api/school/academic/sessions?schoolId=${schoolId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('[Results] ✅ Sessions loaded:', result.data?.length || 0);
        
        if (!result.data || result.data.length === 0) {
          setStatusMessage('No academic sessions found. Please contact administrator.');
          setSessions([]);
        } else {
          setSessions(result.data);
          setStatusMessage('');
          // Auto-select first session
          setSelectedSession(result.data[0].id);
        }
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
        setStatusMessage('Loading terms...');
        const response = await fetch(
          `/api/school/academic/terms?sessionId=${selectedSession}&schoolId=${schoolId}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          setTerms(result.data);
          setSelectedTerm(result.data[0].id);
          setStatusMessage('');
        } else {
          setTerms([]);
          setStatusMessage('No terms found for this session');
        }
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
        setStatusMessage('Loading classes...');
        const response = await fetch(`/api/school/academic/classes?schoolId=${schoolId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          setClasses(result.data);
          setSelectedClass(result.data[0].id);
          setStatusMessage('');
        } else {
          setClasses([]);
          setStatusMessage('No classes found');
        }
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
        setStatusMessage('Loading class arms...');
        const response = await fetch(
          `/api/school/academic/arms?classId=${selectedClass}&schoolId=${schoolId}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          setClassArms(result.data);
          setSelectedArm(result.data[0].id);
          setStatusMessage('');
        } else {
          setClassArms([]);
          setStatusMessage('No class arms found');
        }
      } catch (err: any) {
        console.error('Error loading class arms:', err);
        toast.error('Failed to load class arms');
        setClassArms([]);
      }
    };

    loadArms();
  }, [selectedClass, schoolId]);

  // Load students and results when arm selected
  useEffect(() => {
    if (!selectedArm || !selectedTerm || !selectedClass) {
      setStudents([]);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setStatusMessage('Loading student results...');

        // Fetch students
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
            class_name: selectedClassName,
            results: [],
          }));

        setStudents(armStudents);
        setStatusMessage(`Loaded ${armStudents.length} student(s)`);
      } catch (err: any) {
        console.error('Error loading data:', err);
        toast.error('Failed to load student data');
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedArm, selectedTerm, selectedClass, schoolId, selectedClassName]);

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    const selectedClassObj = classes.find((c) => c.id === classId);
    setSelectedClassName(selectedClassObj?.name || '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">📊 Results Management</h1>
              <p className="text-gray-600 mt-2">View and manage student results by session, term, class, and arm</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Download size={18} /> Export
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
                <Printer size={18} /> Print
              </button>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <p className="text-blue-700">{statusMessage}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Session Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Session</label>
              <select
                value={selectedSession}
                onChange={(e) => {
                  setSelectedSession(e.target.value);
                  setSelectedTerm('');
                  setSelectedClass('');
                  setSelectedArm('');
                }}
                disabled={isLoading || sessions.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition"
              >
                <option value="">-- Select Session --</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.session_year} {s.is_active && '(Active)'}
                  </option>
                ))}
              </select>
              {sessions.length === 0 && !isLoading && (
                <p className="text-xs text-red-600 mt-1">No sessions available</p>
              )}
            </div>

            {/* Term Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📚 Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                disabled={!selectedSession || terms.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition"
              >
                <option value="">-- Select Term --</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.term_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">🏫 Class</label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={!selectedTerm || classes.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition"
              >
                <option value="">-- Select Class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Arm Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Arm</label>
              <select
                value={selectedArm}
                onChange={(e) => setSelectedArm(e.target.value)}
                disabled={!selectedClass || classArms.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition"
              >
                <option value="">-- Select Arm --</option>
                {classArms.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-300 border-t-blue-600 mb-4"></div>
            <p className="text-gray-700 text-lg">Loading results...</p>
          </div>
        )}

        {!isLoading && selectedArm && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="text-center">
                <p className="text-gray-600 text-sm font-semibold">Total Students</p>
                <p className="text-3xl font-bold text-blue-600">{students.length}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-semibold">Session</p>
                <p className="text-xl font-bold text-gray-800">
                  {sessions.find((s) => s.id === selectedSession)?.session_year || 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-semibold">Term</p>
                <p className="text-xl font-bold text-gray-800">
                  {terms.find((t) => t.id === selectedTerm)?.term_name || 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm font-semibold">Class</p>
                <p className="text-xl font-bold text-gray-800">
                  {selectedClassName} {selectedArm && `- Arm ${classArms.find((a) => a.id === selectedArm)?.name}` || ''}
                </p>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">S/N</th>
                    <th className="px-6 py-4 text-left font-bold">Student Name</th>
                    <th className="px-6 py-4 text-left font-bold">Admission #</th>
                    <th className="px-6 py-4 text-center font-bold">Status</th>
                    <th className="px-6 py-4 text-center font-bold">Grade</th>
                    <th className="px-6 py-4 text-center font-bold">Remark</th>
                    <th className="px-6 py-4 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((student, idx) => (
                    <tr key={student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="px-6 py-4 font-semibold text-gray-700">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{student.full_name}</p>
                        <p className="text-xs text-gray-500">{student.class_name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-semibold">{student.admission_number}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          ✓ Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-2xl font-bold text-indigo-600">A</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-green-600 font-semibold">Excellent</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && selectedArm && students.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-yellow-600 mb-4" />
            <p className="text-gray-700 text-lg font-semibold">No students found</p>
            <p className="text-gray-600 mt-2">No students are enrolled in this class arm for the selected term.</p>
          </div>
        )}

        {!isLoading && !selectedArm && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg">👇 Select session, term, class, and arm above to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
        console.log('[Results] API Response:', result);
        
        if (!result.data || result.data.length === 0) {
          console.warn('[Results] No sessions found for school:', schoolId);
          setSessions([]);
          setError('No academic sessions configured. Contact your school administrator.');
          return;
        }
        
        console.log('[Results] ✅ Loaded', result.data.length, 'sessions:', result.data);
        setSessions(result.data);
        setError(null);
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
