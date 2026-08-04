'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Subject {
  id: number;
  name: string;
  year: number;
}

export default function AdminSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/subjects')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/admin/login');
        else setSubjects(data);
      });
  }, [router]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'subject',
        action: 'create',
        data: Object.fromEntries(form),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Subject added successfully');
      setShowForm(false);
      const list = await fetch('/api/admin/subjects').then((r) => r.json());
      setSubjects(list);
    } else {
      setMessage(data.error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this subject?')) return;
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'subject', action: 'delete', data: { id } }),
    });
    setSubjects(subjects.filter((s) => s.id !== id));
  }

  return (
    <AdminLayout active="subjects">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Subjects</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 flex gap-4">
          <input name="name" placeholder="Subject Name" required className="input-field flex-1" />
          <input name="year" type="number" placeholder="Year" required className="input-field w-32" />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Year</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">{s.year}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(s.id)} className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function AdminLayout({ children, active }: { children: React.ReactNode; active: string }) {
  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/admin/faculty', label: 'Manage Faculty', key: 'faculty' },
    { href: '/admin/students', label: 'Manage Students', key: 'students' },
    { href: '/admin/subjects', label: 'Manage Subjects', key: 'subjects' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                active === l.key ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="w-full text-sm text-red-600 hover:underline">
              Logout
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
