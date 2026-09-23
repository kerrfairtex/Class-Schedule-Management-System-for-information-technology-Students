# Class Schedule Management System
## User Guide

---

### 1. About the System

**Verified UI** (from `app/page.tsx`, `lib/domain/constants.ts`):

The Class Schedule Management System (CSMS) is a department-level academic scheduling Management Information System (MIS) built for the **Tawi-Tawi Regional Agricultural College (TRAC)**, specifically for the **Bachelor of Science in Information Technology (BSIT)** program under the **Institute of Computing Studies**.

The system runs as a Next.js web application with a local-first SQLite backend. It is currently in active development and has **not** been formally adopted as an official institutional platform (per spec §47, displayed on the homepage footer).

**Live URL:** `https://class-schedule-management-system-for-1myk.onrender.com`

**Key facts (from `lib/domain/constants.ts`):**
- Institution: Tawi-Tawi Regional Agricultural College
- Department: Bachelor of Science in Information Technology (BSIT)
- Department code: BSIT
- Location: Nalil, Bongao, Tawi-Tawi, Philippines
- Legal foundation: Batas Pambnea Blg. 384 (April 8, 1983)
- System status (verified code): `DEVELOPMENT`

---

### 2. Who Uses the System

Three roles are implemented in the system's authentication and authorization layer:

| Role | Description | Route Prefix |
|------|------------|-------------|
| Administrator | Full system access — manages schedules, master data, faculty availability, conflicts | `/admin/*` |
| Faculty | Views assigned teaching load, schedule board, and faculty availability | `/faculty/*` |
| Student | Views personal class schedule and can search other section schedules | `/student/*` |

**Public (unauthenticated)** users can access informational pages without logging in.

---

### 3. Getting Started

**Step 1:** Open a web browser and navigate to:
```
https://class-schedule-management-system-for-1myk.onrender.com
```

**Step 2:** On the landing page, click **Admin Portal**, **Faculty Portal**, or **Student Portal** in the navbar (all lead to `/login`). Alternatively, click the **Get Started →** button in the hero section.

**Step 3:** On the login page, enter your credentials and click **Sign In**.

**Step 4:** After successful authentication, you are redirected to your role-specific dashboard.

**Note:** No default credentials are provided in the repository. Credentials must be provisioned by an administrator through the Master List interface.

---

### 4. Landing Page

**Verified UI** (from `app/page.tsx`):

The landing page at `/` is publicly accessible. It is structured as follows:

#### 4.1 Navigation Bar (top)
- **Left:** Institution name (TRAC) and department code/location — non-clickable branding.
- **Desktop:** Links to **Admin Portal**, **Faculty Portal**, **Student Portal**, and **About** (all lead to `/login` except About which goes to `/about`).
- **Mobile:** A single **Login** button.

#### 4.2 Hero Section
- Large heading: **Class Schedule Management System**
- Descriptive text about the department-level MIS
- **Get Started →** button (links to `/login`)

#### 4.3 TRAC BSIT at a Glance (Stats Cards — Verified UI)
Four cards displaying:
- **4** Academic Departments (icon: MapPin)
- **12** Active Faculty Members (icon: Users)
- **38** Courses Offered (icon: BookOpen)
- **156** Class Sections Scheduled (icon: Calendar)

These values are hardcoded in the source (`app/page.tsx`), not pulled from the database.

#### 4.4 Key Features (Feature Cards)
Three feature cards:
- **Secure & Private** — Local-first architecture, role-based access control
- **Intelligent Scheduling** — Automated conflict detection, resource optimization
- **Multi-Portal Access** — Dedicated admin/faculty/student interfaces

#### 4.5 TRAC Institutional Information
- **Tawi-Tawi Regional Agricultural College** — with VERIFIED badge
- Institutional facts: BP Blg. 384, established 1983, location Nalil, Bongao
- Source: TRAC official website (SRC-TRAC-WEB, accessed 2026-08-31)

#### 4.6 BSIT Program Information
- Bachelor of Science in Information Technology program listing
- Institute: Institute of Computing Studies
- Program effective: first semester of school year 2018-2019

#### 4.7 System Status Disclaimer
Amber banner stating the system is in development and not formally adopted institutionally.

#### 4.8 Footer
Three columns:
1. **Quick Links:** Home, Login, About, Evidence, Contact, User Guidelines
2. **Portals:** Admin, Faculty, Student
3. **Institutional Contact:** Office of the President (op@trac.edu.ph), Office of the Registrar (registrar@trac.edu.ph), Office of Admission (admission@trac.edu.ph, 0951-733-7474)

Plus developer attribution: "Developers: Jimlani Paiji K., Albashrie Mashul A., Haidin Magbanua S., Jemmarie Ubias A., Aizalyn Kasim D." linking to `/developers`.

---

### 5. Login and Authentication

**Verified UI** (from `app/login/page.tsx`, `components/LoginForm.tsx`):

#### 5.1 How to Reach the Login Page

Click any of these:
- **Get Started →** on the homepage hero
- **Admin Portal / Faculty Portal / Student Portal** in the navbar
- **Login** button (mobile navbar)
- Direct URL: `https://class-schedule-management-system-for-1myk.onrender.com/login`

All three navbar portal links point to the same login page; role selection happens server-side after authentication based on the user's account.

#### 5.2 Login Form Fields

| Field | Label | Type | Required | Purpose |
|-------|-------|------|----------|---------|
| `username` | Username | Text input | Yes | Your assigned username (typically employee ID or student ID, lowercase) |
| `password` | Password | Password | Yes | Your password |

#### 5.3 Controls on the Login Page

| Control | Behavior |
|---------|----------|
| **Sign In** button | Submits credentials via POST to `/api/auth/login` |
| **Back to home** link | Returns to `/` |

#### 5.4 Authentication Flow

1. User enters username and password, clicks **Sign In**.
2. The form submits a POST request to `/api/auth/login` with JSON body `{ username, password }`.
3. The server validates credentials against the `users` table in SQLite (bcrypt password verification).
4. Rate limiting: 5 login attempts per 15-minute window per IP address (verified in `app/api/auth/login/route.ts`).

**On success:**
- A signed HTTP-only cookie (`csms_session`) is set (8-hour expiry)
- The server returns JSON `{ success: true, role: "admin"|"faculty"|"student", redirect: "/admin/dashboard" | "/faculty/dashboard" | "/student/dashboard" }`
- The UI navigates to the role-specific dashboard

**On failure:**
- Error message displayed in a red alert box: "Invalid credentials" or "Too many login attempts. Please try again later." (HTTP 401 or 429)
- The user remains on the login page

#### 5.5 Role-Based Redirects

| Role | Redirect Destination After Login |
|------|---------------------------------|
| admin | `/admin/dashboard` |
| faculty | `/faculty/dashboard` |
| student | `/student/dashboard` |

#### 5.6 Logout

Logout is performed via a POST form submission to `/api/auth/logout`. The logout button appears in the sidebar of every portal layout (`PortalLayout` component). On click:
1. The `csms_session` cookie is deleted
2. The user is redirected to `/` (homepage) via HTTP 303

#### 5.7 Access Restrictions

**Verified code behavior** (from `middleware.ts`):
- Public routes (no auth required): `/`, `/login`, `/about`, `/about/evidence`, `/schedules`, `/programs`, `/faculty`, `/rooms`, `/academic-calendar`, `/contact`
- Protected routes (auth required): `/admin/*`, `/faculty/*`, `/student/*`
- If an unauthenticated user attempts to access a protected route, they are redirected to `/login`
- Root paths `/admin`, `/faculty`, `/student` (without subpages) are technically public per middleware but serve as entry points

