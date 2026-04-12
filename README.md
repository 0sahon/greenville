# Greenville Montessori School — Management System

A comprehensive school management system for **[Greenville Montessori Schools](https://www.greenvillemontessorischools.ng/)**, a Nigerian Montessori school in **Benin City, Edo State** (Plot 110 Ekenwan Road). It serves learners from creche through Primary 6 (Basic 1–6).

## 🌟 Features

### Multi-Role Support
- **Parents**: View children's progress, pay fees, communicate with teachers
- **Teachers**: Manage classes, record grades, track attendance
- **Students**: Access grades, view assignments, see achievements
- **Administrators**: Comprehensive school management and analytics

### Core Functionality
- Student registration and enrollment management
- Real-time attendance tracking
- Academic progress monitoring and grade recording
- Fee payment system with configurable currency (default ₦ in seeded settings; change in Admin → Settings)
- Parent-teacher communication platform
- Health records and emergency contact management
- Transport/bus route management
- Announcements and notifications system

### PWA & mobile (Capacitor)

1. **Progressive Web App** — After `npm run build` and hosting over **HTTPS**, users can **Install** the site from the browser (e.g. Chrome menu → *Install Greenville Montessori…*). The service worker precaches the app shell and uses a network-first strategy for Supabase API calls.
2. **Native Android / iOS** — Capacitor copies `dist/` into the native projects. Typical workflow:

```bash
npm run build:mobile    # vite build + npx cap sync
npx cap open android    # opens Android Studio (install Android SDK / Studio first)
npx cap open ios        # opens Xcode — requires macOS
```

- **Android**: install [Android Studio](https://developer.android.com/studio), accept SDK licenses, then build a signed APK/AAB from Studio.
- **iOS**: run `cap open ios` on a Mac with Xcode; configure signing & bundle id (`ng.greenvillemontessorischools.portal` in `capacitor.config.ts` — change for your store listing).
- **Icons**: manifest uses `public/vite.svg` as a placeholder. For store-ready assets, add **192×192** and **512×512** PNGs under `public/`, update `vite.config.ts` (`VitePWA` → `manifest.icons`) and `index.html` (`apple-touch-icon`).

### Public Website
- Multi-page public website (Home, About, Programs, Academics, Admissions, News & Events, Contact)
- Kids Zone — interactive educational activities for students (Reading, Math, Art, Music, World Explorer, Achievement Hall)

### Design & localization
- Colorful, mobile-first UI suitable for parents and staff on the go
- Date formatting defaults to Nigerian English locale (`en-NG`) in dashboards
- Currency symbol is driven by `school_settings` (seed defaults to ₦; switch to `$` / `USD` in Settings if needed)
- English language with local educational terminology

## 🚀 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **PWA**: `vite-plugin-pwa` (installable app, offline shell, auto-updating service worker)
- **Native shells**: [Capacitor](https://capacitorjs.com/) (`android/`, `ios/`) wrapping the production `dist/` build
- **Styling**: Tailwind CSS with custom animations
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time subscriptions)
- **Icons**: Lucide React
- **Deployment**: Optimized for Netlify/Vercel; same web build is synced into native projects via Capacitor

## 🎨 Design Philosophy

The system features a vibrant, kid-friendly interface with:
- Smooth animations and micro-interactions
- Age-appropriate color schemes for different user roles
- Intuitive navigation suitable for all age groups
- Mobile-responsive design
- Apple-level attention to detail and user experience

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

## 🛠️ Setup Instructions

### 1. Clone and Install
```bash
git clone <repository-url>
cd green
npm install
```

### 2. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your project URL and anonymous key
3. Copy `.env.example` to `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. Database (migrations + Supabase CLI)

Schema is applied from `supabase/migrations/` in order, mainly:

- `20260415120000_school_management_system.sql` — core schema  
- `20260416120000_submission_work_images.sql` — private photos for assignment submissions (`submission-work` bucket)  
- `20260417120000_submission_work_documents.sql` — document uploads (PDF/Office) + larger bucket limit  
- `20260418140000_lesson_plans.sql` — structured lesson plans + admin review (`lesson_plans` table)

Step-by-step CLI instructions (new empty project, env vars, edge functions, caveats) are in **[SUPABASE_DEPLOY.md](./SUPABASE_DEPLOY.md)**.

Quick version (use `npx supabase@latest …` if the CLI is not installed globally):

```bash
npx supabase@latest link --project-ref YOUR_PROJECT_REF --yes
npx supabase@latest db push --yes
```

Then optional: `npx supabase@latest functions deploy …` as described in `SUPABASE_DEPLOY.md`.

**TypeScript `Database` types:** With the project linked (`supabase link`), regenerate `src/lib/database.generated.ts` whenever the remote schema changes (tables, views, enums, RPCs). The app imports this from `src/lib/supabase.ts` as `createClient<Database>(…)`.

```bash
npm run gen:db-types
```

For a local database (`supabase start`), use `npm run gen:db-types:local` instead. The generator strips CLI noise and writes UTF-8 via `scripts/gen-db-types.mjs`.

**Another school:** edit `src/config/schoolBrand.ts` and replace the `school_settings` default `school_name` in the migration (search for `Your School Name`) before pushing to a new project.

### 4. Create Demo User Accounts

**Fastest (local testing):** from the repo root, put `VITE_SUPABASE_URL` and **`SUPABASE_SERVICE_ROLE_KEY`** in `.env` (see `.env.example`), then run:

```bash
npm run seed:min
```

That creates the four demo auth users, their `profiles` rows, and a **minimal** school graph (one class **Demo Class A**, demo student in that class, `teachers` / `parents` rows, and a parent–student link) so student/parent/teacher screens have data to load.

**Manual alternative:** create the same accounts in the Supabase dashboard under **Authentication → Users**:

| Email | Password | Role |
|---|---|---|
| admin@greenvillemontessorischools.ng | Admin123! | Administrator |
| teacher@greenvillemontessorischools.ng | Teacher123! | Teacher |
| parent@greenvillemontessorischools.ng | Parent123! | Parent |
| student@greenvillemontessorischools.ng | Student123! | Student |

If you only create users manually, add a `students` row for the student profile, a `parents` row for the parent, and `student_parents` (or run `node scripts/seed-minimal-test.mjs` after users exist) so parent/student dashboards are not empty.

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to access the system.

**Windows PowerShell:** if you see *“running scripts is disabled”* when running `npm`, either:

- Run **`dev.cmd`** from Explorer or the terminal (repo root — it calls `npm.cmd` so PowerShell never loads `npm.ps1`), or  
- Use **`npm.cmd run dev`** instead of `npm run dev`, or  
- Allow scripts for your account once:  
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`  
  (Company-managed PCs may still override this via Group Policy.)

## 🏗️ Database Schema

The system uses a comprehensive PostgreSQL schema with:

### Core Tables
- `profiles` - User profiles with role-based access
- `students` - Student information and enrollment data
- `classes` - Class/grade management
- `teachers` - Teacher profiles and qualifications
- `parents` - Parent information and relationships
- `attendance` - Daily attendance tracking
- `grades` - Academic performance records
- `fees` - Fee structure and payment tracking
- `announcements` - School communications
- `health_records` - Student medical information
- `transport` - Bus routes and transportation

### Security Features
- Row Level Security (RLS) enabled on all tables (policies live in `supabase/migrations/`; they are not reflected in generated TypeScript types)
- Role-based access policies
- Data encryption and secure authentication
- Audit trails for sensitive operations

## 👥 User Roles & Permissions

### Parents
- View their children's academic progress
- Track attendance and grades
- Pay school fees online
- Communicate with teachers
- Access school announcements

### Teachers
- Manage assigned classes
- Record student grades and attendance
- Create lesson plans and assignments
- Communicate with parents
- Generate progress reports

### Students (age-appropriate features)
- View their own grades and attendance
- Access learning materials
- See achievements and rewards
- View class schedule

### Administrators
- Complete school management access
- Student and staff management
- Financial reporting and analytics
- System configuration
- Data export and backup

## 🎯 Curriculum & levels

### Academic Structure
- Supports levels from Creche to Basic 6 (aligned with the original schema)
- Term-based academic calendar
- NERDC curriculum alignment
- Local assessment methods

### Cultural Features
- Branding defaults live in `src/config/schoolBrand.ts`
- Local currency support (Naira ₦)
- Cultural imagery and icons
- Support for local naming conventions

## 📱 Mobile Optimization

- Progressive Web App (PWA) capabilities
- Offline functionality for essential features
- Optimized for low-bandwidth connections
- Touch-friendly interface design
- Fast loading with image optimization

## 🔧 Development

### File Structure
```
src/
├── components/
│   ├── auth/                   # Authentication components
│   │   ├── AuthLayout.tsx
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── dashboards/             # Role-specific dashboards
│   │   ├── AdminDashboard.tsx
│   │   ├── ParentDashboard.tsx
│   │   ├── StudentDashboard.tsx
│   │   └── TeacherDashboard.tsx
│   ├── kids/                   # Kids Zone interactive area
│   │   ├── KidsButton.tsx
│   │   ├── KidsLanding.tsx
│   │   └── activities/
│   │       ├── AchievementHall.tsx
│   │       ├── ArtStudio.tsx
│   │       ├── MathFun.tsx
│   │       ├── MusicRoom.tsx
│   │       ├── ReadingCorner.tsx
│   │       └── WorldExplorer.tsx
│   └── website/                # Public-facing website
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── MainWebsite.tsx
│       ├── HeroSection.tsx
│       ├── AboutSection.tsx
│       ├── ProgramsSection.tsx
│       ├── AdmissionsSection.tsx
│       ├── TestimonialsSection.tsx
│       ├── ContactSection.tsx
│       └── pages/
│           ├── HomePage.tsx
│           ├── AboutPage.tsx
│           ├── AcademicsPage.tsx
│           ├── AdmissionsPage.tsx
│           ├── ContactPage.tsx
│           ├── NewsEventsPage.tsx
│           └── ProgramsPage.tsx
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts
│   └── useSounds.ts
├── lib/                        # Utilities and configurations
│   ├── supabase.ts             # Supabase client + row aliases; `Database` from `database.types`
│   ├── database.types.ts       # Merges codegen + CHECK-backed unions (see “TypeScript database types”)
│   ├── database.generated.ts   # `npm run gen:db-types` — do not edit by hand
│   └── storageBuckets.ts       # Typed app storage buckets + `appStorageFrom` helper
├── App.tsx
├── main.tsx
└── index.css
```

### Key Components
- `App.tsx` - Root component; handles routing between website, auth, dashboards, and Kids Zone
- `MainWebsite` - Public website shell with Header, Footer, and page routing
- `Header` - Sticky navigation bar with top contact bar, nav links, and Kids Zone button
- `AuthLayout` - Shared authentication card wrapper
- `LoginForm` / `RegisterForm` - Sign-in and registration forms
- `ParentDashboard` - Parent portal with child tracking and fee management
- `TeacherDashboard` - Classroom management interface
- `AdminDashboard` - Administrative control panel
- `StudentDashboard` - Kid-friendly student interface
- `KidsLanding` - Interactive Kids Zone with six educational activity rooms

### TypeScript database types

- **`database.generated.ts`** is produced by `npm run gen:db-types` (or `gen:db-types:local`). Regenerate it whenever the Postgres schema changes so table columns and RPC signatures stay aligned with Supabase.
- **`database.types.ts`** imports that file and exports the `Database` type the app uses. It narrows a few `string` columns where SQL documents or enforces specific values (for example admission workflow status, message broadcast roles, CBT multiple-choice letters). If codegen and this layer disagree after a migration, update the merge in `database.types.ts`.
- **RLS and storage policies** live only in SQL migrations; TypeScript does not model them. The client still must handle permission errors from PostgREST and Storage.
- **Money and grades** use `number` in generated types (Postgres `numeric`); that is acceptable at school scale but is not arbitrary-precision decimal semantics.

## 🚀 Deployment

### For production hosting
1. Build the project: `npm run build`
2. Deploy to Netlify, Vercel, or your preferred static host
3. Configure environment variables on hosting platform
4. Set up custom domain (recommended: .ng or .com.ng)

### Production Considerations
- Enable Supabase production mode
- Configure backup schedules
- Set up monitoring and alerts
- Implement CDN for static assets
- Configure SSL certificates

## 🔒 Security Features

- Multi-factor authentication support
- Role-based access control (RBAC)
- Data encryption at rest and in transit
- Regular security audits
- Follow applicable student data protection rules in your jurisdiction
- Secure payment processing integration

## 📊 Analytics & Reporting

- Student performance analytics
- Attendance trend analysis
- Financial reporting and fee tracking
- Parent engagement metrics
- Teacher productivity insights
- School-wide performance dashboards

## 🆘 Support & Maintenance

### Common Issues
- Authentication problems: Check Supabase configuration and ensure demo accounts are created
- Database connection issues: Verify environment variables in `.env`
- UI rendering problems: Clear browser cache
- Mobile display issues: Check responsive CSS

### Updates
- Regular dependency updates
- Security patch management
- Feature enhancement releases
- Bug fix deployments

## 📞 Contact & Support

For technical support or customization requests:
- Email: info@greenvillemontessorischools.ng
- Phone: +234 XXX XXX XXXX
- Public site: [greenvillemontessorischools.ng](https://www.greenvillemontessorischools.ng/) — contact details are mirrored in `src/config/schoolBrand.ts`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- State and local authorities for curriculum guidelines
- Montessori education methodology
- Open source community contributors
- Open-source educational tooling communities

---

Built for Greenville Montessori School
