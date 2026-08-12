# Project Structure - School Management System

Complete directory and file structure of the Phase 1 implementation.

```
school-management-saas/
├── src/                                    # Source code
│   ├── app/                               # Next.js App Router (pages & layouts)
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Home (redirects to login/dashboard)
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx             # Shared login page (email + PIN)
│   │   │   └── super-admin/
│   │   │       └── register/
│   │   │           └── page.tsx         # Super Admin registration
│   │   └── dashboard/
│   │       └── page.tsx                  # School admin dashboard
│   │
│   ├── components/                        # Reusable React components
│   │   └── layout/
│   │       └── Header.tsx                # Header with user menu & school branding
│   │
│   ├── lib/                               # Utilities & helpers
│   │   ├── auth.ts                       # JWT generation & verification
│   │   ├── api-client.ts                 # Axios HTTP client
│   │   ├── pin-generator.ts              # PIN generation & validation
│   │   ├── supabase-client.ts            # Supabase client setup
│   │   ├── validation.ts                 # Zod validation schemas
│   │   └── __tests__/
│   │       └── pin-generator.test.ts    # PIN generator unit tests
│   │
│   ├── services/                          # Business logic layer
│   │   ├── auth.service.ts               # Authentication service
│   │   │   ├── registerSuperAdmin()
│   │   │   ├── registerSchool()
│   │   │   ├── loginWithEmail()
│   │   │   ├── loginWithPin()
│   │   │   ├── getCurrentUser()
│   │   │   └── logout()
│   │   │
│   │   └── school.service.ts             # School management service
│   │       ├── getSchoolById()
│   │       ├── updateSchool()
│   │       ├── uploadSchoolLogo()
│   │       ├── getSchoolDashboardStats()
│   │       ├── getSchoolUsers()
│   │       ├── createUser()
│   │       ├── updateUser()
│   │       ├── deactivateUser()
│   │       ├── uploadUserPhoto()
│   │       └── bulkUploadStaff()
│   │
│   ├── styles/
│   │   └── globals.css                   # Global Tailwind & custom CSS
│   │
│   └── types/
│       └── index.ts                      # TypeScript type definitions
│           ├── Enums (UserRole, SchoolType, etc.)
│           ├── Database models (School, User, Student, etc.)
│           ├── Auth models (AuthCredentials, JwtPayload, etc.)
│           └── API response models
│
├── database/                               # Database migrations & scripts
│   └── migrations/
│       └── 001_initial_schema.sql        # Complete PostgreSQL schema
│           ├── Tenancy layer (schools, users, login_pins)
│           ├── Academic structure (classes, subjects, students)
│           ├── Grading (score_sheets, report_cards)
│           ├── Payments (fee_structures, payments, receipts)
│           ├── CBT (cbt_exams, submissions)
│           ├── Content (lesson_notes, assignments, attendance)
│           ├── Announcements & notifications
│           ├── Audit logs
│           ├── Indexes (20+)
│           └── RLS policies
│
├── public/                                 # Static assets
│   ├── favicon.ico
│   └── [other static files]
│
├── Configuration Files
│   ├── package.json                       # Dependencies & scripts
│   ├── tsconfig.json                      # TypeScript config (strict mode)
│   ├── next.config.js                     # Next.js configuration
│   ├── tailwind.config.ts                 # Tailwind CSS configuration
│   ├── postcss.config.js                  # PostCSS configuration
│   ├── jest.config.js                     # Jest testing configuration
│   ├── jest.setup.js                      # Jest setup file
│   ├── .eslintrc.json                     # ESLint configuration
│   ├── .env.example                       # Environment variables template
│   ├── .gitignore                         # Git ignore rules
│   └── .gitattributes                     # Git attributes
│
└── Documentation Files
    ├── README.md                          # Main documentation & quick start
    ├── ARCHITECTURE.md                    # System design & architecture
    ├── DEPLOYMENT.md                      # Production deployment guide
    ├── SETUP_CHECKLIST.md                # Setup verification checklist
    ├── PHASE_1_SUMMARY.md                # Phase 1 implementation details
    └── PROJECT_STRUCTURE.md              # This file
```

---

## File Descriptions

### Source Code (`src/`)

#### App Directory (`src/app/`)
- **layout.tsx** — Root layout wrapper for all pages
- **page.tsx** — Home page (redirects based on auth state)
- **auth/login/page.tsx** — Main login page with:
  - School dropdown selector
  - Email/Password tab
  - PIN tab
  - Form validation
