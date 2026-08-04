'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Faculty {
  id: number;
  name: string;
  username: string;
  token: string;
  designation: string;
  email: string;
  subject1: string | null;
  subject2: string | null;
}

export default function AdminFacultyPage() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [newToken, setNewToken] = useState('');

  useEffect(() => {
    fetch('/api/admin/faculty')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/admin/login');
        else setFaculty(data);
      });
  }, [router]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'faculty',
        action: 'create',
        data: Object.fromEntries(form),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Faculty registered successfully');
      setNewToken(data.token);
      setShowForm(false);
      const list = await fetch('/api/admin/faculty').then((r) => r.json());
      setFaculty(list);
    } else {
      setMessage(data.error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this faculty member?')) return;
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'faculty', action: 'delete', data: { id } }),
    });
    setFaculty(faculty.filter((f) => f.id !== id));
  }

  return (
    <AdminLayout active="faculty">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Faculty</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'Register Faculty'}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
          {newToken && <span className="ml-2 font-mono">Token: {newToken}</span>}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 grid gap-4 sm:grid-cols-2">
          <input name="name" placeholder="Full Name" required className="input-field" />
          <input name="username" placeholder="Username" required className="input-field" />
          <input name="password" type="password" placeholder="Password" required className="input-field" />
          <input name="designation" placeholder="Designation" required className="input-field" />
          <input name="contact" placeholder="Contact" required className="input-field" />
          <input name="email" type="email" placeholder="Email" required className="input-field" />
          <input name="subject1" placeholder="Subject 1" className="input-field" />
          <input name="subject2" placeholder="Subject 2 (optional)" className="input-field" />
          <button type="submit" className="btn-primary sm:col-span-2">Register</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-left">Token</th>
              <th className="px-4 py-3 text-left">Subjects</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{f.name}</td>
                <td className="px-4 py-3">{f.username}</td>
                <td className="px-4 py-3 font-mono text-xs">{f.token}</td>
                <td className="px-4 py-3 text-xs">
                  {f.subject1}
                  {f.subject2 ? `, ${f.subject2}` : ''}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(f.id)} className="text-sm text-red-600 hover:underline">
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
