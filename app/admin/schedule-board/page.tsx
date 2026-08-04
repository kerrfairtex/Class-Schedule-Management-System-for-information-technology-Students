'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PortalSidebar } from '@/components/Sidebar';
import { ScheduleBoard, useScheduleBoardData } from '@/components/ScheduleBoard';
import { ORGANIZATION } from '@/lib/domain/constants';

export default function ScheduleBoardPage() {
  const router = useRouter();
  const { schedules, timeSlots, refresh } = useScheduleBoardData();
  const [sections, setSections] = useState<{ id: number; code: string }[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin?resource=sections')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else setSections(d);
      });
  }, [router]);

  async function handleMove(scheduleId: number, timeSlotId: number) {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move-schedule', scheduleId, timeSlotId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  }

  async function generateForSection(sectionId: number) {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate-schedules', sectionId }),
    });
    const data = await res.json();
    setMessage(`Generated ${data.created} schedules. ${data.errors?.length ? 'Errors: ' + data.errors.join(', ') : ''}`);
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
          MOD-03 Schedule Engine · MOD-04 Conflict Detection · MOD-05 Manual Adjustment
        </p>

        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <span className="self-center text-sm font-medium text-slate-600">Generate (MOD-03):</span>
          {sections.map((s) => (
            <button key={s.id} onClick={() => generateForSection(s.id)} className="btn-secondary text-sm">
              {s.code}
            </button>
          ))}
        </div>

        <ScheduleBoard
          schedules={schedules}
          timeSlots={timeSlots}
          onMove={handleMove}
          onRefresh={refresh}
        />
      </main>
    </div>
  );
}
