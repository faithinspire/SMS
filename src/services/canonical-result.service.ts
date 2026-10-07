/**
 * Canonical Result Service
 * Aggregates all result sources into one system:
 * - Manual teacher scores
 * - CBT tests
 * - CBT exams
 * - Direct student CBT submissions
 * 
 * One source of truth for all results across all roles
 */

import { supabase } from '@/lib/supabase-client';

export interface CanonicalResult {
  id: string;
  school_id: string;
  student_id: string;
  subject_id: string;
  session_id: string;
  term_id: string;
  teacher_id?: string;
  
  // Source components
  test_scores: {
    test1?: number;
    test2?: number;
    test3?: number;
    test4?: number;
    total_tests?: number;
  };
  exam_score?: number;
  cbt_test_score?: number;
  cbt_exam_score?: number;
  
  // Calculated totals
  manual_total: number;      // Tests + Exam
  cbt_total: number;         // CBT tests + CBT exams
  overall_total: number;     // Manual + CBT combined
  
  // Grade
  grade: string;
  remark: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  source: 'manual' | 'cbt' | 'hybrid';
}

export class CanonicalResultService {
  /**
   * Get canonical results for a student in a subject
   * Aggregates from all sources
   */
  static async getStudentSubjectResults(
    schoolId: string,
    studentId: string,
    subjectId: string,
    sessionId: string,
    termId: string
  ): Promise<CanonicalResult | null> {
    try {
      // 1. Get manual teacher scores
      const { data: scoreSheet } = await supabase
        .from('score_sheets')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('session_id', sessionId)
        .eq('term_id', termId)
        .single();

      // 2. Get CBT test scores
      const { data: cbtTestScores } = await supabase
        .from('cbt_results')
        .select('score, max_score')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('session_id', sessionId)
        .eq('term_id', termId);

      // 3. Get CBT exam scores
      const { data: cbtExamScores } = await supabase
        .from('cbt_exam_results')
        .select('score, max_score')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('session_id', sessionId)
        .eq('term_id', termId);

      // If no data from any source, return null
      if (!scoreSheet && (!cbtTestScores || cbtTestScores.length === 0) && (!cbtExamScores || cbtExamScores.length === 0)) {
        return null;
      }

      // Calculate manual total (test scores + exam)
      const testScoresArray = [
        scoreSheet?.test1 || 0,
        scoreSheet?.test2 || 0,
        scoreSheet?.test3 || 0,
        scoreSheet?.test4 || 0,
      ];
      const totalTests = testScoresArray.reduce((a, b) => a + b, 0);
      const examScore = scoreSheet?.exam || 0;
      const manualTotal = totalTests + examScore;

      // Calculate CBT total
      const cbtTestTotal = cbtTestScores?.reduce((sum, r) => sum + (r.score || 0), 0) || 0;
      const cbtExamTotal = cbtExamScores?.reduce((sum, r) => sum + (r.score || 0), 0) || 0;
      const cbtTotal = cbtTestTotal + cbtExamTotal;

      // Overall total
      const overallTotal = manualTotal + cbtTotal;

      // Calculate grade
      const grade = this.calculateGrade(overallTotal);

      return {
        id: scoreSheet?.id || `canonical-${Date.now()}`,
        school_id: schoolId,
        student_id: studentId,
        subject_id: subjectId,
        session_id: sessionId,
        term_id: termId,
        teacher_id: scoreSheet?.teacher_id,
        test_scores: {
          test1: scoreSheet?.test1,
          test2: scoreSheet?.test2,
          test3: scoreSheet?.test3,
          test4: scoreSheet?.test4,
          total_tests: totalTests,
        },
        exam_score: examScore,
        cbt_test_score: cbtTestTotal,
        cbt_exam_score: cbtExamTotal,
        manual_total: manualTotal,
        cbt_total: cbtTotal,
        overall_total: overallTotal,
        grade,
        remark: this.calculateRemark(grade),
        created_at: scoreSheet?.created_at || new Date().toISOString(),
        updated_at: scoreSheet?.updated_at || new Date().toISOString(),
        source: cbtTotal > 0 ? 'hybrid' : 'manual',
      };
    } catch (error) {
      console.error('[CanonicalResultService] Error getting results:', error);
      return null;
    }
  }

