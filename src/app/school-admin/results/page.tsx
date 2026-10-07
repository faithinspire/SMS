/**
 * School Admin Results Management Page - REBUILT
 * Complete data flow: School → Session → Term → Class → ClassArm → Students → Subjects → Scores
 * 
 * KEY FIXES:
 * 1. School context resolution using SchoolContextService (no more false "not linked" errors)
 * 2. Proper cascade loading: Don't load next level until previous is selected
 * 3. Real session/term/class/arm names (not "ACTIVE", not hardcoded)
 * 4. Students without scores still appear
 * 5. Scores merged from both manual entry and CBT results
 * 6. No N+1 queries - batch load students + subjects + scores together
 * 7. Real UUIDs in state, not display labels
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import { SchoolContextService } from '@/services/school-context.service';

const supabase = createClient();

interface Session {
  id: string;
  session_year: string;  // The actual database column
  is_active: boolean;
  name?: string; // Optional mapped display name
}

interface Term {
  id: string;
  session_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
}

interface ClassRecord {
  id: string;
  name: string;
  level: string;
}

interface ClassArm {
  id: string;
  class_id: string;
  name: string;
  class: ClassRecord;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
}

interface Student {
  id: string;
  user_id: string;
  admission_number: string;
  user: {
    full_name: string;
    email: string;
  };
}

interface Score {
  id: string;
  student_id: string;
  subject_id: string;
  score: number;
  grade?: string;
  source: 'manual' | 'cbt';
}

interface PageState {
  // School context
  schoolId: string;
  schoolName: string;

  // Dropdowns
  sessions: Session[];
  selectedSessionId: string;

  terms: Term[];
  selectedTermId: string;

  classes: ClassRecord[];
  selectedClassId: string;

  classArms: ClassArm[];
  selectedClassArmId: string;

  // Data
  students: Student[];
  subjects: Subject[];
  scores: Map<string, Score>;

  // UI
  isLoading: boolean;
  error: string | null;
}

export default function ResultsPageV2() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({
    schoolId: '',
    schoolName: '',
    sessions: [],
    selectedSessionId: '',
    terms: [],
    selectedTermId: '',
    classes: [],
    selectedClassId: '',
    classArms: [],
    selectedClassArmId: '',
    students: [],
    subjects: [],
    scores: new Map(),
    isLoading: true,
    error: null,
  });

  // STEP 1: Initialize - resolve school context
  useEffect(() => {
    const initializeSchoolContext = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const userSchool = await SchoolContextService.getCurrentUserSchool();
        console.log('[Results] School context resolved:', {
          schoolId: userSchool.schoolId,
          schoolName: userSchool.schoolName || 'Unknown',
        });
        setState((prev) => ({
          ...prev,
          schoolId: userSchool.schoolId,
          schoolName: userSchool.schoolName || 'School',
        }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to load school information';
        console.error('[Results] School context error:', error);
        setState((prev) => ({ ...prev, error: msg, isLoading: false }));
        toast.error(msg);
      }
    };

    initializeSchoolContext();
  }, []);

  // STEP 2: Load sessions for school
  useEffect(() => {
    if (!state.schoolId) {
      console.log('[Results] No schoolId available yet, skipping session load');
      return;
    }

    const loadSessions = async () => {
      try {
        console.log('[Results] Loading sessions for school:', state.schoolId);
        
        // Query Supabase directly with proper error handling
        const { data, error } = await supabase
          .from('academic_sessions')
          .select('id, session_year, is_active')
          .eq('school_id', state.schoolId)
          .order('session_year', { ascending: false });

        if (error) {
          console.error('[Results] Database error:', error);
          throw error;
        }

        console.log('[Results] ✅ Sessions loaded:', data?.length || 0, 'sessions');
        
        if (!data || data.length === 0) {
          console.warn('[Results] No sessions found for school. Sessions may need to be created.');
          toast.error('No academic sessions configured for this school. Please create sessions first.');
          setState(prev => ({
            ...prev,
            sessions: [],
            isLoading: false,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          sessions: data || [],
          isLoading: false,
        }));
      } catch (error: any) {
        console.error('[Results] Error loading sessions:', error?.message || error);
        toast.error(`Failed to load sessions: ${error?.message || 'Unknown error'}`);
        setState((prev) => ({ ...prev, isLoading: false, sessions: [] }));
      }
    };

    loadSessions();
  }, [state.schoolId]);

  // STEP 3: Load terms when session selected
  useEffect(() => {
    if (!state.selectedSessionId) {
      setState((prev) => ({
        ...prev,
        terms: [],
        selectedTermId: '',
        classes: [],
        selectedClassId: '',
        classArms: [],
        selectedClassArmId: '',
        students: [],
        subjects: [],
        scores: new Map(),
      }));
      return;
    }

    const loadTerms = async () => {
      try {
        console.log('[Results] Loading terms for session:', state.selectedSessionId);
        const { data, error } = await supabase
          .from('academic_terms')
          .select('id, term_name as name, session_id, is_active')
          .eq('session_id', state.selectedSessionId)
          .order('term_name', { ascending: true });

        if (error) throw error;

        console.log('[Results] ✅ Terms loaded:', data?.length || 0);
        setState((prev) => ({
          ...prev,
          terms: data || [],
          selectedTermId: '',
          classes: [],
          selectedClassId: '',
          classArms: [],
          selectedClassArmId: '',
          students: [],
          subjects: [],
          scores: new Map(),
        }));
      } catch (error) {
        console.error('[Results] Error loading terms:', error);
        toast.error('Failed to load terms');
      }
    };

    loadTerms();
  }, [state.selectedSessionId]);

  // STEP 4: Load classes when term selected
  useEffect(() => {
    if (!state.selectedTermId) {
      setState((prev) => ({
        ...prev,
        classes: [],
        selectedClassId: '',
        classArms: [],
        selectedClassArmId: '',
        students: [],
        subjects: [],
        scores: new Map(),
      }));
      return;
    }

    const loadClasses = async () => {
      try {
        console.log('[Results] Loading classes for school:', state.schoolId);
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, level')
          .eq('school_id', state.schoolId)
          .order('name', { ascending: true });

        if (error) throw error;

        console.log('[Results] ✅ Classes loaded:', data?.length || 0);
        setState((prev) => ({
          ...prev,
          classes: data || [],
          selectedClassId: '',
          classArms: [],
          selectedClassArmId: '',
          students: [],
          subjects: [],
          scores: new Map(),
        }));
      } catch (error) {
        console.error('[Results] Error loading classes:', error);
        toast.error('Failed to load classes');
      }
    };

    loadClasses();
  }, [state.selectedTermId, state.schoolId]);

  // STEP 5: Load class arms when class selected
  useEffect(() => {
    if (!state.selectedClassId) {
      setState((prev) => ({
        ...prev,
        classArms: [],
        selectedClassArmId: '',
        students: [],
        subjects: [],
        scores: new Map(),
      }));
      return;
    }

    const loadClassArms = async () => {
      try {
        console.log('[Results] Loading class arms for class:', state.selectedClassId);
        const { data, error } = await supabase
          .from('class_arm_combos')
          .select(
            `
            id,
            class_id,
            arm_id,
            classes (id, name, level),
            arms (id, name)
          `
          )
          .eq('class_id', state.selectedClassId)
          .eq('school_id', state.schoolId)
          .order('arms(name)', { ascending: true });

        if (error) throw error;

        // Map the nested data to the ClassArm interface
        const arms = (data || []).map(combo => ({
          id: combo.id,
          class_id: combo.class_id,
          name: (combo.arms as any)?.name || '',
          class: (combo.classes as any) || { id: '', name: '', level: '' },
        }));

        console.log('[Results] ✅ Class arms loaded:', arms.length || 0);
        setState((prev) => ({
          ...prev,
          classArms: arms,
          selectedClassArmId: '',
          students: [],
          subjects: [],
          scores: new Map(),
        }));
      } catch (error) {
        console.error('[Results] Error loading class arms:', error);
        toast.error('Failed to load class arms');
      }
    };

    loadClassArms();
  }, [state.selectedClassId]);

  // STEP 6 & 7: Load students, subjects, and scores together when class arm selected
  useEffect(() => {
    if (!state.selectedClassArmId || !state.selectedTermId) {
      setState((prev) => ({
        ...prev,
        students: [],
        subjects: [],
        scores: new Map(),
      }));
      return;
    }

    const loadResultsData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        console.log('[Results] Loading students, subjects, and scores...');

        // Fetch ALL students in this class/arm (including those without scores)
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(
            `
            id,
            user_id,
            admission_number,
            users (full_name, email)
          `
          )
          .eq('class_arm_combo_id', state.selectedClassArmId)
          .eq('school_id', state.schoolId);

        if (studentError) throw studentError;

        const students: Student[] = (studentData || [])
          .map((student: any) => ({
            id: student.id,
            user_id: student.user_id,
            admission_number: student.admission_number || '',
            user: {
              full_name: (student.users as any)?.full_name || 'Unknown',
              email: (student.users as any)?.email || '',
            },
          }))
          .filter(Boolean);

        console.log('[Results] ✅ Students loaded:', students.length);

        // Fetch subjects assigned to teachers in this class/arm
        const { data: subjectData, error: subjectError } = await supabase
          .from('subject_teacher_assignments')
          .select(
            `
            subject_id,
            subjects (
              id,
              name,
              code
            )
          `
          )
          .eq('class_arm_combo_id', state.selectedClassArmId)
          .eq('school_id', state.schoolId);

        if (subjectError) throw subjectError;

        // Deduplicate subjects
        const subjectMap = new Map<string, Subject>();
        (subjectData || []).forEach((sa: any) => {
          const subject = (sa.subjects as any);
          if (subject && !subjectMap.has(subject.id)) {
            subjectMap.set(subject.id, {
              id: subject.id,
              name: subject.name || '',
              code: subject.code || '',
            });
          }
        });

        const subjects = Array.from(subjectMap.values());

        console.log('[Results] ✅ Subjects loaded:', subjects.length);

        // Fetch scores (both manual and CBT)
        const { data: scoreData, error: scoreError } = await supabase
          .from('score_sheets')
          .select('id, student_id, subject_id, score, grade, term_id')
          .eq('term_id', state.selectedTermId);

        if (scoreError) throw scoreError;

        const scoresMap = new Map<string, Score>();
        (scoreData || []).forEach((score: any) => {
          const key = `${score.student_id}_${score.subject_id}`;
          scoresMap.set(key, {
            id: score.id,
            student_id: score.student_id,
            subject_id: score.subject_id,
            score: score.score || 0,
            grade: score.grade,
            source: 'manual',
          });
        });

        // Also fetch CBT scores
        const { data: cbtData, error: cbtError } = await supabase
          .from('cbt_results')
          .select('student_id, subject_id, score')
          .eq('term_id', state.selectedTermId);

        if (!cbtError && cbtData) {
          cbtData.forEach((cbt: any) => {
            const key = `${cbt.student_id}_${cbt.subject_id}`;
            if (!scoresMap.has(key)) {
              scoresMap.set(key, {
                id: '',
                student_id: cbt.student_id,
                subject_id: cbt.subject_id,
                score: cbt.score || 0,
                source: 'cbt',
              });
            }
          });
        }

        console.log('[Results] ✅ Scores loaded:', scoresMap.size);

        setState((prev) => ({
          ...prev,
          students,
          subjects,
          scores: scoresMap,
          isLoading: false,
        }));
      } catch (error) {
        console.error('[Results] Error loading results data:', error);
        toast.error('Failed to load results data');
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadResultsData();
  }, [state.selectedClassArmId, state.selectedTermId, state.selectedClassId]);

  // Render
  if (state.error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-800 font-semibold">{state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Results Management</h2>

      {/* School Context Display */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>📍 School:</strong> {state.schoolName}
        </p>
      </div>

      {/* Cascade Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Session Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Session</label>
          <select
            value={state.selectedSessionId}
            onChange={(e) => setState((prev) => ({ ...prev, selectedSessionId: e.target.value }))}
            disabled={state.isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Select session...</option>
            {state.sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </div>

        {/* Term Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Term</label>
          <select
            value={state.selectedTermId}
            onChange={(e) => setState((prev) => ({ ...prev, selectedTermId: e.target.value }))}
            disabled={!state.selectedSessionId || state.isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Select term...</option>
            {state.terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
          <select
            value={state.selectedClassId}
            onChange={(e) => setState((prev) => ({ ...prev, selectedClassId: e.target.value }))}
            disabled={!state.selectedTermId || state.isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Select class...</option>
            {state.classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class Arm Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Class Arm</label>
          <select
            value={state.selectedClassArmId}
            onChange={(e) => setState((prev) => ({ ...prev, selectedClassArmId: e.target.value }))}
            disabled={!state.selectedClassId || state.isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Select arm...</option>
            {state.classArms.map((arm) => (
              <option key={arm.id} value={arm.id}>
                {arm.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table */}
      {state.isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      ) : state.selectedClassArmId && state.students.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Student</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Admission #</th>
                {state.subjects.map((subject) => (
                  <th key={subject.id} className="px-4 py-3 text-center font-bold text-gray-700">
                    {subject.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.students.map((student, idx) => (
                <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-semibold text-gray-700">{student.user.full_name}</td>
                  <td className="px-4 py-3 text-gray-700">{student.admission_number}</td>
                  {state.subjects.map((subject) => {
                    const scoreKey = `${student.id}_${subject.id}`;
                    const score = state.scores.get(scoreKey);
                    return (
                      <td key={subject.id} className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score?.score || ''}
                          onChange={(e) => {
                            // Handle score update
                            const newScore = parseFloat(e.target.value) || 0;
                            const updatedScores = new Map(state.scores);
                            updatedScores.set(scoreKey, {
                              ...score,
                              student_id: student.id,
                              subject_id: subject.id,
                              score: newScore,
                            } as Score);
                            setState((prev) => ({ ...prev, scores: updatedScores }));
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : state.selectedClassArmId ? (
        <div className="text-center py-8 text-gray-500">No students found in this class</div>
      ) : (
        <div className="text-center py-8 text-gray-500">Select a class arm to view results</div>
      )}
    </div>
  );
}
