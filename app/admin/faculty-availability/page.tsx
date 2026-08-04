'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalSidebar } from '@/components/Sidebar';
import { ORGANIZATION, DAY_LABELS } from '@/lib/domain/constants';

interface FacultyOption {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
}

interface SlotRow {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: number;
}

export default function FacultyAvailabilityPage() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<FacultyOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin?resource=faculty-list')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else {
          setFaculty(d);
          if (d.length > 0) setSelectedId(d[0].id);
        }
      });
  }, [router]);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/admin?resource=availability&facultyId=${selectedId}`)
      .then((r) => r.json())
      .then(setSlots);
  }, [selectedId]);

  async function toggleSlot(slotId: number, current: number) {
    if (!selectedId) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set-availability',
        facultyId: selectedId,
        timeSlotId: slotId,
        isAvailable: current === 0,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Availability updated');
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, is_available: current === 0 ? 1 : 0 } : s
        )
      );
    } else {
      setMessage(data.error);
    }
  }

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/master-list', label: 'Master List (MOD-02)' },
    { href: '/admin/faculty-availability', label: 'Faculty Availability', active: true },
    { href: '/admin/schedule-board', label: 'Schedule Board (MOD-05)' },
  ];

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        title="Admin"
        name="Administrator"
        subtitle={ORGANIZATION.departmentCode}
        links={adminLinks}
      />
      <main className="flex-1 p-8">
        <h1 className="mb-2 text-2xl font-bold">Faculty Availability</h1>
        <p className="mb-6 text-sm text-slate-500">
          Mark unavailable time slots — MOD-04 uses this during conflict detection.
        </p>

        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>
        )}

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">Faculty Member</label>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="input-field max-w-md"
          >
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.employee_id} — {f.first_name} {f.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => toggleSlot(slot.id, slot.is_available)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                slot.is_available
                  ? 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                  : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              <p className="font-medium">{DAY_LABELS[slot.day_of_week]}</p>
              <p>
                {slot.start_time} – {slot.end_time}
              </p>
              <p className="mt-1 text-xs">{slot.is_available ? 'Available' : 'Unavailable'}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
