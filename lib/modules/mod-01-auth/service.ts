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

export async function authenticate(username: string, password: string): Promise<User | null> {
  const db = await getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
    .get(username) as Promise<User | undefined>;
  // .get() may be async on the PostgreSQL adapter; await it.
  const resolvedUser = await user;

  if (!resolvedUser || !verifyPassword(password, resolvedUser.password_hash)) return null;
  return resolvedUser;
}

export async function getUserById(id: number): User | null {
  const db = await getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Promise<User | undefined>;
  return (await row) || null;
}

export async function createUser(data: {
  username: string;
  password: string;
  role: RoleName;
  faculty_id?: number;
  student_id?: number;
  must_change_password?: number;
}) {
  const db = await getDb();
  db.prepare(
    `INSERT INTO users (username, password_hash, role, faculty_id, student_id, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    data.username,
    hashPassword(data.password),
    data.role,
    data.faculty_id ?? null,
    data.student_id ?? null,
    data.must_change_password ?? 0
  );
}

export async function toSessionUser(user: User): SessionUser {
  const db = await getDb();
  let name = user.username;

  if (user.role === 'faculty' && user.faculty_id) {
    const f = await (db
      .prepare('SELECT first_name, last_name FROM faculty WHERE id = ?')
      .get(user.faculty_id) as Promise<{ first_name: string; last_name: string } | undefined>);
    if (f) name = `${f.first_name} ${f.last_name}`;
  }

  if (user.role === 'student' && user.student_id) {
    const s = await (db
      .prepare('SELECT first_name, last_name FROM students WHERE id = ?')
      .get(user.student_id) as Promise<{ first_name: string; last_name: string } | undefined>);
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
    mustChangePassword: user.must_change_password === 1,
  };
}

export function authorize(session: SessionUser | null, roles: RoleName[]): boolean {
  return !!session && roles.includes(session.role);
}

export function generateRandomPassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = require('crypto').randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
