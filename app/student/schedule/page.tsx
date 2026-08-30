'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout, PrintHeader, ViewToggle } from '@/components/PortalLayout';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { ScheduleList } from '@/components/ScheduleList';
import { Printer, Search } from 'lucide-react';
import type { Schedule } from '@/lib/domain/types';

export default function StudentSchedulePage() {
  const router = useRouter();
  const [student, setStudent] = useState<Record<string, string> | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [semester, setSemester] = useState<{ name: string } | null>(null);
  const [sections, setSections] = useState<{ code: string }[]>([]);
  const [searchSection, setSearchSection] = useState('');
  const [searchResults, setSearchResults] = useState<Schedule[]>([]);
  const [searchLabel, setSearchLabel] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showSearch, setShowSearch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('search') === '1';
  });

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
  const links = [
    { href: '/student/dashboard', label: 'Dashboard' },
    { href: '/student/schedule', label: 'My Schedule', active: true },
  ];

  return (
    <PortalLayout
      role="student"
      name={name}
      subtitle={student?.section_code}
      details={[
        { label: 'Student ID', value: student?.student_id || '' },
        { label: 'Semester', value: semester?.name || '' },
      ]}
      links={links}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:mb-2">
        <div>
          <h1 className="text-2xl font-bold">
            {searchLabel ? `Section ${searchLabel}` : 'Class Schedule'}
          </h1>
          <p className="text-sm text-slate-500">MOD-07 — View and print only</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </div>

      <PrintHeader
        title={searchLabel ? `Section ${searchLabel} Schedule` : 'Student Class Schedule'}
        subtitle={semester?.name || ''}
        name={name}
      />

      <div className="card mb-6 print:hidden">
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"
        >
          <Search className="h-4 w-4" />
          {showSearch ? 'Hide section search' : 'Search other sections'}
        </button>
        {showSearch && (
          <div className="flex gap-2">
            <input
              value={searchSection}
              onChange={(e) => setSearchSection(e.target.value)}
              placeholder="Section code (e.g. BSIT-2A)"
              className="input-field flex-1"
              list="sections"
            />
            <datalist id="sections">
              {sections.map((s) => (
                <option key={s.code} value={s.code} />
              ))}
            </datalist>
            <button onClick={searchBySection} className="btn-primary">
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
        )}
      </div>

      {view === 'grid' ? (
        <ScheduleGrid schedules={displaySchedules} showFaculty />
      ) : (
        <ScheduleList schedules={displaySchedules} showFaculty />
      )}
    </PortalLayout>
  );
}
