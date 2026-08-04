# University Timetable Management Portal

A modern web-based university timetable management system built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **SQLite**. This is a reimplementation of the [University-TimetableManagement-Portal](https://github.com/namanadlakha3/University-TimetableManagement-Portal) PHP project with a modern tech stack.

## Features

### Admin Portal
- Dashboard with system statistics
- Register and manage faculty members (auto-generates access tokens)
- Register and manage students
- Manage subjects by academic year

### Faculty Portal
- Token-based verification for early access scheduling
- Set teaching timetable (day, time, room, subject)
- Conflict detection (room and faculty double-booking)
- Credit-based slot allocation per subject
- Finalize or reset timetable

### Student Portal
- View subjects for their academic year
- Select faculty for each subject
- Automatic schedule conflict detection
- Personalized weekly timetable view

## Getting Started

```bash
# Install dependencies
npm install

# Seed the database with demo data
npm run seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

| Role    | Credentials                          |
|---------|--------------------------------------|
| Admin   | `admin` / `admin`                    |
| Faculty | `sandeep` / `pratap` (token: `42544674`) |
| Student | SAP `500060879` / `123`              |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** SQLite (better-sqlite3)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Project Structure

```
app/
├── admin/          # Admin portal pages
├── faculty/        # Faculty portal pages
├── student/        # Student portal pages
└── api/            # API routes
components/         # Shared UI components
lib/                # Database, services, auth
scripts/            # Database seeding
data/               # SQLite database (auto-created)
```

## Original Project

Based on the [University-TimetableManagement-Portal](https://github.com/namanadlakha3/University-TimetableManagement-Portal) by Naman Adlakha et al.