  /**
   * Get all results for a student in a term
   */
  static async getStudentTermResults(
    schoolId: string,
    studentId: string,
    sessionId: string,
    termId: string
  ): Promise<CanonicalResult[]> {
    try {
      // Get all subjects student is enrolled in
      const { data: studentSubjects } = await supabase
        .from('student_subjects')
        .select('subject_id')
        .eq('school_id', schoolId)
        .eq('student_id', studentId);

      if (!studentSubjects || studentSubjects.length === 0) {
        return [];
      }

      // Get canonical results for each subject
      const results = await Promise.all(
        studentSubjects.map(ss =>
          this.getStudentSubjectResults(
            schoolId,
            studentId,
            ss.subject_id,
            sessionId,
            termId
          )
        )
      );

      return results.filter((r): r is CanonicalResult => r !== null);
    } catch (error) {
      console.error('[CanonicalResultService] Error getting term results:', error);
      return [];
    }
  }

  /**
   * Get class results (teacher view)
   */
  static async getClassResults(
    schoolId: string,
    classId: string,
    classArmId: string,
    subjectId: string,
    sessionId: string,
    termId: string
  ): Promise<CanonicalResult[]> {
    try {
      // Get all students in class arm
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId)
        .eq('class_arm_combo_id', classArmId);

      if (!students) {
        return [];
      }

      // Get results for each student
      const results = await Promise.all(
        students.map(s =>
          this.getStudentSubjectResults(
            schoolId,
            s.id,
            subjectId,
            sessionId,
            termId
          )
        )
      );

      return results.filter((r): r is CanonicalResult => r !== null);
    } catch (error) {
      console.error('[CanonicalResultService] Error getting class results:', error);
      return [];
    }
  }

  /**
   * Calculate grade from score
   */
  static calculateGrade(score: number): string {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    if (score > 0) return 'F';
    return 'N/A';
  }

  /**
   * Calculate remark from grade
   */
  static calculateRemark(grade: string): string {
    const remarks: Record<string, string> = {
      'A': 'Excellent',
      'B': 'Very Good',
      'C': 'Good',
      'D': 'Fair',
      'E': 'Pass',
      'F': 'Fail',
      'N/A': 'Not Graded',
    };
    return remarks[grade] || 'Not Graded';
  }

  /**
   * Get school-wide result statistics
   */
  static async getSchoolStatistics(
    schoolId: string,
    sessionId: string,
    termId: string
  ): Promise<{
    totalStudents: number;
    averageScore: number;
    gradeDistribution: Record<string, number>;
    subjectAverages: Record<string, number>;
  }> {
    try {
      // Get all students in school
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId);

      if (studentError || !students) {
        return {
          totalStudents: 0,
          averageScore: 0,
          gradeDistribution: {},
          subjectAverages: {},
        };
      }

      // Get all results
      const { data: scoreSheets } = await supabase
        .from('score_sheets')
        .select('student_id, subject_id, total')
        .eq('school_id', schoolId)
        .eq('session_id', sessionId)
        .eq('term_id', termId);

      if (!scoreSheets || scoreSheets.length === 0) {
        return {
          totalStudents: students.length,
          averageScore: 0,
          gradeDistribution: {},
          subjectAverages: {},
        };
      }

      // Calculate statistics
      const scores = scoreSheets.map(s => s.total || 0);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      const gradeDistribution: Record<string, number> = {};
      scores.forEach(score => {
        const grade = this.calculateGrade(score);
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      });

      const subjectAverages: Record<string, number> = {};
      scoreSheets.forEach(sheet => {
        if (!subjectAverages[sheet.subject_id]) {
          subjectAverages[sheet.subject_id] = [];
        }
        (subjectAverages[sheet.subject_id] as any[]).push(sheet.total || 0);
      });

      Object.keys(subjectAverages).forEach(subjectId => {
        const scores = subjectAverages[subjectId] as any[];
        subjectAverages[subjectId] = scores.reduce((a, b) => a + b, 0) / scores.length;
      });

      return {
        totalStudents: students.length,
        averageScore,
        gradeDistribution,
        subjectAverages,
      };
    } catch (error) {
      console.error('[CanonicalResultService] Error getting statistics:', error);
      return {
        totalStudents: 0,
        averageScore: 0,
        gradeDistribution: {},
        subjectAverages: {},
      };
    }
  }
}