**Note:** The middleware only runs on `/admin/:path*`, `/faculty/:path*`, `/student/:path*`. Protected subpages redirect to `/login` if no session cookie is present.

---

### 6. Administrator Guide

Admin routes are prefixed with `/admin/`. All require admin role authentication.

#### 6.1 Admin Navigation Sidebar

The admin sidebar (`PortalSidebar` from `components/PortalLayout.tsx`) contains:

| Link | Label | Module |
|------|-------|--------|
| `/admin/dashboard` | Mission Control | System overview |
| `/admin/master-list` | Master List (MOD-02) | Data management |
| `/admin/faculty-availability` | Faculty Availability | MOD-04 |
| `/admin/schedule-board` | Schedule Board (MOD-05) | MOD-03/04/05 |
| `/admin/schedules` | (linked from conflicts page only) | Scheduling workflow |
| `/admin/conflicts` | (linked from schedules page only) | MOD-04 Conflict Detection |
| `/admin/evidence` | (linked from settings page only) | Source-of-truth |
| `/admin/settings` | (linked from evidence page only) | System config |

**Important:** The sidebar only contains the four main links (Dashboard, Master List, Faculty Availability, Schedule Board). The remaining admin pages (Schedules, Conflicts, Evidence, Settings) are reachable only through links in their sibling pages, NOT from the sidebar directly.

#### 6.2 Admin Dashboard — `/admin/dashboard`

**Verified UI** (from `app/admin/dashboard/page.tsx`):

The dashboard is wrapped in `PortalLayout` with role `admin`. It displays:

**Telemetry Bar** (top of content area):
- Academic Term: Shows active semester name (e.g., "AY 2024-2025 • First Semester")
- Active Week: "Week N" (calculated from current date)
- System Health: "SYSTEM NOMINAL" (green) when 0 conflicts, "DEGRADED PERFORMANCE" (amber) when conflicts > 0
- Conflict Alerts: Number of detected conflicts

**System Telemetry cards (6 MetricCards):**
1. Active Personnel — Faculty + Students total (split view: faculty as trend value, students as sub-value)
2. Enrolled IT Students — total student count
3. Active Subjects — total subjects count
4. Active Sections — total sections count
5. Lab Nodes — total rooms count (labeled "Lab Nodes")
6. Scheduled Operations — total schedules (shows conflicts as red trend if > 0)

**Operational Commands (QuickLink buttons):**
1. **Master List (MOD-02)** — Manages faculty, subjects, rooms, sections, and curriculum
2. **Schedule Board (MOD-05)** — Generate schedules, drag-and-drop manual adjustments
3. **Faculty Load Matrix** — View and configure faculty availability constraints
4. **Audit Logs** — Review system audit trail (`/api/admin?resource=audit`)

**Sidebar details** show:
- Role: ADMIN (uppercase)
- Administrator name
- College: TRAC
- Semester: Active semester name

#### 6.3 Master List — `/admin/master-list`

**Verified UI** (from `app/admin/master-list/page.tsx`, `components/MasterListForm.tsx`):

**Page header:**
- Title: "Master List"
- Subtitle: "MOD-02 — System source of truth"
- **Backup Database (MOD-08)** button — creates a SQLite backup file

**Tabs** (5 tabs):
- Faculty
- Students
- Subjects
- Sections
- Rooms

Each tab shows a data table with columns specific to that entity:

| Tab | Columns |
|-----|---------|
| Faculty | Employee ID, Name, Email, Phone |
| Students | Student ID, Name, Section, Email |
| Subjects | Code, Name, Credits |
| Sections | Code, Year Level |
| Rooms | Building, Code, Name, Capacity |

**Table behavior:**
- Empty state: "No records yet. Use the form above to add one."
- Record count: Shows "N record(s)" below the table
- Data is fetched from `/api/admin?resource=faculty|students|subjects|sections|rooms`

**Create forms** (collapses into the MasterListForm component, opened per tab):

When the "Add" form is submitted, it POSTs to `/api/admin` with:
- **Faculty:** `{ action: "create-faculty", data: { employee_id, first_name, last_name, email, phone, department_id }, subjectIds: [], password: "faculty123" }`
- **Students:** `{ action: "create-student", data: { student_id, first_name, last_name, email, section_id }, password: "student123" }`
- **Subjects:** `{ action: "create-subject", code, name, credit_hours, program_id }`
- **Sections:** `{ action: "create-section", code, program_id, year_level, semester_id }`
- **Rooms:** `{ action: "create-room", building_id, code, name, capacity }`

The forms are dynamically rendered by `MasterListForm.tsx` based on the active tab. They are collapsed by default and expand into a form with fields populated from the metadata API (`/api/admin?resource=meta`).

#### 6.4 Faculty Availability — `/admin/faculty-availability`

**Verified UI** (from `app/admin/faculty-availability/page.tsx`):

**Page header:**
- Title: "Faculty Availability"
- Subtitle: "Mark unavailable time slots — MOD-04 uses this during conflict detection."

**Controls:**
1. **Faculty Member dropdown** — Selects a faculty member from a list (employee_id — full_name format)
2. After selecting a faculty member, a grid of time-slot buttons loads

**Time-slot grid:**
- Each slot is a clickable button showing day, start–end time, and available/unavailable status
- Green button (border-green-200): Available
- Red button (border-red-200): Unavailable
- Clicking toggles the status via POST to `/api/admin` with `{ action: "set-availability", facultyId, timeSlotId, isAvailable }`
- Status message appears: "Availability updated" in a blue alert box

#### 6.5 Schedule Board — `/admin/schedule-board`

**Verified UI** (from `app/admin/schedule-board/page.tsx`, `components/ScheduleBoard.tsx`):

**Page header:**
- Title: "Schedule Board"
- Subtitle: "MOD-03 Generation · MOD-04 Conflict Detection · MOD-05 Manual Adjustment"

**Controls:**
1. **Add Schedule Manually** button — Opens the `ManualScheduleForm` form inline
2. **Filter section:** dropdown — Filters the board by section (default: "All sections")
3. **Auto-generate (MOD-03):** Buttons for each section — Click a section button to auto-generate schedules

**Manual Schedule Form** (when expanded):
Five dropdown fields:
- **Section** — Lists active sections by code
- **Subject** — Lists subjects (code — name format)
- **Faculty** — Lists faculty (employee_id — first_name last_name format)
- **Room** — Lists rooms (code — name format)
- **Time Slot** — Lists time slots (Day start–end format)
- **Create Schedule** button — Submits the form

On success: "Schedule created" message, form collapses, board refreshes.

**Schedule Board grid (ScheduleBoard component):**
- A table grid with time slots on rows and days (Monday–Friday) as columns
- Each cell with a schedule entry shows: subject code, section code, faculty name, room code
- Drag-and-drop: Schedule entries are draggable; dropping onto an empty slot moves the schedule (validates via MOD-04)
- Delete icon (Trash2): Click to remove a schedule entry (requires `confirm("Remove this schedule entry?")`)
- Status messages appear for successful moves ("Schedule updated successfully") and errors

#### 6.6 Conflicts — `/admin/conflicts`

**Verified UI** (from `app/admin/conflicts/page.tsx`):

**Not in sidebar** — reachable only via the "Conflicts →" link in the schedules admin page.

**Page structure:**
- **Back link:** ← Admin Portal (links to `/login`)
- **Forward link:** Schedules → (links to `/admin/schedules`)
- **Title:** "Conflict Detection"
- **Active semester display**

**Status cards (3 metrics):**
1. Schedules With Blocking Conflicts (red card) — count of schedules with blocking conflicts
2. Validation Required (green card) — explanatory text: "Schedules with blocking conflicts cannot transition to PUBLISHED (spec §34)"
3. Conflict Categories (neutral card) — lists: faculty, room, section, capacity, availability

