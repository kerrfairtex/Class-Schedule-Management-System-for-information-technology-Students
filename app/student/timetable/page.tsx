'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentTimetableGrid } from '@/components/TimetableGrid';

interface Subject {
  id: number;
  name: string;
  year: number;
}

interface FacultyOption {
  username: string;
  name: string;
  designation: string;
}

interface Slot {
  day: string;
  time: string;
  room: string;
  subject: string;
}

interface TimetableEntry extends Slot {
  faculty_username: string;
}

export default function StudentTimetablePage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [facultySlots, setFacultySlots] = useState<Slot[]>([]);
  const [message, setMessage] = useState('');
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    fetch('/api/student/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/student/login');
        else {
          setSubjects(data.subjects);
          setTimetable(data.timetable);
          setEnrolled(data.enrolled);
          setStudentName(data.student.first_name);
        }
      });
  }, [router]);

  async function openSubjectModal(subject: Subject) {
    if (enrolled.includes(subject.name)) {
      setMessage(`Already enrolled in ${subject.name}`);
      return;
    }
    setSelectedSubject(subject);
    setSelectedFaculty('');
    setFacultySlots([]);
    const res = await fetch(`/api/student/faculty?subject=${encodeURIComponent(subject.name)}`);
    const data = await res.json();
    setFacultyOptions(data);
  }

  async function loadFacultySlots(facultyUsername: string) {
    if (!selectedSubject) return;
    setSelectedFaculty(facultyUsername);
    const res = await fetch(
      `/api/student/slots?faculty=${facultyUsername}&subject=${encodeURIComponent(selectedSubject.name)}`
    );
    const data = await res.json();
    setFacultySlots(data);
  }

  async function enroll() {
    if (!selectedSubject || !selectedFaculty) return;
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'enroll',
        facultyUsername: selectedFaculty,
        subject: selectedSubject.name,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
      setSelectedSubject(null);
      const updated = await fetch('/api/student/me').then((r) => r.json());
      setTimetable(updated.timetable);
      setEnrolled(updated.enrolled);
    } else {
      setMessage(data.error);
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6 text-center">
          <p className="text-xs uppercase text-slate-400">Student</p>
          <h2 className="mt-2 font-semibold">{studentName}</h2>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <a href="/student/dashboard" className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Dashboard
          </a>
          <a href="/student/timetable" className="block rounded-lg bg-primary px-3 py-2 text-sm text-white">
            Set Timetable
          </a>
        </nav>
        <div className="border-t border-slate-200 p-4">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="w-full text-sm text-red-600 hover:underline">
              Logout
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-bold">Your Timetable</h1>

        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => openSubjectModal(s)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                enrolled.includes(s.name)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {s.name}
              {enrolled.includes(s.name) && ' ✓'}
            </button>
          ))}
        </div>

        <StudentTimetableGrid entries={timetable} />

        {selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="card w-full max-w-lg">
              <h2 className="mb-4 text-lg font-semibold">Select Faculty — {selectedSubject.name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Faculty</label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => loadFacultySlots(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select faculty</option>
                    {facultyOptions.map((f) => (
                      <option key={f.username} value={f.username}>
                        {f.name} ({f.designation})
                      </option>
                    ))}
                  </select>
                </div>
                {facultySlots.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Schedule Preview</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-slate-600">
                      {facultySlots.map((s, i) => (
                        <li key={i}>
                          {s.day} {s.time} — Room {s.room}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={enroll} disabled={!selectedFaculty} className="btn-primary flex-1">
                    Enroll
                  </button>
                  <button onClick={() => setSelectedSubject(null)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
