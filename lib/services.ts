import { getDb } from './db';
import { generateToken } from './utils';
import { DEFAULT_CREDITS } from './constants';
import type { Faculty, Student, Subject, TimetableEntry, StudentTimetableEntry } from './types';

// Admin
export function authenticateAdmin(username: string, password: string) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM admin WHERE username = ? AND password = ?')
    .get(username, password) as { id: number; username: string } | undefined;
}

// Faculty
export function authenticateFaculty(username: string, password: string) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM faculty WHERE username = ? AND password = ?')
    .get(username, password) as Faculty | undefined;
}

export function getFacultyByUsername(username: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM faculty WHERE username = ?').get(username) as Faculty | undefined;
}

export function getAllFaculty() {
  const db = getDb();
  return db.prepare('SELECT * FROM faculty ORDER BY name').all() as Faculty[];
}

export function createFaculty(data: {
  name: string;
  username: string;
  password: string;
  designation: string;
  contact: string;
  email: string;
  subject1?: string;
  subject2?: string;
}) {
  const db = getDb();
  const token = generateToken();
  const result = db
    .prepare(
      `INSERT INTO faculty (name, username, password, token, designation, contact, email, subject1, subject2, credits1, credits2)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.username,
      data.password,
      token,
      data.designation,
      data.contact,
      data.email,
      data.subject1 || null,
      data.subject2 || null,
      DEFAULT_CREDITS,
      data.subject2 ? DEFAULT_CREDITS : 0
    );
  return { id: result.lastInsertRowid, token };
}

export function deleteFaculty(id: number) {
  const db = getDb();
  const faculty = db.prepare('SELECT username FROM faculty WHERE id = ?').get(id) as
    | { username: string }
    | undefined;
  if (faculty) {
    db.prepare('DELETE FROM timetable WHERE faculty_username = ?').run(faculty.username);
    db.prepare('DELETE FROM student_timetable WHERE faculty_username = ?').run(faculty.username);
  }
  db.prepare('DELETE FROM faculty WHERE id = ?').run(id);
}

export function verifyFacultyToken(username: string, token: string) {
  const faculty = getFacultyByUsername(username);
  return faculty?.token === token;
}

export function getFacultyTimetable(username: string) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM timetable WHERE faculty_username = ? ORDER BY day, time')
    .all(username) as TimetableEntry[];
}

export function addFacultySlot(
  username: string,
  data: { day: string; time: string; room: string; subject: string }
) {
  const db = getDb();
  const faculty = getFacultyByUsername(username);
  if (!faculty) throw new Error('Faculty not found');
  if (faculty.finalized) throw new Error('Timetable already finalized');

  const roomConflict = db
    .prepare('SELECT id FROM timetable WHERE day = ? AND time = ? AND room = ?')
    .get(data.day, data.time, data.room);
  if (roomConflict) throw new Error('Room is already booked for this time slot');

  const facultyConflict = db
    .prepare('SELECT id FROM timetable WHERE day = ? AND time = ? AND faculty_username = ?')
    .get(data.day, data.time, username);

  const isSubject1 = data.subject === faculty.subject1;
  const isSubject2 = data.subject === faculty.subject2;
  if (!isSubject1 && !isSubject2) throw new Error('Invalid subject for this faculty');

  const creditsField = isSubject1 ? 'credits1' : 'credits2';
  const currentCredits = isSubject1 ? faculty.credits1 : faculty.credits2;
  if (currentCredits <= 0 && !facultyConflict) {
    throw new Error('All slots for this subject have been filled');
  }

  if (facultyConflict) {
    db.prepare(
      'UPDATE timetable SET subject = ?, room = ? WHERE faculty_username = ? AND day = ? AND time = ?'
    ).run(data.subject, data.room, username, data.day, data.time);
  } else {
    db.prepare(
      'INSERT INTO timetable (faculty_username, room, subject, day, time, finalized) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(username, data.room, data.subject, data.day, data.time);
    db.prepare(`UPDATE faculty SET ${creditsField} = ${creditsField} - 1 WHERE username = ?`).run(
      username
    );
  }
}

export function finalizeFacultyTimetable(username: string) {
  const db = getDb();
  const faculty = getFacultyByUsername(username);
  if (!faculty) throw new Error('Faculty not found');
  if (faculty.credits1 > 0 || faculty.credits2 > 0) {
    throw new Error('Please fill all your slots before finalizing');
  }
  db.prepare('UPDATE faculty SET status = 1, finalized = 1 WHERE username = ?').run(username);
  db.prepare('UPDATE timetable SET finalized = 1 WHERE faculty_username = ?').run(username);
}

export function resetFacultyTimetable(username: string) {
  const db = getDb();
  const faculty = getFacultyByUsername(username);
  if (!faculty) throw new Error('Faculty not found');

  db.prepare('DELETE FROM timetable WHERE faculty_username = ?').run(username);
  db.prepare('DELETE FROM student_timetable WHERE faculty_username = ?').run(username);

  const credits1 = faculty.subject1 ? DEFAULT_CREDITS : 0;
  const credits2 = faculty.subject2 ? DEFAULT_CREDITS : 0;
  db.prepare(
    'UPDATE faculty SET credits1 = ?, credits2 = ?, status = 0, finalized = 0 WHERE username = ?'
  ).run(credits1, credits2, username);
}

// Students
export function authenticateStudent(sap: number, password: string) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM students WHERE sap = ? AND password = ?')
    .get(sap, password) as Student | undefined;
}

export function getStudentBySap(sap: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM students WHERE sap = ?').get(sap) as Student | undefined;
}

export function getAllStudents() {
  const db = getDb();
  return db.prepare('SELECT * FROM students ORDER BY sap').all() as Student[];
}

export function createStudent(data: {
  sap: number;
  first_name: string;
  last_name: string;
  rollno: number;
  branch: string;
  year: number;
  email: string;
  phone: string;
  password: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO students (sap, first_name, last_name, rollno, branch, year, email, phone, password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.sap,
    data.first_name,
    data.last_name,
    data.rollno,
    data.branch,
    data.year,
    data.email,
    data.phone,
    data.password
  );
}

export function deleteStudent(sap: number) {
  const db = getDb();
  db.prepare('DELETE FROM student_timetable WHERE sap = ?').run(sap);
  db.prepare('DELETE FROM students WHERE sap = ?').run(sap);
}

export function getSubjectsByYear(year: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM subjects WHERE year = ? ORDER BY name').all(year) as Subject[];
}

export function getAllSubjects() {
  const db = getDb();
  return db.prepare('SELECT * FROM subjects ORDER BY year, name').all() as Subject[];
}

export function createSubject(name: string, year: number) {
  const db = getDb();
  db.prepare('INSERT INTO subjects (name, year) VALUES (?, ?)').run(name, year);
}

export function deleteSubject(id: number) {
  const db = getDb();
  db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
}

export function getFacultyForSubject(subject: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT DISTINCT f.username, f.name, f.designation
       FROM faculty f
       JOIN timetable t ON t.faculty_username = f.username
       WHERE t.subject = ? AND f.status = 1`
    )
    .all(subject) as { username: string; name: string; designation: string }[];
}

