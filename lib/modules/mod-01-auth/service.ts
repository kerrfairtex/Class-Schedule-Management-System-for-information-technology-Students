import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/persistence/db';
import type { RoleName, SessionUser, User } from '@/lib/domain/types';

const SALT_ROUNDS = 10;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function authenticate(username: string, password: string): User | null {
  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
    .get(username) as User | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return user;
}

export function getUserById(id: number): User | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User) || null;
}

export function createUser(data: {
  username: string;
  password: string;
  role: RoleName;
  faculty_id?: number;
  student_id?: number;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (username, password_hash, role, faculty_id, student_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    data.username,
    hashPassword(data.password),
    data.role,
    data.faculty_id ?? null,
    data.student_id ?? null
  );
}

export function toSessionUser(user: User): SessionUser {
  const db = getDb();
  let name = user.username;

  if (user.role === 'faculty' && user.faculty_id) {
    const f = db
      .prepare('SELECT first_name, last_name FROM faculty WHERE id = ?')
      .get(user.faculty_id) as { first_name: string; last_name: string } | undefined;
    if (f) name = `${f.first_name} ${f.last_name}`;
  }

  if (user.role === 'student' && user.student_id) {
    const s = db
      .prepare('SELECT first_name, last_name FROM students WHERE id = ?')
      .get(user.student_id) as { first_name: string; last_name: string } | undefined;
    if (s) name = `${s.first_name} ${s.last_name}`;
  }

  if (user.role === 'admin') name = 'Administrator';

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    facultyId: user.faculty_id ?? undefined,
    studentId: user.student_id ?? undefined,
    name,
  };
}

export function authorize(session: SessionUser | null, roles: RoleName[]): boolean {
  return !!session && roles.includes(session.role);
}
