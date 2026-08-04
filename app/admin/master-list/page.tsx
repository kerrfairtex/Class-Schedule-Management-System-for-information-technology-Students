'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalSidebar } from '@/components/Sidebar';
import { ORGANIZATION } from '@/lib/domain/constants';

type Tab = 'faculty' | 'students' | 'subjects' | 'sections' | 'rooms';

export default function MasterListPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('faculty');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin?resource=' + tab)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else setRows(formatRows(tab, d));
      });
  }, [tab, router]);

  async function handleBackup() {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'backup' }),
    });
    const result = await res.json();
    setMessage(`Backup created: ${result.path}`);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'faculty', label: 'Faculty' },
    { key: 'students', label: 'Students' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'sections', label: 'Sections' },
    { key: 'rooms', label: 'Rooms' },
  ];

  const columns = getColumns(tab);

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        title="Admin"
        name="Administrator"
        subtitle={ORGANIZATION.departmentCode}
        links={[
          { href: '/admin/dashboard', label: 'Dashboard' },
          { href: '/admin/master-list', label: 'Master List (MOD-02)', active: true },
          { href: '/admin/schedule-board', label: 'Schedule Board (MOD-05)' },
        ]}
      />
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Master List</h1>
            <p className="text-sm text-slate-500">MOD-02 — System source of truth</p>
          </div>
          <button onClick={handleBackup} className="btn-secondary">
            Backup Database (MOD-08)
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
        )}

        <div className="mb-6 flex gap-2 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function getColumns(tab: Tab): string[] {
  switch (tab) {
    case 'faculty':
      return ['Employee ID', 'Name', 'Email', 'Phone'];
    case 'students':
      return ['Student ID', 'Name', 'Section', 'Email'];
    case 'subjects':
      return ['Code', 'Name', 'Credits'];
    case 'sections':
      return ['Code', 'Year Level'];
    case 'rooms':
      return ['Building', 'Code', 'Name', 'Capacity'];
    default:
      return [];
  }
}

function formatRows(tab: Tab, data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map((item) => {
    switch (tab) {
      case 'faculty':
        return {
          'Employee ID': item.employee_id,
          Name: `${item.first_name} ${item.last_name}`,
          Email: item.email,
          Phone: item.phone,
        };
      case 'students':
        return {
          'Student ID': item.student_id,
          Name: `${item.first_name} ${item.last_name}`,
          Section: item.section_code,
          Email: item.email,
        };
      case 'subjects':
        return { Code: item.code, Name: item.name, Credits: item.credit_hours };
      case 'sections':
        return { Code: item.code, 'Year Level': item.year_level };
      case 'rooms':
        return {
          Building: item.building_code,
          Code: item.code,
          Name: item.name,
          Capacity: item.capacity,
        };
      default:
        return item;
    }
  });
}
