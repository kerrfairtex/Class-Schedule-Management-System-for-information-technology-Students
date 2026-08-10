'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PortalSidebar } from '@/components/Sidebar';
import { ScheduleBoard, useScheduleBoardData } from '@/components/ScheduleBoard';
import { ManualScheduleForm } from '@/components/ManualScheduleForm';
import { scheduleApi } from '@/lib/api/client';
import { ORGANIZATION } from '@/lib/domain/constants';

export default function ScheduleBoardPage() {
  const router = useRouter();
  const [sections, setSections] = useState<{ id: number; code: string }[]>([]);
  const [sectionFilter, setSectionFilter] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { schedules, timeSlots, refresh } = useScheduleBoardData(sectionFilter);

  useEffect(() => {
    fetch('/api/admin?resource=sections')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else setSections(d);
      });
  }, [router]);

  async function handleMove(scheduleId: number, timeSlotId: number) {
    await scheduleApi.move(scheduleId, timeSlotId);
  }

  async function handleDelete(scheduleId: number) {
    await scheduleApi.delete(scheduleId);
  }

  async function generateForSection(sectionId: number) {
    const data = await scheduleApi.generate(sectionId);
    setMessage(`Generated ${data.created} schedules.${data.errors?.length ? ' Errors: ' + data.errors.join(', ') : ''}`);
    refresh();
  }

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/master-list', label: 'Master List (MOD-02)' },
    { href: '/admin/faculty-availability', label: 'Faculty Availability' },
    { href: '/admin/schedule-board', label: 'Schedule Board (MOD-05)', active: true },
  ];

  return (
    <div className="flex min-h-screen">
      <PortalSidebar title="Admin" name="Administrator" subtitle={ORGANIZATION.departmentCode} links={adminLinks} />
      <main className="flex-1 p-8">
        <h1 className="mb-2 text-2xl font-bold">Schedule Board</h1>
        <p className="mb-6 text-sm text-slate-500">
          MOD-03 Generation · MOD-04 Conflict Detection · MOD-05 Manual Adjustment
        </p>

        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <ManualScheduleForm
            onSuccess={() => {
              setMessage('Schedule created');
              setError('');
              refresh();
            }}
            onError={setError}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Filter section:</label>
            <select
              value={sectionFilter ?? ''}
              onChange={(e) => setSectionFilter(e.target.value ? Number(e.target.value) : null)}
              className="input-field w-auto"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <span className="self-center text-sm font-medium text-slate-600">Auto-generate (MOD-03):</span>
          {sections.map((s) => (
            <button key={s.id} onClick={() => generateForSection(s.id)} className="btn-secondary text-sm">
              {s.code}
            </button>
          ))}
        </div>

        <ScheduleBoard
          schedules={schedules}
          timeSlots={timeSlots}
          sectionFilter={sectionFilter}
          onMove={handleMove}
          onDelete={handleDelete}
          onRefresh={refresh}
        />
      </main>
    </div>
  );
}
