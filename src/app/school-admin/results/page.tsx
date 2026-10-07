'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
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

  const [isLoading, setIsLoading] = useState(true);
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
          setIsLoading(false);
          return;
        }

        setSchoolId(user.school_id);
      } catch (err) {
        console.error('Error getting school:', err);
        setError('Failed to load school information');
        setIsLoading(false);
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
        const { data, error } = await supabase
          .from('academic_sessions')
          .select('id, session_year, start_year, end_year, is_active')
          .eq('school_id', schoolId)
          .order('start_year', { ascending: false });

        if (error) throw error;

        setSessions(data || []);
        if (!data || data.length === 0) {
          toast.error('No academic sessions found. Please create sessions first.');
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading sessions:', err);
        toast.error('Failed to load sessions');
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
        const { data, error } = await supabase
          .from('academic_terms')
          .select('id, session_id, term_name, term_order, is_active')
          .eq('session_id', selectedSession)
          .eq('school_id', schoolId)
          .order('term_order', { ascending: true });

        if (error) throw error;
        setTerms(data || []);
      } catch (err: any) {
        console.error('Error loading terms:', err);
        toast.error('Failed to load terms');
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
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, level')
          .eq('school_id', schoolId)
          .order('name', { ascending: true });

        if (error) throw error;
        setClasses(data || []);
      } catch (err: any) {
        console.error('Error loading classes:', err);
        toast.error('Failed to load classes');
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
        const { data, error } = await supabase
          .from('class_arm_combos')
          .select('id, class_id, arms(id, name)')
          .eq('class_id', selectedClass)
          .eq('school_id', schoolId)
          .order('arms(name)', { ascending: true });

        if (error) throw error;

        const mappedArms = (data || []).map((combo: any) => ({
          id: combo.id,
          class_id: combo.class_id,
          name: combo.arms?.name || 'Unknown Arm',
        }));

        setClassArms(mappedArms);
      } catch (err: any) {
        console.error('Error loading class arms:', err);
        toast.error('Failed to load class arms');
      }
    };

    loadArms();
  }, [selectedClass, schoolId]);

  // Load students, subjects, and scores when arm selected
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

        // Fetch students in this arm
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id, admission_number, users(full_name)')
          .eq('class_arm_combo_id', selectedArm)
          .eq('school_id', schoolId);

        if (studentError) throw studentError;

        const mappedStudents = (studentData || []).map((s: any) => ({
          id: s.id,
          admission_number: s.admission_number || '',
          full_name: s.users?.full_name || 'Unknown',
        }));

        setStudents(mappedStudents);

        // Fetch subjects for this class/arm
        const { data: subjectData, error: subjectError } = await supabase
          .from('subject_teacher_assignments')
          .select('subject_id, subjects(id, name, code)')
          .eq('class_arm_combo_id', selectedArm)
          .eq('school_id', schoolId);

        if (subjectError) throw subjectError;

        const subjectMap = new Map<string, Subject>();
        (subjectData || []).forEach((sa: any) => {
          const subject = sa.subjects;
          if (subject && !subjectMap.has(subject.id)) {
            subjectMap.set(subject.id, {
              id: subject.id,
              name: subject.name || 'Unknown',
              code: subject.code,
            });
          }
        });

        setSubjects(Array.from(subjectMap.values()));

        // Fetch scores for this term
        const { data: scoreData, error: scoreError } = await supabase
          .from('score_sheets')
          .select('id, student_id, subject_id, score, grade, term_id')
          .eq('term_id', selectedTerm);

        if (scoreError) throw scoreError;

        const scoreMap = new Map<string, Score>();
        (scoreData || []).forEach((score: any) => {
          const key = `${score.student_id}_${score.subject_id}`;
          scoreMap.set(key, {
            student_id: score.student_id,
            subject_id: score.subject_id,
            score: score.score || 0,
            grade: score.grade,
          });
        });

        setScores(scoreMap);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading data:', err);
        toast.error('Failed to load results data');
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
              onChange={(e) => setSelectedSession(e.target.value)}
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
          </div>

          {/* Term */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={!selectedSession || isLoading}
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
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!selectedTerm || isLoading}
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
              disabled={!selectedClass || isLoading}
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
                  <th className="px-4 py-3 text-left font-bold text-gray-700 sticky left-0 bg-gray-100">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Admission #</th>
                  {subjects.map((s) => (
                    <th key={s.id} className="px-4 py-3 text-center font-bold text-gray-700 min-w-[80px]">
                      {s.name}
                      {s.code && <div className="text-xs font-normal">({s.code})</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student, idx) => (
                  <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 z-10 bg-inherit">
                      {student.full_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{student.admission_number}</td>
                    {subjects.map((subject) => {
                      const key = `${student.id}_${subject.id}`;
                      const score = scores.get(key);
                      return (
                        <td key={subject.id} className="px-4 py-3 text-center">
                          {score ? (
                            <div className="font-semibold text-gray-900">
                              {score.score}
                              {score.grade && <div className="text-xs text-gray-600">{score.grade}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
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
