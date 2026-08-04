import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ensureSeeded } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'timetable.db');

let db: Database.Database | null = null;

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      token TEXT NOT NULL,
      designation TEXT NOT NULL,
      contact TEXT NOT NULL,
      email TEXT NOT NULL,
      subject1 TEXT,
      subject2 TEXT,
      credits1 INTEGER DEFAULT 4,
      credits2 INTEGER DEFAULT 4,
      status INTEGER DEFAULT 0,
      finalized INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS students (
      sap INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      rollno INTEGER NOT NULL,
      branch TEXT NOT NULL,
      year INTEGER NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_username TEXT NOT NULL,
      room TEXT NOT NULL,
      subject TEXT NOT NULL,
      day TEXT NOT NULL,
      time TEXT NOT NULL,
      finalized INTEGER DEFAULT 0,
      UNIQUE(day, time, room),
      UNIQUE(faculty_username, day, time)
    );

    CREATE TABLE IF NOT EXISTS student_timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sap INTEGER NOT NULL,
      faculty_username TEXT NOT NULL,
      day TEXT NOT NULL,
      time TEXT NOT NULL,
      room TEXT NOT NULL,
      subject TEXT NOT NULL,
      UNIQUE(sap, subject)
    );
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
    ensureSeeded();
  }
  return db;
}
