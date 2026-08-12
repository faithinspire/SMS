# School Management System (SaaS)

A comprehensive, multi-tenant cloud-based school management platform built with modern technologies for primary and secondary schools.

## 🎯 Features (Phase 1)

- **Multi-tenancy** — Multiple schools on single platform with complete data isolation
- **Dual Authentication** — Email/Password for admins, PIN for students and staff
- **Shared Landing Page** — Single login entry point with school dropdown
- **School Admin Dashboard** — Manage school profile, users, and basic operations
- **User Management** — Create and manage staff and students
- **White-label Branding** — Each school has custom logo and branding

## 📦 Tech Stack

- **Frontend**: Next.js 14+ with React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Database**: PostgreSQL (via Supabase)
- **File Storage**: Supabase Storage (S3-compatible)
- **Hosting**: Vercel
- **Testing**: Jest + React Testing Library
- **Validation**: Zod

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repo-url>
cd school-management-saas

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 2. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Get your **Project URL** and **Anon Key**
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Apply Database Schema

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link

# Apply migrations
supabase db push
```

Or manually run the SQL in `database/migrations/001_initial_schema.sql` through Supabase console.

### 4. Environment Configuration

Edit `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret-key

# External Services (configure later)
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
PAYSTACK_PUBLIC_KEY=your-paystack-key
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Usage

### Super Admin Registration
1. Navigate to `/auth/super-admin/register`
2. Create your super admin account
3. You can now manage schools from the platform

### Register a School
1. Log in as Super Admin
2. Go to Schools → Add New School
3. Fill in school details (name, type, logo, etc.)
4. School Admin account will be created and credentials sent via email

### Login Flow
1. Go to `/auth/login`
2. Select school from dropdown
3. Choose login method:
   - **Email/Password**: For School Admin and staff with email
   - **PIN**: For students and staff (6-character alphanumeric code)
4. Dashboard loads based on user role

## 🏗️ Project Structure

```
school-management-saas/
├── src/
│   ├── app/                 # Next.js app directory (pages and layouts)
│   ├── components/          # React components
│   ├── lib/                 # Utilities and helpers
│   ├── services/            # Business logic and API services
│   ├── styles/              # Global CSS
│   └── types/               # TypeScript type definitions
├── database/
│   └── migrations/          # SQL migration files
├── public/                  # Static assets
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── jest.config.js          # Jest testing configuration
└── README.md               # This file
```

## 🧪 Testing

### Run Unit Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

### Key Test Files
- `src/lib/__tests__/pin-generator.test.ts` — PIN generation and security tests

## 📚 API Services

### AuthService
```typescript
// Register Super Admin
await AuthService.registerSuperAdmin(email, password, fullName)

// Register School
await AuthService.registerSchool(
  schoolName, schoolType, schoolEmail, 
  schoolPhone, schoolAddress, 
  adminFullName, adminEmail, tempPassword
)

// Login with Email
await AuthService.loginWithEmail(schoolId, email, password)

// Login with PIN
await AuthService.loginWithPin(schoolId, pin)

// Get current user
await AuthService.getCurrentUser()

// Logout
await AuthService.logout()
```

### SchoolService
```typescript
// Get school details
await SchoolService.getSchoolById(schoolId)

// Update school
await SchoolService.updateSchool(schoolId, updates)

// Upload school logo
await SchoolService.uploadSchoolLogo(schoolId, file)

// Get dashboard stats
await SchoolService.getSchoolDashboardStats(schoolId)

// Get school users
await SchoolService.getSchoolUsers(schoolId, role?)

// Create user
await SchoolService.createUser(schoolId, email, fullName, role)
```

## 🔐 Security

- ✅ JWT authentication with school_id claims
- ✅ PostgreSQL Row-Level Security (RLS) for data isolation
- ✅ PIN hashing with bcrypt
- ✅ Rate limiting on login attempts
- ✅ HTTPS only (enforced by Vercel)
- ✅ Environment variables never exposed in client code
- ✅ Input validation with Zod

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - Other external service keys
4. Deploy automatically on git push

### Database Migrations on Deployment

```bash
# Before deploying, run:
supabase db push
```

## 📈 Roadmap

### Phase 2: Student Registration & Auto-Linking
- Student registration with photo upload
- Automatic Class/Subject teacher assignment
- Teacher dashboard with student lists
- Automatic student-teacher relationships

### Phase 3: Payments Module
- Payment recording (cash, bank, card)
- Receipt generation and PDF export
- Email and WhatsApp notifications
- Financial reporting

### Phase 4: CBT Portal
- Question bank creation
- Computer-based testing
- Auto-grading and score sheet auto-feed

### Phase 5: Grading & Report Cards
- Manual score entry
- Grade calculation
- Report card generation
- Downloadable PDFs

### Phase 6: Lessons & Assignments
- Lesson notes management
- Assignment creation and submission
- Attendance tracking
- In-app notifications

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 📞 Support

For issues and questions:
1. Check the [Architecture Documentation](./ARCHITECTURE.md)
2. Review [Database Schema](./database/migrations/001_initial_schema.sql)
3. Open an issue on GitHub

---

**Built with ❤️ for modern schools**
