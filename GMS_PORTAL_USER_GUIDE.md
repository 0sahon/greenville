# Greenville Montessori Schools — Portal User Guide
### Official Training & Presentation Reference · Academic Session 2025/2026

---

## Table of Contents

1. [Accessing the Portal](#1-accessing-the-portal)
2. [Demo Login Credentials](#2-demo-login-credentials)
3. [Admin Portal](#3-admin-portal)
4. [Teacher Portal](#4-teacher-portal)
5. [Student Portal](#5-student-portal)
6. [Parent Portal](#6-parent-portal)
7. [Shared Features](#7-shared-features)
8. [Quick Tips](#8-quick-tips)

---

## 1. Accessing the Portal

1. Open a web browser and go to the school website.
2. Click **Parent Portal** in the top navigation bar (or the **Access Parent Portal** button on the home page).
3. The login screen will appear. Enter your **email** and **password**.
4. Click **Sign In**. You will be taken directly to your role's dashboard.

> **Note:** Your dashboard changes automatically based on your role — admin, teacher, student, or parent. There is no need to select a role manually.

---

## 2. Demo Login Credentials

> All demo accounts use the school domain `@greenvillemontessorischools.ng`.
> These credentials are for **demonstration and training only**.

### 2.1 Administrator

| Field    | Value                                      |
|----------|--------------------------------------------|
| Email    | `admin@greenvillemontessorischools.ng`     |
| Password | `Admin123!`                                |

---

### 2.2 Teachers

| Name              | Email                                                   | Password      | Role / Specialisation                        | Class           |
|-------------------|---------------------------------------------------------|---------------|----------------------------------------------|-----------------|
| Adaeze Okonkwo    | `teacher.adaeze@greenvillemontessorischools.ng`         | `Teacher123!` | Mathematics & Basic Science                  | Pre-KG          |
| Emeka Eze         | `teacher.emeka@greenvillemontessorischools.ng`          | `Teacher123!` | English Language & Social Studies            | KG 1            |
| Ifeoma Okeke      | `teacher.ifeoma@greenvillemontessorischools.ng`         | `Teacher123!` | Primary Education & Class Management         | Basic 3A        |

---

### 2.3 Students

All student passwords: **`Student123!`**

#### Pre-KG Class (Toddler Level)
| Student Name      | Email                                                          | Student ID               |
|-------------------|----------------------------------------------------------------|--------------------------|
| Zara Eze          | `zara.eze@greenvillemontessorischools.ng`                      | QFS-2026-TOD-001         |
| Kene Chukwu       | `kene.chukwu@greenvillemontessorischools.ng`                   | QFS-2026-TOD-002         |
| Somto Okafor      | `somto.okafor@greenvillemontessorischools.ng`                  | QFS-2026-TOD-003         |
| Chimamanda Nwosu  | `chimamanda.nwosu@greenvillemontessorischools.ng`              | QFS-2026-TOD-004         |
| Funmi Adeyemi     | `funmi.adeyemi@greenvillemontessorischools.ng`                 | QFS-2026-TOD-005         |

#### KG 1 Class (Nursery Level)
| Student Name      | Email                                                          | Student ID               |
|-------------------|----------------------------------------------------------------|--------------------------|
| Kelechi Eze       | `kelechi.eze@greenvillemontessorischools.ng`                   | QFS-2026-CRE-001         |
| Chinonso Okafor   | `chinonso.okafor@greenvillemontessorischools.ng`               | QFS-2026-CRE-002         |
| Tunde Adeyemi     | `tunde.adeyemi@greenvillemontessorischools.ng`                 | QFS-2026-CRE-003         |
| Amina Bello       | `amina.bello@greenvillemontessorischools.ng`                   | QFS-2026-CRE-004         |
| Chioma Obi        | `chioma.obi@greenvillemontessorischools.ng`                    | QFS-2026-CRE-005         |

#### Basic 3A Class (Primary Level)
| Student Name      | Email                                                          | Student ID               |
|-------------------|----------------------------------------------------------------|--------------------------|
| Chidera Nwosu     | `chidera.nwosu@greenvillemontessorischools.ng`                 | QFS-2026-BAS-001         |
| Amaka Okafor      | `amaka.okafor@greenvillemontessorischools.ng`                  | QFS-2026-BAS-002         |
| Tobi Adeyemi      | `tobi.adeyemi@greenvillemontessorischools.ng`                  | QFS-2026-BAS-003         |
| Fatima Bello      | `fatima.bello@greenvillemontessorischools.ng`                  | QFS-2026-BAS-004         |
| Emmanuel Obi      | `emmanuel.obi@greenvillemontessorischools.ng`                  | QFS-2026-BAS-005         |

---

### 2.4 Parents

All parent passwords: **`Parent123!`**

These accounts are pre-seeded by `seed-presentation-demo.mjs` and linked to their child's student record.

#### Pre-KG Parents
| Parent Name          | Email                                                               | Linked Student      |
|----------------------|---------------------------------------------------------------------|---------------------|
| Ngozi Eze            | `parent.ngozi.eze@greenvillemontessorischools.ng`                   | Zara Eze            |
| Chukwuemeka Chukwu   | `parent.chukwuemeka.chukwu@greenvillemontessorischools.ng`          | Kene Chukwu         |

#### KG 1 Parents
| Parent Name          | Email                                                               | Linked Student      |
|----------------------|---------------------------------------------------------------------|---------------------|
| Adaobi Eze           | `parent.adaobi.eze@greenvillemontessorischools.ng`                  | Kelechi Eze         |
| Uchenna Okafor       | `parent.uchenna.okafor@greenvillemontessorischools.ng`              | Chinonso Okafor     |

#### Basic 3A Parents
| Parent Name          | Email                                                               | Linked Student      |
|----------------------|---------------------------------------------------------------------|---------------------|
| Bola Nwosu           | `parent.bola.nwosu@greenvillemontessorischools.ng`                  | Chidera Nwosu       |
| Segun Adeyemi        | `parent.segun.adeyemi@greenvillemontessorischools.ng`               | Amaka Okafor        |

> **After your presentation:** run `node scripts/seed-presentation-demo.mjs --clear` to remove all parent accounts and demo data instantly.

---

## 3. Admin Portal

**Login as:** `admin@greenvillemontessorischools.ng` / `Admin123!`

The Admin dashboard is the school's central control panel. It has **22 sections** accessible from the left sidebar.

---

### 3.1 Overview
**What it shows:** A live summary of the whole school — total students, teachers, classes, attendance rate, fee collection summary, pending admissions, and recent activity.

**How to use:**
- Review the KPI cards at the top for a quick health check of the school.
- Use the quick-action buttons to jump directly to common tasks.

---

### 3.2 Admissions
**What it does:** Manages the full admissions pipeline for new students.

**How to use:**
1. Click **Admissions** in the sidebar.
2. Click **New Application** to record an enquiry or admission.
3. Fill in the applicant's details (name, date of birth, programme applied for, parent contact).
4. Set the status: *Enquiry → Under Review → Offered → Enrolled → Rejected*.
5. Once enrolled, generate and print the **Offer of Admission Letter** from this section.

---

### 3.3 Students
**What it does:** The complete student registry.

**How to use:**
- **View all students:** Browse the table, search by name or class, or filter by level.
- **Add a student:** Click **Add Student**, fill in name, date of birth, gender, class, and parent info.
- **View a student profile:** Click any student's row to see their full record (grades, attendance, fees, result cards).
- **Edit / deactivate:** Use the action buttons on each row.

---

### 3.4 Teachers
**What it does:** Manage all teaching staff records.

**How to use:**
- Add a teacher with their name, email, qualification, and specialisation.
- Assign them to classes and subjects.
- View each teacher's workload and class assignments.
- Employee IDs are auto-generated (e.g. `TCH-2026-001`).

---

### 3.5 Classes
**What it does:** Create and manage class groups; run end-of-term promotions.

**How to use:**
- **Add a class:** Click **New Class**, enter the class name (e.g. *KG 1*), select the level, academic year, and assign a class teacher.
- **Promote students:** At the end of term, use the **Promote** tool to move all students in a class to the next level.
- **Print Promotion Certificates:** After promotion, print individual or batch certificates directly from this screen.

---

### 3.6 Subjects
**What it does:** Define all subjects per class and assign teachers to them.

**How to use:**
1. Select a class from the dropdown.
2. Click **Add Subject** and enter the subject name, code, and assigned teacher.
3. Subjects created here automatically appear in Grades and Result Sheets.

---

### 3.7 Attendance
**What it does:** View school-wide attendance records across all classes.

**How to use:**
- Filter by class, date range, or term.
- See daily present/absent counts per class.
- Export attendance data for reporting.

> *Day-to-day attendance marking is done by Teachers in their own portal.*

---

### 3.8 Grades
**What it does:** View and edit grade records for all students across all classes and terms.

**How to use:**
- Filter by class, subject, term, and academic year.
- Click a student's name to open their grade detail and edit individual scores (CA1, CA2, Project, Homework, Exam).
- The system automatically calculates totals and grade letters.

---

### 3.9 Fees & Finance
**What it does:** Manage school fee payments, generate receipts, and track outstanding balances.

**How to use:**
- **Record a payment:** Find the student, click **Record Payment**, enter the amount paid and fee type.
- **Print Fee Receipt:** After saving, click **Print Receipt** to generate a branded official receipt.
- **View balance:** Each student row shows total fee, amount paid, and outstanding balance.
- Filter by payment status: *Paid, Partial, Unpaid*.

---

### 3.10 Parents
**What it does:** Manage parent/guardian accounts and link them to their children.

**How to use:**
- Click **Add Parent** to create a parent account. The system sends login credentials automatically.
- Link the parent to one or more students.
- Parents can then log in to the Parent Portal to view their child's data.

---

### 3.11 Transport
**What it does:** Manage school bus routes, vehicles, and student transport assignments.

**How to use:**
- Add bus routes with pickup and drop-off points.
- Assign students to specific routes.
- Track which students use school transport.

---

### 3.12 Health Records
**What it does:** Maintain each student's medical information.

**How to use:**
- Search for a student and open their health record.
- Record blood group, allergies, medical conditions, immunisation dates, and clinic visits.
- This data is available to authorised staff in case of a health emergency.

---

### 3.13 LMS (Learning Management System)
**What it does:** The school-wide learning hub — courses, assignments, materials, lesson plans, and student submissions.

**How to use:**

| Tab | What to do |
|-----|------------|
| **Courses** | Create course topics for each class and subject |
| **Assignments** | Create and manage homework and classwork tasks |
| **Materials** | Upload links, PDFs, or files for students |
| **Lesson Plans** | Review lesson plans submitted by teachers; approve or reject |
| **Submissions** | View and grade student assignment submissions |

> **Lesson Plan Inbox:** When teachers submit lesson plans for review, a notification badge appears. Click **LMS → Lesson Plans** to review and respond.

---

### 3.14 Announcements
**What it does:** Post school-wide notices, circulars, and important messages visible to all portal users.

**How to use:**
1. Click **New Announcement**.
2. Enter the title, body text, and select the target audience (All / Teachers / Parents / Students).
3. Click **Publish**. The announcement appears immediately on all relevant dashboards.

---

### 3.15 Calendar
**What it does:** Manage the school academic calendar — term dates, holidays, events, and exam periods.

**How to use:**
- Click any date to add an event.
- Colour-coded event types: *Holiday (red), Exam (purple), School Event (blue), General (green)*.
- Events appear on the calendars of teachers, students, and parents.

---

### 3.16 Result Sheets
**What it does:** Generate, edit, preview, and share official student result cards.

**How to use:**
1. Select a class, term, and academic year.
2. Click a student's name to open their Result Card.
3. Switch between **Preview** (what the card looks like) and **Edit** (to add remarks, behaviour scores, next-term info).
4. Click **Save** to record changes, or **Share via WhatsApp** to send directly to the parent.
5. Printed result cards include the school logo, all subject scores, behaviour ratings, teacher and principal comments.

---

### 3.17 CBT Exams
**What it does:** Create and manage Computer-Based Tests (multiple choice exams).

**How to use:**
1. Click **New Exam**, set the title, class, subject, duration, and date.
2. Add questions using the Question Builder (type question, add 4 options, mark the correct answer).
3. **Publish** the exam when ready. Students see it in their CBT section.
4. After the exam closes, view results and scores automatically calculated by the system.

---

### 3.18 Timetable
**What it does:** Build and print the weekly class timetable for each class.

**How to use:**
- Select a class and term.
- Drag subjects into the timetable grid (Monday–Friday, Periods 1–8).
- Click **Print Timetable** to generate a branded printable timetable document.

---

### 3.19 Bulk Import
**What it does:** Import large numbers of students, teachers, or grades from a spreadsheet.

**How to use:**
1. Download the sample CSV template for the data type (students / grades).
2. Fill in the template with your data.
3. Upload the CSV file and click **Import**.
4. The system validates the data, shows errors if any, and confirms successful imports.

---

### 3.20 Messages
**What it does:** Internal messaging between admin, teachers, and parents.

**How to use:**
- Click **New Message**, select the recipient (by name or role), write your message, and send.
- Replies appear in a conversation thread.
- Unread messages show a badge count on the Messages sidebar item.

---

### 3.21 Reports
**What it does:** Generate and print school-wide analytics reports.

**Key reports available:**
- **Result Analysis Report** — subject-by-subject pass rates, class average, top performers; printable as a branded A4 document.
- **Attendance Summary** — daily and monthly attendance by class.
- **Fee Collection Report** — revenue, outstanding balances.

---

### 3.22 Audit Log
**What it does:** A tamper-proof record of every significant action taken in the portal.

**How to use:**
- Filter by user, action type, or date range.
- Use this to investigate any data changes or security concerns.

---

### 3.23 Settings
**What it does:** Configure school-level settings.

**Options include:**
- School name and branding
- Default academic year and current term
- Fee structure and payment settings
- Portal access controls

---

## 4. Teacher Portal

**Login as:** `teacher.adaeze@greenvillemontessorischools.ng` / `Teacher123!`  
*(or Emeka Eze: `teacher.emeka@greenvillemontessorischools.ng` / `Teacher123!`)*

The Teacher dashboard focuses on daily classroom management and student engagement.

---

### 4.1 Overview
**What it shows:** Today's schedule, pending tasks (unmarked attendance, ungraded assignments, lesson plan approvals pending), and a summary of the teacher's classes.

---

### 4.2 My Classes
**What it does:** Shows all classes assigned to this teacher.

**How to use:**
- Click a class card to see the full student list for that class.
- View the class timetable and subjects at a glance.

---

### 4.3 My Students
**What it does:** A full list of all students under this teacher's care.

**How to use:**
- Search by name.
- Click a student to view their profile, grades, and attendance record.
- Contact a student's parent via the messaging system from here.

---

### 4.4 Attendance
**What it does:** Mark daily attendance for the teacher's class.

**How to use:**
1. Select the class and date (defaults to today).
2. Each student is shown with **Present / Absent / Late** toggle buttons.
3. Click **Save Attendance**.
4. Past attendance records can be viewed and corrected.

> **Morning Circle Energizer:** The attendance screen includes an AI-powered **Morning Circle Energizer** button that generates a fun, age-appropriate activity idea to start the school day.

---

### 4.5 Grades
**What it does:** Enter and manage student assessment scores.

**The Grades section has three tabs:**

| Tab | Purpose |
|-----|---------|
| **Grade Sheet** | Enter scores for CA1, CA2, Project, Homework, and Exam for each student |
| **Records View** | Browse all submitted grades with calculated totals and grade letters |
| **Datasheet Entry** | A spreadsheet-style bulk entry view for fast data input |

**How to use:**
1. Select the class, subject, term, and assessment type.
2. Enter each student's score.
3. Click **Save**. Scores are instantly reflected in student result cards.

---

### 4.6 Result Cards
**What it does:** Preview and manage result cards for the teacher's students.

**How to use:**
- Select a student and term to view their compiled result card.
- The card shows all subject scores, total, position, behaviour ratings, and teacher comment.
- Click **Print** to generate the official branded printable card.

---

### 4.7 LMS (Learning Management System)
**What it does:** The teacher's content creation hub — manage lessons, assignments, materials, and lesson plans.

**Tabs:**

| Tab | What to do |
|-----|------------|
| **Subjects & Topics** | Create lesson topics for each subject. Use **✨ AI Generate Notes** to auto-write lesson materials |
| **Assignments** | Create homework or classwork tasks with deadlines and scoring |
| **Submissions** | View and grade student submissions for assignments |
| **Class Materials** | Upload or link resources (PDFs, videos, websites) for students |
| **Lesson Plans** | Write and submit weekly lesson plans for admin review |
| **Week at a Glance** | A visual overview of this week's scheduled lessons |

**AI Features in LMS:**
- **AI Generate Notes** — Type a topic title, click the button, and the AI writes comprehensive lesson notes automatically.
- **AI Lesson Plan** — In the Lesson Plans section, click **AI Generate** to create a full lesson plan with objectives, activities, and materials.
- **Visual Lesson Image** — A lesson graphic is automatically generated and embedded in lesson notes.
- **Kids Slideshow Player** — Click the slideshow icon on any topic to launch a full-screen presentation player suitable for classroom display.

---

### 4.8 Announcements
**What it does:** View school-wide announcements posted by the Admin.

---

### 4.9 Calendar
**What it does:** View the school calendar — term dates, school events, exam periods, and the teacher's own schedule.

**How to use:**
- Click any date to view events on that day.
- Teachers can add personal schedule notes visible only to themselves.

---

### 4.10 CBT Exams
**What it does:** Create Computer-Based Tests for the teacher's students.

**How to use:**
1. Click **New Exam** and set the title, class, subject, and time limit.
2. Add multiple-choice questions one by one, or use the **Question Bank** to reuse past questions.
3. **Publish** to make the exam available to students.
4. Once the exam period ends, scores are automatically calculated and visible.

---

### 4.11 My Schedule (Timetable)
**What it does:** View the teacher's weekly teaching schedule.

- Shows which class, subject, and time slot for each teaching period.
- Print the personal schedule using the **Print** button.

---

### 4.12 Messages
**What it does:** Send and receive messages with admin, other teachers, or parents.

---

### 4.13 My Profile
**What it does:** Edit personal information — name, phone number, and profile photo.

---

## 5. Student Portal

**Login as any student,** for example:  
`chidera.nwosu@greenvillemontessorischools.ng` / `Student123!` (Basic 3A — top performer)  
`kelechi.eze@greenvillemontessorischools.ng` / `Student123!` (KG 1)

The Student dashboard is designed to be simple and colourful. It gives pupils access to their academic information and learning resources.

---

### 5.1 Overview
**What it shows:** A personalised welcome, today's timetable at a glance, upcoming assignments, latest grades, and any new announcements.

---

### 5.2 My Grades
**What it does:** Show the student's complete grade record for the current term.

**How to use:**
- View each subject with the breakdown: CA1, CA2, Project, Homework, Exam, and Total.
- The grade letter (A, B, C, etc.) and pass/fail status are shown for each subject.
- A performance chart gives a visual picture of progress across subjects.

---

### 5.3 Assignments
**What it does:** Show all assignments set by teachers.

**How to use:**
- Each assignment shows the subject, title, due date, and maximum score.
- Click an assignment to read the full instructions.
- Submit work by typing a response or uploading a file, then click **Submit**.
- Submitted assignments show their graded score once the teacher has marked them.

---

### 5.4 Learning Resources
**What it does:** Access all class materials and lesson notes uploaded by teachers.

**How to use:**
- Browse by subject or topic.
- Click a resource to open it (links, documents, or embedded content).
- Lesson notes may include AI-generated content and visual aids prepared by the teacher.
- Click the **Slideshow** button on any topic to view it as a full-screen presentation.

---

### 5.5 Attendance
**What it does:** Show the student's attendance record.

- See total school days, days present, and days absent for the current term.
- A calendar view shows which specific days were marked absent or late.

---

### 5.6 Timetable
**What it does:** Show the weekly class timetable.

- Period-by-period schedule for Monday to Friday.
- Colour-coded by subject.

---

### 5.7 CBT Exams
**What it does:** Take online multiple-choice examinations.

**How to use:**
1. Available exams appear with their subject, duration, and start date.
2. Click **Start Exam** when the exam is open.
3. Answer each question by clicking the correct option.
4. Click **Submit** when done. The score is shown immediately.
5. Completed exams show the final score and review of answers.

---

### 5.8 Calendar
**What it does:** View the school academic calendar — term dates, holidays, and school events.

---

### 5.9 My Profile
**What it does:** View and update personal information and profile photo.

---

## 6. Parent Portal

**Login:** Created by Admin (see Section 3.10). The parent's email and password are set during account creation.

The Parent Portal allows parents and guardians to stay closely connected to their child's academic life without visiting the school.

---

### 6.1 Overview
**What it shows:** A summary card for each linked child — current class, latest grades, attendance percentage, outstanding fees, and any new announcements.

---

### 6.2 My Children
**What it does:** View detailed profiles for each linked child.

**Information shown:**
- Student ID, class, date of birth, gender
- Current academic performance snapshot
- Contact and emergency information

---

### 6.3 Learning Resources
**What it does:** View the lesson notes, materials, and topics that the teacher has shared for the parent's child.

- Parents can see exactly what is being taught in each subject.
- Access all uploaded documents, links, and lesson notes.

---

### 6.4 Fees
**What it does:** View the child's fee account and payment history.

**How to use:**
- See the total fee for the term, amount paid, and outstanding balance.
- View a full payment history with dates and receipt references.
- Contact admin about fee queries through the Messages section.

---

### 6.5 Announcements
**What it does:** Read all school-wide notices, circulars, and important updates from the administration.

- New announcements appear with a notification badge.
- Older announcements are archived and searchable.

---

### 6.6 Results
**What it does:** View the child's official result card for the current and past terms.

**How to use:**
- Select the term and academic year to load the result card.
- The card shows all subject scores, total, class position, teacher comment, and principal's remark.
- Behaviour ratings (punctuality, neatness, cooperation, etc.) are included.

---

### 6.7 Attendance
**What it does:** Track the child's daily attendance.

- Shows total school days, days present, days absent, and percentage attendance.
- Highlights specific absent days on a calendar.

---

### 6.8 Messages
**What it does:** Communicate directly with the school administration or the child's class teacher.

**How to use:**
1. Click **New Message**.
2. Select the recipient (Admin or the class teacher).
3. Write the message and click **Send**.
4. Replies appear in the conversation thread.

---

### 6.9 Calendar
**What it does:** View the school calendar — term dates, holidays, exams, and school events.

---

### 6.10 My Profile
**What it does:** Update personal contact information and notification preferences.

---

## 7. Shared Features

These features work the same way across multiple roles.

### 7.1 Signing Out
- Click your **profile name or avatar** in the top-right corner of any dashboard.
- Click **Sign Out**.

### 7.2 Profile Photo
- Go to **My Profile** (available to teachers, students, and parents).
- Click the camera icon on the avatar placeholder.
- Upload a photo from your device.

### 7.3 Notifications
- A badge counter appears on relevant sidebar items when there are unread items (e.g. new messages, pending lesson plans for admin, new assignments for students).

### 7.4 Responsive Design
- The portal works on **desktop, tablet, and mobile phones**.
- On mobile, the sidebar collapses into a menu accessible via the hamburger icon (☰) at the top.

### 7.5 Print Documents
The following documents can be printed with the school's official branding directly from the portal:

| Document | Who Can Print |
|----------|--------------|
| Promotion Certificate | Admin |
| Result Card | Admin · Teacher |
| Result Analysis Report | Admin |
| Class Timetable | Admin · Teacher |
| Admission Offer Letter | Admin |
| Student ID Cards (batch) | Admin |
| Fee Receipt | Admin |
| Attendance Register Sheet | Admin · Teacher |
| School Leaving Certificate | Admin |
| School Circular / Notice | Admin |

---

## 8. Quick Tips

| # | Tip |
|---|-----|
| 1 | **Forgot password?** Click *Forgot Password* on the login screen and enter your email. A reset link will be sent. |
| 2 | **Wrong dashboard?** Contact admin — your role may need to be updated in the system. |
| 3 | **AI features require an internet connection** — lesson note generation and lesson plan AI use live AI services. |
| 4 | **Pop-up blockers** may prevent print windows from opening. Allow pop-ups for the school portal domain. |
| 5 | **Result cards are only visible** after the admin has published them for the term. |
| 6 | **CBT exams are timed** — once started, the countdown cannot be paused. Make sure you are ready before clicking *Start Exam*. |
| 7 | **WhatsApp sharing** — Result cards can be shared directly to a parent's WhatsApp from the Result Sheets section. |
| 8 | **Bulk data import** — For large datasets (e.g. beginning of year), use the Bulk Import section rather than adding records one by one. |

---

*Document prepared for Greenville Montessori Schools, Benin City · Academic Session 2025/2026*  
*Portal powered by the GMS School Management System*
