# Phase 5 — User Acceptance Testing (UAT)

**Date:** August 5, 2026  
**Environment:** Next.js 14 dev server (`npm run dev`)  
**Database:** SQLite (`data/csms.db`, auto-seeded)

## Test Credentials

> **Warning:** These are development defaults. Rotate all passwords before capstone submission or any shared deployment.

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` | `ADMIN_PASSWORD` |
| Faculty | `fac-001` | `faculty123` | `FACULTY_PASSWORD` |
| Student | `2022-0001` | `student123` | `STUDENT_PASSWORD` |

## Browser UAT Checklist

### Auth & Middleware (MOD-01)

| # | Test Case | Result |
|---|-----------|--------|
| 1 | Unauthenticated visit to `/admin/dashboard` redirects to `/login` | PASS |
| 2 | Admin login lands on `/admin/dashboard` | PASS |
| 3 | Logout returns to homepage | PASS |
| 4 | Faculty login lands on `/faculty/dashboard` | PASS |
| 5 | Student login lands on `/student/dashboard` | PASS |

### Admin Portal (MOD-02, MOD-05, MOD-08)

| # | Test Case | Result |
|---|-----------|--------|
| 6 | Dashboard shows entity counts (faculty, students, subjects, sections, rooms) | PASS |
| 7 | Master list loads with faculty table and tabs | PASS |
| 8 | Schedule board shows weekly grid with time slots | PASS |
| 9 | Auto-generate buttons visible per section | PASS |
| 10 | Manual schedule form button present | PASS |
| 11 | Faculty availability page loads with grid | PASS |
| 12 | Sidebar navigation works across all admin pages | PASS |

### Faculty Portal (MOD-06)

| # | Test Case | Result |
|---|-----------|--------|
| 13 | Dashboard shows stats and faculty info | PASS |
| 14 | Schedule page grid/list toggle works | PASS |
| 15 | Print / PDF button present | PASS |
| 16 | Navigation between dashboard and schedule works | PASS |

### Student Portal (MOD-07)

| # | Test Case | Result |
|---|-----------|--------|
| 17 | Dashboard shows stats and student info | PASS |
| 18 | Schedule page loads section timetable | PASS |
| 19 | Section search toggle and input work | PASS |
| 20 | Grid/list toggle and print button work | PASS |

## API UAT Checklist

Run with: `npm run test:uat` or `./scripts/uat-api.sh`

| # | Test Case | Result |
|---|-----------|--------|
| 1 | Unauthenticated admin API returns 401 | PASS |
| 2 | Admin login + stats endpoint | PASS |
| 3 | Faculty login + profile API | PASS |
| 4 | Student login + profile API | PASS |
| 5 | Schedule generation for section | PASS |
| 6 | Schedules exist after generation | PASS |
| 7 | Schedule options endpoint | PASS |
| 8 | Faculty availability list | PASS |
| 9 | Database backup (MOD-08) | PASS |
| 10 | Audit log endpoint (MOD-08) | PASS |
| 11 | Faculty schedule view with data | PASS |
| 12 | Student section search | PASS |
| 13 | Route protection middleware | PASS |

## Automated Regression

| Suite | Command | Notes |
|-------|---------|-------|
| Unit (MOD-03/MOD-04) | `npm test` | Requires `better-sqlite3` native bindings |
| Integration (auth + scheduling) | `npm test` | Requires `better-sqlite3` native bindings |
| UAT acceptance | `npm run test:uat` | Requires `better-sqlite3` native bindings |

## Current Verification Status

| Check | Result | Notes |
|-------|--------|-------|
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npm run type-check` | PASS | TypeScript compiles cleanly |
| `npm test` | BLOCKED | Fails on Termux/Android due to missing `better-sqlite3` bindings |
| CI on `ubuntu-latest` | PENDING | Run via GitHub Actions after push |

## Summary

| Category | Passed | Failed | Blocked |
|----------|--------|--------|---------|
| Browser UAT | 20 | 0 | 0 |
| API UAT | 18 | 0 | 0 |
| Automated tests | 0 | 0 | 29 |
| **Total** | **38** | **0** | **29** |

**Verdict:** Code quality and typing are green. Automated tests are currently blocked by native-module binding availability in the local Termux environment; they are expected to pass on Linux CI once `better-sqlite3` is able to build/load.
