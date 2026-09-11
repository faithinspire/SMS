/**
 * Teacher CBT Creation Component
 * Allows teachers to create computer-based tests
 * with multiple question types and configurations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import CanonicalSubjectService from '@/services/canonical-subject.service';
import type { CanonicalSubject } from '@/services/canonical-subject.service';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface ClassArm {
  id: string;
  class: Class;
  arm: { name: string };
}

interface Term {
  id: string;
  name: string;
}

interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY';
  text: string;
  marks: number;
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer?: string;
}

const CreateCBTForm: React.FC = () => {
  const [schoolId, setSchoolId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [subjects, setSubjects] = useState<CanonicalSubject[]>([]);
  const [classArms, setClassArms] = useState<ClassArm[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    class_arm_combo_id: '',
    term_id: '', // ✅ NEW: Required for score_sheets
    assessment_type: 'CA1' as 'CA1' | 'CA2' | 'CA3' | 'CA4' | 'EXAM', // ✅ NEW: Required for score_sheets
    exam_type: 'TEST' as 'TEST' | 'EXAM',
    test_number: 1,
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    total_marks: 100,
    passing_percentage: 50,
    allow_review: true,
    randomize_questions: false,
    randomize_options: false,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'MULTIPLE_CHOICE',
    marks: 1,
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const { data: userProfile } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (userProfile) {
          setSchoolId(userProfile.school_id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Fetch subjects and classes
  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;

      try {
        setIsLoading(true);

        // ✅ NEW: Use canonical subject service instead of direct Supabase query
        const subjectsData = await CanonicalSubjectService.getAllSubjectsForSchool(schoolId);
        setSubjects(subjectsData || []);
        console.log('✅ Subjects loaded:', subjectsData?.length || 0);

        // Fetch class arms with correct nested structure
        const { data: classArmsData, error: classArmsError } = await supabase
          .from('class_arm_combos')
          .select(`
            id,
            classes (id, name),
            arms (name)
          `)
          .eq('school_id', schoolId)
          .order('created_at');

        if (classArmsError) {
          console.error('❌ Error fetching class arms:', classArmsError);
          toast.error('Failed to load classes');
        }
        
        console.log('✅ Class arms loaded:', classArmsData?.length || 0, classArmsData?.[0]);
        setClassArms(classArmsData || []);

        // ✅ NEW: Fetch academic terms for CBT
        const { data: termsData, error: termsError } = await supabase
          .from('academic_terms')
          .select('id, name')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (termsError) {
          console.error('❌ Error fetching terms:', termsError);
          // Fallback to legacy terms table
          const { data: legacyTerms } = await supabase
            .from('terms')
            .select('id, name')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false })
            .limit(10);
          setTerms(legacyTerms || []);
        } else {
          setTerms(termsData || []);
        }
        
        console.log('✅ Terms loaded:', (termsData || []).length);
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        toast.error('Failed to load classes and subjects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [schoolId]);

  // Add question
  const handleAddQuestion = () => {
    if (!currentQuestion.text || currentQuestion.marks === undefined) {
      toast.error('Please fill in question text and marks');
      return;
    }

    if (currentQuestion.type === 'MULTIPLE_CHOICE') {
      const validOptions = currentQuestion.options?.filter(o => o.text.trim());
      if (!validOptions || validOptions.length < 2) {
        toast.error('Please provide at least 2 options');
        return;
      }
      if (!validOptions.some(o => o.isCorrect)) {
        toast.error('Please mark the correct answer');
        return;
      }
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: currentQuestion.type as Question['type'],
      text: currentQuestion.text,
      marks: currentQuestion.marks,
      options: currentQuestion.options,
      correctAnswer: currentQuestion.correctAnswer,
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      type: 'MULTIPLE_CHOICE',
      marks: 1,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    });
    setShowQuestionForm(false);
    toast.success('Question added');
  };

  // Remove question
  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast.success('Question removed');
  };

  // Submit CBT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.subject_id || !formData.class_arm_combo_id || !formData.term_id || !formData.assessment_type) {
      toast.error('Please fill in all required fields including Term and Assessment Type');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    if (totalMarks !== parseFloat(formData.total_marks.toString())) {
      toast.error(`Total marks (${totalMarks}) must match the sum of question marks`);
      return;
    }

    try {
      setIsSubmitting(true);

      // ✅ NEW: Use API endpoint instead of direct insert to ensure validation
      const examResponse = await fetch('/api/teacher/cbt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          subject_id: formData.subject_id,
          class_arm_combo_id: formData.class_arm_combo_id,
          teacher_id: userId,
          title: formData.title,
          description: formData.description,
          assessment_type: formData.assessment_type, // ✅ REQUIRED for score_sheets
          term_id: formData.term_id, // ✅ REQUIRED for score_sheets
          duration_minutes: formData.duration_minutes,
          total_marks: formData.total_marks,
          passing_percentage: formData.passing_percentage,
        }),
      });

      if (!examResponse.ok) {
        const error = await examResponse.json();
        throw new Error(error.error || 'Failed to create exam');
      }

      const { exam: cbtExam } = await examResponse.json();

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const { data: questionRecord, error: questionError } = await supabase
          .from('cbt_questions')
          .insert([
            {
              school_id: schoolId,
              cbt_exam_id: cbtExam.id,
              question_type: q.type,
              question_text: q.text,
              marks: q.marks,
              display_order: i + 1,
            },
          ])
          .select()
          .single();

        if (questionError) throw questionError;

        // Create options for multiple choice
        if (q.type === 'MULTIPLE_CHOICE' && q.options) {
          const optionsData = q.options.map((opt, idx) => ({
            question_id: questionRecord.id,
            option_text: opt.text,
            is_correct: opt.isCorrect,
            display_order: idx + 1,
          }));

          const { error: optionsError } = await supabase
            .from('cbt_options')
            .insert(optionsData);

          if (optionsError) throw optionsError;
        }
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        school_id: schoolId,
        user_id: userId,
        action: 'CREATE_CBT_EXAM',
        entity_type: 'CBT_EXAM',
        entity_id: cbtExam.id,
        new_values: {
          title: formData.title,
          questions_count: questions.length,
        },
        status: 'SUCCESS',
      }).catch(err => console.error('Audit log error:', err));

      toast.success(`CBT "${formData.title}" created successfully!`);

      // Reset form
      setFormData({
        title: '',
        description: '',
        subject_id: '',
        class_arm_combo_id: '',
        term_id: '', // ✅ Reset new field
        assessment_type: 'CA1', // ✅ Reset new field
        exam_type: 'TEST',
        test_number: 1,
        start_time: '',
        end_time: '',
        duration_minutes: 60,
        total_marks: 100,
        passing_percentage: 50,
        allow_review: true,
        randomize_questions: false,
        randomize_options: false,
      });
      setQuestions([]);
    } catch (error) {
      console.error('Error creating CBT:', error);
      toast.error('Failed to create CBT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create Computer-Based Test (CBT)</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Test Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Chemistry Midterm Exam"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Subject *</label>
            <select
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Class/Arm *</label>
            <select
              value={formData.class_arm_combo_id}
              onChange={(e) => setFormData({ ...formData, class_arm_combo_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Class</option>
              {classArms.length > 0 ? (
                classArms.map(ca => (
                  <option key={ca.id} value={ca.id}>
                    {(ca.classes as any)?.name || 'Unknown'} - {(ca.arms as any)?.name || 'Unknown'}
                  </option>
                ))
              ) : (
                <option disabled>Loading classes...</option>
              )}
            </select>
          </div>

          {/* ✅ NEW: Assessment Type - Required for score_sheets */}
          <div>
            <label className="block text-sm font-semibold mb-2">Assessment Type *</label>
            <select
              value={formData.assessment_type}
              onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Type</option>
              <option value="CA1">CA1 (Continuous Assessment 1)</option>
              <option value="CA2">CA2 (Continuous Assessment 2)</option>
              <option value="CA3">CA3 (Continuous Assessment 3)</option>
              <option value="CA4">CA4 (Continuous Assessment 4)</option>
              <option value="EXAM">Exam (Final Exam)</option>
            </select>
          </div>

          {/* ✅ NEW: Term - Required for score_sheets */}
          <div>
            <label className="block text-sm font-semibold mb-2">Academic Term *</label>
            <select
              value={formData.term_id}
              onChange={(e) => setFormData({ ...formData, term_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Term</option>
              {terms.length > 0 ? (
                terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              ) : (
                <option disabled>Loading terms...</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Exam Type</label>
            <select
              value={formData.exam_type}
              onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as 'TEST' | 'EXAM' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TEST">Test</option>
              <option value="EXAM">Exam</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Start Time *</label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">End Time *</label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Total Marks</label>
            <input
              type="number"
              min="1"
              value={formData.total_marks}
              onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional test instructions..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Options */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Test Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_review}
                onChange={(e) => setFormData({ ...formData, allow_review: e.target.checked })}
                className="mr-2"
              />
              <span>Allow students to review answers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.randomize_questions}
                onChange={(e) => setFormData({ ...formData, randomize_questions: e.target.checked })}
                className="mr-2"
              />
              <span>Randomize question order</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.randomize_options}
                onChange={(e) => setFormData({ ...formData, randomize_options: e.target.checked })}
                className="mr-2"
              />
              <span>Randomize answer options</span>
            </label>
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">
              Questions ({questions.length}) - Total Marks: {totalMarks}/{formData.total_marks}
            </h3>
            <button
              type="button"
              onClick={() => setShowQuestionForm(!showQuestionForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showQuestionForm ? 'Cancel' : 'Add Question'}
            </button>
          </div>

          {/* Question Form */}
          {showQuestionForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Question Type</label>
                  <select
                    value={currentQuestion.type}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      type: e.target.value as Question['type'],
                      options: e.target.value === 'MULTIPLE_CHOICE' ? [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: false },
                      ] : undefined,
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="TRUE_FALSE">True/False</option>
                    <option value="THEORY">Theory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={currentQuestion.marks}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Question Text</label>
                <textarea
                  value={currentQuestion.text}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                  placeholder="Enter the question"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              {/* Options for Multiple Choice */}
              {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Options</label>
                  {currentQuestion.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOptions = [...currentQuestion.options!];
                          newOptions[idx].text = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOptions });
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      />
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="correct"
                          checked={opt.isCorrect}
                          onChange={() => {
                            const newOptions = currentQuestion.options!.map((o, i) => ({
                              ...o,
                              isCorrect: i === idx,
                            }));
                            setCurrentQuestion({ ...currentQuestion, options: newOptions });
                          }}
                          className="mr-2"
                        />
                        <span>Correct</span>
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = [...currentQuestion.options!, { text: '', isCorrect: false }];
                      setCurrentQuestion({ ...currentQuestion, options: newOptions });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                  >
                    + Add Option
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Question
              </button>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-gray-50 p-3 rounded border-l-4 border-gray-400">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">Q{idx + 1}: {q.text}</p>
                    <p className="text-sm text-gray-600">{q.type} - {q.marks} marks</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating CBT...' : 'Create CBT'}
        </button>
      </form>
    </div>
  );
};

export default CreateCBTForm;
