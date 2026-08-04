'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TimetableGrid } from '@/components/TimetableGrid';
import { DAYS, DAY_LABELS, TIME_SLOTS } from '@/lib/constants';

interface FacultyData {
  name: string;
  designation: string;
  email: string;
  contact: string;
  subject1: string | null;
  subject2: string | null;
  credits1: number;
  credits2: number;
  finalized: number;
  token: string;
}

interface TimetableEntry {
  day: string;
  time: string;
  room: string;
  subject: string;
}

export default function FacultyTimetablePage() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<FacultyData | null>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [verified, setVerified] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [form, setForm] = useState({ time: '9:30', subject: '', room: '' });

  useEffect(() => {
    fetch('/api/faculty/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/faculty/login');
        else {
          setFaculty(data.faculty);
          setEntries(data.timetable);
          setForm((f) => ({
            ...f,
            subject: data.faculty.subject1 || '',
          }));
        }
      });
  }, [router]);

  async function verifyToken() {
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify-token', token: tokenInput }),
    });
    if (res.ok) {
      setVerified(true);
      setError('');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-slot', day: selectedDay, ...form }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
      setShowModal(false);
      const updated = await fetch('/api/faculty/me').then((r) => r.json());
      setFaculty(updated.faculty);
      setEntries(updated.timetable);
    } else {
      setMessage(data.error);
    }
  }

  async function finalize() {
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'finalize' }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error);
    if (res.ok) {
      const updated = await fetch('/api/faculty/me').then((r) => r.json());
      setFaculty(updated.faculty);
    }
  }

  async function reset() {
    if (!confirm('Reset your entire timetable?')) return;
    const res = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error);
    if (res.ok) {
      const updated = await fetch('/api/faculty/me').then((r) => r.json());
      setFaculty(updated.faculty);
      setEntries(updated.timetable);
    }
  }

  if (!faculty) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  const subjects = [faculty.subject1, faculty.subject2].filter(Boolean) as string[];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6 text-center">
          <p className="text-xs uppercase text-slate-400">Faculty</p>
          <h2 className="mt-2 font-semibold">{faculty.name}</h2>
          <p className="text-sm text-slate-500">{faculty.designation}</p>
        </div>
        <div className="space-y-2 p-6 text-sm">
          {faculty.subject1 && (
            <p>
              {faculty.subject1}: <strong>{faculty.credits1}</strong> slots left
            </p>
          )}
          {faculty.subject2 && (
            <p>
              {faculty.subject2}: <strong>{faculty.credits2}</strong> slots left
            </p>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <a href="/faculty/dashboard" className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Dashboard
          </a>
          <a href="/faculty/timetable" className="block rounded-lg bg-primary px-3 py-2 text-sm text-white">
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
        <h1 className="mb-6 text-2xl font-bold">Set Timetable</h1>

        {!verified && (
          <div className="card mb-6 max-w-md">
            <h2 className="mb-2 font-semibold">Token Verification</h2>
            <p className="mb-4 text-sm text-slate-500">Enter your access token to edit the timetable.</p>
            <div className="flex gap-2">
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter token"
                className="input-field"
              />
              <button onClick={verifyToken} className="btn-primary">
                Verify
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
        )}

        <TimetableGrid entries={entries} />

        {verified && !faculty.finalized && (
          <div className="mt-6 flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(day);
                  setShowModal(true);
                }}
                className="btn-secondary"
              >
                Add slot — {DAY_LABELS[day]}
              </button>
            ))}
            <button onClick={finalize} className="btn-primary ml-auto">
              Finalize Timetable
            </button>
            <button onClick={reset} className="btn-secondary">
              Reset
            </button>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="card w-full max-w-md">
              <h2 className="mb-4 text-lg font-semibold">Add Slot — {DAY_LABELS[selectedDay]}</h2>
              <form onSubmit={addSlot} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Time</label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="input-field"
                  >
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="input-field"
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Room</label>
                  <input
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    placeholder="Room number"
                    required
                    className="input-field"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
