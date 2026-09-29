'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalSidebar } from '@/components/Sidebar';
import { MasterListForm } from '@/components/MasterListForm';
import { ORGANIZATION } from '@/lib/domain/constants';

type Tab = 'faculty' | 'students' | 'subjects' | 'sections' | 'rooms' | 'users';

interface Meta {
  programs: { id: number; code: string }[];
  departments: { id: number; code: string }[];
  sections: { id: number; code: string }[];
  buildings: { id: number; code: string }[];
  subjects: { id: number; code: string; name: string }[];
  semester: { id: number; name: string } | null;
}

const ADMIN_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/master-list', label: 'Master List (MOD-02)', active: true },
  { href: '/admin/faculty-availability', label: 'Faculty Availability' },
  { href: '/admin/schedule-board', label: 'Schedule Board (MOD-05)' },
];

export default function MasterListPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('faculty');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const loadData = useCallback(() => {
    fetch('/api/admin?resource=' + tab)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else {
          setRawData(d);
          setRows(formatRows(tab, d));
        }
      });
  }, [tab, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetch('/api/admin?resource=meta')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setMeta(d);
      });
  }, []);

  async function handleBackup() {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'backup' }),
    });
    const result = await res.json();
    setMessage(`Backup created: ${result.path}`);
  }

  async function handleResetPassword() {
    const select = document.getElementById('reset-username') as HTMLSelectElement;
    const username = select.value;
    if (!username) {
      setResetMessage('Please select a user');
      return;
    }
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset-password', username }),
    });
    const result = await res.json();
    if (result.success) {
      setResetMessage(`Password reset for ${username}. New password: ${result.newPassword}`);
      loadData();
    } else {
      setResetMessage(`Error: ${result.error || 'Failed to reset password'}`);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'faculty', label: 'Faculty' },
    { key: 'students', label: 'Students' },
    { key: 'subjects', label: 'Subjects' },
    { key: 'sections', label: 'Sections' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'users', label: 'Users' },
  ];

  const columns = getColumns(tab);

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        title="Admin"
        name="Administrator"
        subtitle={ORGANIZATION.departmentCode}
        links={ADMIN_LINKS}
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
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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

        {meta && (
          <MasterListForm
            tab={tab}
            meta={meta}
            onSuccess={(msg) => {
              setMessage(msg);
              setError('');
              loadData();
            }}
            onError={(msg) => {
              setError(msg);
              setMessage('');
            }}
          />
        )}

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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                    No records yet. Use the form above to add one.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {tab === 'users' && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Reset Password</h3>
            <div className="flex gap-2">
              <select id="reset-username" className="input-field">
                <option value="">Select user...</option>
                {rows.map((row, i) => (
                  <option key={i} value={String(row.Username)}>{String(row.Username)} ({String(row.Role)})</option>
                ))}
              </select>
              <button onClick={handleResetPassword} className="btn-secondary">
                Reset Password
              </button>
            </div>
            {resetMessage && (
              <div className="mt-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {resetMessage}
              </div>
            )}
          </div>
        )}

        <p className="mt-2 text-xs text-slate-400">{rawData.length} record(s)</p>
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
    case 'users':
      return ['Username', 'Role', 'External ID', 'Active', 'Must Change Password'];
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
      case 'users':
        return {
          Username: item.username,
          Role: item.role,
          'External ID': item.external_id || '',
          Active: item.is_active ? 'Yes' : 'No',
          'Must Change Password': item.must_change_password ? 'Yes' : 'No',
        };
      default:
        return item;
    }
  });
}