- **auth/super-admin/register/page.tsx** — Super Admin registration form
- **dashboard/page.tsx** — Main dashboard with:
  - User greeting
  - School stats cards
  - Quick action links
  - Recent activity placeholder

#### Components (`src/components/`)
- **layout/Header.tsx** — Header component with:
  - School logo & name
  - User photo & name
  - Dropdown menu
  - Logout button

#### Utilities (`src/lib/`)
- **auth.ts** — JWT utilities:
  - `generateJwt()` — Create JWT with school_id
  - `verifyJwt()` — Validate JWT signature
  - `decodeJwt()` — Decode without validation
  - `isJwtExpired()` — Check token expiration
  - `getJwtFromCookie()` — Extract token from request

- **pin-generator.ts** — PIN security:
  - `generatePin()` — Generate random 6-char PIN
  - `hashPin()` — Bcrypt hashing
  - `comparePin()` — Validate PIN against hash
  - `validatePinFormat()` — Format validation
  - `generateUniquePinWithRetry()` — Ensure uniqueness

- **supabase-client.ts** — Supabase setup:
  - Initialize Supabase client
  - Configure auth settings
  - Export helper functions

- **api-client.ts** — Axios HTTP client:
  - Auto JWT token attachment
  - Error handling & formatting
  - Request/response interceptors
  - Typed responses

- **validation.ts** — Zod validation schemas:
  - SuperAdminRegisterSchema
  - SchoolRegistrationSchema
  - EmailLoginSchema
  - PinLoginSchema
  - StudentRegistrationSchema
  - PaymentRecordingSchema
  - ScoreEntrySchema
  - AssignmentCreationSchema
  - CbtExamCreationSchema

#### Services (`src/services/`)
- **auth.service.ts** — Authentication logic:
  - `registerSuperAdmin()` — Create platform admin
  - `registerSchool()` — Create school + school admin
  - `loginWithEmail()` — Email/password authentication
  - `loginWithPin()` — PIN-based authentication
  - `getCurrentUser()` — Fetch authenticated user
  - `logout()` — Clear session
  - `forgotPassword()` — Email reset
  - `resetPassword()` — Set new password

- **school.service.ts** — School management:
  - `getSchoolById()` — Fetch school details
  - `updateSchool()` — Update school info
  - `uploadSchoolLogo()` — Handle logo upload
  - `getSchoolDashboardStats()` — Fetch statistics
  - `getSchoolUsers()` — List school users
  - `createUser()` — Add individual user
  - `updateUser()` — Modify user
  - `deactivateUser()` — Disable user
  - `uploadUserPhoto()` — Handle photo upload
  - `bulkUploadStaff()` — CSV import

#### Types (`src/types/`)
- **index.ts** — All TypeScript definitions:
  - Enums (UserRole, SchoolType, UserStatus, etc.)
  - Database models (20+ interfaces)
  - Auth models (AuthCredentials, JwtPayload, etc.)
  - API response models
  - Dashboard models

#### Styles (`src/styles/`)
- **globals.css** — Global styles with:
  - Tailwind directives
  - Utility classes (.card, .btn-*, etc.)
  - Responsive typography
  - Dark mode support
  - Loading animations

---

### Database (`database/`)

#### Migrations (`database/migrations/`)
- **001_initial_schema.sql** — Complete PostgreSQL schema (~600 lines):

  1. **Tenancy Layer** (5 tables)
     - schools, users, login_pins, roles, user_roles

  2. **Academic Structure** (7 tables)
     - classes, arms, class_arm_combos, subjects, subject_teacher_assignments, students, student_subjects

  3. **Staff & Students** (3 tables)
     - staff, guardians

  4. **Academic Terms** (1 table)
     - terms

  5. **Grading & Scores** (2 tables)
     - score_sheets, report_cards

  6. **Payments** (7 tables)
     - fee_structures, payments, receipts, salaries, payslips

  7. **CBT** (5 tables)
     - cbt_exams, cbt_questions, cbt_options, cbt_submissions, cbt_submission_scores

  8. **Content** (4 tables)
     - lesson_notes, assignments, assignment_submissions, attendance

  9. **Announcements** (2 tables)
     - announcements, notifications

  10. **Audit** (1 table)
      - audit_logs

  11. **Indexes** (20+)
      - On school_id, user_id, student_id, term_id, etc.

  12. **RLS Policies**
      - school_isolation on key tables

