// User roles
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  HEAD_TEACHER = 'HEAD_TEACHER',
  TEACHER = 'TEACHER',
  ACCOUNTANT = 'ACCOUNTANT',
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
}

// School types
export enum SchoolType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  BOTH = 'BOTH',
}

// User status
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// School status
export enum SchoolStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Database Models

export interface School {
  id: string;
  name: string;
  logo_url?: string;
  type: SchoolType;
  email?: string;
  phone?: string;
  address?: string;
  subscription_plan?: string;
  status: SchoolStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  school_id: string;
  email?: string;
  full_name: string;
  photo_url?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface LoginPin {
  id: string;
  user_id: string;
  school_id: string;
  pin_hash: string;
  generated_at: string;
  expires_at?: string;
  attempts: number;
  locked_until?: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  level: number;
  type: 'PRIMARY' | 'SECONDARY';
  created_at: string;
}

export interface Arm {
  id: string;
  class_id: string;
  school_id: string;
  name: string;
  capacity?: number;
  created_at: string;
}

export interface ClassArmCombo {
  id: string;
  school_id: string;
  class_id: string;
  arm_id: string;
  class_teacher_id?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code?: string;
  applicable_to_levels: number[];
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  school_id: string;
  admission_number: string;
  date_of_birth?: string;
  class_id: string;
  department_id?: string;
  subjects: string[];
  class_arm_combo_id?: string;
  class_teacher_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  school_id: string;
  subject_teacher_id?: string;
  created_at: string;
}

export interface ScoreSheet {
  id: string;
  school_id: string;
  student_id: string;
  subject_id: string;
  term_id: string;
  test1?: number;
  test2?: number;
  test3?: number;
  test4?: number;
  exam?: number;
  total?: number;
  grade?: string;
  test1_source?: 'MANUAL' | 'CBT';
  test2_source?: 'MANUAL' | 'CBT';
  test3_source?: 'MANUAL' | 'CBT';
  test4_source?: 'MANUAL' | 'CBT';
  exam_source?: 'MANUAL' | 'CBT';
  updated_at: string;
}

export interface Term {
  id: string;
  school_id: string;
  name: string;
  session_year: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  school_id: string;
  payer_id: string;
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE_GATEWAY';
  payment_gateway_ref?: string;
  gateway_response?: any;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  recorded_by?: string;
  created_at: string;
  paid_at?: string;
}

// Auth Models

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface PinCredentials {
  school_id: string;
  pin: string;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  school_id: string;
  roles: UserRole[];
  classes?: string[];
  subjects?: string[];
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

// API Response Models

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  statusCode: number;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

// Dashboard Models

export interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  activeUsers: number;
}

// Attendance Records
export interface AttendanceRecord {
  id: string;
  school_id: string;
  student_id?: string;
  staff_id?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
  recorded_by: string;
  created_at: string;
}

export interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
}

// Financial Records
export interface FinancialRecord {
  id: string;
  school_id: string;
  student_id?: string;
  staff_id?: string;
  user_id: string;
  user_name: string;
  transaction_type: 'TUITION' | 'FEES' | 'FINE' | 'REFUND' | 'ALLOWANCE' | 'SALARY' | 'EXPENSE';
  description: string;
  amount: number;
  currency: string;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE_GATEWAY';
  reference_number?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  recorded_by: string;
  created_at: string;
  paid_at?: string;
}

export interface FinancialSummary {
  total_received: number;
  total_paid: number;
  total_pending: number;
  balance: number;
  currency: string;
}

// Class Management
export interface ClassSession {
  id: string;
  school_id: string;
  class_id: string;
  class_name: string;
  form_tutor_id?: string;
  form_tutor_name?: string;
  department_id?: string;
  student_count: number;
  created_at: string;
}

export interface TeacherDashboard {
  classStudents: Student[];
  subjectStudents: Student[];
  upcomingAssignments: any[];
  pendingGrades: number;
}

export interface StudentDashboard {
  assignments: any[];
  cbtExams: any[];
  recentGrades: any[];
  feeStatus: any;
}
