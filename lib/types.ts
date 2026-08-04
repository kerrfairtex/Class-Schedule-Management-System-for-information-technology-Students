export type UserRole = 'admin' | 'faculty' | 'student';

export interface Admin {
  id: number;
  username: string;
  password: string;
}

export interface Faculty {
  id: number;
  name: string;
  username: string;
  password: string;
  token: string;
  designation: string;
  contact: string;
  email: string;
  subject1: string | null;
  subject2: string | null;
  credits1: number;
  credits2: number;
  status: number;
  finalized: number;
}

export interface Student {
  sap: number;
  first_name: string;
  last_name: string;
  rollno: number;
  branch: string;
  year: number;
  email: string;
  phone: string;
  password: string;
}

export interface Subject {
  id: number;
  name: string;
  year: number;
}

export interface TimetableEntry {
  id: number;
  faculty_username: string;
  room: string;
  subject: string;
  day: string;
  time: string;
  finalized: number;
}

export interface StudentTimetableEntry {
  id: number;
  sap: number;
  faculty_username: string;
  day: string;
  time: string;
  room: string;
  subject: string;
}

export interface SessionUser {
  role: UserRole;
  id: string;
  name: string;
}

export interface TimetableSlot {
  day: string;
  time: string;
  room: string;
  subject: string;
}
