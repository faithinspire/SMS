import { z } from 'zod'

// Auth Schemas
export const SuperAdminRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name is required'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const SchoolRegistrationSchema = z.object({
  school_name: z.string().min(2, 'School name is required'),
  school_type: z.enum(['PRIMARY', 'SECONDARY', 'BOTH']),
  school_email: z.string().email('Invalid email address'),
  school_phone: z.string().min(10, 'Phone number is required'),
  school_address: z.string().min(5, 'Address is required'),
  admin_full_name: z.string().min(2, 'Admin name is required'),
  admin_email: z.string().email('Invalid email address'),
  subscription_plan: z.string().default('standard'),
})

export const EmailLoginSchema = z.object({
  school_id: z.string().uuid('Invalid school'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const PinLoginSchema = z.object({
  school_id: z.string().uuid('Invalid school'),
  pin: z.string().length(6, 'PIN must be 6 characters'),
})

// Student Registration Schema
export const StudentRegistrationSchema = z.object({
  full_name: z.string().min(2, 'Student name is required'),
  admission_number: z.string().min(1, 'Admission number is required'),
  date_of_birth: z.string().datetime('Invalid date'),
  class_arm_combo_id: z.string().uuid('Invalid class'),
  subject_ids: z.array(z.string().uuid()).min(1, 'Select at least one subject'),
  guardian_full_name: z.string().min(2, 'Guardian name is required'),
  guardian_phone: z.string().min(10, 'Guardian phone is required'),
  guardian_email: z.string().email('Invalid guardian email').optional().or(z.literal('')),
})

// Class Registration Schema
export const ClassRegistrationSchema = z.object({
  name: z.string().min(2, 'Class name is required'),
  level: z.number().int().positive('Level must be positive'),
  type: z.enum(['PRIMARY', 'SECONDARY']),
  arms: z.array(z.string()).min(1, 'Add at least one arm'),
})

// Subject Creation Schema
export const SubjectCreationSchema = z.object({
  name: z.string().min(2, 'Subject name is required'),
  code: z.string().optional(),
  applicable_to_levels: z.array(z.number()).min(1, 'Select at least one level'),
})

// Payment Schema
export const PaymentRecordingSchema = z.object({
  payer_id: z.string().uuid('Invalid payer'),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE_GATEWAY']),
  payment_gateway_ref: z.string().optional(),
})

// Score Entry Schema
export const ScoreEntrySchema = z.object({
  student_id: z.string().uuid('Invalid student'),
  subject_id: z.string().uuid('Invalid subject'),
  term_id: z.string().uuid('Invalid term'),
  test1: z.number().int().min(0).max(10).optional(),
  test2: z.number().int().min(0).max(10).optional(),
  test3: z.number().int().min(0).max(10).optional(),
  test4: z.number().int().min(0).max(10).optional(),
  exam: z.number().int().min(0).max(60).optional(),
})

// Assignment Schema
export const AssignmentCreationSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  due_date: z.string().datetime('Invalid date'),
  max_marks: z.number().positive('Marks must be positive').optional(),
})

// CBT Exam Schema
export const CbtExamCreationSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  exam_type: z.enum(['TEST', 'EXAM']),
  test_number: z.number().int().min(1).max(4).optional(),
  duration_minutes: z.number().int().positive('Duration must be positive'),
  start_time: z.string().datetime('Invalid start time'),
  end_time: z.string().datetime('Invalid end time'),
})

export type SuperAdminRegisterInput = z.infer<typeof SuperAdminRegisterSchema>
export type SchoolRegistrationInput = z.infer<typeof SchoolRegistrationSchema>
export type EmailLoginInput = z.infer<typeof EmailLoginSchema>
export type PinLoginInput = z.infer<typeof PinLoginSchema>
export type StudentRegistrationInput = z.infer<typeof StudentRegistrationSchema>
export type PaymentRecordingInput = z.infer<typeof PaymentRecordingSchema>
export type ScoreEntryInput = z.infer<typeof ScoreEntrySchema>
