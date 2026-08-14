'use client';

import { Filter, X, ChevronDown } from 'lucide-react';
import { DAYS, DAY_LABELS } from '@/lib/domain/constants';

interface FilterOption {
  value: string;
  label: string;
}

interface ScheduleFiltersProps {
  filters: {
    yearLevel?: string;
    section?: string;
    room?: string;
    instructor?: string;
  };
  onChange: (filters: {
    yearLevel?: string;
    section?: string;
    room?: string;
    instructor?: string;
  }) => void;
  options: {
    yearLevels: FilterOption[];
    sections: FilterOption[];
    rooms: FilterOption[];
    instructors: FilterOption[];
  };
  className?: string;
}

export function ScheduleFilters({
  filters,
  onChange,
  options,
  className = '',
}: ScheduleFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (key: keyof typeof filters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const handleClear = () => {
    onChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v && v !== 'all');

  return (
    <div className={`filter-toolbar ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
          <Filter className="h-4 w-4" />
          <span>FILTERS</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded bg-cyber-teal/20 text-cyber-cyan text-[10px] font-mono">
              ACTIVE
            </span>
          )}
        </div>

        <div className="filter-group flex-1 flex-wrap gap-3">
          <FilterSelect
            label="YEAR"
            value={filters.yearLevel || 'all'}
            options={[{ value: 'all', label: 'All Years' }, ...options.yearLevels]}
            onChange={(v) => handleChange('yearLevel', v)}
            placeholder="Select year level"
          />

          <FilterSelect
            label="SECTION"
            value={filters.section || 'all'}
            options={[{ value: 'all', label: 'All Sections' }, ...options.sections]}
            onChange={(v) => handleChange('section', v)}
            placeholder="Select section"
          />

          <FilterSelect
            label="LAB NODE"
            value={filters.room || 'all'}
            options={[{ value: 'all', label: 'All Rooms' }, ...options.rooms]}
            onChange={(v) => handleChange('room', v)}
            placeholder="Select room"
          />

          <FilterSelect
            label="INSTRUCTOR"
            value={filters.instructor || 'all'}
            options={[{ value: 'all', label: 'All Instructors' }, ...options.instructors]}
            onChange={(v) => handleChange('instructor', v)}
            placeholder="Select instructor"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="btn-ghost flex items-center gap-1.5 text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary flex items-center gap-1.5"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          <span className="hidden sm:inline">{expanded ? 'Less' : 'More'}</span>
        </button>
      </div>

      {/* Advanced filters - collapsible */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 animate-in">
          <div className="filter-group flex-wrap gap-3">
            <FilterInput
              label="SEARCH"
              placeholder="Search course code, name..."
              onChange={(e) => handleChange('search' as any, e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

function FilterSelect({ label, value, options, onChange, placeholder }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterInputProps {
  label: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function FilterInput({ label, placeholder, onChange }: FilterInputProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </div>
  );
}

// Need to import useState
import { useState } from 'react';