export function getFacultySubjectSlots(facultyUsername: string, subject: string) {
  const db = getDb();
  return db
    .prepare(
      'SELECT day, time, room, subject FROM timetable WHERE faculty_username = ? AND subject = ?'
    )
    .all(facultyUsername, subject) as { day: string; time: string; room: string; subject: string }[];
}

export function enrollStudentInFaculty(sap: number, facultyUsername: string, subject: string) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM student_timetable WHERE sap = ? AND subject = ?')
    .get(sap, subject);
  if (existing) throw new Error('Already enrolled in this subject');

  const slots = getFacultySubjectSlots(facultyUsername, subject);
  if (slots.length === 0) throw new Error('No timetable slots available for this faculty');

  const studentSlots = db
    .prepare('SELECT day, time FROM student_timetable WHERE sap = ?')
    .all(sap) as { day: string; time: string }[];

  for (const slot of slots) {
    const clash = studentSlots.some((s) => s.day === slot.day && s.time === slot.time);
    if (clash) {
      throw new Error(`Schedule conflict on ${slot.day} at ${slot.time}`);
    }
  }

  const insert = db.prepare(
    'INSERT INTO student_timetable (sap, faculty_username, day, time, room, subject) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const slot of slots) {
    insert.run(sap, facultyUsername, slot.day, slot.time, slot.room, slot.subject);
  }
}

export function getStudentTimetable(sap: number) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM student_timetable WHERE sap = ? ORDER BY day, time')
    .all(sap) as StudentTimetableEntry[];
}

export function getDashboardStats() {
  const db = getDb();
  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admin').get() as { c: number }).c;
  const facultyCount = (db.prepare('SELECT COUNT(*) as c FROM faculty').get() as { c: number }).c;
  const studentCount = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
  const subjectCount = (db.prepare('SELECT COUNT(*) as c FROM subjects').get() as { c: number }).c;
  return { adminCount, facultyCount, studentCount, subjectCount };
}