---

### Configuration Files

#### package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "dependencies": [
    "react", "next", "@supabase/supabase-js",
    "zod", "axios", "jsonwebtoken", "bcrypt"
  ]
}
```

#### tsconfig.json
- Strict mode enabled
- ESNext target
- Path aliases (@/*)
- Type checking enabled

#### next.config.js
- Strict React mode
- Image optimization
- Environment variables
- Supabase integration

#### tailwind.config.ts
- Custom colors (primary, secondary)
- Extended theme
- Responsive design

#### jest.config.js
- Jest environment: jsdom
- Module mappers
- Test patterns
- Coverage configuration

---

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Quick start guide and feature overview |
| `ARCHITECTURE.md` | System design, database schema, deployment architecture |
| `DEPLOYMENT.md` | Step-by-step deployment to Vercel + Supabase |
| `SETUP_CHECKLIST.md` | Comprehensive setup verification checklist |
| `PHASE_1_SUMMARY.md` | Phase 1 implementation details and roadmap |
| `PROJECT_STRUCTURE.md` | This file — directory and file descriptions |

---

## Key Dependencies

### Production
- **next** ^14.0.0 — React framework
- **react** ^18.2.0 — UI library
- **@supabase/supabase-js** ^2.38.0 — Supabase client
- **zod** ^3.22.0 — Schema validation
- **axios** ^1.6.0 — HTTP client
- **jsonwebtoken** ^9.1.0 — JWT handling
- **bcrypt** ^5.1.0 — Password hashing

### Development
- **typescript** ^5.3.0 — Type checking
- **tailwindcss** ^3.3.0 — Styling
- **jest** ^29.7.0 — Testing
- **@testing-library/react** ^14.1.0 — Component testing
- **eslint** ^8.54.0 — Code linting

---

## Important Patterns

### File Naming
- Components: PascalCase (`Header.tsx`)
- Utilities: camelCase (`pin-generator.ts`)
- Services: camelCase with `.service` suffix (`auth.service.ts`)
- Pages: lowercase with directory name (`app/auth/login/page.tsx`)
- Types: camelCase with `.test` suffix for tests

### Import Aliases
```typescript
// Use path alias instead of relative paths
import { AuthService } from '@/services/auth.service'
// Instead of: import { AuthService } from '../../../services/auth.service'
```

### Service Pattern
```typescript
// Services are static classes with no state
export class AuthService {
  static async loginWithEmail(...) { }
  static async loginWithPin(...) { }
}
```

### Component Pattern
```typescript
// Functional components with TypeScript
interface HeaderProps {
  userFullName?: string;
  userPhoto?: string;
}

export default function Header({ userFullName, userPhoto }: HeaderProps) {
  // Component logic
}
```

---

## Size & Metrics

- **Total files**: ~40
- **Lines of code**: ~8,000
- **Database tables**: 30+
- **API services**: 2 (Auth, School)
- **React components**: 2 (Header, Dashboard)
- **Pages**: 4 (Home, Login, Register, Dashboard)
- **TypeScript definitions**: 20+ types/interfaces
- **Validation schemas**: 9 Zod schemas
- **Test files**: 1 (PIN generator)

---

## Development Workflow

### Adding a New Page
1. Create directory: `src/app/feature/subfeature/`
2. Create `page.tsx` in directory
3. Add TypeScript types if needed
4. Create corresponding service if needed
5. Update navigation

### Adding a New Service
1. Create file: `src/services/feature.service.ts`
2. Create static methods
3. Add error handling
4. Add JSDoc comments
5. Export from service file

### Adding a New Component
1. Create file: `src/components/Feature.tsx`
2. Define TypeScript props interface
3. Implement component
4. Add JSDoc comments
5. Export default component

### Adding Tests
1. Create file: `src/lib/__tests__/feature.test.ts`
2. Import Jest + testing utilities
3. Write describe/test blocks
4. Run: `npm run test`

---

## Deployment Paths

### Development
```
localhost:3000 → Vercel Preview (auto)
```

### Production
```
git push → Vercel (auto deploy) → Live site
```

### Database
```
npm run migrations → Supabase (auto backup)
```

---

This structure is production-ready and follows modern Next.js 14 best practices.

For detailed explanations, see:
- `ARCHITECTURE.md` — Design decisions
- `README.md` — Usage guide
- `DEPLOYMENT.md` — Deployment steps
