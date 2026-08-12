/**
 * API Endpoint: POST /api/student/cbt/submit
 * Handles CBT submission and auto-grading
 * Calculates score, stores answers, records attempt
 * 
 * Authentication: Required
 * Authorization: STUDENT only
 * 
 * Request: {
 *   cbt_exam_id,
 *   answers: { [question_id]: answer_text },
 *   time_spent: number (seconds),
 *   auto_submitted?: boolean
 * }
 * Response: { success, submission, score, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyStudent(token: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { authorized: false, error: 'Unauthorized' };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return { authorized: false, error: 'User not found' };
    }

    if (userProfile.role !== 'STUDENT') {
      return { authorized: false, error: 'Only students can submit CBT' };
    }

    return { authorized: true, userId: user.id, schoolId: userProfile.school_id };
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const body = await request.json();
    const { cbt_exam_id: cbtExamId, answers, time_spent: timeSpent, auto_submitted } = body;

    // Verify student
    const auth = await verifyStudent(token);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    // Get student ID
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('school_id', auth.schoolId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: 'Student record not found' },
        { status: 404 }
      );
    }

    // Get CBT exam details
    const { data: cbtExam, error: examError } = await supabase
      .from('cbt_exams')
      .select('id, total_marks, passing_percentage')
      .eq('id', cbtExamId)
      .single();

    if (examError || !cbtExam) {
      return NextResponse.json(
        { success: false, error: 'CBT exam not found' },
        { status: 404 }
      );
    }

    // Get all questions for this exam
    const { data: questions, error: questionsError } = await supabase
      .from('cbt_questions')
      .select(`
        id,
        question_type,
        marks,
        cbt_options (
          id,
          option_text,
          is_correct
        )
      `)
      .eq('cbt_exam_id', cbtExamId);

    if (questionsError) throw questionsError;

    // Calculate score
    let totalScore = 0;
    const scoreDetails: Record<string, { marks: number; awarded: number }> = {};

    for (const question of questions || []) {
      const studentAnswer = answers[question.id];
      let marksAwarded = 0;

      if (studentAnswer !== undefined && studentAnswer !== null) {
        if (question.question_type === 'MULTIPLE_CHOICE') {
          // Check if selected option is correct
          const correctOption = question.cbt_options?.find(opt => opt.is_correct);
          if (correctOption && studentAnswer === correctOption.id) {
            marksAwarded = question.marks;
          }
        } else if (question.question_type === 'TRUE_FALSE') {
          // Check true/false answer
          const correctAnswer = question.cbt_options?.find(opt => opt.is_correct);
          if (correctAnswer && studentAnswer === correctAnswer.option_text.toLowerCase()) {
            marksAwarded = question.marks;
          }
        } else if (question.question_type === 'THEORY') {
          // Theory questions are manually graded - default to 0, teacher grades later
          marksAwarded = 0;
        }
      }

      totalScore += marksAwarded;
      scoreDetails[question.id] = {
        marks: question.marks,
        awarded: marksAwarded,
      };
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('cbt_submissions')
      .insert([
        {
          school_id: auth.schoolId,
          cbt_exam_id: cbtExamId,
          student_id: student.id,
          started_at: new Date(Date.now() - (timeSpent || 0) * 1000).toISOString(),
          submitted_at: new Date().toISOString(),
          auto_submitted: auto_submitted || false,
          score: totalScore,
          answers: answers,
          device_info: {
            user_agent: request.headers.get('user-agent'),
          },
        },
      ])
      .select()
      .single();

    if (submissionError) throw submissionError;

    // Record individual question scores
    for (const question of questions || []) {
      const scoreDetail = scoreDetails[question.id];
      if (scoreDetail) {
        await supabase
          .from('cbt_submission_scores')
          .insert([
            {
              submission_id: submission.id,
              question_id: question.id,
              student_answer: answers[question.id],
              is_correct: scoreDetail.awarded > 0,
              marks_awarded: scoreDetail.awarded,
            },
          ])
          .catch(err => console.error('Error recording question score:', err));
      }
    }

    // Calculate percentage
    const percentageScore = (totalScore / cbtExam.total_marks) * 100;
    const isPassed = percentageScore >= cbtExam.passing_percentage;

    // Audit log
    await supabase.from('audit_logs').insert({
      school_id: auth.schoolId,
      user_id: auth.userId,
      action: 'SUBMIT_CBT',
      entity_type: 'CBT_SUBMISSION',
      entity_id: submission.id,
      new_values: {
        score: totalScore,
        percentage: percentageScore.toFixed(2),
        passed: isPassed,
      },
      status: 'SUCCESS',
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        success: true,
        submission: {
          id: submission.id,
          score: totalScore,
          percentage: percentageScore.toFixed(2),
          passed: isPassed,
          submitted_at: submission.submitted_at,
        },
        message: `CBT submitted! Score: ${totalScore}/${cbtExam.total_marks} (${percentageScore.toFixed(1)}%) - ${isPassed ? 'PASSED' : 'FAILED'}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting CBT:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit CBT',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