**Conflict display:**
- If no blocking conflicts: Green box with "No blocking conflicts detected."
- If conflicts exist: Red-bordered articles per schedule, showing:
  - Schedule ID (#N)
  - Status badge: "Blocking"
  - Day and time
  - Subject code · Section · Faculty · Room
  - List of conflict types (faculty, room, section, time, capacity, availability)

**Note:** This page reads directly from the SQLite database via server-side rendering (`getDb()`).

#### 6.7 Schedules — `/admin/schedules`

**Verified UI** (from `app/admin/schedules/page.tsx`):

**Not in sidebar** — reachable only via the "Schedules →" link in the conflicts admin page.

**Page structure:**
- **Back link:** ← Admin Portal (links to `/login`)
- **Forward link:** Conflicts → (links to `/admin/conflicts`)
- **Title:** "Schedule Management"
- **Active semester display**

**Status summary cards (6):**
- DRAFT — count
- PENDING REVIEW — count
- APPROVED — count
- PUBLISHED — count
- CANCELLED — count
- ARCHIVED — count

Status workflow per spec: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED

**Schedule table (when schedules exist):**
Columns: ID, Status, Day, Time, Subject, Section, Faculty, Room, Data, Published

If no schedules: Amber box with "No schedules yet. Use the Schedule Board to create draft schedules."

#### 6.8 Evidence Dashboard — `/admin/evidence`

**Verified UI** (from `app/admin/evidence/page.tsx`):

**Not in sidebar** — reachable only via the "Evidence →" link in the settings page.

**Page structure:**
- **Back link:** ← Admin Portal (links to `/login`)
- **Forward link:** Settings → (links to `/admin/settings`)
- **Title:** "Evidence Dashboard"
- **Subtitle:** "Source-of-Truth overview (spec §66)."

**Summary cards (4):**
1. Total Facts — count of all institutional facts
2. Verified / Official — count of VERIFIED + OFFICIAL status facts
3. Pending — count of PENDING_VERIFICATION facts
4. Review Overdue — count of facts past their review date (red)

**All Facts table** below — each fact is displayed as an article with:
- ID (code format)
- Status badge (VERIFIED, OFFICIAL, GOVERNMENT, CORROBORATED, PENDING VERIFICATION, UNVERIFIED, CONFLICTING, DEPRECATED)
- Category tag
- Review Due date (if applicable)
- Key (with underscores converted to spaces)
- Value
- Source ID and verification date

#### 6.9 System Settings — `/admin/settings`

**Verified UI** (from `app/admin/settings/page.tsx`):

**Not in sidebar** — reachable only via the "Settings →" link in the evidence page.

**Page structure:**
- **Back link:** ← Admin Portal (links to `/login`)
- **Forward link:** Evidence → (links to `/admin/evidence`)
- **Title:** "System Settings"
- **Subtitle:** "Deployment environment and source-of-truth configuration (spec §64)."

Two sections:
1. **Settings table** — key-value pairs of system settings with descriptions and last-updated timestamps
2. **Database tables list** — lists all SQLite tables in the database (for diagnostics)

---

### 7. Faculty Guide

Faculty routes are prefixed with `/faculty/`. All require faculty role authentication.

#### 7.1 Faculty Navigation Sidebar

The faculty sidebar (same `PortalSidebar` in `components/Sidebar.tsx`) contains:

| Link | Label |
|------|-------|
| `/faculty/dashboard` | Mission Log |
| `/faculty/schedule` | Schedule Matrix |

The sidebar header shows:
- Role: FACULTY
- Faculty member's full name
- Department code: BSIT
- Employee ID
- Email
- Semester (active)

#### 7.2 Faculty Public Roster — `/faculty`

**Verified UI** (from `app/faculty/page.tsx`):

This is a **public page** (listed in middleware PUBLIC routes) that displays a faculty directory. Each faculty member's card shows:
- Full name
- Employee ID and department code
- Subjects taught (comma-separated)
- Data environment status badge (PRODUCTION = green, VERIFIED = teal, DEMO = amber)

No login required.

#### 7.3 Faculty Dashboard — `/faculty/dashboard`

**Verified UI** (from `app/faculty/dashboard/page.tsx`):

Wrapped in `PortalLayout` with role `faculty`.

**Telemetry Bar:**
- Academic Term: Active semester name
- Active Week: "Week N"
- System Health: "SYSTEM NOMINAL" (always healthy for faculty view)
- Conflict Alerts: 0 (always — faculty view doesn't detect conflicts)

**Teaching Telemetry cards (4 MetricCards):**
1. Assigned Subjects — unique subject count
2. Active Sections — unique section count
3. Weekly Classes — total schedule entries
4. Upcoming Today — classes on the current day (max 5)

**Navigation Commands (QuickLink buttons):**
1. **Schedule Matrix** — Grid and list views with print export
2. **Class Roster** — List view with section details

**Upcoming Operations** (if classes on today):
List of today's classes showing subject_code — section_code and day/time.

#### 7.4 Faculty Schedule — `/faculty/schedule`

**Verified UI** (from `app/faculty/schedule/page.tsx`):

Wrapped in `PortalLayout` with role `faculty`.

**Page header:**
- Title: "Teaching Schedule"
- Subtitle: "MOD-06 — View and print only"
- Semester displays in the sidebar details

**Controls (top-right):**
1. **ViewToggle** — Two buttons: Grid | List
2. **Print / PDF** button — Triggers `window.print()`

**Print header** renders on print: "Faculty Teaching Schedule" with semester and instructor name.

**Grid view** (`ScheduleGrid` component):
- Table with time slots on the left and days (Mon–Fri) as columns
- Each cell shows subject badge, subject name, room code, faculty name
- Course badges are color-coded:
  - **SE** (Software Engineering) — blue badge
  - **NET** (Networking) — purple badge
  - **SYS** (Systems Administration) — orange badge
  - **GEN** (General Education) — green badge

**List view** (`ScheduleList` component):
- Sorted by day then start time
- Each entry shows: subject badge, subject name, day/time, room code/name
- Faculty name shown in green when `showFaculty` is enabled

---

### 8. Student Guide

Student routes are prefixed with `/student/`. All require student role authentication.

#### 8.1 Student Navigation Sidebar

The student sidebar (same `PortalSidebar` component) contains:

| Link | Label |
|------|-------|
| `/student/dashboard` | Dashboard |
| `/student/schedule` | My Schedule |

The sidebar header shows:
- Role: STUDENT
- Student's full name
- Section code

Sidebar details:
- Student ID
- Section code
- Semester

#### 8.2 Student Dashboard — `/student/dashboard`

**Verified UI** (from `app/student/dashboard/page.tsx`):

Wrapped in `PortalLayout` with role `student`.

**Telemetry Bar:**
- Academic Term: Active semester name
- Active Week: "Week N"
- System Health: "SYSTEM NOMINAL"
- Conflict Alerts: 0

**Schedule Telemetry cards (4 MetricCards):**
1. Total Classes — number of enrolled schedule entries
2. Unique Subjects — count of distinct subjects
3. Active Days — count of distinct days with classes
4. Weekly Hours — number of schedule entries (labeled "Weekly Hours" but shows count)

**Navigation Commands (QuickLink buttons):**
1. **Schedule Matrix** — Grid and list views, print your timetable
2. **Section Lookup** — Search any section's timetable (links to `/student/schedule?search=1`)

#### 8.3 Student Schedule — `/student/schedule`

**Verified UI** (from `app/student/schedule/page.tsx`):

Wrapped in `PortalLayout` with role `student`.

**Page header:**
- Title: "Class Schedule" (or "Section {code}" when viewing another section)
- Subtitle: "MOD-07 — View and print only"

**Controls (top-right):**
1. **ViewToggle** — Grid | List
2. **Print / PDF** button

**Section Search (print:hidden):**
- Toggle button: "Search other sections" / "Hide section search"
- Input field: section code (e.g., "BSIT-2A") with a `<datalist>` autocomplete of all available sections
- **Search** button — Fetches the schedule for the entered section via `/api/student?section={code}`
- **Reset** button (appears after search results) — Clears search results and returns to personal schedule

**Grid view** (`ScheduleGrid` with `showFaculty` enabled):
- Time-slot table: days (Mon–Fri) as columns, time slots as rows
- Each cell shows subject badge, subject name, room code, faculty name
- Course badges color-coded by category (SE, NET, SYS, GEN)

**List view** (`ScheduleList` with `showFaculty` and `showSection` enabled):
- Sorted chronologically (day then time)
- Each entry shows: CourseBadge (category label + subject code), subject name, day + time, room code + name, faculty name, section code

**How a student finds their schedule:**
1. Log in via `/login` (redirected to `/student/dashboard`)
2. From the dashboard, click **Schedule Matrix** in the Navigation Commands
3. Or click **My Schedule** in the sidebar
4. The personal schedule loads automatically from `/api/student`
5. Use the **ViewToggle** to switch between grid and list
6. Use **Print / PDF** to export

**How a student views another section's schedule:**
1. Navigate to `/student/schedule`
2. Click **Search other sections**
3. Type or select a section code (e.g., "BSIT-2A")
4. Click **Search**
5. The page displays "Section {code} Schedule" as the title
6. Click **Reset** to return to personal schedule

---

### 9. Schedule Management

#### 9.1 Public Schedules — `/schedules`

**Verified UI** (from `app/schedules/page.tsx`):

This is a **public page** (no login required). It lists all academic years.

**Page structure:**
- **← All academic years** link (links to `/` on the term page)
- **Title:** "Class Schedules"
- **Description:** "Per spec §35, only PUBLISHED schedules appear publicly."
- **Count display:** "Currently N schedule(s) have been published."

**Academic Years list:**
- Each year is a clickable card showing the year label (e.g., "AY 2024-2025")
- Active/current year has a "Current" badge (green)
- Clicking a year navigates to `/schedules/{yearId}`

**Empty state message:**
"Schedules appear here only after they have been validated, approved, and published by an authorized CSMS administrator (spec §32–§34)."

#### 9.2 Term-Specific Schedules — `/schedules/[term]`

**Verified UI** (from `app/schedules/[term]/page.tsx`):

Dynamic route where `[term]` is the academic year ID.

**Page structure:**
- **← All academic years** link (back to `/schedules`)
- **Year label** as H1 (e.g., "2024-2025")
- **Semester names** listed below the title

**Schedule table (if published schedules exist):**
| Column | Description |
|--------|-------------|
| Day | Day of week (capitalized) |
| Time | Start–end time |
| Subject | Subject code + name |
| Faculty | Full name |
| Room | Room code |

**Empty state:**
Amber box: "No PUBLISHED schedules. Schedules appear here only after validation and approval (spec §32–§35). The current seed data is DEMO and has not been authorized for public display."

**Not verified:**
- Schedule creation, editing, or deletion via this public route (read-only)
- Any filtering controls on this page

#### 9.3 Schedules in the Admin Context

Admin schedules are managed through:
1. **Schedule Board** (`/admin/schedule-board`) — Create drafts, drag-and-drop edit, delete
2. **Schedule Management** (`/admin/schedules`) — View all schedules by status (not in sidebar; linked from Conflicts page)
3. **Conflicts** (`/admin/conflicts`) — Detect and review conflicts (not in sidebar; linked from Schedules page)

**Schedule status workflow:** DRAFT → PENDING REVIEW → APPROVED → PUBLISHED

Only PUBLISHED schedules appear on the public `/schedules/[term]` pages. Schedules with blocking conflicts cannot transition to PUBLISHED (spec §34).

---

### 10. Rooms — `/rooms`

**Verified UI** (from `app/rooms/page.tsx`):

**Public page** (no login required).

**Page structure:**
- **← Back to home** link
- **Title:** "Rooms & Facilities"
- **Description:** "Room inventory. Per spec §29, room attributes must not be invented; sample records are tagged DEMO."

**Rooms table:**
| Column | Description |
|--------|-------------|
| Code | Room code (monospace, teal) |
| Name | Room name |
| Building | Building name (code) |
| Capacity | Numeric capacity |
| Status | Data environment badge (PRODUCTION = green, VERIFIED = teal, DEMO = amber) |

**Empty state:** "No rooms defined." (does not actually appear in source — the map renders zero rows if empty)

---

### 11. Programs — `/programs`

**Verified UI** (from `app/programs/page.tsx`):

**Public page** (no login required).

**Page structure:**
- **← Back to home** link
- **Title:** "Programs"
- **Description:** "Programs offered under the Institute of Computing Studies. Sample data is tagged DEMO per spec §63."

**Program entries (articles):**
Each program shows:
- Code badge (teal, monospace) — e.g., "BSIT"
- Program name — e.g., "Bachelor of Science in Information Technology"
- Department — "Department: {dept_name} ({dept_code})"
- Stats — "{section_count} section(s) · {subject_count} subject(s)"

**Empty state:** "No programs defined." (conditional render)

---

### 12. Academic Calendar — `/academic-calendar`

**Verified UI** (from `app/academic-calendar/page.tsx`):

**Public page** (no login required).

**Page structure:**
- **← Back to home** link
- **Title:** "Academic Calendar"
- **Description:** "Academic years and semesters tracked by the CSMS. Per spec §22, there must be only one active/current term for the scheduling context."

**Academic year entries (articles):**
Each year shows:
- Label: "Academic Year {year.label}" (e.g., "Academic Year 2024-2025")
- Date range: start_date → end_date
- Status badge: "Current" (green) if `is_active = 1`, or no badge if inactive

**Empty state:** "No academic years defined." (conditional render)

**Not verified:**
- Semester-level detail views (the page lists years but does not show individual semester schedules publicly)
- Any calendar grid or month-view UI

---

### 13. Public Information Pages

#### 13.1 About — `/about`

**Verified UI** (from `app/about/page.tsx`):

**Public page.**

Content sections:
1. **Institution** — Legal name, canonical location, establishment year, legal foundation
2. **Mission** — Mission statement (from DB)
3. **Vision** — Vision statement (from DB)
4. **Mandate** — Four-fold thrust (from DB)
5. **Programs** — Currently offered programs (BSIT, BSIS)
6. **System Status** — Disclaimer about non-adoption

Footer link: "View Source of Truth →" (links to `/about/evidence`)

#### 13.2 About Evidence — `/about/evidence`

**Verified UI** (from `app/about/evidence/page.tsx` — imported but file exists):

This is the **public** evidence/source-of-truth page. It shows institutional facts with their verification status, sources, and review dates. Status categories: VERIFIED, OFFICIAL, GOVERNMENT, CORROBORATED, PENDING VERIFICATION, UNVERIFIED.

#### 13.3 Contact — `/contact`

**Verified UI** (from `app/contact/page.tsx`):

**Public page.** Displays institutional contact information from the database:

Each contact entry shows:
- Office name (uppercase, teal)
- Contact value (email as `mailto:` link, phone as `tel:` link, otherwise plain text)
- Data environment status (PRODUCTION, VERIFIED, or PENDING/DEMO)
- Verification date (if applicable)

Source attribution at bottom: "Source: TRAC official website (SRC-TRAC-WEB, accessed 2026-08-31)."

Also includes a "System Developers" section linking to `/developers`.

#### 13.4 Developers — `/developers`

**Verified UI** (from `app/developers/page.tsx`):

**Public page.** Shows developer attribution:
- Header: System identity (TRAC BSIT CSMS)
- **Developers** section — Ordered list of the 5 BSIT student developers
- **About developer attribution** section — Explains that developer names are system credits only; institutional contacts are preferred via `/contact`
- Footer copyright

#### 13.5 User Guidelines — `/user-guidelines`

**Verified UI** (from `app/user-guidelines/page.tsx`, live-verified at the URL above):

**Public page.** Shows user guidance:
- Access Guidelines — role-based login instructions (admin, faculty, student)
- Browser & Device Requirements — desktop browsers, JavaScript, cookies
- Data Integrity & Conflict Resolution — conflict handling steps
- System Status — development disclaimer

#### 13.6 Faculty Roster — `/faculty`

**Verified UI** (from `app/faculty/page.tsx`):

**Public page.** Faculty directory showing all faculty members with data environment badges.

---

### 14. Navigation Reference

Complete list of all user-facing routes:

| Route | Access | Page Name |
|-------|--------|-----------|
| `/` | Public | Landing Page |
| `/login` | Public | Login |
| `/about` | Public | About |
| `/about/evidence` | Public | Source of Truth |
| `/contact` | Public | Contact |
| `/developers` | Public | Developers |
| `/user-guidelines` | Public | User Guidelines |
| `/faculty` | Public | Faculty Roster |
| `/programs` | Public | Programs |
| `/rooms` | Public | Rooms & Facilities |
| `/academic-calendar` | Public | Academic Calendar |
| `/schedules` | Public | Class Schedules (term list) |
| `/schedules/{term}` | Public | Term-specific published schedules |
| `/admin/dashboard` | Admin | Mission Control |
| `/admin/master-list` | Admin | Master List |
| `/admin/faculty-availability` | Admin | Faculty Availability |
| `/admin/schedule-board` | Admin | Schedule Board |
| `/admin/schedules` | Admin | Schedule Management |
| `/admin/conflicts` | Admin | Conflict Detection |
| `/admin/evidence` | Admin | Evidence Dashboard |
| `/admin/settings` | Admin | System Settings |
| `/faculty/dashboard` | Faculty | Faculty Dashboard |
| `/faculty/schedule` | Faculty | Teaching Schedule |
| `/student/dashboard` | Student | Student Dashboard |
| `/student/schedule` | Student | Student Schedule |

---

### 15. Button and Control Reference

| Button / Control | Location | User Role | What It Does | Result |
|------------------|----------|-----------|-------------|--------|
| Admin Portal | Home navbar | Public | Links to `/login` | Opens login page |
| Faculty Portal | Home navbar | Public | Links to `/login` | Opens login page |
| Student Portal | Home navbar | Public | Links to `/login` | Opens login page |
| About | Home navbar | Public | Links to `/about` | Opens About page |
| Login | Home mobile nav | Public | Links to `/login` | Opens login page |
| Get Started → | Home hero | Public | Links to `/login` | Opens login page |
| Sign In | Login form | All roles | Submits POST to `/api/auth/login` | Role-based redirect to dashboard |
| Back to home | All info pages | Public | Links to `/` | Returns to landing page |
| Back to home | Login page | All roles | Links to `/` | Returns to landing page |
| Add Schedule Manually | Schedule Board | Admin | Opens `ManualScheduleForm` | Displays form fields below button |
| Create Schedule | Manual Schedule Form | Admin | POSTs to `/api/admin` | "Schedule created", board refreshes |
| Close | Manual Schedule Form | Admin | Collapses the form | Form disappears |
| Filter section: (dropdown) | Schedule Board | Admin | Filters board by section | Shows only schedules for selected section |
| {Section code} button | Schedule Board | Admin | Auto-generates schedules for that section | "Generated N schedules." message |
| (Drag schedule block) | Schedule Board grid | Admin | Drags to another time slot | "Schedule updated successfully" or error |
| Delete (trash icon) | Schedule Board grid | Admin | Shows confirm dialog, then deletes | "Schedule removed" or error |
| (Time slot button) | Faculty Availability | Admin | Toggles availability status | "Availability updated" message |
| Backup Database (MOD-08) | Master List | Admin | POSTs `{ action: "backup" }` | "Backup created: {path}" message |
| Faculty tab / Students tab / Subjects tab / Sections tab / Rooms tab | Master List | Admin | Switches data table view | Shows corresponding table + create form |
| Grid | Schedule pages | Faculty/Student | Sets view to grid | Renders ScheduleGrid component |
| List | Schedule pages | Faculty/Student | Sets view to list | Renders ScheduleList component |
| Print / PDF | Schedule pages | Faculty/Student | Calls `window.print()` | Browser print dialog |
| Search other sections | Student schedule | Student | Expands section search panel | Shows input field + Search button |
| Hide section search | Student schedule | Student | Collapses section search panel | Hides input field |
| Search | Student schedule search | Student | Fetches `/api/student?section={code}` | Displays results for that section |
| Reset | Student schedule search | Student | Clears search, returns to personal schedule | Reloads personal schedule |
| Logout | Sidebar (all portals) | All roles | POSTs to `/api/auth/logout` | Cookie cleared, redirect to `/` |

---

### 16. Form Field Reference

#### 16.1 Login Form

| Page | Field | Type | Required | Meaning |
|------|-------|------|----------|---------|
| Login | Username | Text input | Yes | Your assigned username (employee ID or student ID) |
| Login | Password | Password | Yes | Your account password |

**Validation (verified code):** Both fields must be non-empty; submitted via `zod` schema with `min(1)` constraint. Rate-limited to 5 attempts per 15 minutes per IP.

#### 16.2 Manual Schedule Entry (MOD-05)

| Page | Field | Type | Required | Meaning |
|------|-------|------|----------|---------|
| Schedule Board (ManualScheduleForm) | Section | Select dropdown | Yes | Academic section the schedule belongs to |
| Schedule Board (ManualScheduleForm) | Subject | Select dropdown | Yes | Course/subject assigned to this schedule |
| Schedule Board (ManualScheduleForm) | Faculty | Select dropdown | Yes | Instructor/faculty member assigned |
| Schedule Board (ManualScheduleForm) | Room | Select dropdown | Yes | Physical room or lab assigned |
| Schedule Board (ManualScheduleForm) | Time Slot | Select dropdown | Yes | Day + start/end time window |
| Schedule Board (ManualScheduleForm) | Semester | Hidden (from active semester) | Yes (auto) | Inferred from active semester — not user-editable |

#### 16.3 Section Search (Student)

| Page | Field | Type | Required | Meaning |
|------|-------|------|----------|---------|
| Student Schedule | Section code | Text input (datalist) | Yes | Enter or select a section code (e.g., "BSIT-2A") to look up its schedule |

---

### 17. Role and Permission Matrix

| Capability | Administrator | Faculty | Student | Public |
|-----------|--------------:|--------:|--------:|-------:|
| View public pages | ✓ | ✓ | ✓ | ✓ |
| Login | ✓ | ✓ | ✓ | — |
| View admin dashboard (Mission Control) | ✓ | — | — | — |
| Manage master data (faculty/students/subjects/sections/rooms) | ✓ | — | — | — |
| Set faculty availability constraints | ✓ | — | — | — |
| View/edit schedule board (MO-05) | ✓ | — | — | — |
| Auto-generate schedules (MOD-03) | ✓ | — | — | — |
| View conflict detection report | ✓ | — | — | — |
| View schedule management table | ✓ | — | — | — |
| Access evidence dashboard | ✓ | — | — | — |
| Access system settings | ✓ | — | — | — |
| Create database backups | ✓ | — | — | — |
| View faculty dashboard (Mission Log) | — | ✓ | — | — |
| View teaching schedule (grid/list) | — | ✓ | — | — |
| Print teaching schedule | — | ✓ | — | — |
| View student dashboard (Mission Log) | — | — | ✓ | — |
| View personal class schedule | — | — | ✓ | — |
| Search other sections' schedules | ✓* | — | ✓ | — |
| Print personal schedule | — | — | ✓ | — |
| View faculty roster | — | — | — | ✓ |
| View programs list | — | — | — | ✓ |
| View rooms list | — | — | — | ✓ |
| View academic calendar | — | — | — | ✓ |
| View public schedules (published only) | — | — | — | ✓ |

*Admin can access `/api/student?section={code}` directly via API but the section-search UI is only in the student portal.

---

### 18. Common Workflows

#### Workflow A — Access the system

1. Open `https://class-schedule-management-system-for-1myk.onrender.com` in a web browser.
2. Review the landing page — see TRAC branding, statistics, and feature cards.
3. Click **Admin Portal**, **Faculty Portal**, or **Student Portal** in the navbar.
4. Enter your username and password on the login page.
5. Click **Sign In**.
6. The system authenticates your credentials and redirects you to:
   - Admin: `/admin/dashboard` (Mission Control)
   - Faculty: `/faculty/dashboard` (Mission Log)
   - Student: `/student/dashboard` (Mission Log)

#### Workflow B — Student views a schedule

1. Navigate to `.../login` from the homepage.
2. Enter student credentials, click **Sign In**.
3. Arrive at the Student Dashboard.
4. Click **Schedule Matrix** in the Navigation Commands section.
5. The grid view of your personal class schedule appears.
6. Use the **Grid**/**List** toggle to switch views.
7. Click **Print / PDF** to export your schedule.

#### Workflow C — Faculty views their schedule

1. Navigate to `.../login` from the homepage.
2. Enter faculty credentials, click **Sign In**.
3. Arrive at the Faculty Dashboard (Mission Log).
4. Click **Schedule Matrix** in the Navigation Commands.
5. The grid view of your assigned teaching schedule appears.
6. Use the **Grid**/**List** toggle to switch views.
7. Click **Print / PDF** to export.

#### Workflow D — Administrator creates a schedule

1. Log in as admin → arrive at `/admin/dashboard`.
2. Click **Schedule Board (MOD-05)** in the Operational Commands.
3. Click **Add Schedule Manually**.
4. Fill in: Section, Subject, Faculty, Room, Time Slot.
5. Click **Create Schedule**.
6. The board refreshes and shows the new schedule entry.
7. If conflicts exist, check `/admin/conflicts` for details.

#### Workflow E — Administrator auto-generates schedules

1. Log in as admin → arrive at `/admin/dashboard`.
2. Click **Schedule Board (MOD-05)** in the Operational Commands.
3. Find the **Auto-generate (MOD-03)** button group below the filter.
4. Click the button for the section you want to auto-generate (e.g., "BSIT-2A").
5. A message appears: "Generated N schedules." (where N is the count).
6. Review the generated schedules on the board.

#### Workflow F — Administrator manages faculty availability

1. Log in as admin → arrive at `/admin/dashboard`.
2. Click **Faculty Load Matrix** in the Operational Commands.
3. Select a faculty member from the dropdown.
4. View the time-slot grid for that faculty member.
5. Click any time-slot button to toggle between "Available" (green) and "Unavailable" (red).
6. The status message "Availability updated" appears at the top.

#### Workflow G — Administrator manages master data

1. Log in as admin → arrive at `/admin/dashboard`.
2. Click **Master List (MOD-02)** in the Operational Commands or sidebar.
3. Click the tab for the entity you want to manage (Faculty, Students, Subjects, Sections, Rooms).
4. View existing records in the table below.
5. Click **Backup Database (MOD-08)** to create a backup before making changes.

#### Workflow H — User logs out

1. In any portal (admin/faculty/student), locate the sidebar header.
2. Scroll to the bottom of the sidebar.
3. Click the **Logout** button (red text with a logout SVG icon).
4. The session cookie is cleared.
5. You are redirected to the homepage (`/`).

#### Workflow I — User checks the academic calendar

1. From any page, scroll to the footer.
2. In the Quick Links column, click **Academic Calendar** (not yet in footer at db7f803 — navigate directly or via homepage footer).

**Correction:** At commit db7f803, the `/academic-calendar` link is NOT in the homepage footer Quick Links. The public pages linked from the footer are: Home, Login, About, Evidence, Contact, User Guidelines. Users must navigate directly to `/academic-calendar` via the URL or discover it through other means.

---

### 19. Notifications, Validation, and Errors

#### 19.1 Success Notifications (Verified UI)

Success messages appear in blue or green alert boxes at the top of the page:
- `"Schedule created"` (blue) — after creating a schedule in the Schedule Board
- `"Schedule updated successfully"` (green) — after dragging a schedule block
- `"Schedule removed"` (green) — after deleting a schedule block
- `"Availability updated"` (blue) — after toggling faculty availability
- `"Generated N schedules."` (blue) — after auto-generating schedules
- `"Record created successfully"` (green) — after creating master data
- `"Backup created: {path}"` (green) — after database backup

#### 19.2 Error Notifications (Verified UI)

Error messages appear in red alert boxes:
- On login failure: `"Invalid credentials"` (HTTP 401) or `"An error occurred. Please try again."` (network error)
- Rate limited: `"Too many login attempts. Please try again later."` (HTTP 429)
- On schedule creation failure: The error message from the API response
- On schedule move/delete failure: `"Move failed"` or `"Delete failed"` or the API error message

#### 19.3 Validation (Verified Code Behavior)

- **Login form:** Username and password must be non-empty (zod `min(1)`)
- **Manual Schedule Form:** All five dropdowns (Section, Subject, Faculty, Room, Time Slot) are `required`
- **Master List forms:** Fields validated per entity type (employee_id, first_name, last_name, email format, etc.)
- **API rate limiting:** 5 login attempts per 15 minutes per IP address

#### 19.4 Loading States

- Login button shows `"Signing in..."` during submission
- Schedule creation button shows `"Saving..."` during submission
- Master List form submission blocks the form during processing

---

### 20. Empty States

| Page | Empty State Message |
|------|--------------------|
| Master List (any tab) | "No records yet. Use the form above to add one." |
| Master List (table) | "{N} record(s)" shows even when N=0 |
| Schedule Board (no schedules) | The board shows empty dashed-border slots for each time slot |
| Faculty Availability (no slots) | Grid of buttons still loads (based on time slots from DB) |
| Schedule Management (admin) | "No schedules yet. Use the Schedule Board to create draft schedules." |
| Public Schedules (`/schedules`) | "Currently {N} schedule(s) have been published." (N can be 0) |
| Public Term Schedules (`/schedules/{term}`) | Amber box: "No PUBLISHED schedules. Schedules appear here only after validation and approval..." |
| Student Schedule (no classes) | Grid shows time-slot table with empty cells; List shows "No classes scheduled." card in gray |
| Schedule List (filtered, no results) | "No classes scheduled." card centered with gray text |

---

### 21. Responsive/Mobile Usage

**Verified UI** (from `app/page.tsx`, `components/PortalLayout.tsx`):

#### 21.1 Mobile Navbar Behavior
- On mobile (`md:hidden`), the navbar collapses the portal links (Admin/Faculty/Student Portal, About) and shows only a **Login** button.
- On desktop (`md:flex`), all four links are visible.

#### 21.2 Mobile Sidebar Behavior
- The sidebar in portal pages has a toggle button (chevron icons) visible on `lg:hidden`.
- Desktop: Sidebar is always expanded (72px margin).
- Collapsed mode: Sidebar shrinks to icon-only width (5rem margin).
- The toggle button is always visible for collapsing/expanding.

#### 21.3 Mobile Schedule Viewing
- Schedule Grid and List components use `overflow-x-auto` for horizontal scrolling on small screens.
- The grid table has `min-w-[900px]` to accommodate all columns.
- Faculty/Student schedule pages show the same grid/list toggle on all screen sizes.

**Not verified:**
- Whether the mobile experience is fully optimized or whether there are intentional mobile-only layouts.

---

### 22. Accessibility

**Verified UI features** (from source code analysis):

| Feature | Evidence |
|---------|----------|
| Semantic HTML | `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<aside>`, `<table>`, `<form>` used throughout |
| aria-label | TelemetryBar uses `aria-label="System telemetry"`; sections use `aria-label="System Metrics"`, `aria-label="Quick Actions"`, `aria-label="Upcoming Classes"` |
| aria-label on buttons | Collapsed sidebar toggle: `aria-label="Expand sidebar"` / `aria-label="Collapse sidebar"` |
| aria-label on inputs | None found in visible form inputs |
| Focus states | Buttons use `hover:` transitions; `focus:` states not explicitly coded (relies on Tailwind defaults) |
| Alt text | Hero image: `alt="Tawi-Tawi Regional Agricultural College campus"`; `alt="BSIT Department faculty and students collaborating"` |
| Table headers | All tables use `<th>` headers with `border-b` styling |
| Color contrast | Uses Tailwind color classes (`text-slate-100`, `text-cyber-teal`, etc.); specific WCAG contrast ratios not calculated |
| Print styles | `print:hidden` classes hide UI controls; `PrintHeader` component renders print-only headers |

**Not verified:** WCAG 2.1 compliance, screen reader testing, keyboard-only navigation testing.

---

### 23. Security and Account Safety

**Verified code behavior:**

| Security Feature | Source | Details |
|-----------------|--------|---------|
| Session cookie | `lib/modules/mod-01-auth/session.ts` | Cookie name: `csms_session`, HTTP-only, SameSite=Lax, 8-hour max-age, Secure in production |
| Password hashing | `lib/modules/mod-01-auth/service.ts` | bcrypt with 10 salt rounds (`bcryptjs.hashSync`) |
| Rate limiting | `app/api/auth/login/route.ts` | 5 login attempts per 15 minutes per IP address; in-memory store |
| Role authorization | `lib/modules/mod-01-auth/service.ts` | Admin pages require `session.role === 'admin'`; faculty require `'faculty'`; student requires `'student'` |
| Middleware protection | `middleware.ts` | Redirects to `/login` if no session cookie on `/admin/*`, `/faculty/*`, `/student/*` |
| Session signing | `lib/modules/mod-01-auth/session.ts` | HMAC-SHA256 signed payload (requires `SESSION_SECRET` in production) |
| API authorization | `app/api/admin/route.ts`, `app/api/faculty/route.ts`, `app/api/student/route.ts` | All API routes call `getSession()` + `authorize()` — returns 401 if unauthenticated/unauthorized |
| Rate limit headers | `app/api/auth/login/route.ts` | Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers |

**Not exposed to users:** No passwords, tokens, or API keys are visible in the UI. No secrets from `.env` files are exposed.

---

### 24. Troubleshooting

| Problem | Possible Cause | Recommended Action |
|---------|----------------|-------------------|
| Cannot log in | Invalid credentials | Verify username and password; contact administrator to confirm account exists |
| "Too many login attempts" | Rate limit exceeded (5 attempts/15 min) | Wait 15 minutes and retry, or contact an administrator |
| "An error occurred" on login | Network or server error | Refresh the page and retry |
| Page redirects to login | Session expired or no valid session | Log in again |
| Schedule Board shows no data | No schedules created for active semester | Click "Add Schedule Manually" or auto-generate for a section |
| "No ACTIVE semester" | No semester marked active in database | Contact administrator to activate a semester/semester |
| Master List shows "No records" | Tables are empty | Use the form to add records, or seed the database |
| Faculty Availability grid empty | No time slots in database | Contact administrator to configure time slots |
| Schedule not visible on public pages | Schedule is DRAFT or not PUBLISHED | Only PUBLISHED schedules with no blocking conflicts appear on `/schedules/{term}` |
| Search other sections returns nothing | Section code not found | Verify the section code format (e.g., "BSIT-2A") |
| Print layout looks wrong | CSS print media not loaded | Use the Print / PDF button; check browser print settings |

---

### 25. Glossary

| Term | Definition |
|------|-----------|
| Academic Year | A 12-month scheduling period (e.g., "2024-2025"), displayed on the Academic Calendar page |
| Section | A group of students taking the same subjects (e.g., "BSIT-2A"); displayed in the Master List |
| Semester | Part of an academic year (e.g., "First Semester"); only one semester is active at a time |
| Subject | An academic course with a code (e.g., "IT 201") and credit hours; listed in the Master List |
| Faculty | An instructor/teacher with an employee ID; listed in the Master List and assigned to schedules |
| Student | A BSIT student enrolled in a section; sees their personal schedule after login |
| Room | A physical space (classroom/lab) with a code, name, and capacity; assigned to schedules |
| Building | A structure containing rooms; rooms are grouped under buildings |
| Schedule | A time-slot assignment linking a section, subject, faculty, room, and time slot |
| Time Slot | A day + start/end time window (e.g., Monday 08:30–09:30) |
| Conflict | A scheduling clash (same faculty, room, or section at the same time) — detected by MOD-04 |
| Blocking Conflict | A conflict that prevents a schedule from being published (spec §34) |
| DRAFT | Initial status of a newly created schedule |
| PUBLISHED | Final status for schedules publicly displayed on `/schedules/{term}` |
| MOD-02 | Master List module (data management) |
| MOD-03 | Schedule Engine module (auto-generation) |
| MOD-04 | Conflict Detection module |
| MOD-05 | Manual Adjustment module (schedule board) |
| MOD-06 | Faculty Portal module |
| MOD-07 | Student Portal module |
| MOD-08 | Database Service module (backup, audit) |
| DEMO | Sample/seed data not authorized for production display (spec §63) |
| VERIFIED | Data confirmed against an authoritative source |
| PRODUCTION | Live institutional data (not sample/seed) |
| Mission Control | Admin dashboard name |
| Mission Log | Faculty and Student dashboard name |
| Telemetry Bar | Top status bar showing term, week, health, and conflict count |
| Data Environment | A badge on records indicating whether they are PRODUCTION, VERIFIED, or DEMO |

---

### 26. Quick Reference

#### Administrator
1. Navigate to `.../login`
2. Enter admin credentials, click **Sign In**
3. Arrive at **Mission Control** (`/admin/dashboard`)
4. Use **Operational Commands** to access Master List, Schedule Board, Faculty Availability, or Audit Logs
5. Manage data, create/edit/delete schedules, set availability, detect conflicts
6. Click **Logout** in the sidebar when finished

#### Faculty
1. Navigate to `.../login`
2. Enter faculty credentials, click **Sign In**
3. Arrive at **Mission Log** (`/faculty/dashboard`)
4. Click **Schedule Matrix** to view teaching schedule
5. Use **Grid/List** toggle and **Print / PDF** as needed
6. Click **Logout** when finished

#### Student
1. Navigate to `.../login`
2. Enter student credentials, click **Sign In**
3. Arrive at **Mission Log** (`/student/dashboard`)
4. Click **Schedule Matrix** to view personal schedule
5. Optionally click **Search other sections** to view another section's timetable
6. Use **Grid/List** toggle and **Print / PDF** as needed
7. Click **Logout** when finished

---

### 27. Verified Limitations / Unverified Features

| Feature | Status | Notes |
|--------|--------|-------|
| Schedule creation (admin) | Verified UI | Via ManualScheduleForm on Schedule Board |
| Schedule editing (admin) | Verified UI | Drag-and-drop on Schedule Board |
| Schedule deletion (admin) | Verified UI | Trash2 icon on Schedule Board (with confirm) |
| Schedule auto-generation (admin) | Verified UI | Per-section buttons on Schedule Board |
| Schedule status change (admin) | Not verified | Status workflow (DRAFT→PUBLISHED) described in code but no UI control found for transitioning status |
| Conflict resolution (admin) | Not verified | Conflicts are displayed but no UI exists to resolve them directly |
| Master data editing (admin) | Verified UI | Create forms exist in Master List tabs |
| Master data editing (admin) | Not verified | No inline edit or delete controls visible for existing records |
| Faculty editing (admin via Master List) | Not verified | Creation form exists; edit/delete controls not found |
| Student schedule sharing (student) | Verified UI | Section search feature |
| Email notifications | Not verified | No email UI or notification center found |
| Real-time updates | Not verified | Data loaded via initial fetch + manual refresh; no WebSocket or polling observed |
| Mobile app | Not verified | No PWA manifest or mobile-specific routes found |
| CSV export | Not verified | No export controls found in any page |
| Dark mode toggle | Not verified | App defaults to dark mode (`className="dark"` in RootLayout); no toggle switch found |
| Profile editing | Not verified | No user profile edit pages found for any role |

---

### 28. Evidence Appendix

```text
Feature: Landing page with navbar, hero, stats, features, institutional info
Frontend route: /
Source file: app/page.tsx
Evidence type: Verified UI

Feature: Login with username/password, rate limiting
Frontend route: /login
Source file: app/login/page.tsx, components/LoginForm.tsx
API: app/api/auth/login/route.ts
Evidence type: Verified UI + Verified code behavior

Feature: Admin dashboard with telemetry, metric cards, quick links
Frontend route: /admin/dashboard
Source file: app/admin/dashboard/page.tsx
Components: components/PortalLayout.tsx, components/DashboardComponents.tsx
Evidence type: Verified UI

Feature: Master List with tabs for faculty/students/subjects/sections/rooms
Frontend route: /admin/master-list
Source file: app/admin/master-list/page.tsx
Form: components/MasterListForm.tsx
Evidence type: Verified UI

Feature: Faculty availability toggle grid
Frontend route: /admin/faculty-availability
Source file: app/admin/faculty-availability/page.tsx
Evidence type: Verified UI

Feature: Schedule Board with drag-and-drop and manual entry
Frontend route: /admin/schedule-board
Source file: app/admin/schedule-board/page.tsx
Board: components/ScheduleBoard.tsx, components/ManualScheduleForm.tsx
Evidence type: Verified UI

Feature: Admin conflict detection report
Frontend route: /admin/conflicts
Source file: app/admin/conflicts/page.tsx
Evidence type: Verified UI

Feature: Admin schedule management table with status cards
Frontend route: /admin/schedules
Source file: app/admin/schedules/page.tsx
Evidence type: Verified UI

Feature: Evidence dashboard with source-of-truth facts
Frontend route: /admin/evidence
Source file: app/admin/evidence/page.tsx
Evidence type: Verified UI

Feature: System settings table
Frontend route: /admin/settings
Source file: app/admin/settings/page.tsx
Evidence type: Verified UI

Feature: Faculty public roster
Frontend route: /faculty
Source file: app/faculty/page.tsx
Evidence type: Verified UI

Feature: Faculty dashboard (Mission Log)
Frontend route: /faculty/dashboard
Source file: app/faculty/dashboard/page.tsx
Evidence type: Verified UI

Feature: Faculty teaching schedule (grid/list, print)
Frontend route: /faculty/schedule
Source file: app/faculty/schedule/page.tsx
Components: components/ScheduleGrid.tsx, components/ScheduleList.tsx
Evidence type: Verified UI

Feature: Student dashboard (Mission Log) with section search CTA
Frontend route: /student/dashboard
Source file: app/student/dashboard/page.tsx
Evidence type: Verified UI

Feature: Student schedule with section lookup, grid/list, print
Frontend route: /student/schedule
Source file: app/student/schedule/page.tsx
Evidence type: Verified UI

Feature: Public schedules listing (academic years)
Frontend route: /schedules
Source file: app/schedules/page.tsx
Evidence type: Verified UI

Feature: Public term-specific published schedules table
Frontend route: /schedules/[term]
Source file: app/schedules/[term]/page.tsx
Evidence type: Verified UI + Verified code behavior

Feature: Rooms listing table
Frontend route: /rooms
Source file: app/rooms/page.tsx
Evidence type: Verified UI

Feature: Programs listing
Frontend route: /programs
Source file: app/programs/page.tsx
Evidence type: Verified UI

Feature: Academic calendar listing
Frontend route: /academic-calendar
Source file: app/academic-calendar/page.tsx
Evidence type: Verified UI

Feature: About page with institutional facts
Frontend route: /about
Source file: app/about/page.tsx
Evidence type: Verified UI

Feature: Contact page with institutional contacts
Frontend route: /contact
Source file: app/contact/page.tsx
Evidence type: Verified UI

Feature: Developers page with attribution
Frontend route: /developers
Source file: app/developers/page.tsx
Evidence type: Verified UI

Feature: User guidelines page
Frontend route: /user-guidelines
Source file: app/user-guidelines/page.tsx
Evidence type: Verified UI

Feature: Role-based authentication with session cookies
Frontend route: /login
Source file: lib/modules/mod-01-auth/session.ts, lib/modules/mod-01-auth/service.ts
Evidence type: Verified code behavior

Feature: Middleware route protection
Frontend route: (all routes)
Source file: middleware.ts
Evidence type: Verified code behavior

Feature: Course badge categorization (SE/NET/SYS/GEN)
Components: components/CourseBadge.tsx
Evidence type: Verified UI

Feature: Course badge color classes
CSS: app/globals.css (course-badge-* classes)
Evidence type: Verified code behavior

Feature: Sidebar with collapsed/expanded toggle, persistence
Components: components/PortalLayout.tsx
Evidence type: Verified UI

Feature: Telemetry/status bar on dashboards
Components: components/TelemetryBar.tsx
Evidence type: Verified UI

Feature: Schedule view toggle (Grid/List)
Components: components/PortalLayout.tsx (ViewToggle)
Evidence type: Verified UI

Feature: Schedule data fetching via API
API: lib/api/client.ts (scheduleApi, facultyApi, studentApi)
Evidence type: Verified code behavior
```

---

### 29. Final Verification

All routes and features documented above were inspected from the repository at commit db7f803, with the exception of the newly-added `/user-guidelines` page (added after db7f803 at commit 5e5b29a) and its footer link, both of which were verified live at the production URL.

**Live verification:**
- `https://class-schedule-management-system-for-1myk.onrender.com/user-guidelines` — HTTP 200, title "User Guidelines — TRAC BSIT CSMS"
- `https://class-schedule-management-system-for-1myk.onrender.com/` — footer contains "User Guidelines" link
- Build (`npm run build`) succeeded with 29 routes including `/user-guidelines`
