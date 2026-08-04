import { getDb } from './db';
import { DEFAULT_CREDITS } from './constants';

let seeded = false;

export function ensureSeeded() {
  if (seeded) return;
  const db = getDb();

  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admin').get() as { c: number }).c;
  if (adminCount === 0) {
    db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run('admin', 'admin');
  }

  const subjectCount = (db.prepare('SELECT COUNT(*) as c FROM subjects').get() as { c: number }).c;
  if (subjectCount === 0) {
    const insertSubject = db.prepare('INSERT INTO subjects (name, year) VALUES (?, ?)');
    const subjects = [
      ['Mathematics-1', 1],
      ['Basic-Electronics', 1],
      ['Programming-and-Data-Structures', 1],
      ['Physics', 1],
      ['Chemistry', 1],
      ['discrete_mathematics', 2],
      ['operating system', 2],
      ['Database-Management-Systems', 2],
      ['design_and_analysis_of_algorithm', 2],
      ['storage_technology_foundation', 2],
      ['computer_system_architecture', 3],
      ['artificial_intelligence', 3],
      ['computer_graphics', 3],
      ['xml', 3],
      ['cloud_deployment_model', 3],
      ['cryptography_and_network_security', 4],
      ['Microprocessors', 4],
    ] as const;
    for (const [name, year] of subjects) {
      insertSubject.run(name, year);
    }
  }

  const facultyCount = (db.prepare('SELECT COUNT(*) as c FROM faculty').get() as { c: number }).c;
  if (facultyCount === 0) {
    const insertFaculty = db.prepare(
      `INSERT INTO faculty (name, username, password, token, designation, contact, email, subject1, subject2, credits1, credits2, status, finalized)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
    );
    const faculty = [
      ['Dr. Sandeep Pratap Singh', 'sandeep', 'pratap', '42544674', 'Assoc. Professor', '9468317039', 'sandeep@university.edu', 'Mathematics-1', 'Database-Management-Systems'],
      ['Dr. Saurabh Shanu', 'saurabh', 'shanu', '67632545', 'Professor', '7404324414', 'saurabh@university.edu', 'Basic-Electronics', 'Programming-and-Data-Structures'],
      ['Dr. Shamik Tiwari', 'shamik', 'tiwari', '92478763', 'Professor', '9468317039', 'shamik@university.edu', 'discrete_mathematics', 'operating system'],
      ['Dr. Nilima Salankar', 'nilima', 'salankar', '69627393', 'Assoc. Professor', '8756297868', 'nilima@university.edu', 'operating system', 'computer_system_architecture'],
      ['Dr. Pravin Dagdee', 'pravin', 'dagdee', '49539488', 'Professor', '8756297868', 'pravin@university.edu', 'artificial_intelligence', 'computer_graphics'],
    ] as const;
    for (const f of faculty) {
      insertFaculty.run(...f, DEFAULT_CREDITS, DEFAULT_CREDITS);
    }
  }

  const studentCount = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
  if (studentCount === 0) {
    db.prepare(
      `INSERT INTO students (sap, first_name, last_name, rollno, branch, year, email, phone, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(500060879, 'Divya', 'Ratra', 51, 'CCVT', 3, 'div@university.edu', '7404324414', '123');
    db.prepare(
      `INSERT INTO students (sap, first_name, last_name, rollno, branch, year, email, phone, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(500061140, 'Ridhima', 'Khurana', 123, 'GG', 1, 'rid@university.edu', '7404324414', '123');
  }

  seeded = true;
}
