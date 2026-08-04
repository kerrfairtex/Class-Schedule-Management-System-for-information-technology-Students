'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalSidebar } from '@/components/Sidebar';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { Printer, Search } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';
import { ORGANIZATION } from '@/lib/domain/constants';

export default function StudentSchedulePage() {
  const router = useRouter();
  const [student, setStudent] = useState<Record<string, string> | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [semester, setSemester] = useState<{ name: string } | null>(null);
  const [sections, setSections] = useState<{ code: string }[]>([]);
  const [searchSection, setSearchSection] = useState('');
  const [searchResults, setSearchResults] = useState<Schedule[]>([]);
  const [searchLabel, setSearchLabel] = useState('');

  useEffect(() => {
    fetch('/api/student')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) router.push('/login');
        else if (d.student) {
          setStudent(d.student);
          setSchedules(d.schedules);
          setSemester(d.semester);
        } else {
          setSections(d.sections || []);
        }
      });
  }, [router]);

  async function searchBySection() {
    if (!searchSection) return;
    const res = await fetch(`/api/student?section=${encodeURIComponent(searchSection)}`);
    const data = await res.json();
    if (res.ok) {
      setSearchResults(data.schedules);
      setSearchLabel(data.sectionCode);
    }
  }

  const name = student ? `${student.first_name} ${student.last_name}` : 'Student';
  const displaySchedules = searchResults.length > 0 ? searchResults : schedules;

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        title="Student"
        name={name}
        subtitle={student?.section_code || ORGANIZATION.departmentCode}
        details={[
          { label: 'Student ID', value: student?.student_id || '' },
          { label: 'Semester', value: semester?.name || '' },
        ]}
        links={[{ href: '/student/schedule', label: 'My Schedule', active: true }]}
      />
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between print:mb-2">
          <div>
            <h1 className="text-2xl font-bold">
              {searchLabel ? `Section ${searchLabel}` : 'Class Schedule'}
            </h1>
            <p className="text-sm text-slate-500">MOD-07 Student Portal — View Only</p>
          </div>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 print:hidden">
            <Printer className="h-4 w-4" />
            Print Schedule
          </button>
        </div>

        <div className="card mb-6 flex gap-2 print:hidden">
          <input
            value={searchSection}
            onChange={(e) => setSearchSection(e.target.value)}
            placeholder="Search by section code (e.g. BSIT-2A)"
            className="input-field flex-1"
            list="sections"
          />
          <datalist id="sections">
            {sections.map((s) => (
              <option key={s.code} value={s.code} />
            ))}
          </datalist>
          <button onClick={searchBySection} className="btn-primary flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={() => {
                setSearchResults([]);
                setSearchLabel('');
              }}
              className="btn-secondary"
            >
              Reset
            </button>
          )}
        </div>

        <ScheduleGrid schedules={displaySchedules} showFaculty />
      </main>
    </div>
  );
}
