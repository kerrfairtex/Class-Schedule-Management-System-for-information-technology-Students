'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MasterListForm, type EditingRecord } from '@/components/MasterListForm';
import { ADMIN_NAV, navFor } from '@/lib/domain/navigation';
import { PortalLayout } from '@/components/PortalLayout';
import {
  masterListAction,
  type MasterListTab,
} from '@/lib/modules/mod-02-master-list/actions';

type Tab = MasterListTab;

interface Meta {
  programs: { id: number; code: string }[];
  departments: { id: number; code: string }[];
  sections: { id: number; code: string }[];
  buildings: { id: number; code: string }[];
  subjects: { id: number; code: string; name: string }[];
  faculty?: { id: number; code: string }[];
  rooms?: { id: number; code: string }[];
  semester: { id: number; name: string } | null;
}

const ADMIN_LINKS = navFor(ADMIN_NAV, '/admin/master-list');

export default function MasterListPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('faculty');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [message, setMessage] = useState('');
  const [backupFile, setBackupFile] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EditingRecord | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

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

  // Switching tabs always closes the form and drops any edit selection.
  // This is the "adjust state during render" pattern: React re-renders the
  // component immediately and discards the render output, so no cascading
  // render is scheduled (unlike setState inside an effect).
  const [lastTab, setLastTab] = useState<Tab>(tab);
  if (lastTab !== tab) {
    setLastTab(tab);
    setShowForm(false);
    setEditing(null);
    setMessage('');
    setError('');
  }

  async function handleBackup() {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'backup' }),
    });
    const result = await res.json();
    if (!res.ok) {
      setError(result.error || 'Backup failed');
      setMessage('');
      return;
    }
    const fileName = String(result.path || '').split('/').pop() || null;
    setBackupFile(fileName);
    setMessage(`Backup created: ${result.path}`);
    setError('');
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

  /** Open the form in Add mode. */
  function startCreate() {
    setEditing(null);
    setShowForm(true);
    setError('');
  }

  /** Open the form in Edit mode, pre-filled from the row. */
  function startEdit(row: Record<string, unknown>) {
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === '_id') continue;
      values[k] = v === null || v === undefined ? '' : String(v);
    }
    setEditing({ id: Number(row._id), values });
    setShowForm(true);
    setError('');
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(row: Record<string, unknown>) {
    const id = Number(row._id);
    if (!Number.isInteger(id)) {
      setError('Could not determine which record to delete');
      return;
    }
    const label = String(
      row.student_id ?? row.employee_id ?? row.code ?? row.username ?? id
    );
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    setBusyId(id);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: masterListAction(tab, 'delete'), id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');
      setMessage('Record deleted successfully');
      setError('');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    } finally {
      setBusyId(null);
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
    <PortalLayout role="admin" name="Administrator" links={ADMIN_LINKS}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Master List</h1>
            <p className="text-sm text-muted">MOD-02 — System source of truth</p>
          </div>
          <button onClick={handleBackup} className="btn-secondary">
            Backup Database (MOD-08)
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-seagrass/40 bg-seagrass-50 px-4 py-3 text-sm text-seagrass">
            {message}
            {backupFile && (
              <a
                href={`/api/admin/backups?file=${encodeURIComponent(backupFile)}`}
                className="ml-2 font-medium underline underline-offset-2"
                download={backupFile}
              >
                Download
              </a>
            )}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-coral/40 bg-coral-50 px-4 py-3 text-sm text-coral">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-2 border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t.key
                  ? 'border-b-2 border-lagoon text-lagoon'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {meta && tab === 'sections' && !showForm && (
          <AddSetsForm
            programs={meta.programs}
            onDone={(msg) => {
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

        {meta && showForm && (
          <MasterListForm
            tab={tab}
            meta={meta}
            editing={editing}
            onCancel={closeForm}
            onSuccess={(msg) => {
              setMessage(msg);
              setError('');
              closeForm();
              loadData();
            }}
            onError={(msg) => {
              setError(msg);
              setMessage('');
            }}
          />
        )}

        {meta && !showForm && (
          <button onClick={startCreate} className="btn-primary mb-4">
            Add {tabLabel(tab)}
          </button>
        )}

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium text-ink-soft">
                    {col}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-ink-soft">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No records yet. Use the form above to add one.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-t border-line">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-ink">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="rounded border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-lagoon/50 hover:text-lagoon-dark"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={busyId === Number(row._id)}
                          className="rounded border border-coral/40 px-2 py-1 text-xs text-coral transition hover:bg-coral-50 disabled:opacity-50"
                        >
                          {busyId === Number(row._id) ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {tab === 'users' && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2 text-ink-soft">Reset Password</h3>
            <div className="flex gap-2">
              <select id="reset-username" className="input-field">
                <option value="">Select user...</option>
                {rows.map((row, i) => (
                  <option key={i} value={String(row.Username)}>
                    {String(row.Username)} ({String(row.Role)})
                  </option>
                ))}
              </select>
              <button onClick={handleResetPassword} className="btn-secondary">
                Reset Password
              </button>
            </div>
            {resetMessage && (
              <div className="mt-2 rounded-lg border border-seagrass/40 bg-seagrass-50 px-4 py-3 text-sm text-seagrass">
                {resetMessage}
              </div>
            )}
          </div>
        )}

        <p className="mt-2 text-xs text-muted">{rawData.length} record(s)</p>
    </PortalLayout>
  );
}

function tabLabel(tab: string) {
  const labels: Record<string, string> = {
    faculty: 'Faculty',
    students: 'Student',
    subjects: 'Subject',
    sections: 'Section',
    rooms: 'Room',
    users: 'User',
  };
  return labels[tab] || tab;
}

function getColumns(tab: Tab): string[] {
  switch (tab) {
    case 'faculty':
      return ['Employee ID', 'Name', 'Email', 'Phone'];
    case 'students':
      return ['Student ID', 'Name', 'Section', 'Email'];
    case 'subjects':
      return ['Subject code', 'Descriptive title', 'Units (lec/lab)', 'Hours a week (lec/lab)'];
    case 'sections':
      return ['Code', 'Year', 'Class size', 'Adviser', 'Home room'];
    case 'rooms':
      return ['Building', 'Code', 'Name', 'Type', 'Capacity'];
    case 'users':
      return ['Username', 'Role', 'External ID', 'Active', 'Must Change Password'];
    default:
      return [];
  }
}

/**
 * Map raw API rows to display columns.
 *
 * `_id` carries the row's primary key so the Edit/Delete buttons know which
 * record to act on. The raw column values are also kept (lowercased keys) so
 * the Edit form can pre-fill itself.
 */
function formatRows(tab: Tab, data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map((item) => {
    switch (tab) {
      case 'faculty':
        return {
          _id: item.id,
          employee_id: item.employee_id,
          first_name: item.first_name,
          last_name: item.last_name,
          email: item.email ?? '',
          phone: item.phone ?? '',
          department_id: item.department_id,
          'Employee ID': item.employee_id,
          Name: `${item.first_name} ${item.last_name}`,
          Email: item.email ?? '',
          Phone: item.phone ?? '',
        };
      case 'students':
        return {
          _id: item.id,
          student_id: item.student_id,
          first_name: item.first_name,
          last_name: item.last_name,
          email: item.email ?? '',
          section_id: item.section_id,
          'Student ID': item.student_id,
          Name: `${item.first_name} ${item.last_name}`,
          Section: item.section_code,
          Email: item.email ?? '',
        };
      case 'subjects':
        return {
          _id: item.id,
          code: item.code,
          name: item.name,
          program_id: item.program_id,
          lec_units: item.lec_units,
          lab_units: item.lab_units,
          lec_hours: Number(item.lec_hours ?? 0),
          lab_hours: Number(item.lab_hours ?? 0),
          'Subject code': item.code,
          'Descriptive title': item.name,
          'Units (lec/lab)': `${item.credit_hours} (${item.lec_units ?? item.credit_hours}/${item.lab_units ?? 0})`,
          'Hours a week (lec/lab)': `${Number(item.lec_hours ?? 0)}/${Number(item.lab_hours ?? 0)}`,
        };
      case 'sections':
        return {
          _id: item.id,
          code: item.code,
          year_level: item.year_level,
          program_id: item.program_id,
          semester_id: item.semester_id,
          capacity: item.capacity,
          adviser_id: item.adviser_id ?? '',
          home_room_id: item.home_room_id ?? '',
          Code: item.code,
          Year: item.year_level,
          'Class size': item.capacity,
          Adviser: item.adviser_name ?? 'None',
          'Home room': item.home_room_code ?? 'None',
        };
      case 'rooms':
        return {
          _id: item.id,
          code: item.code,
          name: item.name,
          capacity: item.capacity,
          building_id: item.building_id,
          room_type: item.room_type ?? 'LECTURE',
          Building: item.building_code,
          Code: item.code,
          Name: item.name,
          Type: item.room_type === 'LAB' ? 'Laboratory' : 'Lecture room',
          Capacity: item.capacity,
        };
      case 'users':
        return {
          _id: item.id,
          username: item.username,
          role: item.role,
          is_active: item.is_active,
          must_change_password: item.must_change_password,
          external_id: item.external_id ?? '',
          faculty_id: item.faculty_id ?? '',
          student_id: item.student_id ?? '',
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

/** Add the next N sets (block sections) for a year level, e.g. BSIT-1A to 1C. */
function AddSetsForm({
  programs,
  onDone,
  onError,
}: {
  programs: { id: number; code: string }[];
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-section-sets',
          program_id: Number(form.get('program_id')),
          year_level: Number(form.get('year_level')),
          count: Number(form.get('count')),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add sets');
      onDone(`Added ${data.codes.join(', ')}. Open a set to choose its adviser and home room.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add sets');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mb-6 flex flex-wrap items-end gap-3">
      <p className="w-full text-sm font-bold">Add sets for a year level</p>
      <label>
        <span className="label-field">Program</span>
        <select name="program_id" className="select-field" defaultValue={programs[0]?.id} required>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.code}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label-field">Year level</span>
        <input name="year_level" type="number" min={1} max={8} defaultValue={1} className="input-field w-24" required />
      </label>
      <label>
        <span className="label-field">How many sets</span>
        <input name="count" type="number" min={1} max={12} defaultValue={2} className="input-field w-24" required />
      </label>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Adding…' : 'Add sets'}
      </button>
      <p className="hint w-full">Codes continue from the existing sets: if BSIT-1A exists, 2 sets adds BSIT-1B and BSIT-1C.</p>
    </form>
  );
}
