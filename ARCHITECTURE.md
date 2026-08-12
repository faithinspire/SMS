# School Management System (SaaS) - Architecture Document

## 1. System Overview

**Multi-tenant cloud-based School Management System** allowing multiple independent schools to operate on a single platform with complete data isolation, white-label branding, and role-based access control.

### Core Principles
- **Single shared landing page** — all schools login from one entry point
- **Complete data isolation** — school_id foreign key on every tenant-scoped table
- **JWT-based auth** — school_id embedded in token claims
- **Automatic linking** — Class/Subject teacher assignments trigger instantly on student registration
- **Real-time score sheets** — CBT submissions auto-populate score sheets
- **White-label branding** — school logo/name injected into every tenant dashboard

---

## 2. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          VERCEL (CDN/Edge)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (React Components + Pages)            │   │
│  │  - Server-side rendering (SSR)                          │   │
│  │  - API routes for direct Supabase calls (client)        │   │
│  │  - Role-based routing guards                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL + Auth)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (multi-tenant with RLS)             │  │
│  │  - schools, users, students, staff, classes, subjects... │  │
│  │  - Row-Level Security (RLS) policies for school_id      │  │
│  │  - Audit logs for sensitive actions                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Auth (JWT tokens, email/password)              │  │
│  │  - Super Admin → email/password                          │  │
│  │  - School Admin → email/password                         │  │
│  │  - Students/Staff → PIN-based (custom auth table)        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Storage (S3-compatible)                        │  │
│  │  - School logos, student/staff photos                    │  │
│  │  - Lesson note attachments, assignments                  │  │
│  │  - Generated PDFs (receipts, payslips, report cards)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                           │
│  - SendGrid / Postmark (Email)                                  │
│  - Twilio WhatsApp API (WhatsApp notifications)                 │
│  - Paystack / Flutterwave (Payment gateway)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Flow
1. **Frontend** deployed to Vercel with automatic Git deployments
2. **Database migrations** run via Supabase CLI before deployment
3. **Environment variables** (.env.local) pulled from Vercel secrets
4. **APIs** use Supabase client-side via JWT tokens
5. **File storage** via Supabase Storage SDK

---

## 3. Authentication Flow

### 3.1 Super Admin Registration (One-time)
```
Super Admin → Registration Form → Create user in Supabase Auth → 
Set role to 'super_admin' in users table → Dashboard access
```

### 3.2 School Admin + School Registration (Super Admin creates school)
```
Super Admin → Register School Form → 
  Create school record (schools table) →
  Create School Admin user (users table) →
  Send login credentials via email →
  School Admin logs in with email/password
```

### 3.3 Student/Staff PIN Login (Shared Landing Page)
```
Login Page:
  1. Select School (dropdown)
  2. Select Auth Mode: "Email/Password" or "PIN"
  
If PIN:
  - Enter PIN
  - Validate PIN against users table (school_id scoped)
  - Generate JWT with school_id + user_id + roles
  - Redirect to dashboard
  
If Email/Password:
  - Enter email + password
  - Supabase Auth validates
  - Fetch user roles from users table
  - Generate JWT with school_id + user_id + roles
  - Redirect to dashboard
```

### 3.4 JWT Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "school_id": "school-uuid",
  "roles": ["teacher", "subject_teacher"],
  "classes": ["class-uuid-1"],
  "subjects": ["subject-uuid-1"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

### 3.5 Authorization Middleware
Every API endpoint checks:
1. JWT validity (signature, expiration)
2. `school_id` in token matches request body or table row
3. User role has permission for the action (RBAC)
4. Row-Level Security (RLS) policies enforce tenant isolation

---

## 4. Database Schema (Core Entities)

### Tenancy Layer
```
schools
├── id (uuid, PK)
├── name (text)
├── logo_url (text)
├── type (enum: PRIMARY, SECONDARY, BOTH)
├── email (text)
├── phone (text)
├── address (text)
├── subscription_plan (text)
├── status (enum: ACTIVE, SUSPENDED)
├── created_at (timestamp)
├── updated_at (timestamp)

users
├── id (uuid, PK)
├── school_id (uuid, FK → schools)
├── email (text, nullable for PIN-only users)
├── full_name (text)
├── photo_url (text)
├── role (enum: SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER, TEACHER, ACCOUNTANT, STAFF, STUDENT)
├── status (enum: ACTIVE, INACTIVE, SUSPENDED)
├── created_at (timestamp)
├── updated_at (timestamp)

login_pins
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── school_id (uuid, FK → schools)
├── pin_hash (text) -- bcrypt hashed
├── generated_at (timestamp)
├── expires_at (timestamp, nullable for non-expiring)
├── attempts (int, default 0)
├── locked_until (timestamp, nullable)

roles
├── id (uuid, PK)
├── name (text: 'teacher', 'subject_teacher', 'class_teacher', etc.)
├── description (text)

user_roles
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── role_id (uuid, FK → roles)
├── school_id (uuid, FK → schools)
├── scoped_to_class_id (uuid, FK → classes, nullable)
├── scoped_to_subject_id (uuid, FK → subjects, nullable)
```

---

## 5. API Endpoints (High-Level)

### Auth
- `POST /api/auth/register/super-admin` — Super Admin self-registration
- `POST /api/auth/register/school` — School Admin registers school
- `POST /api/auth/login/email` — Email/password login
- `POST /api/auth/login/pin` — PIN login
- `POST /api/auth/refresh-token` — Refresh JWT
- `POST /api/auth/logout` — Logout
- `POST /api/auth/forgot-password` — Email reset
- `POST /api/auth/reset-pin` — Admin regenerates PIN
- `GET /api/auth/schools` — List all schools (for dropdown)

---

## 6. Phase Breakdown

### Phase 1: Core Auth + School Admin + Basic Dashboards
- Super Admin registration
- School registration (Admin creation + email)
- Shared landing page + dual auth (email/PIN)
- School Admin dashboard
- Basic user management

### Phase 2: Student Registration + Auto-Linking
- Student registration form + PIN auto-generation
- Class/Subject teacher auto-assignment
- Teacher dashboard with "Class Students" / "Subject Students"
- Student dashboard
- Auto-linking tests

### Phase 3: Payments Module
- Payment recording (cash, bank, card)
- Receipt generation + PDF branding
- Email/WhatsApp sending
- Payment reports

### Phase 4: CBT Portal
- Question bank creation
- CBT exam scheduling
- Student CBT interface
- Auto-grading + score sheet auto-feed

### Phase 5: Grading & Report Cards
- Score sheet manual entry
- Report card generation + PDF
- Grade calculation + configuration

---

This architecture prioritizes **security, scalability, and automatic linking correctness**.
