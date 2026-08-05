import type { Schedule } from '@/lib/domain/types';
import { DAY_LABELS } from '@/lib/domain/constants';

interface ScheduleListProps {
  schedules: Schedule[];
  showFaculty?: boolean;
  showSection?: boolean;
}

export function ScheduleList({ schedules, showFaculty, showSection }: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-500">No classes scheduled.</div>
    );
  }

  const sorted = [...schedules].sort((a, b) => {
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayDiff =
      dayOrder.indexOf(a.day_of_week || '') - dayOrder.indexOf(b.day_of_week || '');
    if (dayDiff !== 0) return dayDiff;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  return (
    <div className="space-y-3">
      {sorted.map((s) => (
        <div
          key={s.id}
          className="card flex flex-wrap items-center justify-between gap-4 print:break-inside-avoid print:shadow-none"
        >
          <div>
            <p className="font-semibold text-primary">
              {s.subject_code} — {s.subject_name}
            </p>
            <p className="text-sm text-slate-600">
              {DAY_LABELS[s.day_of_week || '']} · {s.start_time} – {s.end_time}
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>{s.room_code} ({s.room_name})</p>
            {showFaculty && s.faculty_name && <p>{s.faculty_name}</p>}
            {showSection && s.section_code && <p>Section {s.section_code}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScheduleStats({ schedules }: { schedules: Schedule[] }) {
  const subjects = new Set(schedules.map((s) => s.subject_code));
  const days = new Set(schedules.map((s) => s.day_of_week));

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Stat label="Total Classes" value={schedules.length} />
      <Stat label="Subjects" value={subjects.size} />
      <Stat label="Days per Week" value={days.size} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
